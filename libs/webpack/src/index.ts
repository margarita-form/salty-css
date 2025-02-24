import type { Configuration } from 'webpack';
import { resolve } from 'path';
import { generateCss, saltyFileRegExp } from '@salty-css/core/compiler';
import { checkShouldRestart } from '@salty-css/core/server';

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
        compiler.hooks.watchRun.tapPromise({ name: 'generateCss' }, async () => {
          console.log('generateCss');
          await generateCss(dir);
        });

        compiler.hooks.done.tapPromise({ name: 'generateCss' }, async (compilation) => {
          Object.keys(compilation.compilation.assets).forEach(async (file) => {
            if (!file) return;
            const shouldRestart = await checkShouldRestart(file);
            console.log('shouldRestart', { shouldRestart, file });

            const restart = () => {
              console.log('restarting');
              compiler.watching?.invalidate();
            };

            if (shouldRestart) restart();
          });
        });
      },
    });
  }
};

export default saltyPlugin;
