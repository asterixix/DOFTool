/**
 * Discovery Service - mDNS-based device discovery for P2P sync
 *
 * Uses bonjour-service to advertise this device and discover other
 * family devices on the local network.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

import * as Bonjour from 'bonjour-service';

import { MDNS_SERVICE_TYPE, SYNC_PROTOCOL_VERSION } from './Sync.types';

import type { DiscoveredPeer, SyncConfig } from './Sync.types';
import type { Browser, Service } from 'bonjour-service';

/** Discovery service configuration */
interface DiscoveryConfig extends SyncConfig {
  /** Port for signaling server */
  signalingPort: number;
  /** App version */
  appVersion?: string;
}

/** Events emitted by DiscoveryService */
interface DiscoveryServiceEvents {
  'peer-discovered': (peer: DiscoveredPeer) => void;
  'peer-lost': (deviceId: string) => void;
  error: (error: Error) => void;
}

export class DiscoveryService extends EventEmitter {
  private bonjour: Bonjour.Bonjour | null = null;
  private advertisement: Service | null = null;
  private browser: Browser | null = null;
  private config: DiscoveryConfig | null = null;
  private familyIdHash: string = '';
  private discoveredPeers: Map<string, DiscoveredPeer> = new Map();
  private isRunning = false;

  private isStoppable(service: Service | null): service is Service & { stop: () => void } {
    return !!service && typeof (service as { stop?: unknown }).stop === 'function';
  }

  constructor() {
    super();
  }

  /**
   * Initialize the discovery service with configuration
   */
  initialize(config: DiscoveryConfig): void {
    this.config = config;
    this.familyIdHash = this.hashFamilyId(config.familyId);
    this.bonjour = new Bonjour.Bonjour();
  }

  /**
   * Hash the family ID for privacy (don't expose full ID on network)
   */
  private hashFamilyId(familyId: string): string {
    return crypto.createHash('sha256').update(familyId).digest('hex').slice(0, 32);
  }

