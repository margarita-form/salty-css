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

const defaultRoots = ['', 'src', 'dist', 'build', 'public', '.next', '.next/server', '.vercel/output/functions'];

const memo = new Map<string, Record<string, unknown> | null>();
let warned = false;

const isProduction = () => {
  try {
    return process.env['NODE_ENV'] === 'production';
  } catch {
    return false;
  }
};

const toAbsolute = (p: string, cwd: string) => (isAbsolute(p) ? p : join(cwd, p));

const candidatePathsFrom = (entry: string, cwd: string) => {
  const abs = toAbsolute(entry, cwd);
  if (abs.endsWith('.json')) return [abs];
  return [join(abs, CACHE_FILENAME), join(abs, 'cache', CACHE_FILENAME), join(abs, 'saltygen', 'cache', CACHE_FILENAME)];
};

const tryRead = async (path: string): Promise<Record<string, unknown> | undefined> => {
  const useMemo = isProduction();
  if (useMemo && memo.has(path)) return memo.get(path) ?? undefined;
  try {
    const contents = await readFile(path, 'utf8');
    if (!contents) {
      if (useMemo) memo.set(path, null);
      return undefined;
    }
    const parsed = JSON.parse(contents) as Record<string, unknown>;
    if (useMemo) memo.set(path, parsed);
    return parsed;
  } catch {
    if (useMemo) memo.set(path, null);
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
  for (const root of defaultRoots) ordered.push(...candidatePathsFrom(root, cwd));

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
