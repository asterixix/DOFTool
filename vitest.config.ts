import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
      'electron/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        'src/shared/components/ui/**',
        'src/components/ui/**',
        'dist/electron/**',
        '.eslintrc.cjs',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: [
      { find: '@/lib', replacement: path.resolve(__dirname, './src/shared/lib') },
      { find: '@/modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@/shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
