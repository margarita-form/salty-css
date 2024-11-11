import { defineConfig } from '@salty-css/core/config';
import { toHash } from '@salty-css/core/util';

export const config = defineConfig({
  importStrategy: 'component',
  variables: {
    colors: {
      brand: '#111',
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
  conditionalVariables: {
    theme: {
      dark: {
        backgroundColor: '{colors.brand}',
        textColor: 'white',
      },
      light: {
        backgroundColor: 'white',
        textColor: '{colors.brand}',
      },
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
  modifiers: {
    colorMix: {
      pattern: new RegExp('[^\\s/:]+/\\d\\d'),
      transform: (regexMatch) => {
        const [color, opacity] = regexMatch.split('/');
        const variable = toHash(regexMatch, 5);
        const variableName = `--color-mix-${variable}`;
        return {
          css: {
            [variableName]: `color-mix(in srgb, ${color} ${opacity}%, transparent)`,
          },
          value: `var(${variableName}, ${color})`,
        };
      },
    },
  },
});
