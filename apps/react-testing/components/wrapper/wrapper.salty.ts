import { styled } from '@salty-css/react/styled';

export const Wrapper = styled('div', {
  display: 'block',
  margin: '5vw',
  '@media (max-width: 768px)': {
    margin: '10vw',
  },
});
