import { defineConfig } from '@salty-css/core/config';
import { toHash } from '@salty-css/core/util';

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
    // Mirrors the README §Modifiers example. Keeps the snippet exercised by `npm run build:react`.
    spaceShorthand: {
      pattern: /^space:(\d+)$/,
      transform: (regexMatch) => {
        const n = Number(regexMatch.replace('space:', ''));
        return { value: `${n * 4}px` };
      },
    },
  },
});
