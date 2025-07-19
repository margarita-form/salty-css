import { styled } from '@salty-css/astro/styled';
import Link from './link.astro';

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

export const Button = styled(Link, {
  base: {
    display: 'inline-block',
    backgroundColor: 'green',
    padding: '10px',
    color: 'white',
    margin: '10px',
  },
});
