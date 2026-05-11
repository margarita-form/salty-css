import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { rm, utimes } from 'fs/promises';
import { join, resolve } from 'path';
import type { Plugin } from 'vite';
import { saltyPlugin } from './index';

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
const VARIABLES_FILE = join(FIXTURE_DIR, 'styles', 'variables.css.ts');
const ANIMATIONS_FILE = join(FIXTURE_DIR, 'styles', 'animations.css.ts');
const CONFIG_FILE = join(FIXTURE_DIR, 'salty.config.ts');
const NON_SALTY_FILE = join(FIXTURE_DIR, 'index.ts');

const asPlugin = (input: ReturnType<typeof saltyPlugin>): Plugin => input as Plugin;
const callLoad = async (plugin: Plugin, file: string) => {
  const load = plugin.load as unknown as (this: unknown, id: string) => Promise<string | undefined>;
  return load.call({}, file);
};
const callBuildStart = async (plugin: Plugin) => {
  const buildStart = plugin.buildStart as unknown as (this: unknown, opts: unknown) => Promise<void>;
  await buildStart.call({}, {});
};
const callWatchChange = async (plugin: Plugin, file: string, event: 'create' | 'update' | 'delete') => {
  const watch = plugin.watchChange as unknown as { handler: (this: unknown, id: string, change: { event: string }) => Promise<void> };
  await watch.handler.call({}, file, { event });
};
const callHotUpdate = async (plugin: Plugin, file: string, server: { restart: () => void }) => {
  const hot = plugin.handleHotUpdate as unknown as (this: unknown, ctx: { file: string; server: { restart: () => void } }) => Promise<void>;
  await hot.call({}, { file, server });
};

