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
  variants: {
    color: {
      orange: {
        color: 'orange',
      },
    },
  },
});

export const Container = styled('div', {
  base: {
    backgroundColor: 'blue',
    padding: '10px',
    color: 'white',
  },
});

export const CyanContainer = styled(Container, {
  element: 'section',
  base: {
    backgroundColor: 'cyan',
    color: 'black',
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
  variants: {
    color: {
      cyan: {
        color: 'cyan',
        backgroundColor: '#222',
      },
    },
  },
});

export const DifferentElement = styled('section', {
  element: 'article',
  base: {
    backgroundColor: 'red',
    padding: '10px',
    '&:is(article)': {
      backgroundColor: 'blue',
      color: 'white',
    },
    '&:is(div)': {
      backgroundColor: 'orange',
    },
  },
});

// Exercises defaultVariants + variant key stripping (mood should not leak as a HTML attr)
export const DefaultVariantBox = styled('div', {
  base: {
    padding: '10px',
    border: '1px solid currentColor',
  },
  variants: {
    mood: {
      warm: { color: 'tomato' },
      cool: { color: 'steelblue' },
    },
  },
  defaultVariants: {
    mood: 'cool',
  },
});

// Exercises propValueKeys: consumer passes css-spacing and it becomes --props-spacing
export const SpacingBox = styled('div', {
  base: {
    padding: '{props.spacing}',
    background: 'lightyellow',
    color: 'black',
  },
});

// Exercises passProps: data-foo should be the only variant-like key that survives
export const PassPropsBox = styled('div', {
  base: { padding: '10px', background: 'lavender' },
  passProps: ['data-foo'],
  variants: {
    tone: {
      a: { color: 'darkred' },
      b: { color: 'darkblue' },
    },
  },
});

// Exercises a nested styled chain: outer's `size` and inner's `mood` must both
// be stripped at their own levels so neither shows up as a raw HTML attribute.
export const ChainedBox = styled(DefaultVariantBox, {
  base: {
    margin: '10px',
    background: '#222',
    color: 'white',
  },
  variants: {
    size: {
      sm: { padding: '4px' },
      lg: { padding: '24px' },
    },
  },
});
