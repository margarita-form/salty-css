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
