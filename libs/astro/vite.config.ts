import { resolve } from 'node:path';
import { defineConfig } from 'vite-build';
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
          '@salty-css/vite/*': [resolve(import.meta.dirname, '../vite/dist/*')],
        },
      },
    }),
  ],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'node22',
    minify: true,
    copyPublicDir: true,
    lib: {
      name: 'salty-css-astro',
      formats: ['es', 'cjs'],
      entry: {
        index: 'index.ts',
        'astro-vite-plugin': 'astro-vite-plugin.ts',
        integration: 'integration.ts',
        styled: 'styled.ts',
        'class-name': 'class-name.ts',
        'element-props': 'element-props.ts',
        runtime: 'runtime.ts',
        keyframes: 'keyframes.ts',
        media: 'media.ts',
        factories: 'factories.ts',
        config: 'config.ts',
        helpers: 'helpers.ts',
      },
    },
    rolldownOptions: rolldown,
  },
});
