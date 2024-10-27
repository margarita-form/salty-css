import { styled } from '@salty-css/react/styled';

export const Wrapper = styled('div', {
  display: 'block',
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
