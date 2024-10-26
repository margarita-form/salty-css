import { styled } from '@salty-css/react/styled';

export const HeadingBase = styled(
  'span',
  {
    display: 'block',
    fontFamily: 'Arial, sans-serif',
    margin: '5vw',
    fontSize: '22px',
  },
  { className: 'heading', element: 'h3' }
);

export const LargeHeading = styled(
  HeadingBase,
  {
    fontSize: '12vw',
  },
  { className: 'large-heading', element: 'h2' }
);

export const LargeHeadingH1 = styled(
  LargeHeading,
  {
    color: '#222',
  },
  { element: 'h1' }
);
