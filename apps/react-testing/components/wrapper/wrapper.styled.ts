import { styled } from '@salty-css/react/styled';
import { fadeIn } from '../../styles/animations.css';

export const Wrapper = styled('div', {
  display: 'block',
  animation: fadeIn({ duration: '750ms' }),
  '@media (max-width: 768px)': {
    margin: '10vw',
  },
  variants: {
    margin: {
      regular: {
        margin: '5vw',
      },
    },
  },
  defaultVariants: {
    margin: 'regular',
  },
});
