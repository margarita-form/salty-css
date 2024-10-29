import { styled } from '@salty-css/react/styled';
import { token } from '@salty-css/core/css';

export const ButtonsWrapper = styled('div', {
  margin: '5vw 0',
  display: 'flex',
  gap: '2.5vw',
});

export const Button = styled('button', {
  display: 'block',
  padding: `${token('spacings.emRegular')} ${token('spacings.emLarge')}`,
  border: '1px solid currentColor',
  background: 'transparent',
  color: 'currentColor',
  cursor: 'pointer',
  transition: '200ms',
  '&:hover': {
    background: 'black',
    borderColor: 'black',
    color: 'white',
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
  },
  defaultVariants: {
    borderRadius: 'regular',
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
