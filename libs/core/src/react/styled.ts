import {
  GeneratorOptions,
  StyleComponentGenerator,
  Styles,
} from '../lib/generator';
import { elementBuilder } from './element-builder';

export const styled = (
  tagName: string,
  styles: Styles,
  options: GeneratorOptions = {}
) => {
  const generator = new StyleComponentGenerator(tagName, styles, options);
  return elementBuilder(generator);
};
