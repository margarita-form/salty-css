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
