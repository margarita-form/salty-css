import { CssModifiers } from '../config/config-types';
import { ValueParserReturnValue } from './parser-types';

export const parseValueModifiers = (value: string, modifiers?: CssModifiers): ValueParserReturnValue => {
  if (typeof value !== 'string') return { result: value };
  if (!modifiers) return { result: value };

  const additionalCss = [] as Object[];
  Object.values(modifiers).forEach((modifier) => {
    const { pattern, transform } = modifier;
    value = value.replace(pattern, (match) => {
      const { value: result, css } = transform(match);
      if (css) additionalCss.push(css);
      return result;
    });
  });

  return { result: value, additionalCss };
};
