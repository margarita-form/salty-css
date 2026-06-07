import { SaltyCompiler, SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { PluginOption, ResolvedConfig, ViteDevServer } from 'vite';
import { AstroPluginContext, loadSaltyFile } from './load-salty-file';
import { handleHotUpdate, watchChange } from './watch-handlers';

export interface SaltyAstroPluginOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
}

export const saltyPlugin = (dir: string, options: SaltyAstroPluginOptions = {}): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir, { mode: options.mode });

  // Shared, mutable state crossing the hook boundary. `importer` is set
  // just-in-time by importFile (dev only) and read by loadSaltyFile.
  const ctx: AstroPluginContext = { compiler: saltyCompiler, importer: undefined };

  // Core's default importer: native dynamic import() of the esbuild output in
  // saltygen/js. No server dependency, so it is safe inside a Rollup / Astro build.
  const defaultImportFile = (path: string) => {
    const now = Date.now();
    return import(/* @vite-ignore */ `${path}?t=${now}`);
  };

  let devServer: ViteDevServer | undefined;
  let isBuild = false;

  // Decide per call instead of swapping importFile in configureServer. ssrLoadModule
  // is only used when a dev server is live AND we are not building: its compat
  // module runner has no connected transport during `astro build` (Astro 6
  // Environment API), which throws "invoke was called before connect".
  saltyCompiler.importFile = async (path: string) => {
    if (isBuild || !devServer) return defaultImportFile(path);
    const now = Date.now();
    ctx.importer = devServer.ssrLoadModule;
    return devServer.ssrLoadModule(`${path}?t=${now}`);
  };

  return {
    name: 'stylegen',
    configResolved: async function (config: ResolvedConfig) {
      isBuild = config.command === 'build';
      try {
        await saltyCompiler.generateCss();
      } catch (error) {
        console.error('Error during initial CSS generation:', error);
        throw error;
      }
    },
    configureServer: function (_server) {
      devServer = _server;
    },
    load: function (filePath) {
      return loadSaltyFile(ctx, filePath);
    },
    handleHotUpdate: function (hmrContext) {
      return handleHotUpdate(saltyCompiler, hmrContext);
    },
    watchChange: {
      handler: function (filePath, change) {
        return watchChange(saltyCompiler, filePath, change);
      },
    },
  };
};

export default saltyPlugin;
