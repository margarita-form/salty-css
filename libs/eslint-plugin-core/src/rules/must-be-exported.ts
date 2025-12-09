/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Rule } from 'eslint';
import { Expression, VariableDeclaration } from 'estree';
import { isSaltyFile } from '@salty-css/core/compiler/helpers';

export const mustBeExported: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Salty CSS related function calls or other values must be exported',
      category: 'Errors',
      recommended: true,
    },
    messages: {
      mustBeExported: 'ipsum',
    },
  },
  create(context) {
    const saltyFile = isSaltyFile(context.filename);
    if (!saltyFile) return {};

    function checkIfCallExpressionIsSaltyFunction(callExpression?: Expression | null) {
      if (!callExpression) return false;

      if (callExpression?.type !== 'CallExpression') return;

      const saltyFunctionNames = ['styled', 'keyframes', 'className'];
      if (callExpression.callee.type === 'Identifier' && saltyFunctionNames.includes(callExpression.callee.name)) return true;

      const defineFunctionRegex = /^define[A-Z]/;
      if (callExpression.callee.type === 'Identifier' && defineFunctionRegex.test(callExpression.callee.name)) return true;

      return false;
    }

    function checkIfSaltyFunctionCall(node: VariableDeclaration) {
      if (node.type === 'VariableDeclaration') {
        const variableDeclarator = node.declarations[0];
        if (variableDeclarator.type !== 'VariableDeclarator') return;

        return checkIfCallExpressionIsSaltyFunction(variableDeclarator.init);
      }
      return false;
    }

    function checkIfExported(node: any) {
      const parent = node.parent;
      if (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') {
        return true;
      }
      return false;
    }

    return {
      VariableDeclaration: (node) => {
        if (!checkIfSaltyFunctionCall(node)) return;
        if (checkIfExported(node)) return;

        context.report({
          node,
          messageId: 'mustBeExported',
          fix: (fixer) => {
            return fixer.insertTextBefore(node, 'export ');
          },
        });
      },
      ExpressionStatement(node) {
        if (node.type !== 'ExpressionStatement') return;
        const isSaltyFunctionCall = checkIfCallExpressionIsSaltyFunction(node.expression);
        if (!isSaltyFunctionCall) return;
        const isRootLevel = node.parent.type === 'Program';
        if (!isRootLevel) return;

        context.report({
          node,
          messageId: 'mustBeExported',
          fix: (fixer) => {
            return fixer.insertTextBefore(node, 'export default ');
          },
        });
      },
    };
  },
};
