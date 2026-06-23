import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: resolve(import.meta.dirname, '../../node_modules/.vite'),
  test: {
    globals: true,
    environment: 'jsdom',
  },
  define: {
    __VERSION__: JSON.stringify('1.2.3'),
  },
  resolve: {
    alias: {
      '@salty-css/core': resolve(import.meta.dirname, '../core/src'),
    },
  },
});
