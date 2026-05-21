/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { resolveBundler, type BundlerOption } from './detect-bundler';
import { withSaltyWebpack } from './with-salty-webpack';
import { withSaltyTurbopack } from './with-salty-turbopack';

type AnyRecord = Record<any, any>;

export type { Bundler, BundlerOption } from './detect-bundler';

export interface SaltyNextOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
  /**
   * Force a specific bundler integration. Defaults to 'auto', which picks
   * turbopack when `process.env.TURBOPACK === '1'` (set by `next dev --turbopack`)
   * and webpack otherwise.
   */
  bundler?: BundlerOption;
  /**
   * Project root directory used by the Turbopack runtime (the webpack path
   * receives `dir` from Next.js itself). Defaults to `nextConfig.turbopack.root`
   * or `process.cwd()`.
   */
  dir?: string;
}

export const withSaltyCss = <T extends AnyRecord>(nextConfig: T, options: SaltyNextOptions = {}) => {
  const bundler = resolveBundler(options.bundler);
  if (bundler === 'turbopack') {
    return withSaltyTurbopack(nextConfig, { mode: options.mode, dir: options.dir });
  }
  return withSaltyWebpack(nextConfig, { mode: options.mode });
};

export default withSaltyCss;
