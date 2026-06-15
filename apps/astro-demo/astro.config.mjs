// @ts-check
import { defineConfig } from 'astro/config';
import saltyIntegration from '@salty-css/astro/integration';

// https://astro.build/config
export default defineConfig({
  integrations: [saltyIntegration()],
});
