import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { _resetDynamicConfigCacheMemo, resolveDynamicConfigCache } from './resolve-dynamic-config-cache';

const writeCache = (dir: string, contents: object) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'config-cache.json');
  writeFileSync(file, JSON.stringify(contents));
  return file;
};

describe('resolveDynamicConfigCache', () => {
  let root: string;
  const originalEnv = process.env['SALTY_CONFIG_CACHE_PATH'];
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    _resetDynamicConfigCacheMemo();
    root = mkdtempSync(join(tmpdir(), 'salty-cache-'));
    delete process.env['SALTY_CONFIG_CACHE_PATH'];
    // Default to production for tests so the resolver memo is active; individual
    // dev-only tests override this back to 'development'.
    process.env['NODE_ENV'] = 'production';
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    if (originalEnv === undefined) delete process.env['SALTY_CONFIG_CACHE_PATH'];
    else process.env['SALTY_CONFIG_CACHE_PATH'] = originalEnv;
    if (originalNodeEnv === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = originalNodeEnv;
  });

  it('reads from the default saltygen/cache pattern under cwd', async () => {
    writeCache(join(root, 'saltygen', 'cache'), { source: 'default' });
    const result = await resolveDynamicConfigCache({ cwd: root });
    expect(result).toEqual({ source: 'default' });
  });

  it('primaryPath wins over default search patterns', async () => {
    writeCache(join(root, 'saltygen', 'cache'), { source: 'default' });
    const primary = writeCache(join(root, 'custom'), { source: 'primary' });
    const result = await resolveDynamicConfigCache({ cwd: root, primaryPath: primary });
    expect(result).toEqual({ source: 'primary' });
  });

  it('accepts a directory as primaryPath and looks for config-cache.json inside', async () => {
    writeCache(join(root, 'somewhere'), { source: 'primary-dir' });
    const result = await resolveDynamicConfigCache({ cwd: root, primaryPath: 'somewhere' });
    expect(result).toEqual({ source: 'primary-dir' });
  });

  it('falls back to extraPaths when primaryPath is unset', async () => {
    writeCache(join(root, 'extra-loc'), { source: 'extra' });
    const result = await resolveDynamicConfigCache({ cwd: root, extraPaths: ['extra-loc'] });
    expect(result).toEqual({ source: 'extra' });
  });

  it('reads SALTY_CONFIG_CACHE_PATH from env as an implicit primaryPath', async () => {
    const file = writeCache(join(root, 'env-loc'), { source: 'env' });
    process.env['SALTY_CONFIG_CACHE_PATH'] = file;
    const result = await resolveDynamicConfigCache({ cwd: root });
    expect(result).toEqual({ source: 'env' });
  });

  it('looks under dist/saltygen/cache as a default pattern', async () => {
    writeCache(join(root, 'dist', 'saltygen', 'cache'), { source: 'dist' });
    const result = await resolveDynamicConfigCache({ cwd: root });
    expect(result).toEqual({ source: 'dist' });
  });

  it('returns {} when nothing is found', async () => {
    const result = await resolveDynamicConfigCache({ cwd: root });
    expect(result).toEqual({});
  });

  it('memoizes parsed contents per resolved path', async () => {
    const file = writeCache(join(root, 'memo'), { source: 'memo-1' });
    const first = await resolveDynamicConfigCache({ cwd: root, primaryPath: file });
    writeFileSync(file, JSON.stringify({ source: 'memo-2' }));
    const second = await resolveDynamicConfigCache({ cwd: root, primaryPath: file });
    expect(first).toEqual({ source: 'memo-1' });
    expect(second).toEqual({ source: 'memo-1' });
  });

  it('bypasses the memo in dev so rebuilt cache files are picked up', async () => {
    process.env['NODE_ENV'] = 'development';
    const file = writeCache(join(root, 'memo'), { source: 'dev-1' });
    const first = await resolveDynamicConfigCache({ cwd: root, primaryPath: file });
    writeFileSync(file, JSON.stringify({ source: 'dev-2' }));
    const second = await resolveDynamicConfigCache({ cwd: root, primaryPath: file });
    expect(first).toEqual({ source: 'dev-1' });
    expect(second).toEqual({ source: 'dev-2' });
  });

  it('finds the cache via the default dist/cache root expansion', async () => {
    writeCache(join(root, 'dist', 'cache'), { source: 'dist-cache' });
    const result = await resolveDynamicConfigCache({ cwd: root });
    expect(result).toEqual({ source: 'dist-cache' });
  });
});
