import { defineConfig } from '@salty-css/core/config';

export const config = defineConfig({
  importStrategy: 'component',
  variables: {
    colors: {
      brand: 'red',
      highlight: 'yellow',
    },
    fontSize: {
      heading: {
        regular: '2.5vw',
      },
    },
    custom: {
      variables: {
        thatCanGoDeep: 'blue',
      },
    },
    spacings: {
      emExtraLarge: '1.8em',
      emLarge: '1.2em',
      emRegular: '0.6em',
    },
  },
  global: {
    html: {
      backgroundColor: '#f8f8f8',
    },
  },
  templates: {
    textStyle: {
      headline: {
        large: {
          fontSize: '60px',
        },
        regular: {
          fontSize: '42px',
          color: 'blue',
        },
      },
    },
  },
});
