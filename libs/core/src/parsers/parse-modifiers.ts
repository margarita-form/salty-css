import { CssModifiers } from '../types/config-types';
import { ValueParserReturnValue } from './parser-types';

export const parseValueModifiers = (value: string, modifiers?: CssModifiers): undefined | ValueParserReturnValue => {
  if (typeof value !== 'string') return undefined;
  if (!modifiers) return undefined;

  let transformed = value;
  const additionalCss = [] as object[];
  Object.values(modifiers).forEach((modifier) => {
    const { pattern, transform } = modifier;
    transformed = transformed.replace(pattern, (match) => {
      const { value: _value, css } = transform(match);
      if (css) additionalCss.push(css);
      return _value;
    });
  });

  return { transformed, additionalCss };
};
