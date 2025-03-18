import { defineVariables } from '@salty-css/core/factories';
import { largeMobileDown } from './media.css';

export const variables = defineVariables({
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
  responsive: {
    base: {
      fontSize: {
        heading: {
          small: 'clamp(20px, 1.5vw, 32px)',
          regular: 'clamp(32px, 2.5vw, 48px)',
          large: 'clamp(48px, 4vw, 64px)',
        },
      },
    },
    [largeMobileDown]: {
      fontSize: {
        heading: {
          small: 'clamp(20px, 3vw, 32px)',
          regular: 'clamp(32px, 5vw, 48px)',
          large: 'clamp(48px, 8vw, 64px)',
        },
      },
    },
  },
  conditional: {
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
});
