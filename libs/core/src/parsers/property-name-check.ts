import { dashCase } from '../util';

const vendorPrefixes = ['Webkit', 'Moz', 'ms', 'O'];

const isVendorPrefixed = (key: string): boolean => {
  return vendorPrefixes.some((prefix) => {
    if (!key.startsWith(prefix)) return false;
    const next = key.charAt(prefix.length);
    return next >= 'A' && next <= 'Z';
  });
};

export const propertyNameCheck = (key: string): string => {
  if (key.startsWith('-')) return key;
  if (isVendorPrefixed(key)) return `-${dashCase(key)}`;
  return dashCase(key);
};
