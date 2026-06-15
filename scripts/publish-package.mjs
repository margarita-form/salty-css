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
const CONCURRENCY = 5;
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

// Like `run`, but captures the child's stdout+stderr instead of inheriting the
// TTY. Never rejects: it resolves to a structured result so callers can settle
// every task and report afterwards. Interleaved live output from N concurrent
// children would be unreadable, so we buffer and flush per-package at the end.
const runCaptured = (cmd, args) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    const collect = (d) => chunks.push(d);
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', (err) => {
      chunks.push(Buffer.from(`\n[spawn error] ${err.message}\n`));
      resolve({ ok: false, output: Buffer.concat(chunks).toString('utf8') });
    });
    child.on('exit', (code) => {
      resolve({ ok: code === 0, output: Buffer.concat(chunks).toString('utf8') });
    });
  });

// Minimal p-limit: caps how many wrapped tasks run at once. Returns a function
// that enqueues a task and resolves with its result when a slot frees up.
const pLimit = (concurrency) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
};

// A fixed status block. Renders every package once up front, then redraws the
// whole block in place (cursor-up + clear-line) whenever a state changes — so
// no new lines pile up. A spinner animates the "publishing" rows. Falls back to
// plain transition logging when stdout isn't a TTY (e.g. CI).
const STATE_ICON = {
  waiting: '⏳',
  publishing: '🔄',
  published: '✅',
  failed: '❌',
};
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const createStatusBoard = (packages) => {
  const isTTY = Boolean(output.isTTY);
  const width = Math.max(...packages.map((p) => p.length));
  const states = new Map(packages.map((p) => [p, 'waiting']));
  let painted = false;
  let frame = 0;
  let timer = null;

  const lineFor = (pkg) => {
    const state = states.get(pkg);
    const base = `  ${STATE_ICON[state]} ${pkg.padEnd(width)}`;
    return state === 'publishing' ? `${base}  ${SPINNER[frame]} publishing…` : base;
  };

  const paint = () => {
    if (!isTTY) return;
    if (painted) output.write(`\x1b[${packages.length}A`);
    for (const pkg of packages) output.write(`\x1b[2K${lineFor(pkg)}\n`);
    painted = true;
  };

  return {
    start() {
      if (!isTTY) {
        output.write(`Queued ${packages.length}: ${packages.join(', ')}\n`);
        return;
      }
      paint();
      timer = setInterval(() => {
        frame = (frame + 1) % SPINNER.length;
        paint();
      }, 90);
      if (timer.unref) timer.unref();
    },
    set(pkg, state) {
      states.set(pkg, state);
      if (isTTY) paint();
      else output.write(`${STATE_ICON[state]} ${pkg} — ${state}\n`);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      paint();
    },
  };
};

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

const publishPackage = async (pkg, tag, otp, board) => {
  const args = ['run', `publish:${pkg}`, '--'];
  if (tag !== null) args.push('--tag', tag);
  args.push('--otp', otp);
  board.set(pkg, 'publishing');
  const { ok, output: log } = await runCaptured('npm', args);
  board.set(pkg, ok ? 'published' : 'failed');
  return { pkg, ok, output: log };
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

  // Publish up to CONCURRENCY packages at once, all sharing the single OTP so
  // they land inside its validity window. allSettled means one failure doesn't
  // abort the rest — every package runs to completion and we report at the end.
  console.log(`\nPublishing ${PACKAGES.length} package(s), up to ${CONCURRENCY} in parallel:\n`);
  const board = createStatusBoard(PACKAGES);
  board.start();

  const limit = pLimit(CONCURRENCY);
  const settled = await Promise.allSettled(PACKAGES.map((pkg) => limit(() => publishPackage(pkg, tag, otp, board))));

  board.stop();

  const results = settled.map((s, i) => (s.status === 'fulfilled' ? s.value : { pkg: PACKAGES[i], ok: false, output: String(s.reason?.stack ?? s.reason ?? 'unknown error') }));

  // Flush each package's buffered output in a clearly delimited section.
  for (const { pkg, ok, output: log } of results) {
    const banner = `${ok ? '✅' : '❌'} ${pkg}`;
    console.log(`\n${'─'.repeat(60)}\n${banner}\n${'─'.repeat(60)}`);
    if (log.trim()) console.log(log.trimEnd());
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nPublish summary: ${results.length - failed.length}/${results.length} succeeded.`);
  if (failed.length) {
    console.log(`Failed: ${failed.map((r) => r.pkg).join(', ')}`);
    fail(`${failed.length} package(s) failed to publish.`);
  }

  console.log(`\nPublished all packages${tag ? ` under tag "${tag}"` : ''}.`);
};

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  main().catch((err) => fail(err.message));
}
