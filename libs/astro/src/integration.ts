import { AstroIntegration } from 'astro';
import { SaltyCompiler, SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { copyConfigCacheTo, CopyConfigCacheOption, resolveCopyConfigCacheDestinations } from '@salty-css/core/compiler/copy-config-cache';
import saltyPlugin from './astro-vite-plugin';
import { join } from 'path';
import { fileURLToPath } from 'url';

interface SaltyIntegrationOptions {
  /**
   * The source directory where SaltyCSS Config is located.
   * Default is "src".
   */
  srcDir?: string;
  /**
   * Override full path to the project directory.
   * Default is the current directory of the Astro configuration.
   */
  rootDir?: string;
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
  /**
   * Where to copy the Salty `config-cache.json` after a production build.
   *
   * - `true` (default) → copy to Astro's `dist` output dir.
   * - `false` → no copy.
   * - `string | string[]` → copy to the default destination PLUS each listed path.
   *   Useful for adapters that emit a separate server bundle (e.g. Cloudflare's
   *   `dist/_worker.js/`, Vercel's `.vercel/output/functions/...`).
   */
  copyConfigCache?: CopyConfigCacheOption;
}

export const saltyIntegration = (options: SaltyIntegrationOptions = {}): AstroIntegration => {
  let compiler: SaltyCompiler | undefined;
  let workingDir: string | undefined;

  return {
    name: 'astro-salty-integration',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        const { srcDir = 'src', rootDir: dir = config.root.pathname, mode } = options;
        workingDir = join(dir, srcDir);
        compiler = new SaltyCompiler(workingDir, { mode });

        updateConfig({
          vite: { plugins: [saltyPlugin({ mode, compiler })] },
        });
      },
      'astro:build:done': async ({ dir }) => {
        if (!compiler || !workingDir) return;
        if (!compiler.isProduction) return;
        const outDir = fileURLToPath(dir);
        const destinations = resolveCopyConfigCacheDestinations(options.copyConfigCache, outDir, workingDir);
        await copyConfigCacheTo(compiler, destinations);
      },
    },
  };
};

export default saltyIntegration;
