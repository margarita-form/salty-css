import { describe, it, expect } from 'vitest';
import { defineFont, FontFactory } from './define-font';
import { parseStyles } from '../parsers';

const baseVariant = {
  weight: 400,
  style: 'normal' as const,
  src: { url: '/fonts/inter-400.woff2', format: 'woff2' as const },
};

describe('defineFont', () => {
  it('returns a FontFactory with the isDefineFont marker', () => {
    const font = defineFont({ name: 'Inter', variable: '--font-inter', variants: [baseVariant] });
    expect(font).toBeInstanceOf(FontFactory);
    expect(font.isDefineFont).toBe(true);
  });

  it('normalizes the variable name (adds `--` prefix when missing)', () => {
    const a = defineFont({ name: 'Inter', variable: 'font-inter', variants: [baseVariant] });
    const b = defineFont({ name: 'Inter', variable: '--font-inter', variants: [baseVariant] });
    expect(a.variable).toBe('--font-inter');
    expect(b.variable).toBe('--font-inter');
  });

  it('dash-cases camelCase variable names', () => {
    const font = defineFont({ name: 'Inter', variable: 'fontInter', variants: [baseVariant] });
    expect(font.variable).toBe('--font-inter');
  });

  it('stringifies to the font-family name (no fallback)', () => {
    const font = defineFont({ name: 'Inter', variable: '--font-inter', variants: [baseVariant] });
    expect(`${font}`).toBe('Inter');
    expect(font.fontFamily).toBe('Inter');
  });

  it('quotes a multi-word family name', () => {
    const font = defineFont({ name: 'Open Sans', variable: '--font-open', variants: [baseVariant] });
    expect(font.fontFamily).toBe('"Open Sans"');
  });

  it('appends fallbacks to the font-family string', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      fallback: ['system-ui', 'sans-serif'],
      variants: [baseVariant],
    });
    expect(font.fontFamily).toBe('Inter, system-ui, sans-serif');
    expect(`${font}`).toBe('Inter, system-ui, sans-serif');
  });

  it('exposes a deterministic className and `style` helper', () => {
    const a = defineFont({ name: 'Inter', variable: '--font-inter', variants: [baseVariant] });
    const b = defineFont({ name: 'Inter', variable: '--font-inter', variants: [baseVariant] });
    expect(a.className).toBe(b.className);
    expect(a.className).toBe('font-inter');
    expect(a.style).toEqual({
      fontFamily: 'Inter',
      '--font-inter': 'Inter',
    });
  });

  it('emits a single @font-face per single-src variant', () => {
    const font = defineFont({ name: 'Inter', variable: '--font-inter', variants: [baseVariant] });
    const { imports, body } = font._toCss();
    expect(imports).toEqual([]);
    expect(body).toContain('@font-face');
    expect(body).toContain('font-family: Inter;');
    expect(body).toContain('src: url("/fonts/inter-400.woff2") format("woff2");');
    expect(body).toContain('font-display: swap;');
    expect(body).toContain('font-weight: 400;');
    expect(body).toContain('font-style: normal;');
    expect(body).toContain(':root { --font-inter: Inter; }');
    expect(body).toContain(`.${font.className} {`);
    expect(body).toContain('font-family: var(--font-inter);');
  });

  it('joins multiple sources in a single @font-face when src is an array', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [
        {
          weight: 700,
          style: 'normal',
          src: [
            { url: '/fonts/inter-700.woff2', format: 'woff2' },
            { url: '/fonts/inter-700.ttf', format: 'truetype' },
          ],
        },
      ],
    });
    const { body } = font._toCss();
    expect(body).toContain('src: url("/fonts/inter-700.woff2") format("woff2"), url("/fonts/inter-700.ttf") format("truetype");');
  });

  it('emits one @font-face block per variant', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [
        baseVariant,
        { weight: 700, style: 'normal', src: { url: '/fonts/inter-700.woff2', format: 'woff2' } },
        { weight: 400, style: 'italic', src: { url: '/fonts/inter-400-italic.woff2', format: 'woff2' } },
      ],
    });
    const { body } = font._toCss();
    const matches = body.match(/@font-face/g) || [];
    expect(matches.length).toBe(3);
  });

  it('honors per-variant display override and a top-level default', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      display: 'optional',
      variants: [
        { weight: 400, style: 'normal', src: { url: '/a.woff2', format: 'woff2' } },
        { weight: 700, style: 'normal', display: 'block', src: { url: '/b.woff2', format: 'woff2' } },
      ],
    });
    const { body } = font._toCss();
    expect(body).toContain('font-display: optional;');
    expect(body).toContain('font-display: block;');
  });

  it('emits @import for the import-style mode and still registers the variable', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
    });
    const { imports, body } = font._toCss();
    expect(imports).toEqual(['@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");']);
    expect(body).not.toContain('@font-face');
    expect(body).toContain(':root { --font-inter: Inter; }');
    expect(body).toContain(`.${font.className} {`);
  });

  it('throws when neither variants nor import are provided', () => {
    expect(() => defineFont({ name: 'Inter', variable: '--font-inter' } as never)).toThrow(/variants.*import/);
  });

  it('throws when both variants and import are provided', () => {
    expect(() =>
      defineFont({
        name: 'Inter',
        variable: '--font-inter',
        variants: [baseVariant],
        import: 'https://example.com/inter.css',
      } as never)
    ).toThrow(/either `variants` or `import`/);
  });

  it('throws when name is missing', () => {
    expect(() => defineFont({ variable: '--font-inter', variants: [baseVariant] } as never)).toThrow(/name/);
  });

  it('throws when variable is missing', () => {
    expect(() => defineFont({ name: 'Inter', variants: [baseVariant] } as never)).toThrow(/variable/);
  });

  it('throws when a variant has no src entries', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [{ weight: 400, style: 'normal', src: [] as never }],
    });
    expect(() => font._toCss()).toThrow(/at least one `src`/);
  });

  it('serializes to its font-family string when used as a style value directly', async () => {
    const Inter = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      fallback: ['system-ui', 'sans-serif'],
      variants: [baseVariant],
    });
    const [direct] = await parseStyles({ fontFamily: Inter });
    const [interpolated] = await parseStyles({ fontFamily: `${Inter}` });
    expect(direct.replace(/\s/g, '')).toBe('font-family:Inter,system-ui,sans-serif;'.replace(/\s/g, ''));
    expect(direct).toBe(interpolated);
  });

  it('accepts a single string src and auto-detects the format from the file extension', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [{ weight: 400, style: 'normal', src: '/fonts/inter-400.woff2' }],
    });
    const { body } = font._toCss();
    expect(body).toContain('src: url("/fonts/inter-400.woff2") format("woff2");');
  });

  it('omits format() when the extension is unrecognised', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [{ weight: 400, style: 'normal', src: 'https://cdn.example.com/inter?v=1' }],
    });
    const { body } = font._toCss();
    expect(body).toContain('src: url("https://cdn.example.com/inter?v=1");');
    expect(body).not.toMatch(/url\("https:\/\/cdn\.example\.com\/inter\?v=1"\) format/);
  });

  it('strips query string and hash before detecting the extension', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [{ weight: 400, style: 'normal', src: '/fonts/inter-400.woff2?v=1#hash' }],
    });
    const { body } = font._toCss();
    expect(body).toContain('src: url("/fonts/inter-400.woff2?v=1#hash") format("woff2");');
  });

  it('detects format for every supported extension when src is a string array', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [
        {
          weight: 400,
          style: 'normal',
          src: [
            '/fonts/a.woff2',
            '/fonts/a.woff',
            '/fonts/a.ttf',
            '/fonts/a.otf',
            '/fonts/a.eot',
            '/fonts/a.svg',
            '/fonts/a.ttc',
          ],
        },
      ],
    });
    const { body } = font._toCss();
    expect(body).toContain('url("/fonts/a.woff2") format("woff2")');
    expect(body).toContain('url("/fonts/a.woff") format("woff")');
    expect(body).toContain('url("/fonts/a.ttf") format("truetype")');
    expect(body).toContain('url("/fonts/a.otf") format("opentype")');
    expect(body).toContain('url("/fonts/a.eot") format("embedded-opentype")');
    expect(body).toContain('url("/fonts/a.svg") format("svg")');
    expect(body).toContain('url("/fonts/a.ttc") format("collection")');
  });

  it('detects extensions case-insensitively', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [{ weight: 400, style: 'normal', src: '/fonts/Inter-400.WOFF2' }],
    });
    const { body } = font._toCss();
    expect(body).toContain('src: url("/fonts/Inter-400.WOFF2") format("woff2");');
  });

  it('accepts a mixed array of strings and explicit FontSrc objects', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [
        {
          weight: 700,
          style: 'normal',
          src: ['/fonts/inter-700.woff2', { url: 'https://cdn.example.com/inter-700', format: 'woff' }],
        },
      ],
    });
    const { body } = font._toCss();
    expect(body).toContain(
      'src: url("/fonts/inter-700.woff2") format("woff2"), url("https://cdn.example.com/inter-700") format("woff");'
    );
  });

  it('emits optional @font-face descriptors when provided', () => {
    const font = defineFont({
      name: 'Inter',
      variable: '--font-inter',
      variants: [
        {
          weight: 400,
          style: 'normal',
          stretch: '100%',
          unicodeRange: 'U+0000-00FF',
          ascentOverride: '90%',
          descentOverride: '20%',
          lineGapOverride: '0%',
          sizeAdjust: '105%',
          src: { url: '/a.woff2', format: 'woff2' },
        },
      ],
    });
    const { body } = font._toCss();
    expect(body).toContain('font-stretch: 100%;');
    expect(body).toContain('unicode-range: U+0000-00FF;');
    expect(body).toContain('ascent-override: 90%;');
    expect(body).toContain('descent-override: 20%;');
    expect(body).toContain('line-gap-override: 0%;');
    expect(body).toContain('size-adjust: 105%;');
  });
});
