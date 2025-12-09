import { styled } from '@salty-css/astro/styled';
import { className } from '@salty-css/astro/class-name';
import Link from './link.astro';
import CurrentUrl from './current-url.astro';
import CurrentRadnom from './current-radnom.astro';

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

export const UrlBox = styled(CurrentUrl, {
  base: {
    padding: '10px',
    background: 'red',
    color: 'white',
  },
});

export const RandomValue = styled(CurrentRadnom, {
  base: {
    padding: '10px',
    background: 'purple',
    color: 'white',
  },
});

export const justClass = className({
  base: {
    backgroundColor: 'black',
    color: 'white',
    padding: '10px',
  },
});
