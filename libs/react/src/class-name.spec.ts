import { ClassNameGenerator } from '@salty-css/core/generators';
import { className } from './class-name';

describe('className() — SSR API', () => {
  it('stringifies to the generated cssClassName', () => {
    const cn = className({ base: { color: 'red' } });
    expect(String(cn)).toBe(cn.generator.cssClassName);
    expect(String(cn).length).toBeGreaterThan(0);
  });

  it('exposes isClassName === true', () => {
    const cn = className({ base: { color: 'red' } });
    expect(cn.isClassName).toBe(true);
  });

  it('exposes a ClassNameGenerator on .generator (the SSR-only marker)', () => {
    const cn = className({ base: { color: 'red' } });
    expect(cn.generator).toBeInstanceOf(ClassNameGenerator);
  });

  it('variant() appends "name-value" to the class string', () => {
    const cn = className({ base: { color: 'red' } });
    const variant = cn.variant('size', 'lg');
    expect(String(variant)).toBe(`${String(cn)} size-lg`);
    expect(variant.isClassName).toBe(true);
  });

  it('variant() is chainable and accumulates left-to-right', () => {
    const cn = className({ base: { color: 'red' } });
    const chained = cn.variant('a', '1').variant('b', '2');
    expect(String(chained)).toBe(`${String(cn)} a-1 b-2`);
  });

  it('is deterministic: same params produce the same class hash', () => {
    const a = className({ base: { color: 'red' } });
    const b = className({ base: { color: 'red' } });
    expect(String(a)).toBe(String(b));
  });

  it('produces different hashes for different params', () => {
    const a = className({ base: { color: 'red' } });
    const b = className({ base: { color: 'blue' } });
    expect(String(a)).not.toBe(String(b));
  });
});
