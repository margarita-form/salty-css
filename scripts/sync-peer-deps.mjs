#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const lernaJsonPath = join(repoRoot, 'lerna.json');
const { version } = JSON.parse(readFileSync(lernaJsonPath, 'utf8'));
if (!version) {
  console.error('sync-peer-deps: could not read version from lerna.json');
  process.exit(1);
}
const targetVersion = version;

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'devDependencies', 'optionalDependencies'];

const libsDir = join(repoRoot, 'libs');
const libDirs = readdirSync(libsDir)
  .map((name) => join(libsDir, name))
  .filter((p) => statSync(p).isDirectory());

const changed = [];

for (const libDir of libDirs) {
  const pkgPath = join(libDir, 'package.json');
  let raw;
  try {
    raw = readFileSync(pkgPath, 'utf8');
  } catch {
    continue;
  }
  const pkg = JSON.parse(raw);

  let mutated = false;
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const name of Object.keys(deps)) {
      if (!name.startsWith('@salty-css/')) continue;
      if (deps[name] === targetVersion) continue;
      deps[name] = targetVersion;
      mutated = true;
    }
  }

  if (!mutated) continue;

  const trailingNewline = raw.endsWith('\n') ? '\n' : '';
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + trailingNewline);
  changed.push(pkgPath);
}

if (changed.length) {
  console.log(`sync-peer-deps: pinned @salty-css/* deps to exact ${targetVersion} in:`);
  for (const p of changed) console.log(`  - ${p}`);
} else {
  console.log(`sync-peer-deps: no changes (all @salty-css/* deps already pinned to ${targetVersion}).`);
}
