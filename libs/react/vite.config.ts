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
      name: 'salty-css-react',
      formats: ['es', 'cjs'],
      entry: {
        index: 'index.ts',
        styled: 'styled.ts',
        'styled-client': 'styled-client.ts',
        'class-name': 'class-name.ts',
        'class-name-client': 'class-name-client.ts',
        keyframes: 'keyframes.ts',
        media: 'media.ts',
        factories: 'factories.ts',
        config: 'config.ts',
        helpers: 'helpers.ts',
        runtime: 'runtime.ts',
        'transform-salty-file': 'transform-salty-file.ts',
      },
    },
    rolldownOptions: rolldown,
  },
});
