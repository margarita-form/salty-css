import { saltyFileExtensions } from '@salty-css/core/compiler/helpers';
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';

export type Bundler = 'webpack' | 'turbopack';
export type BundlerOption = Bundler | 'auto';

export const resolveBundler = (option: BundlerOption | undefined): Bundler => {
  if (option && option !== 'auto') return option;
  return process.env['TURBOPACK'] !== undefined ? 'turbopack' : 'webpack';
};

export type TurbopackLoaderRule = {
  loaders: Array<{ loader: string; options: Record<string, unknown> }>;
  as: string;
};

export const buildSaltyTurbopackRules = (dir: string, mode?: SaltyCompilerMode): Record<string, TurbopackLoaderRule> => {
  const rules: Record<string, TurbopackLoaderRule> = {};
  // Turbopack rejects rule options containing `undefined` values, so only include `mode` when set.
  const loaderOptions: Record<string, unknown> = { dir };
  if (mode !== undefined) loaderOptions['mode'] = mode;
  const loader = { loader: '@salty-css/webpack/loader', options: loaderOptions };
  for (const ext of saltyFileExtensions) {
    rules[`**/*.${ext}.ts`] = { loaders: [loader], as: '*.ts' };
    rules[`**/*.${ext}.tsx`] = { loaders: [loader], as: '*.tsx' };
  }
  return rules;
};
