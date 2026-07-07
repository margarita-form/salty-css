import { SaltyCompiler, SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';
import { PluginOption, ResolvedConfig, ViteDevServer } from 'vite';
import { AstroPluginContext, loadSaltyFile } from './load-salty-file';
import { handleHotUpdate, watchChange } from './watch-handlers';

import { ViteNodeServer } from 'vite-node/server';
import { ViteNodeRunner } from 'vite-node/client';
import { installSourcemapsSupport } from 'vite-node/source-map';

export interface SaltyAstroPluginOptions {
  /**
   * Explicit build mode. Defaults to NODE_ENV-based detection.
   */
  mode?: SaltyCompilerMode;
}

export const saltyPlugin = (dir: string, options: SaltyAstroPluginOptions = {}): PluginOption => {
  // A standalone Vite + vite-node pipeline used to evaluate Salty's generated
  // output (the esbuild bundles in saltygen/js, plus whatever user source they
  // import). It is fully independent of Astro's dev server and of the Astro 6
  // Environment API, so:
  //   - it behaves identically in `astro dev` and `astro build`, and
  //   - it is immune to the "invoke was called before connect" error that
  //     breaks devServer.ssrLoadModule during build, and
  //   - it does not depend on native import(), which is unreliable on Vite 7+.
  let auxServer: ViteDevServer | undefined;
  let node: ViteNodeServer | undefined;
  let runner: ViteNodeRunner | undefined;
  let resolvedConfig: ResolvedConfig | undefined;

  const saltyCompiler = new SaltyCompiler(dir, { mode: options.mode });

  // Shared, mutable state crossing the hook boundary into the `load` hook
  // (loadSaltyFile).
  const ctx: AstroPluginContext = { compiler: saltyCompiler };

  // Lazily create (and re-create) the vite-node pipeline. Re-creation matters
  // because Astro's build can run multiple passes and may fire closeBundle
  // between them; if the aux server was torn down, the next importFile call
  // transparently rebuilds it instead of failing.
  const ensureRunner = async (): Promise<ViteNodeRunner> => {
    if (runner && node && auxServer) return runner;

    if (!resolvedConfig) {
      throw new Error('[stylegen] vite-node runner requested before configResolved ran');
    }

    const { createServer, version: viteVersion } = await import('vite');

    auxServer = await createServer({
      // Inherit the user's module resolution so generated files that import via
      // tsconfig path aliases (`@/...`, `~/...`, etc.) still resolve. Widen this
      // (conditions, mainFields, dedupe) if your generated output needs more.
      resolve: {
        alias: resolvedConfig.resolve.alias,
      },
      // Middleware mode => no HTTP server is started, so there is no port to
      // clash with Astro's. NOTE: `hmr: false` is NOT enough to free the HMR
      // WebSocket port — Vite still binds it (default 24678). `ws: false` is
      // what actually disables the WebSocket server, which is why the build
      // logged "Port 24678 is already in use". `watch: null` drops the chokidar
      // watcher we never use (lighter, and it won't keep the build alive).
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      // vite-node evaluates modules itself; dependency pre-bundling is not used.
      optimizeDeps: { noDiscovery: true, include: [] },
    });

    // Older Vite needs an explicit buildStart to initialise the plugin
    // container. Vite 6+ does this for us, and calling it again would re-fire
    // plugin buildStart hooks, so guard on the major version.
    if (Number(viteVersion.split('.')[0]) < 6) {
      await auxServer.pluginContainer.buildStart({});
    }

    // Capture in a local const so the callbacks below never see a reset
    // (closeAuxServer nulls the outer `node`).
    const nodeServer = new ViteNodeServer(auxServer);
    node = nodeServer;

    // Maps evaluated stack traces back to source. Replaces the manual
    // ssrFixStacktrace dance from the ssrLoadModule approach.
    installSourcemapsSupport({
      getSourceMap: (src) => nodeServer.getSourceMap(src),
    });

    runner = new ViteNodeRunner({
      root: auxServer.config.root,
      base: auxServer.config.base,
      // Server and runner live in the same process here, so the transport is a
      // direct function call. Swap these for RPC if you ever move the runner.
      fetchModule: (modId) => nodeServer.fetchModule(modId),
      resolveId: (modId, importer) => nodeServer.resolveId(modId, importer),
    });

    return runner;
  };

  // vite-node caches *evaluated* modules by id. After Salty regenerates a file
  // we must drop the stale entry so it re-executes — this is the vite-node
  // equivalent of the `?t=${Date.now()}` ESM cache-bust the old native import
  // relied on. Helper names vary across vite-node versions, so feature-detect
  // and fall back to a full clear (safe; the generated files are small).
  const invalidateModule = (r: ViteNodeRunner, path: string) => {
    const cache = r.moduleCache as unknown as {
      invalidateDepTree?: (ids: string[] | Set<string>) => void;
      deleteByModuleId?: (id: string) => boolean;
      clear: () => void;
    };
    if (cache.invalidateDepTree) cache.invalidateDepTree([path]);
    else if (cache.deleteByModuleId) cache.deleteByModuleId(path);
    else cache.clear();
  };

  // Single code path for both dev and build: resolve + transform + EXECUTE the
  // file through vite-node and return its evaluated exports (the same shape
  // native import() produced).
  //
  // IMPORTANT: this uses runner.executeFile(), NOT node.fetchModule().
  // fetchModule() returns transformed *source code* ({ code, id, map }) that the
  // runner consumes internally — it is not the evaluated module, which is why
  // returning it produced no usable exports.
  saltyCompiler.importFile = async (path: string) => {
    const r = await ensureRunner();
    invalidateModule(r, path);
    return r.executeFile(path);
  };

  const closeAuxServer = async () => {
    const s = auxServer;
    auxServer = undefined;
    node = undefined;
    runner = undefined;
    if (s) {
      try {
        await s.close();
      } catch {
        // ignore teardown errors
      }
    }
  };

  // The initial full generation must happen exactly once per build/serve, but
  // configResolved fires multiple times during an Astro build: a client pass
  // and a server pass, one config per environment under the Astro 6 Environment
  // API, and the SSR server Astro spins up to render static routes — all on this
  // single shared plugin instance. Dev resolves the config once, so it was only
  // ever generated once there. Memoise the promise so repeated configResolved
  // calls reuse it; incremental rebuilds still go through watchChange /
  // handleHotUpdate, which are independent of this.
  let initialGeneration: Promise<unknown> | undefined;
  const generateCssOnce = () => {
    if (!initialGeneration) {
      initialGeneration = saltyCompiler.generateCss().catch((error) => {
        // Let a later pass retry if the first attempt failed.
        initialGeneration = undefined;
        throw error;
      });
    }
    return initialGeneration;
  };

  return {
    name: 'stylegen',
    configResolved: async function (config: ResolvedConfig) {
      resolvedConfig = config;

      // Warm up the pipeline, then do the initial full generation (once).
      await ensureRunner();

      try {
        await generateCssOnce();
      } catch (error) {
        console.error('Error during initial CSS generation:', error);
        throw error;
      }
    },
    resolveId: function (source) {
      // Salty's load() emits virtual imports of the form
      //   `<abs path>.css.ts.astro?configFile=<hash>.config`
      // and resolves them itself (reading saltygen/astro/<hash>.config and
      // returning an Astro component). Vite's dev server tolerates these as
      // unclaimed ids and calls load() anyway, but Rollup's production build is
      // strict: with no plugin owning the id it tries to resolve the path as a
      // real file and fails ("Rollup failed to resolve import ...").
      //
      // Returning the id marks it as owned so it is routed to load(). Do NOT
      // prefix with `\0` — the path must keep its `.astro` extension so Astro's
      // own plugin still compiles the component that load() returns.
      if (source.includes('.astro?configFile=')) {
        return source;
      }
      return null;
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
    // Vite fires closeBundle when the dev server closes and at the end of a
    // build, so the auxiliary vite-node server is torn down in both cases. If a
    // later build pass needs it again, ensureRunner() rebuilds it on demand.
    closeBundle: async function () {
      await closeAuxServer();
    },
  };
};

export default saltyPlugin;
