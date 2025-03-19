import { styled } from '@salty-css/react/styled';
import { token } from '@salty-css/core/css';
import { DynamicLink } from '../dynamic-link/dynamic-link';

export const ButtonsWrapper = styled('div', {
  base: {
    display: 'flex',
    gap: '{spacings.large}',
    marginBlock: '{spacings.large}',
  },
});

export const Button = styled(DynamicLink, {
  element: 'button',
  className: 'button',
  base: {
    display: 'block',
    padding: `${token('spacings.em.small')} ${token('spacings.em.large')}`,
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: '200ms',
    textDecoration: 'none',
    textStyle: 'body.small',
    '&:disabled': {
      opacity: 0.25,
      pointerEvents: 'none',
    },
  },
  variants: {
    variant: {
      outlined: {
        borderColor: 'currentColor',
        background: 'transparent',
        '&:hover': {
          background: 'black',
          borderColor: 'black',
          color: 'white',
        },
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
      underlined: {
        textDecoration: 'underline 1px solid currentColor',
        background: 'transparent',
        padding: 0,
        textUnderlineOffset: '0.25em',
        '&:hover': {
          textDecorationColor: 'currentColor/20',
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
});
