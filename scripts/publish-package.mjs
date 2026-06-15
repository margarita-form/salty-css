#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output, exit, argv } from 'node:process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';

const readLernaVersion = () => {
  const lernaPath = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', 'lerna.json');
  return JSON.parse(readFileSync(lernaPath, 'utf8')).version;
};

const PACKAGES = ['cli', 'npm-create', 'core', 'react', 'astro', 'vite', 'next', 'webpack', 'eslint-config-core', 'eslint-plugin-core'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+/;

const fail = (msg) => {
  console.error(`publish-package: ${msg}`);
  exit(1);
};

const git = (args) => {
  const res = spawnSync('git', args, { encoding: 'utf8' });
  if (res.status !== 0) fail(`git ${args.join(' ')} failed: ${res.stderr.trim()}`);
  return res.stdout.trim();
};

const npmWhoami = () => {
  const res = spawnSync('npm', ['whoami'], { encoding: 'utf8' });
  if (res.status !== 0) fail('not logged in to npm. Run "npm login" first.');
  return res.stdout.trim();
};

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))));
    child.on('error', reject);
  });

export const slugify = (branch) => {
  if (!branch) throw new Error('Branch name is required to derive slug.');
  const slug = String(branch)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug || !SLUG_RE.test(slug) || SEMVER_RE.test(slug)) {
    throw new Error(`Branch "${branch}" produced an invalid slug "${slug}".`);
  }
  return slug;
};

const MODES = {
  branch: {
    requireBranch: (b) => !!b && !['HEAD', 'main', 'master'].includes(b),
    requireBranchMsg: 'refusing to run "branch" mode on main/master/detached HEAD. Switch to a feature branch first.',
    deriveTag: (b) => `branch-${slugify(b)}`,
    lernaArgs: (b) => ['version', 'prerelease', '--preid', slugify(b), '--exact', '--force-publish', '-m', 'chore(release-branch): version %v'],
  },
  dev: {
    requireBranch: (b) => b === 'main',
    requireBranchMsg: '"dev" mode must be run from "main".',
    deriveTag: () => 'dev',
    lernaArgs: () => ['version', '--exact', '--force-publish', '-m', 'chore(release-dev): version %v'],
  },
  release: {
    requireBranch: (b) => b === 'main',
    requireBranchMsg: '"release" mode must be run from "main".',
    deriveTag: () => null,
    lernaArgs: () => ['version', '--exact', '--force-publish', '-m', 'chore(release): version %v'],
  },
};

const main = async () => {
  const modeName = argv[2];
  if (!modeName || !(modeName in MODES)) {
    fail(`usage: node scripts/publish-package.mjs <${Object.keys(MODES).join('|')}>`);
  }
  const mode = MODES[modeName];

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!mode.requireBranch(branch)) {
    fail(`${mode.requireBranchMsg} (current branch: "${branch}")`);
  }
  if (modeName === 'release' && git(['status', '--porcelain'])) {
    fail('working tree is dirty; commit or stash changes before publishing.');
  }

  const npmUser = npmWhoami();
  if (!npmUser) fail('unable to determine npm user. Run "npm login" first.');

  let tag;
  try {
    tag = mode.deriveTag(branch);
  } catch (err) {
    fail(err.message);
  }
  if (tag !== null && !SLUG_RE.test(tag)) fail(`derived tag "${tag}" is not a valid npm dist-tag.`);

  console.log(`\npublish-package — mode="${modeName}" branch="${branch}" tag="${tag ?? '(latest)'}"\n`);

  await run('npm', ['run', 'test:all']);
  await run('npm', ['run', 'build:all']);
  await run('npm', ['run', 'lerna', '--', ...mode.lernaArgs(branch)]);

  const rl = createInterface({ input, output });
  const otp = (await rl.question('Enter OTP: ')).trim();
  rl.close();
  if (!/^[0-9]{6,8}$/.test(otp)) fail('OTP must be 6-8 digits.');

  for (const pkg of PACKAGES) {
    const args = ['run', `publish:${pkg}`, '--'];
    if (tag !== null) args.push('--tag', tag);
    args.push('--otp', otp);
    await run('npm', args);
  }

  console.log(`\nPublished all packages${tag ? ` under tag "${tag}"` : ''}.`);
};

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main().catch((err) => fail(err.message));
}
