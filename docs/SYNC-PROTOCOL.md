# DOFTool P2P Sync Protocol

This document specifies the peer-to-peer synchronization protocol for DOFTool, including device discovery, connection establishment, and CRDT-based data synchronization.

---

## Table of Contents

1. [Protocol Overview](#protocol-overview)
2. [Device Discovery (mDNS)](#device-discovery-mdns)
3. [Connection Establishment](#connection-establishment)
4. [Yjs Synchronization](#yjs-synchronization)
5. [Awareness Protocol](#awareness-protocol)
6. [Conflict Resolution](#conflict-resolution)
7. [Error Handling](#error-handling)
8. [Network Topology](#network-topology)

---

## Protocol Overview

FamilySync uses a fully decentralized P2P architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Sync Protocol Stack                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 5: Application                                                    │
│  ─────────────────────                                                  │
│  Calendar, Tasks, Email modules consume Yjs documents                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 4: CRDT Sync                                                      │
│  ───────────────────                                                    │
│  Yjs documents with automatic conflict resolution                       │
│  State vectors, update encoding, garbage collection                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 3: Encryption                                                     │
│  ───────────────────                                                    │
│  Application-level E2EE (XChaCha20-Poly1305)                            │
│  All Yjs updates encrypted before transmission                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 2: Transport                                                      │
│  ─────────────────                                                      │
│  WebRTC Data Channels (SCTP over DTLS)                                  │
│  Reliable, ordered message delivery                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│  Layer 1: Discovery                                                      │
│  ───────────────────                                                    │
│  mDNS (Multicast DNS) for local network discovery                       │
│  Service type: _familysync._tcp                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Characteristics

| Aspect         | Implementation              |
| -------------- | --------------------------- |
| **Discovery**  | mDNS on local network       |
| **Transport**  | WebRTC Data Channels        |
| **Encryption** | DTLS 1.3 + Application E2EE |
| **Data Sync**  | Yjs CRDTs                   |
| **Topology**   | Full mesh (small families)  |

---

## Device Discovery (mDNS)

### Service Advertisement

Each FamilySync device advertises itself via mDNS:

```typescript
// Service configuration
const SERVICE_CONFIG = {
  name: `FamilySync-${deviceId.slice(0, 8)}`,
  type: '_familysync._tcp',
  port: 0, // Dynamic port assignment
  txt: {
    // Family ID hash (not full ID for privacy)
    fid: blake2b(familyId).slice(0, 16).toString('hex'),
    // Device ID
    did: deviceId,
    // Device public key (for verification)
    pk: base64(devicePublicKey),
    // Protocol version
    pv: '1',
    // App version
    av: appVersion,
  },
};
```

### Discovery Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    mDNS Discovery Flow                                   │
└─────────────────────────────────────────────────────────────────────────┘

  Device A                    Network                     Device B
  ────────                    ───────                     ────────
      │                          │                            │
      │  1. Advertise service    │                            │
      ├─────────────────────────▶│                            │
      │  mDNS: _familysync._tcp  │                            │
      │                          │                            │
      │                          │  2. Advertise service      │
      │                          │◀────────────────────────────┤
      │                          │  mDNS: _familysync._tcp    │
      │                          │                            │
      │  3. Query for services   │                            │
      ├─────────────────────────▶│                            │
      │  PTR _familysync._tcp    │                            │
      │                          │                            │
      │◀─────────────────────────┤                            │
      │  4. Response: Device B   │                            │
      │  SRV + TXT records       │                            │
      │                          │                            │
      │  5. Check family match   │                            │
      │  Compare fid hash        │                            │
      │                          │                            │
      │  6. If match, initiate   │                            │
      │     WebRTC connection    │                            │
      ├──────────────────────────────────────────────────────▶│
      │                          │                            │
      ▼                          ▼                            ▼
```

### Discovery Implementation

```typescript
// electron/services/discovery.service.ts

import { Bonjour, Service } from 'bonjour-service';

class DiscoveryService {
  private bonjour: Bonjour;
  private advertisement: Service | null = null;
  private browser: Browser | null = null;
  private familyIdHash: string;

  constructor(
    private deviceId: string,
    private devicePublicKey: Uint8Array,
    private familyId: string,
    private onPeerDiscovered: (peer: DiscoveredPeer) => void
  ) {
    this.bonjour = new Bonjour();
    this.familyIdHash = this.hashFamilyId(familyId);
  }

  private hashFamilyId(familyId: string): string {
    const hash = sodium.crypto_generichash(16, familyId);
    return sodium.to_hex(hash);
  }

  async startAdvertising(port: number): Promise<void> {
    this.advertisement = this.bonjour.publish({
      name: `FamilySync-${this.deviceId.slice(0, 8)}`,
      type: 'familysync',
      port,
      txt: {
        fid: this.familyIdHash,
        did: this.deviceId,
        pk: sodium.to_base64(this.devicePublicKey),
        pv: '1',
      },
    });
  }

  async startBrowsing(): Promise<void> {
    this.browser = this.bonjour.find({ type: 'familysync' });

    this.browser.on('up', (service) => {
      // Check if same family
      if (service.txt?.fid === this.familyIdHash) {
        // Don't connect to self
        if (service.txt?.did !== this.deviceId) {
          this.onPeerDiscovered({
            deviceId: service.txt.did,
            publicKey: sodium.from_base64(service.txt.pk),
            host: service.host,
            port: service.port,
            protocolVersion: service.txt.pv,
          });
        }
      }
    });

    this.browser.on('down', (service) => {
      // Handle peer going offline
      this.onPeerOffline(service.txt?.did);
    });
  }

  async stop(): Promise<void> {
    this.advertisement?.stop();
    this.browser?.stop();
    this.bonjour.destroy();
  }
}
```

---

## Connection Establishment

### WebRTC Signaling via mDNS

FamilySync uses a custom signaling mechanism over mDNS TXT records:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    WebRTC Connection Flow                                │
└─────────────────────────────────────────────────────────────────────────┘

  Device A (Initiator)                              Device B (Responder)
  ────────────────────                              ────────────────────
         │                                                    │
         │  1. Create RTCPeerConnection                       │
         │  2. Create Data Channel                            │
         │  3. Create SDP Offer                               │
         │                                                    │
         ├───────────────────────────────────────────────────▶│
         │  4. Send offer via direct TCP                      │
         │     (IP:port from mDNS)                            │
         │                                                    │
         │                               5. Set remote description
         │                               6. Create SDP Answer
         │                                                    │
         │◀───────────────────────────────────────────────────┤
         │  7. Send answer via TCP                            │
         │                                                    │
         │  8. Set remote description                         │
         │                                                    │
         │◀═══════════════════════════════════════════════════▶
         │  9. ICE candidates exchanged                       │
         │                                                    │
         │══════════════════════════════════════════════════════
         │  10. DTLS handshake                                │
         │                                                    │
         │══════════════════════════════════════════════════════
         │  11. Data channel open                             │
         │                                                    │
         │  12. Device authentication                         │
         ├───────────────────────────────────────────────────▶│
         │  AUTH_REQUEST: signature(deviceId + timestamp)     │
         │                                                    │
         │◀───────────────────────────────────────────────────┤
         │  AUTH_RESPONSE: signature(deviceId + timestamp)    │
         │                                                    │
         │  13. Verify signatures                             │
         │  14. Begin Yjs sync                                │
         │                                                    │
         ▼                                                    ▼
```

### Signaling Server (TCP)

Each device runs a small TCP server for WebRTC signaling:

```typescript
// electron/services/signaling.service.ts

import { createServer, Socket } from 'net';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  signature: string;
}

class SignalingService {
  private server: Server;
  private connections: Map<string, Socket> = new Map();

  async start(): Promise<number> {
    return new Promise((resolve) => {
      this.server = createServer((socket) => {
        this.handleConnection(socket);
      });

      // Dynamic port assignment
      this.server.listen(0, () => {
        const address = this.server.address() as AddressInfo;
        resolve(address.port);
      });
    });
  }

  private handleConnection(socket: Socket): void {
    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      // Parse newline-delimited JSON
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          const message = JSON.parse(line) as SignalingMessage;
          this.handleMessage(message, socket);
        }
      }
    });
  }

  private async handleMessage(message: SignalingMessage, socket: Socket): Promise<void> {
    // Verify signature
    const valid = await this.verifySignature(message);
    if (!valid) {
      socket.write(JSON.stringify({ error: 'Invalid signature' }) + '\n');
      return;
    }

    // Emit for WebRTC handling
    this.emit('signaling-message', message, socket);
  }

  async sendTo(deviceId: string, message: SignalingMessage): Promise<void> {
    const socket = this.connections.get(deviceId);
    if (socket) {
      socket.write(JSON.stringify(message) + '\n');
    }
  }
}
```

### Peer Connection Manager

```typescript
// electron/services/peer.service.ts

class PeerConnectionManager {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  async connectToPeer(peer: DiscoveredPeer): Promise<RTCDataChannel> {
    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [], // No TURN servers needed for local network
    });

    // Create data channel
    const channel = pc.createDataChannel('familysync', {
      ordered: true,
      maxRetransmits: 10,
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendTo(peer.deviceId, {
          type: 'ice-candidate',
          from: this.deviceId,
          to: peer.deviceId,
          payload: event.candidate,
          signature: this.sign(event.candidate),
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this.signaling.sendTo(peer.deviceId, {
      type: 'offer',
      from: this.deviceId,
      to: peer.deviceId,
      payload: offer,
      signature: this.sign(offer),
    });

    // Wait for channel to open
    return new Promise((resolve, reject) => {
      channel.onopen = () => {
        this.authenticatePeer(channel, peer)
          .then(() => resolve(channel))
          .catch(reject);
      };
      channel.onerror = reject;
    });
  }

  private async authenticatePeer(channel: RTCDataChannel, peer: DiscoveredPeer): Promise<void> {
    // Send authentication request
    const timestamp = Date.now();
    const message = `${this.deviceId}:${timestamp}`;
    const signature = sodium.crypto_sign_detached(
      new TextEncoder().encode(message),
      this.signingKey
    );

    channel.send(
      JSON.stringify({
        type: 'AUTH_REQUEST',
        deviceId: this.deviceId,
        timestamp,
        signature: sodium.to_base64(signature),
      })
    );

    // Wait for response and verify
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Auth timeout')), 10000);

      channel.onmessage = (event) => {
        clearTimeout(timeout);
        const response = JSON.parse(event.data);

        if (response.type === 'AUTH_RESPONSE') {
          const valid = this.verifyPeerAuth(response, peer.publicKey);
          if (valid) {
            resolve();
          } else {
            reject(new Error('Authentication failed'));
          }
        }
      };
    });
  }
}
```

---

## Yjs Synchronization

### Document Structure

```typescript
// src/shared/lib/yjs/sync.ts

import * as Y from 'yjs';
import { LeveldbPersistence } from 'y-leveldb';

class YjsSyncManager {
  private ydoc: Y.Doc;
  private persistence: LeveldbPersistence;
  private peers: Map<string, RTCDataChannel> = new Map();

  constructor(
    private familyId: string,
    private encryptionKey: Uint8Array
  ) {
    this.ydoc = new Y.Doc();
    this.persistence = new LeveldbPersistence('./data/yjs');

    // Bind persistence
    this.persistence.bindState(familyId, this.ydoc);

    // Listen for local changes
    this.ydoc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        this.broadcastUpdate(update);
      }
    });
  }

  addPeer(deviceId: string, channel: RTCDataChannel): void {
    this.peers.set(deviceId, channel);

    channel.onmessage = (event) => {
      this.handlePeerMessage(deviceId, event.data);
    };

    // Send current state vector
    this.sendSyncStep1(channel);
  }

  private async sendSyncStep1(channel: RTCDataChannel): Promise<void> {
    // Step 1: Send state vector
    const stateVector = Y.encodeStateVector(this.ydoc);
    const encrypted = await this.encrypt(stateVector);

    channel.send(
      JSON.stringify({
        type: 'SYNC_STEP_1',
        payload: sodium.to_base64(encrypted),
      })
    );
  }

  private async handlePeerMessage(deviceId: string, data: string): Promise<void> {
    const message = JSON.parse(data);
    const payload = await this.decrypt(sodium.from_base64(message.payload));

    switch (message.type) {
      case 'SYNC_STEP_1':
        // Received state vector, send missing updates
        const remoteStateVector = payload;
        const missingUpdates = Y.encodeStateAsUpdate(this.ydoc, remoteStateVector);

        const encrypted = await this.encrypt(missingUpdates);
        const channel = this.peers.get(deviceId);
        channel?.send(
          JSON.stringify({
            type: 'SYNC_STEP_2',
            payload: sodium.to_base64(encrypted),
          })
        );
        break;

      case 'SYNC_STEP_2':
        // Received missing updates, apply them
        Y.applyUpdate(this.ydoc, payload, 'remote');
        break;

      case 'UPDATE':
        // Incremental update
        Y.applyUpdate(this.ydoc, payload, 'remote');
        break;
    }
  }

  private async broadcastUpdate(update: Uint8Array): Promise<void> {
    const encrypted = await this.encrypt(update);
    const message = JSON.stringify({
      type: 'UPDATE',
      payload: sodium.to_base64(encrypted),
    });

    for (const channel of this.peers.values()) {
      if (channel.readyState === 'open') {
        channel.send(message);
      }
    }
  }

  private async encrypt(data: Uint8Array): Promise<Uint8Array> {
    const nonce = sodium.randombytes_buf(24);
    const ciphertext = sodium.crypto_secretbox_easy(data, nonce, this.encryptionKey);
    return new Uint8Array([...nonce, ...ciphertext]);
  }

  private async decrypt(data: Uint8Array): Promise<Uint8Array> {
    const nonce = data.slice(0, 24);
    const ciphertext = data.slice(24);
    return sodium.crypto_secretbox_open_easy(ciphertext, nonce, this.encryptionKey);
  }
}
```

### Sync Protocol Messages

| Message Type  | Direction             | Description                |
| ------------- | --------------------- | -------------------------- |
| `SYNC_STEP_1` | Initiator → Responder | State vector (what I have) |
| `SYNC_STEP_2` | Responder → Initiator | Missing updates            |
| `UPDATE`      | Bidirectional         | Incremental CRDT update    |
| `AWARENESS`   | Bidirectional         | Presence information       |

### Sync Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Yjs Sync Protocol                                     │
└─────────────────────────────────────────────────────────────────────────┘

  Device A                                              Device B
  (has updates 1-100)                                   (has updates 1-80)
  ─────────────────                                     ─────────────────
         │                                                     │
         │  1. Connection established                          │
         │                                                     │
         ├────────────────────────────────────────────────────▶│
         │  SYNC_STEP_1: stateVector(1-100)                    │
         │                                                     │
         │                               2. Calculate diff:
         │                                  I'm missing 81-100
         │                                                     │
         │◀────────────────────────────────────────────────────┤
         │  SYNC_STEP_2: updates(81-100)                       │
         │                                                     │
         │  3. Apply updates 81-100                            │
         │                                                     │
         │◀────────────────────────────────────────────────────┤
         │  SYNC_STEP_1: stateVector(1-80)                     │
         │                                                     │
         │  4. Calculate diff:                                 │
         │     B is missing 81-100                             │
         │                                                     │
         ├────────────────────────────────────────────────────▶│
         │  SYNC_STEP_2: updates(81-100)                       │
         │                                                     │
         │                               5. Apply updates
         │                                                     │
         │═══════════════════════════════════════════════════════
         │  6. Both devices now synced                         │
         │     Continuous UPDATE messages for new changes      │
         │                                                     │
         ▼                                                     ▼
```

---

## Awareness Protocol

Awareness provides real-time presence information:

```typescript
// src/shared/lib/yjs/awareness.ts

import { Awareness } from 'y-protocols/awareness';

interface AwarenessState {
  // User info
  userId: string;
  userName: string;
  userColor: string;

  // Device info
  deviceId: string;
  deviceName: string;

  // Current state
  currentView: 'calendar' | 'tasks' | 'email' | 'settings';
  currentItemId?: string; // e.g., event being edited

  // Cursor position (for collaborative editing)
  cursor?: {
    itemId: string;
    position: number;
  };

  // Online status
  lastSeen: number;
}

class AwarenessManager {
  private awareness: Awareness;

  constructor(ydoc: Y.Doc) {
    this.awareness = new Awareness(ydoc);

    // Update local state
    this.awareness.setLocalStateField('user', {
      userId: currentUser.id,
      userName: currentUser.displayName,
      userColor: currentUser.color,
    });

    // Listen for remote state changes
    this.awareness.on('change', (changes) => {
      this.handleAwarenessChange(changes);
    });
  }

  setCurrentView(view: string, itemId?: string): void {
    this.awareness.setLocalStateField('currentView', view);
    this.awareness.setLocalStateField('currentItemId', itemId);
  }

  setCursor(itemId: string, position: number): void {
    this.awareness.setLocalStateField('cursor', { itemId, position });
  }

  getOnlineUsers(): AwarenessState[] {
    return Array.from(this.awareness.getStates().values()).filter(
      (state) => Date.now() - state.lastSeen < 30000
    );
  }

  getUsersEditingItem(itemId: string): AwarenessState[] {
    return this.getOnlineUsers().filter((state) => state.currentItemId === itemId);
  }
}
```

### Awareness Sync

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Awareness Protocol                                    │
└─────────────────────────────────────────────────────────────────────────┘

  Device A                                              Device B
  ─────────                                             ─────────
       │                                                     │
       │  1. User navigates to calendar                      │
       │                                                     │
       ├────────────────────────────────────────────────────▶│
       │  AWARENESS: { currentView: 'calendar' }             │
       │                                                     │
       │                               2. Update UI to show
       │                                  "User A viewing calendar"
       │                                                     │
       │  3. User starts editing event                       │
       │                                                     │
       ├────────────────────────────────────────────────────▶│
       │  AWARENESS: { currentItemId: 'event-123' }          │
       │                                                     │
       │                               4. Show indicator on
       │                                  event-123
       │                                                     │
       ▼                                                     ▼
```

---

## Conflict Resolution

### CRDT Guarantees

Yjs CRDTs provide **automatic conflict resolution**:

| Conflict Type      | Resolution Strategy                  |
| ------------------ | ------------------------------------ |
| Concurrent inserts | Unique IDs + lamport timestamps      |
| Concurrent deletes | Tombstones preserved                 |
| Text editing       | Position-based merge (Yjs algorithm) |
| Map updates        | Last-writer-wins per key             |
| Array operations   | Order preserved via unique IDs       |

### Example: Concurrent Event Edits

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Concurrent Edit Resolution                            │
└─────────────────────────────────────────────────────────────────────────┘

  Device A (offline)                              Device B (offline)
  ──────────────────                              ──────────────────
       │                                                │
       │  Event: "Family Dinner"                        │
       │  Time: 6:00 PM                                 │
       │                                                │
       │  Edit: Change time to 7:00 PM                  │
       │  (Clock: 1704067200)                           │
       │                                                │
       │                                   Edit: Change title to
       │                                   "Pizza Night"
       │                                   (Clock: 1704067205)
       │                                                │
       │══════════════════════════════════════════════════
       │              Devices reconnect                 │
       │══════════════════════════════════════════════════
       │                                                │
       │  Sync Step 1 + 2                               │
       │◀──────────────────────────────────────────────▶│
       │                                                │
       │  CRDT merge result:                            │
       │  - Title: "Pizza Night" (B's edit)             │
       │  - Time: 7:00 PM (A's edit)                    │
       │  Both changes preserved!                       │
       │                                                │
       ▼                                                ▼
```

### Handling Semantic Conflicts

While CRDTs handle structural conflicts, some semantic conflicts need UI:

```typescript
// Example: Two users accept conflicting meeting times
interface ConflictIndicator {
  itemId: string;
  type: 'scheduling' | 'assignment' | 'status';
  description: string;
  involvedMembers: string[];
  detectedAt: string;
  resolved: boolean;
}

// The app can show warnings for detected semantic conflicts
function detectSchedulingConflicts(events: CalendarEvent[]): ConflictIndicator[] {
  const conflicts: ConflictIndicator[] = [];

  // Check for overlapping events with same attendees
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (eventsOverlap(events[i], events[j]) && shareAttendees(events[i], events[j])) {
        conflicts.push({
          itemId: events[i].id,
          type: 'scheduling',
          description: `"${events[i].title}" conflicts with "${events[j].title}"`,
          involvedMembers: getSharedAttendees(events[i], events[j]),
          detectedAt: new Date().toISOString(),
          resolved: false,
        });
      }
    }
  }

  return conflicts;
}
```

---

## Error Handling

### Connection Errors

```typescript
// electron/services/peer.service.ts

enum ConnectionError {
  DISCOVERY_FAILED = 'DISCOVERY_FAILED',
  SIGNALING_FAILED = 'SIGNALING_FAILED',
  WEBRTC_FAILED = 'WEBRTC_FAILED',
  AUTH_FAILED = 'AUTH_FAILED',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
}

class ConnectionErrorHandler {
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 5;
  private baseDelay = 1000;

  async handleError(peerId: string, error: ConnectionError): Promise<void> {
    const attempts = this.retryAttempts.get(peerId) || 0;

    if (attempts >= this.maxRetries) {
      this.emit('peer-unreachable', peerId);
      return;
    }

    // Exponential backoff
    const delay = this.baseDelay * Math.pow(2, attempts);
    this.retryAttempts.set(peerId, attempts + 1);

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Retry connection
    this.emit('retry-connection', peerId);
  }

  resetAttempts(peerId: string): void {
    this.retryAttempts.delete(peerId);
  }
}
```

### Sync Errors

```typescript
// Handle corrupted updates
async function handleSyncError(error: Error, update: Uint8Array, peerId: string): Promise<void> {
  if (error.message.includes('Invalid update')) {
    // Request full state sync from peer
    requestFullSync(peerId);
  } else if (error.message.includes('Decryption failed')) {
    // Key mismatch - re-authenticate
    reauthenticatePeer(peerId);
  } else {
    // Unknown error - log and notify
    console.error('Sync error:', error);
    notifyUser('Sync error occurred. Retrying...');
  }
}
```

---

## Network Topology

### Full Mesh (Default)

For small families (< 10 devices), full mesh provides best latency:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Full Mesh Topology                                    │
└─────────────────────────────────────────────────────────────────────────┘

                           Device A
                          /    |    \
                         /     |     \
                        /      |      \
                  Device B────────────Device C
                        \      |      /
                         \     |     /
                          \    |    /
                           Device D

  - Every device connected to every other device
  - Updates propagate in O(1) hops
  - N*(N-1)/2 connections for N devices
```

### Star Topology (Optional)

For larger families or unreliable networks, star topology reduces connections:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Star Topology                                         │
└─────────────────────────────────────────────────────────────────────────┘

                    Device B     Device C
                         \       /
                          \     /
                           \   /
                         Device A
                         (Hub/Admin)
                           /   \
                          /     \
                         /       \
                    Device D     Device E

  - Admin device acts as hub
  - N-1 connections for N devices
  - Updates propagate in O(2) hops max
  - Hub failure = network partition
```

### Topology Selection

```typescript
// Auto-select topology based on family size
function selectTopology(deviceCount: number): 'mesh' | 'star' {
  // Full mesh for small families
  if (deviceCount <= 6) {
    return 'mesh';
  }

  // Star for larger families (admin as hub)
  return 'star';
}
```

---

## Protocol Version Compatibility

```typescript
const PROTOCOL_VERSION = 1;

interface VersionCheck {
  minSupported: number;
  current: number;
}

function checkCompatibility(
  localVersion: number,
  remoteVersion: number
): 'compatible' | 'upgrade-needed' | 'incompatible' {
  if (localVersion === remoteVersion) {
    return 'compatible';
  }

  // Backward compatible within major version
  if (Math.floor(localVersion) === Math.floor(remoteVersion)) {
    return 'compatible';
  }

  // Major version mismatch
  if (localVersion < remoteVersion) {
    return 'upgrade-needed';
  }

  return 'incompatible';
}
```