  /**
   * Start advertising this device on the network
   */
  startAdvertising(): void {
    if (!this.bonjour || !this.config) {
      throw new Error('DiscoveryService not initialized');
    }

    if (this.advertisement) {
      this.stopAdvertising();
    }

    try {
      this.advertisement = this.bonjour.publish({
        name: `DOFTool-${this.config.deviceId.slice(0, 8)}`,
        type: MDNS_SERVICE_TYPE,
        port: this.config.signalingPort,
        txt: {
          fid: this.familyIdHash,
          did: this.config.deviceId,
          dn: this.config.deviceName,
          pv: SYNC_PROTOCOL_VERSION,
          av: this.config.appVersion ?? '0.1.0',
        },
      });

      console.error('[DiscoveryService] Started advertising on port', this.config.signalingPort);
    } catch (error) {
      console.error('[DiscoveryService] Failed to start advertising:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop advertising this device
   */
  stopAdvertising(): void {
    const ad = this.advertisement;
    if (this.isStoppable(ad)) {
      try {
        ad.stop();
      } catch (error) {
        console.error('[DiscoveryService] Error stopping advertisement:', error);
      }
      this.advertisement = null;
    }
  }

  /**
   * Start browsing for other devices
   */
  startBrowsing(): void {
    if (!this.bonjour || !this.config) {
      throw new Error('DiscoveryService not initialized');
    }

    if (this.browser) {
      this.stopBrowsing();
    }

    this.isRunning = true;

    try {
      this.browser = this.bonjour.find({ type: MDNS_SERVICE_TYPE });

      this.browser.on('up', (service: Service) => {
        this.handleServiceUp(service);
      });

      this.browser.on('down', (service: Service) => {
        this.handleServiceDown(service);
      });

      console.error('[DiscoveryService] Started browsing for peers');
    } catch (error) {
      console.error('[DiscoveryService] Failed to start browsing:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop browsing for devices
   */
  stopBrowsing(): void {
    this.isRunning = false;

    if (this.browser) {
      try {
        this.browser.stop();
      } catch (error) {
        console.error('[DiscoveryService] Error stopping browser:', error);
      }
      this.browser = null;
    }
  }

  /**
   * Handle a service being discovered
   */
  private handleServiceUp(service: Service): void {
    if (!this.config || !this.isRunning) {
      return;
    }

    const txt = service.txt as Record<string, string> | undefined;
    if (!txt) {
      return;
    }

    const familyIdHash = txt.fid;
    const deviceId = txt.did;
    const deviceName = txt.dn ?? 'Unknown Device';
    const protocolVersion = txt.pv ?? '1';
    const appVersion = txt.av;

    // Only connect to devices in the same family
    if (familyIdHash !== this.familyIdHash) {
      return;
    }

    // Don't connect to ourselves
    if (deviceId === this.config.deviceId) {
      return;
    }

    // Check protocol version compatibility
    if (protocolVersion !== SYNC_PROTOCOL_VERSION) {
      console.error(
        `[DiscoveryService] Incompatible protocol version from ${deviceId}: ${protocolVersion}`
      );
      return;
    }

    // Get host address
    const host = service.addresses?.[0] ?? service.host;
    if (!host) {
      console.error('[DiscoveryService] No host address for service:', service.name);
      return;
    }

    const peer: DiscoveredPeer = {
      deviceId,
      deviceName,
      familyIdHash,
      host,
      port: service.port,
      protocolVersion,
      appVersion,
      discoveredAt: Date.now(),
    };

    // Check if this is a new peer or an update
    const existingPeer = this.discoveredPeers.get(deviceId);
    if (existingPeer?.host !== host || existingPeer.port !== peer.port) {
      this.discoveredPeers.set(deviceId, peer);
      console.error(`[DiscoveryService] Discovered peer: ${deviceName} (${deviceId.slice(0, 8)})`);
      this.emit('peer-discovered', peer);
    }
  }

  /**
   * Handle a service going offline
   */
  private handleServiceDown(service: Service): void {
    const txt = service.txt as Record<string, string> | undefined;
    if (!txt) {
      return;
    }

    const deviceId = txt.did;
    if (!deviceId) {
      return;
    }

    if (this.discoveredPeers.has(deviceId)) {
      const peer = this.discoveredPeers.get(deviceId);
      this.discoveredPeers.delete(deviceId);
      console.error(`[DiscoveryService] Peer went offline: ${peer?.deviceName ?? deviceId}`);
      this.emit('peer-lost', deviceId);
    }
  }

  /**
   * Get all currently discovered peers
   */
  getDiscoveredPeers(): DiscoveredPeer[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Get a specific peer by device ID
   */
  getPeer(deviceId: string): DiscoveredPeer | undefined {
    return this.discoveredPeers.get(deviceId);
  }

  /**
   * Check if the service is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Start both advertising and browsing
   */
  start(): void {
    this.startAdvertising();
    this.startBrowsing();
  }

  /**
   * Stop all discovery operations
   */
  stop(): void {
    this.stopBrowsing();
    this.stopAdvertising();
    this.discoveredPeers.clear();
  }

  /**
   * Cleanup and destroy the service
   */
  destroy(): void {
    this.stop();

    if (this.bonjour) {
      try {
        this.bonjour.destroy();
      } catch (error) {
        console.error('[DiscoveryService] Error destroying bonjour:', error);
      }
      this.bonjour = null;
    }

    this.removeAllListeners();
  }

  // Type-safe event methods
  override on<K extends keyof DiscoveryServiceEvents>(
    event: K,
    listener: DiscoveryServiceEvents[K]
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override emit<K extends keyof DiscoveryServiceEvents>(
    event: K,
    ...args: Parameters<DiscoveryServiceEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  override off<K extends keyof DiscoveryServiceEvents>(
    event: K,
    listener: DiscoveryServiceEvents[K]
  ): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}
