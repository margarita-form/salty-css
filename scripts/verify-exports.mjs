#!/usr/bin/env node
// Verifies that every export a real user can reach actually resolves and loads
// after a build. It is driven entirely from each package's published contract
// (`exports` / `bin`), so it stays correct regardless of the internal file
// layout — a user shouldn't need to know whether a file lives in `dist/` or not.
//
// What it does, per published package:
//   1. Symlinks libs/<pkg> into node_modules/@salty-css/<name> so bare specifiers
//      resolve through the very exports map under test (react/astro/next dist
//      files import bare `@salty-css/core/...`).
//   2. For every `exports` entry + condition, resolves the on-disk target and
//      asserts it exists, then asserts a sibling `.d.ts` is present (TS users).
//   3. Loads each export by its BARE specifier (`import()` for the `import`
//      condition, `require()` for the `require` condition) so Node's resolver
//      validates the exports map end-to-end and catches broken re-exports.
//   4. Spot-checks headline named exports for documented entrypoints.
//   5. Verifies `bin` targets exist and start with a `#!` shebang.
//
// `exports` and `bin` problems are errors (exit 1). Legacy `main`/`module`/
// `typings` fields are reported as warnings (modern resolution uses `exports`).

import { existsSync, lstatSync, readFileSync, readlinkSync, symlinkSync, mkdirSync, openSync, readSync, closeSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exit } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const PACKAGES = ['cli', 'npm-create', 'core', 'react', 'astro', 'vite', 'next', 'webpack', 'eslint-config-core', 'eslint-plugin-core'];

// Headline named exports a real user relies on, keyed by `${name}${subpath}`
// (subpath '.' for the package root). `default` means a default export must
// exist. Entries not listed only have to load without throwing.
const EXPECTED = {
  // @salty-css/core has no '.' export — users always import a subpath.
  '@salty-css/core/css': ['token', 'keyframes', 'media', 'mergeObjects', 'mergeFactories'],
  '@salty-css/core/css/keyframes': ['keyframes'],
  '@salty-css/core/css/media': ['media', 'MediaQueryFactory'],
  '@salty-css/core/css/token': ['token'],
  '@salty-css/core/css/merge': ['mergeObjects', 'mergeFactories'],
  '@salty-css/core/factories': ['defineFont', 'defineGlobalStyles', 'defineImport', 'defineMediaQuery', 'defineVariables', 'defineTemplates'],
  '@salty-css/core/config': ['defineConfig', 'defineVariables'],
  '@salty-css/core/generators': ['StyledGenerator', 'ClassNameGenerator'],
  '@salty-css/core/parsers': ['parseStyles', 'parseAndJoinStyles'],
  '@salty-css/core/util': ['toHash', 'dashCase', 'camelCase', 'pascalCase', 'matchesGlob'],
  '@salty-css/core/helpers': ['color', 'defineViewportClamp'],
  '@salty-css/core/runtime': ['defineRuntime'],
  '@salty-css/core/compiler/salty-compiler': ['SaltyCompiler'],
  '@salty-css/core/compiler/helpers': ['isSaltyFile', 'saltyFileExtensions', 'saltyFileRegExp'],
  '@salty-css/core/instances/classname-instance': ['classNameInstance'],
  '@salty-css/core/bin/main': ['main'],

  '@salty-css/react': ['token', 'keyframes', 'media', 'mergeObjects'],
  '@salty-css/react/styled': ['styled'],
  '@salty-css/react/class-name': ['className'],
  '@salty-css/react/keyframes': ['keyframes'],
  '@salty-css/react/media': ['media'],
  '@salty-css/react/factories': ['defineVariables', 'defineTemplates', 'defineGlobalStyles'],
  '@salty-css/react/config': ['defineConfig'],
  '@salty-css/react/helpers': ['defineViewportClamp', 'color'],
  '@salty-css/react/runtime': ['defineRuntime'],
  '@salty-css/react/transform-salty-file': ['transformSaltyFile'],

  '@salty-css/next': ['withSaltyCss', 'default'],
  '@salty-css/next/config': ['defineConfig'],
  '@salty-css/next/factories': ['defineVariables'],
  '@salty-css/next/helpers': ['defineViewportClamp'],
  '@salty-css/next/keyframes': ['keyframes'],
  '@salty-css/next/media': ['media'],
  '@salty-css/next/runtime': ['defineRuntime'],

  '@salty-css/vite': ['saltyPlugin', 'default'],

  '@salty-css/webpack': ['saltyPlugin', 'default'],
  '@salty-css/webpack/loader': ['default'],

  '@salty-css/astro/integration': ['saltyIntegration', 'default'],
  '@salty-css/astro/styled': ['styled'],
  '@salty-css/astro/class-name': ['className'],
  '@salty-css/astro/element-props': ['resolveAstroProps'],
  '@salty-css/astro/factories': ['defineVariables'],
  '@salty-css/astro/config': ['defineConfig'],
  '@salty-css/astro/helpers': ['defineViewportClamp'],
  '@salty-css/astro/keyframes': ['keyframes'],
  '@salty-css/astro/media': ['media'],
  '@salty-css/astro/runtime': ['defineRuntime'],

  '@salty-css/eslint-config-core': ['default'],
  '@salty-css/eslint-config-core/flat': ['default'],
  '@salty-css/eslint-plugin-core': ['default'],
};

