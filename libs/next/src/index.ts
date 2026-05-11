import { saltyPlugin } from '@salty-css/webpack';

type NextWebpackFNLike = (config: any, options: any) => any;

type AnyRecord = Record<string, unknown>;

type NextConfigLikeResult = {
  webpack?: null | undefined | NextWebpackFNLike;
};

export const withSaltyCss = <T extends AnyRecord & NextConfigLikeResult>(nextConfig: T): T & NextConfigLikeResult => {
  const { webpack: incomingWebpack, ...rest } = nextConfig;
  return {
    ...rest,
    webpack(config, options) {
      const { dir, isServer } = options;
      saltyPlugin(config, dir, isServer);
      if (incomingWebpack) {
        incomingWebpack(config, options);
      }
      return config;
    },
  } as T & NextConfigLikeResult;
};

export default withSaltyCss;
