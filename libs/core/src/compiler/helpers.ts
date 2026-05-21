import { join } from 'path';

export const getCorePackageRoot = () => {
  let { pathname } = new URL(import.meta.url);
  while (/core\/?(src\/)?$/.test(pathname) === false) {
    pathname = join(pathname, '../');
  }
  return pathname;
};

export const resolveExportValue = async <T>(value: unknown, maxLevel = 10, _level = 0): Promise<T> => {
  if (_level >= maxLevel) return value as T;
  if (value instanceof Promise) return await resolveExportValue(await value, _level + 1, maxLevel);
  if (typeof value === 'function' && '_shouldResolve' in value) return await resolveExportValue(await value(), _level + 1, maxLevel);
  return value as T;
};

export const saltyFileExtensions = ['salty', 'css', 'styles', 'styled'];
export const tsFileExtensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'];

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const saltyFileRegExp = (additional: string[] = [], testExtension = true) => {
  const extensions = [...saltyFileExtensions, ...additional].map(escapeRegExp).join('|');
  if (testExtension) {
    return new RegExp(`\\.(${extensions})\\.(${tsFileExtensions.map(escapeRegExp).join('|')})$`);
  }
  return new RegExp(`\\.(${extensions})\\.`);
};

export const isSaltyFile = (file: string, additional: string[] = [], testExtension = true) => saltyFileRegExp(additional, testExtension).test(file);
