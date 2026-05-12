import { describe, it, expect } from 'vitest';
import { getDynamicStylesClassName, resolveDynamicStyles } from './dynamic-styles';

describe('dynamic-styles', () => {
  it('produces a deterministic className hash for equal style objects', () => {
    const a = getDynamicStylesClassName({ color: 'red', padding: '10px' });
    const b = getDynamicStylesClassName({ color: 'red', padding: '10px' });
    expect(a).toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
  });

  it('produces a different className hash when styles differ', () => {
    const a = getDynamicStylesClassName({ color: 'red' });
    const b = getDynamicStylesClassName({ color: 'blue' });
    expect(a).not.toBe(b);
  });

  it('returns { className, css } from resolveDynamicStyles', async () => {
    const result = await resolveDynamicStyles({ color: 'red' });
    expect(result.className).toBe(getDynamicStylesClassName({ color: 'red' }));
    expect(typeof result.css).toBe('string');
  });
});
