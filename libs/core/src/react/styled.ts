import {
  GeneratorOptions,
  StyleComponentGenerator,
  Styles,
} from '../lib/generator';
import { elementBuilder, Props, Tag } from './element-builder';

export const styled = <P extends Props>(
  tagName: Tag<P>,
  styles: Styles,
  options: GeneratorOptions = {}
) => {
  const generator = new StyleComponentGenerator(styles, options);
  return elementBuilder(tagName, generator);
};
