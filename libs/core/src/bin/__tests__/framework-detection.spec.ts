import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ProjectContext } from '../context';
import { astroFramework, detectFramework, frameworksByName, getFramework, reactFramework } from '../frameworks';

const makeCtx = (overrides: Partial<ProjectContext>): ProjectContext => ({
  rootDir: overrides.projectDir ?? '/tmp',
  projectDir: overrides.projectDir ?? '/tmp',
  relativeProjectPath: '.',
  packageJson: undefined,
  rcFile: {},
  cliVersion: '0.0.0',
  skipInstall: true,
  ...overrides,
});

describe('framework registry', () => {
  it('exposes react and astro adapters by name', () => {
    expect(frameworksByName.react).toBe(reactFramework);
    expect(frameworksByName.astro).toBe(astroFramework);
  });

  it('getFramework returns undefined for unknown names', () => {
    expect(getFramework(undefined)).toBeUndefined();
    expect(getFramework('vue')).toBeUndefined();
    expect(getFramework('react')).toBe(reactFramework);
    expect(getFramework('astro')).toBe(astroFramework);
  });

  it('reactFramework runtime package is @salty-css/react', () => {
    expect(reactFramework.runtimePackage('1.2.3')).toBe('@salty-css/react@1.2.3');
  });

  it('astroFramework runtime package is @salty-css/astro', () => {
    expect(astroFramework.runtimePackage('1.2.3')).toBe('@salty-css/astro@1.2.3');
  });

  it('react templates do not include a wrapper component for astro (and vice versa)', () => {
    expect(reactFramework.templates.component?.wrapperExt).toBe('.tsx');
    expect(astroFramework.templates.component?.wrapperExt).toBe('.astro');
  });
});

describe('detectFramework', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'salty-fw-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns react when no astro signals are present', async () => {
    const ctx = makeCtx({ projectDir: dir });
    const adapter = await detectFramework(ctx);
    expect(adapter.name).toBe('react');
  });

  it('returns astro when an astro.config.mjs is present', async () => {
    await writeFile(join(dir, 'astro.config.mjs'), 'export default {}');
    const ctx = makeCtx({ projectDir: dir });
    const adapter = await detectFramework(ctx);
    expect(adapter.name).toBe('astro');
  });

  it('returns astro when astro.config.ts is present', async () => {
    await writeFile(join(dir, 'astro.config.ts'), 'export default {}');
    const ctx = makeCtx({ projectDir: dir });
    const adapter = await detectFramework(ctx);
    expect(adapter.name).toBe('astro');
  });

  it('returns astro when package.json declares an astro dependency', async () => {
    const ctx = makeCtx({
      projectDir: dir,
      packageJson: { dependencies: { astro: '^5.0.0' } },
    });
    const adapter = await detectFramework(ctx);
    expect(adapter.name).toBe('astro');
  });

  it('astro detection wins when both react and astro signals exist', async () => {
    await writeFile(join(dir, 'astro.config.mjs'), 'export default {}');
    const ctx = makeCtx({
      projectDir: dir,
      packageJson: { dependencies: { react: '^18.0.0', astro: '^5.0.0' } },
    });
    const adapter = await detectFramework(ctx);
    expect(adapter.name).toBe('astro');
  });
});
