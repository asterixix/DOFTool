import crypto from 'crypto';
import os from 'os';
import path from 'path';

import { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } from 'electron';

import { EmailSearchService } from './services/EmailSearchService';
import { EmailService } from './services/EmailService';
import { testEmailConnections } from './services/EmailServiceConnectionTest';
import { EncryptionService } from './services/EncryptionService';
import { ExternalCalendarSyncService } from './services/ExternalCalendarSyncService';
import {
  NotificationService,
  type NotificationEvent,
  type NotificationModule,
  type NotificationPreferences,
  type NotificationPreferencesUpdate,
  type NotificationHistoryItem,
  type NotificationPriority,
} from './services/NotificationService';
import { StorageService } from './services/StorageService';
import { SyncService, type SyncStatus, type DiscoveredPeer, type PeerConnection } from './services/sync';
import { YjsService, type YjsDocumentStructure } from './services/YjsService';

import type { ImapConfig, SmtpConfig } from './services/EmailService';
import type { Calendar, CalendarEvent } from '@/modules/calendar/types/Calendar.types';
import type * as Y from 'yjs';

// Interface declarations
export interface CalendarInfo {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  visibility: string;
  defaultPermission: string;
  sharedWith: Array<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }>;
  defaultReminders: Array<{ id: string; type: string; minutes: number }>;
  timezone: string;
  createdAt: number;
  updatedAt: number;
  // External sync
  externalSyncEnabled?: boolean;
  externalSource?: {
    type: 'ical_url' | 'google' | 'outlook' | 'icloud' | 'caldav';
    url?: string;
    accountId?: string;
    calendarId?: string;
    syncDirection: 'one_way' | 'bidirectional';
  };
  lastSyncAt?: number;
  syncInterval?: number; // in milliseconds, default 24 hours
}

export interface CalendarEventInfo {
  id: string;
  calendarId: string;
  familyId: string;
  title: string;
  description?: string;
  location?: string;
  start: number;
  end: number;
  allDay: boolean;
  timezone?: string;
  recurrence?: {
    frequency: string;
    interval: number;
    count?: number;
    until?: number;
    byDay?: Array<{ day: string; position?: number }>;
    byMonthDay?: number[];
    byMonth?: number[];
    exdates?: number[];
  };
  status: string;
  busyStatus: string;
  category?: string;
  color?: string;
  attendees: Array<{
    id: string;
    name: string;
    email?: string;
    isFamilyMember: boolean;
    memberId?: string;
    responseStatus: string;
    role: string;
    optional: boolean;
  }>;
  reminders: Array<{ id: string; type: string; minutes: number }>;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  externalId?: string; // For external sync (e.g., iCal UID)
  externalEtag?: string; // For external sync (e.g., HTTP ETag)
}

let mainWindow: BrowserWindow | null = null;

// Core services
let storageService: StorageService | null = null;
let yjsService: YjsService | null = null;
let encryptionService: EncryptionService | null = null;
let emailService: EmailService | null = null;
let emailSearchService: EmailSearchService | null = null;
let externalCalendarSyncService: ExternalCalendarSyncService | null = null;
let notificationService: NotificationService | null = null;
let syncService: SyncService | null = null;
let tray: Tray | null = null;
let isQuiting = false;
const reminderTimers: Map<string, NodeJS.Timeout[]> = new Map();
// Email notification tracking - moved to persistent storage in fetchMessages handler
const emittedTaskCompletion: Set<string> = new Set();

// Safe app wrapper to handle undefined during build
const safeApp = () => {
  if (typeof app === 'undefined') {
    // Return mock object during build
    return {
      isPackaged: false,
      whenReady: Promise.resolve(),
      getVersion: () => '0.0.0',
      getName: () => 'DOFTool',
      getAppPath: () => '.',
      setLoginItemSettings: () => {},
      quit: () => {},
      on: () => {},
    } as typeof app;
  }
  return app;
};

const isDev = process.env.NODE_ENV === 'development' || !(safeApp().isPackaged ?? false);

type PermissionRole = 'admin' | 'member' | 'viewer';

interface AppSettings {
  autoLaunchEnabled: boolean;
  minimizeToTray: boolean;
}

interface FamilyInfo {
  id: string;
  name: string;
  createdAt: number;
  adminDeviceId: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  addedAt: number;
  lastSeen: number;
  isCurrent: boolean;
}

interface InvitationInfo {
  token: string;
  role: PermissionRole;
  createdAt: number;
  used: boolean;
}

interface PermissionInfo {
  memberId: string;
  role: PermissionRole;
  createdAt: number;
}

interface FamilyState {
  family: FamilyInfo | null;
  devices: DeviceInfo[];
  permissions: PermissionInfo[];
}

// Helper functions to get services with null safety checks
function getStorageService(): StorageService {
  if (!storageService) {
    throw new Error('StorageService not initialized yet. Please wait for services to initialize.');
  }
  return storageService;
}

function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    throw new Error(
      'EncryptionService not initialized yet. Please wait for services to initialize.'
    );
  }
  return encryptionService;
}

function getNotificationService(): NotificationService {
  if (!notificationService) {
    throw new Error(
      'NotificationService not initialized yet. Please wait for services to initialize.'
    );
  }
  return notificationService;
}

let appSettings: AppSettings = {
  autoLaunchEnabled: false,
  minimizeToTray: true,
};

async function loadAppSettings(): Promise<void> {
  const storage = getStorageService();
  const stored = await storage.get('app:settings');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      appSettings = {
        autoLaunchEnabled:
          typeof parsed.autoLaunchEnabled === 'boolean' ? parsed.autoLaunchEnabled : false,
        minimizeToTray: typeof parsed.minimizeToTray === 'boolean' ? parsed.minimizeToTray : true,
      };
    } catch {
      appSettings = { autoLaunchEnabled: false, minimizeToTray: true };
    }
  }
}

async function persistAppSettings(): Promise<void> {
  const storage = getStorageService();
  await storage.set('app:settings', JSON.stringify(appSettings));
}

function applyAutoLaunchSetting(): void {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    safeApp().setLoginItemSettings({ openAtLogin: appSettings.autoLaunchEnabled });
  } else {
    // Linux note: openAtLogin not supported; setting is persisted for future support or installers.
    console.warn('Auto-launch is not supported on this platform; setting persisted only.');
  }
}

function getTrayIconPath(): string {
  const appPath = safeApp().getAppPath();
  if (process.platform === 'win32') {
    return path.join(appPath, 'build', 'icon.ico');
  }
  if (process.platform === 'darwin') {
    return path.join(appPath, 'build', 'icon.icns');
  }
  return path.join(appPath, 'build', 'favicon195.png');
}

function createTray(): void {
  if (tray) {
    tray.destroy();
  }
  const iconPath = getTrayIconPath();
  const image = nativeImage.createFromPath(iconPath);
  tray = new Tray(image);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open DOFTool',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: appSettings.autoLaunchEnabled ? 'Disable Auto-launch' : 'Enable Auto-launch',
      click: async () => {
        appSettings = { ...appSettings, autoLaunchEnabled: !appSettings.autoLaunchEnabled };
        applyAutoLaunchSetting();
        await persistAppSettings();
        createTray(); // refresh menu labels
      },
    },
    {
      label: appSettings.minimizeToTray ? 'Disable Minimize to Tray' : 'Enable Minimize to Tray',
      click: async () => {
        appSettings = { ...appSettings, minimizeToTray: !appSettings.minimizeToTray };
        await persistAppSettings();
        createTray();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuiting = true;
        safeApp().quit();
      },
    },
  ]);

  tray.setToolTip('DOFTool');
  tray.setContextMenu(contextMenu);
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#fffaf5',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      // Allow scripts in sandboxed iframes for email rendering
      additionalArguments: ['--allow-running-insecure-content'],
    },
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle navigation errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    // Don't quit on load failure - just log it
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch((error) => {
      console.error('Failed to load URL:', error);
    });
    // Auto-open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html')).catch((error) => {
      console.error('Failed to load file:', error);
    });
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (isQuiting) {
      return;
    }
    if (appSettings.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

// Create application menu with debug tools
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            safeApp().quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (_, focusedWindow) => {
            const window = focusedWindow as BrowserWindow | undefined;
            if (window instanceof BrowserWindow) {
              window.reload();
            }
          },
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (_, focusedWindow) => {
            const window = focusedWindow as BrowserWindow | undefined;
            if (window instanceof BrowserWindow) {
              window.webContents.reloadIgnoringCache();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: (_, focusedWindow) => {
            const window = focusedWindow as BrowserWindow | undefined;
            if (window instanceof BrowserWindow) {
              window.webContents.toggleDevTools();
            }
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: (_, focusedWindow) => {
            const window = focusedWindow as BrowserWindow | undefined;
            if (window instanceof BrowserWindow) {
              window.setFullScreen(!window.isFullScreen());
            }
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
      ],
    },
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: safeApp().getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });

    // Window menu
    template[3].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' },
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize core services
async function initializeServices(): Promise<void> {
  try {
    console.log('Initializing core services...');

    // Initialize encryption service first (needed by others)
    encryptionService = new EncryptionService();
    await encryptionService.initialize();

    // Initialize storage service
    storageService = new StorageService();
    await storageService.initialize();

    notificationService = new NotificationService(storageService);
    await notificationService.initialize();

    // Initialize Yjs service (doesn't need storage service)
    yjsService = new YjsService();
    await yjsService.initialize();

    // Initialize email service
    emailService = new EmailService(encryptionService, storageService);
    await emailService.initialize();

    // Initialize email search service
    emailSearchService = new EmailSearchService();
    await emailSearchService.initialize();

    // Initialize external calendar sync service
    externalCalendarSyncService = new ExternalCalendarSyncService(yjsService);
    await externalCalendarSyncService.start();

    // Initialize P2P sync service
    await initializeSyncService();

    await loadAppSettings();
    applyAutoLaunchSetting();
    createTray();

    console.log('All core services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

function getFamilyCollections(): {
  familyMap: Y.Map<unknown>;
  devicesMap: Y.Map<unknown>;
  membersMap: Y.Map<unknown>;
  permissionsMap: Y.Map<unknown>;
  invitationsMap: Y.Map<unknown>;
} {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  try {
    const structure = yjsService.getStructure();
    if (
      !structure?.family ||
      !structure.devices ||
      !structure.members ||
      !structure.permissions ||
      !structure.invitations
    ) {
      throw new Error('Yjs structure not properly initialized');
    }
    return {
      familyMap: structure.family,
      devicesMap: structure.devices,
      membersMap: structure.members,
      permissionsMap: structure.permissions,
      invitationsMap: structure.invitations,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('not initialized')) {
      throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
    }
    throw error;
  }
}

async function ensureDevice(): Promise<DeviceInfo> {
  const storage = getStorageService();
  const storedId = await storage.get('device:id');
  const storedName = await storage.get('device:name');

  const id = storedId ?? crypto.randomUUID();
  const name = storedName ?? os.hostname();
  const now = Date.now();

  await storage.set('device:id', id);
  await storage.set('device:name', name);

  return {
    id,
    name,
    addedAt: now,
    lastSeen: now,
    isCurrent: true,
  };
}

function mapToArray<T>(map: Y.Map<unknown>): T[] {
  const results: T[] = [];
  map.forEach((value) => {
    results.push(value as T);
  });
  return results;
}

function getFamilyState(): FamilyState {
  const { familyMap, devicesMap, permissionsMap } = getFamilyCollections();
  const family = (familyMap.get('info') as FamilyInfo | undefined) ?? null;
  const devices = mapToArray<DeviceInfo>(devicesMap);
  const permissions = mapToArray<PermissionInfo>(permissionsMap);
  return { family, devices, permissions };
}

// Initialize P2P sync service - runs in background to avoid blocking app startup
function initializeSyncServiceAsync(): void {
  // Defer sync initialization to next tick to avoid blocking UI
  setImmediate(() => {
    void initializeSyncServiceCore();
  });
}

// Core sync initialization logic
async function initializeSyncServiceCore(): Promise<void> {
  if (!yjsService || !storageService) {
    console.error('[SyncService] Required services not initialized');
    return;
  }

  try {
    // Get device ID and family info
    const deviceId = (await storageService.get('device:id')) ?? crypto.randomUUID();
    const deviceName = (await storageService.get('device:name')) ?? os.hostname();
    
    let familyState: FamilyState;
    try {
      familyState = getFamilyState();
    } catch {
      console.error('[SyncService] Failed to get family state, will retry later');
      // Retry after a delay if family state isn't ready
      setTimeout(() => void initializeSyncServiceCore(), 2000);
      return;
    }

    if (!familyState.family) {
      console.error('[SyncService] No family configured, skipping sync service init');
      return;
    }

    // Create and initialize sync service
    syncService = new SyncService();
    await syncService.initialize(
      {
        deviceId,
        deviceName,
        familyId: familyState.family.id,
      },
      yjsService.getDocument()
    );

    // Set up event handlers to forward to renderer (throttled in SyncService)
    syncService.on('status-changed', (status: SyncStatus) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync:status-changed', status);
      }
    });

    syncService.on('peer-connected', (connection: PeerConnection) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync:peer-connected', {
          deviceId: connection.deviceId,
          deviceName: connection.deviceName,
          status: connection.status,
        });
      }
    });

    syncService.on('peer-disconnected', (peerDeviceId: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync:peer-disconnected', peerDeviceId);
      }
    });

    syncService.on('peer-discovered', (peer: DiscoveredPeer) => {
      console.error(`[SyncService] Discovered peer: ${peer.deviceName}`);
    });

    // Start the sync service in next tick to avoid blocking
    setImmediate(() => {
      if (syncService) {
        syncService.start();
        console.error('[SyncService] P2P sync service started');
      }
    });
  } catch (error) {
    console.error('[SyncService] Failed to initialize:', error);
  }
}

// Legacy wrapper for backward compatibility
async function initializeSyncService(): Promise<void> {
  initializeSyncServiceAsync();
}


// Cleanup services on app quit
async function cleanupServices(): Promise<void> {
  try {
    console.log('Starting service cleanup...');

    // Stop sync service first
    if (syncService) {
      syncService.destroy();
      syncService = null;
    }

    // Cleanup with timeout to prevent hanging
    const cleanupPromise = Promise.all([
      yjsService?.close().catch((error) => {
        console.error('Error closing YjsService:', error);
      }),
      storageService?.close().catch((error) => {
        console.error('Error closing StorageService:', error);
      }),
    ]);

    // Wait for cleanup with a 5-second timeout
    await Promise.race([
      cleanupPromise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('Cleanup timeout - forcing exit');
          resolve();
        }, 5000);
      }),
    ]);

    console.log('Services cleaned up');
  } catch (error) {
    console.error('Error during cleanup:', error);
    // Try to force unlock as last resort
    if (yjsService) {
      try {
        await yjsService.forceUnlock();
      } catch (unlockError) {
        console.error('Failed to force unlock during cleanup:', unlockError);
      }
    }
  }
}

