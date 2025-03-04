import type { StyledGeneratorClientProps } from '@salty-css/core/generators';
import type { Tag } from '@salty-css/core/types';
import { elementFactory } from './element-factory';

export const styledClient = (tagName: Tag<any>, className: string, generatorProps: StyledGeneratorClientProps) => {
  return elementFactory(tagName, className, generatorProps);
};
