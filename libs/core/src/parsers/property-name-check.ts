import { dashCase } from '../util';

const vendorPrefixes = ['Webkit', 'Moz', 'ms', 'O'];

export const propertyNameCheck = (key: string): string => {
  if (key.startsWith('-')) return key;
  if (vendorPrefixes.some((prefix) => key.startsWith(prefix))) return `-${dashCase(key)}`;
  return dashCase(key);
};
