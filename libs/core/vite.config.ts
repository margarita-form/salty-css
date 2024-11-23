/// <reference types='vitest' />
import { defineConfig, PluginOption } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';

const templateLoaderPlugin: () => PluginOption = () => ({
  name: 'gqlLoader',
  transform: (code, id) => {
    if (id.endsWith('__template')) {
      return `export default ${JSON.stringify(code)}`;
    }
    return undefined;
  },
});

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/core',
  plugins: [
    nxViteTsPaths(),
    templateLoaderPlugin(),
    nxCopyAssetsPlugin(['*.md']),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
  ],

  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      name: 'salty-css-core',
      entry: {
        'bin/index': 'src/bin/index.ts',
        'compiler/index': 'src/compiler/index.ts',
        'css/index': 'src/css/index.ts',
        'generator/index': 'src/generator/index.ts',
        'config/index': 'src/config/index.ts',
        'types/index': 'src/types/index.ts',
        'util/index': 'src/util/index.ts',
      },
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'js' : format;
        const parts = entryName.split('/');
        if (parts.length > 1) {
          const name = parts.at(-1);
          const path = parts.slice(0, -1).join('/');
          return `${path}/${name}.${ext}`;
        }
        return `${entryName}.${ext}`;
      },
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: ['path', 'fs', 'fs/promises', 'esbuild', 'winston', 'child_process', 'react', 'commander', 'ejs', 'ora'],
    },
  },
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/core',
      provider: 'v8',
    },
  },
});
