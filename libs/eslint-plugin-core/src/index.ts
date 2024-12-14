import { ESLint } from 'eslint';
import { noVariantsInBase } from './rules/no-variants-in-base';
import { mustBeExported } from './rules/must-be-exported';

// ESlint docs: https://eslint.org/docs/latest/extend/plugins

const eslintPluginCore = {
  rules: {
    'no-variants-in-base': noVariantsInBase,
    'must-be-exported': mustBeExported,
  },
} satisfies ESLint.Plugin;

export default eslintPluginCore;
