import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateCssMock = vi.fn();
const generateFileMock = vi.fn();
const compilerCtorMock = vi.fn();

vi.mock('@salty-css/core/compiler/salty-compiler', () => ({
  SaltyCompiler: vi.fn().mockImplementation((dir: string, opts: Record<string, unknown>) => {
    compilerCtorMock(dir, opts);
    return {
      generateCss: generateCssMock,
      generateFile: generateFileMock,
    };
  }),
}));

vi.mock('@salty-css/core/server', () => ({
  checkShouldRestart: vi.fn(async () => false),
}));

vi.mock('fs', () => ({
  watch: vi.fn(),
}));

import { buildSaltyTurbopackRules } from './detect-bundler';
import { __resetSaltyTurbopackRuntimeForTests, withSaltyTurbopack } from './with-salty-turbopack';

describe('buildSaltyTurbopackRules', () => {
  it('emits .ts and .tsx rules for every salty extension', () => {
    const rules = buildSaltyTurbopackRules('/x');
    const expectedExts = ['salty', 'css', 'styles', 'styled'];
    for (const ext of expectedExts) {
      expect(rules[`*.${ext}.ts`]).toEqual({ loaders: [{ loader: '@salty-css/webpack/loader', options: { dir: '/x', mode: undefined } }], as: '*.ts' });
      expect(rules[`*.${ext}.tsx`]).toEqual({ loaders: [{ loader: '@salty-css/webpack/loader', options: { dir: '/x', mode: undefined } }], as: '*.tsx' });
    }
    expect(Object.keys(rules)).toHaveLength(expectedExts.length * 2);
  });

  it('threads mode into loader options', () => {
    const rules = buildSaltyTurbopackRules('/x', 'production');
    expect(rules['*.salty.ts'].loaders[0].options).toEqual({ dir: '/x', mode: 'production' });
  });
});

describe('withSaltyTurbopack', () => {
  beforeEach(() => {
    generateCssMock.mockReset();
    generateCssMock.mockResolvedValue(undefined);
    generateFileMock.mockReset();
    compilerCtorMock.mockReset();
    __resetSaltyTurbopackRuntimeForTests();
  });

  afterEach(() => {
    __resetSaltyTurbopackRuntimeForTests();
  });

  it('merges salty rules into nextConfig.turbopack.rules without clobbering user rules', () => {
    const userRule = { loaders: [{ loader: 'other', options: {} }], as: '*.ts' };
    const result = withSaltyTurbopack(
      { turbopack: { rules: { '*.foo': userRule } }, reactStrictMode: true },
      { dir: '/x' },
    );
    expect(result.reactStrictMode).toBe(true);
    expect(result.turbopack.rules['*.foo']).toBe(userRule);
    expect(result.turbopack.rules['*.salty.ts']).toBeDefined();
  });

  it('does not mutate the input config', () => {
    const input = { turbopack: { rules: {} } };
    const result = withSaltyTurbopack(input, { dir: '/x' });
    expect(result).not.toBe(input);
    expect(input.turbopack.rules).toEqual({});
  });

  it('uses options.dir > nextConfig.turbopack.root > process.cwd() for the runtime dir', () => {
    withSaltyTurbopack({ turbopack: { root: '/from-config' } }, { dir: '/from-opts' });
    expect(compilerCtorMock).toHaveBeenLastCalledWith('/from-opts', { mode: undefined });

    __resetSaltyTurbopackRuntimeForTests();
    compilerCtorMock.mockClear();
    withSaltyTurbopack({ turbopack: { root: '/from-config' } }, {});
    expect(compilerCtorMock).toHaveBeenLastCalledWith('/from-config', { mode: undefined });

    __resetSaltyTurbopackRuntimeForTests();
    compilerCtorMock.mockClear();
    withSaltyTurbopack({}, {});
    expect(compilerCtorMock).toHaveBeenLastCalledWith(process.cwd(), { mode: undefined });
  });

  it('initializes the compiler and calls generateCss on first call', () => {
    withSaltyTurbopack({}, { dir: '/x', mode: 'development' });
    expect(compilerCtorMock).toHaveBeenCalledTimes(1);
    expect(compilerCtorMock).toHaveBeenCalledWith('/x', { mode: 'development' });
    expect(generateCssMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-construct the compiler for repeat calls with the same (dir, mode)', () => {
    withSaltyTurbopack({}, { dir: '/x', mode: 'development' });
    withSaltyTurbopack({}, { dir: '/x', mode: 'development' });
    expect(compilerCtorMock).toHaveBeenCalledTimes(1);
    expect(generateCssMock).toHaveBeenCalledTimes(1);
  });

  it('re-initializes after __resetSaltyTurbopackRuntimeForTests', () => {
    withSaltyTurbopack({}, { dir: '/x' });
    __resetSaltyTurbopackRuntimeForTests();
    withSaltyTurbopack({}, { dir: '/x' });
    expect(compilerCtorMock).toHaveBeenCalledTimes(2);
  });

  it('treats different modes as separate runtimes', () => {
    withSaltyTurbopack({}, { dir: '/x', mode: 'development' });
    withSaltyTurbopack({}, { dir: '/x', mode: 'production' });
    expect(compilerCtorMock).toHaveBeenCalledTimes(2);
  });
});
