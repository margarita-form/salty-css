import { resolve } from 'node:path';
import { defineConfig, type PluginOption } from 'vite';
import dts from 'unplugin-dts/vite';
import { rolldown } from '../../shared/vite-rolldown-config';

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
  root: resolve(import.meta.dirname, 'src'),
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [
    templateLoaderPlugin(),
    dts({
      root: resolve(import.meta.dirname),
      entryRoot: resolve(import.meta.dirname, 'src'),
      tsconfigPath: resolve(import.meta.dirname, 'tsconfig.lib.json'),
      exclude: ['**/*.test.ts', '**/*.__template'],
      compilerOptions: {
        rootDir: resolve(import.meta.dirname, 'src'),
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
      name: 'core',
      formats: ['es', 'cjs'],
      entry: {
        'bin/index': 'bin/index.ts',
        'bin/main': 'bin/main.ts',
        'compiler/salty-compiler': 'compiler/salty-compiler.ts',
        'compiler/get-files': 'compiler/get-files.ts',
        'compiler/get-function-range': 'compiler/get-function-range.ts',
        'compiler/helpers': 'compiler/helpers.ts',
        'factories/index': 'factories/index.ts',
        'css/index': 'css/index.ts',
        'css/keyframes': 'css/keyframes.ts',
        'css/media': 'css/media.ts',
        'css/token': 'css/token.ts',
        'css/merge': 'css/merge.ts',
        'helpers/index': 'helpers/index.ts',
        'generators/index': 'generators/index.ts',
        'parsers/index': 'parsers/index.ts',
        'config/index': 'config/index.ts',
        'types/index': 'types/index.ts',
        'util/index': 'util/index.ts',
        'server/index': 'server/index.ts',
        'instances/classname-instance': 'instances/classname-instance.ts',
        'runtime/index': 'runtime/index.ts',
      },
    },
    rolldownOptions: rolldown,
  },
});
