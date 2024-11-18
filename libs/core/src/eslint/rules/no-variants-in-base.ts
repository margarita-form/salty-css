/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Rule } from 'eslint';
import type { Property } from 'estree';
import { isSaltyFile } from '../../compiler';

export const noVariantsInBase: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure `variants` are not nested inside `base` in styled calls',
      category: 'Errors',
      recommended: true,
    },
    messages: {
      nestedVariants: '`variants` should not be nested inside `base`.',
    },
  },
  create(context) {
    const saltyFile = isSaltyFile(context.filename);
    if (!saltyFile) return {};
    return {
      CallExpression: (node) => {
        try {
          const { callee, arguments: _args } = node;
          const isStyled = callee.type === 'Identifier' && callee.name === 'styled';
          if (!isStyled) return;

          const firstArg = _args[0];
          if (!firstArg) return;

          const hasParams = firstArg.type === 'ObjectExpression';
          if (!hasParams) return;

          const base = firstArg.properties.find((prop) => prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'base') as Property;
          if (!base) return;

          const { value: baseValue } = base;
          const baseHasParams = baseValue.type === 'ObjectExpression';
          if (!baseHasParams) return;

          const nestedVariants = baseValue.properties.find(
            (prop) => prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'variants'
          );
          if (!nestedVariants) return;

          context.report({
            node: nestedVariants,
            messageId: 'nestedVariants',
          });
        } catch (error: any) {
          console.log('ESlint error', error);
          return undefined;
        }
      },
    };
  },
};
