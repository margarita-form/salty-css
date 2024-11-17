import { styled } from '@salty-css/react/styled';

export const HeadingBase = styled('h3', {
  className: 'heading',
  base: {
    display: 'block',
    fontFamily: 'Arial, sans-serif',
    margin: '2vw 0',
    textStyle: 'headline.regular',
  },
});

export const LargeHeading = styled(HeadingBase, {
  className: 'large-heading',
  element: 'h2',
  base: {
    textStyle: 'headline.large',
    color: '#888',
  },
});

export const LargeHeadingH1 = styled(LargeHeading, {
  element: 'h1',
  base: {
    color: '{custom.variables.thatCanGoDeep}',
    transition: '200ms',
    '&:hover': {
      opacity: 0.5,
    },
  },
});
