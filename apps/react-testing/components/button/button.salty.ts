import { styled } from '@salty-css/react/styled';

export const Button = styled('button', {
  display: 'block',
  padding: '0.6em 1.2em',
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'currentColor',
  margin: '5vw',
  cursor: 'pointer',
  transition: '200ms',
  '&:hover': {
    background: 'black',
    borderColor: 'black',
    color: 'white',
  },
  variants: {
    variant: {
      solid: {
        '&:not(:hover)': {
          background: 'black',
          borderColor: 'black',
          color: 'white',
        },
        '&:hover': {
          background: 'transparent',
          borderColor: 'currentColor',
          color: 'currentColor',
        },
      },
    },
  },
});
