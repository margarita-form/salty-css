import { describe, it, expect } from 'vitest';
import { resolveAstroProps } from './element-props';

describe('resolveAstroProps', () => {
  it('merges base class with consumer class/className', () => {
    const r = resolveAstroProps({ class: 'a b', className: 'c' }, {}, 'hash');
    expect(r.class).toEqual(['hash', 'a', 'b', 'c']);
  });

  it('applies variant defaults when consumer does not pass the variant', () => {
    const r = resolveAstroProps({}, { variantKeys: ['size=md', 'tone'] }, 'hash');
    expect(r.class).toContain('size-md');
    expect(r.class).not.toContain('tone-md');
  });

  it('applies consumer variant value and strips it from rest', () => {
    const r = resolveAstroProps({ size: 'lg' }, { variantKeys: ['size=md'] }, 'hash');
    expect(r.class).toContain('size-lg');
    expect(r.rest).not.toHaveProperty('size');
  });

  it('keeps variant value in rest when passProps is true', () => {
    const r = resolveAstroProps({ size: 'lg' }, { variantKeys: ['size'], passProps: true }, 'hash');
    expect(r.rest).toHaveProperty('size', 'lg');
  });

  it('keeps a specific variant in rest when passProps is an allow-list', () => {
    const r = resolveAstroProps({ size: 'lg', tone: 'warm' }, { variantKeys: ['size', 'tone'], passProps: ['size'] }, 'hash');
    expect(r.rest).toHaveProperty('size', 'lg');
    expect(r.rest).not.toHaveProperty('tone');
  });

  it('translates css-foo props into --props-foo CSS variables and strips them', () => {
    const r = resolveAstroProps({ 'css-fooBar': '10px' }, { propValueKeys: ['fooBar'] }, 'hash');
    expect(r.style['--props-foo-bar']).toBe('10px');
    expect(r.rest).not.toHaveProperty('css-fooBar');
  });

  it('parses token references inside the style prop', () => {
    const r = resolveAstroProps({ style: { color: '{colors.brand}' } }, {}, 'hash');
    expect(r.style['color']).toBe('var(--colors-brand)');
  });

  it('passes plain style values through unchanged', () => {
    const r = resolveAstroProps({ style: { padding: '10px' } }, {}, 'hash');
    expect(r.style['padding']).toBe('10px');
  });

  it('applies generator defaultProps when the consumer omits them', () => {
    const r = resolveAstroProps({}, { defaultProps: { 'data-x': 'y' } }, 'hash');
    expect(r.rest['data-x']).toBe('y');
  });

  it('consumer props override defaultProps', () => {
    const r = resolveAstroProps({ 'data-x': 'z' }, { defaultProps: { 'data-x': 'y' } }, 'hash');
    expect(r.rest['data-x']).toBe('z');
  });

  it('applies attr unconditionally and lets consumer override', () => {
    const r = resolveAstroProps({}, { attr: { 'data-component-name': 'Foo' } }, 'hash');
    expect(r.rest['data-component-name']).toBe('Foo');

    const r2 = resolveAstroProps({ 'data-component-name': 'Bar' }, { attr: { 'data-component-name': 'Foo' } }, 'hash');
    expect(r2.rest['data-component-name']).toBe('Bar');
  });

  it('skips attr entries with undefined values (production trim)', () => {
    const r = resolveAstroProps({}, { attr: { 'data-component-name': undefined } }, 'hash');
    expect(r.rest).not.toHaveProperty('data-component-name');
  });

  it('exposes consumer element override (intrinsic case)', () => {
    const r = resolveAstroProps({ element: 'section' }, { element: 'div' }, 'hash');
    expect(r.element).toBe('section');
  });

  it('falls back to generator element when consumer does not pass one', () => {
    const r = resolveAstroProps({}, { element: 'div' }, 'hash');
    expect(r.element).toBe('div');
  });

  it('does not leak the passProps key onto the DOM', () => {
    const r = resolveAstroProps({}, { passProps: true }, 'hash');
    expect(r.rest).not.toHaveProperty('passProps');
  });

  it('accumulates incoming _vks from a parent styled component', () => {
    const r = resolveAstroProps({ _vks: ['size'], color: 'red' }, { variantKeys: ['color'] }, 'hash');
    expect(r._vks).toEqual(expect.arrayContaining(['size', 'color']));
    expect(r.rest).not.toHaveProperty('_vks');
    expect(r.rest).not.toHaveProperty('color');
  });

  it('drops the _vks prop from rest', () => {
    const r = resolveAstroProps({ _vks: ['x'] }, {}, 'hash');
    expect(r.rest).not.toHaveProperty('_vks');
  });

  it('drops the consumer class prop from rest (handled via class:list)', () => {
    const r = resolveAstroProps({ class: 'a' }, {}, 'hash');
    expect(r.rest).not.toHaveProperty('class');
  });
});
