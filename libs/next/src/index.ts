import { saltyPlugin } from '@salty-css/webpack';

interface NextConfigLike {
  webpack?: (config: any, options: any) => any;
}

export const withSaltyCss = <T extends NextConfigLike>(nextConfig: T): T => {
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
  } as T;
};

export default withSaltyCss;
