// @ts-check
import { defineConfig } from 'astro/config';
import saltyIntegration from '@salty-css/astro/integration';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [saltyIntegration(), react()],
});