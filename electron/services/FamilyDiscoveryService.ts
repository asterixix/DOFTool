/**
 * Family Discovery Service - mDNS-based family discovery on local network
 *
 * This service handles:
 * 1. Broadcasting family presence on the local network (admin devices)
 * 2. Discovering existing families on the network (new devices)
 * 3. Join request flow between devices
 * 4. Admin approval and role assignment
 */

import { EventEmitter } from 'events';
import * as os from 'os';

import { Bonjour } from 'bonjour-service';

import type { Service, Browser } from 'bonjour-service';

// Permission roles for family members
type PermissionRole = 'admin' | 'member' | 'viewer';

const SERVICE_TYPE = 'doftool-family';
const SERVICE_PORT = 45678;

/** Discovered family on the network */
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

/** Events emitted by FamilyDiscoveryService */
export interface FamilyDiscoveryEvents {
  'family-discovered': (family: DiscoveredFamily) => void;
  'family-lost': (familyId: string) => void;
  'join-request-received': (request: JoinRequest) => void;
  'join-request-approved': (approval: JoinApproval) => void;
  'join-request-rejected': (requestId: string) => void;
  error: (error: Error) => void;
}

export class FamilyDiscoveryService extends EventEmitter {
  private bonjour: Bonjour | null = null;
  private browser: Browser | null = null;
  private publishedService: Service | null = null;
  private discoveredFamilies: Map<string, DiscoveredFamily> = new Map();
  private pendingJoinRequests: Map<string, JoinRequest> = new Map();
  private isPublishing = false;
  private isDiscovering = false;
  private currentFamilyId: string | null = null;
  private deviceId: string | null = null;
  private deviceName: string;

  constructor() {
    super();
    this.deviceName = os.hostname();
  }

  /**
   * Initialize the discovery service
   */
  initialize(deviceId: string): void {
    this.deviceId = deviceId;
    this.bonjour = new Bonjour();
    console.log('[FamilyDiscovery] Service initialized');
  }

  /**
   * Start publishing family presence on the network (for admin devices)
   */
  startPublishing(familyId: string, familyName: string): void {
    if (this.isPublishing) {
      console.log('[FamilyDiscovery] Already publishing, stopping first...');
      this.stopPublishing();
    }

    if (!this.bonjour) {
      console.error('[FamilyDiscovery] Service not initialized');
      return;
    }

    this.currentFamilyId = familyId;

    try {
      this.publishedService = this.bonjour.publish({
        name: `${familyName}-${familyId.slice(0, 8)}`,
        type: SERVICE_TYPE,
        port: SERVICE_PORT,
        txt: {
          familyId,
          familyName,
          adminDeviceName: this.deviceName,
          deviceId: this.deviceId ?? '',
          version: '1',
        },
      });

      this.isPublishing = true;
      console.log(`[FamilyDiscovery] Publishing family: ${familyName} (${familyId.slice(0, 8)})`);
    } catch (error) {
      console.error('[FamilyDiscovery] Failed to publish service:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop publishing family presence
   */
  stopPublishing(): void {
    if (this.publishedService) {
      try {
        this.publishedService.stop?.();
      } catch (error) {
        console.warn('[FamilyDiscovery] Error stopping published service:', error);
      }
      this.publishedService = null;
    }
    this.isPublishing = false;
    console.log('[FamilyDiscovery] Stopped publishing');
  }

  /**
   * Start discovering families on the local network
   */
  startDiscovering(): void {
    if (this.isDiscovering) {
      console.log('[FamilyDiscovery] Already discovering');
      return;
    }

    if (!this.bonjour) {
      console.error('[FamilyDiscovery] Service not initialized');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      this.browser = this.bonjour.find({ type: SERVICE_TYPE });

      this.browser.on('up', (service: Service) => {
        this.handleServiceUp(service);
      });

      this.browser.on('down', (service: Service) => {
        this.handleServiceDown(service);
      });

      this.isDiscovering = true;
      console.log('[FamilyDiscovery] Started discovering families on local network');
    } catch (error) {
      console.error('[FamilyDiscovery] Failed to start discovery:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop discovering families
   */
  stopDiscovering(): void {
    if (this.browser) {
      try {
        this.browser.stop();
      } catch (error) {
        console.warn('[FamilyDiscovery] Error stopping browser:', error);
      }
      this.browser = null;
    }
    this.discoveredFamilies.clear();
    this.isDiscovering = false;
    console.log('[FamilyDiscovery] Stopped discovering');
  }

  /**
   * Handle service discovered on network
   */
  private handleServiceUp(service: Service): void {
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
    console.log(`[FamilyDiscovery] Family discovered: ${family.name} at ${family.host}`);
    this.emit('family-discovered', family);
  }

  /**
   * Handle service lost on network
   */
  private handleServiceDown(service: Service): void {
    const txt = service.txt as Record<string, string> | undefined;
    if (!txt?.familyId) {
      return;
    }

    if (this.discoveredFamilies.has(txt.familyId)) {
      this.discoveredFamilies.delete(txt.familyId);
      console.log(`[FamilyDiscovery] Family lost: ${txt.familyId}`);
      this.emit('family-lost', txt.familyId);
    }
  }

  /**
   * Get list of discovered families
   */
  getDiscoveredFamilies(): DiscoveredFamily[] {
    return Array.from(this.discoveredFamilies.values());
  }

  /**
   * Send a join request to a family admin
   * This creates a pending request that the admin will see
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
    console.log(`[FamilyDiscovery] Created join request for family ${familyId}: ${request.id}`);
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
    console.log(`[FamilyDiscovery] Received join request from ${deviceName} (${deviceId})`);
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
      syncToken: crypto.randomUUID(), // Token for initial sync
    };

    console.log(`[FamilyDiscovery] Approved join request ${requestId} with role ${role}`);
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
    console.log(`[FamilyDiscovery] Rejected join request ${requestId}`);
    this.emit('join-request-rejected', requestId);
    return true;
  }

  /**
   * Clear a processed join request
   */
  clearJoinRequest(requestId: string): void {
    this.pendingJoinRequests.delete(requestId);
  }

  /**
   * Check if currently publishing
   */
  isCurrentlyPublishing(): boolean {
    return this.isPublishing;
  }

  /**
   * Check if currently discovering
   */
  isCurrentlyDiscovering(): boolean {
    return this.isDiscovering;
  }

  /**
   * Destroy the service and clean up
   */
  destroy(): void {
    this.stopPublishing();
    this.stopDiscovering();

    if (this.bonjour) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        (this.bonjour as any).destroy();
      } catch (error) {
        console.warn('[FamilyDiscovery] Error destroying bonjour:', error);
      }
      this.bonjour = null;
    }

    this.discoveredFamilies.clear();
    this.pendingJoinRequests.clear();
    console.log('[FamilyDiscovery] Service destroyed');
  }
}
