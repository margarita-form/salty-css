import { defineConfig } from '../../../libs/core/src/config';

export const config = defineConfig({
  externalModules: ['astro'],
  variables: {
    colors: {
      brand: 'red',
    },
  },
});
