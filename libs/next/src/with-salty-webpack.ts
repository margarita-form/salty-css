/* eslint-disable @typescript-eslint/no-explicit-any */
import { saltyPlugin } from '@salty-css/webpack';
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';

type AnyRecord = Record<any, any>;

export interface SaltyWebpackWrapperOptions {
  mode?: SaltyCompilerMode;
}

export const withSaltyWebpack = <T extends AnyRecord>(nextConfig: T, options: SaltyWebpackWrapperOptions = {}) => {
  const { webpack: incomingWebpack, ...rest } = nextConfig;
  return {
    ...rest,
    webpack(config: any, webpackOptions: any) {
      const { dir, isServer } = webpackOptions;
      saltyPlugin(config, dir, isServer, false, { mode: options.mode });
      if (incomingWebpack && typeof incomingWebpack === 'function') {
        incomingWebpack(config, webpackOptions);
      }
      return config;
    },
  };
};
