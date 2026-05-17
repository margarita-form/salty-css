import { isSaltyFile } from '@salty-css/core/compiler/helpers';
import { SaltyCompiler, SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { copyConfigCacheTo, CopyConfigCacheOption, resolveCopyConfigCacheDestinations } from '@salty-css/core/compiler/copy-config-cache';
import { checkShouldRestart } from '@salty-css/core/server';
import { isAbsolute, resolve } from 'path';
import { PluginOption, ResolvedConfig } from 'vite';

type SaltyFileTransform = (compiler: SaltyCompiler, file: string) => Promise<string | undefined>;

export interface SaltyVitePluginOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
  /**
   * Where to copy the Salty `config-cache.json` after a production build.
   *
   * - `true` (default) → copy to the bundler's `build.outDir`.
   * - `false` → no copy.
   * - `string | string[]` → copy to the default destination PLUS each listed path.
   *   Directories receive `saltygen/cache/config-cache.json`; `.json` paths are used as-is.
   */
  copyConfigCache?: CopyConfigCacheOption;
}

const loadFrameworkTransform = async (framework: string | undefined): Promise<SaltyFileTransform> => {
  if (framework === 'react' || framework === undefined) {
    const mod = await import('@salty-css/react/transform-salty-file');
    return mod.transformSaltyFile;
  }

  throw new Error(`@salty-css/vite: framework "${framework}" is not supported. Supported: react.`);
};

export const saltyPlugin = (dir: string, options: SaltyVitePluginOptions = {}): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir, { mode: options.mode });

  let transformPromise: Promise<SaltyFileTransform> | undefined;
  const getTransform = () => {
    if (!transformPromise) transformPromise = saltyCompiler.getFramework().then(loadFrameworkTransform);
    return transformPromise;
  };

  let resolvedConfig: ResolvedConfig | undefined;

  return {
    name: 'stylegen',
    configResolved: (config) => {
      resolvedConfig = config;
    },
    buildStart: async () => await saltyCompiler.generateCss(),
    load: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        const transform = await getTransform();
        return await transform(saltyCompiler, filePath);
      }
      return undefined;
    },
    handleHotUpdate: async ({ file, server }) => {
      const shouldRestart = await checkShouldRestart(file);
      if (shouldRestart) server.restart();
    },
    watchChange: {
      handler: async (filePath, change) => {
        const saltyFile = isSaltyFile(filePath);
        if (saltyFile && change.event !== 'delete') {
          const shouldRestart = await checkShouldRestart(filePath);
          if (!shouldRestart) await saltyCompiler.generateFile(filePath);
        }
      },
    },
    closeBundle: async () => {
      if (!resolvedConfig || resolvedConfig.command !== 'build') return;
      if (!saltyCompiler.isProduction) return;
      const outDir = resolvedConfig.build.outDir;
      const defaultOutDir = isAbsolute(outDir) ? outDir : resolve(resolvedConfig.root, outDir);
      const destinations = resolveCopyConfigCacheDestinations(options.copyConfigCache, defaultOutDir, resolvedConfig.root);
      await copyConfigCacheTo(saltyCompiler, destinations);
    },
  };
};

export default saltyPlugin;