// App lifecycle
if (typeof app !== 'undefined') {
  void app.whenReady().then(async () => {
  try {
    // Initialize services before creating window
    await initializeServices();

    // Create menu before creating window
    createMenu();

    createWindow();

    app.on('activate', () => {
      // On macOS, re-create window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    // Don't exit on Windows - let user see the error
    if (process.platform === 'darwin') {
      app.quit();
    }
  }
});
}

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // For database lock errors, provide user-friendly message
  const errorMessage = error.message || String(error);
  if (errorMessage.includes('locked') || errorMessage.includes('LOCK')) {
    console.error(
      '\n⚠️  DATABASE LOCK ERROR:\n' +
        'The database is locked by another process.\n' +
        'Please close all other instances of DOFTool and try again.\n'
    );
  } else {
    // For other errors, just log them
    console.error('Error details:', error);
  }
  // Don't quit immediately - let the app try to recover or show error to user
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't quit - let Electron handle it
  const errorMessage = String(reason);
  if (errorMessage.includes('locked') || errorMessage.includes('LOCK')) {
    console.error(
      '\n⚠️  DATABASE LOCK ERROR:\n' +
        'The database is locked by another process.\n' +
        'Please close all other instances of DOFTool and try again.\n'
    );
  }
});

if (typeof app !== 'undefined') {
  app.on('will-quit', () => {
    // Cleanup services before app quits
    console.log('App is quitting - cleaning up services...');
  // Stop external calendar sync service
  if (externalCalendarSyncService) {
    externalCalendarSyncService.stop();
  }
  // Stop email service
  if (emailService) {
    void emailService.close();
  }
  void cleanupServices().then(() => {
    console.log('Cleanup complete - app will now quit');
  });
});
}

// Handle app termination (SIGTERM, SIGINT, etc.)
process.on('SIGTERM', () => {
  console.log('SIGTERM received - cleaning up services...');
  void cleanupServices().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received - cleaning up services...');
  void cleanupServices().then(() => {
    console.log('Cleanup complete - app will now quit');
  });
});

// Ensure cleanup happens even on unexpected exits
process.on('exit', () => {
  console.log('Process exiting...');
});

if (typeof app !== 'undefined') {
  app.on('window-all-closed', () => {
    // On macOS, keep app running until explicitly quit
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Security: Prevent navigation to external URLs
  app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'http://localhost:5173' && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });
});
}

function isNotificationModule(value: unknown): value is NotificationModule {
  return (
    value === 'calendar' ||
    value === 'tasks' ||
    value === 'email' ||
    value === 'family' ||
    value === 'system'
  );
}

function isNotificationPriority(value: unknown): value is NotificationPriority {
  return value === 'silent' || value === 'normal' || value === 'urgent';
}

function sendNotificationUpdateToRenderer(): void {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send('notifications:updated');
}

function emitNotification(event: NotificationEvent): Promise<NotificationHistoryItem | null> {
  return getNotificationService().emit(event);
}

function emitModuleNotification(event: NotificationEvent): Promise<NotificationHistoryItem | null> {
  return emitNotification(event).then((item) => {
    sendNotificationUpdateToRenderer();
    return item;
  });
}

function clearEventReminders(eventId: string): void {
  const timers = reminderTimers.get(eventId);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    reminderTimers.delete(eventId);
  }
}

function scheduleEventReminders(event: CalendarEventInfo): void {
  clearEventReminders(event.id);
  if (!event.reminders?.length) {
    return;
  }

  const timers: NodeJS.Timeout[] = [];
  const now = Date.now();

  for (const reminder of event.reminders) {
    const minutes = reminder.minutes ?? 0;
    const triggerAt = event.start - minutes * 60_000;
    const delay = triggerAt - now;
    if (delay <= 0) {
      continue; // Skip past reminders
    }

    const priority: NotificationPriority = minutes <= 5 ? 'urgent' : 'normal';
    const timeout = setTimeout(() => {
      void emitModuleNotification({
        module: 'calendar',
        title: `Reminder: ${event.title}`,
        body: `Starts at ${new Date(event.start).toLocaleString()}`,
        priority,
        data: { eventId: event.id, calendarId: event.calendarId },
      });
    }, delay);

    timers.push(timeout);
  }

  if (timers.length > 0) {
    reminderTimers.set(event.id, timers);
  }
}

function emitCalendarEventNotification(
  title: string,
  body: string | undefined,
  data: Record<string, unknown>,
  priority: NotificationPriority = 'normal'
): void {
  void emitModuleNotification({
    module: 'calendar',
    title,
    body,
    data,
    priority,
  });
}

function emitTaskNotification(
  title: string,
  body: string | undefined,
  data: Record<string, unknown>,
  priority: NotificationPriority = 'normal'
): void {
  void emitModuleNotification({
    module: 'tasks',
    title,
    body,
    data,
    priority,
  });
}

function emitEmailNotification(
  title: string,
  body: string | undefined,
  data: Record<string, unknown>,
  priority: NotificationPriority = 'normal'
): void {
  void emitModuleNotification({
    module: 'email',
    title,
    body,
    data,
    priority,
  });
}

// Helper function to remove a message from notification tracking
async function clearEmailNotificationTracking(
  accountId: string,
  folder: string,
  messageId: string
): Promise<void> {
  const notifiedEmailKey = `email:notified:${accountId}:${folder}`;
  const notifiedJson = await getStorageService().get(notifiedEmailKey);
  
  if (notifiedJson) {
    const notifiedIds = JSON.parse(notifiedJson) as string[];
    const updatedIds = notifiedIds.filter((id: string) => id !== messageId);
    
    if (updatedIds.length === 0) {
      // Remove the storage entry if no IDs left
      await getStorageService().delete(notifiedEmailKey);
    } else {
      // Update with filtered IDs
      await getStorageService().set(notifiedEmailKey, JSON.stringify(updatedIds));
    }
  }
}

// IPC Handlers
if (typeof ipcMain !== 'undefined') {
  // App info
  ipcMain.handle('app:version', () => {
  return safeApp().getVersion();
});

ipcMain.handle('app:platform', () => {
  return process.platform;
});

ipcMain.handle('notifications:getPreferences', () => {
  return getNotificationService().getPreferences();
});

ipcMain.handle('notifications:updatePreferences', async (_event, update: unknown) => {
  if (!isRecord(update)) {
    throw new Error('Invalid notification preferences update');
  }

  const partial: NotificationPreferencesUpdate = {};

  if (typeof update.paused === 'boolean') {
    partial.paused = update.paused;
  }

  if (typeof update.historyLimit === 'number' && Number.isFinite(update.historyLimit)) {
    partial.historyLimit = update.historyLimit;
  }

  if (isRecord(update.modules)) {
    const modulesUpdate: Partial<
      Record<NotificationModule, Partial<NotificationPreferences['modules'][NotificationModule]>>
    > = {};

    const moduleKeys: NotificationModule[] = ['calendar', 'tasks', 'email', 'family', 'system'];
    for (const key of moduleKeys) {
      const candidate = update.modules[key];
      if (!isRecord(candidate)) {
        continue;
      }

      const modulePartial: Partial<NotificationPreferences['modules'][NotificationModule]> = {};

      if (typeof candidate.enabled === 'boolean') {
        modulePartial.enabled = candidate.enabled;
      }

      if (typeof candidate.allowUrgent === 'boolean') {
        modulePartial.allowUrgent = candidate.allowUrgent;
      }

      if (typeof candidate.allowSound === 'boolean') {
        modulePartial.allowSound = candidate.allowSound;
      }

      modulesUpdate[key] = modulePartial;
    }

    partial.modules = modulesUpdate;
  }

  const updated = await getNotificationService().updatePreferences(partial);
  sendNotificationUpdateToRenderer();
  return updated;
});

ipcMain.handle('notifications:getHistory', () => {
  return getNotificationService().getHistory();
});

ipcMain.handle('notifications:clearHistory', async () => {
  await getNotificationService().clearHistory();
  sendNotificationUpdateToRenderer();
  return { success: true };
});

ipcMain.handle('notifications:emit', async (_event, input: unknown) => {
  if (!isRecord(input)) {
    throw new Error('Invalid notification event');
  }

  if (!isNotificationModule(input.module)) {
    throw new Error('Invalid notification module');
  }

  if (!isNotificationPriority(input.priority)) {
    throw new Error('Invalid notification priority');
  }

  if (typeof input.title !== 'string' || !input.title.trim()) {
    throw new Error('Notification title is required');
  }

  const body = typeof input.body === 'string' ? input.body : undefined;
  const data = isRecord(input.data) ? input.data : undefined;

  const event: NotificationEvent = {
    module: input.module,
    title: input.title.trim(),
    body,
    priority: input.priority,
    data,
  };

  const item = await getNotificationService().emit(event);
  sendNotificationUpdateToRenderer();
  return item;
});

// Encryption service handlers
ipcMain.handle('encryption:generateKey', () => {
  const key = getEncryptionService().generateKey();
  return {
    id: key.id,
    key: Array.from(key.key), // Convert Uint8Array to regular array for IPC
  };
});

ipcMain.handle('encryption:deriveKey', (_event, passphrase: string, salt: number[]) => {
  const saltBytes = Uint8Array.from(salt);
  const key = getEncryptionService().deriveKeyFromPassphrase(passphrase, saltBytes);
  return {
    id: key.id,
    key: Array.from(key.key),
  };
});

ipcMain.handle('encryption:generateSalt', () => {
  const salt = getEncryptionService().generateSalt();
  return Array.from(salt);
});

ipcMain.handle(
  'encryption:encrypt',
  (_event, data: number[], keyId: string, keyBytes: number[]) => {
    const dataBytes = Uint8Array.from(data);
    const key: { id: string; key: Uint8Array } = {
      id: keyId,
      key: Uint8Array.from(keyBytes),
    };
    const encrypted = getEncryptionService().encrypt(dataBytes, key);
    return {
      ciphertext: Array.from(encrypted.ciphertext),
      nonce: Array.from(encrypted.nonce),
      keyId: encrypted.keyId,
    };
  }
);

ipcMain.handle(
  'encryption:decrypt',
  (
    _event,
    encrypted: { ciphertext: number[]; nonce: number[]; keyId: string },
    keyId: string,
    keyBytes: number[]
  ) => {
    const encryptedData = {
      ciphertext: Uint8Array.from(encrypted.ciphertext),
      nonce: Uint8Array.from(encrypted.nonce),
      keyId: encrypted.keyId,
    };
    const key: { id: string; key: Uint8Array } = {
      id: keyId,
      key: Uint8Array.from(keyBytes),
    };
    const decrypted = getEncryptionService().decrypt(encryptedData, key);
    return Array.from(decrypted);
  }
);

ipcMain.handle('encryption:hash', (_event, data: number[]) => {
  const dataBytes = Uint8Array.from(data);
  const hash = getEncryptionService().hash(dataBytes);
  return Array.from(hash);
});

ipcMain.handle('encryption:hashString', (_event, text: string) => {
  return getEncryptionService().hashString(text);
});

ipcMain.handle('encryption:generateToken', (_event, length?: number) => {
  return getEncryptionService().generateToken(length);
});

// Yjs service handlers
ipcMain.handle('yjs:getDocumentState', () => {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  const stateVector = yjsService.getStateVector();
  const update = yjsService.getUpdate();
  return {
    stateVector: Array.from(stateVector),
    update: Array.from(update),
  };
});

ipcMain.handle('yjs:applyUpdate', (_event, update: number[]) => {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  const updateBytes = Uint8Array.from(update);
  void yjsService.applyUpdate(updateBytes).catch((error) => {
    console.error('Error applying update:', error);
  });
  return true;
});

ipcMain.handle('yjs:getMap', (_event, mapName: string) => {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  try {
    const map = yjsService.getMap(mapName as keyof YjsDocumentStructure);
    const entries: Record<string, unknown> = {};
    map.forEach((value, key) => {
      entries[key] = value;
    });
    return entries;
  } catch (error) {
    console.error(`Error in yjs:getMap for '${mapName}':`, error);
    throw error;
  }
});

ipcMain.handle('yjs:forceUnlock', async () => {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  return await yjsService.forceUnlock();
});

// Storage service handlers
ipcMain.handle('storage:get', async (_event, key: string) => {
  return await getStorageService().get(key);
});

ipcMain.handle('storage:set', async (_event, key: string, value: string) => {
  await getStorageService().set(key, value);
  return true;
});

ipcMain.handle('storage:delete', async (_event, key: string) => {
  await getStorageService().delete(key);
  return true;
});

ipcMain.handle('storage:getKeysByPrefix', async (_event, prefix: string) => {
  return await getStorageService().getKeysByPrefix(prefix);
});

ipcMain.handle('family:get', async () => {
  const { devicesMap } = getFamilyCollections();
  const device = await ensureDevice();
  const existing = devicesMap.get(device.id) as DeviceInfo | undefined;
  const mergedDevice: DeviceInfo = existing
    ? { ...existing, lastSeen: Date.now(), isCurrent: true }
    : device;
  devicesMap.set(device.id, mergedDevice);
  return getFamilyState();
});

ipcMain.handle('family:create', async (_event, name: string) => {
  const trimmed = name?.trim();
  if (!trimmed) {
    throw new Error('Family name is required');
  }

  const { familyMap, devicesMap, permissionsMap } = getFamilyCollections();
  const device = await ensureDevice();

  const existing = familyMap.get('info') as FamilyInfo | undefined;
  if (existing) {
    return getFamilyState();
  }

  const info: FamilyInfo = {
    id: crypto.randomUUID(),
    name: trimmed,
    createdAt: Date.now(),
    adminDeviceId: device.id,
  };

  familyMap.set('info', info);

  const deviceRecord: DeviceInfo = {
    ...device,
    addedAt: Date.now(),
    lastSeen: Date.now(),
    isCurrent: true,
  };
  devicesMap.set(device.id, deviceRecord);

  const permission: PermissionInfo = {
    memberId: device.id,
    role: 'admin',
    createdAt: Date.now(),
  };
  permissionsMap.set(permission.memberId, permission);

  return getFamilyState();
});

ipcMain.handle('family:invite', (_event, role: PermissionRole) => {
  if (!['admin', 'member', 'viewer'].includes(role)) {
    throw new Error('Invalid role for invitation');
  }

  const { invitationsMap } = getFamilyCollections();
  const token = getEncryptionService().generateToken(24);
  const invitation: InvitationInfo = {
    token,
    role,
    createdAt: Date.now(),
    used: false,
  };
  invitationsMap.set(token, invitation);

  return { token, role };
});

ipcMain.handle('family:join', async (_event, token: string) => {
  const { invitationsMap, devicesMap, permissionsMap, familyMap } = getFamilyCollections();
  const invite = invitationsMap.get(token) as InvitationInfo | undefined;
  if (!invite || invite.used) {
    return { success: false, reason: 'invalid_token' };
  }

  const device = await ensureDevice();
  const deviceRecord: DeviceInfo = {
    ...device,
    addedAt: Date.now(),
    lastSeen: Date.now(),
    isCurrent: true,
  };
  devicesMap.set(device.id, deviceRecord);

  const permission: PermissionInfo = {
    memberId: device.id,
    role: invite.role === 'admin' ? 'member' : invite.role,
    createdAt: Date.now(),
  };
  permissionsMap.set(permission.memberId, permission);

  invitationsMap.set(token, { ...invite, used: true });

  const family = familyMap.get('info') as FamilyInfo | undefined;
  return { success: true, family };
});

ipcMain.handle('family:devices', () => {
  return getFamilyState().devices;
});

ipcMain.handle('family:removeDevice', async (_event, deviceId: string) => {
  const { devicesMap } = getFamilyCollections();
  const currentId = await getStorageService().get('device:id');
  if (deviceId === currentId) {
    throw new Error('Cannot remove the current device');
  }
  devicesMap.delete(deviceId);
  return mapToArray<DeviceInfo>(devicesMap);
});

ipcMain.handle('family:getPermissions', () => {
  return getFamilyState().permissions;
});

ipcMain.handle('family:setPermission', (_event, memberId: string, role: PermissionRole) => {
  if (!['admin', 'member', 'viewer'].includes(role)) {
    throw new Error('Invalid role');
  }
  const { permissionsMap } = getFamilyCollections();
  const permission: PermissionInfo = { memberId, role, createdAt: Date.now() };
  permissionsMap.set(memberId, permission);
  return permission;
});

// ============================================================================
// P2P Sync IPC Handlers
// ============================================================================

ipcMain.handle('sync:status', () => {
  if (!syncService) {
    return {
      status: 'offline' as const,
      peerCount: 0,
      lastSyncAt: null,
      error: 'Sync service not initialized',
    };
  }
  return syncService.getStatus();
});

ipcMain.handle('sync:force', () => {
  if (!syncService) {
    return { success: false, error: 'Sync service not initialized' };
  }
  syncService.forceSync();
  return { success: true };
});

ipcMain.handle('sync:peers', () => {
  if (!syncService) {
    return [];
  }
  return syncService.getConnectedPeers().map((peer) => ({
    deviceId: peer.deviceId,
    deviceName: peer.deviceName,
    status: peer.status,
    lastSeen: peer.lastSeen,
    lastSyncAt: peer.lastSyncAt,
  }));
});

ipcMain.handle('sync:start', () => {
  if (!syncService) {
    return { success: false, error: 'Sync service not initialized' };
  }
  if (!syncService.isActive()) {
    syncService.start();
  }
  return { success: true };
});

ipcMain.handle('sync:stop', () => {
  if (!syncService) {
    return { success: false, error: 'Sync service not initialized' };
  }
  if (syncService.isActive()) {
    syncService.stop();
  }
  return { success: true };
});

ipcMain.handle('sync:discovered-peers', () => {
  if (!syncService) {
    return [];
  }
  return syncService.getDiscoveredPeers().map((peer) => ({
    deviceId: peer.deviceId,
    deviceName: peer.deviceName,
    host: peer.host,
    port: peer.port,
    discoveredAt: peer.discoveredAt,
  }));
});

// ============================================================================
// Calendar IPC Handlers
// ============================================================================

function getCalendarCollections(): {
  calendarsMap: Y.Map<CalendarInfo>;
  eventsMap: Y.Map<CalendarEventInfo>;
} {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  try {
    const structure = yjsService.getStructure();
    if (!structure?.calendars || !structure.events) {
      throw new Error('Yjs structure not properly initialized');
    }
    return {
      calendarsMap: structure.calendars as Y.Map<CalendarInfo>,
      eventsMap: structure.events as Y.Map<CalendarEventInfo>,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('not initialized')) {
      throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
    }
    throw error;
  }
}

// Check if a user has permission to perform an operation on a calendar
function checkCalendarPermission(
  calendarId: string,
  operation: 'view' | 'edit' | 'admin',
  memberId?: string
): boolean {
  const { calendarsMap } = getCalendarCollections();

  const calendar = calendarsMap.get(calendarId);
  if (!calendar) {
    return false;
  }

  // Owner has all permissions
  if (calendar.ownerId === memberId) {
    return true;
  }

  // Check visibility for non-owners
  if (calendar.visibility === 'private') {
    return false;
  }

  // Find the member's share
  const share = calendar.sharedWith.find((s) => s.memberId === memberId);
  if (!share) {
    // If no explicit share, check default permission
    if (calendar.visibility === 'family' && calendar.defaultPermission !== 'none') {
      return getPermissionLevel(calendar.defaultPermission) >= getPermissionLevel(operation);
    }
    return false;
  }

  // Check the shared permission level
  return getPermissionLevel(share.permission) >= getPermissionLevel(operation);
}

// Convert permission string to numeric level for comparison
function getPermissionLevel(permission: string): number {
  switch (permission) {
    case 'admin':
      return 3;
    case 'edit':
      return 2;
    case 'view':
      return 1;
    case 'none':
      return 0;
    default:
      return 0;
  }
}

// Get all calendars
ipcMain.handle('calendar:getAll', async () => {
  const { calendarsMap } = getCalendarCollections();
  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';
  const calendars: CalendarInfo[] = [];

  calendarsMap.forEach((cal) => {
    // Only return calendars the user can view
    if (checkCalendarPermission(cal.id, 'view', deviceId)) {
      calendars.push(cal);
    }
  });

  return calendars;
});

// Get single calendar
ipcMain.handle('calendar:get', (_event, calendarId: string) => {
  const { calendarsMap } = getCalendarCollections();
  return calendarsMap.get(calendarId) ?? null;
});

// Create calendar
ipcMain.handle(
  'calendar:create',
  async (
    _event,
    data: {
      name: string;
      description?: string;
      color: string;
      visibility: string;
      timezone?: string;
    }
  ) => {
    const { calendarsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    const calendar: CalendarInfo = {
      id: crypto.randomUUID(),
      familyId: 'default', // TODO: Get from family store
      name: data.name,
      description: data.description,
      color: data.color,
      ownerId: deviceId,
      visibility: data.visibility,
      defaultPermission: 'view',
      sharedWith: [],
      defaultReminders: [{ id: crypto.randomUUID(), type: 'notification', minutes: 15 }],
      timezone: data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      externalSyncEnabled: false,
      externalSource: undefined,
      lastSyncAt: undefined,
      syncInterval: undefined,
    };

    calendarsMap.set(calendar.id, calendar);
    return calendar;
  }
);

// Update calendar
ipcMain.handle(
  'calendar:update',
  async (
    _event,
    calendarId: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
      visibility: string;
      timezone: string;
    }>
  ) => {
    const { calendarsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';
    const existing = calendarsMap.get(calendarId);

    if (!existing) {
      throw new Error('Calendar not found');
    }

    // Check permission to edit calendar
    if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify this calendar');
    }

    const updated: CalendarInfo = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    calendarsMap.set(calendarId, updated);
    return updated;
  }
);

// Delete calendar
ipcMain.handle('calendar:delete', async (_event, calendarId: string) => {
  const { calendarsMap, eventsMap } = getCalendarCollections();
  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check permission to delete calendar
  if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
    throw new Error('You do not have permission to delete this calendar');
  }

  // Delete all events in this calendar
  const eventsToDelete: string[] = [];
  eventsMap.forEach((event, eventId) => {
    if (event.calendarId === calendarId) {
      eventsToDelete.push(eventId);
    }
  });

  for (const eventId of eventsToDelete) {
    eventsMap.delete(eventId);
  }

  calendarsMap.delete(calendarId);
  return { success: true };
});

