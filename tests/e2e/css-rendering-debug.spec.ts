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
    runId: 'css-debug-run',
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

test.describe('CSS Rendering Debug', () => {
  test.beforeEach(() => {
    // Clear debug log before each test
    try {
      writeFileSync(DEBUG_LOG_PATH, '');
    } catch {
      // Ignore if file doesn't exist
    }
  });

  test('should render CSS properly', async ({ page }) => {
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

    // Capture CSS-related errors
    const cssErrors: string[] = [];
    const fontErrors: string[] = [];
    const stylesheetFailures: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error' && (text.includes('stylesheet') || text.includes('font') || text.includes('CSS'))) {
        cssErrors.push(text);
        logToDebug({
          location: 'playwright:css-error',
          message: 'CSS/Font Loading Error',
          data: { type, text },
          hypothesisId: text.includes('font') ? 'HYP_B' : 'HYP_A',
        });
      }

      if (text.includes('fonts.googleapis.com') || text.includes('fonts.gstatic.com')) {
        fontErrors.push(text);
        logToDebug({
          location: 'playwright:font-error',
          message: 'Font Loading Error',
          data: { type, text },
          hypothesisId: 'HYP_B',
        });
      }
    });

    // Capture failed requests (CSS, fonts, stylesheets)
    page.on('requestfailed', (request) => {
      const url = request.url();
      if (url.includes('.css') || url.includes('font') || url.includes('stylesheet')) {
        stylesheetFailures.push(url);
        logToDebug({
          location: 'playwright:stylesheet-failed',
          message: 'Stylesheet/Font Request Failed',
          data: {
            url,
            failure: request.failure()?.errorText,
            resourceType: request.resourceType(),
          },
          hypothesisId: url.includes('font') ? 'HYP_B' : 'HYP_A',
        });
      }
    });

    // Navigate to app
    logToDebug({
      location: 'playwright:css-test',
      message: 'Starting CSS rendering test',
      hypothesisId: 'INFO',
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for React to render
    await page.waitForTimeout(2000);

    // Check if globals.css is loaded (Vite may inline CSS in dev mode)
    const globalCssLoaded = await page.evaluate(() => {
      // Check for stylesheet files
      const styles = Array.from(document.styleSheets);
      const hasStylesheet = styles.some((sheet) => {
        try {
          return (sheet.href?.includes('globals.css') ?? false) || (sheet.href?.includes('index.css') ?? false) || (sheet.href?.includes('main.css') ?? false);
        } catch {
          return false;
        }
      });

      // Check for inline styles (Vite inlines CSS in dev)
      const hasInlineStyles = styles.some((sheet) => {
        try {
          return sheet.href === null || sheet.href === '';
        } catch {
          return false;
        }
      });

      // Check if CSS variables are defined (from globals.css)
      const rootStyles = window.getComputedStyle(document.documentElement);
      const hasCssVars = rootStyles.getPropertyValue('--background') !== '';

      return hasStylesheet || (hasInlineStyles && hasCssVars);
    });

    logToDebug({
      location: 'playwright:css-test',
      message: 'Global CSS Load Check',
      data: { globalCssLoaded },
      hypothesisId: 'HYP_A',
    });

    // Check if Tailwind classes are being applied (check computed styles, not class attributes)
    const bodyElement = page.locator('body');
    const bodyClasses = await bodyElement.getAttribute('class');
    const bodyComputedStyles = await bodyElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
      };
    });
    
    // Check if CSS variables are defined (proves Tailwind CSS is loaded)
    const cssVarsLoaded = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = window.getComputedStyle(root);
      return {
        hasBackgroundVar: styles.getPropertyValue('--background') !== '',
        hasForegroundVar: styles.getPropertyValue('--foreground') !== '',
        hasPrimaryVar: styles.getPropertyValue('--primary') !== '',
      };
    });

    // Check if Tailwind utility classes work by checking an element that should have them
    const hasTailwindWorking = bodyComputedStyles.fontFamily.includes('Inter') || bodyComputedStyles.fontFamily.includes('system');

    logToDebug({
      location: 'playwright:css-test',
      message: 'Tailwind Classes Check',
      data: { 
        bodyClasses, 
        bodyComputedStyles,
        cssVarsLoaded,
        hasTailwindWorking 
      },
      hypothesisId: 'HYP_C',
    });

    // Check computed styles on body
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
      };
    });

    logToDebug({
      location: 'playwright:css-test',
      message: 'Body Computed Styles',
      data: { bodyStyles },
      hypothesisId: 'HYP_C',
    });

    // Check if specific CSS classes are applied
    const sidebar = page.locator('aside').first();
    const sidebarExists = await sidebar.count();
    if (sidebarExists > 0) {
      const sidebarStyles = await sidebar.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          backgroundColor: styles.backgroundColor,
          borderRight: styles.borderRight,
        };
      });
      logToDebug({
        location: 'playwright:css-test',
        message: 'Sidebar Styles Check',
        data: { sidebarStyles },
        hypothesisId: 'HYP_C',
      });
    }

    // Check for CSP violations related to styles
    const cspViolations = cssErrors.filter((err) =>
      err.includes('Content Security Policy') && (err.includes('style') || err.includes('font'))
    );

    logToDebug({
      location: 'playwright:css-test',
      message: 'CSS Test Summary',
      data: {
        cssErrorsCount: cssErrors.length,
        fontErrorsCount: fontErrors.length,
        stylesheetFailuresCount: stylesheetFailures.length,
        cspViolationsCount: cspViolations.length,
        globalCssLoaded,
        hasTailwindWorking,
        cssVarsLoaded,
      },
      hypothesisId: 'INFO',
    });

    // Print summary
    console.log(`\n=== CSS Rendering Summary ===`);
    console.log(`Global CSS Loaded: ${globalCssLoaded}`);
    console.log(`Tailwind Working: ${hasTailwindWorking}`);
    console.log(`CSS Variables Loaded:`, cssVarsLoaded);
    console.log(`CSS Errors: ${cssErrors.length}`);
    console.log(`Font Errors: ${fontErrors.length}`);
    console.log(`Stylesheet Failures: ${stylesheetFailures.length}`);
    console.log(`CSP Violations: ${cspViolations.length}`);
    if (cssErrors.length > 0) {
      console.log('\nCSS Errors:');
      cssErrors.slice(0, 5).forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }
    if (fontErrors.length > 0) {
      console.log('\nFont Errors:');
      fontErrors.slice(0, 5).forEach((err, i) => console.log(`${i + 1}. ${err}`));
    }

    // Assertions
    expect(cspViolations.length).toBe(0);
    expect(globalCssLoaded).toBe(true);
    expect(cssVarsLoaded.hasBackgroundVar).toBe(true);
  });
});