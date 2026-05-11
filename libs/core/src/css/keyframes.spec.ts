import { keyframes } from './keyframes';

describe('keyframes', () => {
  it('returns a factory that resolves to an animation function with metadata', async () => {
    const factory = keyframes({
      animationName: 'fadeIn',
      from: { opacity: 0 },
      to: { opacity: 1 },
    });
    const fn = await factory();
    expect(fn).toBeTypeOf('function');
    const meta = fn as unknown as { isKeyframes: boolean; animationName: string; css: string };
    expect(meta.isKeyframes).toBe(true);
    expect(meta.animationName).toBe('fadeIn');
    expect(meta.css.startsWith('@keyframes fadeIn {')).toBe(true);
    expect(meta.css).toContain('from{');
    expect(meta.css).toContain('to{');
    expect(meta.css.replace(/\s/g, '')).toContain('opacity:0');
    expect(meta.css.replace(/\s/g, '')).toContain('opacity:1');
  });

  it('derives a stable hash-based animationName when none is given', async () => {
    const definition = { from: { opacity: 0 }, to: { opacity: 1 } };
    const a = (await keyframes(definition)()) as unknown as { animationName: string };
    const b = (await keyframes(definition)()) as unknown as { animationName: string };
    expect(a.animationName).toBeTruthy();
    expect(a.animationName).toBe(b.animationName);
  });

  it('emits string percent keys verbatim in the keyframes block', async () => {
    const factory = keyframes({
      animationName: 'pulse',
      '0%': { opacity: 0 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 },
    });
    const fn = (await factory()) as unknown as { css: string };
    const css = fn.css.replace(/\s/g, '');
    expect(css).toContain('0%{');
    expect(css).toContain('50%{');
    expect(css).toContain('100%{');
  });

  it('builds the default animation shorthand when called with no params', async () => {
    const factory = keyframes({ animationName: 'fade', from: { opacity: 0 }, to: { opacity: 1 } });
    const fn = (await factory()) as unknown as () => Promise<string>;
    const animation = await fn();
    expect(animation).toBe('fade 500ms ease-in-out 0s 1 normal forwards running');
  });

  it('honors duration / easing / delay overrides at call time', async () => {
    const factory = keyframes({ animationName: 'fade', from: { opacity: 0 }, to: { opacity: 1 } });
    const fn = (await factory({ duration: '1s', easing: 'linear', delay: '200ms' })) as unknown as () => Promise<string>;
    const animation = await fn();
    expect(animation).toBe('fade 1s linear 200ms 1 normal forwards running');
  });

  it('appends initial styles when appendInitialStyles is true', async () => {
    const factory = keyframes({
      animationName: 'fade',
      appendInitialStyles: true,
      from: { opacity: 0 },
      to: { opacity: 1 },
    });
    const fn = (await factory()) as unknown as () => Promise<string>;
    const animation = await fn();
    expect(animation.startsWith('fade 500ms ease-in-out 0s 1 normal forwards running;')).toBe(true);
    expect(animation.replace(/\s/g, '')).toContain('opacity:0');
  });
});

describe('keyframes edge cases', () => {
  it('emits numeric integer keys as percentages (Bug 2 fix)', async () => {
    const factory = keyframes({
      animationName: 'pulse',
      0: { opacity: 0 },
      50: { opacity: 0.5 },
      100: { opacity: 1 },
    } as never);
    const fn = (await factory()) as unknown as { css: string };
    const css = fn.css.replace(/\s/g, '');
    expect(css).toContain('0%{');
    expect(css).toContain('50%{');
    expect(css).toContain('100%{');
  });

  it('produces an empty @keyframes block for empty input', async () => {
    const factory = keyframes({} as never);
    const fn = (await factory()) as unknown as { css: string; animationName: string };
    expect(fn.animationName).toBeTruthy();
    expect(fn.css.replace(/\s/g, '')).toBe(`@keyframes${fn.animationName}{}`);
  });

  it('skips entries whose value is null', async () => {
    const factory = keyframes({
      animationName: 'fade',
      from: null as never,
      to: { opacity: 1 },
    });
    const fn = (await factory()) as unknown as { css: string };
    const css = fn.css.replace(/\s/g, '');
    expect(css).not.toContain('from{');
    expect(css).toContain('to{');
  });

  it('falls back to a hash when animationName is an empty string', async () => {
    const factory = keyframes({ animationName: '', from: { opacity: 0 } });
    const fn = (await factory()) as unknown as { animationName: string };
    expect(fn.animationName).toBeTruthy();
    expect(fn.animationName).not.toBe('');
  });

  it('passes empty-string params through verbatim (documented quirk)', async () => {
    const factory = keyframes({ animationName: 'fade', from: { opacity: 0 }, to: { opacity: 1 } });
    const fn = (await factory({ duration: '' })) as unknown as () => Promise<string>;
    const animation = await fn();
    expect(animation).toBe('fade  ease-in-out 0s 1 normal forwards running');
  });
});
