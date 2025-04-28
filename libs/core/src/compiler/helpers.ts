import { join } from 'path';

export const getCorePackageRoot = () => {
  let { pathname } = new URL(import.meta.url);
  while (/core\/?(src\/)?$/.test(pathname) === false) {
    pathname = join(pathname, '../');
  }
  return pathname;
};
