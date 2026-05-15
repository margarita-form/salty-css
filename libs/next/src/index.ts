/* eslint-disable @typescript-eslint/no-explicit-any */
import { saltyPlugin } from '@salty-css/webpack';
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';

type AnyRecord = Record<string, unknown>;

export interface SaltyNextOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
}

export const withSaltyCss = <T extends AnyRecord>(nextConfig: T, saltyOptions: SaltyNextOptions = {}) => {
  const { webpack: incomingWebpack, ...rest } = nextConfig;
  return {
    ...rest,
    webpack(config: any, options: any) {
      const { dir, isServer } = options;
      saltyPlugin(config, dir, isServer, false, { mode: saltyOptions.mode });
      if (incomingWebpack && typeof incomingWebpack === 'function') {
        incomingWebpack(config, options);
      }
      return config;
    },
  };
};

export default withSaltyCss;
