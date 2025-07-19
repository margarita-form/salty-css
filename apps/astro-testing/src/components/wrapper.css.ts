import { styled } from '@salty-css/astro/styled';

export const Wrapper = styled('span', {
  base: {
    display: 'inline-block',
    padding: '10px',
    color: '{colors.brand}',
  },
});

export const Container = styled('div', {
  base: {
    backgroundColor: 'blue',
    padding: '10px',
    color: 'white',
  },
});
