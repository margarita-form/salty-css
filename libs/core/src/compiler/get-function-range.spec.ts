import { getFunctionRange } from './get-function-range';

describe('getFunctionRange', () => {
  it('locates a single variable declaration', async () => {
    const source = 'export const foo = 42;';
    const [start, end] = await getFunctionRange(source, 'foo');
    expect(end).toBeGreaterThan(start);
    expect(source.slice(start, end)).toContain('foo = 42');
  });

  it('returns the range of the requested name when multiple declarations exist', async () => {
    const source = 'const foo = 1;\nconst bar = 2;\nconst baz = 3;';
    const [start, end] = await getFunctionRange(source, 'bar');
    const slice = source.slice(start, end);
    expect(slice).toContain('bar = 2');
    expect(slice).not.toContain('foo');
    expect(slice).not.toContain('baz');
  });

  it('finds nested variable declarations inside blocks', async () => {
    const source = 'function outer() { const inner = 7; return inner; }';
    const [start, end] = await getFunctionRange(source, 'inner');
    expect(source.slice(start, end)).toContain('inner = 7');
  });

  it('rejects with a Timeout error when the name is not found', async () => {
    const source = 'const foo = 1;';
    await expect(getFunctionRange(source, 'doesNotExist')).rejects.toThrow('Timeout');
  });
});
