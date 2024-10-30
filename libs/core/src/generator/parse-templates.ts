import { dashCase } from '../util';
import { parseStyles } from './parse-styles';

export const parseTemplates = <T extends object>(
  obj: T,
  path: PropertyKey[] = []
): string => {
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
