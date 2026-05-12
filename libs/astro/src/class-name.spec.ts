import { describe, it, expect } from 'vitest';
import { className } from './class-name';

describe('className()', () => {
  it('exposes the generator hash as its string value', () => {
    const cn = className({ base: { color: 'red' } });
    expect(String(cn)).toBe(cn.generator.cssClassName);
    expect(cn.isClassName).toBe(true);
  });

  it('appends a variant via .variant(name, value)', () => {
    const cn = className({ base: {}, variants: { tone: { warm: {} } } });
    const withVariant = cn.variant('tone', 'warm');
    expect(String(withVariant)).toBe(`${String(cn)} tone-warm`);
    expect(withVariant.isClassName).toBe(true);
  });

  it('chains multiple .variant() calls', () => {
    const cn = className({ base: {} });
    const result = cn.variant('size', 'md').variant('tone', 'warm');
    expect(String(result)).toBe(`${String(cn)} size-md tone-warm`);
  });

  it('appends multiple variants via .variants({...})', () => {
    const cn = className({ base: {} });
    const result = cn.variants({ size: 'md', tone: 'warm' });
    expect(String(result)).toBe(`${String(cn)} size-md tone-warm`);
  });
});
