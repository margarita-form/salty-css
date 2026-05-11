import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@salty-css/webpack', () => ({ saltyPlugin: vi.fn() }));

import { saltyPlugin } from '@salty-css/webpack';
import withSaltyCss, { withSaltyCss as namedExport } from './index';

const saltyPluginMock = saltyPlugin as unknown as ReturnType<typeof vi.fn>;

describe('withSaltyCss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves non-webpack keys on the returned config', () => {
    const result = withSaltyCss({
      reactStrictMode: true,
      images: { domains: ['example.com'] },
    });

    expect(result.reactStrictMode).toBe(true);
    expect(result.images).toEqual({ domains: ['example.com'] });
    expect(typeof result.webpack).toBe('function');
  });

  it('calls saltyPlugin with (config, dir, isServer) on each webpack invocation', () => {
    const wrapped = withSaltyCss({});
    const config = { module: { rules: [] }, plugins: [] };

    (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, { dir: '/tmp/app', isServer: false });
    expect(saltyPluginMock).toHaveBeenCalledTimes(1);
    expect(saltyPluginMock).toHaveBeenCalledWith(config, '/tmp/app', false);

    (wrapped as { webpack: (c: unknown, o: unknown) => unknown }).webpack(config, { dir: '/tmp/app', isServer: true });
    expect(saltyPluginMock).toHaveBeenCalledTimes(2);
    expect(saltyPluginMock).toHaveBeenLastCalledWith(config, '/tmp/app', true);
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
    // The wrapper replaces `webpack`, so incoming is only reachable via closure.
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

  it('default export equals the named export', () => {
    expect(withSaltyCss).toBe(namedExport);
  });
});
