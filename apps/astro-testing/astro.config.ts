import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { saltyLocalVitePlugin } from './salty-local-vite-plugin';

const dir = new URL('.', import.meta.url).pathname + '/src';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [saltyLocalVitePlugin(dir)],
  },
});
