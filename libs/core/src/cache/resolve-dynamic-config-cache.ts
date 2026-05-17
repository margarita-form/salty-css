import { readFile } from 'fs/promises';
import { isAbsolute, join } from 'path';

export interface ResolveDynamicConfigCacheOptions {
  /**
   * Highest-priority path checked first. If it resolves, no other paths are tried.
   * Absolute, or relative to `cwd`.
   */
  primaryPath?: string;
  /**
   * Extra paths checked before the built-in defaults. Absolute, or relative to `cwd`.
   */
  extraPaths?: string[];
  /**
   * Base directory for resolving relative paths. Defaults to `process.cwd()`.
   */
  cwd?: string;
}

const CACHE_FILENAME = 'config-cache.json';
const ENV_VAR = 'SALTY_CONFIG_CACHE_PATH';

const defaultPatterns = [
  '',
  'saltygen',
  'src',
  'src/saltygen',
  'cache',
  'src/cache',
  'saltygen/cache',
  'src/saltygen/cache',
  'dist',
  'dist/cache',
  'dist/saltygen/cache',
  'build',
  'build/cache',
  'build/saltygen/cache',
  'public/saltygen/cache',
  '.next',
  '.next/server',
  '.next/server/cache',
  '.vercel/output/functions',
];

const memo = new Map<string, Record<string, unknown>>();
let warned = false;

const toAbsolute = (p: string, cwd: string) => (isAbsolute(p) ? p : join(cwd, p));

const candidatePathsFrom = (entry: string, cwd: string) => {
  const abs = toAbsolute(entry, cwd);
  if (abs.endsWith('.json')) return [abs];
  return [join(abs, CACHE_FILENAME), join(abs, 'cache', CACHE_FILENAME), join(abs, 'saltygen', 'cache', CACHE_FILENAME)];
};

const tryRead = async (path: string): Promise<Record<string, unknown> | undefined> => {
  if (memo.has(path)) return memo.get(path);
  try {
    const contents = await readFile(path, 'utf8');
    if (!contents) return undefined;
    const parsed = JSON.parse(contents) as Record<string, unknown>;
    memo.set(path, parsed);
    return parsed;
  } catch {
    return undefined;
  }
};

export const resolveDynamicConfigCache = async (options: ResolveDynamicConfigCacheOptions = {}): Promise<Record<string, unknown>> => {
  const cwd = options.cwd ?? process.cwd();
  const envPath = typeof process !== 'undefined' ? process.env?.[ENV_VAR] : undefined;

  const ordered: string[] = [];
  if (options.primaryPath) ordered.push(...candidatePathsFrom(options.primaryPath, cwd));
  if (envPath) ordered.push(...candidatePathsFrom(envPath, cwd));
  if (options.extraPaths) for (const p of options.extraPaths) ordered.push(...candidatePathsFrom(p, cwd));
  for (const pattern of defaultPatterns) ordered.push(join(cwd, pattern, CACHE_FILENAME));

  for (const candidate of ordered) {
    const result = await tryRead(candidate);
    if (result) return result;
  }

  if (!warned) {
    warned = true;
    console.warn(`Could not find config cache file (${CACHE_FILENAME}) in any of the expected locations.`);
  }
  return {};
};

/**
 * Clear the in-memory cache of parsed config-cache.json files. Test-only.
 */
export const _resetDynamicConfigCacheMemo = () => {
  memo.clear();
  warned = false;
};
