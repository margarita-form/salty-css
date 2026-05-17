/* eslint-disable @typescript-eslint/no-explicit-any */
import { saltyPlugin } from '@salty-css/webpack';
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import type { CopyConfigCacheOption } from '@salty-css/core/compiler/copy-config-cache';

type AnyRecord = Record<any, any>;

export interface SaltyNextOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
  /**
   * Where to copy the Salty `config-cache.json` after a production build.
   *
   * - `true` (default) → copy to webpack's `output.path` (`.next/`).
   * - `false` → no copy.
   * - `string | string[]` → copy to the default destination PLUS each listed path.
   *   For `output: 'standalone'`, supply the standalone path here
   *   (e.g. `['.next/standalone/<project>']`) or include it via Next's
   *   `outputFileTracingIncludes` — it cannot be auto-detected.
   */
  copyConfigCache?: CopyConfigCacheOption;
}

export const withSaltyCss = <T extends AnyRecord>(nextConfig: T, saltyOptions: SaltyNextOptions = {}) => {
  const { webpack: incomingWebpack, ...rest } = nextConfig;
  return {
    ...rest,
    webpack(config: any, options: any) {
      const { dir, isServer } = options;
      saltyPlugin(config, dir, isServer, false, {
        mode: saltyOptions.mode,
        copyConfigCache: saltyOptions.copyConfigCache,
      });
      if (incomingWebpack && typeof incomingWebpack === 'function') {
        incomingWebpack(config, options);
      }
      return config;
    },
  };
};

export default withSaltyCss;
