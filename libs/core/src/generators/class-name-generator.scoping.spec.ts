import { ClassNameGenerator } from './class-name-generator';

describe('ClassNameGenerator — CSS scoping', () => {
  const strip = (s: string) => s.replace(/\s+/g, ' ').trim();
  const compact = (s: string) => s.replace(/\s+/g, '');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildCss = async (params: any) => {
    const gen = new ClassNameGenerator(params);
    const css = await gen.css;
    return { gen, css, X: `.${gen.cssClassName}` };
  };

  // Find a top-level `selector { … }` block in the joined CSS string and
  // assert its declarations. Brace-balanced so nested @media blocks don't
  // confuse the boundary search.
  const expectRule = (css: string, selector: string, decls: Record<string, string> = {}) => {
    const stripped = strip(css);
    const needle = `${selector} {`;
    const idx = stripped.indexOf(needle);
    if (idx === -1) {
      throw new Error(`Expected selector "${selector}" in:\n${stripped}`);
    }
    const rest = stripped.slice(idx + needle.length);
    let depth = 1;
    let end = -1;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '{') depth++;
      else if (rest[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error(`Could not find end of rule for "${selector}" in:\n${stripped}`);
    const ruleBlock = compact(rest.slice(0, end));
    for (const [prop, val] of Object.entries(decls)) {
      expect(ruleBlock).toContain(`${prop}:${val}`);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // Baseline: scoping just works at all
  // ──────────────────────────────────────────────────────────────────────

  it('wraps flat base styles with the generated class scope', async () => {
    const { css, X } = await buildCss({ base: { color: 'red' } });
    expectRule(css, X, { color: 'red' });
  });

  it('scopes &:hover under the generated class', async () => {
    const { css, X } = await buildCss({ base: { '&:hover': { color: 'blue' } } });
    expectRule(css, `${X}:hover`, { color: 'blue' });
  });

  it('appends comma-separated pseudo-class child to the class parent', async () => {
    const { css, X } = await buildCss({ base: { '&:hover, &:focus-visible': { fontWeight: 600 } } });
    expectRule(css, `${X}:hover, ${X}:focus-visible`, { 'font-weight': '600' });
  });

  // The screenshot bug: descendant child must distribute across both
  // pseudo parents, not stay attached to only the last one.
  it('distributes descendant child across comma-separated parent', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover, &:focus-visible': { '& svg': { transform: 'translateX(2px)' } } },
    });
    expectRule(css, `${X}:hover svg, ${X}:focus-visible svg`, { transform: 'translateX(2px)' });
    expect(strip(css)).not.toMatch(new RegExp(`${X.replace('.', '\\.')}:hover, ${X.replace('.', '\\.')}:focus-visible svg \\{`));
  });

  it('distributes pseudo child (starting with colon) across comma parent', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover, &:focus': { ':active': { color: 'red' } } },
    });
    expectRule(css, `${X}:hover:active, ${X}:focus:active`, { color: 'red' });
  });

  it('produces parent-major cartesian product for comma×comma with &', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover, &:focus': { '& a, & button': { color: 'red' } } },
    });
    expectRule(css, `${X}:hover a, ${X}:hover button, ${X}:focus a, ${X}:focus button`, { color: 'red' });
  });

  it('does not split commas inside :is() / :where()', async () => {
    const { css, X } = await buildCss({ base: { '&:is(.a, .b)': { color: 'red' } } });
    expectRule(css, `${X}:is(.a, .b)`, { color: 'red' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // A. Combinators
  // ──────────────────────────────────────────────────────────────────────

  it('handles direct-child combinator', async () => {
    const { css, X } = await buildCss({ base: { '& > svg': { color: 'red' } } });
    expectRule(css, `${X} > svg`, { color: 'red' });
  });

  it('handles adjacent-sibling combinator', async () => {
    const { css, X } = await buildCss({ base: { '& + .sibling': { color: 'red' } } });
    expectRule(css, `${X} + .sibling`, { color: 'red' });
  });

  it('handles general-sibling combinator', async () => {
    const { css, X } = await buildCss({ base: { '& ~ .sibling': { color: 'red' } } });
    expectRule(css, `${X} ~ .sibling`, { color: 'red' });
  });

  it('replaces every & in a child selector', async () => {
    const { css, X } = await buildCss({ base: { '& + &': { marginLeft: '8px' } } });
    expectRule(css, `${X} + ${X}`, { 'margin-left': '8px' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // B. & in non-prefix positions
  // ──────────────────────────────────────────────────────────────────────

  it('chains a class onto the parent with &.class', async () => {
    const { css, X } = await buildCss({ base: { '&.active': { color: 'red' } } });
    expectRule(css, `${X}.active`, { color: 'red' });
  });

  it('attaches a pseudo-element with &::before', async () => {
    const { css, X } = await buildCss({ base: { '&::before': { content: '""' } } });
    expectRule(css, `${X}::before`, { content: '""' });
  });

  it('supports contextual & (parent appears at end of child)', async () => {
    const { css, X } = await buildCss({ base: { '.dark-theme &': { color: 'white' } } });
    expectRule(css, `.dark-theme ${X}`, { color: 'white' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // C. Functional pseudo-classes with internal commas
  // ──────────────────────────────────────────────────────────────────────

  it('keeps commas inside :not(...) intact', async () => {
    const { css, X } = await buildCss({ base: { '&:not(.a, .b)': { opacity: '0.5' } } });
    expectRule(css, `${X}:not(.a, .b)`, { opacity: '0.5' });
  });

  it('keeps commas inside :has(...) intact', async () => {
    const { css, X } = await buildCss({ base: { '&:has(.a, .b)': { borderColor: 'red' } } });
    expectRule(css, `${X}:has(.a, .b)`, { 'border-color': 'red' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // D. Attribute selectors
  // ──────────────────────────────────────────────────────────────────────

  it('attaches a plain attribute selector', async () => {
    const { css, X } = await buildCss({ base: { '&[data-active]': { color: 'red' } } });
    expectRule(css, `${X}[data-active]`, { color: 'red' });
  });

  it('keeps commas inside attribute values intact', async () => {
    const { css, X } = await buildCss({ base: { '&[data-tags="a,b"]': { color: 'red' } } });
    expectRule(css, `${X}[data-tags="a,b"]`, { color: 'red' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // E. Multi-level nesting
  // ──────────────────────────────────────────────────────────────────────

  it('chains three nesting levels with a single parent at each step', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover': { '& svg': { '&:focus': { color: 'red' } } } },
    });
    expectRule(css, `${X}:hover svg:focus`, { color: 'red' });
  });

  it('distributes a comma child added at a deeper nesting level', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover': { '&:active, &:focus': { color: 'red' } } },
    });
    expectRule(css, `${X}:hover:active, ${X}:hover:focus`, { color: 'red' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // F. Cross-product breadth
  // ──────────────────────────────────────────────────────────────────────

  it('produces 3×2 cartesian product in parent-major order', async () => {
    const { css, X } = await buildCss({
      base: { '&.a, &.b, &.c': { '& span, & em': { color: 'red' } } },
    });
    expectRule(css, `${X}.a span, ${X}.a em, ${X}.b span, ${X}.b em, ${X}.c span, ${X}.c em`, { color: 'red' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // G. Media queries
  // ──────────────────────────────────────────────────────────────────────

  it('preserves comma-separated selector list inside an @media block', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover, &:focus': { '@media (min-width: 600px)': { color: 'red' } } },
    });
    const stripped = strip(css);
    expect(stripped).toContain('@media (min-width: 600px) {');
    expect(stripped).toContain(`${X}:hover, ${X}:focus {`);
    expect(compact(stripped)).toContain('color:red');
  });

  // ──────────────────────────────────────────────────────────────────────
  // H. Self-properties + nested children co-existing in one block
  // ──────────────────────────────────────────────────────────────────────

  it('emits parent-level properties and nested rules as separate rules', async () => {
    const { css, X } = await buildCss({
      base: { '&:hover': { color: 'red', '& svg': { opacity: '0.5' } } },
    });
    expectRule(css, `${X}:hover`, { color: 'red' });
    expectRule(css, `${X}:hover svg`, { opacity: '0.5' });
  });

  // ──────────────────────────────────────────────────────────────────────
  // I. Variants — unique to the className/styled surface (parser spec
  // doesn't exercise these because they're a generator-shaped concept).
  // ──────────────────────────────────────────────────────────────────────

  it('scopes a variant under .{hash}.{prop}-{value}', async () => {
    const { css, X } = await buildCss({
      base: { color: 'red' },
      variants: { size: { lg: { fontSize: '20px' } } },
    });
    expectRule(css, X, { color: 'red' });
    expectRule(css, `${X}.size-lg`, { 'font-size': '20px' });
  });

  it('emits a separate rule per variant value', async () => {
    const { css, X } = await buildCss({
      variants: { size: { sm: { fontSize: '12px' }, lg: { fontSize: '20px' } } },
    });
    expectRule(css, `${X}.size-sm`, { 'font-size': '12px' });
    expectRule(css, `${X}.size-lg`, { 'font-size': '20px' });
  });

  it('lets nested pseudo selectors inside a variant inherit the variant scope', async () => {
    const { css, X } = await buildCss({
      variants: { size: { lg: { '&:hover': { fontSize: '24px' } } } },
    });
    expectRule(css, `${X}.size-lg:hover`, { 'font-size': '24px' });
  });

  it('scopes compoundVariants under .{hash}.{prop1}-{v1}.{prop2}-{v2}', async () => {
    const { css, X } = await buildCss({
      compoundVariants: [{ size: 'lg', color: 'red', css: { letterSpacing: '0.5px' } }],
    });
    expectRule(css, `${X}.size-lg.color-red`, { 'letter-spacing': '0.5px' });
  });

  it('scopes anyOfVariants with :where(...) so specificity stays flat', async () => {
    const { css, X } = await buildCss({
      anyOfVariants: [{ size: 'lg', color: 'red', css: { padding: '4px' } }],
    });
    expectRule(css, `${X}:where(.size-lg, .color-red)`, { padding: '4px' });
  });
});
