import { defineGlobalStyles } from '@salty-css/core/factories';

export const globalStyles = defineGlobalStyles({
  html: {
    fontFamily: 'Arial, sans-serif',
  },
  body: {
    backgroundColor: '{theme.background.color}',
    color: '{theme.textColor}',
  },
});
