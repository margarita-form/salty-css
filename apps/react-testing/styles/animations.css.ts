import { keyframes } from '@salty-css/react/keyframes';

export const fadeIn = keyframes({
  animationName: 'fadeIn',
  appendInitialStyles: true,
  params: {
    delay: '1s',
    fillMode: 'forwards',
  },
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
});
