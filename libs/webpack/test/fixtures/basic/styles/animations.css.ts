import { keyframes } from '@salty-css/react/keyframes';

export const slideIn = keyframes({
  animationName: 'slideIn',
  from: {
    opacity: 0,
    transform: 'translateY(-4px)',
  },
  50: {
    opacity: 0.5,
  },
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },
});
