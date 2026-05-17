import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { _resetDynamicConfigCacheMemo } from '../cache/resolve-dynamic-config-cache';
import { getDynamicStylesClassName, initializeDynamicStyles } from './dynamic-styles';

const writeCache = (dir: string, contents: object) => {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'config-cache.json');
  writeFileSync(file, JSON.stringify(contents));
  return file;
};

describe('getDynamicStylesClassName', () => {
  it('hashes the styles object', () => {
    const className = getDynamicStylesClassName({ color: 'red' });
    expect(className).toBeTypeOf('string');
    expect(className.length).toBeGreaterThan(0);
    expect(getDynamicStylesClassName({ color: 'red' })).toBe(className);
  });
});

describe('initializeDynamicStyles', () => {
  let root: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetDynamicConfigCacheMemo();
    root = mkdtempSync(join(tmpdir(), 'salty-dynamic-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(root) as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    rmSync(root, { recursive: true, force: true });
  });

  it('returns helpers that produce scoped CSS using the resolved config', async () => {
    writeCache(join(root, 'saltygen', 'cache'), {});
    const { getDynamicStylesCss } = initializeDynamicStyles();
    const css = await getDynamicStylesCss({ color: 'red' }, '.x');
    expect(css.replace(/\s/g, '')).toContain('.x{color:red;}');
  });

  it('honors a pre-loaded config option and never touches fs', async () => {
    const { getDynamicStylesCss } = initializeDynamicStyles({ config: { staticVariables: {} } });
    const css = await getDynamicStylesCss({ background: 'blue' }, '.y');
    expect(css.replace(/\s/g, '')).toContain('.y{background:blue;}');
  });

  it('uses configCachePath to find the cache file', async () => {
    const file = writeCache(join(root, 'somewhere-else'), {});
    const { getDynamicStylesCss } = initializeDynamicStyles({ configCachePath: file });
    const css = await getDynamicStylesCss({ margin: '8px' }, '.z');
    expect(css.replace(/\s/g, '')).toContain('.z{margin:8px;}');
  });
});
