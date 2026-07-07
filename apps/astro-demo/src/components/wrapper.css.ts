import { styled } from '@salty-css/astro/styled';

export const Wrapper = styled('div', {
  base: {
    padding: '1rem',
  },
});

export const Heading = styled('h1', {
  base: {
    textStyle: 'body.large',
    color: '#222',
  },
});
