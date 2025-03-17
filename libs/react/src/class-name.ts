import { StyledParams } from '@salty-css/core/types';
import { ClassNameGenerator } from '@salty-css/core/generators';

export const className = <const STYLE_PARAMS extends StyledParams>(params: STYLE_PARAMS) => {
  const generator = new ClassNameGenerator(params);
  const str = new String(generator.cssClassName);

  Object.assign(str, {
    get isClassName() {
      return true;
    },
    generator,
  });

  return str as string & {
    isClassName: boolean;
    generator: ClassNameGenerator<STYLE_PARAMS>;
  };
};
