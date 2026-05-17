import { copyFile, mkdir } from 'fs/promises';
import { dirname, isAbsolute, join, resolve } from 'path';
import { logger } from '../bin/logger';
import { SaltyCompiler } from './salty-compiler';

/**
 * `copyConfigCache` plugin option:
 * - `true`  → copy to the bundler's resolved output dir (default).
 * - `false` → no-op.
 * - `string | string[]` → copy to the default destination PLUS each listed path.
 *
 * Each path can be a directory (the file is written as `saltygen/cache/config-cache.json` inside)
 * or a path ending in `.json` (used verbatim).
 */
export type CopyConfigCacheOption = boolean | string | string[];

const DEFAULT_SUBPATH = join('saltygen', 'cache', 'config-cache.json');

export const resolveCopyConfigCacheDestinations = (
  option: CopyConfigCacheOption | undefined,
  defaultOutDir: string | undefined,
  cwd: string = process.cwd()
): string[] => {
  if (option === false) return [];

  const userPaths: string[] = [];
  if (typeof option === 'string') userPaths.push(option);
  else if (Array.isArray(option)) userPaths.push(...option);

  const destinations: string[] = [];
  const useDefault = option === undefined || option === true;
  if (useDefault && defaultOutDir) destinations.push(defaultOutDir);
  destinations.push(...userPaths);

  return destinations.map((entry) => {
    const abs = isAbsolute(entry) ? entry : resolve(cwd, entry);
    if (abs.endsWith('.json')) return abs;
    return join(abs, DEFAULT_SUBPATH);
  });
};

/**
 * Copy the compiler's `config-cache.json` to each absolute destination path.
 * Creates parent directories as needed; silently skips destinations equal to the source.
 */
export const copyConfigCacheTo = async (compiler: SaltyCompiler, destinations: string[]): Promise<void> => {
  if (destinations.length === 0) return;
  const source = await compiler.getConfigCachePath();

  await Promise.all(
    destinations.map(async (destination) => {
      if (destination === source) return;
      try {
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(source, destination);
        logger.info(`Copied Salty config cache → ${destination}`);
      } catch (error) {
        logger.warn(`Failed to copy Salty config cache to ${destination}: ${(error as Error).message}`);
      }
    })
  );
};
