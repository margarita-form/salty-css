/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Rule } from 'eslint';
import type { Property } from 'estree';
import { isSaltyFile } from '@salty-css/core/compiler/helpers';

export const noVariantsInBase: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
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

          const secondArg = _args[1];

          if (!secondArg) return;

          const hasParams = secondArg.type === 'ObjectExpression';
          if (!hasParams) return;

          const base = secondArg.properties.find((prop) => prop.type === 'Property' && prop.key.type === 'Identifier' && prop.key.name === 'base') as Property;
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
            fix: (fixer) => {
              if (!nestedVariants.range) return null;
              // Extract the text for the `variants` property
              const { sourceCode } = context;
              const variantsText = sourceCode.getText(nestedVariants);

              // Calculate insertion point: after the `base` property
              const basePropertyIndex = secondArg.properties.indexOf(base);
              const lastBaseProperty = secondArg.properties[basePropertyIndex];

              // Find the range where the `base` property ends
              if (!lastBaseProperty.range) return null;
              const insertAfter = [lastBaseProperty.range[1], lastBaseProperty.range[1]] as unknown as [number, number];

              // Remove the `variants` property from `base`
              const removeRange = [
                nestedVariants.range[0] - 1, // Include the preceding comma (if any)
                nestedVariants.range[1],
              ] as [number, number];

              // Check if a comma follows the `variants` property
              const wasLastProperty = baseValue.properties.at(-1) === nestedVariants;
              if (wasLastProperty) {
                const textAfterVariants = sourceCode.text.slice(nestedVariants.range[1]);
                const matchTrailingComma = textAfterVariants.match(/^\s*,/);
                if (matchTrailingComma) removeRange[1] += matchTrailingComma[0].length;
              }

              return [fixer.removeRange(removeRange), fixer.insertTextAfterRange(insertAfter, `, ${variantsText}`)];
            },
          });
        } catch (error: any) {
          console.log('ESlint error', error);
          return undefined;
        }
      },
    };
  },
};
