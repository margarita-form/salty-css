/// <reference types='vitest' />
import { defineConfig, PluginOption } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { isSaltyFile } from '../../libs/core/src/compiler/helpers';
import { SaltyCompiler } from '../../libs/core/src/compiler/as-class';
import { checkShouldRestart } from '../../libs/core/src/server';

// Copy of the Vite config from the React Testing app.
export const saltyPlugin = (dir: string): PluginOption => {
  const saltyCompiler = new SaltyCompiler(dir);

  return {
    name: 'stylegen',
    buildStart: async () => await saltyCompiler.generateCss(),
    load: async (filePath: string) => {
      const saltyFile = isSaltyFile(filePath);
      if (saltyFile) {
        return await saltyCompiler.minimizeFile(filePath);
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
  };
};

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/react-testing',

  server: {
    port: 4200,
    host: 'localhost',
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    react(),
    nxViteTsPaths(),
    saltyPlugin(__dirname),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.app.json'),
    }),
  ],

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },

  build: {
    outDir: '../../dist/apps/react-testing',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
