import { dashCase } from './dash-case';

export const sanitizeClassName = (str: PropertyKey | boolean): string => {
  if (!str) return '';
  if (typeof str !== 'string') return sanitizeClassName(String(str));
  const sanitized = str.replace(/[^a-zA-Z0-9_-]/g, '-');
  return dashCase(sanitized);
};
