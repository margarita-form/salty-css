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
        '.X',
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
        '.X',
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
        '.X',
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
        '.X',
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
        '.X',
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
        '.X',
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
        '.X',
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
        '.X',
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

    // ──────────────────────────────────────────────────────────────────────
    // J. @keyframes (inline at-rule form)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Keyframe selectors (`0%`, `100%`, `from`, `to`) are pseudo-selectors,
     * not nested rules — they must stand alone regardless of the parent scope.
     */
    it('inline @keyframes at top scope does not leak the parent selector', async () => {
      const rules = await parseStyles(
        {
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '0% 0%' },
            '100%': { backgroundPosition: '200% 0%' },
          },
        },
        '.X',
      );
      const kf = rules.find((rule) => strip(rule).startsWith('@keyframes shimmer {'));
      if (!kf) throw new Error(`@keyframes rule not found in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
      const compact = strip(kf);
      expect(compact).toContain('0% {');
      expect(compact).toContain('100% {');
      expect(compact.replace(/\s/g, '')).toContain('background-position:0%0%');
      expect(compact.replace(/\s/g, '')).toContain('background-position:200%0%');
      expect(compact).not.toContain('.X 0%');
      expect(compact).not.toContain('.X 100%');
    });

    /**
     * The reported bug: @keyframes inside a variant prepended `.X.variant-rgb`
     * onto the `0%` / `100%` selectors, producing rules that never matched.
     */
    it('inline @keyframes inside a variant emits valid CSS (no variant scope on keyframe selectors)', async () => {
      const rules = await parseStyles(
        {
          variants: {
            variant: {
              rgb: {
                animation: 'shimmer 1s linear infinite',
                '@keyframes shimmer': {
                  '0%': { backgroundPosition: '0% 0%' },
                  '100%': { backgroundPosition: '200% 0%' },
                },
              },
            },
          },
        },
        '.X',
      );
      expectRule(rules, '.X.variant-rgb', { animation: 'shimmer1slinearinfinite' });
      const kf = rules.find((rule) => strip(rule).startsWith('@keyframes shimmer {'));
      if (!kf) throw new Error(`@keyframes rule not found in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
      const compact = strip(kf);
      expect(compact).not.toContain('.X.variant-rgb');
      expect(compact).toContain('0% {');
      expect(compact).toContain('100% {');
    });

    it('inline @keyframes supports `from` / `to` keys without scope leakage', async () => {
      const rules = await parseStyles(
        {
          variants: {
            fade: {
              on: {
                '@keyframes fade': {
                  from: { opacity: 0 },
                  to: { opacity: 1 },
                },
              },
            },
          },
        },
        '.X',
      );
      const kf = rules.find((rule) => strip(rule).startsWith('@keyframes fade {'));
      if (!kf) throw new Error(`@keyframes rule not found in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
      const compact = strip(kf);
      expect(compact).toContain('from {');
      expect(compact).toContain('to {');
      expect(compact).not.toContain('.X.fade-on from');
      expect(compact).not.toContain('.X.fade-on to');
    });

    it('vendor-prefixed @-webkit-keyframes is treated the same way', async () => {
      const rules = await parseStyles(
        {
          '@-webkit-keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
          },
        },
        '.X',
      );
      const kf = rules.find((rule) => strip(rule).startsWith('@-webkit-keyframes spin {'));
      if (!kf) throw new Error(`@-webkit-keyframes rule not found in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
      const compact = strip(kf);
      expect(compact).not.toContain('.X 0%');
      expect(compact).toContain('0% {');
      expect(compact).toContain('100% {');
    });

    /**
     * Regression guard: @media inside a variant must still scope its children
     * to the variant — keyframes is the *only* at-rule whose children should
     * shed the parent scope.
     */
    it('@media inside a variant still scopes children to the variant', async () => {
      const rules = await parseStyles(
        {
          variants: {
            variant: {
              rgb: {
                '@media (min-width: 600px)': { color: 'red' },
              },
            },
          },
        },
        '.X',
      );
      const media = rules.find((rule) => strip(rule).startsWith('@media (min-width: 600px) {'));
      if (!media) throw new Error(`@media rule not found in:\n${rules.map((r) => `  ${strip(r)}`).join('\n')}`);
      const compact = strip(media);
      expect(compact).toContain('.X.variant-rgb {');
      expect(compact.replace(/\s/g, '')).toContain('color:red');
    });

    // ──────────────────────────────────────────────────────────────────────
    // K. `global` key — scope escape hatch
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Input:
     *   parseStyles({ color: 'red', global: { ':root': { '--x': 'y' } } }, '.X')
     *
     * Expected CSS (two rules):
     *   .X { color: red; }
     *   :root { --x: y; }
     *
     * :root must NOT be combined with the parent scope (.X:root would be wrong).
     */
    it('global key emits nested selectors without inheriting the parent scope', async () => {
      const rules = await parseStyles({ color: 'red', global: { ':root': { '--x': 'y' } } }, '.X');
      expectRule(rules, '.X', { color: 'red' });
      expectRule(rules, ':root', { '--x': 'y' });
      for (const rule of rules) {
        expect(strip(rule)).not.toMatch(/\.X:root/);
      }
    });

    /**
     * Input:
     *   parseStyles({ global: { 'html': { colorScheme: 'dark' }, 'body': { margin: '0' } } }, '.X')
     *
     * Expected CSS:
     *   html { color-scheme: dark; }
     *   body { margin: 0; }
     */
    it('global key emits html and body as unscoped rules', async () => {
      const rules = await parseStyles({ global: { html: { colorScheme: 'dark' }, body: { margin: '0' } } }, '.X');
      expectRule(rules, 'html', { 'color-scheme': 'dark' });
      expectRule(rules, 'body', { margin: '0' });
      for (const rule of rules) {
        expect(strip(rule)).not.toMatch(/\.X html/);
        expect(strip(rule)).not.toMatch(/\.X body/);
      }
    });

    /**
     * Input:
     *   parseStyles({ global: { ':root': { '&:has(.dark)': { '--bg': 'black' } } } }, '.X')
     *
     * Expected CSS:
     *   :root:has(.dark) { --bg: black; }
     *
     * Nesting inside global still works — it just starts from an empty scope.
     */
    it('global key supports nesting inside the unscoped selector', async () => {
      const rules = await parseStyles({ global: { ':root': { '&:has(.dark)': { '--bg': 'black' } } } }, '.X');
      expectRule(rules, ':root:has(.dark)', { '--bg': 'black' });
    });
  });
});

