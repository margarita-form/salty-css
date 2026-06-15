import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: resolve(import.meta.dirname, '../../node_modules/.vite'),
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@salty-css/core': resolve(import.meta.dirname, '../core/src'),
      '@salty-css/react': resolve(import.meta.dirname, '../react/src'),
    },
  },
});
