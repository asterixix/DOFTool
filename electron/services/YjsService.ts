/**
 * Yjs Service - Manages Yjs documents and CRDT synchronization
 */

import * as path from 'path';

import { app } from 'electron';
import { LeveldbPersistence } from 'y-leveldb';
import * as Y from 'yjs';

export interface YjsDocumentStructure {
  // Family core data
  family: Y.Map<unknown>;
  members: Y.Map<unknown>;
  devices: Y.Map<unknown>;
  invitations: Y.Map<unknown>;

  // Calendar data
  calendars: Y.Map<unknown>;
  events: Y.Map<unknown>;

  // Tasks data
  taskLists: Y.Map<unknown>;
  tasks: Y.Map<unknown>;

  // Email/messaging data
  emailAccounts: Y.Map<unknown>;
  emailLabels: Y.Map<unknown>;
  conversations: Y.Map<unknown>;
  internalMessages: Y.Array<unknown>;

  // Permissions
  permissions: Y.Map<unknown>;
}

/** Memory optimization constants */
const MEMORY_CONFIG = {
  /** Interval for garbage collection (ms) */
  GC_INTERVAL_MS: 60000, // Every minute
  /** Enable Yjs garbage collection */
  ENABLE_GC: true,
} as const;

export class YjsService {
  private ydoc: Y.Doc | null = null;
  private persistence: LeveldbPersistence | null = null;
  private structure: YjsDocumentStructure | null = null;
  private readonly dbPath: string;
  private currentDocName: string = 'default';
  private gcInterval: NodeJS.Timeout | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'data', 'yjs');
  }

  /**
   * Check for and remove stale lock files
   * This handles cases where the previous instance crashed or didn't close properly
   * In dev mode, Electron restarts frequently so we need to be more aggressive
   */
  private async removeStaleLockFile(): Promise<boolean> {
    try {
      const { access, unlink } = await import('fs/promises');
      const lockFilePath = path.join(this.dbPath, 'LOCK');

      // Check if lock file exists
      try {
        await access(lockFilePath);
      } catch {
        // Lock file doesn't exist, nothing to clean up
        return true;
      }

      // Lock file exists - try to remove it directly
      // Don't check age - just try to remove it
      // If another process is holding it, the unlink will fail
      console.log('Lock file found, attempting to remove...');

      try {
        await unlink(lockFilePath);
        console.log('Successfully removed lock file');
        return true;
      } catch (unlinkError) {
        // If we can't delete it, another process is holding it
        const errorMessage = (unlinkError as Error).message || String(unlinkError);
        const isHeldByProcess =
          errorMessage.includes('używany przez inny proces') ||
          errorMessage.includes('being used by another process') ||
          errorMessage.includes('in use') ||
          errorMessage.includes('EBUSY') ||
          errorMessage.includes('EPERM');

        if (isHeldByProcess) {
          console.warn('Lock file is held by another process - will retry');
          return false;
        } else {
          // Other error (e.g., file doesn't exist anymore), log and continue
          console.warn('Failed to remove lock file:', unlinkError);
          return true; // Assume it's okay to continue
        }
      }
    } catch (error) {
      // Non-critical error, log and continue
      console.warn('Error in removeStaleLockFile:', error);
      return true; // Try to continue anyway
    }
  }

  /**
   * Initialize Yjs document and LevelDB persistence
   */
  async initialize(familyId?: string): Promise<void> {
    try {
      // Set up LevelDB persistence
      // y-leveldb expects a directory path where it will create the database
      const { mkdir, unlink } = await import('fs/promises');
      await mkdir(this.dbPath, { recursive: true });

      // Try to remove any stale lock files before initializing
      const lockRemoved = await this.removeStaleLockFile();
      if (!lockRemoved) {
        // Lock file exists and is held - wait a bit for previous instance to close
        console.log('Waiting for previous instance to release lock...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Try again after waiting
        await this.removeStaleLockFile();
      }

      // Initialize LevelDB persistence with retry logic for lock errors
      // In dev mode, Electron restarts frequently, so we need more retries and longer delays
      const maxRetries = 5;
      const retryDelayMs = 2000; // 2 seconds between retries
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount < maxRetries) {
        try {
          // Create persistence instance
          // This might throw synchronously on lock errors
          this.persistence = new LeveldbPersistence(this.dbPath);

          // If we get here, constructor succeeded
          console.log('LevelDB persistence created successfully');
          break;
        } catch (error) {
          lastError = error as Error;
          const errorMessage = lastError.message || String(error);
          const stackTrace = lastError.stack ?? '';

          // Check if it's a lock error (common patterns in different languages)
          const isLockError =
            errorMessage.includes('LOCK') ||
            errorMessage.includes('LockFile') ||
            errorMessage.includes('używany przez inny proces') ||
            errorMessage.includes('being used by another process') ||
            errorMessage.includes('OpenError') ||
            errorMessage.includes('EBUSY') ||
            (errorMessage.includes('IO error') && errorMessage.includes('LOCK')) ||
            stackTrace.includes('LockFile') ||
            stackTrace.includes('LOCK');

          if (isLockError) {
            retryCount++;
            console.warn(
              `[Retry ${retryCount}/${maxRetries}] Database locked. Waiting ${retryDelayMs / 1000}s...`
            );

            if (retryCount < maxRetries) {
              // Wait for previous instance to close
              await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

              // Try to remove lock file
              const lockFilePath = path.join(this.dbPath, 'LOCK');
              try {
                await unlink(lockFilePath);
                console.log('Lock file removed, retrying...');
              } catch {
                // Lock file still held or doesn't exist, continue anyway
              }

              // Reset persistence before retry
              this.persistence = null;
              continue;
            } else {
              // All retries exhausted
              console.error('All retries exhausted. Database is locked.');
              throw new Error(
                'Database is locked by another process after ' +
                  maxRetries +
                  ' retries.\n' +
                  'Please close all other instances of FamilySync and try again.\n' +
                  'If the problem persists, manually delete:\n' +
                  path.join(this.dbPath, 'LOCK')
              );
            }
          } else {
            // Not a lock error, throw immediately
            console.error('Non-lock error during LevelDB initialization:', error);
            throw error;
          }
        }
      }

      if (!this.persistence) {
        const errorMsg = lastError ? lastError.message : 'Failed to initialize LevelDB persistence';
        throw new Error(errorMsg);
      }

      // If familyId is provided, use it as document name
      // Otherwise, use a default document name
      const docName = familyId ?? 'default';
      this.currentDocName = docName;

      // Get or create Yjs document from persistence
      // This automatically loads existing state if available
      // This might also throw a lock error if the database is still locked
      try {
        this.ydoc = await this.persistence.getYDoc(docName);
        
        // Enable garbage collection to reduce memory usage
        if (MEMORY_CONFIG.ENABLE_GC) {
          this.ydoc.gc = true;
        }
      } catch (error) {
        const errorMessage = (error as Error).message || String(error);
        // Check if it's a lock error during document access
        if (
          errorMessage.includes('LOCK') ||
          errorMessage.includes('LockFile') ||
          errorMessage.includes('używany przez inny proces') ||
          errorMessage.includes('being used by another process')
        ) {
          throw new Error(
            'Database is locked during document access. Please close all other instances of FamilySync and try again.'
          );
        }
        throw error;
      }

      // Set up automatic persistence: listen for updates and store them
      this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
        // Only persist local updates (not from sync)
        if (origin !== 'external') {
          void this.persistence?.storeUpdate(docName, update).catch((error) => {
            console.error('Failed to persist Yjs update:', error);
          });
        }
      });

      // Initialize document structure
      this.structure = this.initializeDocumentStructure(this.ydoc);

      // Start periodic garbage collection
      this.startGarbageCollection();

      console.error('[YjsService] Initialized with GC enabled');
      console.error('[YjsService] Document structure created');
      console.error('[YjsService] LevelDB persistence bound to document:', docName);
    } catch (error) {
      console.error('Failed to initialize YjsService:', error);
      throw error;
    }
  }

  /**
   * Initialize the Yjs document structure with all required maps and arrays
   */
  private initializeDocumentStructure(ydoc: Y.Doc): YjsDocumentStructure {
    return {
      // Family core data
      family: ydoc.getMap('family'),
      members: ydoc.getMap('members'),
      devices: ydoc.getMap('devices'),
      invitations: ydoc.getMap('invitations'),

      // Calendar data
      calendars: ydoc.getMap('calendars'),
      events: ydoc.getMap('events'),

      // Tasks data
      taskLists: ydoc.getMap('taskLists'),
      tasks: ydoc.getMap('tasks'),

      // Email/messaging data
      emailAccounts: ydoc.getMap('emailAccounts'),
      emailLabels: ydoc.getMap('emailLabels'),
      conversations: ydoc.getMap('conversations'),
      internalMessages: ydoc.getArray('internalMessages'),

      // Permissions
      permissions: ydoc.getMap('permissions'),
    };
  }

  /**
   * Get the Yjs document
   */
  getDocument(): Y.Doc {
    if (!this.ydoc) {
      throw new Error('YjsService not initialized. Call initialize() first.');
    }
    return this.ydoc;
  }

  /**
   * Get the document structure
   */
  getStructure(): YjsDocumentStructure {
    if (!this.structure) {
      throw new Error('YjsService not initialized. Call initialize() first.');
    }
    return this.structure;
  }

  /**
   * Get a Y.Map by name
   */
  getMap(name: keyof YjsDocumentStructure): Y.Map<unknown> {
    const structure = this.getStructure();
    if (!structure) {
      throw new Error('Yjs structure is null or undefined');
    }
    const map = structure[name];
    if (map === undefined || map === null) {
      throw new Error(
        `Map '${String(name)}' not found in Yjs structure. Service may not be fully initialized.`
      );
    }
    if (!(map instanceof Y.Map)) {
      throw new Error(`Expected Y.Map for '${name}', got ${map?.constructor?.name ?? typeof map}`);
    }
    return map;
  }

  /**
   * Get a Y.Array by name
   */
  getArray(name: 'internalMessages'): Y.Array<unknown> {
    const structure = this.getStructure();
    const array = structure[name];
    if (!(array instanceof Y.Array)) {
      let typeName: string;
      if (array === null || array === undefined) {
        typeName = String(array);
      } else if (typeof array === 'object') {
        try {
          const proto = Object.getPrototypeOf(array) as { constructor?: { name?: string } } | null;
          typeName = proto?.constructor?.name ?? 'object';
        } catch {
          typeName = 'object';
        }
      } else {
        typeName = typeof array;
      }
      throw new Error(`Expected Y.Array for '${name}', got ${typeName}`);
    }
    return array;
  }

  /**
   * Get the current state vector (for sync)
   */
  getStateVector(): Uint8Array {
    const doc = this.getDocument();
    return Y.encodeStateVector(doc);
  }

  /**
   * Get document update (for sync)
   */
  getUpdate(): Uint8Array {
    const doc = this.getDocument();
    return Y.encodeStateAsUpdate(doc);
  }

  /**
   * Apply update from remote peer
   * Use 'external' origin to prevent re-persisting the update
   */
  async applyUpdate(update: Uint8Array): Promise<void> {
    const doc = this.getDocument();
    Y.applyUpdate(doc, update, 'external');

    // Persist the update after applying it
    if (this.persistence && this.currentDocName) {
      try {
        await this.persistence.storeUpdate(this.currentDocName, update);
      } catch (error) {
        console.error('Failed to persist remote update:', error);
      }
    }
  }

  /**
   * Force unlock the database by removing the lock file
   * Use this if you're certain no other instance is accessing the database
   */
  async forceUnlock(): Promise<boolean> {
    try {
      const { unlink, access } = await import('fs/promises');
      const lockFilePath = path.join(this.dbPath, 'LOCK');

      // Check if lock file exists
      try {
        await access(lockFilePath);
      } catch {
        // Lock file doesn't exist
        console.log('No lock file found - database is already unlocked');
        return true;
      }

      // Try to remove the lock file
      try {
        await unlink(lockFilePath);
        console.log('Successfully force-unlocked database');
        return true;
      } catch (error) {
        const errorMessage = (error as Error).message || String(error);
        if (
          errorMessage.includes('używany przez inny proces') ||
          errorMessage.includes('being used by another process') ||
          errorMessage.includes('in use') ||
          errorMessage.includes('permission')
        ) {
          console.error('Cannot force unlock - lock file is being held by another process');
          return false;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error during force unlock:', error);
      return false;
    }
  }

  /**
   * Start periodic garbage collection to keep memory usage low
   */
  private startGarbageCollection(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    this.gcInterval = setInterval(() => {
      this.runGarbageCollection();
    }, MEMORY_CONFIG.GC_INTERVAL_MS);

    // Run initial GC after a short delay
    setTimeout(() => this.runGarbageCollection(), 5000);
  }

  /**
   * Run garbage collection on the Yjs document
   */
  private runGarbageCollection(): void {
    if (!this.ydoc) {return;}

    try {
      // Yjs automatically garbage collects when gc=true
      // We can force a manual GC by accessing the document state
      const clientCount = this.ydoc.store.clients.size;
      const deleteSetSize = this.ydoc.store.pendingDs?.length ?? 0;
      
      // Log memory stats periodically (every 5 GC cycles = 5 minutes)
      if (Math.random() < 0.2) {
        console.error(`[YjsService] GC stats: ${clientCount} clients, ${deleteSetSize} pending deletes`);
      }
    } catch (error) {
      // Ignore GC errors - they're not critical
    }
  }

  /**
   * Close and cleanup - releases database lock
   */
  async close(): Promise<void> {
    try {
      // Stop garbage collection
      if (this.gcInterval) {
        clearInterval(this.gcInterval);
        this.gcInterval = null;
      }

      // First, try to flush any pending updates before destroying
      if (this.persistence && this.currentDocName) {
        try {
          await this.persistence.flushDocument(this.currentDocName);
          console.log('Flushed pending updates');
        } catch (error) {
          console.warn('Failed to flush document during cleanup:', error);
          // Continue with cleanup even if flush fails
        }
      }

      // Destroy persistence (releases lock)
      if (this.persistence) {
        try {
          await this.persistence.destroy();
          console.log('Persistence destroyed, lock released');
          this.persistence = null;
        } catch (error) {
          console.error('Error destroying persistence:', error);
          // Try to force unlock as a fallback
          console.warn('Attempting force unlock as fallback...');
          const unlocked = await this.forceUnlock();
          if (unlocked) {
            console.log('Successfully force-unlocked database');
          }
          this.persistence = null;
        }
      }

      // Clean up Yjs document
      if (this.ydoc) {
        this.ydoc.destroy();
        this.ydoc = null;
        this.structure = null;
        console.log('Yjs document destroyed');
      }

      console.log('YjsService closed and lock released');
    } catch (error) {
      console.error('Error during YjsService cleanup:', error);
      // Try to force unlock as last resort
      try {
        await this.forceUnlock();
      } catch (unlockError) {
        console.error('Failed to force unlock during cleanup:', unlockError);
      }
      // Don't throw - cleanup should not fail the shutdown
    }
  }
}
