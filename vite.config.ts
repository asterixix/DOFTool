import path from 'path';
import { defineConfig, Plugin } from 'vite';
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
const shouldAutoStartElectron = process.env.ELECTRON_AUTO_START === 'true';

export default defineConfig({
	plugins: [
		handleLibsodium(),
		react(),
    electron([
      {
        entry: 'electron/main.ts',
				onstart(options) {
					if (!shouldAutoStartElectron) {
						console.log('Electron auto-start disabled (ELECTRON_AUTO_START=false).');
						return;
					}
					// Prevent multiple Electron instances from starting
					if (isStarting) {
						console.log('Electron is already starting, skipping...');
						return;
					}
					isStarting = true;
					// Add delay to let previous instance fully close and release lock
					setTimeout(() => {
						options.startup();
						// Reset flag after a delay to allow future restarts
						setTimeout(() => { isStarting = false; }, 3000);
					}, 1000);
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
							'bonjour-service',
							'imapflow',
							'nodemailer',
							'@roamhq/wrtc',
							'libsodium-wrappers',
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
