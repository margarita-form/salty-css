import {
  GeneratorOptions,
  StyleComponentGenerator,
  Styles,
} from '../lib/generator';
import { elementBuilder, Props, Tag } from './element-builder';

export const styled = <
  const P extends Props,
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
