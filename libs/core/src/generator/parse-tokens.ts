import { dashCase } from '../util';

export const parseTokens = <T extends string>(value: T) => {
  if (typeof value !== 'string') return value;
  const hasToken = /\{[^{}]+\}/g.test(value);
  if (!hasToken) return value;
  return value.replace(/\{([^{}]+)\}/g, (...args) => {
    const variable = dashCase(args[1].replaceAll('.', '-'));
    return `var(--${variable})`;
  });
};
