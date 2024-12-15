import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const getSaltyRcPath = (dirname: string): string => {
  if (!dirname || dirname === '/') throw new Error('Could not find .saltyrc.json file');
  const rcPath = join(dirname, '.saltyrc.json');
  if (!existsSync(rcPath)) return getSaltyRcPath(join(dirname, '..'));
  return rcPath;
};

export const getPackageJsonPath = (dirname: string): string => {
  if (!dirname || dirname === '/') throw new Error('Could not find package.json file');
  const packageJsonPath = join(dirname, 'package.json');
  if (!existsSync(packageJsonPath)) return getPackageJsonPath(join(dirname, '..'));
  return packageJsonPath;
};

export const getPackageJson = async (dirname: string) => {
  const packageJsonPath = getPackageJsonPath(dirname);
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
    .then(JSON.parse)
    .catch(() => undefined);

  return packageJsonContent;
};