const errors = [];
const warnings = [];
const fail = (pkg, msg) => errors.push(`[${pkg}] ${msg}`);
const warn = (pkg, msg) => warnings.push(`[${pkg}] ${msg}`);

const readPkg = (pkg) => JSON.parse(readFileSync(join(repoRoot, 'libs', pkg, 'package.json'), 'utf8'));

const hasShebang = (absPath) => {
  const fd = openSync(absPath, 'r');
  try {
    const buf = Buffer.alloc(2);
    readSync(fd, buf, 0, 2, 0);
    return buf.toString('utf8') === '#!';
  } finally {
    closeSync(fd);
  }
};

// Make node_modules/@salty-css/<name> point at libs/<pkg> so bare specifiers
// resolve through the published exports map. Only scoped packages need this.
const ensureSymlink = (pkg, name) => {
  if (!name.startsWith('@salty-css/')) return;
  const short = name.slice('@salty-css/'.length);
  const scopeDir = join(repoRoot, 'node_modules', '@salty-css');
  if (!existsSync(scopeDir)) mkdirSync(scopeDir, { recursive: true });
  const linkPath = join(scopeDir, short);
  const target = join(repoRoot, 'libs', pkg);
  if (existsSync(linkPath) || lstatSync(linkPath, { throwIfNoEntry: false })) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const current = resolve(scopeDir, readlinkSync(linkPath));
      if (current !== target) warn(pkg, `node_modules/@salty-css/${short} points at ${current}, expected ${target}`);
      return;
    }
    // A real directory (e.g. a published copy) — don't clobber it.
    warn(pkg, `node_modules/@salty-css/${short} is a real directory, not a symlink to libs/${pkg}; skipping link`);
    return;
  }
  symlinkSync(target, linkPath, 'dir');
};

// Resolve a condition target string (relative to lib root) and check existence + sibling types.
const checkTarget = (pkg, libRoot, label, target) => {
  if (typeof target !== 'string') return;
  const abs = join(libRoot, target);
  if (!existsSync(abs)) {
    fail(pkg, `${label} -> ${target} does not exist`);
    return;
  }
  // Co-located types let TS users resolve types without a `types` condition.
  if (/\.(js|cjs|mjs)$/.test(target)) {
    const dts = abs.replace(/\.(js|cjs|mjs)$/, '.d.ts');
    if (!existsSync(dts)) warn(pkg, `${label} -> ${target} has no sibling .d.ts (TS consumers get no types)`);
  }
};

const assertNames = (pkg, key, ns, loadedVia) => {
  const expected = EXPECTED[key];
  if (!expected) return;
  for (const name of expected) {
    if (name === 'default') {
      // CJS represents `export default X` as `module.exports = X`, so the default
      // can't be told apart from the whole namespace here — only check ESM.
      if (loadedVia === 'require') continue;
      const ok = 'default' in ns || typeof ns === 'function';
      if (!ok) fail(pkg, `${key} (${loadedVia}) is missing a default export`);
    } else if (!(name in ns)) {
      fail(pkg, `${key} (${loadedVia}) is missing named export "${name}"`);
    }
  }
};

