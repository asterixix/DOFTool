/**
 * Debug Logger Utility
 *
 * This utility handles debug logging that can be enabled/disabled
 * and optionally send logs to a remote endpoint for debugging.
 */

const DEBUG_ENABLED = false; // Set to true to enable debug logging
const SERVER_ENDPOINT = 'http://127.0.0.1:7242/ingest/ae162013-1a77-436f-9b98-694a75035abc';

interface DebugLogData {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}

export function logToDebug(data: DebugLogData): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  try {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: data.location,
      message: data.message,
      data: data.data ?? {},
      sessionId: 'debug-session',
      runId: 'runtime',
      hypothesisId: data.hypothesisId ?? 'UNKNOWN',
    };

    // Send to server - catch CSP violations gracefully
    fetch(SERVER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {
      // Ignore fetch errors (including CSP violations)
    });
  } catch {
    // Ignore all errors (including CSP violations)
  }
}
