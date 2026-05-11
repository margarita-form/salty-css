import { mergeObjects, mergeFactories } from './merge';

describe('mergeObjects', () => {
  it('merges plain objects with later values winning', () => {
    expect(mergeObjects({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('flattens nested arrays of styles', () => {
    expect(mergeObjects([{ a: 1 }, { b: 2 }], { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('unwraps _current from style factories', () => {
    expect(mergeObjects({ _current: { x: 1 } }, { y: 2 })).toEqual({ x: 1, y: 2 });
  });

  it('returns an empty object when given nothing', () => {
    expect(mergeObjects()).toEqual({});
  });

  it('ignores nullish entries', () => {
    expect(mergeObjects(null as unknown as object, undefined as unknown as object, { a: 1 })).toEqual({ a: 1 });
  });
});

describe('mergeFactories', () => {
  it('merges _children across factories', () => {
    const a = { _current: {}, _children: { foo: 1 } } as never;
    const b = { _current: {}, _children: { bar: 2 } } as never;
    expect(mergeFactories([a, b])).toEqual({ foo: 1, bar: 2 });
  });

  it('flattens factory arrays', () => {
    const a = { _current: {}, _children: { foo: 1 } } as never;
    const b = { _current: {}, _children: { bar: 2 } } as never;
    const c = { _current: {}, _children: { baz: 3 } } as never;
    expect(mergeFactories([a, b], [c])).toEqual({ foo: 1, bar: 2, baz: 3 });
  });

  it('later factories override earlier keys', () => {
    const a = { _current: {}, _children: { foo: 1 } } as never;
    const b = { _current: {}, _children: { foo: 9 } } as never;
    expect(mergeFactories([a, b])).toEqual({ foo: 9 });
  });
});

describe('mergeObjects edge cases', () => {
  it('does not leak factory internals when _current is undefined', () => {
    const factory = { _current: undefined, _children: { foo: 1 } };
    expect(mergeObjects(factory, { y: 2 })).toEqual({ y: 2 });
  });

  it('does not leak factory internals when _current is null', () => {
    const factory = { _current: null, _children: {} };
    expect(mergeObjects(factory, { y: 2 })).toEqual({ y: 2 });
  });

  it('treats later factories as overrides', () => {
    expect(mergeObjects({ _current: { x: 1 } }, { _current: { x: 9 } })).toEqual({ x: 9 });
  });

  it('returns an empty object with no inputs', () => {
    expect(mergeObjects()).toEqual({});
  });
});

describe('mergeFactories edge cases', () => {
  it('returns an empty object with no inputs', () => {
    expect(mergeFactories()).toEqual({});
  });

  it('does not throw when _children is undefined', () => {
    const broken = [{ _current: {}, _children: undefined } as never];
    expect(mergeFactories(broken)).toEqual({});
  });
});
