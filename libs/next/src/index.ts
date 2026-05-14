import { saltyPlugin } from '@salty-css/webpack';
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';

type NextWebpackFNLike = (config: any, options: any) => any;

type AnyRecord = Record<string, unknown>;

type NextConfigLikeResult = {
  webpack?: null | undefined | NextWebpackFNLike;
};

export interface SaltyNextOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
}

export const withSaltyCss = <T extends AnyRecord & NextConfigLikeResult>(
  nextConfig: T,
  saltyOptions: SaltyNextOptions = {}
): T & NextConfigLikeResult => {
  const { webpack: incomingWebpack, ...rest } = nextConfig;
  return {
    ...rest,
    webpack(config, options) {
      const { dir, isServer } = options;
      saltyPlugin(config, dir, isServer, false, { mode: saltyOptions.mode });
      if (incomingWebpack) {
        incomingWebpack(config, options);
      }
      return config;
    },
  } as T & NextConfigLikeResult;
};

export default withSaltyCss;
