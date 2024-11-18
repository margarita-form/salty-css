import type { Configuration } from 'webpack';
import { resolve } from 'path';
import { generateCss, saltyFileRegExp } from '@salty-css/core/compiler';

export const saltyPlugin = (config: Configuration, dir: string) => {
  config.module?.rules?.push({
    test: saltyFileRegExp(),
    use: [
      {
        loader: resolve('./loader.js'),
        options: { dir },
      },
    ],
  });

  // if (!isServer) {
  config.plugins?.push({
    apply: (compiler) => {
      compiler.hooks.afterPlugins.tap({ name: 'generateCss' }, async () => {
        await generateCss(dir);
      });
    },
  });
  // }
};
