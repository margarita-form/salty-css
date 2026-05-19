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