// Executable entrypoints (CLI bins with a shebang) run their work on import, so
// loading them would have side effects — verify existence only, never load.
const isExecutable = (libRoot, target) => typeof target === 'string' && existsSync(join(libRoot, target)) && hasShebang(join(libRoot, target));

const loadExport = async (pkg, name, subpath, conditions, libRoot) => {
  const key = `${name}${subpath === '.' ? '' : subpath.slice(1)}`;
  const specifier = subpath === '.' ? name : `${name}/${subpath.slice(2)}`;
  if (conditions.import && !isExecutable(libRoot, conditions.import)) {
    try {
      const ns = await import(specifier);
      assertNames(pkg, key, ns, 'import');
    } catch (err) {
      fail(pkg, `import("${specifier}") threw: ${err.message}`);
    }
  }
  if (conditions.require && !isExecutable(libRoot, conditions.require)) {
    try {
      const mod = require(specifier);
      assertNames(pkg, key, mod, 'require');
    } catch (err) {
      fail(pkg, `require("${specifier}") threw: ${err.message}`);
    }
  }
};

// Normalize an exports value into a { import, require, types, default } map.
const conditionsOf = (value) => {
  if (typeof value === 'string') return { default: value };
  if (value && typeof value === 'object') return value;
  return {};
};

const verifyPackage = async (pkg) => {
  const json = readPkg(pkg);
  const name = json.name;
  const libRoot = join(repoRoot, 'libs', pkg);
  console.log(`\n• ${name} (libs/${pkg})`);

  ensureSymlink(pkg, name);

  // bin: user-facing CLI entries — must exist with a shebang.
  if (json.bin) {
    const bins = typeof json.bin === 'string' ? { [name]: json.bin } : json.bin;
    const seen = new Set();
    for (const target of Object.values(bins)) {
      if (seen.has(target)) continue;
      seen.add(target);
      const abs = join(libRoot, target);
      if (!existsSync(abs)) fail(pkg, `bin -> ${target} does not exist`);
      else if (!hasShebang(abs)) fail(pkg, `bin -> ${target} is missing a #! shebang`);
    }
  }

  // exports: the primary contract.
  if (json.exports) {
    for (const [subpath, value] of Object.entries(json.exports)) {
      const conditions = conditionsOf(value);
      checkTarget(pkg, libRoot, `exports["${subpath}"].import`, conditions.import);
      checkTarget(pkg, libRoot, `exports["${subpath}"].require`, conditions.require);
      checkTarget(pkg, libRoot, `exports["${subpath}"].types`, conditions.types);
      if (conditions.default && !conditions.import && !conditions.require) {
        checkTarget(pkg, libRoot, `exports["${subpath}"]`, conditions.default);
      }
      await loadExport(pkg, name, subpath, conditions, libRoot);
    }
  }

  // Legacy fields — warnings only; `exports` governs modern resolution.
  for (const field of ['main', 'module', 'typings', 'types']) {
    if (json[field] && !existsSync(join(libRoot, json[field]))) {
      warn(pkg, `${field} -> ${json[field]} does not exist`);
    }
  }
};

const main = async () => {
  console.log('verify-exports — checking published export contracts\n');
  for (const pkg of PACKAGES) {
    try {
      await verifyPackage(pkg);
    } catch (err) {
      fail(pkg, `unexpected failure: ${err.stack || err.message}`);
    }
  }

  if (warnings.length) {
    console.log(`\n⚠  ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`   ${w}`);
  }
  if (errors.length) {
    console.log(`\n✖  ${errors.length} error(s):`);
    for (const e of errors) console.log(`   ${e}`);
    console.log('');
    exit(1);
  }
  console.log(`\n✔  All export contracts resolve and load.`);
};

main().catch((err) => {
  console.error(err);
  exit(1);
});
