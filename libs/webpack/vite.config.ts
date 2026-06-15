import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite';
import { rolldown } from '../../shared/vite-rolldown-config';
import { vitePlugins } from '../../shared/vite-plugin-config';

export default defineConfig({
  root: resolve(import.meta.dirname, 'src'),
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [
    ...vitePlugins,
    dts({
      root: resolve(import.meta.dirname),
      entryRoot: resolve(import.meta.dirname, 'src'),
      tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
      exclude: ['test/**/*', '**/*.test.ts', '**/*.__template'],
      compilerOptions: {
        rootDir: resolve(import.meta.dirname, 'src'),
        paths: {
          '@salty-css/core/*': [resolve(import.meta.dirname, '../core/dist/*')],
          '@salty-css/react/*': [resolve(import.meta.dirname, '../react/dist/*')],
        },
      },
    }),
  ],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'node22',
    minify: true,
    lib: {
      name: 'salty-css-webpack',
      formats: ['es', 'cjs'],
      entry: {
        index: 'index.ts',
        loader: 'loader.ts',
      },
    },
    rolldownOptions: rolldown,
  },
});
