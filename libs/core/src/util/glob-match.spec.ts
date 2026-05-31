import { matchesGlob, matchesAnyGlob, isPathAllowed, normalizePath } from './glob-match';

describe('matchesGlob', () => {
  it('matches `**` across directory separators', () => {
    expect(matchesGlob('src/**', 'src/components/Button.css.ts')).toBe(true);
    expect(matchesGlob('src/**', 'src/Button.css.ts')).toBe(true);
    expect(matchesGlob('src/**', 'lib/Button.css.ts')).toBe(false);
  });

  it('does not let `*` cross directory separators', () => {
    expect(matchesGlob('src/*.css.ts', 'src/Button.css.ts')).toBe(true);
    expect(matchesGlob('src/*.css.ts', 'src/components/Button.css.ts')).toBe(false);
  });

  it('matches a single character with `?`', () => {
    expect(matchesGlob('a?.css.ts', 'ab.css.ts')).toBe(true);
    expect(matchesGlob('a?.css.ts', 'a.css.ts')).toBe(false);
    expect(matchesGlob('a?.css.ts', 'a/.css.ts')).toBe(false);
  });

  it('is fully anchored', () => {
    expect(matchesGlob('src', 'src')).toBe(true);
    expect(matchesGlob('src', 'src/foo')).toBe(false);
    expect(matchesGlob('src', 'my-src')).toBe(false);
  });

  it('treats regex specials in the pattern literally', () => {
    expect(matchesGlob('src/a.b+c.css.ts', 'src/a.b+c.css.ts')).toBe(true);
    expect(matchesGlob('src/a.b+c.css.ts', 'src/aXbXc.css.ts')).toBe(false);
  });

  it('treats a literal space as a literal', () => {
    expect(matchesGlob('my dir/**', 'my dir/Button.css.ts')).toBe(true);
    expect(matchesGlob('my dir/**', 'myXdir/Button.css.ts')).toBe(false);
    expect(matchesGlob('my dir/**', 'my/x/dir/Button.css.ts')).toBe(false);
  });

  it('collapses a run of `*` into a single globstar', () => {
    expect(matchesGlob('a****b', 'aXYZb')).toBe(true);
    expect(matchesGlob('a****b', 'a/x/b')).toBe(true);
  });

  it('does not hang on a backtracking-prone pattern against a long non-match', () => {
    expect(matchesGlob('**a**a**a**a**aX', 'a'.repeat(5000))).toBe(false);
  });
});

describe('matchesAnyGlob', () => {
  it('returns true when any pattern matches', () => {
    expect(matchesAnyGlob('src/Button.css.ts', ['lib/**', 'src/**'])).toBe(true);
    expect(matchesAnyGlob('test/Button.css.ts', ['lib/**', 'src/**'])).toBe(false);
  });

  it('normalizes backslash separators before matching', () => {
    expect(matchesAnyGlob('src\\components\\Button.css.ts', ['src/**'])).toBe(true);
  });
});

describe('isPathAllowed', () => {
  it('allows everything when no filters are set', () => {
    expect(isPathAllowed('any/where/file.css.ts')).toBe(true);
    expect(isPathAllowed('any/where/file.css.ts', {})).toBe(true);
    expect(isPathAllowed('any/where/file.css.ts', { include: [], exclude: [] })).toBe(true);
  });

  it('rejects paths matching exclude', () => {
    expect(isPathAllowed('src/excluded/Foo.css.ts', { exclude: ['**/excluded/**'] })).toBe(false);
    expect(isPathAllowed('src/Foo.css.ts', { exclude: ['**/excluded/**'] })).toBe(true);
  });

  it('narrows to include when include is non-empty', () => {
    expect(isPathAllowed('src/Foo.css.ts', { include: ['src/**'] })).toBe(true);
    expect(isPathAllowed('lib/Foo.css.ts', { include: ['src/**'] })).toBe(false);
  });

  it('lets exclude win over include', () => {
    const opts = { include: ['src/**'], exclude: ['**/*.skip.css.ts'] };
    expect(isPathAllowed('src/Foo.css.ts', opts)).toBe(true);
    expect(isPathAllowed('src/Foo.skip.css.ts', opts)).toBe(false);
  });
});

describe('normalizePath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(normalizePath('a\\b\\c')).toBe('a/b/c');
    expect(normalizePath('a/b/c')).toBe('a/b/c');
  });
});
