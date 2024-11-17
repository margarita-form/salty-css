import { styled } from '@salty-css/react/styled';
import { fadeIn } from '../../styles/animations.css';
import { largePortrait } from '../../styles/media.css';

export const Wrapper = styled('div', {
  base: {
    display: 'block',
    animation: fadeIn,
    backgroundColor: '{theme.backgroundColor}',
    padding: '2vw',
    '@media (max-width: 768px)': {
      margin: '10vw',
    },
    [largePortrait]: {
      border: '1px solid red',
      padding: '5vw',
    },
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
