import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { HmrContext, ModuleNode } from 'vite';
import type { SaltyCompiler } from '@salty-css/core/compiler/salty-compiler';
import { handleHotUpdate, watchChange } from './watch-handlers';

const createCompiler = () =>
  ({
    generateCss: vi.fn(async () => undefined),
    generateFile: vi.fn(async () => undefined),
    getDestDir: vi.fn(async () => '/project/src/saltygen'),
  }) as unknown as SaltyCompiler & { generateCss: ReturnType<typeof vi.fn>; generateFile: ReturnType<typeof vi.fn> };

const createHmrContext = (file: string, ids: string[]) => {
  const mods = new Map(ids.map((id) => [id, { id } as ModuleNode]));
  const invalidateModule = vi.fn();
  const context = {
    file,
    modules: [],
    server: {
      moduleGraph: { idToModuleMap: mods, urlToModuleMap: new Map(), invalidateModule },
      ws: { send: vi.fn() },
    },
  } as unknown as HmrContext;
  return { context, invalidateModule };
};

describe('watch handlers', () => {
  let dir: string;
  let plainFile: string;
  let keyframesFile: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'salty-astro-watch-'));
    plainFile = join(dir, 'plain.css.ts');
    keyframesFile = join(dir, 'animated.css.ts');
    await writeFile(plainFile, `export const Box = styled('div', { base: { color: 'red' } });\n`);
    await writeFile(keyframesFile, `export const fade = keyframes({ from: { opacity: 0 } });\nexport const Box = styled('div', { base: { color: 'red' } });\n`);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('invalidates only the changed file config for a plain salty file', async () => {
    const compiler = createCompiler();
    const own = `${plainFile}.astro?configFile=abc.config`;
    const other = `${keyframesFile}.astro?configFile=def.config`;
    const { context, invalidateModule } = createHmrContext(plainFile, [own, other]);

    const result = await handleHotUpdate(compiler, context);

    expect(compiler.generateCss).not.toHaveBeenCalled();
    expect(invalidateModule).toHaveBeenCalledTimes(1);
    expect(result?.map((mod: ModuleNode) => mod.id)).toEqual([own]);
  });

  it('regenerates css and invalidates all component configs for a file that requires a full rebuild', async () => {
    const compiler = createCompiler();
    const own = `${keyframesFile}.astro?configFile=def.config`;
    const other = `${plainFile}.astro?configFile=abc.config`;
    const { context, invalidateModule } = createHmrContext(keyframesFile, [own, other, '/project/src/page.astro']);

    const result = await handleHotUpdate(compiler, context);

    expect(compiler.generateCss).toHaveBeenCalledWith(false);
    expect(invalidateModule).toHaveBeenCalledTimes(2);
    expect(result?.map((mod: ModuleNode) => mod.id)).toEqual([own, other]);
  });

  it('generates css for a newly created file that requires a full rebuild', async () => {
    const compiler = createCompiler();

    await watchChange(compiler, keyframesFile, { event: 'create' });

    expect(compiler.generateCss).toHaveBeenCalledWith(false);
    expect(compiler.generateFile).not.toHaveBeenCalled();
  });

  it('leaves edits of a file that requires a full rebuild to handleHotUpdate', async () => {
    const compiler = createCompiler();

    await watchChange(compiler, keyframesFile, { event: 'update' });

    expect(compiler.generateCss).not.toHaveBeenCalled();
    expect(compiler.generateFile).not.toHaveBeenCalled();
  });
});
