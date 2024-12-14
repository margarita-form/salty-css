import { Linter } from 'eslint';
import eslintPluginCore from '@salty-css/eslint-plugin-core';

// ESlint docs: https://eslint.org/docs/latest/extend/shareable-configs

const eslintConfigCore = {
  files: ['**/*.ts', '**/*.tsx'],
  plugins: {
    '@salty-css/core': eslintPluginCore,
  },
  rules: {
    '@salty-css/core/no-variants-in-base': 'error',
    '@salty-css/core/must-be-exported': 'error',
  },
} satisfies Linter.Config;

export default eslintConfigCore;
