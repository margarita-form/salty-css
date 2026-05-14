import { createInterface } from 'readline/promises';

/**
 * Renders a single package spec for display. Translates the internal
 * `'-D <pkg>@<ver>'` shorthand used by `npmInstall` into a `<pkg>@<ver> (dev)`
 * suffix so the user-facing list reads naturally.
 */
export const formatPackageForDisplay = (spec: string): string => {
  const trimmed = spec.trim();
  if (trimmed.startsWith('-D ')) return `${trimmed.slice(3).trim()} (dev)`;
  return trimmed;
};

export const renderPackageList = (packages: string[]): string => {
  return packages.map((p) => `  + ${formatPackageForDisplay(p)}`).join('\n');
};

export interface ConfirmInstallOptions {
  /** Streams used for the prompt — defaults to process.stdin/stdout. Allows tests to inject. */
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  /** Whether the input is a TTY — defaults to process.stdin.isTTY. Allows tests to override. */
  isTTY?: boolean;
}

/**
 * Confirm a batched install. Resolves on success, throws on decline.
 *
 * - `yes=true` or empty `packages` → no prompt, resolves immediately.
 * - Non-TTY without `yes` → throws, telling the user to pass `--yes`.
 * - Otherwise prints the list and asks `Proceed? (y/N)`. Accepts y/yes
 *   (case-insensitive); anything else throws to abort the command.
 */
export const confirmInstall = async (packages: string[], yes: boolean, options: ConfirmInstallOptions = {}): Promise<void> => {
  if (yes) return;
  if (packages.length === 0) return;

  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const isTTY = options.isTTY ?? process.stdin.isTTY ?? false;

  if (!isTTY) {
    throw new Error('Cannot prompt for install confirmation: stdin is not a TTY. Re-run with --yes to install the listed packages without prompting.');
  }

  output.write(`The following packages will be installed:\n${renderPackageList(packages)}\n`);

  const rl = createInterface({ input: input as NodeJS.ReadableStream, output, terminal: false });
  try {
    const answer = (await rl.question('Proceed? (y/N) ')).trim().toLowerCase();
    if (answer !== 'y' && answer !== 'yes') {
      throw new Error('Install cancelled by user.');
    }
  } finally {
    rl.close();
  }
};

export interface ConfirmYesNoOptions extends ConfirmInstallOptions {
  /** When true, resolves true without prompting. */
  yes?: boolean;
  /** When true, an empty answer counts as yes. Defaults to false (empty = no). */
  defaultYes?: boolean;
}

/**
 * Generic yes/no prompt. Unlike `confirmInstall`, non-TTY without `yes`
 * resolves `false` instead of throwing — callers can choose policy.
 */
export const confirmYesNo = async (question: string, options: ConfirmYesNoOptions = {}): Promise<boolean> => {
  if (options.yes) return true;

  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const isTTY = options.isTTY ?? process.stdin.isTTY ?? false;

  if (!isTTY) return false;

  const suffix = options.defaultYes ? '(Y/n)' : '(y/N)';
  const rl = createInterface({ input: input as NodeJS.ReadableStream, output, terminal: false });
  try {
    const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase();
    if (answer === '') return !!options.defaultYes;
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
};
