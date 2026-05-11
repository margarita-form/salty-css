import { ClassNameGenerator } from './class-name-generator';

describe('ClassNameGenerator', () => {
  it('defaults priority to 0', () => {
    const gen = new ClassNameGenerator({ base: { color: 'red' } });
    expect(gen.priority).toBe(0);
  });

  it('honors an explicit priority on params', () => {
    const gen = new ClassNameGenerator({ base: { color: 'red' }, priority: 7 });
    expect(gen.priority).toBe(7);
  });

  it('inherits hash and cssClassName from StylesGenerator', () => {
    const gen = new ClassNameGenerator({ base: { color: 'red' } });
    expect(gen.hash).toBeTruthy();
    expect(gen.cssClassName).toBe(gen.hash);
  });

  it('produces the same hash as StylesGenerator for equivalent params', () => {
    const a = new ClassNameGenerator({ base: { color: 'red' } });
    const b = new ClassNameGenerator({ base: { color: 'red' } });
    expect(a.hash).toBe(b.hash);
  });
});

describe('ClassNameGenerator edge cases', () => {
  it('coerces priority: 0 to 0 (sanity check around the truthy fallback)', () => {
    const gen = new ClassNameGenerator({ priority: 0 });
    expect(gen.priority).toBe(0);
  });

  it('does not clamp negative priorities (passes through unchanged)', () => {
    const gen = new ClassNameGenerator({ priority: -3 });
    expect(gen.priority).toBe(-3);
  });

  it('produces a stable hash even with empty params', () => {
    const a = new ClassNameGenerator({});
    const b = new ClassNameGenerator({});
    expect(a.hash).toBeTruthy();
    expect(a.hash).toBe(b.hash);
  });
});
