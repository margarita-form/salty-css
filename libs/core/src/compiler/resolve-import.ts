import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import { basename, dirname, join, relative, resolve as resolvePath } from 'path';
import { toHash } from '../util';
import type { ImportSpec, ImportSpecOptions } from '../factories/define-import';

export interface ResolveImportOptions {
  /**
   * Override for node_modules resolution. Receives the bare specifier (with any leading `~` already
   * stripped) and the source file path of the salty file that called `defineImport`. Must return the
   * absolute filesystem path of the resolved CSS file. Defaults to `createRequire(sourceFile).resolve`.
   */
  resolveModule?: (specifier: string, sourceFile: string) => string;
  /**
   * Override for copying resolved node_modules CSS into `<destDir>/imports/`. Receives the absolute
   * source and destination paths. Defaults to `copyFileSync`.
   */
  copyAsset?: (from: string, to: string) => void;
}

const EXTERNAL_URL = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

const normaliseSpec = (spec: ImportSpec): ImportSpecOptions => {
  if (typeof spec === 'string') return { url: spec };
  return spec;
};

const ensureRelativePrefix = (path: string) => {
  if (path.startsWith('.') || path.startsWith('/')) return path;
  return `./${path}`;
};

const toPosix = (path: string) => path.split('\\').join('/');

const defaultResolveModule = (specifier: string, sourceFile: string) => {
  return createRequire(sourceFile).resolve(specifier);
};

const defaultCopyAsset = (from: string, to: string) => {
  const dir = dirname(to);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  copyFileSync(from, to);
};

const buildRule = (url: string, { media, supports }: ImportSpecOptions) => {
  let rule = `@import url('${url}')`;
  if (supports) rule += ` supports(${supports})`;
  if (media) rule += ` ${media}`;
  return `${rule};`;
};

export const resolveImport = (spec: ImportSpec, sourceFile: string, destDir: string, options: ResolveImportOptions = {}): { rule: string } => {
  const opts = normaliseSpec(spec);
  const { url } = opts;
  const resolveModule = options.resolveModule ?? defaultResolveModule;
  const copyAsset = options.copyAsset ?? defaultCopyAsset;

  // External URL — emit verbatim.
  if (EXTERNAL_URL.test(url)) {
    return { rule: buildRule(url, opts) };
  }

  // Public folder — emit verbatim; the browser resolves it against the host.
  if (url.startsWith('/')) {
    return { rule: buildRule(url, opts) };
  }

  // Relative path — resolve against the source file and re-express relative to _imports.css.
  if (url.startsWith('./') || url.startsWith('../')) {
    const absolute = resolvePath(dirname(sourceFile), url);
    const fromImportsFile = relative(join(destDir, 'css'), absolute);
    return { rule: buildRule(ensureRelativePrefix(toPosix(fromImportsFile)), opts) };
  }

  // Node_modules — strip optional `~` prefix and resolve via Node.
  const specifier = url.startsWith('~') ? url.slice(1) : url;
  const absolute = resolveModule(specifier, sourceFile);

  const hash = toHash(absolute, 6);
  const fileName = `${hash}-${basename(absolute)}`;
  const destPath = join(destDir, 'imports', fileName);

  copyAsset(absolute, destPath);

  return { rule: buildRule(`../imports/${fileName}`, opts) };
};
