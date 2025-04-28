import { readFile } from 'fs/promises';
import { join } from 'path';
import { getCorePackageRoot } from '../compiler/helpers';

export const resolveDynamicConfigCache = async () => {
  const corePackageRoot = getCorePackageRoot();
  const coreConfigDest = join(corePackageRoot, 'cache/config-cache.json');
  const contents = await readFile(coreConfigDest, 'utf8');
  if (!contents) throw new Error('Could not find config cache file');
  return JSON.parse(contents);
};
