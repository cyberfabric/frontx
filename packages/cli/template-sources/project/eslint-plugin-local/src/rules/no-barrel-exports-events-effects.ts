/**
 * @fileoverview Prevent barrel exports (index.ts) in events/ or effects/ folders
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { Program } from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent barrel exports (index.ts) in events/ or effects/ folders',
      category: 'Screenset Architecture',
      recommended: true,
    },
    messages: {
      noBarrelExports:
        'Barrel exports (index.ts) are forbidden in {{folder}} folders. ' +
        'Import directly from domain-specific files (e.g., threadsEvents.ts, messagesEvents.ts). ' +
        'This enforces explicit dependencies and prevents circular imports.',
    },
    schema: [],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.getFilename();

    // Check if file is index.ts in events/ or effects/ folder
    const isIndexFile = filename.endsWith('/index.ts') || filename.endsWith('\\index.ts');
    if (!isIndexFile) {
      return {};
    }

    const isInEventsFolder = filename.includes('/events/') || filename.includes('\\events\\');
    const isInEffectsFolder = filename.includes('/effects/') || filename.includes('\\effects\\');

    if (!isInEventsFolder && !isInEffectsFolder) {
      return {};
    }

    const folder = isInEventsFolder ? 'events' : 'effects';

    return {
      Program(node: Program) {
        context.report({
          node,
          messageId: 'noBarrelExports',
          data: { folder },
        });
      },
    };
  },
};

export = rule;
