import { join, relative } from 'path';
import { RCFile } from '../types/cli-types';
import { PackageJson, readPackageJson, readThisPackageJson } from './package-json';
import { readRc } from './saltyrc';

export interface ProjectContext {
  rootDir: string;
  projectDir: string;
  relativeProjectPath: string;
  packageJson?: PackageJson;
  rcFile: RCFile;
  cliVersion: string;
  skipInstall: boolean;
}

export const resolveProjectDir = (dir: string, rootDir: string = process.cwd()) => {
  const dirName = dir === '.' ? '' : dir;
  return join(rootDir, dirName);
};

export interface BuildContextOptions {
  dir: string;
  skipInstall?: boolean;
  /** When false, build context even if package.json is missing (used by commands that should not require one). */
  requirePackageJson?: boolean;
}

export const buildContext = async (opts: BuildContextOptions): Promise<ProjectContext> => {
  const rootDir = process.cwd();
  const projectDir = resolveProjectDir(opts.dir, rootDir);
  const relativeProjectPath = relative(rootDir, projectDir) || '.';

  const packageJson = await readPackageJson().catch(() => undefined);
  if (opts.requirePackageJson !== false && !packageJson) {
    throw new Error('Salty CSS project must be initialized in a directory with a package.json file.');
  }

  const rcFile = await readRc(rootDir);
  const cliPackageJson = await readThisPackageJson();

  return {
    rootDir,
    projectDir,
    relativeProjectPath,
    packageJson,
    rcFile,
    cliVersion: cliPackageJson.version || '0.0.0',
    skipInstall: !!opts.skipInstall,
  };
};
