import { defineTemplates } from '@salty-css/astro/factories';

export default defineTemplates({
  textStyle: {
    headline: {
      base: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '300',
        letterSpacing: '0.0125em',
        lineHeight: '1.2em',
      },
      small: {
        fontSize: '0.875rem',
      },
      regular: {
        fontSize: '1rem',
      },
      large: {
        fontSize: '1.25rem',
      },
    },
    body: {
      base: {
        fontFamily: 'Arial, sans-serif',
        fontWeight: '300',
        letterSpacing: '0.0125em',
        lineHeight: '1.5em',
      },
      small: {
        fontSize: '1.5rem',
      },
      regular: {
        fontSize: '1.75rem',
      },
      large: {
        fontSize: '2rem',
      },
    },
  },
});