describe('saltyPlugin', () => {
  describe('shape', () => {
    it('returns a Vite plugin named "stylegen" with the expected hooks', () => {
      const plugin = asPlugin(saltyPlugin(FIXTURE_DIR));
      expect(plugin.name).toBe('stylegen');
      expect(typeof plugin.buildStart).toBe('function');
      expect(typeof plugin.load).toBe('function');
      expect(typeof plugin.handleHotUpdate).toBe('function');
      expect(plugin.watchChange).toBeTypeOf('object');
      expect(typeof (plugin.watchChange as { handler: unknown }).handler).toBe('function');
    });
  });

  describe('buildStart → saltygen output', () => {
    const plugin = asPlugin(saltyPlugin(FIXTURE_DIR));

    beforeAll(async () => {
      await resetSaltygen();
      await callBuildStart(plugin);
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
      expect(buttonCss, `expected cl_button-*.css in ${listCss().join(', ')}`).toBeDefined();
      const contents = readCss(buttonCss);
      expect(contents).toContain('background');
    });

    it('emits a cl_* file for the className() heading rule', () => {
      const matches = listCss().filter((file) => file.startsWith('cl_') && !file.startsWith('cl_button-'));
      expect(matches.length, `expected a className cl_* css file in ${listCss().join(', ')}`).toBeGreaterThan(0);
    });

    it('emits f_button-styled-*.css when importStrategy is "component"', () => {
      const fButton = findCss('f_button-styled-');
      expect(fButton, `expected f_button-styled-*.css in ${listCss().join(', ')}`).toBeDefined();
    });

    it('emits a_slideIn.css with the % suffix on numeric keyframe stops (regression: bd37e72)', () => {
      const animPath = join(CSS_DIR, 'a_slideIn.css');
      expect(existsSync(animPath)).toBe(true);
      const contents = readFileSync(animPath, 'utf8');
      expect(contents).toMatch(/\b50%\s*\{/);
      expect(contents).not.toMatch(/(^|[^%\d])50\s*\{/m);
    });
  });

  describe('load hook', () => {
    const plugin = asPlugin(saltyPlugin(FIXTURE_DIR));

    beforeAll(async () => {
      await resetSaltygen();
      await callBuildStart(plugin);
    }, 60_000);

    afterAll(async () => {
      await resetSaltygen();
    });

    it('returns undefined for non-salty files', async () => {
      const result = await callLoad(plugin, NON_SALTY_FILE);
      expect(result).toBeUndefined();
    });

    it('rewrites a styled() call to its client-side classNames + clientProps form', async () => {
      const transformed = await callLoad(plugin, BUTTON_FILE);
      expect(transformed, 'load should return a transformed source').toBeTypeOf('string');
      const src = transformed as string;
      expect(src).toMatch(/Button = styled\(['"]?button['"]?, "[^"]+",/);
      expect(src).toContain('@salty-css/react/styled-client');
      expect(src).toContain('{ styledClient as styled }');
      expect(src).toContain("import '../../saltygen/css/f_button-styled-");
    });

    it('rewrites a className() call to a className(string) literal', async () => {
      const transformed = await callLoad(plugin, HEADING_FILE);
      expect(transformed, 'load should return a transformed source').toBeTypeOf('string');
      const src = transformed as string;
      expect(src).toMatch(/headingClass = className\("[^"]+"\)/);
      expect(src).toContain('@salty-css/react/class-name-client');
    });
  });

  describe('watchChange hook', () => {
    const plugin = asPlugin(saltyPlugin(FIXTURE_DIR));

    beforeAll(async () => {
      await resetSaltygen();
      await callBuildStart(plugin);
    }, 60_000);

    afterAll(async () => {
      await resetSaltygen();
    });

    const buttonCssPath = () => {
      const filename = findCss('cl_button-');
      if (!filename) throw new Error(`cl_button-*.css missing; have: ${listCss().join(', ')}`);
      return join(CSS_DIR, filename);
    };

    it('regenerates a styled file on update event', async () => {
      const target = buttonCssPath();
      const past = new Date(Date.now() - 60_000);
      await utimes(target, past, past);
      const mtimeBefore = statSync(target).mtimeMs;

      await callWatchChange(plugin, BUTTON_FILE, 'update');

      const mtimeAfter = statSync(target).mtimeMs;
      expect(mtimeAfter).toBeGreaterThan(mtimeBefore);
    });

    it('is a no-op for delete events', async () => {
      const target = buttonCssPath();
      const mtimeBefore = statSync(target).mtimeMs;

      await callWatchChange(plugin, BUTTON_FILE, 'delete');

      const mtimeAfter = statSync(target).mtimeMs;
      expect(mtimeAfter).toBe(mtimeBefore);
    });

    it('is a no-op for non-salty file paths', async () => {
      const target = buttonCssPath();
      const mtimeBefore = statSync(target).mtimeMs;

      await callWatchChange(plugin, NON_SALTY_FILE, 'update');

      const mtimeAfter = statSync(target).mtimeMs;
      expect(mtimeAfter).toBe(mtimeBefore);
    });
  });

  describe('handleHotUpdate hook', () => {
    const plugin = asPlugin(saltyPlugin(FIXTURE_DIR));

    it('restarts the dev server when salty.config changes', async () => {
      const restart = vi.fn();
      await callHotUpdate(plugin, CONFIG_FILE, { restart });
      expect(restart).toHaveBeenCalledTimes(1);
    });

    it('restarts when a file containing defineVariables changes', async () => {
      const restart = vi.fn();
      await callHotUpdate(plugin, VARIABLES_FILE, { restart });
      expect(restart).toHaveBeenCalledTimes(1);
    });

    it('restarts when a file containing keyframes() changes', async () => {
      const restart = vi.fn();
      await callHotUpdate(plugin, ANIMATIONS_FILE, { restart });
      expect(restart).toHaveBeenCalledTimes(1);
    });

    it('does not restart for a plain styled() file change', async () => {
      const restart = vi.fn();
      await callHotUpdate(plugin, BUTTON_FILE, { restart });
      expect(restart).not.toHaveBeenCalled();
    });
  });
});
