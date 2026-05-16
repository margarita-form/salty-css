export type FontDisplay = 'auto' | 'block' | 'swap' | 'fallback' | 'optional';

export type FontFormat = 'woff2' | 'woff' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg' | 'collection';

export type FontStyle = 'normal' | 'italic' | 'oblique' | (string & {});

export type FontWeight = number | 'normal' | 'bold' | 'lighter' | 'bolder' | (string & {});

export interface FontSrc {
  url: string;
  format?: FontFormat;
  /** Optional `tech(...)` descriptor passed straight through to @font-face. */
  tech?: string;
}

export interface FontVariant {
  weight?: FontWeight;
  style?: FontStyle;
  stretch?: string;
  display?: FontDisplay;
  unicodeRange?: string;
  ascentOverride?: string;
  descentOverride?: string;
  lineGapOverride?: string;
  sizeAdjust?: string;
  /**
   * One or more font sources. Strings are treated as URLs and the `format()`
   * descriptor is auto-detected from the file extension when possible. Use
   * the `{ url, format }` object form for CDN/extensionless URLs where the
   * format must be set explicitly.
   */
  src: string | FontSrc | (string | FontSrc)[];
}

interface DefineFontBase {
  /** CSS `font-family` value users will see in styles. */
  name: string;
  /**
   * CSS variable name. Accepts `--font-inter` or `font-inter`; we normalize.
   * Optional — when omitted, a deterministic name is derived from the other
   * inputs as `--font-<name>-<hash>`.
   */
  variable?: string;
  /** Default `font-display` applied to variants that don't set their own. */
  display?: FontDisplay;
  /** Family fallback(s) appended after `name` in the generated `font-family` string. */
  fallback?: string;
}

export interface DefineFontVariantsOptions extends DefineFontBase {
  variants: FontVariant[];
  import?: never;
}

export interface DefineFontImportOptions extends DefineFontBase {
  /** Remote stylesheet URL (e.g. Google Fonts). Emitted as `@import url(...)`. */
  import: string;
  variants?: never;
}

export type DefineFontOptions = DefineFontVariantsOptions | DefineFontImportOptions;
