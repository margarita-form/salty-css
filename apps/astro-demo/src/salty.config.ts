import { defineConfig } from '../../../libs/core/src/config';

export const config = defineConfig({
  externalModules: ['astro'],
  importStrategy: 'component',
  variables: {
    colors: {
      brand: 'red',
    },
  },
});
