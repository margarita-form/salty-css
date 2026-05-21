import { defineRuntime } from './index';

const strip = (s: string) => s.replace(/\s/g, '');

describe('defineRuntime', () => {
  const runtime = defineRuntime({});

  describe('className', () => {
    it('returns a non-empty string', () => {
      const hash = runtime.className({ color: 'red' });
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('is deterministic for the same input', () => {
      const a = runtime.className({ color: 'red', padding: 4 });
      const b = runtime.className({ color: 'red', padding: 4 });
      expect(a).toBe(b);
    });

    it('produces different hashes for different inputs', () => {
      const a = runtime.className({ color: 'red' });
      const b = runtime.className({ color: 'blue' });
      expect(a).not.toBe(b);
    });
  });

  describe('css', () => {
    it('returns a CSS string for the given styles', async () => {
      const css = await runtime.css({ color: 'red' });
      expect(strip(css)).toBe(strip('color: red;'));
    });

    it('honors the supplied scope', async () => {
      const css = await runtime.css({ color: 'red' }, '.wrapper');
      expect(strip(css)).toBe(strip('.wrapper { color: red; }'));
    });

    it('threads the supplied config through to parseStyles', async () => {
      const scoped = defineRuntime({ variables: { colors: { brand: 'tomato' } } });
      const css = await scoped.css({ color: '{colors.brand}' }, '.x');
      expect(css).toContain('var(--colors-brand)');
    });
  });

  describe('resolve', () => {
    it('returns { className, css } with className matching the standalone hash', async () => {
      const styles = { color: 'red' };
      const result = await runtime.resolve(styles);
      expect(result.className).toBe(runtime.className(styles));
      expect(typeof result.css).toBe('string');
      expect(result.css.length).toBeGreaterThan(0);
    });

    it('defaults the scope to ".${className}"', async () => {
      const styles = { color: 'red' };
      const { className, css } = await runtime.resolve(styles);
      expect(strip(css)).toBe(strip(`.${className} { color: red; }`));
    });

    it('honors an explicit scope override', async () => {
      const { css } = await runtime.resolve({ color: 'red' }, '.override');
      expect(strip(css)).toBe(strip('.override { color: red; }'));
    });
  });
});