describe('Template variants', () => {
  const compact = (s: string) => s.replace(/\s/g, '');

  const richTemplate = {
    textStyle: {
      caption: {
        fontSize: '12px',
        lineHeight: '1.4',
      },
      heading: {
        base: {
          fontFamily: 'serif',
          lineHeight: '1.2',
        },
        variants: {
          weight: {
            light: { fontWeight: '300' },
            regular: { fontWeight: '600' },
            heavy: { fontWeight: '900' },
          },
          emphasis: {
            muted: { color: '#888' },
            loud: { color: '#f00', textTransform: 'uppercase' },
          },
          italic: {
            true: { fontStyle: 'italic' },
          },
        },
        defaultVariants: {
          weight: 'regular',
        },
        compoundVariants: [{ weight: 'heavy', italic: true, css: { letterSpacing: '-0.005em' } }],
        anyOfVariants: [{ weight: 'heavy', emphasis: 'loud', css: { textShadow: '0 1px 0 #0001' } }],
        small: { base: { fontSize: '14px' } },
        large: {
          base: { fontSize: '32px', lineHeight: '1.1' },
          variants: {
            weight: {
              heavy: { fontWeight: '950', letterSpacing: '-0.01em' },
            },
          },
          defaultVariants: {
            weight: 'heavy',
          },
        },
      },
    },
  };

  const config = { templates: richTemplate };

  it('backward-compat: flat-shape template path resolves unchanged', async () => {
    const [rule] = await parseStyles({ textStyle: 'caption' }, '.X', config);
    const c = compact(rule);
    expect(c).toContain('font-size:12px');
    expect(c).toContain('line-height:1.4');
  });

  it('parent ref resolves to base only', async () => {
    const [rule] = await parseStyles({ textStyle: 'heading' }, '.X', config);
    const c = compact(rule);
    expect(c).toContain('font-family:serif');
    expect(c).toContain('line-height:1.2');
    // No size leaf applied.
    expect(c).not.toContain('font-size:');
  });

  it('leaf inherits parent base and adds its own', async () => {
    const [rule] = await parseStyles({ textStyle: 'heading.small' }, '.X', config);
    const c = compact(rule);
    expect(c).toContain('font-family:serif');
    expect(c).toContain('font-size:14px');
  });

  it('defaultVariants fires at the parent when call site omits the axis', async () => {
    const [rule] = await parseStyles({ textStyle: 'heading.small' }, '.X', config);
    const c = compact(rule);
    // weight=regular default -> fontWeight 600
    expect(c).toContain('font-weight:600');
  });

  it('leaf defaultVariants override parent defaultVariants (closest-wins)', async () => {
    const [rule] = await parseStyles({ textStyle: 'heading.large' }, '.X', config);
    const c = compact(rule);
    // heading.large.defaultVariants.weight = 'heavy' overrides parent's 'regular'
    // Plus heading.large.variants.weight.heavy = fontWeight 950 (replace semantics)
    expect(c).toContain('font-weight:950');
    expect(c).toContain('letter-spacing:-0.01em');
  });

  it('string call-site form picks up named variant', async () => {
    const [rule] = await parseStyles({ textStyle: 'heading.small@weight=light' }, '.X', config);
    const c = compact(rule);
    expect(c).toContain('font-weight:300');
  });

  it('object call-site form is equivalent to string form', async () => {
    const [a] = await parseStyles({ textStyle: 'heading.small@weight=light&emphasis=muted' }, '.X', config);
    const [b] = await parseStyles({ textStyle: { name: 'heading.small', weight: 'light', emphasis: 'muted' } }, '.X', config);
    expect(compact(a)).toBe(compact(b));
  });

  it('boolean shorthand maps to true value', async () => {
    const [a] = await parseStyles({ textStyle: 'heading.small@italic' }, '.X', config);
    const [b] = await parseStyles({ textStyle: { name: 'heading.small', italic: true } }, '.X', config);
    expect(compact(a)).toBe(compact(b));
    expect(compact(a)).toContain('font-style:italic');
  });

  it('replace semantics: leaf variant override does not inherit sibling properties from parent bundle', async () => {
    // heading.large overrides weight.heavy with { fontWeight: 950, letterSpacing: -0.01em }.
    // The parent's heavy bundle was just { fontWeight: 900 } — fontWeight 900 must NOT appear.
    const [rule] = await parseStyles({ textStyle: 'heading.large@weight=heavy' }, '.X', config);
    const c = compact(rule);
    expect(c).toContain('font-weight:950');
    expect(c).not.toContain('font-weight:900');
  });

  it('compound variant fires only when ALL axes match', async () => {
    const [hit] = await parseStyles({ textStyle: { name: 'heading.small', weight: 'heavy', italic: true } }, '.X', config);
    expect(compact(hit)).toContain('letter-spacing:-0.005em');

    const [miss] = await parseStyles({ textStyle: { name: 'heading.small', weight: 'heavy' } }, '.X', config);
    expect(compact(miss)).not.toContain('letter-spacing:-0.005em');
  });

  it('any-of variant fires when at least one axis matches', async () => {
    const [hit] = await parseStyles({ textStyle: { name: 'heading.small', weight: 'heavy' } }, '.X', config);
    expect(compact(hit)).toContain('text-shadow:0 1px 0 #0001'.replace(/\s/g, ''));

    const [otherAxis] = await parseStyles({ textStyle: { name: 'heading.small', emphasis: 'loud' } }, '.X', config);
    expect(compact(otherAxis)).toContain('text-shadow:0 1px 0 #0001'.replace(/\s/g, ''));

    const [miss] = await parseStyles({ textStyle: { name: 'heading.small', emphasis: 'muted' } }, '.X', config);
    expect(compact(miss)).not.toContain('text-shadow:');
  });

  it('unknown axis at call site is ignored (and warns)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const [rule] = await parseStyles({ textStyle: { name: 'heading.small', nonexistent: 'whatever' } }, '.X', config);
      expect(compact(rule)).toContain('font-family:serif');
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
