/* eslint-disable @nx/enforce-module-boundaries */
import baseConfig from '../../eslint.config.mjs';
import saltyConfig from '../../libs/eslint-config-core/dist/flat.js';
import jsoncEslintParser from 'jsonc-eslint-parser';

export default [
  ...baseConfig,
  saltyConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs}', '{projectRoot}/vite.config.{js,ts,mjs,mts}'],
        },
      ],
    },
    languageOptions: {
      parser: jsoncEslintParser,
    },
  },
];
