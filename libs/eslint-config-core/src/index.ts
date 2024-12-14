import { ESLint } from 'eslint';

// ESlint docs: https://eslint.org/docs/latest/extend/shareable-configs

const eslintConfigCore = {
  plugins: ['@salty-css/core'],
  rules: {
    'core/no-variants-in-base': 'error',
  },
  overrides: [
    {
      files: ['*.css.ts', '*.css.tsx'],
      rules: {
        '@salty-css/core/no-variants-in-base': ['error'],
      },
    },
  ],
} satisfies ESLint.ConfigData;

export default eslintConfigCore;
