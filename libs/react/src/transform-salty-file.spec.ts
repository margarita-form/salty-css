import { vi } from 'vitest';
import { transformSaltyFile } from './transform-salty-file';

const stubCompiler = {} as Parameters<typeof transformSaltyFile>[0];

describe('transformSaltyFile', () => {
  it('returns undefined for non-salty filenames', async () => {
    const result = await transformSaltyFile(stubCompiler, '/tmp/not-salty.txt');
    expect(result).toBeUndefined();
  });

  it('returns undefined for plain .ts files outside the salty naming convention', async () => {
    const result = await transformSaltyFile(stubCompiler, '/tmp/component.ts');
    expect(result).toBeUndefined();
  });

  it('swallows read errors, logs to console.error, and returns undefined', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = await transformSaltyFile(stubCompiler, '/nonexistent-dir/foo.styled.ts');
      expect(result).toBeUndefined();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

// TODO: cover the happy-path rewrite (styled / className → *-client) via a
// fixture directory + real SaltyCompiler, mirroring libs/vite/test/fixtures.
