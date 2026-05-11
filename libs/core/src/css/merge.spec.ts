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
