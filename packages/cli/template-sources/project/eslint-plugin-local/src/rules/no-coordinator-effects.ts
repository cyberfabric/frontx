/**
 * @fileoverview Prevent coordinator effects files (chatEffects.ts, demoEffects.ts)
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { Program } from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent coordinator effects files that initialize all domain effects',
      category: 'Screenset Architecture',
      recommended: true,
    },
    messages: {
      noCoordinatorEffects:
        'Coordinator effects files are forbidden ({{filename}}). ' +
        'Each slice must register its own effects callback. ' +
        'Split effects into domain-specific files (threadsEffects.ts, messagesEffects.ts, etc.) ' +
        'and register them individually in each registerSlice() call.',
    },
    schema: [],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.getFilename();

    // Check if file matches coordinator pattern: screensetNameEffects.ts at screenset root
    // Examples: chatEffects.ts, demoEffects.ts, dashboardEffects.ts
    const parts = filename.split('/');
    const basename = parts[parts.length - 1];

    // Check if we're in a screenset directory
    const isInScreensets = filename.includes('/screensets/') || filename.includes('\\screensets\\');
    if (!isInScreensets) {
      return {};
    }

    // Check if this is a coordinator pattern: <screensetName>Effects.ts in screenset root
    const isCoordinatorPattern = /^[a-z]+Effects\.ts$/.test(basename);

    // Make sure it's not in effects/ subdirectory (those are domain-specific, which is good)
    const isInEffectsFolder = filename.includes('/effects/') || filename.includes('\\effects\\');

    if (isCoordinatorPattern && !isInEffectsFolder) {
      return {
        Program(node: Program) {
          context.report({
            node,
            messageId: 'noCoordinatorEffects',
            data: { filename: basename },
          });
        },
      };
    }

    return {};
  },
};

export = rule;
