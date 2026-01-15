# DOFTool Performance Optimization Guide

This document describes the performance optimizations implemented in DOFTool, particularly focused on the P2P sync module which was identified as blocking normal app usage.

## Overview

DOFTool uses Yjs CRDTs for conflict-free data synchronization between family devices. The sync module coordinates mDNS discovery, WebRTC signaling, peer connections, and document synchronization. Without optimization, these operations can block the main thread and cause UI freezes.

## Key Optimizations Implemented

### 1. Debounced Document Updates

**Problem**: Every keystroke triggers a Yjs document update, which would immediately broadcast to all peers, causing excessive network traffic and CPU usage.

**Solution**: Updates are collected and debounced before broadcasting.

```typescript
// Updates are queued and merged after 50ms of inactivity
const SYNC_CONFIG = {
  UPDATE_DEBOUNCE_MS: 50,
  MAX_BATCH_SIZE: 20,
  MAX_BATCH_WAIT_MS: 100,
};
```

**Benefits**:
- Multiple rapid updates are merged into a single broadcast
- Reduced network traffic
- Lower CPU usage during typing

### 2. Throttled Awareness Updates

**Problem**: Awareness protocol (presence, cursor position) fires frequently, flooding the network.

**Solution**: Awareness broadcasts are throttled to maximum once per 100ms.

```typescript
AWARENESS_THROTTLE_MS: 100
```

### 3. Non-Blocking Yjs Operations

**Problem**: `Y.encodeStateVector()`, `Y.encodeStateAsUpdate()`, and `Y.applyUpdate()` are synchronous operations that block the main thread.

**Solution**: Heavy Yjs operations are deferred to the next tick using `setImmediate()` or `deferToNextTick()`.

```typescript
// Before (blocking)
const missingUpdates = Y.encodeStateAsUpdate(ydoc, stateVector);

// After (non-blocking)
void deferToNextTick(() => {
  const missingUpdates = Y.encodeStateAsUpdate(ydoc, stateVector);
  this.sendSyncMessage(deviceId, 'SYNC_STEP_2', missingUpdates);
});
```

### 4. Chunked Peer Broadcasting

**Problem**: Broadcasting to many peers in a loop blocks the thread.

**Solution**: Peers are processed in chunks of 5, with `setImmediate()` between chunks.

```typescript
const CHUNK_SIZE = 5;
const sendChunk = (startIndex: number): void => {
  const endIndex = Math.min(startIndex + CHUNK_SIZE, peers.length);
  // Process chunk...
  if (endIndex < peers.length) {
    setImmediate(() => sendChunk(endIndex));
  }
};
```

### 5. Throttled Status Updates

**Problem**: Rapid sync status changes flood the renderer with IPC messages.

**Solution**: Status updates are throttled to maximum once per 100ms.

```typescript
const STATUS_UPDATE_THROTTLE_MS = 100;
const PEER_COUNT_DEBOUNCE_MS = 200;
```

### 6. Non-Blocking Sync Initialization

**Problem**: Sync service initialization blocks app startup.

**Solution**: Sync initialization runs asynchronously after the main window is ready.

```typescript
function initializeSyncServiceAsync(): void {
  setImmediate(() => {
    void initializeSyncServiceCore();
  });
}
```

## Performance Utilities

The `SyncPerformance.ts` module provides reusable utilities:

### Debounce
```typescript
import { debounce } from './SyncPerformance';

const debouncedFn = debounce(fn, 100, { leading: false, trailing: true });
debouncedFn(); // Calls after 100ms of inactivity
debouncedFn.cancel(); // Cancel pending call
debouncedFn.flush(); // Execute immediately
```

### Throttle
```typescript
import { throttle } from './SyncPerformance';

const throttledFn = throttle(fn, 100, { leading: true, trailing: true });
throttledFn(); // Calls at most once per 100ms
throttledFn.cancel();
```

### BatchProcessor
```typescript
import { BatchProcessor } from './SyncPerformance';

const batch = new BatchProcessor<Update>(
  (updates) => processBatch(updates),
  { maxBatchSize: 50, maxWaitMs: 100 }
);
batch.add(update); // Queued
batch.flush(); // Process immediately
```

### AsyncQueue
```typescript
import { AsyncQueue } from './SyncPerformance';

const queue = new AsyncQueue(2); // Max 2 concurrent
await queue.add(async () => { /* ... */ });
```

### RateLimiter
```typescript
import { RateLimiter } from './SyncPerformance';

const limiter = new RateLimiter(10, 5); // 10 tokens, 5/sec refill
if (limiter.tryAcquire()) { /* proceed */ }
```

### Performance Metrics
```typescript
import { syncMetrics } from './SyncPerformance';

// Measure sync operations
syncMetrics.measure('encodeUpdate', () => Y.encodeStateAsUpdate(doc));

// Get statistics
console.log(syncMetrics.getAllStats());
// { encodeUpdate: { count: 100, avgMs: 2.5, maxMs: 15 } }
```

## Best Practices

### 1. Avoid Synchronous Operations in Event Handlers

```typescript
// Bad - blocks event loop
ydoc.on('update', (update) => {
  Y.applyUpdate(otherDoc, update);
});

// Good - defers to next tick
ydoc.on('update', (update) => {
  setImmediate(() => Y.applyUpdate(otherDoc, update));
});
```

### 2. Batch Network Operations

```typescript
// Bad - sends immediately on every change
onChange((data) => sendToServer(data));

// Good - batches changes
const batch = new BatchProcessor(sendBatch, { maxWaitMs: 100 });
onChange((data) => batch.add(data));
```

### 3. Use Throttling for UI Updates

```typescript
// Bad - updates on every event
onSyncStatus((status) => updateUI(status));

// Good - throttles UI updates
const throttledUpdate = throttle(updateUI, 100);
onSyncStatus((status) => throttledUpdate(status));
```

### 4. Check Window State Before IPC

```typescript
// Bad - may crash if window is destroyed
mainWindow.webContents.send('update', data);

// Good - checks window state
if (mainWindow && !mainWindow.isDestroyed()) {
  mainWindow.webContents.send('update', data);
}
```

## Monitoring Performance

Use the built-in metrics collector to identify bottlenecks:

```typescript
import { syncMetrics } from './services/sync';

// Enable in development
if (isDev) {
  setInterval(() => {
    const stats = syncMetrics.getAllStats();
    if (Object.keys(stats).length > 0) {
      console.table(stats);
    }
  }, 30000);
}
```

## Configuration

Performance tuning constants are defined in:

- `electron/services/sync/YjsSyncProvider.ts` - `SYNC_CONFIG`
- `electron/services/sync/SyncService.ts` - Throttle intervals

Adjust these values based on your use case:
- Lower debounce values = more responsive but higher CPU/network
- Higher debounce values = more efficient but slightly delayed sync

## Troubleshooting

### App Freezes During Sync

1. Check if sync is happening with large documents
2. Increase `UPDATE_DEBOUNCE_MS` to reduce frequency
3. Enable metrics to find slow operations

### High CPU Usage

1. Check awareness update frequency
2. Increase `AWARENESS_THROTTLE_MS`
3. Reduce sync frequency in settings

### Memory Leaks

1. Ensure event listeners are properly cleaned up
2. Use singleton pattern for IPC listeners (see `useSync.ts`)
3. Call `destroy()` on services when done
