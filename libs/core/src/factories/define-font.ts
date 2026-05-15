import { dashCase, toHash } from '../util';
import { DefineFontOptions, FontDisplay, FontFormat, FontSrc, FontVariant } from '../types/font-types';

const FONT_FORMAT_BY_EXTENSION: Record<string, FontFormat> = {
  woff2: 'woff2',
  woff: 'woff',
  ttf: 'truetype',
  otf: 'opentype',
  eot: 'embedded-opentype',
  svg: 'svg',
  ttc: 'collection',
};

const detectFontFormat = (url: string): FontFormat | undefined => {
  const cleaned = url.split('?')[0].split('#')[0];
  const dot = cleaned.lastIndexOf('.');
  if (dot === -1) return undefined;
  const ext = cleaned.slice(dot + 1).toLowerCase();
  return FONT_FORMAT_BY_EXTENSION[ext];
};

const toFontSrc = (entry: string | FontSrc): FontSrc => {
  if (typeof entry === 'string') return { url: entry, format: detectFontFormat(entry) };
  return entry;
};

const normalizeSources = (src: FontVariant['src']): FontSrc[] => {
  if (Array.isArray(src)) return src.map(toFontSrc);
  return [toFontSrc(src)];
};

const normalizeVariable = (variable: string): string => {
  const trimmed = variable.trim();
  const stripped = trimmed.replace(/^--/, '');
  if (!stripped) throw new Error(`defineFont: invalid \`variable\` value "${variable}".`);
  return `--${dashCase(stripped)}`;
};

const deriveVariable = (options: DefineFontOptions): string => {
  const hashSource = [options.name, options.fallback, 'variants' in options ? options.variants : undefined, 'import' in options ? options.import : undefined];
  return `--font-${dashCase(options.name)}-${toHash(hashSource, 6)}`;
};

const quoteFamily = (name: string): string => {
  if (/^["'].*["']$/.test(name)) return name;
  if (/\s/.test(name)) return `"${name}"`;
  return name;
};

const buildFontFamilyValue = (name: string, fallback?: string[]): string => {
  const head = quoteFamily(name);
  if (!fallback || fallback.length === 0) return head;
  return [head, ...fallback].join(', ');
};

const formatSrc = (src: FontSrc): string => {
  const parts = [`url("${src.url}")`];
  if (src.format) parts.push(`format("${src.format}")`);
  if (src.tech) parts.push(`tech(${src.tech})`);
  return parts.join(' ');
};

const variantToFontFace = (name: string, variant: FontVariant, defaultDisplay: FontDisplay): string => {
  const sources = normalizeSources(variant.src);
  if (sources.length === 0) {
    throw new Error(`defineFont(${name}): variant must declare at least one \`src\`.`);
  }

  const lines = [`font-family: ${quoteFamily(name)};`, `src: ${sources.map(formatSrc).join(', ')};`, `font-display: ${variant.display ?? defaultDisplay};`];

  if (variant.weight !== undefined) lines.push(`font-weight: ${variant.weight};`);
  if (variant.style !== undefined) lines.push(`font-style: ${variant.style};`);
  if (variant.stretch !== undefined) lines.push(`font-stretch: ${variant.stretch};`);
  if (variant.unicodeRange !== undefined) lines.push(`unicode-range: ${variant.unicodeRange};`);
  if (variant.ascentOverride !== undefined) lines.push(`ascent-override: ${variant.ascentOverride};`);
  if (variant.descentOverride !== undefined) lines.push(`descent-override: ${variant.descentOverride};`);
  if (variant.lineGapOverride !== undefined) lines.push(`line-gap-override: ${variant.lineGapOverride};`);
  if (variant.sizeAdjust !== undefined) lines.push(`size-adjust: ${variant.sizeAdjust};`);

  return `@font-face { ${lines.join(' ')} }`;
};

export interface FontCss {
  /** `@import url(...)` lines that must sit at the top of the stylesheet, before any `@layer`. */
  imports: string[];
  /** Body that goes inside the `@layer fonts { ... }` wrapper. */
  body: string;
}

export class FontFactory {
  public readonly variable: string;
  public readonly fontFamily: string;
  public readonly className: string;

  constructor(public readonly _options: DefineFontOptions) {
    if (!_options || !_options.name) {
      throw new Error('defineFont: `name` is required.');
    }
    if ('variants' in _options && 'import' in _options && _options.import !== undefined && _options.variants !== undefined) {
      throw new Error('defineFont: provide either `variants` or `import`, not both.');
    }
    if (!('variants' in _options && _options.variants) && !('import' in _options && _options.import)) {
      throw new Error('defineFont: must provide either `variants` or `import`.');
    }

    this.variable = _options.variable ? normalizeVariable(_options.variable) : deriveVariable(_options);
    this.fontFamily = buildFontFamilyValue(_options.name, _options.fallback);
    this.className = `font-${dashCase(_options.name)}`;
  }

  get isDefineFont(): true {
    return true;
  }

  /** Acts as a string equal to the resolved font-family value. */
  public toString(): string {
    return this.fontFamily;
  }

  /** Inline-style helper: spread onto a React `style` prop. */
  public get style(): Record<string, string> {
    return {
      fontFamily: this.fontFamily,
      [this.variable]: this.fontFamily,
    };
  }

  /** Build the CSS pieces written to `_fonts.css`. */
  public _toCss(): FontCss {
    const imports: string[] = [];
    const blocks: string[] = [];

    if ('import' in this._options && this._options.import) {
      imports.push(`@import url("${this._options.import}");`);
    } else if ('variants' in this._options && this._options.variants) {
      const display = this._options.display ?? 'swap';
      for (const variant of this._options.variants) {
        blocks.push(variantToFontFace(this._options.name, variant, display));
      }
    }

    blocks.push(
      `:root { ${this.variable}: ${this.fontFamily}; }`,
      `.${this.className} { ${this.variable}: ${this.fontFamily}; font-family: var(${this.variable}); }`
    );

    return { imports, body: blocks.join(' ') };
  }
}

/**
 * Define a custom font that is registered globally as `@font-face` and exposed
 * as a CSS variable. The returned object stringifies to its `font-family`
 * value, and exposes `.variable`, `.fontFamily`, `.className`, and `.style`
 * for use in styles and components.
 */
export const defineFont = (options: DefineFontOptions): FontFactory => {
  return new FontFactory(options);
};