// Get events in date range
ipcMain.handle(
  'calendar:getEvents',
  async (
    _event,
    query: {
      calendarIds?: string[];
      start: number;
      end: number;
    }
  ) => {
    const { eventsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';
    const events: CalendarEventInfo[] = [];

    eventsMap.forEach((event) => {
      // Filter by calendar
      if (query.calendarIds && query.calendarIds.length > 0) {
        if (!query.calendarIds.includes(event.calendarId)) {
          return;
        }

        // Check if user has permission to view events in this calendar
        if (!checkCalendarPermission(event.calendarId, 'view', deviceId)) {
          return;
        }
      }

      // Filter by date range (simple check, recurrence expansion done client-side)
      if (event.end < query.start || event.start > query.end) {
        // But include recurring events that might have instances in range
        if (!event.recurrence) {
          return;
        }
      }

      events.push(event);
    });

    return events;
  }
);

// Get single event
ipcMain.handle('calendar:getEvent', async (_event, eventId: string) => {
  const { eventsMap } = getCalendarCollections();
  const event = eventsMap.get(eventId);

  if (!event) {
    return null;
  }

  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check permission to view this event
  if (!checkCalendarPermission(event.calendarId, 'view', deviceId)) {
    return null; // Return null instead of throwing error for single event queries
  }

  return event;
});

// Create event
ipcMain.handle(
  'calendar:createEvent',
  async (
    _event,
    data: {
      calendarId: string;
      title: string;
      description?: string;
      location?: string;
      start: number;
      end: number;
      allDay: boolean;
      timezone?: string;
      recurrence?: CalendarEventInfo['recurrence'];
      category?: string;
      color?: string;
      reminders?: Array<{ id: string; type: string; minutes: number }>;
      attendees?: CalendarEventInfo['attendees'];
    }
  ) => {
    const { eventsMap, calendarsMap } = getCalendarCollections();
    const calendar = calendarsMap.get(data.calendarId);

    if (!calendar) {
      throw new Error('Calendar not found');
    }

    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check permission to create events in this calendar
    if (!checkCalendarPermission(data.calendarId, 'edit', deviceId)) {
      throw new Error('You do not have permission to create events in this calendar');
    }

    const event: CalendarEventInfo = {
      id: crypto.randomUUID(),
      calendarId: data.calendarId,
      familyId: calendar.familyId,
      title: data.title,
      description: data.description,
      location: data.location,
      start: data.start,
      end: data.end,
      allDay: data.allDay,
      timezone: data.timezone,
      recurrence: data.recurrence,
      status: 'confirmed',
      busyStatus: 'busy',
      category: data.category,
      color: data.color,
      attendees: data.attendees ?? [],
      reminders: data.reminders ?? calendar.defaultReminders,
      createdBy: deviceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    eventsMap.set(event.id, event);
    scheduleEventReminders(event);
    emitCalendarEventNotification('Event created', event.title, {
      eventId: event.id,
      calendarId: event.calendarId,
    });
    return event;
  }
);

// Update event
ipcMain.handle(
  'calendar:updateEvent',
  async (
    _event,
    eventId: string,
    data: Partial<{
      title: string;
      description: string;
      location: string;
      start: number;
      end: number;
      allDay: boolean;
      timezone: string;
      recurrence: CalendarEventInfo['recurrence'];
      status: string;
      busyStatus: string;
      category: string;
      color: string;
      reminders: Array<{ id: string; type: string; minutes: number }>;
      attendees: CalendarEventInfo['attendees'];
    }>
  ) => {
    const { eventsMap } = getCalendarCollections();
    const existing = eventsMap.get(eventId);

    if (!existing) {
      throw new Error('Event not found');
    }

    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check permission to edit events in this calendar
    if (!checkCalendarPermission(existing.calendarId, 'edit', deviceId)) {
      throw new Error('You do not have permission to modify events in this calendar');
    }

    const updated: CalendarEventInfo = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    eventsMap.set(eventId, updated);
    scheduleEventReminders(updated);

    const significantChange =
      existing.title !== updated.title ||
      existing.start !== updated.start ||
      existing.end !== updated.end ||
      existing.reminders?.length !== updated.reminders?.length;

    if (significantChange) {
      emitCalendarEventNotification('Event updated', updated.title, {
        eventId: updated.id,
        calendarId: updated.calendarId,
      });
    }
    return updated;
  }
);

// Delete event
ipcMain.handle('calendar:deleteEvent', async (_event, eventId: string) => {
  const { eventsMap } = getCalendarCollections();
  const existing = eventsMap.get(eventId);

  if (!existing) {
    throw new Error('Event not found');
  }

  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check permission to delete events in this calendar
  if (!checkCalendarPermission(existing.calendarId, 'edit', deviceId)) {
    throw new Error('You do not have permission to delete events in this calendar');
  }

  eventsMap.delete(eventId);
  clearEventReminders(eventId);
  emitCalendarEventNotification('Event canceled', existing.title, {
    eventId,
    calendarId: existing.calendarId,
  });
  return { success: true };
});

// Import iCal
ipcMain.handle('calendar:importICal', async (_event, calendarId: string, icalData: string) => {
  try {
    const { calendarsMap, eventsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Verify calendar exists
    const calendar = calendarsMap.get(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Check permission to create events in this calendar
    if (!checkCalendarPermission(calendarId, 'edit', deviceId)) {
      throw new Error('You do not have permission to import events into this calendar');
    }

    // Import the ical utilities
    const { parseICal, icalEventToCalendarEvent } =
      await import('../src/modules/calendar/utils/ical');

    const parsedEvents = parseICal(icalData);
    const importedEvents: string[] = [];
    const errors: string[] = [];

    for (const parsedEvent of parsedEvents) {
      try {
        const eventInput = icalEventToCalendarEvent(parsedEvent, calendarId, calendar.familyId);

        // Create the event
        const event: CalendarEventInfo = {
          id: crypto.randomUUID(),
          calendarId: eventInput.calendarId,
          familyId: eventInput.familyId,
          title: eventInput.title,
          description: eventInput.description,
          location: eventInput.location,
          start: eventInput.start,
          end: eventInput.end,
          allDay: eventInput.allDay,
          timezone: eventInput.timezone,
          recurrence: eventInput.recurrence
            ? {
                frequency: eventInput.recurrence.frequency,
                interval: eventInput.recurrence.interval,
                count: eventInput.recurrence.count,
                until: eventInput.recurrence.until,
                byDay: eventInput.recurrence.byDay?.map((d) => ({
                  day: d.day,
                  position: d.position,
                })),
                byMonthDay: eventInput.recurrence.byMonthDay,
                byMonth: eventInput.recurrence.byMonth,
                exdates: eventInput.recurrence.exdates,
              }
            : undefined,
          status: eventInput.status,
          busyStatus: eventInput.busyStatus,
          category: eventInput.category,
          color: eventInput.color,
          attendees:
            eventInput.attendees?.map((a) => ({
              id: a.id,
              name: a.name,
              email: a.email,
              isFamilyMember: a.isFamilyMember,
              memberId: a.memberId,
              responseStatus: a.responseStatus,
              role: a.role,
              optional: a.optional,
            })) ?? [],
          reminders:
            eventInput.reminders?.map((r) => ({
              id: r.id,
              type: r.type,
              minutes: r.minutes,
            })) ?? [],
          createdBy: eventInput.createdBy,
          createdAt: eventInput.createdAt,
          updatedAt: eventInput.updatedAt,
        };

        eventsMap.set(event.id, event);
        importedEvents.push(event.id);
      } catch (eventError) {
        const error = eventError instanceof Error ? eventError.message : 'Unknown error';
        errors.push(`Failed to import event "${parsedEvent.summary}": ${error}`);
      }
    }

    return { imported: importedEvents.length, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import iCal';
    console.error('iCal import error:', error);
    return { imported: 0, errors: [message] };
  }
});

// Export iCal
ipcMain.handle('calendar:exportICal', async (_event, calendarId: string) => {
  try {
    const { calendarsMap, eventsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Get calendar
    const calendar = calendarsMap.get(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Check permission to view this calendar
    if (!checkCalendarPermission(calendarId, 'view', deviceId)) {
      throw new Error('You do not have permission to export this calendar');
    }

    // Get all events for this calendar
    const events: CalendarEventInfo[] = [];
    eventsMap.forEach((event) => {
      if (event.calendarId === calendarId) {
        events.push(event);
      }
    });

    // Convert to our CalendarEvent format for export
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const calendarEvents = events.map((event) => ({
      id: event.id,
      calendarId: event.calendarId,
      familyId: event.familyId,
      title: event.title,
      description: event.description,
      location: event.location,
      url: undefined,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      timezone: event.timezone,
      recurrence: event.recurrence
        ? {
            frequency: event.recurrence.frequency as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: event.recurrence.interval,
            count: event.recurrence.count,
            until: event.recurrence.until,
            byDay: event.recurrence.byDay?.map((d) => ({
              day: d.day as 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU',
              position: d.position,
            })),
            byMonthDay: event.recurrence.byMonthDay,
            byMonth: event.recurrence.byMonth,
            exdates: event.recurrence.exdates,
          }
        : undefined,
      recurrenceId: undefined,
      originalStart: undefined,
      status: event.status as 'confirmed' | 'tentative' | 'cancelled',
      busyStatus: event.busyStatus as 'free' | 'busy' | 'tentative' | 'out_of_office',
      category: event.category,
      color: event.color,
      organizer: undefined,
      attendees: event.attendees.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        isFamilyMember: a.isFamilyMember,
        memberId: a.memberId,
        responseStatus: a.responseStatus as 'needs_action' | 'accepted' | 'declined' | 'tentative',
        role: a.role as 'required' | 'optional' | 'chair' | 'non_participant',
        optional: a.optional,
        respondedAt: undefined,
      })),
      reminders: event.reminders.map((r) => ({
        id: r.id,
        type: r.type as 'notification' | 'email' | 'popup',
        minutes: r.minutes,
      })),
      createdBy: event.createdBy,
      lastModifiedBy: undefined,
      externalId: undefined,
      externalEtag: undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    })) as CalendarEvent[];

    // Generate iCal using our utility
    const { generateICal } = await import('../src/modules/calendar/utils/ical');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return generateICal(
      calendar as unknown as Calendar,
      calendarEvents as unknown as CalendarEvent[]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export iCal';
    console.error('iCal export error:', error);
    throw new Error(message);
  }
});

// ============================================================================
// Calendar Sharing IPC Handlers
// ============================================================================

// Share calendar with a member
ipcMain.handle(
  'calendar:share',
  async (
    _event,
    calendarId: string,
    memberId: string,
    permission: string
  ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> => {
    const { calendarsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Verify permission is valid
    if (!['none', 'view', 'edit', 'admin'].includes(permission)) {
      throw new Error('Invalid permission level');
    }

    // Get calendar
    const calendar = calendarsMap.get(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Check if user has permission to share this calendar
    if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
      throw new Error('You do not have permission to share this calendar');
    }

    // Check if already shared
    const existingShare = calendar.sharedWith.find((s) => s.memberId === memberId);
    if (existingShare) {
      throw new Error('Calendar is already shared with this member');
    }

    // Add share
    const shareInfo = {
      memberId,
      permission,
      sharedAt: Date.now(),
      sharedBy: deviceId,
    };

    const updatedSharedWith = [...calendar.sharedWith, shareInfo];
    const updatedCalendar: CalendarInfo = {
      ...calendar,
      sharedWith: updatedSharedWith,
      updatedAt: Date.now(),
    };

    calendarsMap.set(calendarId, updatedCalendar);
    return shareInfo;
  }
);

// Update sharing permission for a member
ipcMain.handle(
  'calendar:updateShare',
  async (
    _event,
    calendarId: string,
    memberId: string,
    permission: string
  ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> => {
    const { calendarsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Verify permission is valid
    if (!['none', 'view', 'edit', 'admin'].includes(permission)) {
      throw new Error('Invalid permission level');
    }

    // Get calendar
    const calendar = calendarsMap.get(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Check if user has permission to modify sharing
    if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify sharing for this calendar');
    }

    // Find existing share
    const existingShareIndex = calendar.sharedWith.findIndex((s) => s.memberId === memberId);
    if (existingShareIndex === -1) {
      throw new Error('Calendar is not shared with this member');
    }

    // Update permission
    const existingShare = calendar.sharedWith[existingShareIndex];
    const updatedShare = {
      ...existingShare,
      permission,
    };

    const updatedSharedWith = [...calendar.sharedWith];
    updatedSharedWith[existingShareIndex] = updatedShare;

    const updatedCalendar: CalendarInfo = {
      ...calendar,
      sharedWith: updatedSharedWith,
      updatedAt: Date.now(),
    };

    calendarsMap.set(calendarId, updatedCalendar);
    return updatedShare;
  }
);

// Stop sharing calendar with a member
ipcMain.handle(
  'calendar:unshare',
  async (_event, calendarId: string, memberId: string): Promise<{ success: boolean }> => {
    const { calendarsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Get calendar
    const calendar = calendarsMap.get(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Check if user has permission to unshare
    if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify sharing for this calendar');
    }

    // Remove share
    const updatedSharedWith = calendar.sharedWith.filter((s) => s.memberId !== memberId);

    const updatedCalendar: CalendarInfo = {
      ...calendar,
      sharedWith: updatedSharedWith,
      updatedAt: Date.now(),
    };

    calendarsMap.set(calendarId, updatedCalendar);
    return { success: true };
  }
);

// Get sharing information for a calendar
ipcMain.handle('calendar:getShares', async (_event, calendarId: string) => {
  const { calendarsMap } = getCalendarCollections();
  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  const calendar = calendarsMap.get(calendarId);
  if (!calendar) {
    throw new Error('Calendar not found');
  }

  // Check if user has permission to view sharing info
  if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
    throw new Error('You do not have permission to view sharing information for this calendar');
  }

  return calendar.sharedWith;
});

// ============================================================================
// External Calendar Sync IPC Handlers
// ============================================================================

// Subscribe calendar to external iCal URL
ipcMain.handle(
  'calendar:subscribeExternal',
  async (
    _event,
    calendarId: string,
    url: string,
    syncInterval?: number // in milliseconds, defaults to 24 hours
  ) => {
    const { calendarsMap } = getCalendarCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Validate URL and normalize it
    let normalizedUrl: string;
    try {
      const validatedUrl = new URL(url);
      // Ensure it's http or https
      if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
        throw new Error('URL must use http:// or https:// protocol');
      }
      // Use the normalized URL (with proper encoding)
      normalizedUrl = validatedUrl.href;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid URL format';
      throw new Error(`Invalid URL: ${errorMessage}`);
    }

    // Get calendar
    const calendar = calendarsMap.get(calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Check permission to modify calendar
    if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify this calendar');
    }

    // Update calendar with external sync configuration
    const updatedCalendar: CalendarInfo = {
      ...calendar,
      externalSyncEnabled: true,
      externalSource: {
        type: 'ical_url',
        url: normalizedUrl,
        syncDirection: 'one_way',
      },
      syncInterval: syncInterval ?? 24 * 60 * 60 * 1000, // Default 24 hours
      updatedAt: Date.now(),
    };

    calendarsMap.set(calendarId, updatedCalendar);

    // Trigger immediate sync
    if (externalCalendarSyncService) {
      await externalCalendarSyncService.syncCalendar(calendarId);
    }

    return updatedCalendar;
  }
);

// Unsubscribe calendar from external sync
ipcMain.handle('calendar:unsubscribeExternal', async (_event, calendarId: string) => {
  const { calendarsMap } = getCalendarCollections();
  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Get calendar
  const calendar = calendarsMap.get(calendarId);
  if (!calendar) {
    throw new Error('Calendar not found');
  }

  // Check permission to modify calendar
  if (!checkCalendarPermission(calendarId, 'admin', deviceId)) {
    throw new Error('You do not have permission to modify this calendar');
  }

  // Update calendar to disable external sync
  const updatedCalendar: CalendarInfo = {
    ...calendar,
    externalSyncEnabled: false,
    externalSource: undefined,
    syncInterval: undefined,
    updatedAt: Date.now(),
  };

  calendarsMap.set(calendarId, updatedCalendar);

  return { success: true };
});

// Manually trigger sync for a calendar
ipcMain.handle(
  'calendar:syncExternal',
  async (
    _event,
    calendarId: string
  ): Promise<{ success: boolean; imported: number; errors: string[] }> => {
    if (!externalCalendarSyncService) {
      throw new Error('External sync service not initialized');
    }

    return await externalCalendarSyncService.syncCalendar(calendarId);
  }
);

// Get sync status for a calendar
ipcMain.handle('calendar:getSyncStatus', (_event, calendarId: string) => {
  const { calendarsMap } = getCalendarCollections();

  const calendar = calendarsMap.get(calendarId);
  if (!calendar) {
    throw new Error('Calendar not found');
  }

  return {
    externalSyncEnabled: calendar.externalSyncEnabled ?? false,
    externalSource: calendar.externalSource,
    lastSyncAt: calendar.lastSyncAt,
    syncInterval: calendar.syncInterval ?? 24 * 60 * 60 * 1000,
  };
});

// ============================================================================
// Task List & Task Types
// ============================================================================

interface TaskListInfo {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  ownerId: string;
  visibility: string;
  defaultPermission: string;
  sharedWith: Array<{
    memberId: string;
    permission: string;
    sharedAt: number;
    sharedBy: string;
  }>;
  defaultAssigneeId?: string;
  autoSort?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  totalTasks: number;
  completedTasks: number;
  createdAt: number;
  updatedAt: number;
}

interface TaskInfo {
  id: string;
  taskListId: string;
  familyId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeIds: string[];
  assignedBy?: string;
  dueDate?: number;
  dueTime?: string;
  startDate?: number;
  completedAt?: number;
  completedBy?: string;
  labels: Array<{
    id: string;
    name: string;
    color: string;
    createdAt: number;
  }>;
  tags: string[];
  subtasks: Array<{
    id: string;
    taskId: string;
    title: string;
    completed: boolean;
    completedAt?: number;
    position: number;
    createdAt: number;
    updatedAt: number;
  }>;
  checklist: Array<{
    id: string;
    text: string;
    checked: boolean;
    checkedAt?: number;
    position: number;
  }>;
  dependsOn: string[];
  blocks: string[];
  estimatedMinutes?: number;
  actualMinutes?: number;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: number;
    count?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  location?: string;
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    uploadedAt: number;
    uploadedBy: string;
  }>;
  comments: Array<{
    id: string;
    taskId: string;
    authorId: string;
    authorName?: string;
    content: string;
    edited: boolean;
    createdAt: number;
    updatedAt: number;
  }>;
  position: number;
  createdAt: number;
  updatedAt: number;
}

function getTaskCollections(): { taskListsMap: Y.Map<TaskListInfo>; tasksMap: Y.Map<TaskInfo> } {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }

  let structure: YjsDocumentStructure;
  try {
    structure = yjsService.getStructure();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to get Yjs structure:', errorMessage);
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }

  if (!structure) {
    throw new Error('Yjs structure is null or undefined');
  }

  // Safely check if properties exist before accessing
  if (typeof structure.taskLists === 'undefined' || structure.taskLists === null) {
    console.error('taskLists map is undefined in Yjs structure');
    throw new Error(
      'Task lists map not found in Yjs structure. Service may not be fully initialized.'
    );
  }

  if (typeof structure.tasks === 'undefined' || structure.tasks === null) {
    console.error('tasks map is undefined in Yjs structure');
    throw new Error('Tasks map not found in Yjs structure. Service may not be fully initialized.');
  }

  return {
    taskListsMap: structure.taskLists as Y.Map<TaskListInfo>,
    tasksMap: structure.tasks as Y.Map<TaskInfo>,
  };
}

// Check if a user has permission to perform an operation on a task list
function checkTaskListPermission(
  listId: string,
  operation: 'view' | 'edit' | 'admin',
  memberId?: string
): boolean {
  const { taskListsMap } = getTaskCollections();

  const list = taskListsMap.get(listId);
  if (!list) {
    return false;
  }

  // Owner has all permissions
  if (list.ownerId === memberId) {
    return true;
  }

  // Check visibility for non-owners
  if (list.visibility === 'private') {
    return false;
  }

  // Find the member's share
  const share = list.sharedWith.find((s) => s.memberId === memberId);
  if (!share) {
    // If no explicit share, check default permission
    if (list.visibility === 'family' && list.defaultPermission !== 'none') {
      return getPermissionLevel(list.defaultPermission) >= getPermissionLevel(operation);
    }
    return false;
  }

  // Check the shared permission level
  return getPermissionLevel(share.permission) >= getPermissionLevel(operation);
}

// ============================================================================
// Task List IPC Handlers
// ============================================================================

// Get all task lists
ipcMain.handle('tasks:getLists', async () => {
  try {
    if (!yjsService) {
      console.warn('YjsService not initialized, returning empty list');
      return [];
    }
    if (!storageService) {
      console.warn('StorageService not initialized, returning empty list');
      return [];
    }
    const { taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';
    const lists: TaskListInfo[] = [];

    taskListsMap.forEach((list) => {
      // Only return lists the user can view
      if (checkTaskListPermission(list.id, 'view', deviceId)) {
        lists.push(list);
      }
    });

    return lists;
  } catch (error) {
    console.error('Error in tasks:getLists:', error);
    // Return empty array if structure not initialized yet
    return [];
  }
});

// Get single task list
ipcMain.handle('tasks:getList', (_event, listId: string) => {
  const { taskListsMap } = getTaskCollections();
  return taskListsMap.get(listId) ?? null;
});

// Create task list
ipcMain.handle(
  'tasks:createList',
  async (
    _event,
    data: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      visibility?: string;
      defaultPermission?: string;
    }
  ) => {
    const { taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';
    const familyId = 'default'; // TODO: Get from family store

    const list: TaskListInfo = {
      id: crypto.randomUUID(),
      familyId,
      name: data.name,
      description: data.description,
      color: data.color ?? 'blue',
      icon: data.icon,
      ownerId: deviceId,
      visibility: data.visibility ?? 'family',
      defaultPermission: data.defaultPermission ?? 'view',
      sharedWith: [],
      defaultAssigneeId: undefined,
      autoSort: undefined,
      sortBy: undefined,
      sortOrder: undefined,
      totalTasks: 0,
      completedTasks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    taskListsMap.set(list.id, list);
    return list;
  }
);

// Update task list
ipcMain.handle(
  'tasks:updateList',
  async (
    _event,
    listId: string,
    data: Partial<{
      name: string;
      description: string;
      color: string;
      icon: string;
      visibility: string;
      defaultPermission: string;
      autoSort: boolean;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    }>
  ) => {
    const { taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';
    const existing = taskListsMap.get(listId);

    if (!existing) {
      throw new Error('Task list not found');
    }

    // Check permission to edit list
    if (!checkTaskListPermission(listId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify this task list');
    }

    const updated: TaskListInfo = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    // Always recalculate task counts to ensure accuracy
    const { tasksMap } = getTaskCollections();
    let totalTasks = 0;
    let completedTasks = 0;

    tasksMap.forEach((task) => {
      if (task.taskListId === listId) {
        totalTasks++;
        if (task.status === 'done') {
          completedTasks++;
        }
      }
    });

    // Create final updated object with accurate counts
    const updatedWithCounts: TaskListInfo = {
      ...updated,
      totalTasks,
      completedTasks,
    };

    taskListsMap.set(listId, updatedWithCounts);
    return updatedWithCounts;
  }
);

// Delete task list
ipcMain.handle('tasks:deleteList', async (_event, listId: string) => {
  const { taskListsMap, tasksMap } = getTaskCollections();
  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check permission to delete list
  if (!checkTaskListPermission(listId, 'admin', deviceId)) {
    throw new Error('You do not have permission to delete this task list');
  }

  // Delete all tasks in this list
  const tasksToDelete: string[] = [];
  tasksMap.forEach((task, taskId) => {
    if (task.taskListId === listId) {
      tasksToDelete.push(taskId);
    }
  });

  for (const taskId of tasksToDelete) {
    tasksMap.delete(taskId);
  }

  taskListsMap.delete(listId);
  return { success: true };
});

// Share task list with a member
ipcMain.handle(
  'tasks:shareList',
  async (
    _event,
    listId: string,
    memberId: string,
    permission: string
  ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> => {
    const { taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Verify permission is valid
    if (!['none', 'view', 'edit', 'admin'].includes(permission)) {
      throw new Error('Invalid permission level');
    }

    // Get task list
    const list = taskListsMap.get(listId);
    if (!list) {
      throw new Error('Task list not found');
    }

    // Check if user has permission to share this list
    if (!checkTaskListPermission(listId, 'admin', deviceId)) {
      throw new Error('You do not have permission to share this task list');
    }

    // Check if already shared
    const existingShare = list.sharedWith.find((s) => s.memberId === memberId);
    if (existingShare) {
      throw new Error('Task list is already shared with this member');
    }

    // Add share
    const shareInfo = {
      memberId,
      permission,
      sharedAt: Date.now(),
      sharedBy: deviceId,
    };

    const updatedSharedWith = [...list.sharedWith, shareInfo];
    const updatedList: TaskListInfo = {
      ...list,
      sharedWith: updatedSharedWith,
      updatedAt: Date.now(),
    };

    taskListsMap.set(listId, updatedList);
    return shareInfo;
  }
);

// Update sharing permission for a member
ipcMain.handle(
  'tasks:updateListShare',
  async (
    _event,
    listId: string,
    memberId: string,
    permission: string
  ): Promise<{ memberId: string; permission: string; sharedAt: number; sharedBy: string }> => {
    const { taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Verify permission is valid
    if (!['none', 'view', 'edit', 'admin'].includes(permission)) {
      throw new Error('Invalid permission level');
    }

    // Get task list
    const list = taskListsMap.get(listId);
    if (!list) {
      throw new Error('Task list not found');
    }

    // Check if user has permission to modify sharing
    if (!checkTaskListPermission(listId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify sharing for this task list');
    }

    // Find existing share
    const existingShareIndex = list.sharedWith.findIndex((s) => s.memberId === memberId);
    if (existingShareIndex === -1) {
      throw new Error('Task list is not shared with this member');
    }

    // Update permission
    const existingShare = list.sharedWith[existingShareIndex];
    const updatedShare = {
      ...existingShare,
      permission,
    };

    const updatedSharedWith = [...list.sharedWith];
    updatedSharedWith[existingShareIndex] = updatedShare;

    const updatedList: TaskListInfo = {
      ...list,
      sharedWith: updatedSharedWith,
      updatedAt: Date.now(),
    };

    taskListsMap.set(listId, updatedList);
    return updatedShare;
  }
);

// Stop sharing task list with a member
ipcMain.handle(
  'tasks:unshareList',
  async (_event, listId: string, memberId: string): Promise<{ success: boolean }> => {
    const { taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Get task list
    const list = taskListsMap.get(listId);
    if (!list) {
      throw new Error('Task list not found');
    }

    // Check if user has permission to unshare
    if (!checkTaskListPermission(listId, 'admin', deviceId)) {
      throw new Error('You do not have permission to modify sharing for this task list');
    }

    // Remove share
    const updatedSharedWith = list.sharedWith.filter((s) => s.memberId !== memberId);

    const updatedList: TaskListInfo = {
      ...list,
      sharedWith: updatedSharedWith,
      updatedAt: Date.now(),
    };

    taskListsMap.set(listId, updatedList);
    return { success: true };
  }
);

// Get sharing information for a task list
ipcMain.handle('tasks:getListShares', async (_event, listId: string) => {
  const { taskListsMap } = getTaskCollections();
  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  const list = taskListsMap.get(listId);
  if (!list) {
    throw new Error('Task list not found');
  }

  // Check if user has permission to view sharing info
  if (!checkTaskListPermission(listId, 'admin', deviceId)) {
    throw new Error('You do not have permission to view sharing information for this task list');
  }

  return list.sharedWith;
});

// ============================================================================
// Task IPC Handlers
// ============================================================================

// Get tasks for a list
ipcMain.handle('tasks:getTasks', (_event, listId: string) => {
  try {
    if (!yjsService) {
      console.warn('YjsService not initialized, returning empty list');
      return [];
    }
    const { tasksMap } = getTaskCollections();
    const tasks: TaskInfo[] = [];

    tasksMap.forEach((task) => {
      if (task.taskListId === listId) {
        tasks.push(task);
      }
    });

    // Sort by position by default
    tasks.sort((a, b) => a.position - b.position);

    return tasks;
  } catch (error) {
    console.error('Error in tasks:getTasks:', error);
    // Return empty array if structure not initialized yet
    return [];
  }
});

// Get single task
ipcMain.handle('tasks:getTask', (_event, taskId: string) => {
  const { tasksMap } = getTaskCollections();
  return tasksMap.get(taskId) ?? null;
});

// Create task
ipcMain.handle(
  'tasks:createTask',
  async (
    _event,
    data: {
      taskListId: string;
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeIds?: string[];
      dueDate?: number;
      dueTime?: string;
      startDate?: number;
      labels?: Array<{ name: string; color: string }>;
      tags?: string[];
      subtasks?: Array<{ title: string; position: number }>;
      checklist?: Array<{ text: string; position: number }>;
      dependsOn?: string[];
      estimatedMinutes?: number;
      recurrence?: TaskInfo['recurrence'];
      location?: string;
      position?: number;
    }
  ) => {
    const { tasksMap, taskListsMap } = getTaskCollections();
    const list = taskListsMap.get(data.taskListId);

    if (!list) {
      throw new Error('Task list not found');
    }

    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check permission to create tasks in this list
    if (!checkTaskListPermission(data.taskListId, 'edit', deviceId)) {
      throw new Error('You do not have permission to create tasks in this list');
    }

    // Calculate position (append to end if not specified)
    let position = data.position;
    if (position === undefined) {
      let maxPosition = -1;
      tasksMap.forEach((task) => {
        if (task.taskListId === data.taskListId && task.position > maxPosition) {
          maxPosition = task.position;
        }
      });
      position = maxPosition + 1;
    }

    // Generate IDs for subtasks and checklist items
    const subtasks = (data.subtasks ?? []).map((st) => ({
      id: crypto.randomUUID(),
      taskId: '', // Will be set after task creation
      title: st.title,
      completed: false,
      completedAt: undefined,
      position: st.position,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const checklist = (data.checklist ?? []).map((item) => ({
      id: crypto.randomUUID(),
      text: item.text,
      checked: false,
      checkedAt: undefined,
      position: item.position,
    }));

    // Generate IDs for labels
    const labels = (data.labels ?? []).map((label) => ({
      id: crypto.randomUUID(),
      name: label.name,
      color: label.color,
      createdAt: Date.now(),
    }));

    const task: TaskInfo = {
      id: crypto.randomUUID(),
      taskListId: data.taskListId,
      familyId: list.familyId,
      title: data.title,
      description: data.description,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'none',
      assigneeIds: data.assigneeIds ?? [],
      assignedBy: deviceId,
      dueDate: data.dueDate,
      dueTime: data.dueTime,
      startDate: data.startDate,
      completedAt: undefined,
      completedBy: undefined,
      labels,
      tags: data.tags ?? [],
      subtasks: [],
      checklist,
      dependsOn: data.dependsOn ?? [],
      blocks: [],
      estimatedMinutes: data.estimatedMinutes,
      actualMinutes: undefined,
      recurrence: data.recurrence,
      location: data.location,
      attachments: [],
      comments: [],
      position,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Fix subtask taskId references after task ID is known
    task.subtasks = subtasks.map((st) => ({ ...st, taskId: task.id }));

    const now = Date.now();
    if (task.dueDate && task.dueDate < now && task.status !== 'done') {
      task.status = 'overdue';
    }

    tasksMap.set(task.id, task);

    // Update list task counts - create new object to avoid mutating read-only Yjs object
    const updatedList: TaskListInfo = {
      ...list,
      totalTasks: (list.totalTasks ?? 0) + 1,
      completedTasks:
        task.status === 'done' ? (list.completedTasks ?? 0) + 1 : (list.completedTasks ?? 0),
      updatedAt: Date.now(),
    };
    taskListsMap.set(data.taskListId, updatedList);

    if (task.status === 'overdue') {
      emitTaskNotification('Task overdue', task.title, {
        taskId: task.id,
        taskListId: task.taskListId,
      });
    } else {
      emitTaskNotification('Task created', task.title, {
        taskId: task.id,
        taskListId: task.taskListId,
      });
    }

    return task;
  }
);

// Update task
ipcMain.handle(
  'tasks:updateTask',
  async (
    _event,
    taskId: string,
    data: Partial<{
      taskListId: string;
      title: string;
      description: string;
      status: string;
      priority: string;
      assigneeIds: string[];
      dueDate: number;
      dueTime: string;
      startDate: number;
      completedAt: number;
      completedBy: string;
      labels: TaskInfo['labels'];
      tags: string[];
      subtasks: TaskInfo['subtasks'];
      checklist: TaskInfo['checklist'];
      dependsOn: string[];
      estimatedMinutes: number;
      actualMinutes: number;
      recurrence: TaskInfo['recurrence'];
      location: string;
      position: number;
    }>
  ) => {
    const { tasksMap, taskListsMap } = getTaskCollections();
    const existing = tasksMap.get(taskId);

    if (!existing) {
      throw new Error('Task not found');
    }

    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check permission to edit tasks in this list
    if (!checkTaskListPermission(existing.taskListId, 'edit', deviceId)) {
      throw new Error('You do not have permission to modify tasks in this list');
    }

    // If moving to a different list, check permission on target list
    if (data.taskListId && data.taskListId !== existing.taskListId) {
      if (!checkTaskListPermission(data.taskListId, 'edit', deviceId)) {
        throw new Error('You do not have permission to move tasks to this list');
      }

      // Update counts on old and new lists - create new objects to avoid mutating read-only Yjs objects
      const oldList = taskListsMap.get(existing.taskListId);
      if (oldList) {
        const updatedOldList: TaskListInfo = {
          ...oldList,
          totalTasks: Math.max(0, (oldList.totalTasks ?? 0) - 1),
          completedTasks:
            existing.status === 'done'
              ? Math.max(0, (oldList.completedTasks ?? 0) - 1)
              : (oldList.completedTasks ?? 0),
          updatedAt: Date.now(),
        };
        taskListsMap.set(existing.taskListId, updatedOldList);
      }

      const newList = taskListsMap.get(data.taskListId);
      if (newList) {
        const isCompleted = data.status === 'done' || (!data.status && existing.status === 'done');
        const updatedNewList: TaskListInfo = {
          ...newList,
          totalTasks: (newList.totalTasks ?? 0) + 1,
          completedTasks: isCompleted
            ? (newList.completedTasks ?? 0) + 1
            : (newList.completedTasks ?? 0),
          updatedAt: Date.now(),
        };
        taskListsMap.set(data.taskListId, updatedNewList);
      }
    }

    // Track status change for count updates
    const wasCompleted = existing.status === 'done';
    const willBeCompleted = data.status === 'done' || (!data.status && wasCompleted);

    const updated: TaskInfo = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    // Update completedAt if status changed to done
    if (data.status === 'done' && !wasCompleted) {
      updated.completedAt = Date.now();
      updated.completedBy = deviceId;
    } else if (data.status && data.status !== 'done' && wasCompleted) {
      updated.completedAt = undefined;
      updated.completedBy = undefined;
    }

    // Update task
    tasksMap.set(taskId, updated);

    // Recalculate counts for list to ensure consistency
    const targetListId = updated.taskListId;
    const list = taskListsMap.get(targetListId);
    if (list) {
      const updatedList: TaskListInfo = {
        ...list,
        totalTasks: list.totalTasks ?? 0,
        completedTasks: willBeCompleted
          ? (list.completedTasks ?? 0) + 1
          : Math.max(0, (list.completedTasks ?? 0) - 1),
        updatedAt: Date.now(),
      };
      taskListsMap.set(targetListId, updatedList);
    }

    // Emit notifications for meaningful changes
    const completedNow = updated.status === 'done' && existing.status !== 'done';
    if (completedNow) {
      if (!emittedTaskCompletion.has(taskId)) {
        emittedTaskCompletion.add(taskId);
        emitTaskNotification('Task completed', updated.title, {
          taskId: updated.id,
          taskListId: updated.taskListId,
        });
      }
    } else {
      emittedTaskCompletion.delete(taskId);
    }

    const becameOverdue =
      updated.status === 'overdue' &&
      (existing.status !== 'overdue' || (existing.dueDate ?? 0) !== (updated.dueDate ?? 0));
    if (becameOverdue) {
      emitTaskNotification(
        'Task overdue',
        updated.title,
        { taskId: updated.id, taskListId: updated.taskListId },
        'urgent'
      );
    }

    if (updated.subtasks && existing.subtasks) {
      const prevCompleted = existing.subtasks.filter((s) => s.completed).length;
      const newCompleted = updated.subtasks.filter((s) => s.completed).length;
      if (newCompleted > prevCompleted) {
        emitTaskNotification('Subtask completed', updated.title, {
          taskId: updated.id,
          taskListId: updated.taskListId,
        });
      }
    }

    return updated;
  }
);

// Delete task
ipcMain.handle('tasks:deleteTask', async (_event, taskId: string) => {
  const { tasksMap, taskListsMap } = getTaskCollections();
  const existing = tasksMap.get(taskId);

  if (!existing) {
    throw new Error('Task not found');
  }

  const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check permission to delete tasks in this list
  if (!checkTaskListPermission(existing.taskListId, 'edit', deviceId)) {
    throw new Error('You do not have permission to delete tasks in this list');
  }

  // Update list task counts - create new object to avoid mutating read-only Yjs object
  const list = taskListsMap.get(existing.taskListId);
  if (list) {
    const updatedList: TaskListInfo = {
      ...list,
      totalTasks: Math.max(0, (list.totalTasks ?? 0) - 1),
      completedTasks:
        existing.status === 'done'
          ? Math.max(0, (list.completedTasks ?? 0) - 1)
          : (list.completedTasks ?? 0),
      updatedAt: Date.now(),
    };
    taskListsMap.set(existing.taskListId, updatedList);
  }

  tasksMap.delete(taskId);
  return { success: true };
});

// Import tasks from JSON file
ipcMain.handle('tasks:import', async (_event, listId: string, jsonData: string) => {
  try {
    const { tasksMap, taskListsMap } = getTaskCollections();
    const list = taskListsMap.get(listId);

    if (!list) {
      throw new Error('Task list not found');
    }

    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check permission to create tasks in this list
    if (!checkTaskListPermission(listId, 'edit', deviceId)) {
      throw new Error('You do not have permission to import tasks into this list');
    }

    // Define interface for imported task data
    interface ImportedTaskData {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeIds?: string[];
      dueDate?: number;
      dueTime?: string;
      startDate?: number;
      labels?: Array<{ name: string; color: string }>;
      tags?: string[];
      subtasks?: Array<{ title: string }>;
      checklist?: Array<{ text: string }>;
      dependsOn?: string[];
      estimatedMinutes?: number;
      recurrence?: TaskInfo['recurrence'];
      location?: string;
    }

    // Parse JSON with type safety
    const data: unknown = JSON.parse(jsonData);
    const errors: string[] = [];
    let importedCount = 0;

    // Type guard for data structure
    const hasTasksArray = (d: unknown): d is { tasks: unknown[] } =>
      typeof d === 'object' &&
      d !== null &&
      'tasks' in d &&
      Array.isArray((d as { tasks: unknown }).tasks);

    // Validate and import tasks
    const tasksToImport: unknown[] = hasTasksArray(data) ? data.tasks : [data];

    for (const rawTaskData of tasksToImport) {
      try {
        // Type guard for task data
        const taskData = rawTaskData as ImportedTaskData;

        // Validate required fields
        if (!taskData.title || typeof taskData.title !== 'string') {
          errors.push('Task missing required field: title');
          continue;
        }

        // Calculate position
        let maxPosition = -1;
        tasksMap.forEach((task) => {
          if (task.taskListId === listId && task.position > maxPosition) {
            maxPosition = task.position;
          }
        });
        const position = maxPosition + 1;

        // Generate IDs for nested items with proper typing
        const labels: TaskInfo['labels'] = (taskData.labels ?? []).map((label) => ({
          id: crypto.randomUUID(),
          name: label.name,
          color: label.color,
          createdAt: Date.now(),
        }));

        const subtasks: TaskInfo['subtasks'] = (taskData.subtasks ?? []).map((st, idx) => ({
          id: crypto.randomUUID(),
          taskId: '', // Will be set after task creation
          title: st.title,
          completed: false,
          completedAt: undefined,
          position: idx,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));

        const checklist: TaskInfo['checklist'] = (taskData.checklist ?? []).map((item, idx) => ({
          id: crypto.randomUUID(),
          text: item.text,
          checked: false,
          checkedAt: undefined,
          position: idx,
        }));

        // Create task with validated data
        const task: TaskInfo = {
          id: crypto.randomUUID(),
          taskListId: listId,
          familyId: list.familyId,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status ?? 'todo',
          priority: taskData.priority ?? 'none',
          assigneeIds: taskData.assigneeIds ?? [],
          assignedBy: deviceId,
          dueDate: taskData.dueDate,
          dueTime: taskData.dueTime,
          startDate: taskData.startDate,
          completedAt: undefined,
          completedBy: undefined,
          labels,
          tags: taskData.tags ?? [],
          subtasks: [],
          checklist,
          dependsOn: taskData.dependsOn ?? [],
          blocks: [],
          estimatedMinutes: taskData.estimatedMinutes,
          actualMinutes: undefined,
          recurrence: taskData.recurrence,
          location: taskData.location,
          attachments: [],
          comments: [],
          position,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Fix subtask taskId references
        task.subtasks = subtasks.map((st) => ({ ...st, taskId: task.id }));

        tasksMap.set(task.id, task);
        importedCount++;

        // Update list task counts
        const updatedList: TaskListInfo = {
          ...list,
          totalTasks: (list.totalTasks ?? 0) + 1,
          completedTasks:
            task.status === 'done' ? (list.completedTasks ?? 0) + 1 : (list.completedTasks ?? 0),
          updatedAt: Date.now(),
        };
        taskListsMap.set(listId, updatedList);
      } catch (taskError) {
        const error = taskError instanceof Error ? taskError.message : 'Unknown error';
        errors.push(
          `Failed to import task "${(rawTaskData as ImportedTaskData).title ?? 'Unknown'}": ${error}`
        );
      }
    }

    return { imported: importedCount, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import tasks';
    console.error('Task import error:', error);
    return { imported: 0, errors: [message] };
  }
});

// Export tasks to JSON format
ipcMain.handle('tasks:export', async (_event, listId: string) => {
  try {
    const { tasksMap, taskListsMap } = getTaskCollections();
    const deviceId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Get task list
    const list = taskListsMap.get(listId);
    if (!list) {
      throw new Error('Task list not found');
    }

    // Check permission to view this list
    if (!checkTaskListPermission(listId, 'view', deviceId)) {
      throw new Error('You do not have permission to export this task list');
    }

    // Collect all tasks for this list
    const tasks: TaskInfo[] = [];
    tasksMap.forEach((task) => {
      if (task.taskListId === listId) {
        tasks.push(task);
      }
    });

    // Sort by position
    tasks.sort((a, b) => a.position - b.position);

    // Create export data structure
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: deviceId,
      taskList: {
        name: list.name,
        description: list.description,
        color: list.color,
        icon: list.icon,
      },
      tasks: tasks.map((task) => ({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeIds: task.assigneeIds,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        startDate: task.startDate,
        labels: task.labels.map((l) => ({ name: l.name, color: l.color })),
        tags: task.tags,
        subtasks: task.subtasks.map((st) => ({ title: st.title, completed: st.completed })),
        checklist: task.checklist.map((item) => ({ text: item.text, checked: item.checked })),
        dependsOn: task.dependsOn,
        estimatedMinutes: task.estimatedMinutes,
        actualMinutes: task.actualMinutes,
        recurrence: task.recurrence,
        location: task.location,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export tasks';
    console.error('Task export error:', error);
    throw new Error(message);
  }
});

// ============================================================================
// Email IPC Handlers
// ============================================================================

// Permission helper for email accounts
function checkEmailPermission(
  accountId: string,
  operation: 'read' | 'read_write' | 'send_as' | 'full',
  userId?: string
): boolean {
  if (!emailService) {
    return false;
  }

  const account = emailService.getAccountById(accountId);
  if (!account) {
    return false;
  }

  // Owner has all permissions
  if (account.userId === userId) {
    return true;
  }

  // Check shared access
  const access = account.sharedWith?.find((a) => a.userId === userId);
  if (!access) {
    return false;
  }

  // Check access level hierarchy: read < read_write < send_as < full
  const levels: Record<string, number> = {
    read: 1,
    read_write: 2,
    send_as: 3,
    full: 4,
  };

  const userLevel = levels[access.accessLevel] ?? 0;
  const requiredLevel = levels[operation] ?? 0;

  return userLevel >= requiredLevel;
}

// Get all email accounts (filtered by permissions)
ipcMain.handle('email:getAccounts', async () => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const userId = (await getStorageService().get('device:id')) ?? 'unknown';
  const accounts = emailService.getAccounts();

  // Filter accounts based on ownership or shared access
  return accounts.filter(
    (account) => account.userId === userId || account.sharedWith?.some((a) => a.userId === userId)
  );
});

// Get single account
ipcMain.handle('email:getAccount', async (_event, accountId: string) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const userId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check read permission
  if (!checkEmailPermission(accountId, 'read', userId)) {
    throw new Error('You do not have permission to view this email account');
  }

  return emailService.getAccountById(accountId);
});

// Add email account
ipcMain.handle(
  'email:addAccount',
  async (
    _event,
    config: {
      email: string;
      displayName: string;
      imapConfig: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
      };
      smtpConfig: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
      };
    }
  ) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';
    const accountId = crypto.randomUUID();

    try {
      // Transform config to EmailAccountConfig format
      await emailService.addAccount({
        id: accountId,
        email: config.email,
        displayName: config.displayName,
        userId,
        imap: {
          host: config.imapConfig.host,
          port: config.imapConfig.port,
          secure: config.imapConfig.secure,
          auth: {
            user: config.imapConfig.username,
            pass: config.imapConfig.password,
          },
        },
        smtp: {
          host: config.smtpConfig.host,
          port: config.smtpConfig.port,
          secure: config.smtpConfig.secure,
          auth: {
            user: config.smtpConfig.username,
            pass: config.smtpConfig.password,
          },
        },
      });

      return { success: true, accountId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add email account';
      console.error('Failed to add email account:', error);
      throw new Error(message);
    }
  }
);

// Update email account
ipcMain.handle(
  'email:updateAccount',
  async (
    _event,
    accountId: string,
    updates: {
      displayName?: string;
      imapConfig?: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
      };
      smtpConfig?: {
        host: string;
        port: number;
        secure: boolean;
        username: string;
        password: string;
      };
    }
  ) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check full permission (only owner can update account settings)
    if (!checkEmailPermission(accountId, 'full', userId)) {
      throw new Error('You do not have permission to modify this email account');
    }

    try {
      // Transform updates to EmailAccountConfig format
      const transformedUpdates: Parameters<typeof emailService.updateAccount>[1] = {};

      if (updates.displayName !== undefined) {
        transformedUpdates.displayName = updates.displayName;
      }

      if (updates.imapConfig) {
        transformedUpdates.imap = {
          host: updates.imapConfig.host,
          port: updates.imapConfig.port,
          secure: updates.imapConfig.secure,
          auth: {
            user: updates.imapConfig.username,
            pass: updates.imapConfig.password,
          },
        };
      }

      if (updates.smtpConfig) {
        transformedUpdates.smtp = {
          host: updates.smtpConfig.host,
          port: updates.smtpConfig.port,
          secure: updates.smtpConfig.secure,
          auth: {
            user: updates.smtpConfig.username,
            pass: updates.smtpConfig.password,
          },
        };
      }

      await emailService.updateAccount(accountId, transformedUpdates);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update email account';
      console.error('Failed to update email account:', error);
      throw new Error(message);
    }
  }
);

// Remove email account
ipcMain.handle('email:removeAccount', async (_event, accountId: string) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const userId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check full permission (only owner can delete account)
  if (!checkEmailPermission(accountId, 'full', userId)) {
    throw new Error('You do not have permission to delete this email account');
  }

  try {
    await emailService.removeAccount(accountId);
    
    // Clean up notification tracking for this account
    const allKeys = await getStorageService().getKeysByPrefix(`email:notified:${accountId}:`);
    
    for (const key of allKeys) {
      await getStorageService().delete(key);
    }
    
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove email account';
    console.error('Failed to remove email account:', error);
    throw new Error(message);
  }
});

// Fetch messages from mailbox
ipcMain.handle(
  'email:fetchMessages',
  async (_event, accountId: string, folder: string = 'INBOX') => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read permission
    if (!checkEmailPermission(accountId, 'read', userId)) {
      throw new Error('You do not have permission to read messages from this account');
    }

    try {
      const messages = await emailService.fetchMessages(accountId, folder);

      // Load previously notified message IDs from persistent storage
      const notifiedEmailKey = `email:notified:${accountId}:${folder}`;
      const notifiedJson = await getStorageService().get(notifiedEmailKey);
      const notifiedEmailMessageIds = new Set<string>(
        notifiedJson ? JSON.parse(notifiedJson) as string[] : []
      );

      let hasNewNotifications = false;

      for (const message of messages) {
        // Only notify for unread messages that haven't been notified before
        if (!message.read && !notifiedEmailMessageIds.has(message.id)) {
          emitEmailNotification('New email', message.subject, {
            accountId,
            folder,
            uid: message.uid,
            messageId: message.id,
          });
          notifiedEmailMessageIds.add(message.id);
          hasNewNotifications = true;
        }
      }

      // Persist updated notified message IDs if there were new notifications
      if (hasNewNotifications) {
        // Prevent unbounded growth by keeping only the most recent 1000 notified IDs
        const notifiedArray = Array.from(notifiedEmailMessageIds);
        if (notifiedArray.length > 1000) {
          // Keep the most recent 1000 by taking the end of the array
          const recentNotified = notifiedArray.slice(-1000);
          await getStorageService().set(notifiedEmailKey, JSON.stringify(recentNotified));
        } else {
          await getStorageService().set(notifiedEmailKey, JSON.stringify(notifiedArray));
        }
      }

      return messages;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch messages';
      console.error('Failed to fetch messages:', error);
      throw new Error(message);
    }
  }
);

// Fetch a single message with full body content
ipcMain.handle(
  'email:fetchMessage',
  async (_event, accountId: string, folder: string, uid: number) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read permission
    if (!checkEmailPermission(accountId, 'read', userId)) {
      throw new Error('You do not have permission to view messages for this account');
    }

    try {
      return await emailService.fetchMessage(accountId, folder, uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch message';
      console.error('Failed to fetch message:', error);
      throw new Error(message);
    }
  }
);

// Send message
ipcMain.handle(
  'email:sendMessage',
  async (
    _event,
    accountId: string,
    message: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      text?: string;
      html?: string;
      attachments?: Array<{
        filename: string;
        content: string;
        contentType: string;
      }>;
    }
  ) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check send_as permission
    if (!checkEmailPermission(accountId, 'send_as', userId)) {
      throw new Error('You do not have permission to send messages from this account');
    }

    try {
      await emailService.sendMessage(accountId, message);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      console.error('Failed to send message:', error);
      throw new Error(message);
    }
  }
);

// Mark message as read
ipcMain.handle(
  'email:markAsRead',
  async (_event, accountId: string, messageId: string, read: boolean = true) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read_write permission
    if (!checkEmailPermission(accountId, 'read_write', userId)) {
      throw new Error('You do not have permission to modify messages in this account');
    }

    try {
      // Convert messageId string to uid number
      const uid = parseInt(messageId, 10);
      if (isNaN(uid)) {
        throw new Error('Invalid message ID');
      }
      
      await emailService.markAsRead(accountId, uid, read);
      
      // If marking as read, clear from notification tracking
      if (read) {
        // Since we don't have folder info in the current API, clear from all folders
        // This is less efficient but maintains API compatibility
        const allKeys = await getStorageService().getKeysByPrefix(`email:notified:${accountId}:`);
        
        for (const key of allKeys) {
          const notifiedJson = await getStorageService().get(key);
          if (notifiedJson) {
            const notifiedIds = JSON.parse(notifiedJson) as string[];
            const updatedIds = notifiedIds.filter((id: string) => id !== messageId);
            
            if (updatedIds.length === 0) {
              await getStorageService().delete(key);
            } else {
              await getStorageService().set(key, JSON.stringify(updatedIds));
            }
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark message';
      console.error('Failed to mark message as read:', error);
      throw new Error(message);
    }
  }
);

// Mark message as starred
ipcMain.handle(
  'email:markAsStarred',
  async (_event, accountId: string, messageId: string, starred: boolean = true) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read_write permission
    if (!checkEmailPermission(accountId, 'read_write', userId)) {
      throw new Error('You do not have permission to modify messages in this account');
    }

    try {
      // Convert messageId string to uid number
      const uid = parseInt(messageId, 10);
      if (isNaN(uid)) {
        throw new Error('Invalid message ID');
      }
      await emailService.markAsStarred(accountId, uid, starred);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to star message';
      console.error('Failed to mark message as starred:', error);
      throw new Error(message);
    }
  }
);

// Move message to folder
ipcMain.handle(
  'email:moveMessage',
  async (_event, accountId: string, messageId: string, targetFolder: string) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read_write permission
    if (!checkEmailPermission(accountId, 'read_write', userId)) {
      throw new Error('You do not have permission to move messages in this account');
    }

    try {
      // Convert messageId string to uid number
      const uid = parseInt(messageId, 10);
      if (isNaN(uid)) {
        throw new Error('Invalid message ID');
      }
      // Use INBOX as default source folder since the API doesn't specify it
      await emailService.moveMessage(accountId, uid, 'INBOX', targetFolder);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move message';
      console.error('Failed to move message:', error);
      throw new Error(message);
    }
  }
);

// Delete message
ipcMain.handle('email:deleteMessage', async (_event, accountId: string, messageId: string) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const userId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check read_write permission
  if (!checkEmailPermission(accountId, 'read_write', userId)) {
    throw new Error('You do not have permission to delete messages in this account');
  }

  try {
    // Convert messageId string to uid number
    const uid = parseInt(messageId, 10);
    if (isNaN(uid)) {
      throw new Error('Invalid message ID');
    }
    // Use INBOX as default folder since the API doesn't specify it
    await emailService.deleteMessage(accountId, uid, 'INBOX');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete message';
    console.error('Failed to delete message:', error);
    throw new Error(message);
  }
});

// Get folders for account
ipcMain.handle('email:getFolders', async (_event, accountId: string) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const userId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check read permission
  if (!checkEmailPermission(accountId, 'read', userId)) {
    throw new Error('You do not have permission to view folders for this account');
  }

  try {
    return await emailService.getFolders(accountId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get folders';
    console.error('Failed to get folders:', error);
    throw new Error(message);
  }
});

// Create folder
ipcMain.handle('email:folders:create', async (_event, accountId: string, folderPath: string) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const userId = (await getStorageService().get('device:id')) ?? 'unknown';

  // Check read_write permission
  if (!checkEmailPermission(accountId, 'read_write', userId)) {
    throw new Error('You do not have permission to create folders for this account');
  }

  try {
    await emailService.createFolder(accountId, folderPath);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create folder';
    console.error('Failed to create folder:', error);
    throw new Error(message);
  }
});

// Rename folder
ipcMain.handle(
  'email:folders:rename',
  async (_event, accountId: string, oldPath: string, newPath: string) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read_write permission
    if (!checkEmailPermission(accountId, 'read_write', userId)) {
      throw new Error('You do not have permission to rename folders for this account');
    }

    try {
      await emailService.renameFolder(accountId, oldPath, newPath);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename folder';
      console.error('Failed to rename folder:', error);
      throw new Error(message);
    }
  }
);

// Delete folder
ipcMain.handle(
  'email:folders:delete',
  async (_event, accountId: string, folderPath: string, moveMessagesTo?: string) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read_write permission
    if (!checkEmailPermission(accountId, 'read_write', userId)) {
      throw new Error('You do not have permission to delete folders for this account');
    }

    try {
      await emailService.deleteFolder(accountId, folderPath, moveMessagesTo);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete folder';
      console.error('Failed to delete folder:', error);
      throw new Error(message);
    }
  }
);

// Move messages to folder (already exists as moveMessage, but add alias for consistency)
ipcMain.handle(
  'email:folders:move',
  async (
    _event,
    accountId: string,
    messageUids: number[],
    sourceFolder: string,
    targetFolder: string
  ) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const userId = (await getStorageService().get('device:id')) ?? 'unknown';

    // Check read_write permission
    if (!checkEmailPermission(accountId, 'read_write', userId)) {
      throw new Error('You do not have permission to move messages for this account');
    }

    try {
      // Move each message
      for (const uid of messageUids) {
        await emailService.moveMessage(accountId, uid, sourceFolder, targetFolder);
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move messages';
      console.error('Failed to move messages:', error);
      throw new Error(message);
    }
  }
);

// ============================================================================
// Email Labels IPC Handlers
// ============================================================================

interface EmailLabelInfo {
  id: string;
  accountId: string | null;
  familyId: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

function getEmailLabelsCollections(): {
  labelsMap: Y.Map<EmailLabelInfo>;
} {
  if (!yjsService) {
    throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
  }
  try {
    const structure = yjsService.getStructure();
    if (!structure?.emailLabels) {
      throw new Error('Yjs structure not properly initialized');
    }
    return {
      labelsMap: structure.emailLabels as Y.Map<EmailLabelInfo>,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('not initialized')) {
      throw new Error('YjsService not initialized yet. Please wait for services to initialize.');
    }
    throw error;
  }
}

function getFamilyId(): string {
  const { familyMap } = getFamilyCollections();
  const family = familyMap.get('info') as FamilyInfo | undefined;
  if (!family) {
    throw new Error('Family not initialized');
  }
  return family.id;
}

// Get all labels (optionally filtered by account)
ipcMain.handle('email:labels:getAll', async (_event, accountId?: string | null) => {
  const { labelsMap } = getEmailLabelsCollections();
  const labels: EmailLabelInfo[] = [];

  labelsMap.forEach((label) => {
    if (accountId === undefined || label.accountId === accountId) {
      labels.push(label);
    }
  });

  return labels;
});

// Create a new label
ipcMain.handle(
  'email:labels:create',
  async (
    _event,
    data: {
      accountId: string | null;
      name: string;
      color: string;
      icon?: string;
    }
  ) => {
    const { labelsMap } = getEmailLabelsCollections();
    const familyId = getFamilyId();

    // Validate input
    if (!data.name?.trim()) {
      throw new Error('Label name is required');
    }
    if (!data.color) {
      throw new Error('Label color is required');
    }

    // Check for duplicate name in the same account/global scope
    labelsMap.forEach((label) => {
      if (
        label.accountId === data.accountId &&
        label.name.toLowerCase() === data.name.toLowerCase().trim()
      ) {
        throw new Error('A label with this name already exists');
      }
    });

    const now = Date.now();
    const labelId = crypto.randomUUID();
    const label: EmailLabelInfo = {
      id: labelId,
      accountId: data.accountId,
      familyId,
      name: data.name.trim(),
      color: data.color,
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
    };

    labelsMap.set(labelId, label);

    return label;
  }
);

// Update an existing label
ipcMain.handle(
  'email:labels:update',
  async (
    _event,
    labelId: string,
    updates: {
      name?: string;
      color?: string;
      icon?: string;
    }
  ) => {
    const { labelsMap } = getEmailLabelsCollections();
    const label = labelsMap.get(labelId);

    if (!label) {
      throw new Error('Label not found');
    }

    // Validate updates
    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error('Label name cannot be empty');
    }

    // Check for duplicate name if name is being changed
    if (updates.name !== undefined && updates.name.trim() !== label.name) {
      labelsMap.forEach((l) => {
        if (
          l.id !== labelId &&
          l.accountId === label.accountId &&
          l.name.toLowerCase() === updates.name?.toLowerCase().trim()
        ) {
          throw new Error('A label with this name already exists');
        }
      });
    }

    const updatedLabel: EmailLabelInfo = {
      ...label,
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.color !== undefined && { color: updates.color }),
      ...(updates.icon !== undefined && { icon: updates.icon }),
      updatedAt: Date.now(),
    };

    labelsMap.set(labelId, updatedLabel);

    return updatedLabel;
  }
);

// Delete a label
ipcMain.handle('email:labels:delete', async (_event, labelId: string) => {
  const { labelsMap } = getEmailLabelsCollections();
  const label = labelsMap.get(labelId);

  if (!label) {
    throw new Error('Label not found');
  }

  labelsMap.delete(labelId);

  return { success: true };
});

// Apply label to messages
ipcMain.handle(
  'email:labels:apply',
  async (_event, accountId: string, messageIds: string[], labelId: string) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const { labelsMap } = getEmailLabelsCollections();
    const label = labelsMap.get(labelId);

    if (!label) {
      throw new Error('Label not found');
    }

    // Validate that label belongs to account (or is global)
    if (label.accountId !== null && label.accountId !== accountId) {
      throw new Error('Label does not belong to this account');
    }

    // Apply label to messages via EmailService
    // Note: This is a simplified implementation - in practice, you'd need to
    // update the messages in Yjs or EmailService storage
    // For now, we'll just validate and return success
    // TODO: Implement actual message label application

    return { success: true, messageIds };
  }
);

// Remove label from messages
ipcMain.handle(
  'email:labels:remove',
  async (_event, accountId: string, messageIds: string[], labelId: string) => {
    if (!emailService) {
      throw new Error('EmailService not initialized');
    }

    const { labelsMap } = getEmailLabelsCollections();
    const label = labelsMap.get(labelId);

    if (!label) {
      throw new Error('Label not found');
    }

    // Validate that label belongs to account (or is global)
    if (label.accountId !== null && label.accountId !== accountId) {
      throw new Error('Label does not belong to this account');
    }

    // Remove label from messages via EmailService
    // Note: This is a simplified implementation - in practice, you'd need to
    // update the messages in Yjs or EmailService storage
    // For now, we'll just validate and return success
    // TODO: Implement actual message label removal

    return { success: true, messageIds };
  }
);

// ============================================================================
// Email Settings IPC Handlers
// ============================================================================

// Get email settings
ipcMain.handle('emailSettings:getSettings', async () => {
  const storage = getStorageService();

  try {
    // Load settings from storage (or return defaults)
    const settingsJson = await storage.get('email:settings');
    let settings = settingsJson
      ? JSON.parse(settingsJson)
      : {
          defaultSyncInterval: 15,
          defaultTimeout: 30000,
          defaultRetry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          defaultRateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
          connectionPool: {
            maxConnections: 5,
            minIdle: 1,
            idleTimeout: 30000,
            maxLifetime: 300000,
            enabled: true,
          },
          enableLogging: true,
          logLevel: 'info',
          maxMessageSize: 10485760, // 10MB
          enableCaching: true,
          cacheTtl: 3600000, // 1 hour
          accounts: [],
        };

    // Load accounts from EmailService (source of truth)
    if (emailService) {
      const serviceAccounts = emailService.getAccounts();
      const settingsAccounts = (settings.accounts ?? []) as Array<{
        id: string;
        email: string;
        displayName: string;
        provider: string;
        incoming: {
          host: string;
          port: number;
          encryption: string;
          username: string;
        };
        outgoing: {
          host: string;
          port: number;
          encryption: string;
          username: string;
        };
        [key: string]: unknown;
      }>;

      // Create a map of existing settings accounts by ID
      const settingsAccountMap = new Map<string, unknown>();
      for (const acc of settingsAccounts) {
        settingsAccountMap.set(acc.id, acc);
      }

      // For each account in EmailService, ensure it exists in settings
      const mergedAccounts: unknown[] = [];
      for (const serviceAccount of serviceAccounts) {
        const existingSettingsAccount = settingsAccountMap.get(serviceAccount.id);

        if (existingSettingsAccount) {
          // Account exists in settings, use it
          mergedAccounts.push(existingSettingsAccount);
        } else {
          // Account exists in EmailService but not in settings - convert it
          // This handles accounts created before settings sync was implemented
          const convertedAccount = {
            id: serviceAccount.id,
            email: serviceAccount.email,
            displayName: serviceAccount.displayName,
            provider: 'custom' as const, // Default provider
            incoming: {
              host: serviceAccount.imap.host,
              port: serviceAccount.imap.port,
              encryption: serviceAccount.imap.secure ? ('ssl' as const) : ('tls' as const),
              username: serviceAccount.imap.auth.user,
              password: '', // Password is encrypted in EmailService, don't include it here
              protocol: 'imap' as const,
              timeout: settings.defaultTimeout ?? 30000,
              retry: settings.defaultRetry ?? {
                maxAttempts: 3,
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
                retryOnConnectionError: true,
                retryOnTimeout: true,
              },
            },
            outgoing: {
              host: serviceAccount.smtp.host,
              port: serviceAccount.smtp.port,
              encryption: serviceAccount.smtp.secure ? ('ssl' as const) : ('tls' as const),
              username: serviceAccount.smtp.auth.user,
              password: '', // Password is encrypted in EmailService, don't include it here
              timeout: settings.defaultTimeout ?? 30000,
              retry: settings.defaultRetry ?? {
                maxAttempts: 3,
                initialDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
                retryOnConnectionError: true,
                retryOnTimeout: true,
              },
              rateLimit: settings.defaultRateLimit ?? {
                maxRequests: 100,
                windowMs: 60000,
                enabled: true,
              },
            },
            syncInterval: settings.defaultSyncInterval ?? 15,
            signature: '',
            status: 'active' as const,
            connectionPool: settings.connectionPool ?? {
              maxConnections: 5,
              minIdle: 1,
              idleTimeout: 30000,
              maxLifetime: 300000,
              enabled: true,
            },
          };
          mergedAccounts.push(convertedAccount);
        }
      }

      // Update settings with merged accounts
      settings = {
        ...settings,
        accounts: mergedAccounts,
      };
    }

    return settings;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get email settings';
    console.error('Failed to get email settings:', error);
    throw new Error(message);
  }
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Update email settings
ipcMain.handle('emailSettings:updateSettings', async (_event, updates: unknown) => {
  const storage = getStorageService();

  try {
    // Load current settings
    const currentJson = await storage.get('email:settings');
    const currentParsed: unknown = currentJson ? JSON.parse(currentJson) : {};
    const current = isRecord(currentParsed) ? currentParsed : {};
    const updateRecord = isRecord(updates) ? updates : {};

    // Merge updates
    const updated = { ...current, ...updateRecord };

    // Save to storage
    await storage.set('email:settings', JSON.stringify(updated));

    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update email settings';
    console.error('Failed to update email settings:', error);
    throw new Error(message);
  }
});

// Helper function to convert encryption type to secure boolean
// For nodemailer/imapflow: secure=true means SSL/TLS directly (port 465),
// secure=false means STARTTLS (port 587)
function encryptionToSecure(encryption: string): boolean {
  // Only 'ssl' uses direct SSL/TLS (secure: true)
  // 'tls', 'starttls', and 'none' use STARTTLS or no encryption (secure: false)
  return encryption === 'ssl';
}

// Create email account - integrates with EmailService
ipcMain.handle('emailSettings:createAccount', async (_event, input: unknown) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const storage = getStorageService();
  const userId = (await storage.get('device:id')) ?? 'unknown';

  try {
    // Validate input structure
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: expected object');
    }

    const inputObj = input as {
      email?: string;
      displayName?: string;
      provider?: string;
      incoming?: {
        protocol?: string;
        host?: string;
        port?: number;
        encryption?: string;
        username?: string;
        password?: string;
        timeout?: number;
        retry?: Record<string, unknown>;
      };
      outgoing?: {
        host?: string;
        port?: number;
        encryption?: string;
        username?: string;
        password?: string;
        timeout?: number;
        retry?: Record<string, unknown>;
        rateLimit?: Record<string, unknown>;
      };
      syncInterval?: number;
      signature?: string;
    };

    // Validate required fields
    if (!inputObj.email || !inputObj.displayName || !inputObj.incoming || !inputObj.outgoing) {
      throw new Error('Missing required fields: email, displayName, incoming, outgoing');
    }

    if (!inputObj.incoming.host || !inputObj.incoming.port || !inputObj.incoming.username) {
      throw new Error('Missing required incoming server fields: host, port, username');
    }

    if (!inputObj.outgoing.host || !inputObj.outgoing.port || !inputObj.outgoing.username) {
      throw new Error('Missing required outgoing server fields: host, port, username');
    }

    const accountId = crypto.randomUUID();

    // Convert to EmailService format
    const emailAccountConfig: {
      id: string;
      email: string;
      displayName: string;
      userId: string;
      imap: ImapConfig;
      smtp: SmtpConfig;
    } = {
      id: accountId,
      email: inputObj.email,
      displayName: inputObj.displayName,
      userId,
      imap: {
        host: inputObj.incoming.host,
        port: inputObj.incoming.port,
        secure: encryptionToSecure(inputObj.incoming.encryption ?? 'ssl'),
        auth: {
          user: inputObj.incoming.username,
          pass: inputObj.incoming.password ?? '',
        },
      },
      smtp: {
        host: inputObj.outgoing.host,
        port: inputObj.outgoing.port,
        secure: encryptionToSecure(inputObj.outgoing.encryption ?? 'tls'),
        auth: {
          user: inputObj.outgoing.username,
          pass: inputObj.outgoing.password ?? '',
        },
      },
    };

    // Add account via EmailService
    await emailService.addAccount(emailAccountConfig);

    // Also save to email:settings for the settings UI
    const storage = getStorageService();
    const settingsJson = await storage.get('email:settings');
    const currentSettings = settingsJson
      ? JSON.parse(settingsJson)
      : {
          defaultSyncInterval: 15,
          defaultTimeout: 30000,
          defaultRetry: {
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryOnConnectionError: true,
            retryOnTimeout: true,
          },
          defaultRateLimit: {
            maxRequests: 100,
            windowMs: 60000,
            enabled: true,
          },
          connectionPool: {
            maxConnections: 5,
            minIdle: 1,
            idleTimeout: 30000,
            maxLifetime: 300000,
            enabled: true,
          },
          enableLogging: true,
          logLevel: 'info',
          maxMessageSize: 10485760,
          enableCaching: true,
          cacheTtl: 3600000,
          accounts: [],
        };

    // Create EmailAccountSettings object
    const accountSettings = {
      id: accountId,
      email: inputObj.email,
      displayName: inputObj.displayName,
      provider: inputObj.provider ?? 'custom',
      incoming: {
        protocol: (inputObj.incoming.protocol ?? 'imap') as 'imap' | 'pop3',
        host: inputObj.incoming.host,
        port: inputObj.incoming.port,
        encryption: (inputObj.incoming.encryption ?? 'ssl') as 'none' | 'ssl' | 'tls' | 'starttls',
        authMethod: 'password' as const,
        username: inputObj.incoming.username,
        password: inputObj.incoming.password,
        timeout: inputObj.incoming.timeout ?? 30000,
        retry: inputObj.incoming.retry ?? {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryOnConnectionError: true,
          retryOnTimeout: true,
        },
      },
      outgoing: {
        host: inputObj.outgoing.host,
        port: inputObj.outgoing.port,
        encryption: (inputObj.outgoing.encryption ?? 'tls') as 'none' | 'ssl' | 'tls' | 'starttls',
        authMethod: 'password' as const,
        username: inputObj.outgoing.username,
        password: inputObj.outgoing.password,
        timeout: inputObj.outgoing.timeout ?? 30000,
        retry: inputObj.outgoing.retry ?? {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryOnConnectionError: true,
          retryOnTimeout: true,
        },
        rateLimit: inputObj.outgoing.rateLimit ?? {
          maxRequests: 100,
          windowMs: 60000,
          enabled: true,
        },
      },
      syncInterval: inputObj.syncInterval ?? 15,
      signature: inputObj.signature,
      status: 'active' as const,
      deleteAfterDownload: false,
    };

    // Add account to settings
    const updatedAccounts = [...(currentSettings.accounts ?? []), accountSettings];
    const updatedSettings = { ...currentSettings, accounts: updatedAccounts };
    await storage.set('email:settings', JSON.stringify(updatedSettings));

    console.log('Email account created:', inputObj.email);
    return { id: accountId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create email account';
    console.error('Failed to create email account:', error);
    throw new Error(message);
  }
});

// Update email account - integrates with EmailService
ipcMain.handle('emailSettings:updateAccount', async (_event, input: unknown) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  try {
    // Validate input structure
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: expected object');
    }

    const inputObj = input as {
      id?: string;
      displayName?: string;
      incoming?: {
        host?: string;
        port?: number;
        encryption?: string;
        username?: string;
        password?: string;
      };
      outgoing?: {
        host?: string;
        port?: number;
        encryption?: string;
        username?: string;
        password?: string;
      };
      syncInterval?: number;
      signature?: string;
      status?: string;
    };

    if (!inputObj.id) {
      throw new Error('Missing required field: id');
    }

    const account = emailService.getAccountById(inputObj.id);
    if (!account) {
      throw new Error(`Account not found: ${inputObj.id}`);
    }

    // Build update object for EmailService
    const updates: {
      displayName?: string;
      imap?: ImapConfig;
      smtp?: SmtpConfig;
    } = {};

    if (inputObj.displayName !== undefined) {
      updates.displayName = inputObj.displayName;
    }

    if (inputObj.incoming) {
      updates.imap = {
        host: inputObj.incoming.host ?? account.imap.host,
        port: inputObj.incoming.port ?? account.imap.port,
        secure: encryptionToSecure(inputObj.incoming.encryption ?? 'ssl'),
        auth: {
          user: inputObj.incoming.username ?? account.imap.auth.user,
          pass: inputObj.incoming.password ?? account.imap.auth.pass,
        },
      };
    }

    if (inputObj.outgoing) {
      updates.smtp = {
        host: inputObj.outgoing.host ?? account.smtp.host,
        port: inputObj.outgoing.port ?? account.smtp.port,
        secure: encryptionToSecure(inputObj.outgoing.encryption ?? 'tls'),
        auth: {
          user: inputObj.outgoing.username ?? account.smtp.auth.user,
          pass: inputObj.outgoing.password ?? account.smtp.auth.pass,
        },
      };
    }

    // Update account via EmailService
    if (Object.keys(updates).length > 0) {
      await emailService.updateAccount(inputObj.id, updates);
    }

    // Also update in email:settings
    const storage = getStorageService();
    const settingsJson = await storage.get('email:settings');
    if (settingsJson) {
      interface EmailSettingsAccountRecord extends Record<string, unknown> {
        id: string;
        displayName?: string;
        incoming?: Record<string, unknown>;
        outgoing?: Record<string, unknown>;
        syncInterval?: number;
        signature?: string;
        status?: string;
      }

      const currentSettingsParsed: unknown = JSON.parse(settingsJson);
      const currentSettings: Record<string, unknown> = isRecord(currentSettingsParsed)
        ? currentSettingsParsed
        : {};

      const accountsRaw = currentSettings.accounts;
      const accounts: EmailSettingsAccountRecord[] = Array.isArray(accountsRaw)
        ? (accountsRaw as EmailSettingsAccountRecord[])
        : [];

      const accountIndex = accounts.findIndex((acc) => acc.id === inputObj.id);

      if (accountIndex >= 0) {
        const updatedAccount: EmailSettingsAccountRecord = { ...accounts[accountIndex] };

        // Update fields
        if (inputObj.displayName !== undefined) {
          updatedAccount.displayName = inputObj.displayName;
        }
        if (inputObj.incoming) {
          updatedAccount.incoming = {
            ...(updatedAccount.incoming ?? {}),
            ...inputObj.incoming,
          };
        }
        if (inputObj.outgoing) {
          updatedAccount.outgoing = {
            ...(updatedAccount.outgoing ?? {}),
            ...inputObj.outgoing,
          };
        }
        if (inputObj.syncInterval !== undefined) {
          updatedAccount.syncInterval = inputObj.syncInterval;
        }
        if (inputObj.signature !== undefined) {
          updatedAccount.signature = inputObj.signature;
        }
        if (inputObj.status !== undefined) {
          updatedAccount.status = inputObj.status;
        }

        const updatedAccounts = [...accounts];
        updatedAccounts[accountIndex] = updatedAccount;
        const updatedSettings = { ...currentSettings, accounts: updatedAccounts };
        await storage.set('email:settings', JSON.stringify(updatedSettings));
      }
    }

    console.log('Email account updated:', inputObj.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update email account';
    console.error('Failed to update email account:', error);
    throw new Error(message);
  }
});

// Delete email account (integrates with existing EmailService)
ipcMain.handle('emailSettings:deleteAccount', async (_event, id: string) => {
  if (!emailService) {
    throw new Error('EmailService not initialized');
  }

  const storage = getStorageService();

  try {
    // Remove from EmailService
    await emailService.removeAccount(id);

    // Also remove from email:settings
    const settingsJson = await storage.get('email:settings');
    if (settingsJson) {
      const currentSettings = JSON.parse(settingsJson);
      const updatedAccounts = (currentSettings.accounts ?? []).filter(
        (acc: { id: string }) => acc.id !== id
      );
      const updatedSettings = { ...currentSettings, accounts: updatedAccounts };
      await storage.set('email:settings', JSON.stringify(updatedSettings));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete email account';
    console.error('Failed to delete email account:', error);
    throw new Error(message);
  }
});

// Test email connection - implements connection testing
ipcMain.handle('emailSettings:testConnection', async (_event, input: unknown) => {
  try {
    // Validate input structure
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid input: expected object');
    }

    const inputObj = input as {
      accountId?: string;
      incoming?: {
        host?: string;
        port?: number;
        encryption?: string;
        username?: string;
        password?: string;
        timeout?: number;
      };
      outgoing?: {
        host?: string;
        port?: number;
        encryption?: string;
        username?: string;
        password?: string;
        timeout?: number;
      };
      testType?: 'incoming' | 'outgoing' | 'both';
    };

    const testType = inputObj.testType ?? 'both';

    let imapConfig: ImapConfig | undefined;
    let smtpConfig: SmtpConfig | undefined;

    // If accountId provided, get config from existing account
    if (inputObj.accountId && emailService) {
      const account = emailService.getAccountById(inputObj.accountId);
      if (account) {
        imapConfig = account.imap;
        smtpConfig = account.smtp;
      }
    }

    // Otherwise, use provided config
    if (inputObj.incoming && (testType === 'incoming' || testType === 'both')) {
      if (!inputObj.incoming.host || !inputObj.incoming.port || !inputObj.incoming.username) {
        throw new Error('Missing required incoming server fields: host, port, username');
      }
      imapConfig = {
        host: inputObj.incoming.host,
        port: inputObj.incoming.port,
        secure: encryptionToSecure(inputObj.incoming.encryption ?? 'ssl'),
        auth: {
          user: inputObj.incoming.username,
          pass: inputObj.incoming.password ?? '',
        },
      };
    }

    if (inputObj.outgoing && (testType === 'outgoing' || testType === 'both')) {
      if (!inputObj.outgoing.host || !inputObj.outgoing.port || !inputObj.outgoing.username) {
        throw new Error('Missing required outgoing server fields: host, port, username');
      }
      smtpConfig = {
        host: inputObj.outgoing.host,
        port: inputObj.outgoing.port,
        secure: encryptionToSecure(inputObj.outgoing.encryption ?? 'tls'),
        auth: {
          user: inputObj.outgoing.username,
          pass: inputObj.outgoing.password ?? '',
        },
      };
    }

    // Test connections
    const timeout = inputObj.incoming?.timeout ?? inputObj.outgoing?.timeout ?? 30000;

    const result = await testEmailConnections({
      imap: imapConfig,
      smtp: smtpConfig,
      testType,
      timeout,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to test connection:', error);
    return {
      success: false,
      incoming: { success: false, error: errorMessage },
      outgoing: { success: false, error: errorMessage },
    };
  }
});

// ============================================================================
// Email Search IPC Handlers
// ============================================================================

// Search email messages
ipcMain.handle('email:search', async (_event, query: unknown) => {
  if (!emailSearchService) {
    throw new Error('EmailSearchService not initialized');
  }

  try {
    const queryObj = query as {
      query: string;
      accountId?: string;
      folder?: string;
      from?: string;
      to?: string;
      dateFrom?: number;
      dateTo?: number;
      hasAttachments?: boolean;
      limit?: number;
    };

    const results = await emailSearchService.search(queryObj);
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search emails';
    console.error('Failed to search emails:', error);
    throw new Error(message);
  }
});

// Rebuild search index for account
ipcMain.handle('email:searchIndex:rebuild', async (_event, accountId: string) => {
  if (!emailSearchService || !emailService) {
    throw new Error('EmailSearchService or EmailService not initialized');
  }

  try {
    // Fetch all messages for the account (would need EmailService method to get all messages)
    // For now, this is a placeholder - would need to fetch messages from all folders
    // TODO: Implement method to fetch all messages from EmailService
    // For now, return success
    console.log(`Rebuild index requested for account ${accountId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rebuild index';
    console.error('Failed to rebuild search index:', error);
    throw new Error(message);
  }
});
}

console.log('DOFTool main process started');
