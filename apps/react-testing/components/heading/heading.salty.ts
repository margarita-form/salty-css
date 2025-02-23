import { styled } from '@salty-css/react/styled';

export const HeadingBase = styled('h3', {
  className: 'heading',
  base: {
    textStyle: 'headline.regular',
  },
});

export const LargeHeading = styled(HeadingBase, {
  className: 'large-heading',
  element: 'h2',
  base: {
    textStyle: 'headline.large',
  },
});

export const MainHeading = styled(LargeHeading, {
  element: 'h1',
  base: {
    marginBottom: '{spacings.em.small}',
  },
});

export const CommonHeading = styled(HeadingBase, {
  element: 'h2',
  base: {
    textStyle: 'headline.regular',
    marginBottom: '{spacings.em.small}',
  },
});
