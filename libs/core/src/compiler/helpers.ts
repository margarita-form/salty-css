import { join } from 'path';

export const getCorePackageRoot = () => {
  let { pathname } = new URL(import.meta.url);
  while (/core\/?(src\/)?$/.test(pathname) === false) {
    pathname = join(pathname, '../');
  }
  return pathname;
};

export const resolveValue = async <T>(value: unknown, maxLevel = 10, _level = 0): Promise<T> => {
  if (_level >= maxLevel) return value as T;
  if (value instanceof Promise) return await resolveValue(await value, _level + 1, maxLevel);
  if (typeof value === 'function') return await resolveValue(await value(), _level + 1, maxLevel);
  return value as T;
};
