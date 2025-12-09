import { Tag, StyledComponentProps, StyledParams } from '@salty-css/core/types';
import { StyledGenerator } from '@salty-css/core/generators';

export const styled = <const PROPS extends StyledComponentProps, const TAG extends Tag<Required<PROPS>>, const STYLE_PARAMS extends StyledParams>(
  tagName: TAG,
  params: STYLE_PARAMS
) => {
  const generator = new StyledGenerator(tagName, params);

  const component = {
    tagName,
    generator,
  };

  return component as any;
};
