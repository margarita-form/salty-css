import { ESLint } from 'eslint';

// ESlint docs: https://eslint.org/docs/latest/extend/shareable-configs

const eslintConfigCore = {
  plugins: ['@salty-css/core'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@salty-css/core/no-variants-in-base': 'error',
        '@salty-css/core/must-be-exported': 'error',
      },
    },
  ],
} satisfies ESLint.ConfigData;

export default eslintConfigCore;
