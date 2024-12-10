import { getPackageJson } from '../compiler/get-files';

const readPackageJsonModule = async (dirname: string) => {
  const packageJsonContent = await getPackageJson(dirname);
  if (!packageJsonContent) return undefined;
  return packageJsonContent.type as 'module' | 'commonjs';
};

// Detect the current module type (esmodule or commonjs) based on file extension
let cachedModuleType: 'esm' | 'cjs' | undefined;
export const detectCurrentModuleType = async (dirname: string) => {
  if (cachedModuleType) return cachedModuleType;
  const packageJsonModule = await readPackageJsonModule(dirname);
  if (packageJsonModule === 'module') cachedModuleType = 'esm';
  else if (packageJsonModule === 'commonjs') cachedModuleType = 'cjs';
  else if (import.meta.url.endsWith('.cjs')) cachedModuleType = 'cjs';
  return cachedModuleType || 'esm';
};
