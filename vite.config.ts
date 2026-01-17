import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import electronPath from 'electron';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

/**
 * Plugin to handle libsodium-wrappers resolution issues
 * This prevents Vite from trying to resolve internal libsodium.mjs imports
 */
function handleLibsodium(): Plugin {
  return {
    name: 'handle-libsodium',
    resolveId(id, importer) {
      // Intercept libsodium.mjs resolution attempts
      if (id === './libsodium.mjs' && importer?.includes('libsodium-wrappers')) {
        // Return a virtual stub to prevent resolution errors
        return '\0libsodium-stub';
      }
      return null;
    },
    load(id) {
      // Provide a stub for the virtual module
      if (id === '\0libsodium-stub') {
        return 'export default {};';
      }
      return null;
    },
  };
}

// Track if Electron is starting to prevent multiple instances
let isStarting = false;
let electronProcess: ChildProcess | null = null;
// Auto-start Electron by default; allow opt-out with ELECTRON_AUTO_START=false
const shouldAutoStartElectron = process.env.ELECTRON_AUTO_START !== 'false';

const getElectronCommand = (): string => {
  if (typeof electronPath === 'string') {
    return electronPath;
  }
  return String(electronPath);
};

const stopElectronProcess = async (): Promise<void> => {
  if (!electronProcess?.pid) {
    return;
  }

  const pid = electronProcess.pid;
  if (process.platform === 'win32') {
    try {
      const killer = spawn('taskkill', ['/pid', String(pid), '/t', '/f'], {
        stdio: 'ignore',
      });
      await new Promise<void>((resolve) => {
        killer.on('close', () => resolve());
        killer.on('error', () => resolve());
      });
    } catch {
      // Ignore taskkill errors (e.g., process already exited).
    }
  } else {
    try {
      electronProcess.kill('SIGTERM');
    } catch {
      // Ignore errors when the process is already gone.
    }
  }
};

const startElectronProcess = async (): Promise<void> => {
  if (!shouldAutoStartElectron) {
    console.log('Electron auto-start disabled (ELECTRON_AUTO_START=false).');
    return;
  }
  if (isStarting) {
    console.log('Electron is already starting, skipping...');
    return;
  }
  if (electronProcess && electronProcess.exitCode === null) {
    console.log('Electron is already running, skipping restart.');
    return;
  }

  isStarting = true;
  console.log('[Electron] Waiting for Vite server to be ready...');

  await new Promise<void>((resolve) => setTimeout(() => resolve(), 2000));

  console.log('[Electron] Starting Electron process...');
  electronProcess = spawn(getElectronCommand(), ['.'], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  electronProcess.on('exit', (code, signal) => {
    console.log(`[Electron] Process exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
    electronProcess = null;
  });

  // Reset flag after a delay to allow future restarts
  setTimeout(() => {
    isStarting = false;
  }, 3000);
};

export default defineConfig({
  plugins: [
    handleLibsodium(),
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart() {
          void startElectronProcess();
        },
        vite: {
          build: {
            outDir: 'dist/electron',
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs'],
            },
            rollupOptions: {
              external: [
                'electron',
                'level',
                'y-leveldb',
                'yjs',
                'y-webrtc',
                'bonjour-service',
                'imapflow',
                'nodemailer',
                'libsodium-wrappers',
                'ws',
                'bufferutil',
                // Mark as external to prevent analysis
                /^libsodium/,
              ],
              output: {
                format: 'cjs',
              },
            },
          },
          // Skip dependency optimization for Electron build
          optimizeDeps: {
            exclude: ['libsodium-wrappers', 'yjs', 'y-leveldb'],
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          // Only reload renderer, don't restart Electron
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist/electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
            },
            rollupOptions: {
              output: {
                format: 'cjs',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: [
      // More specific aliases must come first
      { find: '@/lib', replacement: path.resolve(__dirname, './src/shared/lib') },
      { find: '@/modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@/shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
    // Prevent Vite from trying to resolve libsodium-wrappers in renderer
    dedupe: [],
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['libsodium-wrappers', 'libsodium'],
    // Prevent Vite from trying to pre-bundle native dependencies
    esbuildOptions: {
      // Skip dependencies that might have native bindings
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
  },
});
