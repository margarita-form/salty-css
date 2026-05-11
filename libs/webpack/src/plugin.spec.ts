import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { rm } from 'fs/promises';
import { join, resolve } from 'path';
import type { Configuration } from 'webpack';

// The plugin's beforeCompile hook starts a recursive fs.watch on the project
// dir. Without this stub the watcher would leak across tests and hang vitest.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return { ...actual, default: actual, watch: vi.fn(() => ({ close: vi.fn() })) };
});

import { saltyPlugin } from './index';
import loader from './loader';

const FIXTURE_DIR = resolve(__dirname, '..', 'test', 'fixtures', 'basic');
const SALTYGEN_DIR = join(FIXTURE_DIR, 'saltygen');
const CSS_DIR = join(SALTYGEN_DIR, 'css');

const resetSaltygen = async () => {
  if (existsSync(SALTYGEN_DIR)) await rm(SALTYGEN_DIR, { recursive: true, force: true });
};

const listCss = () => (existsSync(CSS_DIR) ? readdirSync(CSS_DIR) : []);
const findCss = (prefix: string) => listCss().find((file) => file.startsWith(prefix));
const readCss = (filename: string) => readFileSync(join(CSS_DIR, filename), 'utf8');

const BUTTON_FILE = join(FIXTURE_DIR, 'components', 'button', 'button.styled.ts');
const HEADING_FILE = join(FIXTURE_DIR, 'components', 'heading', 'heading.css.ts');
const NON_SALTY_FILE = join(FIXTURE_DIR, 'index.ts');

const makeConfig = (): Configuration => ({
  module: { rules: [] },
  plugins: [],
});

interface CapturedHook {
  cb: (() => Promise<void>) | undefined;
}
const makeMockCompiler = (captured: CapturedHook) => ({
  hooks: {
    beforeCompile: {
      tapPromise: (_opts: unknown, cb: () => Promise<void>) => {
        captured.cb = cb;
      },
    },
  },
});

