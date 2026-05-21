import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@salty-css/webpack', () => ({ saltyPlugin: vi.fn() }));
vi.mock('./with-salty-turbopack', () => ({
  withSaltyTurbopack: vi.fn((cfg, opts) => ({ ...cfg, __turbopackCalled: true, __turbopackOpts: opts })),
}));

import { saltyPlugin } from '@salty-css/webpack';
import { withSaltyTurbopack } from './with-salty-turbopack';
import withSaltyCss, { withSaltyCss as namedExport } from './index';

const saltyPluginMock = saltyPlugin as unknown as ReturnType<typeof vi.fn>;
const withSaltyTurbopackMock = withSaltyTurbopack as unknown as ReturnType<typeof vi.fn>;

const originalTurbopackEnv = process.env.TURBOPACK;

describe('withSaltyCss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TURBOPACK;
  });

  afterEach(() => {
    if (originalTurbopackEnv === undefined) {
      delete process.env.TURBOPACK;
    } else {
      process.env.TURBOPACK = originalTurbopackEnv;
    }
  });

  describe('webpack branch', () => {
    it('preserves non-webpack keys on the returned config', () => {
      const result = withSaltyCss({
        reactStrictMode: true,
        images: { domains: ['example.com'] },
      });

      expect(result.reactStrictMode).toBe(true);
      expect(result.images).toEqual({ domains: ['example.com'] });
      expect(typeof result.webpack).toBe('function');
    });

    it('calls saltyPlugin with (config, dir, isServer, cjs, options) on each webpack invocation', () => {
      const wrapped = withSaltyCss({});
      const config = { module: { rules: [] }, plugins: [] };

      (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, { dir: '/tmp/app', isServer: false });
      expect(saltyPluginMock).toHaveBeenCalledTimes(1);
      expect(saltyPluginMock).toHaveBeenCalledWith(config, '/tmp/app', false, false, { mode: undefined });

      (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, { dir: '/tmp/app', isServer: true });
      expect(saltyPluginMock).toHaveBeenCalledTimes(2);
      expect(saltyPluginMock).toHaveBeenLastCalledWith(config, '/tmp/app', true, false, { mode: undefined });
    });

    it('forwards the mode option through to saltyPlugin', () => {
      const wrapped = withSaltyCss({}, { mode: 'production' });
      const config = { module: { rules: [] }, plugins: [] };

      (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, { dir: '/tmp/app', isServer: false });
      expect(saltyPluginMock).toHaveBeenCalledWith(config, '/tmp/app', false, false, { mode: 'production' });
    });

    it('chains the incoming webpack function after saltyPlugin', () => {
      const order: string[] = [];
      saltyPluginMock.mockImplementation(() => order.push('salty'));
      const incoming = vi.fn(() => order.push('incoming'));

      const wrapped = withSaltyCss({ webpack: incoming });
      const config = { module: { rules: [] }, plugins: [] };
      const options = { dir: '/x', isServer: false };
      (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, options);

      expect(order).toEqual(['salty', 'incoming']);
      expect(incoming).toHaveBeenCalledWith(config, options);
    });

    it('drops the incoming webpack reference from the spread result', () => {
      const incoming = vi.fn();
      const wrapped = withSaltyCss({ webpack: incoming, foo: 'bar' });
      expect((wrapped as { webpack: unknown }).webpack).not.toBe(incoming);
      expect(wrapped.foo).toBe('bar');
    });

    it('handles webpack: undefined and webpack: null without throwing', () => {
      const cases = [{}, { webpack: undefined }, { webpack: null }];
      for (const input of cases) {
        const wrapped = withSaltyCss(input);
        expect(() => {
          (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack({ module: { rules: [] }, plugins: [] }, { dir: '/x', isServer: false });
        }).not.toThrow();
      }
      expect(saltyPluginMock).toHaveBeenCalledTimes(cases.length);
    });

    it('returns the same config reference from the wrapped webpack function', () => {
      const wrapped = withSaltyCss({});
      const config = { module: { rules: [] }, plugins: [] };
      const result = (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, {
        dir: '/x',
        isServer: false,
      });
      expect(result).toBe(config);
    });

    it('bundler: "webpack" forces the webpack branch even when TURBOPACK=1', () => {
      process.env.TURBOPACK = '1';
      const wrapped = withSaltyCss({}, { bundler: 'webpack' });
      expect(withSaltyTurbopackMock).not.toHaveBeenCalled();
      expect(typeof (wrapped as { webpack: unknown }).webpack).toBe('function');
    });
  });

  describe('turbopack branch', () => {
    it('bundler: "turbopack" delegates to withSaltyTurbopack even when TURBOPACK is unset', () => {
      const wrapped = withSaltyCss({ reactStrictMode: true }, { bundler: 'turbopack', mode: 'development', dir: '/x' });
      expect(withSaltyTurbopackMock).toHaveBeenCalledTimes(1);
      expect(withSaltyTurbopackMock).toHaveBeenCalledWith({ reactStrictMode: true }, { mode: 'development', dir: '/x' });
      expect((wrapped as { __turbopackCalled?: boolean }).__turbopackCalled).toBe(true);
    });

    it('auto picks turbopack when process.env.TURBOPACK === "1"', () => {
      process.env.TURBOPACK = '1';
      withSaltyCss({});
      expect(withSaltyTurbopackMock).toHaveBeenCalledTimes(1);
      expect(saltyPluginMock).not.toHaveBeenCalled();
    });

    it('auto picks webpack when TURBOPACK env is absent', () => {
      withSaltyCss({});
      expect(withSaltyTurbopackMock).not.toHaveBeenCalled();
    });
  });

  it('default export equals the named export', () => {
    expect(withSaltyCss).toBe(namedExport);
  });
});
