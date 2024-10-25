/// <reference types='vitest' />
import { PluginOption, defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { exec } from 'child_process';

const stylegen: () => PluginOption = () => ({
  name: 'stylegen',
  watchChange: {
    handler: (context) => {
      if (context.includes('.salty.')) {
        console.log('Generating CSS...');
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

  plugins: [react(), nxViteTsPaths(), stylegen()],

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
