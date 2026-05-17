import type { Configuration } from 'webpack';
import { resolve } from 'path';
import { checkShouldRestart } from '@salty-css/core/server';
import { watch } from 'fs';
import { isSaltyFile, saltyFileRegExp } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler, SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { copyConfigCacheTo, CopyConfigCacheOption, resolveCopyConfigCacheDestinations } from '@salty-css/core/compiler/copy-config-cache';

export interface SaltyWebpackPluginOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
  /**
   * Where to copy the Salty `config-cache.json` after a production build.
   *
   * - `true` (default) → copy to webpack's `output.path`.
   * - `false` → no copy.
   * - `string | string[]` → copy to the default destination PLUS each listed path.
   *   For Next.js `output: 'standalone'`, supply the standalone output path here
   *   (e.g. `['.next/standalone/<project>']`) — it cannot be auto-detected.
   */
  copyConfigCache?: CopyConfigCacheOption;
}

export const saltyPlugin = (config: Configuration, dir: string, isServer = false, cjs = false, options: SaltyWebpackPluginOptions = {}) => {
  const saltyCompiler = new SaltyCompiler(dir, { mode: options.mode });

  config.module?.rules?.push({
    test: saltyFileRegExp(),
    use: [
      {
        loader: resolve(__dirname, cjs ? './loader.cjs' : './loader.js'),
        options: { dir, mode: options.mode },
      },
    ],
  });

  if (!isServer) {
    config.plugins?.push({
      apply: (compiler) => {
        let started = false;
        compiler.hooks.beforeCompile.tapPromise({ name: 'generateCss' }, async () => {
          if (started) return;
          started = true;

          await saltyCompiler.generateCss();

          watch(dir, { recursive: true }, async (event, filePath) => {
            const shouldRestart = await checkShouldRestart(filePath);
            if (shouldRestart) {
              await saltyCompiler.generateCss();
            } else {
              const saltyFile = isSaltyFile(filePath);
              if (saltyFile) await saltyCompiler.generateFile(dir);
            }
          });
        });

        compiler.hooks.afterEmit?.tapPromise({ name: 'copyConfigCache' }, async (compilation) => {
          if (!saltyCompiler.isProduction) return;
          const outputPath = compiler.outputPath || compilation.outputOptions.path;
          if (!outputPath) return;
          const destinations = resolveCopyConfigCacheDestinations(options.copyConfigCache, outputPath, dir);
          await copyConfigCacheTo(saltyCompiler, destinations);
        });
      },
    });
  }
};

export default saltyPlugin;
