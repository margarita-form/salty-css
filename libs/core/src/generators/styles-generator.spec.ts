import { StylesGenerator } from './styles-generator';

describe('StylesGenerator', () => {
  it('reports priority 0 and isRoot true by default', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    expect(gen.priority).toBe(0);
    expect(gen.isRoot).toBe(true);
  });

  it('produces a stable, non-empty hash', () => {
    const a = new StylesGenerator({ base: { color: 'red' } });
    const b = new StylesGenerator({ base: { color: 'red' } });
    expect(a.hash).toBeTruthy();
    expect(typeof a.hash).toBe('string');
    expect(a.hash).toBe(b.hash);
  });

  it('changes the hash when params change', () => {
    const red = new StylesGenerator({ base: { color: 'red' } });
    const blue = new StylesGenerator({ base: { color: 'blue' } });
    expect(red.hash).not.toBe(blue.hash);
  });

  it('cssClassName equals hash', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    expect(gen.cssClassName).toBe(gen.hash);
  });

  it('classNames includes the hash plus a string className', () => {
    const gen = new StylesGenerator({ base: { color: 'red' }, className: 'extra' });
    const parts = gen.classNames.split(' ');
    expect(parts).toContain(gen.hash);
    expect(parts).toContain('extra');
  });

  it('classNames includes every entry of an array className', () => {
    const gen = new StylesGenerator({ base: { color: 'red' }, className: ['one', 'two'] });
    const parts = gen.classNames.split(' ');
    expect(parts).toContain('one');
    expect(parts).toContain('two');
  });

  it('classNames merges buildContext.classNames and dedupes', () => {
    const gen = new StylesGenerator({ base: { color: 'red' }, className: 'shared' });
    gen._withBuildContext({ classNames: ['shared', 'extra'] });
    const parts = gen.classNames.split(' ');
    expect(parts.filter((c) => c === 'shared').length).toBe(1);
    expect(parts).toContain('extra');
  });

  it('cssFileName falls back to {hash}.css without a callerName', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    expect(gen.cssFileName).toBe(`${gen.hash}.css`);
  });

  it('cssFileName uses dash-cased callerName prefix', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    gen._withBuildContext({ callerName: 'MyButton' });
    expect(gen.cssFileName).toBe(`cl_my-button-${gen.hash}.css`);
  });

  it('_withBuildContext mutates and returns the same instance', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    const result = gen._withBuildContext({ callerName: 'X' });
    expect(result).toBe(gen);
    expect(gen.buildContext.callerName).toBe('X');
  });

  it('getTemplateClasses returns empty when there is no config', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    expect(gen.getTemplateClasses()).toEqual([]);
  });

  it('getTemplateClasses returns empty when no base keys match templates', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    expect(gen.getTemplateClasses({ templates: { spacing: {} } } as never)).toEqual([]);
  });

  it('getTemplateClasses emits t_ prefixed entries for matching template keys', () => {
    const gen = new StylesGenerator({ base: { color: 'red' } });
    const classes = gen.getTemplateClasses({ templates: { color: {} } } as never);
    expect(classes).toHaveLength(1);
    expect(classes[0]?.startsWith('t_')).toBe(true);
    expect(classes[0]?.length).toBe(2 + 4);
  });
});
