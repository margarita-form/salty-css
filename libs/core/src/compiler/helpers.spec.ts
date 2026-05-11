import { isSaltyFile, saltyFileExtensions, saltyFileRegExp } from './helpers';

describe('saltyFileExtensions', () => {
  it('lists the four built-in salty extensions', () => {
    expect(saltyFileExtensions).toEqual(['salty', 'css', 'styles', 'styled']);
  });
});

describe('saltyFileRegExp', () => {
  it('matches all built-in extensions', () => {
    const re = saltyFileRegExp();
    expect(re.test('button.salty.ts')).toBe(true);
    expect(re.test('theme.css.ts')).toBe(true);
    expect(re.test('foo.styles.ts')).toBe(true);
    expect(re.test('bar.styled.tsx')).toBe(true);
  });

  it('rejects non-salty filenames', () => {
    const re = saltyFileRegExp();
    expect(re.test('index.ts')).toBe(false);
    expect(re.test('foo.scss')).toBe(false);
    expect(re.test('button.tsx')).toBe(false);
  });

  it('extends the match list with additional extensions', () => {
    const re = saltyFileRegExp(['vanilla']);
    expect(re.test('baz.vanilla.ts')).toBe(true);
    expect(re.test('button.salty.ts')).toBe(true);
  });
});

describe('isSaltyFile', () => {
  it('returns true for built-in salty filenames', () => {
    expect(isSaltyFile('button.salty.ts')).toBe(true);
    expect(isSaltyFile('theme.css.ts')).toBe(true);
    expect(isSaltyFile('foo.styles.ts')).toBe(true);
    expect(isSaltyFile('bar.styled.tsx')).toBe(true);
  });

  it('returns false for unrelated filenames', () => {
    expect(isSaltyFile('index.ts')).toBe(false);
    expect(isSaltyFile('main.tsx')).toBe(false);
  });

  it('honors additional extensions', () => {
    expect(isSaltyFile('baz.vanilla.ts', ['vanilla'])).toBe(true);
    expect(isSaltyFile('baz.vanilla.ts')).toBe(false);
  });
});
