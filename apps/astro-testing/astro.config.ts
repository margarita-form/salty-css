import { defineConfig } from 'astro/config';
import { saltyLocalVitePlugin } from './salty-local-vite-plugin';

const dir = new URL('.', import.meta.url).pathname + '/src';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [saltyLocalVitePlugin(dir)],
  },
});
