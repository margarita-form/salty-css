import { StyledParams } from '@salty-css/core/types';
import { ClassNameFactory } from '@salty-css/core/css';

export const className = <const STYLE_PARAMS extends StyledParams>(params: STYLE_PARAMS) => {
  const factory = new ClassNameFactory(params);
  const str = new String(factory.cssClassName);

  Object.assign(str, {
    get isClassName() {
      return true;
    },
    factory,
  });

  return str as string & {
    isClassName: boolean;
    factory: ClassNameFactory<STYLE_PARAMS>;
  };
};
