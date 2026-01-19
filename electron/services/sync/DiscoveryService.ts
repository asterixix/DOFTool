/**
 * Unified Discovery Service - mDNS-based discovery for P2P sync and family joining
 *
 * Handles two discovery modes:
 * 1. Family Discovery: Admin devices publish family presence for new devices to find and join
 * 2. Peer Discovery: Family members discover each other for P2P sync
 *
 * Uses bonjour-service (mDNS/DNS-SD) for local network discovery.
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import * as os from 'os';

import { Bonjour } from 'bonjour-service';

import { MDNS_SERVICE_TYPE, SYNC_PROTOCOL_VERSION } from './Sync.types';

import type { DiscoveredPeer, SyncConfig } from './Sync.types';
import type { Browser, Service } from 'bonjour-service';

/** Service types for mDNS */
const FAMILY_SERVICE_TYPE = 'doftool-family';
const FAMILY_SERVICE_PORT = 45678;

/** Permission roles for family members */
type PermissionRole = 'admin' | 'member' | 'viewer';

/** Discovered family on the network (for joining) */
export interface DiscoveredFamily {
  id: string;
  name: string;
  adminDeviceName: string;
  host: string;
  port: number;
  discoveredAt: number;
}

/** Join request from a device wanting to join */
export interface JoinRequest {
  id: string;
  deviceId: string;
  deviceName: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  assignedRole?: PermissionRole;
}

/** Join request approval payload */
export interface JoinApproval {
  requestId: string;
  approved: boolean;
  role?: PermissionRole;
  familyId?: string;
  familyName?: string;
  syncToken?: string;
}

/** Discovery service configuration */
export interface DiscoveryConfig extends SyncConfig {
  /** Port for signaling server */
  signalingPort: number;
  /** App version */
  appVersion?: string;
  /** Family name (for family publishing) */
  familyName?: string;
}

/** Events emitted by DiscoveryService */
interface DiscoveryServiceEvents {
  // Peer sync events
  'peer-discovered': (peer: DiscoveredPeer) => void;
  'peer-lost': (deviceId: string) => void;
  // Family discovery events
  'family-discovered': (family: DiscoveredFamily) => void;
  'family-lost': (familyId: string) => void;
  // Join request events
  'join-request-received': (request: JoinRequest) => void;
  'join-request-approved': (approval: JoinApproval) => void;
  'join-request-rejected': (requestId: string) => void;
  // Error events
  error: (error: Error) => void;
}

export class DiscoveryService extends EventEmitter {
  private bonjour: Bonjour | null = null;
  private config: DiscoveryConfig | null = null;
  private deviceId: string | null = null;
  private deviceName: string;
  private familyIdHash: string = '';

  // Peer sync discovery (for family members)
  private peerAdvertisement: Service | null = null;
  private peerBrowser: Browser | null = null;
  private discoveredPeers: Map<string, DiscoveredPeer> = new Map();
  private isPeerDiscoveryRunning = false;

  // Family discovery (for joining)
  private familyAdvertisement: Service | null = null;
  private familyBrowser: Browser | null = null;
  private discoveredFamilies: Map<string, DiscoveredFamily> = new Map();
  private isFamilyDiscoveryRunning = false;
  private isFamilyPublishing = false;
  private currentFamilyId: string | null = null;

  // Join requests
  private pendingJoinRequests: Map<string, JoinRequest> = new Map();

  constructor() {
    super();
    this.deviceName = os.hostname();
  }

  private isStoppable(service: Service | null): service is Service & { stop: () => void } {
    return !!service && typeof (service as { stop?: unknown }).stop === 'function';
  }

  /**
   * Initialize the discovery service with device ID only (basic init)
   */
  initializeBasic(deviceId: string): void {
    this.deviceId = deviceId;
    this.bonjour ??= new Bonjour();
    console.log('[DiscoveryService] Basic initialization complete');
  }

  /**
   * Initialize the discovery service with full configuration (for peer sync)
   */
  initialize(config: DiscoveryConfig): void {
    this.config = config;
    this.deviceId = config.deviceId;
    this.deviceName = config.deviceName;
    this.familyIdHash = this.hashFamilyId(config.familyId);
    this.currentFamilyId = config.familyId;
    this.bonjour ??= new Bonjour();
    console.log('[DiscoveryService] Full initialization complete');
  }

