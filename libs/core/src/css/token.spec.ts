import { token } from './token';

describe('token', () => {
  it('wraps the value in curly braces', () => {
    expect(token('colors.primary' as never)).toBe('{colors.primary}');
  });

  it('supports nested dot paths', () => {
    expect(token('space.large.x' as never)).toBe('{space.large.x}');
  });

  it('handles empty input', () => {
    expect(token('' as never)).toBe('{}');
  });
});

describe('token edge cases', () => {
  it('stringifies undefined verbatim (documented quirk)', () => {
    expect(token(undefined as never)).toBe('{undefined}');
  });

  it('stringifies null verbatim', () => {
    expect(token(null as never)).toBe('{null}');
  });

  it('coerces numbers via template-literal interpolation', () => {
    expect(token(123 as never)).toBe('{123}');
  });

  it('does not JSON-serialize objects (default toString)', () => {
    expect(token({} as never)).toBe('{[object Object]}');
  });
});
