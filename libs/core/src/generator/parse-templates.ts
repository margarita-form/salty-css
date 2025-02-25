import { dashCase } from '../util';
import { parseStyles } from './parse-styles';

export const parseTemplates = <T extends object>(obj: T, path: PropertyKey[] = []): string => {
  if (!obj) return '';
  const classes: string[] = [];

  const levelStyles = {} as Record<PropertyKey, any>;

  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object') {
      if (!value) return;
      const _key = key.trim();
      const result = parseTemplates(value, [...path, _key]);
      classes.push(result);
    } else {
      levelStyles[key] = value;
    }
  });

  if (Object.keys(levelStyles).length) {
    const className = path.map(dashCase).join('-');
    const result = parseStyles(levelStyles, `.${className}`);
    classes.push(result);
  }

  return classes.join('\n');
};

export const getTemplateKeys = <T extends object>(templates: T): string[] => {
  return Object.keys(templates);
};

export const getTemplateTypes = <T extends object>(templates: T): Record<string, string> => {
  if (!templates) return {};
  return Object.entries(templates).reduce((acc, [key, value]) => {
    if (typeof value === 'object')
      acc[key] = getTemplateTokens(value)
        .map((val) => `"${val}"`)
        .join(' | ');
    return acc;
  }, {} as Record<string, string>);
};

export const getTemplateTokens = <T extends object>(templates: T, parent = '', templateTokens = new Set<string>()): string[] => {
  if (!templates) return [];
  Object.entries(templates).forEach(([key, value]) => {
    const keyValue = parent ? `${parent}.${key}` : key;
    if (typeof value === 'object') return getTemplateTokens(value, keyValue, templateTokens);
    return templateTokens.add(parent);
  });

  return [...templateTokens];
};
