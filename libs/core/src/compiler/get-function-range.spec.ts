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

describe('getFunctionRange edge cases', () => {
  it('rejects with Timeout for an empty source', async () => {
    await expect(getFunctionRange('', 'foo')).rejects.toThrow('Timeout');
  });

  it('does not match function declarations (only VariableDeclaration is matched)', async () => {
    await expect(getFunctionRange('function foo() {}', 'foo')).rejects.toThrow('Timeout');
  });

  it('does not match class declarations', async () => {
    await expect(getFunctionRange('class Foo {}', 'Foo')).rejects.toThrow('Timeout');
  });

  it('requires an exact name match — substring matches are rejected', async () => {
    await expect(getFunctionRange('const foobar = 1;', 'foo')).rejects.toThrow('Timeout');
  });

  it('does not match names declared via destructuring', async () => {
    await expect(getFunctionRange('const { foo } = obj;', 'foo')).rejects.toThrow('Timeout');
  });

  it('returns the first declaration when the same name appears in nested scopes', async () => {
    const source = 'const foo = 1; { const foo = 2; }';
    const [start, end] = await getFunctionRange(source, 'foo');
    expect(source.slice(start, end)).toContain('foo = 1');
  });
});
