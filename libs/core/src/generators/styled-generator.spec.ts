/* eslint-disable @typescript-eslint/no-explicit-any */
import { StyledGenerator } from './styled-generator';

describe('StyledGenerator priority', () => {
  it('is 0 for a string tagName', () => {
    const gen = new StyledGenerator('div', { base: { color: 'red' } });
    expect(gen.priority).toBe(0);
  });

  it('honors an explicit priority on params', () => {
    const gen = new StyledGenerator('div', { base: { color: 'red' }, priority: 5 });
    expect(gen.priority).toBe(5);
  });

  it('increments by one above a nested generator priority', () => {
    const inner = new StyledGenerator('div', { base: { color: 'red' } });
    const wrapper = (() => null) as unknown as ((props: never) => null) & { generator: StyledGenerator };
    wrapper.generator = inner;
    const gen = new StyledGenerator(wrapper as any, { base: { color: 'blue' } });
    expect(gen.priority).toBe(1);
  });

  it('walks multiple levels of nesting', () => {
    const a = new StyledGenerator('div', {});
    const wrapperA = (() => null) as unknown as ((props: never) => null) & { generator: StyledGenerator };
    wrapperA.generator = a;
    const b = new StyledGenerator(wrapperA as any, {});
    const wrapperB = (() => null) as unknown as ((props: never) => null) & { generator: StyledGenerator };
    wrapperB.generator = b;
    const c = new StyledGenerator(wrapperB as any, {});
    expect(c.priority).toBe(2);
  });
});

describe('StyledGenerator clientProps', () => {
  it('passes through element / hash / passProps / defaultProps', () => {
    const gen = new StyledGenerator('button', {
      base: { color: 'red' },
      element: 'a',
      passProps: ['href'],
      defaultProps: { type: 'button' },
    });
    const props = gen.clientProps;
    expect(props.element).toBe('a');
    expect(props.hash).toBe(gen.hash);
    expect(props.passProps).toEqual(['href']);
    expect(props.defaultProps).toEqual({ type: 'button' });
  });

  it('collects variant keys from variants and applies defaultVariants as name=value', () => {
    const gen = new StyledGenerator('button', {
      variants: {
        size: { small: { fontSize: '12px' }, large: { fontSize: '20px' } },
        tone: { quiet: { opacity: 0.5 }, loud: { opacity: 1 } },
      } as any,
      defaultVariants: { size: 'large' },
    });
    const keys = gen.clientProps.variantKeys ?? [];
    expect(keys).toContain('size=large');
    expect(keys).toContain('tone');
  });

  it('merges variant keys from compoundVariants and anyOfVariants', () => {
    const gen = new StyledGenerator('div', {
      compoundVariants: [{ size: 'small', tone: 'quiet' } as any],
      anyOfVariants: [{ outlined: true } as any],
    });
    const keys = gen.clientProps.variantKeys ?? [];
    expect(keys).toContain('size');
    expect(keys).toContain('tone');
    expect(keys).toContain('outlined');
  });

  it('extracts dash-cased propValueKeys from {props.X} references in base', () => {
    const gen = new StyledGenerator('div', {
      base: { color: '{props.fooBar}', backgroundColor: '{-props.bgColor}' } as any,
    });
    const keys = gen.clientProps.propValueKeys ?? [];
    expect(keys).toContain('foo-bar');
    expect(keys).toContain('bg-color');
  });

  it('returns empty propValueKeys when base has no token references', () => {
    const gen = new StyledGenerator('div', { base: { color: 'red' } });
    expect(gen.clientProps.propValueKeys).toEqual([]);
  });

  it('emits data-component-name only outside production', () => {
    const dev = new StyledGenerator('div', { base: { color: 'red' } });
    dev._withBuildContext({ callerName: 'MyBox', isProduction: false });
    expect(dev.clientProps.attr?.['data-component-name']).toBe('MyBox');

    const prod = new StyledGenerator('div', { base: { color: 'red' } });
    prod._withBuildContext({ callerName: 'MyBox', isProduction: true });
    expect(prod.clientProps.attr?.['data-component-name']).toBeUndefined();
  });
});

describe('StyledGenerator edge cases', () => {
  it('treats null tagName as priority 0 (Bug 3 fix)', () => {
    const gen = new StyledGenerator(null as never, {});
    expect(gen.priority).toBe(0);
  });

  it('treats undefined tagName as priority 0', () => {
    const gen = new StyledGenerator(undefined as never, {});
    expect(gen.priority).toBe(0);
  });

  it('still increments priority for a function tagName with no .generator', () => {
    const gen = new StyledGenerator((() => null) as never, {});
    expect(gen.priority).toBe(1);
  });

  it('returns no propValueKeys for {props.} with no name after the dot', () => {
    const gen = new StyledGenerator('div', { base: { color: '{props.}' } as never });
    expect(gen.clientProps.propValueKeys).toEqual([]);
  });

  it('extracts multiple {props.X} references in a single base value', () => {
    const gen = new StyledGenerator('div', { base: { color: '{props.fooBar}{props.bazQux}' } as never });
    const keys = gen.clientProps.propValueKeys ?? [];
    expect(keys).toContain('foo-bar');
    expect(keys).toContain('baz-qux');
  });

  it('emits no data-component-name when callerName is missing in dev mode', () => {
    const gen = new StyledGenerator('div', {});
    gen._withBuildContext({ isProduction: false });
    expect(gen.clientProps.attr?.['data-component-name']).toBeUndefined();
  });
});
