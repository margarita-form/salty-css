import { PassThrough } from 'stream';
import { confirmInstall, formatPackageForDisplay, renderPackageList } from '../confirm-install';

const drainOutput = (stream: PassThrough): string => {
  const chunks: Buffer[] = [];
  let chunk;
  while ((chunk = stream.read()) !== null) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString('utf-8');
};

describe('formatPackageForDisplay', () => {
  it('renders a regular dep as-is', () => {
    expect(formatPackageForDisplay('@salty-css/core@1.2.3')).toBe('@salty-css/core@1.2.3');
  });

  it('translates the -D shorthand into a (dev) suffix', () => {
    expect(formatPackageForDisplay('-D @salty-css/vite@1.2.3')).toBe('@salty-css/vite@1.2.3 (dev)');
  });
});

describe('renderPackageList', () => {
  it('prefixes each entry with `  + `', () => {
    const text = renderPackageList(['a@1', '-D b@2']);
    expect(text).toBe('  + a@1\n  + b@2 (dev)');
  });
});

describe('confirmInstall', () => {
  it('resolves immediately when yes=true (no prompt rendered)', async () => {
    const out = new PassThrough();
    await confirmInstall(['a@1'], true, { input: new PassThrough(), output: out, isTTY: true });
    expect(drainOutput(out)).toBe('');
  });

  it('resolves immediately when the package list is empty', async () => {
    const out = new PassThrough();
    await confirmInstall([], false, { input: new PassThrough(), output: out, isTTY: true });
    expect(drainOutput(out)).toBe('');
  });

  it('throws a --yes-mentioning error in non-TTY environments', async () => {
    const out = new PassThrough();
    await expect(
      confirmInstall(['a@1'], false, { input: new PassThrough(), output: out, isTTY: false })
    ).rejects.toThrow(/--yes/);
  });

  it('resolves when the user answers `y`', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const promise = confirmInstall(['@salty-css/core@1.2.3', '-D @salty-css/vite@1.2.3'], false, { input, output, isTTY: true });
    input.write('y\n');
    await promise;
    const rendered = drainOutput(output);
    expect(rendered).toContain('The following packages will be installed:');
    expect(rendered).toContain('@salty-css/core@1.2.3');
    expect(rendered).toContain('@salty-css/vite@1.2.3 (dev)');
    expect(rendered).toContain('Proceed?');
  });

  it('rejects when the user answers `n`', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const promise = confirmInstall(['a@1'], false, { input, output, isTTY: true });
    input.write('n\n');
    await expect(promise).rejects.toThrow(/cancelled/i);
  });

  it('rejects when the user just presses enter (defaults to No)', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const promise = confirmInstall(['a@1'], false, { input, output, isTTY: true });
    input.write('\n');
    await expect(promise).rejects.toThrow(/cancelled/i);
  });
});
