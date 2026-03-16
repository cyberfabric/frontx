/**
 * @fileoverview Validate event enum values use ${SCREENSET_ID}/${DOMAIN_ID}/eventName pattern
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { TemplateLiteral, Literal, Identifier } from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate event enum values use ${SCREENSET_ID}/${DOMAIN_ID}/eventName pattern',
      category: 'Screenset Architecture',
      recommended: true,
    },
    messages: {
      invalidEventFormat:
        'Event enum value must use template literal with domain pattern. ' +
        'Expected: `${SCREENSET_ID}/${DOMAIN_ID}/{{eventName}}` ' +
        'This ensures events are properly namespaced and auto-update when IDs change.',
      missingDomainInPattern:
        'Event enum value is missing domain component. ' +
        'Use: `${SCREENSET_ID}/${DOMAIN_ID}/{{eventName}}` (not `${SCREENSET_ID}/{{eventName}}`). ' +
        'Domain-based architecture requires the domain segment for proper organization.',
    },
    schema: [],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.getFilename();

    // Only check files in events/ folder
    const isInEventsFolder = filename.includes('/events/') || filename.includes('\\events\\');
    if (!isInEventsFolder) {
      return {};
    }

    // Skip index.ts files
    if (filename.endsWith('/index.ts') || filename.endsWith('\\index.ts')) {
      return {};
    }

    return {
      'TSEnumMember > TemplateLiteral'(node: TemplateLiteral) {
        // Get the template literal parts
        const quasis = node.quasis;
        const expressions = node.expressions;

        if (quasis.length === 0) {
          return;
        }

        // Build the pattern string
        let pattern = '';
        for (let i = 0; i < quasis.length; i++) {
          pattern += quasis[i].value.raw;
          if (i < expressions.length) {
            const expr = expressions[i];
            if (expr.type === 'Identifier') {
              pattern += `\${${(expr as Identifier).name}}`;
            }
          }
        }

        // Check if pattern follows domain format
        // Should be: ${SCREENSET_ID}/${DOMAIN_ID}/eventName
        const hasDomainPattern = /\$\{.*?\}\/\$\{.*?\}\/.+/.test(pattern);
        const hasFlatPattern = /\$\{.*?\}\/.+/.test(pattern) && !hasDomainPattern;

        // Extract event name for error message
        const eventNameMatch = pattern.match(/\/([a-zA-Z]+)$/);
        const eventName = eventNameMatch ? eventNameMatch[1] : 'eventName';

        if (hasFlatPattern) {
          context.report({
            node,
            messageId: 'missingDomainInPattern',
            data: { eventName },
          });
        } else if (!hasDomainPattern) {
          context.report({
            node,
            messageId: 'invalidEventFormat',
            data: { eventName },
          });
        }
      },

      // Also check for hardcoded string event values (anti-pattern)
      // Note: TypeScript AST nodes aren't fully typed in estree
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-useless-escape
      'TSEnumMember > Literal[value=/\//]'(node: Literal) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enumMember = (node as any).parent;
        context.report({
          node: enumMember,
          messageId: 'invalidEventFormat',
          data: { eventName: 'eventName' },
        });
      },
    };
  },
};

export = rule;
