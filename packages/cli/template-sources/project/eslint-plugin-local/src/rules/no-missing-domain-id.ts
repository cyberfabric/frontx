/**
 * @fileoverview Enforce local DOMAIN_ID constant in domain event files
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { Program, VariableDeclaration, Identifier } from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce local DOMAIN_ID constant in domain event files',
      category: 'Screenset Architecture',
      recommended: true,
    },
    messages: {
      missingDomainId:
        'Domain event files must have a local DOMAIN_ID constant. ' +
        'Add: const DOMAIN_ID = \'{{suggestedDomain}}\'; ' +
        'This is used in event enum values: ${SCREENSET_ID}/${DOMAIN_ID}/eventName',
    },
    schema: [],
    fixable: 'code',
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.getFilename();

    // Check if file is in events/ folder
    const isInEventsFolder = filename.includes('/events/') || filename.includes('\\events\\');
    if (!isInEventsFolder) {
      return {};
    }

    // Skip index.ts files (covered by no-barrel-exports rule)
    if (filename.endsWith('/index.ts') || filename.endsWith('\\index.ts')) {
      return {};
    }

    // Extract domain name from filename (e.g., threadsEvents.ts -> threads)
    const parts = filename.split('/');
    const basename = parts[parts.length - 1];
    const domainMatch = basename.match(/^([a-z]+)Events\.ts$/);
    if (!domainMatch) {
      return {}; // Not a domain events file
    }

    const suggestedDomain = domainMatch[1];
    let hasDomainId = false;

    return {
      VariableDeclaration(node: VariableDeclaration) {
        // Check if this is: const DOMAIN_ID = '...'
        for (const declaration of node.declarations) {
          if (
            declaration.id &&
            declaration.id.type === 'Identifier' &&
            (declaration.id as Identifier).name === 'DOMAIN_ID'
          ) {
            hasDomainId = true;
          }
        }
      },

      'Program:exit'(node: Program) {
        if (!hasDomainId) {
          context.report({
            node,
            messageId: 'missingDomainId',
            data: { suggestedDomain },
            fix(fixer) {
              // Add DOMAIN_ID constant after imports
              const sourceCode = context.getSourceCode();
              const firstToken = sourceCode.getFirstToken(node);

              // Find the last import statement
              let lastImportNode = null;
              for (const statement of node.body) {
                if (statement.type === 'ImportDeclaration') {
                  lastImportNode = statement;
                }
              }

              if (lastImportNode) {
                const insertPosition = lastImportNode.range![1];
                return fixer.insertTextAfterRange(
                  [insertPosition, insertPosition],
                  `\n\nconst DOMAIN_ID = '${suggestedDomain}';\n`
                );
              }

              // If no imports, insert at the beginning
              if (firstToken) {
                return fixer.insertTextBefore(
                  firstToken,
                  `const DOMAIN_ID = '${suggestedDomain}';\n\n`
                );
              }

              return null;
            },
          });
        }
      },
    };
  },
};

export = rule;
