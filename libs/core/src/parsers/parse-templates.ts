import { dashCase } from '../util';
import { parseAndJoinStyles } from './parse-styles';

export const parseTemplates = async <T extends object>(obj: T, path: PropertyKey[] = []): Promise<string> => {
  if (!obj) return '';
  const classes: string[] = [];

  const levelStyles = {} as Record<PropertyKey, any>;

  Object.entries(obj).forEach(async ([key, value]) => {
    if (typeof value === 'function') return console.log('Function found', key);
    else if (typeof value === 'object') {
      if (!value) return;
      const _key = key.trim();
      const result = await parseTemplates(value, [...path, _key]);
      classes.push(result);
    } else {
      levelStyles[key] = value;
    }
  });

  if (Object.keys(levelStyles).length) {
    const className = path.map(dashCase).join('-');
    const result = await parseAndJoinStyles(levelStyles, `.${className}`);
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
