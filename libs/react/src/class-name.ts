import { StyledParams } from '@salty-css/core/types';
import { ClassNameGenerator } from '@salty-css/core/generators';

interface ClassNameMethods<STYLE_PARAMS extends StyledParams> {
  generator: ClassNameGenerator<STYLE_PARAMS>;
  isClassName: boolean;
  variant: (name: string, value: string) => string & ClassNameFunction<STYLE_PARAMS>;
}

type ClassNameFunction<STYLE_PARAMS extends StyledParams> = string & ClassNameMethods<STYLE_PARAMS>;

export const className = <const STYLE_PARAMS extends StyledParams>(params: STYLE_PARAMS) => {
  const generator = new ClassNameGenerator(params);
  const createClass = (classNameStr: string) => {
    const str = new String(classNameStr);
    Object.assign(str, {
      get isClassName() {
        return true;
      },
      variant: (name: string, value: string) => {
        const variantClass = `${name}-${value}`;
        const combinedClass = `${str} ${variantClass}`;
        return createClass(combinedClass);
      },
      generator,
    });

    return str as ClassNameFunction<STYLE_PARAMS>;
  };

  return createClass(generator.cssClassName);
};
