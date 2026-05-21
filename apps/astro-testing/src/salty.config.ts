import { defineConfig } from '../../../libs/core/src/config';

export const config = defineConfig({
  externalModules: ['astro', 'react', 'react-dom'],
  variables: {
    colors: {
      brand: 'red',
    },
  },
});
