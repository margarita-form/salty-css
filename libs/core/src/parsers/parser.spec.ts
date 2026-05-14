import { parseStyles } from './index';

describe('Parser testing', () => {
  it('parse flat styles', async () => {
    const [styles] = await parseStyles({ color: 'red' });
    expect(styles.replace(/\s/g, '')).toBe('color: red;'.replace(/\s/g, ''));
  });
  it('parse styles with class name', async () => {
    const [styles] = await parseStyles({ color: 'red' }, '.wrapper');
    expect(styles.replace(/\s/g, '')).toBe('.wrapper { color: red; }'.replace(/\s/g, ''));
  });
  it('parse styles with tag selector', async () => {
    const [styles] = await parseStyles({ color: 'red' }, 'main');
    expect(styles.replace(/\s/g, '')).toBe('main { color: red; }'.replace(/\s/g, ''));
  });
  it('parse styles with id selector', async () => {
    const [styles] = await parseStyles({ color: 'red' }, '#section');
    expect(styles.replace(/\s/g, '')).toBe('#section { color: red; }'.replace(/\s/g, ''));
  });

  describe('Selector scoping', () => {
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

    // ──────────────────────────────────────────────────────────────────────
    // Baseline: the previously-fixed bug + its closest neighbours
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ '&:hover, &:focus-visible': { fontWeight: 600 } }, '.X')
     *
     * Expected CSS:
     *   .X:hover, .X:focus-visible { font-weight: 600; }
     */
    it('appends comma-separated pseudo-class child to a single parent', async () => {
      const rules = await parseStyles({ '&:hover, &:focus-visible': { fontWeight: 600 } }, '.X');
      expectRule(rules, '.X:hover, .X:focus-visible', { 'font-weight': '600' });
    });

    /**
     * Input (the screenshot bug):
     *   parseStyles({
     *     '&:hover, &:focus-visible': {
     *       '& svg': { transform: 'translateX(2px)' },
     *     },
     *   }, '.X')
     *
     * Expected CSS:
     *   .X:hover svg, .X:focus-visible svg { transform: translateX(2px); }
     *
     * The bad form ".X:hover, .X:focus-visible svg { ... }" would let the
     * transform leak onto the parent on hover; explicitly assert it is gone.
     */
    it('distributes descendant child across comma-separated parent', async () => {
      const rules = await parseStyles(
        {
          '&:hover, &:focus-visible': {
            '& svg': { transform: 'translateX(2px)' },
          },
        },
        '.X'
      );
      expectRule(rules, '.X:hover svg, .X:focus-visible svg', { transform: 'translateX(2px)' });
      for (const rule of rules) {
        expect(strip(rule)).not.toMatch(/^\.X:hover, \.X:focus-visible svg \{/);
      }
    });

    /**
     * Input:
     *   parseStyles({
     *     '&:hover, &:focus': { ':active': { color: 'red' } },
     *   }, '.X')
     *
     * Expected CSS:
     *   .X:hover:active, .X:focus:active { color: red; }
     */
    it('distributes pseudo child (starting with colon) across comma parent', async () => {
      const rules = await parseStyles(
        {
          '&:hover, &:focus': { ':active': { color: 'red' } },
        },
        '.X'
      );
      expectRule(rules, '.X:hover:active, .X:focus:active', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({
     *     '&:hover, &:focus': { '& a, & button': { color: 'red' } },
     *   }, '.X')
     *
     * Expected CSS (parent-major order):
     *   .X:hover a, .X:hover button, .X:focus a, .X:focus button { color: red; }
     */
    it('produces parent-major cartesian product for comma×comma with &', async () => {
      const rules = await parseStyles(
        {
          '&:hover, &:focus': { '& a, & button': { color: 'red' } },
        },
        '.X'
      );
      expectRule(rules, '.X:hover a, .X:hover button, .X:focus a, .X:focus button', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '&:is(.a, .b)': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X:is(.a, .b) { color: red; }
     *
     * The comma is inside :is(...) — the splitter must NOT cut it.
     */
    it('does not split commas inside :is() / :where()', async () => {
      const rules = await parseStyles({ '&:is(.a, .b)': { color: 'red' } }, '.X');
      expectRule(rules, '.X:is(.a, .b)', { color: 'red' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // A. Combinators
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ '& > svg': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X > svg { color: red; }
     */
    it('handles direct-child combinator', async () => {
      const rules = await parseStyles({ '& > svg': { color: 'red' } }, '.X');
      expectRule(rules, '.X > svg', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '& + .sibling': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X + .sibling { color: red; }
     */
    it('handles adjacent-sibling combinator', async () => {
      const rules = await parseStyles({ '& + .sibling': { color: 'red' } }, '.X');
      expectRule(rules, '.X + .sibling', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '& ~ .sibling': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X ~ .sibling { color: red; }
     */
    it('handles general-sibling combinator', async () => {
      const rules = await parseStyles({ '& ~ .sibling': { color: 'red' } }, '.X');
      expectRule(rules, '.X ~ .sibling', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '& + &': { marginLeft: '8px' } }, '.X')
     *
     * Expected CSS:
     *   .X + .X { margin-left: 8px; }
     *
     * Both & tokens in the child must be substituted by the parent.
     */
    it('replaces every & in a child selector', async () => {
      const rules = await parseStyles({ '& + &': { marginLeft: '8px' } }, '.X');
      expectRule(rules, '.X + .X', { 'margin-left': '8px' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // B. & in non-prefix positions
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ '&.active': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X.active { color: red; }
     */
    it('chains a class onto the parent with &.class', async () => {
      const rules = await parseStyles({ '&.active': { color: 'red' } }, '.X');
      expectRule(rules, '.X.active', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '&::before': { content: '""' } }, '.X')
     *
     * Expected CSS:
     *   .X::before { content: ""; }
     */
    it('attaches a pseudo-element with &::before', async () => {
      const rules = await parseStyles({ '&::before': { content: '""' } }, '.X');
      expectRule(rules, '.X::before', { content: '""' });
    });

    /**
     * Input:
     *   parseStyles({ '.dark-theme &': { color: 'white' } }, '.X')
     *
     * Expected CSS:
     *   .dark-theme .X { color: white; }
     *
     * Contextual & — parent token appears at the end of the child selector.
     */
    it('supports contextual & (parent appears at end of child)', async () => {
      const rules = await parseStyles({ '.dark-theme &': { color: 'white' } }, '.X');
      expectRule(rules, '.dark-theme .X', { color: 'white' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // C. Functional pseudo-classes with internal commas
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ '&:not(.a, .b)': { opacity: '0.5' } }, '.X')
     *
     * Expected CSS:
     *   .X:not(.a, .b) { opacity: 0.5; }
     */
    it('keeps commas inside :not(...) intact', async () => {
      const rules = await parseStyles({ '&:not(.a, .b)': { opacity: '0.5' } }, '.X');
      expectRule(rules, '.X:not(.a, .b)', { opacity: '0.5' });
    });

    /**
     * Input:
     *   parseStyles({ '&:has(.a, .b)': { borderColor: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X:has(.a, .b) { border-color: red; }
     */
    it('keeps commas inside :has(...) intact', async () => {
      const rules = await parseStyles({ '&:has(.a, .b)': { borderColor: 'red' } }, '.X');
      expectRule(rules, '.X:has(.a, .b)', { 'border-color': 'red' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // D. Attribute selectors
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ '&[data-active]': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X[data-active] { color: red; }
     */
    it('attaches a plain attribute selector', async () => {
      const rules = await parseStyles({ '&[data-active]': { color: 'red' } }, '.X');
      expectRule(rules, '.X[data-active]', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '&[data-tags="a,b"]': { color: 'red' } }, '.X')
     *
     * Expected CSS:
     *   .X[data-tags="a,b"] { color: red; }
     *
     * The comma is inside [...] — the splitter must NOT cut it.
     */
    it('keeps commas inside attribute values intact', async () => {
      const rules = await parseStyles({ '&[data-tags="a,b"]': { color: 'red' } }, '.X');
      expectRule(rules, '.X[data-tags="a,b"]', { color: 'red' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // E. Multi-level nesting
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({
     *     '&:hover': { '& svg': { '&:focus': { color: 'red' } } },
     *   }, '.X')
     *
     * Expected CSS:
     *   .X:hover svg:focus { color: red; }
     */
    it('chains three nesting levels with a single parent at each step', async () => {
      const rules = await parseStyles(
        {
          '&:hover': { '& svg': { '&:focus': { color: 'red' } } },
        },
        '.X'
      );
      expectRule(rules, '.X:hover svg:focus', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({
     *     '&:hover': { '&:active, &:focus': { color: 'red' } },
     *   }, '.X')
     *
     * Expected CSS:
     *   .X:hover:active, .X:hover:focus { color: red; }
     */
    it('distributes a comma child added at a deeper nesting level', async () => {
      const rules = await parseStyles(
        {
          '&:hover': { '&:active, &:focus': { color: 'red' } },
        },
        '.X'
      );
      expectRule(rules, '.X:hover:active, .X:hover:focus', { color: 'red' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // F. Cross-product breadth
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({
     *     '&.a, &.b, &.c': { '& span, & em': { color: 'red' } },
     *   }, '.X')
     *
     * Expected CSS (parent-major order, 3 × 2 = 6 selectors):
     *   .X.a span, .X.a em,
     *   .X.b span, .X.b em,
     *   .X.c span, .X.c em { color: red; }
     */
    it('produces 3×2 cartesian product in parent-major order', async () => {
      const rules = await parseStyles(
        {
          '&.a, &.b, &.c': { '& span, & em': { color: 'red' } },
        },
        '.X'
      );
      expectRule(rules, '.X.a span, .X.a em, .X.b span, .X.b em, .X.c span, .X.c em', { color: 'red' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // G. Media queries
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({
     *     '&:hover, &:focus': {
     *       '@media (min-width: 600px)': { color: 'red' },
     *     },
     *   }, '.X')
     *
     * Expected CSS:
     *   @media (min-width: 600px) {
     *     .X:hover, .X:focus { color: red; }
     *   }
     */
    it('preserves comma-separated selector list inside an @media block', async () => {
      const rules = await parseStyles(
        {
          '&:hover, &:focus': {
            '@media (min-width: 600px)': { color: 'red' },
          },
        },
        '.X'
      );
      const media = rules.find((rule) => strip(rule).startsWith('@media (min-width: 600px) {'));
      if (!media) throw new Error(`@media rule not found in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
      const compact = strip(media);
      expect(compact).toContain('.X:hover, .X:focus {');
      expect(compact.replace(/\s/g, '')).toContain('color:red');
    });

    // ──────────────────────────────────────────────────────────────────────
    // H. Self-properties + nested children co-existing in one block
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({
     *     '&:hover': { color: 'red', '& svg': { opacity: '0.5' } },
     *   }, '.X')
     *
     * Expected CSS (two separate rules):
     *   .X:hover { color: red; }
     *   .X:hover svg { opacity: 0.5; }
     */
    it('emits parent-level properties and nested rules as separate rules', async () => {
      const rules = await parseStyles(
        {
          '&:hover': { color: 'red', '& svg': { opacity: '0.5' } },
        },
        '.X'
      );
      expectRule(rules, '.X:hover', { color: 'red' });
      expectRule(rules, '.X:hover svg', { opacity: '0.5' });
    });

    // ──────────────────────────────────────────────────────────────────────
    // I. Non-class parent scopes
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ '& a': { color: 'red' } }, 'main')
     *
     * Expected CSS:
     *   main a { color: red; }
     */
    it('handles a tag parent with a descendant child', async () => {
      const rules = await parseStyles({ '& a': { color: 'red' } }, 'main');
      expectRule(rules, 'main a', { color: 'red' });
    });

    /**
     * Input:
     *   parseStyles({ '& a, & button': { color: 'red' } }, 'main')
     *
     * Expected CSS:
     *   main a, main button { color: red; }
     */
    it('distributes a comma child under a tag parent', async () => {
      const rules = await parseStyles({ '& a, & button': { color: 'red' } }, 'main');
      expectRule(rules, 'main a, main button', { color: 'red' });
    });
  });
});
