import { defineTemplates } from '@salty-css/core/factories';

export default defineTemplates({
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
});
