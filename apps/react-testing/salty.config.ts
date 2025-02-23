import { defineConfig } from '@salty-css/core/config';
import { toHash } from '@salty-css/core/util';
import { largeMobileDown } from './styles/media.css';

export const config = defineConfig({
  externalModules: ['react', 'react-router-dom'],
  importStrategy: 'root',
  variables: {
    colors: {
      brand: '#ff00a2',
      highlight: '#ffe400',
      dark: '#111',
      darkAlt: '#222',
      light: '#fefefe',
      lightAlt: '#f0f0f0',
      black: '#000',
      white: '#fff',
    },
    fontSize: {
      heading: {
        small: 'clamp(20px, 1.5vw, 32px)',
        regular: 'clamp(32px, 2.5vw, 48px)',
        large: 'clamp(48px, 4vw, 64px)',
      },
      body: {
        small: 'clamp(14px, 1vw, 16px)',
        regular: 'clamp(16px, 1.25vw, 20px)',
        large: 'clamp(20px, 1.5vw, 24px)',
      },
    },
    spacings: {
      small: '8px',
      medium: '16px',
      large: '32px',
      screen: {
        small: 'clamp(24px, 5vw, 120px)',
        medium: 'clamp(32px, 6.25vw, 160px)',
        large: 'clamp(48px, 7.5vw, 240px)',
      },
      em: {
        small: '0.6em',
        medium: '1.2em',
        large: '1.8em',
      },
    },
    sizes: {
      width: {
        small: '320px',
        medium: '960px',
        large: '1280px',
      },
    },
  },
  responsiveVariables: {
    base: {
      fontSize: {
        heading: {
          regular: '2.5vw',
        },
      },
    },
    [largeMobileDown]: {
      fontSize: {
        heading: {
          regular: '5vw',
        },
      },
    },
  },
  conditionalVariables: {
    theme: {
      dark: {
        backgroundColor: '{colors.dark}',
        textColor: '{colors.white}',
      },
      light: {
        backgroundColor: '{colors.light}',
        textColor: '{colors.brand}',
      },
      darkAlt: {
        backgroundColor: '{colors.darkAlt}',
        textColor: '{colors.white}',
      },
    },
  },
  global: {
    html: {
      fontFamily: 'Arial, sans-serif',
    },
    body: {
      backgroundColor: '{theme.background.color}',
      color: '{theme.textColor}',
    },
  },
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
