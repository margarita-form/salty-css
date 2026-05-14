import { parseStyles } from './index';

/**
 * Tests for inputs that are easy to typo or that people commonly try by
 * analogy with SCSS / Emotion / Stitches / styled-components. The intent is
 * to describe how Salty *should* react — not what it happens to do today.
 *
 * Many of these will fail before Phase 3 lands. That is the point.
 */

const strip = (s: string) => s.replace(/\s+/g, ' ').trim();
const findRule = (rules: string[], selector: string) => rules.find((rule) => strip(rule).startsWith(`${selector} {`));
const expectRule = (rules: string[], selector: string, decls: Record<string, string> = {}) => {
  const rule = findRule(rules, selector);
  if (!rule) {
    throw new Error(`Expected selector "${selector}" in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
  }
  const compact = strip(rule).replace(/\s/g, '');
  for (const [prop, val] of Object.entries(decls)) {
    expect(compact).toContain(`${prop}:${val}`);
  }
};
const expectNoRule = (rules: string[], selectorPrefix: string) => {
  const offender = rules.find((rule) => strip(rule).startsWith(selectorPrefix));
  if (offender) {
    throw new Error(`Expected no rule starting with "${selectorPrefix}" but found:\n  ${strip(offender)}`);
  }
};
const allDecls = (rules: string[]) => rules.map(strip).join(' | ');

describe('Parser — weird values (non-strict)', () => {
  // ────────────────────────────────────────────────────────────────────────
  // A. Malformed selector keys
  // ────────────────────────────────────────────────────────────────────────

  describe('A. malformed selector keys', () => {
    it('does not crash on stray `{` as a key', async () => {
      await expect(parseStyles({ '{': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on stray `}` as a key', async () => {
      await expect(parseStyles({ '}': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on unbalanced `:not(.a` (missing close paren)', async () => {
      await expect(parseStyles({ '&:not(.a': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on unbalanced `[data-x="a"` (missing close bracket)', async () => {
      await expect(parseStyles({ '&[data-x="a"': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on an empty-string selector key', async () => {
      await expect(parseStyles({ '': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on a whitespace-only selector key', async () => {
      await expect(parseStyles({ '   ': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('drops a trailing comma in a selector list', async () => {
      const rules = await parseStyles({ '&:hover, &:focus,': { color: 'red' } } as any, '.X');
      // Two real selectors, no empty third one
      expectRule(rules, '.X:hover, .X:focus', { color: 'red' });
      expect(allDecls(rules)).not.toMatch(/,\s*\{/); // no ", {"
      expect(allDecls(rules)).not.toMatch(/,\s*,/); // no ", ,"
    });

    it('drops a leading comma in a selector list', async () => {
      const rules = await parseStyles({ ',&:hover': { color: 'red' } } as any, '.X');
      expectRule(rules, '.X:hover', { color: 'red' });
      expect(allDecls(rules)).not.toMatch(/^\s*,/m);
    });

    it('drops empty list items between commas', async () => {
      const rules = await parseStyles({ '&:hover, , &:focus': { color: 'red' } } as any, '.X');
      expectRule(rules, '.X:hover, .X:focus', { color: 'red' });
    });

    it('handles comma without surrounding space', async () => {
      const rules = await parseStyles({ '&:hover,&:focus': { color: 'red' } } as any, '.X');
      expectRule(rules, '.X:hover, .X:focus', { color: 'red' });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // B. SCSS / CSS-in-JS typo patterns
  // ────────────────────────────────────────────────────────────────────────

  describe('B. SCSS / CSS-in-JS typo patterns', () => {
    it('does not crash on `&hover` (missing colon typo)', async () => {
      // Current behavior glues to `.Xhover` — we just want it not to throw.
      // Phase 2 will route this through reportParserIssue under strict mode.
      await expect(parseStyles({ '&hover': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on `&: hover` (space after colon typo)', async () => {
      await expect(parseStyles({ '&: hover': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('attaches a bare `:hover` (no `&`) to the parent', async () => {
      const rules = await parseStyles({ ':hover': { color: 'red' } }, '.X');
      expectRule(rules, '.X:hover', { color: 'red' });
    });

    it('treats a bare `.active` nested key as a descendant (SCSS semantics)', async () => {
      const rules = await parseStyles({ '.active': { color: 'red' } }, '.X');
      expectRule(rules, '.X .active', { color: 'red' });
    });

    it('supports `&&.active` (SCSS specificity-bump pattern)', async () => {
      const rules = await parseStyles({ '&&.active': { color: 'red' } }, '.X');
      expectRule(rules, '.X.X.active', { color: 'red' });
    });

    it('supports `& &` (self-descendant)', async () => {
      const rules = await parseStyles({ '& &': { color: 'red' } }, '.X');
      expectRule(rules, '.X .X', { color: 'red' });
    });

    it('supports SCSS-style `&__modifier`', async () => {
      const rules = await parseStyles({ '&__modifier': { color: 'red' } }, '.X');
      expectRule(rules, '.X__modifier', { color: 'red' });
    });

    it('handles `&,` (single-element list with trailing comma)', async () => {
      await expect(parseStyles({ '&,': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // C. Value types that should not crash
  // ────────────────────────────────────────────────────────────────────────

  describe('C. value types that should not crash', () => {
    it('skips `undefined` values without throwing', async () => {
      const rules = await parseStyles({ color: undefined } as any, '.X');
      // No `color:undefined`, no `color:` orphan
      expect(allDecls(rules)).not.toMatch(/color\s*:/);
    });

    it('skips `null` values', async () => {
      const rules = await parseStyles({ color: null } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/color\s*:/);
    });

    it('skips `true` value without throwing', async () => {
      const rules = await parseStyles({ color: true } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/color\s*:/);
    });

    it('skips `false` value without throwing', async () => {
      const rules = await parseStyles({ color: false } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/color\s*:/);
    });

    it('skips empty-string values', async () => {
      const rules = await parseStyles({ color: '' }, '.X');
      expect(allDecls(rules)).not.toMatch(/color\s*:\s*[;}]/);
    });

    it('skips `NaN` on a px property (does not emit "NaNpx")', async () => {
      const rules = await parseStyles({ padding: NaN } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/NaN/);
    });

    it('skips `Infinity` on a px property', async () => {
      const rules = await parseStyles({ padding: Infinity } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/Infinity/i);
    });

    it('emits a negative number on a px property as `-10px`', async () => {
      const [rule] = await parseStyles({ marginTop: -10 }, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('margin-top:-10px');
    });

    it('emits `0` on a px property as `0px`', async () => {
      const [rule] = await parseStyles({ padding: 0 }, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('padding:0px');
    });

    it('handles an empty array as a value without throwing', async () => {
      await expect(parseStyles({ boxShadow: [] } as any, '.X')).resolves.toBeDefined();
    });

    it('joins array values by comma (current toString behavior)', async () => {
      const [rule] = await parseStyles({ boxShadow: ['1px 1px red', '2px 2px blue'] } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('box-shadow:1px1pxred,2px2pxblue');
    });

    it('does not emit an empty rule for a nested empty object', async () => {
      const rules = await parseStyles({ '&:hover': {} }, '.X');
      expect(rules).toEqual([]);
    });

    it('does not emit an empty rule when nested empty sits next to a real declaration', async () => {
      const rules = await parseStyles({ color: 'red', '&:hover': {} }, '.X');
      expectRule(rules, '.X', { color: 'red' });
      expectNoRule(rules, '.X:hover');
    });

    it('does not crash when a function value throws', async () => {
      const styles = {
        color: () => {
          throw new Error('boom');
        },
      } as any;
      await expect(parseStyles(styles, '.X')).resolves.toBeDefined();
    });

    it('skips a function value that returns undefined', async () => {
      const rules = await parseStyles({ color: () => undefined } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/color\s*:/);
    });

    it('skips a Promise that resolves to undefined', async () => {
      const rules = await parseStyles({ color: Promise.resolve(undefined) } as any, '.X');
      expect(allDecls(rules)).not.toMatch(/color\s*:/);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // D. Property-name edge cases
  // ────────────────────────────────────────────────────────────────────────

  describe('D. property-name edge cases', () => {
    it('trims leading/trailing whitespace from property keys', async () => {
      const [rule] = await parseStyles({ '  color  ': 'red' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('color:red');
    });

    it('passes a CSS custom property `--my-var` through unchanged', async () => {
      const [rule] = await parseStyles({ '--my-var': 'red' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('--my-var:red');
    });

    it('does not crash on a key with an embedded colon (copy-paste error)', async () => {
      await expect(parseStyles({ 'color: red': 'red' } as any, '.X')).resolves.toBeDefined();
    });

    it('does not crash on a SCSS-style `$variable` key', async () => {
      await expect(parseStyles({ $foo: 'red' } as any, '.X')).resolves.toBeDefined();
    });

    it('dash-cases camelCase property names', async () => {
      const [rule] = await parseStyles({ backgroundColor: 'red' }, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('background-color:red');
    });

    it('vendor-prefixes `WebkitTransition` as `-webkit-transition`', async () => {
      const [rule] = await parseStyles({ WebkitTransition: 'all 1s' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('-webkit-transition:all1s');
    });

    it('vendor-prefixes `MozAppearance` as `-moz-appearance`', async () => {
      const [rule] = await parseStyles({ MozAppearance: 'none' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('-moz-appearance:none');
    });

    it('does NOT vendor-prefix `Order` (real CSS prop `order`)', async () => {
      const [rule] = await parseStyles({ Order: 1 } as any, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('order:1');
      expect(compact).not.toContain('-order:');
    });

    it('does NOT vendor-prefix `Outline` (real CSS prop `outline`)', async () => {
      const [rule] = await parseStyles({ Outline: '1px solid red' } as any, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('outline:1pxsolidred');
      expect(compact).not.toContain('-outline:');
    });

    it('strips a leading `?` from a property key (existing optional-marker behavior)', async () => {
      const [rule] = await parseStyles({ '?color': 'red' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('color:red');
    });

    it('strips multiple leading `?` from a property key', async () => {
      const [rule] = await parseStyles({ '???color': 'red' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('color:red');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // E. addUnit edge cases
  // ────────────────────────────────────────────────────────────────────────

  describe('E. addUnit edge cases', () => {
    it('does not add a unit to `lineHeight`', async () => {
      const [rule] = await parseStyles({ lineHeight: 1.5 }, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('line-height:1.5');
      expect(compact).not.toContain('line-height:1.5px');
    });

    it('does not add a unit to `opacity`', async () => {
      const [rule] = await parseStyles({ opacity: 0.5 }, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('opacity:0.5');
      expect(compact).not.toContain('opacity:0.5px');
    });

    it('does not add a unit to `zIndex`', async () => {
      const [rule] = await parseStyles({ zIndex: 5 }, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('z-index:5');
      expect(compact).not.toContain('z-index:5px');
    });

    it('does not add a unit to `aspectRatio`', async () => {
      const [rule] = await parseStyles({ aspectRatio: 1 } as any, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('aspect-ratio:1');
      expect(compact).not.toContain('aspect-ratio:1px');
    });

    it('adds `px` to `padding`', async () => {
      const [rule] = await parseStyles({ padding: 8 }, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('padding:8px');
    });

    it('adds `px` to `marginTop`', async () => {
      const [rule] = await parseStyles({ marginTop: 8 }, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('margin-top:8px');
    });

    // The following two are CURRENT behavior we want to capture so a future
    // tightening of the px-property regex is a knowing decision, not a
    // silent change. `paragraphHeight` gets `px` because the height regex
    // matches anything that doesn't start with 'line'; `tabSize` gets `px`
    // because `/.*size.*/` matches it.
    it('captures: `paragraphHeight` currently gets `px` (regex over-match — TODO tighten)', async () => {
      const [rule] = await parseStyles({ paragraphHeight: 12 } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('paragraph-height:12px');
    });

    it('captures: `tabSize` currently gets `px` (regex over-match — TODO tighten)', async () => {
      const [rule] = await parseStyles({ tabSize: 4 } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('tab-size:4px');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // F. Token ({var}) edge cases
  // ────────────────────────────────────────────────────────────────────────

  describe('F. token brace edge cases', () => {
    it('leaves a literal empty `{}` alone in a value', async () => {
      const [rule] = await parseStyles({ content: '"{}"' } as any, '.X');
      expect(strip(rule)).toContain('"{}"');
    });

    it('leaves an unclosed `{color` alone in a value', async () => {
      const [rule] = await parseStyles({ content: '"{color"' } as any, '.X');
      expect(strip(rule)).toContain('"{color"');
    });

    it('substitutes a simple `{spacing}` token', async () => {
      const [rule] = await parseStyles({ padding: '{spacing}' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('padding:var(--spacing)');
    });

    it('trims internal whitespace inside a `{ spacing }` token', async () => {
      const [rule] = await parseStyles({ padding: '{ spacing }' } as any, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('padding:var(--spacing)');
    });

    it('substitutes multiple tokens in a single value', async () => {
      const [rule] = await parseStyles({ margin: '{a} {b}' } as any, '.X');
      const compact = strip(rule).replace(/\s/g, '');
      expect(compact).toContain('var(--a)');
      expect(compact).toContain('var(--b)');
    });

    it('does not crash on a template-literal leftover `${foo}`', async () => {
      await expect(parseStyles({ color: '${foo}' } as any, '.X')).resolves.toBeDefined();
    });

    // Documents current (questionable) negative-token behavior; the intended
    // semantics — wrap in calc() or similar — is tracked as `.todo`.
    it.todo('emits `calc(var(--spacing) * -1)` for a negative token `{-spacing}`');
  });

  // ────────────────────────────────────────────────────────────────────────
  // G. At-rule keys
  // ────────────────────────────────────────────────────────────────────────

  describe('G. at-rule keys', () => {
    it('does not crash on a bare `@media` with no condition', async () => {
      await expect(parseStyles({ '@media': { color: 'red' } } as any, '.X')).resolves.toBeDefined();
    });

    it('passes `@media (min-width:600px)` (no space before paren) through', async () => {
      const rules = await parseStyles({ '@media(min-width:600px)': { color: 'red' } } as any, '.X');
      const media = rules.find((r) => strip(r).startsWith('@media(min-width:600px) {'));
      expect(media).toBeDefined();
    });

    it('passes `@supports (display: grid)` through', async () => {
      const rules = await parseStyles({ '@supports (display: grid)': { color: 'red' } } as any, '.X');
      const supports = rules.find((r) => strip(r).startsWith('@supports (display: grid) {'));
      expect(supports).toBeDefined();
    });

    it('passes `@container (min-width: 400px)` through', async () => {
      const rules = await parseStyles({ '@container (min-width: 400px)': { color: 'red' } } as any, '.X');
      const container = rules.find((r) => strip(r).startsWith('@container (min-width: 400px) {'));
      expect(container).toBeDefined();
    });

    it('passes `@layer base` through', async () => {
      const rules = await parseStyles({ '@layer base': { color: 'red' } } as any, '.X');
      const layer = rules.find((r) => strip(r).startsWith('@layer base {'));
      expect(layer).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // H. Iteration edge cases
  // ────────────────────────────────────────────────────────────────────────

  describe('H. iteration edge cases', () => {
    it('ignores Symbol-keyed properties (Object.entries skips them)', async () => {
      const styles: any = { color: 'red' };
      styles[Symbol('hidden')] = 'should not appear';
      const [rule] = await parseStyles(styles, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('color:red');
      expect(strip(rule)).not.toContain('should not appear');
    });

    it('handles styles built with `Object.create(null)`', async () => {
      const styles: any = Object.create(null);
      styles.color = 'red';
      const [rule] = await parseStyles(styles, '.X');
      expect(strip(rule).replace(/\s/g, '')).toContain('color:red');
    });

    it('returns an empty array for an empty top-level styles object', async () => {
      const rules = await parseStyles({}, '.X');
      expect(rules).toEqual([]);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Strict mode — these rely on `SaltyConfig.strict` landing in Phase 2.
// In strict:true mode the parser throws on issues; in strict:'warn' it logs.
// ──────────────────────────────────────────────────────────────────────────

describe('Parser — strict mode', () => {
  const strict = { strict: true } as any;
  const warn = { strict: 'warn' } as any;

  it('throws on `undefined` value', async () => {
    await expect(parseStyles({ color: undefined } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on `true` value', async () => {
    await expect(parseStyles({ color: true } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on `NaN` on a px property', async () => {
    await expect(parseStyles({ padding: NaN } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on `Infinity` on a px property', async () => {
    await expect(parseStyles({ padding: Infinity } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on a key with an embedded colon (`color: red` as a key)', async () => {
    await expect(parseStyles({ 'color: red': 'red' } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on a `$variable`-style key', async () => {
    await expect(parseStyles({ $foo: 'red' } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on a bare `@media` with no condition', async () => {
    await expect(parseStyles({ '@media': { color: 'red' } } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on a `&hover` (missing colon) selector typo', async () => {
    await expect(parseStyles({ '&hover': { color: 'red' } } as any, '.X', strict)).rejects.toThrow();
  });

  it('throws on a template-literal leftover `${foo}` in a value', async () => {
    await expect(parseStyles({ color: '${foo}' } as any, '.X', strict)).rejects.toThrow();
  });

  it('warns but does not throw under strict:"warn"', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      await expect(parseStyles({ color: undefined } as any, '.X', warn)).resolves.toBeDefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
