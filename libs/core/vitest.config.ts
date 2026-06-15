import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: resolve(import.meta.dirname, '../../node_modules/.vite'),
  test: {
    globals: true,
    environment: 'node',
  },
});
