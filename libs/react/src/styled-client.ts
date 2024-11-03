import { Tag } from '@salty-css/core/types';
import { elementFactory } from './element-factory';

export const styledClient = (
  tagName: Tag<any>,
  className: string,
  callerName?: string,
  element?: string,
  variantKeys?: string[]
) => {
  const fn = elementFactory(tagName, className, element, variantKeys, {
    'data-component-name': callerName,
  });

  Object.assign(fn, {
    className,
    toString: () => `.${className}`,
  });

  return fn;
};
