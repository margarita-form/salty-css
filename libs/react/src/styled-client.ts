import { Tag } from '@salty-css/core/types';
import { elementFactory } from './element-factory';

export const styledClient = (
  tagName: Tag<any>,
  className: string,
  callerName?: string,
  element?: string,
  variantKeys?: string[]
) => {
  return elementFactory(tagName, className, element, variantKeys, {
    'data-component-name': callerName,
  });
};
