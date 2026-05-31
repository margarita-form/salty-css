/**
 * Minimal, dependency-free glob matching for `.saltyrc.json` `include` / `exclude`.
 *
 * Supports the three glob tokens users expect from tsconfig-style patterns:
 * - `**` matches any number of characters, including `/` (crosses directories).
 * - `*`  matches any number of characters except `/` (single path segment).
 * - `?`  matches a single character except `/`.
 *
 * Patterns and paths are matched with `/` as the separator; callers should
 * normalize Windows separators before matching (see `normalizePath`).
 *
 * Matching is done with a memoized dynamic-programming walk rather than by
 * translating to a `.*`-based RegExp. A regex translation of `**` → `.*` is
 * vulnerable to catastrophic backtracking (ReDoS): a pattern like
 * `**a**a**a…X` becomes `^.*a.*a.*a…X$` and can hang for seconds on a long
 * non-matching path. The DP walk below visits each `(token, char)` pair at most
 * once, giving a hard `O(pattern x path)` bound with no backtracking.
 */

type Token = { type: 'lit'; char: string } | { type: 'single' } | { type: 'star' } | { type: 'globstar' };

/** Normalize a path to use `/` separators so globs match cross-platform. */
export const normalizePath = (path: string): string => path.replace(/\\/g, '/');

// Tokenizing a pattern is the reusable "compile" step, so cache it per pattern
// string. The pattern set comes from `.saltyrc.json` and is small/bounded.
const tokenCache = new Map<string, Token[]>();

const tokenize = (pattern: string): Token[] => {
  const cached = tokenCache.get(pattern);
  if (cached) return cached;

  const normalized = normalizePath(pattern);
  const tokens: Token[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === '*') {
      // Collapse a run of `*`; two or more means `**` (crosses `/`).
      let stars = 1;
      while (normalized[i + 1] === '*') {
        i++;
        stars++;
      }
      tokens.push(stars >= 2 ? { type: 'globstar' } : { type: 'star' });
    } else if (char === '?') {
      tokens.push({ type: 'single' });
    } else {
      tokens.push({ type: 'lit', char });
    }
  }

  tokenCache.set(pattern, tokens);
  return tokens;
};

/** True when `path` matches the glob `pattern` (full, anchored match). */
export const matchesGlob = (pattern: string, path: string): boolean => {
  const tokens = tokenize(pattern);
  const normalized = normalizePath(path);
  const P = tokens.length;
  const S = normalized.length;

  // memo[ti * (S + 1) + si]: 0 = unknown, 1 = false, 2 = true. Each pair is
  // resolved at most once, so the whole match is O(P * S).
  const memo = new Uint8Array((P + 1) * (S + 1));

  const match = (ti: number, si: number): boolean => {
    const key = ti * (S + 1) + si;
    const seen = memo[key];
    if (seen) return seen === 2;

    let result: boolean;
    if (ti === P) {
      result = si === S;
    } else {
      const token = tokens[ti];
      switch (token.type) {
        case 'lit':
          result = si < S && normalized[si] === token.char && match(ti + 1, si + 1);
          break;
        case 'single':
          result = si < S && normalized[si] !== '/' && match(ti + 1, si + 1);
          break;
        case 'star':
          // Zero-or-more characters within a single path segment (no `/`).
          result = match(ti + 1, si) || (si < S && normalized[si] !== '/' && match(ti, si + 1));
          break;
        case 'globstar':
          // Zero-or-more characters, crossing directory separators.
          result = match(ti + 1, si) || (si < S && match(ti, si + 1));
          break;
      }
    }

    memo[key] = result ? 2 : 1;
    return result;
  };

  return match(0, 0);
};

/** True when `relPath` matches at least one of the glob `patterns`. */
export const matchesAnyGlob = (relPath: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => matchesGlob(pattern, relPath));
};

export interface PathFilterOptions {
  include?: string[];
  exclude?: string[];
}

/**
 * Decide whether a project-relative path is allowed by the configured filters.
 * - Anything matching `exclude` is rejected.
 * - When `include` is non-empty, only matching paths are allowed.
 * - When `include` is empty/undefined, everything not excluded is allowed.
 */
export const isPathAllowed = (relPath: string, { include, exclude }: PathFilterOptions = {}): boolean => {
  if (exclude?.length && matchesAnyGlob(relPath, exclude)) return false;
  if (include?.length) return matchesAnyGlob(relPath, include);
  return true;
};
