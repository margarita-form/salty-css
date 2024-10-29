/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import {
  generateCss,
  generateFile,
  generateVariables,
  minimizeFile,
} from '../../libs/core/src/compiler';

// Copy of the Vite config from the React Testing app.
export const saltyPlugin = (dir: string) => ({
  name: 'stylegen',
  buildStart: () => generateCss(dir),
  load: async (filePath: string) => {
    if (filePath.includes('.salty.')) {
      return await minimizeFile(dir, filePath);
    }
    return undefined;
  },
  watchChange: {
    handler: async (filePath: string) => {
      if (filePath.includes('.salty.')) {
        await generateFile(dir, filePath);
      }
      if (filePath.includes('salty-config')) {
        await generateVariables(dir);
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
