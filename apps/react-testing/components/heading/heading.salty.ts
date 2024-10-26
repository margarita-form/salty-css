import { styled } from '@salty-css/react/styled';

export const HeadingBase = styled('span', {
  display: 'block',
  fontFamily: 'Arial, sans-serif',
  margin: '5vw',
  fontSize: '22px',
});

export const LargeHeading = styled(HeadingBase, {
  fontSize: '12vw',
});
