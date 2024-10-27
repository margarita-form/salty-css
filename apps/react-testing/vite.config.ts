/// <reference types='vitest' />
import { PluginOption, defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import {
  generateCss,
  generateFile,
  generateVariables,
  minimizeFile,
} from '../../libs/core/src';

const stylegen: () => PluginOption = () => ({
  name: 'stylegen',
  buildStart: () => generateCss(__dirname),
  load: async (filePath) => {
    if (filePath.includes('.salty.')) {
      return await minimizeFile(__dirname, filePath);
    }
  },
  watchChange: {
    handler: async (filePath) => {
      if (filePath.includes('.salty.')) {
        await generateFile(__dirname, filePath);
      }
      if (filePath.includes('salty-config')) {
        await generateVariables(__dirname);
      }
    },
  },
});

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
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.app.json'),
    }),
    stylegen(),
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
