/**
 * @fileoverview Disallow inline styles and hex colors outside base UI component folders
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { JSXAttribute, Literal } from 'estree-jsx';

/**
 * Check if file is in components/ui/ (allowed to use inline styles)
 */
function isInComponentsUiFolder(filename: string): boolean {
  return /[/\\]components[/\\]ui[/\\]/.test(filename);
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow inline styles and hex colors outside base UI component folders',
      category: 'Styling',
      recommended: true,
    },
    messages: {
      noInlineStyle:
        'Inline style={{}} is forbidden. Use Tailwind classes instead (e.g., className="p-4 bg-background").',
      noHexColor:
        'Hex color "{{color}}" is forbidden. Use CSS variable like "hsl(var(--primary))" or Tailwind class.',
    },
    schema: [],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    const filename = context.getFilename();

    if (isInComponentsUiFolder(filename)) {
      return {};
    }

    return {
      // Detect style={{}} JSX attributes
      'JSXAttribute[name.name="style"][value.type="JSXExpressionContainer"]'(
        node: JSXAttribute
      ) {
        context.report({
          node: node as unknown as Rule.Node,
          messageId: 'noInlineStyle',
        });
      },

      // Detect hex color literals
      Literal(node: Literal) {
        if (
          typeof node.value === 'string' &&
          /^#[0-9a-fA-F]{3,8}$/.test(node.value)
        ) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: 'noHexColor',
            data: { color: node.value },
          });
        }
      },
    };
  },
};

export = rule;
