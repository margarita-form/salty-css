import type { Configuration } from 'webpack';
import { resolve } from 'path';
import { generateCss, saltyFileRegExp } from '@salty-css/core/compiler';

export const saltyPlugin = (config: Configuration, dir: string, isServer = false, cjs = false) => {
  config.module?.rules?.push({
    test: saltyFileRegExp(),
    use: [
      {
        loader: resolve(__dirname, cjs ? './loader.cjs' : './loader.js'),
        options: { dir },
      },
    ],
  });

  if (!isServer) {
    config.plugins?.push({
      apply: (compiler) => {
        compiler.hooks.afterPlugins.tap({ name: 'generateCss' }, async () => {
          await generateCss(dir);
        });
      },
    });
  }
};

export default saltyPlugin;
