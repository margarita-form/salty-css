import { defineConfig } from '@salty-css/core/config';
import { toHash } from '@salty-css/core/util';
import { largeMobileDown } from './styles/media.css';

export const config = defineConfig({
  externalModules: ['react', 'react-router-dom'],
  importStrategy: 'component',
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
