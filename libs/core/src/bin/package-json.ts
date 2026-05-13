import { PathLike } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

export const defaultPackageJsonPath = join(process.cwd(), 'package.json');

export interface PackageJson {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export const readPackageJson = async (filePath: PathLike = defaultPackageJsonPath): Promise<PackageJson> => {
  const content = await readFile(filePath, 'utf-8')
    .then(JSON.parse)
    .catch(() => undefined);
  if (!content) throw 'Could not read package.json file!';
  return content;
};

export const updatePackageJson = async (content: string | object, filePath: PathLike = defaultPackageJsonPath) => {
  if (typeof content === 'object') content = JSON.stringify(content, null, 2);
  await writeFile(filePath, content);
};

export const readThisPackageJson = async (): Promise<PackageJson> => {
  const packageJsonPath = new URL('../package.json', import.meta.url);
  return readPackageJson(packageJsonPath);
};

export const corePackages = {
  core: (version: string) => `@salty-css/core@${version}`,
  eslintConfigCore: (version: string) => `@salty-css/eslint-config-core@${version}`,
};

export const addPrepareScript = (pkg: PackageJson): { changed: boolean; pkg: PackageJson } => {
  if (!pkg.scripts) pkg.scripts = {};
  const current = pkg.scripts['prepare'];
  if (current) {
    if (current.includes('salty-css')) return { changed: false, pkg };
    pkg.scripts['prepare'] = current + ' && npx salty-css build';
  } else {
    pkg.scripts['prepare'] = 'npx salty-css build';
  }
  return { changed: true, pkg };
};
