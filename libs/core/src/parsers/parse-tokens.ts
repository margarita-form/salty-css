import { dashCase } from '../util';
import { SyncronousStyleValueModifierFunction } from './parser-types';

export const parseValueTokens =
  (tokenNames?: string[]): SyncronousStyleValueModifierFunction =>
  (value: unknown) => {
    if (typeof value !== 'string') return undefined;
    const hasToken = /\{[^{}]+\}/g.test(value);
    if (!hasToken) return undefined;
    const transformed = value.replace(/\{([^{}]+)\}/g, (...args) => {
      const variable = dashCase(args[1].replaceAll('.', '-'));
      if (tokenNames && !tokenNames.includes(variable)) console.warn(`Token ${variable} might not exist`);
      return `var(--${variable})`;
    });
    return { transformed };
  };

export const parseVariableTokens = parseValueTokens();
