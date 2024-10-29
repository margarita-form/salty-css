import {
  Tag,
  StyledComponentProps,
  Styles,
  GeneratorOptions,
} from '@salty-css/core/types';
import { elementBuilder } from './element-builder';
import { StyleComponentGenerator } from '@salty-css/core/generator';

export const styled = <
  const P extends StyledComponentProps,
  const T extends Tag<P>,
  const S extends Styles
>(
  tagName: T,
  styles: S,
  options: GeneratorOptions = {}
) => {
  const generator = new StyleComponentGenerator(tagName, styles, options);
  return elementBuilder<P, T, S>(tagName, styles, generator);
};
