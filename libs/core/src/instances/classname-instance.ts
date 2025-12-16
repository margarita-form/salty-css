import { ClassNameGenerator } from '../generators';
import { StyledParams } from '../types';

interface ClassNameMethods<STYLE_PARAMS extends StyledParams> {
  generator: ClassNameGenerator<STYLE_PARAMS>;
  isClassName: boolean;
  variant: (name: string, value: string) => string & ClassNameFunction<STYLE_PARAMS>;
}

type ClassNameFunction<STYLE_PARAMS extends StyledParams> = string & ClassNameMethods<STYLE_PARAMS>;

export const classNameInstance = <const STYLE_PARAMS extends StyledParams>(params: STYLE_PARAMS) => {
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
      variants: (variants: Record<string, string>) => {
        const variantClasses = Object.entries(variants).reduce((acc, [name, value]) => {
          acc += ` ${name}-${value}`;
          return acc;
        }, '');
        const combinedClass = `${str}${variantClasses}`.trim();
        return createClass(combinedClass);
      },
      generator,
    });

    return str as ClassNameFunction<STYLE_PARAMS>;
  };

  return createClass(generator.cssClassName);
};
