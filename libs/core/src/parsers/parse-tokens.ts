import { dashCase } from '../util';
import { ValueParserReturnValue } from './parser-types';

export const parseValueTokens = (value: string): ValueParserReturnValue => {
  if (typeof value !== 'string') return { result: value };
  const hasToken = /\{[^{}]+\}/g.test(value);
  if (!hasToken) return { result: value };
  const result = value.replace(/\{([^{}]+)\}/g, (...args) => {
    const variable = dashCase(args[1].replaceAll('.', '-'));
    return `var(--${variable})`;
  });
  return { result };
};
