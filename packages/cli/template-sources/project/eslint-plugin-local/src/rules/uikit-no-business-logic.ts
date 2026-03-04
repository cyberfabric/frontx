/**
 * @fileoverview UI components in components/ui/ must be presentational only - no @hai3/react imports
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { ImportDeclaration } from 'estree';

const BUSINESS_LOGIC_PACKAGES = ['@hai3/react', '@hai3/framework'];

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'UI components in components/ui/ must be presentational only',
      category: 'Screenset Architecture',
      recommended: true,
    },
    messages: {
      noBusinessLogicImport:
        'UI components in components/ui/ cannot import from @hai3/react or @hai3/framework (except types). ' +
        'UI components must be purely presentational (value/onChange pattern, no hooks). ' +
        'Move to screens/{screen}/components/ if business logic is needed.',
    },
    schema: [],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.getFilename();

    const isInComponentsUi =
      filename.includes('/components/ui/') || filename.includes('\\components\\ui\\');

    if (!isInComponentsUi) {
      return {};
    }

    return {
      ImportDeclaration(node: ImportDeclaration) {
        const importSource = node.source.value as string;
        if (BUSINESS_LOGIC_PACKAGES.includes(importSource)) {
          const sourceText = context.getSourceCode().getText(node);

          // Allow: import type { ... } from '@hai3/react'
          if (sourceText.startsWith('import type')) {
            return;
          }

          // Check individual specifiers for type imports
          const hasValueImports = node.specifiers.some((spec) => {
            if (spec.type !== 'ImportSpecifier') {
              return true;
            }
            const specText = context.getSourceCode().getText(spec);
            return !specText.startsWith('type ');
          });

          if (hasValueImports) {
            context.report({
              node: node as unknown as Rule.Node,
              messageId: 'noBusinessLogicImport',
            });
          }
        }
      },
    };
  },
};

export = rule;
