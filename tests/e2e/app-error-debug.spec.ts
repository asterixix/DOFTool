import { writeFileSync } from 'fs';
import { join } from 'path';

import { test, expect } from '@playwright/test';

const DEBUG_LOG_PATH = join(process.cwd(), '.cursor', 'debug.log');
const SERVER_ENDPOINT = 'http://127.0.0.1:7242/ingest/ae162013-1a77-436f-9b98-694a75035abc';

function logToDebug(data: {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}): void {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location: data.location,
    message: data.message,
    data: data.data ?? {},
    sessionId: 'debug-session',
    runId: 'playwright-run',
    hypothesisId: data.hypothesisId ?? 'UNKNOWN',
  };

  try {
    // Write to log file
    writeFileSync(DEBUG_LOG_PATH, JSON.stringify(logEntry) + '\n', { flag: 'a' });

    // Also send to server
    fetch(SERVER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {
      // Ignore fetch errors
    });
  } catch {
    // Ignore write errors
  }
}

test.describe('App Error Debugging', () => {
  test.beforeEach( () => {
    // Clear debug log before each test
    try {
      writeFileSync(DEBUG_LOG_PATH, '');
    } catch {
      // Ignore if file doesn't exist
    }
  });

  test('should load app without React Router errors', async ({ page }) => {
    // Mock window.electronAPI for browser environment
    await page.addInitScript(() => {
      (window as unknown as { electronAPI: unknown }).electronAPI = {
        getVersion: () => Promise.resolve('0.1.0'),
        getPlatform: () => Promise.resolve('win32'),
        encryption: {
          generateKey: () => Promise.resolve({ id: 'test', key: [] }),
          deriveKey: () => Promise.resolve({ id: 'test', key: [] }),
          generateSalt: () => Promise.resolve([]),
          encrypt: () => Promise.resolve({ ciphertext: [], nonce: [], keyId: 'test' }),
          decrypt: () => Promise.resolve([]),
          hash: () => Promise.resolve([]),
          hashString: () => Promise.resolve(''),
          generateToken: () => Promise.resolve(''),
        },
        yjs: {
          getDocumentState: () => Promise.resolve({ stateVector: [], update: [] }),
          applyUpdate: () => Promise.resolve(true),
          getMap: () => Promise.resolve({}),
          forceUnlock: () => Promise.resolve(true),
        },
        storage: {
          get: () => Promise.resolve(undefined),
          set: () => Promise.resolve(true),
          delete: () => Promise.resolve(true),
          getKeysByPrefix: () => Promise.resolve([]),
        },
        family: {
          get: () =>
            Promise.resolve({
              family: null,
              devices: [],
              permissions: [],
            }),
          create: () =>
            Promise.resolve({
              family: { id: 'test', name: 'Test', createdAt: Date.now(), adminDeviceId: 'test' },
              devices: [],
              permissions: [],
            }),
          invite: () => Promise.resolve({ token: 'test', role: 'member' }),
          join: () => Promise.resolve({ success: true }),
          devices: () => Promise.resolve([]),
          removeDevice: () => Promise.resolve([]),
          getPermissions: () => Promise.resolve([]),
          setPermission: () => Promise.resolve({ memberId: 'test', role: 'member', createdAt: Date.now() }),
        },
        calendar: {
          getAll: () => Promise.resolve([]),
          get: () => Promise.resolve(null),
          create: () =>
            Promise.resolve({
              id: 'test',
              familyId: 'test',
              name: 'Test',
              color: '#3b82f6',
              ownerId: 'test',
              visibility: 'family',
              defaultPermission: 'view',
              sharedWith: [],
              defaultReminders: [],
              timezone: 'UTC',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          update: () =>
            Promise.resolve({
              id: 'test',
              familyId: 'test',
              name: 'Test',
              color: '#3b82f6',
              ownerId: 'test',
              visibility: 'family',
              defaultPermission: 'view',
              sharedWith: [],
              defaultReminders: [],
              timezone: 'UTC',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          delete: () => Promise.resolve({ success: true }),
          getEvents: () => Promise.resolve([]),
          getEvent: () => Promise.resolve(null),
          createEvent: () =>
            Promise.resolve({
              id: 'test',
              calendarId: 'test',
              familyId: 'test',
              title: 'Test',
              start: Date.now(),
              end: Date.now(),
              allDay: false,
              status: 'confirmed',
              busyStatus: 'busy',
              attendees: [],
              reminders: [],
              createdBy: 'test',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          updateEvent: () =>
            Promise.resolve({
              id: 'test',
              calendarId: 'test',
              familyId: 'test',
              title: 'Test',
              start: Date.now(),
              end: Date.now(),
              allDay: false,
              status: 'confirmed',
              busyStatus: 'busy',
              attendees: [],
              reminders: [],
              createdBy: 'test',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          deleteEvent: () => Promise.resolve({ success: true }),
          importICal: () => Promise.resolve({ imported: 0, errors: [] }),
          exportICal: () => Promise.resolve(''),
          share: () => Promise.resolve({ memberId: 'test', permission: 'view', sharedAt: Date.now(), sharedBy: 'test' }),
          updateShare: () => Promise.resolve({ memberId: 'test', permission: 'view', sharedAt: Date.now(), sharedBy: 'test' }),
          unshare: () => Promise.resolve(true),
          getShares: () => Promise.resolve([]),
        },
        tasks: {
          getLists: () => Promise.resolve([]),
          createList: () => Promise.resolve({}),
          getTasks: () => Promise.resolve([]),
          createTask: () => Promise.resolve({}),
          updateTask: () => Promise.resolve({}),
          deleteTask: () => Promise.resolve(),
          import: () => Promise.resolve({ imported: 0 }),
          export: () => Promise.resolve(''),
        },
        email: {
          getAccounts: () => Promise.resolve([]),
          addAccount: () => Promise.resolve({}),
          removeAccount: () => Promise.resolve(),
          fetchMessages: () => Promise.resolve([]),
          sendMessage: () => Promise.resolve(),
        },
        sync: {
          getStatus: () => Promise.resolve({ status: 'connected', peers: 0 }),
          forceSync: () => Promise.resolve(),
          getPeers: () => Promise.resolve([]),
        },
        on: () => {},
        off: () => {},
      };
    });

    // Capture all console errors
    const consoleErrors: string[] = [];
    const reactErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      logToDebug({
        location: 'playwright:console',
        message: `Console ${type}: ${text}`,
        data: { type, text },
        hypothesisId: type === 'error' ? 'HYP_B' : 'INFO',
      });

      if (type === 'error') {
        consoleErrors.push(text);
      }

      // Check for React error patterns
      if (
        text.includes('Route.Provider') ||
        text.includes('The above error occurred') ||
        text.includes('Error:') ||
        text.includes('Uncaught')
      ) {
        reactErrors.push(text);
        logToDebug({
          location: 'playwright:react-error',
          message: 'React Router Error Detected',
          data: { error: text, stack: msg.location() },
          hypothesisId: 'HYP_A',
        });
      }
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      logToDebug({
        location: 'playwright:pageerror',
        message: 'Page Error',
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        hypothesisId: 'HYP_B',
      });
    });

    // Capture request failures
    page.on('requestfailed', (request) => {
      logToDebug({
        location: 'playwright:requestfailed',
        message: 'Request Failed',
        data: {
          url: request.url(),
          failure: request.failure()?.errorText,
        },
        hypothesisId: 'HYP_E',
      });
    });

    // Navigate to app
    logToDebug({
      location: 'playwright:test',
      message: 'Starting navigation to app',
      hypothesisId: 'INFO',
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    logToDebug({
      location: 'playwright:test',
      message: 'Page loaded, waiting for React to render',
      hypothesisId: 'INFO',
    });

    // Wait a bit for React to fully render
    await page.waitForTimeout(2000);

    // Check for React error overlay
    const errorOverlay = await page.locator('[data-react-error-overlay]').count();
    if (errorOverlay > 0) {
      const errorText = await page.locator('[data-react-error-overlay]').textContent();
      logToDebug({
        location: 'playwright:react-overlay',
        message: 'React Error Overlay Detected',
        data: { errorText },
        hypothesisId: 'HYP_A',
      });
    }

    // Check if ErrorBoundary caught an error
    const errorBoundary = page.locator('text=/Something went wrong/i');
    const hasErrorBoundary = await errorBoundary.count();
    if (hasErrorBoundary > 0) {
      const errorMessage = await page.locator('text=/Something went wrong/i').locator('..').textContent();
      const errorDetails = await page.locator('details').allTextContents();
      logToDebug({
        location: 'playwright:error-boundary',
        message: 'ErrorBoundary Caught Error',
        data: { errorMessage, errorDetails },
        hypothesisId: 'HYP_A',
      });
      reactErrors.push(`ErrorBoundary: ${errorMessage ?? 'Unknown error'}`);
    }

    // Check if router rendered
    const hasRouter = await page.locator('main, [data-router-outlet]').count();
    logToDebug({
      location: 'playwright:router-check',
      message: 'Router Render Check',
      data: { hasRouter: hasRouter > 0 },
      hypothesisId: 'HYP_D',
    });

    // Check if layout rendered
    const hasLayout = await page.locator('header, aside').count();
    logToDebug({
      location: 'playwright:layout-check',
      message: 'Layout Render Check',
      data: { hasLayout: hasLayout > 0 },
      hypothesisId: 'HYP_C',
    });

    // Get page HTML to see what actually rendered
    const pageContent = await page.content();
    logToDebug({
      location: 'playwright:page-content',
      message: 'Page Content',
      data: { contentLength: pageContent.length, hasApp: pageContent.includes('DOFTool') },
      hypothesisId: 'INFO',
    });

    // Log final state
    logToDebug({
      location: 'playwright:test',
      message: 'Test completed',
      data: {
        consoleErrorsCount: consoleErrors.length,
        reactErrorsCount: reactErrors.length,
        url: page.url(),
        title: await page.title(),
      },
      hypothesisId: 'INFO',
    });

    // Print summary
    console.log(`\n=== Error Summary ===`);
    console.log(`Console Errors: ${consoleErrors.length}`);
    console.log(`React Errors: ${reactErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      consoleErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }
    if (reactErrors.length > 0) {
      console.log('\nReact Errors:');
      reactErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    // The test should fail if there are React errors
    expect(reactErrors.length).toBe(0);
  });
});