  /**
   * Hash the family ID for privacy (don't expose full ID on network)
   */
  private hashFamilyId(familyId: string): string {
    return crypto.createHash('sha256').update(familyId).digest('hex').slice(0, 32);
  }

  // ============================================================================
  // PEER SYNC DISCOVERY (for family members to find each other)
  // ============================================================================

  /**
   * Start advertising this device for peer sync
   */
  startPeerAdvertising(): void {
    if (!this.bonjour || !this.config) {
      throw new Error('DiscoveryService not fully initialized for peer advertising');
    }

    if (this.peerAdvertisement) {
      this.stopPeerAdvertising();
    }

    try {
      this.peerAdvertisement = this.bonjour.publish({
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

      console.log('[DiscoveryService] Started peer advertising on port', this.config.signalingPort);
    } catch (error) {
      console.error('[DiscoveryService] Failed to start peer advertising:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop advertising this device for peer sync
   */
  stopPeerAdvertising(): void {
    if (this.isStoppable(this.peerAdvertisement)) {
      try {
        this.peerAdvertisement.stop();
      } catch (error) {
        console.error('[DiscoveryService] Error stopping peer advertisement:', error);
      }
    }
    this.peerAdvertisement = null;
  }

  /**
   * Start browsing for peer devices in the same family
   */
  startPeerBrowsing(): void {
    if (!this.bonjour || !this.config) {
      throw new Error('DiscoveryService not fully initialized for peer browsing');
    }

    if (this.peerBrowser) {
      this.stopPeerBrowsing();
    }

    this.isPeerDiscoveryRunning = true;

    try {
      this.peerBrowser = this.bonjour.find({ type: MDNS_SERVICE_TYPE });

      this.peerBrowser.on('up', (service: Service) => {
        this.handlePeerServiceUp(service);
      });

      this.peerBrowser.on('down', (service: Service) => {
        this.handlePeerServiceDown(service);
      });

      console.log('[DiscoveryService] Started peer browsing');
    } catch (error) {
      console.error('[DiscoveryService] Failed to start peer browsing:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop browsing for peer devices
   */
  stopPeerBrowsing(): void {
    this.isPeerDiscoveryRunning = false;

    if (this.peerBrowser) {
      try {
        this.peerBrowser.stop();
      } catch (error) {
        console.error('[DiscoveryService] Error stopping peer browser:', error);
      }
      this.peerBrowser = null;
    }
  }

  private handlePeerServiceUp(service: Service): void {
    if (!this.config || !this.isPeerDiscoveryRunning) {
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
      console.error('[DiscoveryService] No host address for peer service:', service.name);
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
      console.log(`[DiscoveryService] Discovered peer: ${deviceName} (${deviceId.slice(0, 8)})`);
      this.emit('peer-discovered', peer);
    }
  }

  private handlePeerServiceDown(service: Service): void {
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
      console.log(`[DiscoveryService] Peer went offline: ${peer?.deviceName ?? deviceId}`);
      this.emit('peer-lost', deviceId);
    }
  }

  /**
   * Get all currently discovered peers (for sync)
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

  // ============================================================================
  // FAMILY DISCOVERY (for new devices to find families to join)
  // ============================================================================

  /**
   * Start publishing family presence on the network (admin devices only)
   */
  startFamilyPublishing(familyId: string, familyName: string): void {
    if (this.isFamilyPublishing) {
      console.log('[DiscoveryService] Already publishing family, stopping first...');
      this.stopFamilyPublishing();
    }

    if (!this.bonjour) {
      console.error('[DiscoveryService] Service not initialized for family publishing');
      return;
    }

    this.currentFamilyId = familyId;

    try {
      this.familyAdvertisement = this.bonjour.publish({
        name: `${familyName}-${familyId.slice(0, 8)}`,
        type: FAMILY_SERVICE_TYPE,
        port: FAMILY_SERVICE_PORT,
        txt: {
          familyId,
          familyName,
          adminDeviceName: this.deviceName,
          deviceId: this.deviceId ?? '',
          version: '1',
        },
      });

      this.isFamilyPublishing = true;
      console.log(`[DiscoveryService] Publishing family: ${familyName} (${familyId.slice(0, 8)})`);
    } catch (error) {
      console.error('[DiscoveryService] Failed to publish family:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop publishing family presence
   */
  stopFamilyPublishing(): void {
    if (this.isStoppable(this.familyAdvertisement)) {
      try {
        this.familyAdvertisement.stop();
      } catch (error) {
        console.warn('[DiscoveryService] Error stopping family advertisement:', error);
      }
    }
    this.familyAdvertisement = null;
    this.isFamilyPublishing = false;
    console.log('[DiscoveryService] Stopped family publishing');
  }

  /**
   * Start discovering families on the local network (for joining)
   */
  startFamilyDiscovering(): void {
    if (this.isFamilyDiscoveryRunning) {
      console.log('[DiscoveryService] Already discovering families');
      return;
    }

    if (!this.bonjour) {
      console.error('[DiscoveryService] Service not initialized for family discovery');
      return;
    }

    try {
      this.familyBrowser = this.bonjour.find({ type: FAMILY_SERVICE_TYPE });

      this.familyBrowser.on('up', (service: Service) => {
        this.handleFamilyServiceUp(service);
      });

      this.familyBrowser.on('down', (service: Service) => {
        this.handleFamilyServiceDown(service);
      });

      this.isFamilyDiscoveryRunning = true;
      console.log('[DiscoveryService] Started discovering families on local network');
    } catch (error) {
      console.error('[DiscoveryService] Failed to start family discovery:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop discovering families
   */
  stopFamilyDiscovering(): void {
    if (this.familyBrowser) {
      try {
        this.familyBrowser.stop();
      } catch (error) {
        console.warn('[DiscoveryService] Error stopping family browser:', error);
      }
      this.familyBrowser = null;
    }
    this.discoveredFamilies.clear();
    this.isFamilyDiscoveryRunning = false;
    console.log('[DiscoveryService] Stopped family discovery');
  }

  private handleFamilyServiceUp(service: Service): void {
    const txt = service.txt as Record<string, string> | undefined;
    if (!txt?.familyId || !txt?.familyName) {
      return;
    }

    // Don't discover our own family
    if (txt.familyId === this.currentFamilyId) {
      return;
    }

    // Don't discover our own device
    if (txt.deviceId === this.deviceId) {
      return;
    }

    const family: DiscoveredFamily = {
      id: txt.familyId,
      name: txt.familyName,
      adminDeviceName: txt.adminDeviceName ?? 'Unknown',
      host: service.host ?? service.addresses?.[0] ?? 'localhost',
      port: service.port,
      discoveredAt: Date.now(),
    };

    this.discoveredFamilies.set(family.id, family);
    console.log(`[DiscoveryService] Family discovered: ${family.name} at ${family.host}`);
    this.emit('family-discovered', family);
  }

  private handleFamilyServiceDown(service: Service): void {
    const txt = service.txt as Record<string, string> | undefined;
    if (!txt?.familyId) {
      return;
    }

    if (this.discoveredFamilies.has(txt.familyId)) {
      this.discoveredFamilies.delete(txt.familyId);
      console.log(`[DiscoveryService] Family lost: ${txt.familyId}`);
      this.emit('family-lost', txt.familyId);
    }
  }

  /**
   * Get list of discovered families (for joining)
   */
  getDiscoveredFamilies(): DiscoveredFamily[] {
    return Array.from(this.discoveredFamilies.values());
  }

  // ============================================================================
  // JOIN REQUEST MANAGEMENT
  // ============================================================================

  /**
   * Create a join request (requesting device side)
   */
  createJoinRequest(familyId: string): JoinRequest {
    const request: JoinRequest = {
      id: crypto.randomUUID(),
      deviceId: this.deviceId ?? '',
      deviceName: this.deviceName,
      requestedAt: Date.now(),
      status: 'pending',
    };

    this.pendingJoinRequests.set(request.id, request);
    console.log(`[DiscoveryService] Created join request for family ${familyId}: ${request.id}`);
    return request;
  }

  /**
   * Receive a join request from another device (admin side)
   */
  receiveJoinRequest(deviceId: string, deviceName: string): JoinRequest {
    const request: JoinRequest = {
      id: crypto.randomUUID(),
      deviceId,
      deviceName,
      requestedAt: Date.now(),
      status: 'pending',
    };

    this.pendingJoinRequests.set(request.id, request);
    console.log(`[DiscoveryService] Received join request from ${deviceName} (${deviceId})`);
    this.emit('join-request-received', request);
    return request;
  }

  /**
   * Get all pending join requests (admin side)
   */
  getPendingJoinRequests(): JoinRequest[] {
    return Array.from(this.pendingJoinRequests.values()).filter((r) => r.status === 'pending');
  }

  /**
   * Approve a join request (admin side)
   */
  approveJoinRequest(
    requestId: string,
    role: PermissionRole,
    familyId: string,
    familyName: string
  ): JoinApproval | null {
    const request = this.pendingJoinRequests.get(requestId);
    if (request?.status !== 'pending') {
      return null;
    }

    request.status = 'approved';
    request.assignedRole = role;

    const approval: JoinApproval = {
      requestId,
      approved: true,
      role,
      familyId,
      familyName,
      syncToken: crypto.randomUUID(),
    };

    console.log(`[DiscoveryService] Approved join request ${requestId} with role ${role}`);
    this.emit('join-request-approved', approval);
    return approval;
  }

  /**
   * Reject a join request (admin side)
   */
  rejectJoinRequest(requestId: string): boolean {
    const request = this.pendingJoinRequests.get(requestId);
    if (request?.status !== 'pending') {
      return false;
    }

    request.status = 'rejected';
    console.log(`[DiscoveryService] Rejected join request ${requestId}`);
    this.emit('join-request-rejected', requestId);
    return true;
  }

  /**
   * Clear a processed join request
   */
  clearJoinRequest(requestId: string): void {
    this.pendingJoinRequests.delete(requestId);
  }

  // ============================================================================
  // STATUS CHECKS
  // ============================================================================

  /**
   * Check if peer discovery is running
   */
  isPeerDiscoveryActive(): boolean {
    return this.isPeerDiscoveryRunning;
  }

  /**
   * Check if family publishing is active
   */
  isFamilyPublishingActive(): boolean {
    return this.isFamilyPublishing;
  }

  /**
   * Check if family discovery is running
   */
  isFamilyDiscoveryActive(): boolean {
    return this.isFamilyDiscoveryRunning;
  }

  // ============================================================================
  // CONVENIENCE METHODS (backward compatibility)
  // ============================================================================

  /**
   * Start both peer advertising and browsing (legacy API)
   */
  start(): void {
    this.startPeerAdvertising();
    this.startPeerBrowsing();
  }

  /**
   * Stop all peer discovery operations (legacy API)
   */
  stop(): void {
    this.stopPeerBrowsing();
    this.stopPeerAdvertising();
    this.discoveredPeers.clear();
  }

  /**
   * Legacy method aliases
   */
  startAdvertising(): void {
    this.startPeerAdvertising();
  }

  stopAdvertising(): void {
    this.stopPeerAdvertising();
  }

  startBrowsing(): void {
    this.startPeerBrowsing();
  }

  stopBrowsing(): void {
    this.stopPeerBrowsing();
  }

  isActive(): boolean {
    return this.isPeerDiscoveryRunning;
  }

  // Legacy family discovery aliases
  startPublishing(familyId: string, familyName: string): void {
    this.startFamilyPublishing(familyId, familyName);
  }

  stopPublishing(): void {
    this.stopFamilyPublishing();
  }

  startDiscovering(): void {
    this.startFamilyDiscovering();
  }

  stopDiscovering(): void {
    this.stopFamilyDiscovering();
  }

  isCurrentlyPublishing(): boolean {
    return this.isFamilyPublishing;
  }

  isCurrentlyDiscovering(): boolean {
    return this.isFamilyDiscoveryRunning;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  /**
   * Cleanup and destroy the service
   */
  destroy(): void {
    // Stop all operations
    this.stopPeerBrowsing();
    this.stopPeerAdvertising();
    this.stopFamilyDiscovering();
    this.stopFamilyPublishing();

    // Clear all data
    this.discoveredPeers.clear();
    this.discoveredFamilies.clear();
    this.pendingJoinRequests.clear();

    // Destroy bonjour instance
    if (this.bonjour) {
      try {
        this.bonjour.destroy();
      } catch (error) {
        console.error('[DiscoveryService] Error destroying bonjour:', error);
      }
      this.bonjour = null;
    }

    this.removeAllListeners();
    console.log('[DiscoveryService] Service destroyed');
  }

  // ============================================================================
  // TYPE-SAFE EVENT METHODS
  // ============================================================================

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
