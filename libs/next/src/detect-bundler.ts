import { saltyFileExtensions } from '@salty-css/core/compiler/helpers';
import type { SaltyCompilerMode } from '@salty-css/core/compiler/salty-compiler';

export type Bundler = 'webpack' | 'turbopack';
export type BundlerOption = Bundler | 'auto';

export const resolveBundler = (option: BundlerOption | undefined): Bundler => {
  if (option && option !== 'auto') return option;
  return process.env['TURBOPACK'] === '1' ? 'turbopack' : 'webpack';
};

export type TurbopackLoaderRule = {
  loaders: Array<{ loader: string; options: Record<string, unknown> }>;
  as: string;
};

export const buildSaltyTurbopackRules = (dir: string, mode?: SaltyCompilerMode): Record<string, TurbopackLoaderRule> => {
  const rules: Record<string, TurbopackLoaderRule> = {};
  const loader = { loader: '@salty-css/webpack/loader', options: { dir, mode } };
  for (const ext of saltyFileExtensions) {
    rules[`*.${ext}.ts`] = { loaders: [loader], as: '*.ts' };
    rules[`*.${ext}.tsx`] = { loaders: [loader], as: '*.tsx' };
  }
  return rules;
};
