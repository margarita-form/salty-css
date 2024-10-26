import { styled } from '@salty-css/react/styled';

export const HeadingBase = styled(
  'h3',
  {
    display: 'block',
    fontFamily: 'Arial, sans-serif',
    margin: '2vw 5vw',
    fontSize: '2.5vw',
  },
  { className: 'heading' }
);

export const LargeHeading = styled(
  HeadingBase,
  {
    fontSize: '5vw',
    color: '#555',
  },
  { className: 'large-heading', element: 'h2' }
);

export const LargeHeadingH1 = styled(
  LargeHeading,
  {
    color: 'green',
  },
  { element: 'h1' }
);
