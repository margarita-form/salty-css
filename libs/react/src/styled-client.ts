import type { GeneratorProps } from '@salty-css/core/generator';
import type { Tag } from '@salty-css/core/types';
import { elementFactory } from './element-factory';

export const styledClient = (tagName: Tag<any>, className: string, callerName = '', generatorProps: GeneratorProps) => {
  return elementFactory(tagName, className, generatorProps, {
    'data-component-name': callerName,
  });
};
