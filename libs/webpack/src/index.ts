import type { Configuration } from 'webpack';
import { resolve } from 'path';
import { generateCss, generateFile, isSaltyFile, saltyFileRegExp } from '@salty-css/core/compiler';
import { checkShouldRestart } from '@salty-css/core/server';
import { watch } from 'fs';

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
        let started = false;
        compiler.hooks.watchRun.tapPromise({ name: 'generateCss' }, async () => {
          if (started) return;
          started = true;

          await generateCss(dir);

          watch(dir, { recursive: true }, async (event, filePath) => {
            const shouldRestart = await checkShouldRestart(filePath);
            if (shouldRestart) {
              await generateCss(dir);
            } else {
              const saltyFile = isSaltyFile(filePath);
              if (saltyFile) await generateFile(dir, filePath);
            }
          });
        });
      },
    });
  }
};

export default saltyPlugin;
