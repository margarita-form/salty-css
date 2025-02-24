import { defineConfig } from '@salty-css/core/config';
import { toHash } from '@salty-css/core/util';
import { largeMobileDown } from './styles/media.css';

export const config = defineConfig({
  externalModules: ['react', 'react-router-dom'],
  importStrategy: 'component',
  templates: {
    textStyle: {
      headline: {
        small: {
          fontSize: '{fontSize.heading.small}',
        },
        regular: {
          fontSize: '{fontSize.heading.regular}',
        },
        large: {
          fontSize: '{fontSize.heading.large}',
        },
      },
      body: {
        small: {
          fontSize: '{fontSize.body.small}',
          lineHeight: '1.5em',
        },
        regular: {
          fontSize: '{fontSize.body.regular}',
          lineHeight: '1.33em',
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