describe('saltyPlugin (webpack)', () => {
  describe('shape', () => {
    it('pushes a loader rule with the salty file matcher and dir option', () => {
      const config = makeConfig();
      saltyPlugin(config, FIXTURE_DIR);
      const rules = config.module!.rules!;
      expect(rules.length).toBe(1);
      const rule = rules[0] as { test: RegExp; use: Array<{ loader: string; options: { dir: string } }> };
      expect(rule.test).toBeInstanceOf(RegExp);
      expect(rule.test.test('foo.styled.ts')).toBe(true);
      expect(rule.test.test('foo.css.ts')).toBe(true);
      expect(rule.test.test('foo.ts')).toBe(false);
      expect(rule.use[0].loader).toMatch(/loader\.js$/);
      expect(rule.use[0].options.dir).toBe(FIXTURE_DIR);
    });

    it('pushes a webpack plugin with apply() for client builds', () => {
      const config = makeConfig();
      saltyPlugin(config, FIXTURE_DIR, false);
      expect(config.plugins!.length).toBe(1);
      const plugin = config.plugins![0] as { apply: unknown };
      expect(typeof plugin.apply).toBe('function');
    });

    it('does not push a plugin when isServer is true (loader still pushed)', () => {
      const config = makeConfig();
      saltyPlugin(config, FIXTURE_DIR, true);
      expect(config.module!.rules!.length).toBe(1);
      expect(config.plugins!.length).toBe(0);
    });

    it('uses loader.cjs when cjs flag is true', () => {
      const config = makeConfig();
      saltyPlugin(config, FIXTURE_DIR, false, true);
      const rule = config.module!.rules![0] as { use: Array<{ loader: string }> };
      expect(rule.use[0].loader).toMatch(/loader\.cjs$/);
    });
  });

  describe('beforeCompile → saltygen output', () => {
    beforeAll(async () => {
      await resetSaltygen();
      const config = makeConfig();
      saltyPlugin(config, FIXTURE_DIR);
      const plugin = config.plugins![0] as { apply: (compiler: unknown) => void };
      const captured: CapturedHook = { cb: undefined };
      plugin.apply(makeMockCompiler(captured));
      if (!captured.cb) throw new Error('beforeCompile hook was not registered');
      await captured.cb();
    }, 60_000);

    afterAll(async () => {
      await resetSaltygen();
    });

    it('writes the master index.css with @layer declarations and imports', () => {
      const indexPath = join(SALTYGEN_DIR, 'index.css');
      expect(existsSync(indexPath)).toBe(true);
      const contents = readFileSync(indexPath, 'utf8');
      expect(contents).toMatch(/@layer\b/);
      expect(contents).toMatch(/@import/);
    });

    it('emits variables CSS with --color-primary mapped to #f00', () => {
      const variablesPath = join(CSS_DIR, '_variables.css');
      expect(existsSync(variablesPath)).toBe(true);
      const contents = readFileSync(variablesPath, 'utf8');
      expect(contents).toContain('--color-primary');
      expect(contents).toContain('#f00');
    });

    it('emits a cl_* file for the styled() Button component', () => {
      const buttonCss = findCss('cl_button-');
      if (!buttonCss) throw new Error(`cl_button-*.css missing; have: ${listCss().join(', ')}`);
      expect(readCss(buttonCss)).toContain('background');
    });

    it('emits a cl_* file for the className() heading rule', () => {
      const matches = listCss().filter((file) => file.startsWith('cl_') && !file.startsWith('cl_button-'));
      expect(matches.length, `expected a className cl_* css file in ${listCss().join(', ')}`).toBeGreaterThan(0);
    });

    it('emits f_button-styled-*.css when importStrategy is "component"', () => {
      const fButton = findCss('f_button-styled-');
      expect(fButton, `expected f_button-styled-*.css in ${listCss().join(', ')}`).toBeDefined();
    });

    it('emits a_slideIn.css with the % suffix on numeric keyframe stops', () => {
      const animPath = join(CSS_DIR, 'a_slideIn.css');
      expect(existsSync(animPath)).toBe(true);
      const contents = readFileSync(animPath, 'utf8');
      expect(contents).toMatch(/\b50%\s*\{/);
      expect(contents).not.toMatch(/(^|[^%\d])50\s*\{/m);
    });
  });

  describe('loader', () => {
    beforeAll(async () => {
      await resetSaltygen();
      const config = makeConfig();
      saltyPlugin(config, FIXTURE_DIR);
      const plugin = config.plugins![0] as { apply: (compiler: unknown) => void };
      const captured: CapturedHook = { cb: undefined };
      plugin.apply(makeMockCompiler(captured));
      await captured.cb!();
    }, 60_000);

    afterAll(async () => {
      await resetSaltygen();
    });

    const callLoader = async (resourcePath: string) => {
      const ctx = { getOptions: () => ({ dir: FIXTURE_DIR }), resourcePath };
      return (loader as unknown as (this: unknown) => Promise<string | undefined>).call(ctx);
    };

    it('rewrites a styled() call to its client-side classNames + clientProps form', async () => {
      const out = await callLoader(BUTTON_FILE);
      expect(out, 'loader should return transformed source').toBeTypeOf('string');
      const src = out as string;
      expect(src).toMatch(/Button = styled\(['"]?button['"]?, "[^"]+",/);
      expect(src).toContain('@salty-css/react/styled-client');
      expect(src).toContain('{ styledClient as styled }');
      expect(src).toContain("import '../../saltygen/css/f_button-styled-");
    });

    it('rewrites a className() call to a className(string) literal', async () => {
      const out = await callLoader(HEADING_FILE);
      expect(out, 'loader should return transformed source').toBeTypeOf('string');
      const src = out as string;
      expect(src).toMatch(/headingClass = className\("[^"]+"\)/);
      expect(src).toContain('@salty-css/react/class-name-client');
    });

    it('returns undefined for non-salty files', async () => {
      const out = await callLoader(NON_SALTY_FILE);
      expect(out).toBeUndefined();
    });
  });
});
