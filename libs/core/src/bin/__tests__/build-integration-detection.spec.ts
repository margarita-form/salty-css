import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ProjectContext } from '../context';
import {
  astroIntegration,
  buildIntegrationRegistry,
  editAstroConfig,
  editEslintConfig,
  editNextConfig,
  editViteConfig,
  eslintConfigCandidates,
  eslintIntegration,
  nextConfigFiles,
  nextIntegration,
  viteIntegration,
} from '../integrations';

const makeCtx = (projectDir: string): ProjectContext => ({
  rootDir: projectDir,
  projectDir,
  relativeProjectPath: '.',
  packageJson: undefined,
  rcFile: {},
  cliVersion: '0.0.0',
  skipInstall: true,
});

describe('buildIntegrationRegistry', () => {
  it('contains the four expected integrations in deterministic order', () => {
    expect(buildIntegrationRegistry.map((i) => i.name)).toEqual(['eslint', 'vite', 'next', 'astro']);
  });
});

describe('vite integration', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'salty-vite-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('detects vite.config.ts when present', async () => {
    await writeFile(join(dir, 'vite.config.ts'), 'export default {}');
    const path = await viteIntegration.detect(makeCtx(dir));
    expect(path).toBe(join(dir, 'vite.config.ts'));
  });

  it('returns null when no vite.config.ts exists', async () => {
    const path = await viteIntegration.detect(makeCtx(dir));
    expect(path).toBeNull();
  });

  it('editViteConfig injects saltyPlugin into plugins array', () => {
    const input = `import { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [react()] })\n`;
    const { content } = editViteConfig(input);
    expect(content).not.toBeNull();
    expect(content!).toContain("import { saltyPlugin } from '@salty-css/vite';");
    expect(content!).toContain('saltyPlugin(__dirname),');
  });

  it('editViteConfig is a no-op when saltyPlugin is already present', () => {
    const input = `import { saltyPlugin } from '@salty-css/vite';\nexport default defineConfig({ plugins: [saltyPlugin(__dirname)] })`;
    expect(editViteConfig(input).content).toBeNull();
  });
});

describe('next integration', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'salty-next-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('detects every supported next.config extension', async () => {
    for (const file of nextConfigFiles) {
      const target = join(dir, file);
      await writeFile(target, 'module.exports = {}');
      const path = await nextIntegration.detect(makeCtx(dir));
      expect(path).toBe(target);
      await rm(target);
    }
  });

  it('wraps an ESM default export with withSaltyCss', () => {
    const input = `export default { reactStrictMode: true };\n`;
    const { content } = editNextConfig(input);
    expect(content).not.toBeNull();
    expect(content!).toContain("import { withSaltyCss } from '@salty-css/next';");
    expect(content!).toContain('export default withSaltyCss({ reactStrictMode: true })');
  });

  it('wraps a CJS module.exports with withSaltyCss', () => {
    const input = `module.exports = { reactStrictMode: true };\n`;
    const { content } = editNextConfig(input);
    expect(content).not.toBeNull();
    expect(content!).toContain("const { withSaltyCss } = require('@salty-css/next');");
    expect(content!).toContain('module.exports = withSaltyCss({ reactStrictMode: true })');
  });

  it('prepends withSaltyCss to an NX-style plugins array', () => {
    const input = `module.exports = { reactStrictMode: true };\n const plugins = [withNx()];\n`;
    const { content } = editNextConfig(input);
    expect(content).not.toBeNull();
    expect(content!).toContain('= [withSaltyCss,withNx()]');
  });

  it('is a no-op when withSaltyCss is already present', () => {
    const input = `module.exports = withSaltyCss({ reactStrictMode: true });`;
    expect(editNextConfig(input).content).toBeNull();
  });
});

describe('astro integration', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'salty-astro-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('detects astro.config.mjs / .ts / .js / .cjs', async () => {
    for (const file of ['astro.config.mjs', 'astro.config.ts', 'astro.config.js', 'astro.config.cjs']) {
      const target = join(dir, file);
      await writeFile(target, 'export default {}');
      const path = await astroIntegration.detect(makeCtx(dir));
      expect(path).toBe(target);
      await rm(target);
    }
  });

  it('returns null when no astro config exists', async () => {
    const path = await astroIntegration.detect(makeCtx(dir));
    expect(path).toBeNull();
  });

  it('editAstroConfig adds saltyIntegration to an existing integrations array', () => {
    const input = `import { defineConfig } from 'astro/config';\nexport default defineConfig({\n  integrations: [react()],\n});\n`;
    const { content, warning } = editAstroConfig(input);
    expect(warning).toBeUndefined();
    expect(content).not.toBeNull();
    expect(content!).toContain("import saltyIntegration from '@salty-css/astro/integration';");
    expect(content!).toContain('saltyIntegration()');
    expect(content!).toContain('react()');
  });

  it('editAstroConfig injects an integrations array when none exists', () => {
    const input = `import { defineConfig } from 'astro/config';\nexport default defineConfig({\n  site: 'https://example.com',\n});\n`;
    const { content, warning } = editAstroConfig(input);
    expect(warning).toBeUndefined();
    expect(content).not.toBeNull();
    expect(content!).toContain('integrations: [saltyIntegration()]');
  });

  it('editAstroConfig is a no-op when @salty-css/astro is already imported', () => {
    const input = `import saltyIntegration from '@salty-css/astro/integration';\nexport default defineConfig({ integrations: [saltyIntegration()] })`;
    expect(editAstroConfig(input).content).toBeNull();
  });

  it('editAstroConfig warns when no insertion point is found', () => {
    const input = `// not a recognized astro config\n`;
    const result = editAstroConfig(input);
    expect(result.content).toBeNull();
    expect(result.warning).toMatch(/Could not find/);
  });
});

describe('eslint integration', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'salty-eslint-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('lists 6 candidate paths (project + root × js/mjs/json)', () => {
    const candidates = eslintConfigCandidates(dir, dir);
    expect(candidates).toHaveLength(6);
  });

  it('detects an eslint.config.mjs file', async () => {
    const target = join(dir, 'eslint.config.mjs');
    await writeFile(target, 'export default []');
    const path = await eslintIntegration.detect(makeCtx(dir));
    expect(path).toBe(target);
  });

  it('returns null when no eslint config exists', async () => {
    expect(await eslintIntegration.detect(makeCtx(dir))).toBeNull();
  });

  it('editEslintConfig (flat js) prepends saltyCss when `export default [` is present', () => {
    const input = `export default [\n  { rules: {} },\n];\n`;
    const { content, warning } = editEslintConfig(input, true);
    expect(warning).toBeUndefined();
    expect(content).not.toBeNull();
    expect(content!).toContain('import saltyCss from "@salty-css/eslint-config-core/flat";');
    expect(content!).toContain('export default [ saltyCss,');
  });

  it('editEslintConfig (json) appends @salty-css/core to extends', () => {
    const input = JSON.stringify({ extends: ['other'] });
    const { content } = editEslintConfig(input, false);
    expect(content).not.toBeNull();
    const parsed = JSON.parse(content!);
    expect(parsed.extends).toEqual(['other', '@salty-css/core']);
  });

  it('editEslintConfig is a no-op when salty-css is already configured', () => {
    expect(editEslintConfig('export default [/* salty-css */]', true).content).toBeNull();
    expect(editEslintConfig('{"extends":["@salty-css/core"]}', false).content).toBeNull();
  });
});
