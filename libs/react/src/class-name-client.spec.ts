import { className } from './class-name-client';

describe('className (client)', () => {
  it('returns a String-like whose primitive value is the input', () => {
    const cn = className('foo');
    expect(String(cn)).toBe('foo');
    expect(`${cn}`).toBe('foo');
  });

  it('exposes isClassName as true', () => {
    const cn = className('foo');
    expect(cn.isClassName).toBe(true);
  });

  it('variant() appends "name-value" with a space separator', () => {
    const cn = className('foo').variant('size', 'lg');
    expect(String(cn)).toBe('foo size-lg');
    expect(cn.isClassName).toBe(true);
  });

  it('variant() is chainable and accumulates left-to-right', () => {
    const cn = className('foo').variant('a', '1').variant('b', '2');
    expect(String(cn)).toBe('foo a-1 b-2');
    expect(cn.isClassName).toBe(true);
  });

  it('handles empty base string', () => {
    const cn = className('');
    expect(String(cn)).toBe('');
    const v = cn.variant('size', 'lg');
    expect(String(v)).toBe(' size-lg');
  });
});
