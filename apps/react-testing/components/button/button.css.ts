import { styled } from '@salty-css/react/styled';
import { token } from '@salty-css/core/css';
import { DynamicLink } from '../dynamic-link/dynamic-link';

export const ButtonsWrapper = styled('div', {
  margin: '5vw 0',
  display: 'flex',
  gap: '2.5vw',
});

export const Button = styled(
  DynamicLink,
  {
    display: 'block',
    padding: `${token('spacings.emRegular')} ${token('spacings.emLarge')}`,
    border: '1px solid currentColor',
    background: 'transparent',
    color: 'currentColor',
    cursor: 'pointer',
    transition: '200ms',
    textDecoration: 'none',
    '&:hover': {
      background: 'black',
      borderColor: 'black',
      color: 'white',
    },
    '&:disabled': {
      opacity: 0.25,
      pointerEvents: 'none',
    },
    variants: {
      variant: {
        outlined: {
          //
        },
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
      borderRadius: {
        none: {
          borderRadius: 0,
        },
        regular: {
          borderRadius: '0.6em',
        },
        circular: {
          borderRadius: '50em',
        },
      },
      warning: {
        true: {
          outline: '2px solid transparent',
          outlineOffset: '0px',
          '&:hover': {
            outlineColor: 'red',
            outlineOffset: '2px',
          },
        },
      },
    },
    defaultVariants: {
      borderRadius: 'regular',
      warning: false,
    },
    compoundVariants: [
      {
        variant: 'solid',
        borderRadius: 'circular',
        css: {
          paddingInline: '{spacings.emExtraLarge}',
        },
      },
    ],
  },
  {
    element: 'button',
  }
);

export const LargeButton = styled(Button, {
  fontSize: '24px',
  variants: {
    warning: {
      true: {
        background: 'red',
        borderColor: 'red',
        color: '#000',
        '&:hover': {
          opacity: 0.5,
        },
      },
    },
  },
  compoundVariants: [
    {
      warning: true,
      variant: 'solid',
      css: {
        borderColor: '#000',
        borderWidth: '2px',
        fontWeight: '700',
      },
    },
  ],
});
