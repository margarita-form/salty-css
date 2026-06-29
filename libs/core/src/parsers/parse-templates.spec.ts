import { parseTemplates } from './parse-templates';

const compact = (s: string) => s.replace(/\s+/g, '');

describe('parseTemplates - rich variant emission', () => {
  it('emits a base class for a rich node with a base block', async () => {
    const css = await parseTemplates({
      textStyle: {
        headline: {
          base: { color: 'red' },
        },
      },
    });
    expect(css).toContain('.text-style-headline');
    expect(compact(css)).toContain('color:red');
  });

  it('emits a variant class for each axis/value bundle declared on a rich node', async () => {
    const css = await parseTemplates({
      textStyle: {
        headline: {
          base: { color: 'red' },
          variants: {
            color: {
              pink: { color: 'pink' },
              blue: { color: 'blue' },
            },
          },
        },
      },
    });
    expect(css).toContain('.text-style-headline-color-pink');
    expect(css).toContain('.text-style-headline-color-blue');
    const compactCss = compact(css);
    expect(compactCss).toContain('color:pink');
    expect(compactCss).toContain('color:blue');
  });

  it('recurses into child paths so nested rich nodes still emit their variants', async () => {
    const css = await parseTemplates({
      textStyle: {
        headline: {
          base: { color: 'red' },
          regular: {
            base: { fontSize: '16px' },
            variants: {
              weight: { heavy: { fontWeight: 700 } },
            },
          },
        },
      },
    });
    expect(css).toContain('.text-style-headline-regular');
    expect(css).toContain('.text-style-headline-regular-weight-heavy');
    expect(compact(css)).toContain('font-weight:700');
  });

  it('leaves plain (non-rich) templates working as before', async () => {
    const css = await parseTemplates({
      textStyle: {
        body: {
          small: { fontSize: '12px' },
          regular: { fontSize: '14px' },
        },
      },
    });
    expect(css).toContain('.text-style-body-small');
    expect(css).toContain('.text-style-body-regular');
  });
});

describe('parseTemplates - media queries', () => {
  it('wraps a media query declared inside a leaf and keeps it on the leaf class', async () => {
    const css = await parseTemplates({
      textStyle: {
        body: {
          large: {
            fontSize: '28px',
            '@media (max-width: 960px)': { fontSize: '20px' },
          },
        },
      },
    });
    expect(compact(css)).toContain('@media(max-width:960px)');
    expect(compact(css)).toContain('font-size:20px');
    // The media-query key must not leak into the class name (the bug produced
    // `.text-style-body-large-@media-max-width-960px` with no `@media` wrapper).
    expect(css).not.toMatch(/text-style-body-large-/);
  });

  it('resolves a named media query inside a template via the forwarded config', async () => {
    const css = await parseTemplates(
      {
        textStyle: {
          body: {
            large: {
              fontSize: '28px',
              '@largeMobileDown': { fontSize: '20px' },
            },
          },
        },
      },
      [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { mediaQueries: { '@largeMobileDown': '@media (max-width: 960px)' } } as any,
    );
    expect(compact(css)).toContain('@media(max-width:960px)');
    expect(css).not.toContain('@largeMobileDown');
  });

  it('wraps a media query declared in a rich node base', async () => {
    const css = await parseTemplates({
      textStyle: {
        headline: {
          base: {
            color: 'red',
            '@media (max-width: 960px)': { color: 'blue' },
          },
        },
      },
    });
    expect(compact(css)).toContain('@media(max-width:960px)');
    expect(compact(css)).toContain('color:blue');
  });
});
