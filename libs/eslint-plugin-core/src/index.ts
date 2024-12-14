import { ESLint } from 'eslint';
import { noVariantsInBase } from './rules/no-variants-in-base';

// ESlint docs: https://eslint.org/docs/latest/extend/plugins

const eslintPluginCore = {
  configs: {},
  rules: {
    'no-variants-in-base': noVariantsInBase,
  },
} satisfies ESLint.Plugin;

Object.assign(eslintPluginCore.configs, {
  recommended: {
    plugins: {
      core: eslintPluginCore,
    },
    rules: {
      'core/no-variants-in-base': 'error',
    },
    overrides: [
      {
        files: ['*.css.ts', '*.css.tsx'],
        rules: {
          '@salty-css/core/no-variants-in-base': ['warn'],
        },
      },
    ],
  },
} satisfies ESLint.Plugin['configs']);

export default eslintPluginCore;
