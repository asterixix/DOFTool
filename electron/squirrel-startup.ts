/**
 * Squirrel.Windows Startup Handler
 * Handles install, update, and uninstall events for Windows installer
 */

import { spawn } from 'child_process';
import * as path from 'path';

import { app, dialog, shell, BrowserWindow } from 'electron';

/**
 * Handle Squirrel.Windows startup events
 * Returns true if a Squirrel event was handled (app should quit)
 */
export function handleSquirrelEvent(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  const squirrelCommand = process.argv[1];

  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Create desktop and start menu shortcuts
      createShortcuts();
      app.quit();
      return true;

    case '--squirrel-uninstall':
      // Show uninstall confirmation dialog
      handleUninstall();
      return true;

    case '--squirrel-obsolete':
      // Called when an older version is being replaced
      app.quit();
      return true;

    case '--squirrel-firstrun':
      // First run after installation - could show welcome screen
      return false;

    default:
      return false;
  }
}

/**
 * Create desktop and start menu shortcuts using Squirrel's Update.exe
 */
function createShortcuts(): void {
  const updateExe = path.resolve(process.execPath, '..', '..', 'Update.exe');
  const exeName = path.basename(process.execPath);

  spawn(updateExe, ['--createShortcut', exeName], { detached: true });
}

/**
 * Remove shortcuts during uninstall
 */
function removeShortcuts(): void {
  const updateExe = path.resolve(process.execPath, '..', '..', 'Update.exe');
  const exeName = path.basename(process.execPath);

  spawn(updateExe, ['--removeShortcut', exeName], { detached: true });
}

/**
 * Handle uninstall with custom confirmation dialog
 */
function handleUninstall(): void {
  // We need to show a dialog, but app might not be ready yet
  void app.whenReady().then(async () => {
    // Create a small hidden window to enable dialog
    const win = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      skipTaskbar: true,
    });

    try {
      const result = await dialog.showMessageBox(win, {
        type: 'question',
        icon: path.resolve(__dirname, '..', 'public', 'icon.ico'),
        title: 'Uninstall DOFTool',
        message: 'Are you sure you want to uninstall DOFTool?',
        detail:
          'Thank you for using DOFTool!\n\n' +
          'If you found this app useful, please consider supporting the developer:\n\n' +
          '💝 Artur Sendyka\n' +
          '🌐 https://sendyka.dev\n' +
          '☕ https://buymeacoffee.com/artursendyka\n\n' +
          'Your support helps keep this project alive and growing!',
        buttons: ['Cancel', 'Support Developer', 'Uninstall'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });

      win.destroy();

      if (result.response === 1) {
        // Support Developer - open support page
        await shell.openExternal('https://buymeacoffee.com/artursendyka');
        // Show dialog again after opening support page
        handleUninstall();
        return;
      }

      if (result.response === 2) {
        // Proceed with uninstall
        removeShortcuts();
        app.quit();
      } else {
        // Cancelled - but Squirrel will still uninstall, we can't prevent it
        // At least we showed the message
        app.quit();
      }
    } catch (error) {
      console.error('Error showing uninstall dialog:', error);
      removeShortcuts();
      app.quit();
    }
  });
}

/**
 * Show a small splash/progress window during installation
 * This is called by the installer loading GIF, but we can enhance it
 */
export function showInstallProgress(): BrowserWindow {
  const progressWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    skipTaskbar: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load a simple HTML page showing installation progress
  void progressWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          -webkit-app-region: drag;
          border-radius: 12px;
          overflow: hidden;
        }
        .logo {
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .progress-container {
          width: 280px;
          height: 6px;
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 20px;
        }
        .progress-bar {
          height: 100%;
          background: white;
          border-radius: 3px;
          animation: progress 2s ease-in-out infinite;
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .status {
          margin-top: 15px;
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <svg class="logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="white" stroke-width="4" fill="rgba(255,255,255,0.1)"/>
        <path d="M30 50 L45 65 L70 35" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      <h1>DOFTool</h1>
      <p>Installing...</p>
      <div class="progress-container">
        <div class="progress-bar"></div>
      </div>
      <p class="status">Please wait while we set up your application</p>
    </body>
    </html>
  `)}`
  );

  return progressWindow;
}
