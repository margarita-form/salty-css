/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Rule } from 'eslint';
import { VariableDeclaration } from 'estree';
import { isSaltyFile } from '@salty-css/core/compiler';

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
      mustBeExported: 'Salty CSS related function calls or other values must be exported',
    },
  },
  create(context) {
    const saltyFile = isSaltyFile(context.filename);
    if (!saltyFile) return {};

    function checkIfSaltyFunctionCall(node: VariableDeclaration) {
      if (node.type === 'VariableDeclaration') {
        const variableDeclarator = node.declarations[0];
        if (variableDeclarator.type !== 'VariableDeclarator') return;

        const callExpression = variableDeclarator.init;
        if (callExpression?.type !== 'CallExpression') return;

        const saltyFunctionNames = ['styled', 'keyframes'];
        if (callExpression.callee.type === 'Identifier' && saltyFunctionNames.includes(callExpression.callee.name)) {
          return true;
        }
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
        if (!checkIfExported(node)) {
          context.report({
            node,
            messageId: 'mustBeExported',
            fix: (fixer) => {
              return fixer.insertTextBefore(node, 'export ');
            },
          });
        }
      },
    };
  },
};
