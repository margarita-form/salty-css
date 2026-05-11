import { getDynamicStylesClassName } from './dynamic-styles';

describe('getDynamicStylesClassName', () => {
  it('returns a non-empty string', () => {
    const hash = getDynamicStylesClassName({ color: 'red' });
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same input', () => {
    const a = getDynamicStylesClassName({ color: 'red', padding: 4 });
    const b = getDynamicStylesClassName({ color: 'red', padding: 4 });
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', () => {
    const a = getDynamicStylesClassName({ color: 'red' });
    const b = getDynamicStylesClassName({ color: 'blue' });
    expect(a).not.toBe(b);
  });
});

// TODO: cover getDynamicStylesCss + DynamicStyles once a fixture-driven config
// cache is available (resolveDynamicConfigCache reads from disk).
