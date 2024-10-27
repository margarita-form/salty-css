import { styled } from '@salty-css/react/styled';

export const HeadingBase = styled(
  'h3',
  {
    display: 'block',
    fontFamily: 'Arial, sans-serif',
    margin: '2vw 5vw',
    fontSize: 'var(--font-size-heading-regular)',
  },
  { className: 'heading' }
);

export const LargeHeading = styled(
  HeadingBase,
  {
    fontSize: '5vw',
    color: '#888',
  },
  { className: 'large-heading', element: 'h2' }
);

export const LargeHeadingH1 = styled(
  LargeHeading,
  {
    color: '{custom.variables.thatCanGoDeep}',
    transition: '200ms',
    '&:hover': {
      opacity: 0.5,
    },
  },
  { element: 'h1' }
);
