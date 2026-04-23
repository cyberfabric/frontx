/**
 * @fileoverview Disallow hardcoded user-visible strings in JSX — require t() for localization
 * @author HAI3 Team
 */

import type { Rule } from 'eslint';
import type { JSXAttribute, JSXText, Literal } from 'estree-jsx';

/**
 * JSX attribute names that carry user-visible text and must be localized.
 * Technical attributes (className, id, type, href, src, etc.) are intentionally excluded.
 */
const USER_TEXT_ATTRS = new Set([
  'title',
  'placeholder',
  'alt',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'label',
  'tooltip',
  'description',
  'caption',
  'heading',
  'helperText',
  'errorMessage',
]);

/**
 * Returns true if the string looks like human-readable user-visible text.
 * Excludes technical values: CSS classes, HTML attribute values, identifiers, numbers.
 */
function isHumanText(value: string): boolean {
  const trimmed = value.trim();

  // Skip empty or whitespace-only strings
  if (trimmed.length <= 1) return false;

  // Skip strings without any letters (punctuation, numbers, symbols)
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  // Skip pure numbers (e.g. "42", "3.14")
  if (/^\d+(\.\d+)?$/.test(trimmed)) return false;

  // Skip lowercase single-word strings — likely technical values:
  // type="button", name="email", target="_blank", role="dialog", etc.
  if (!/\s/.test(trimmed) && /^[a-z][a-zA-Z0-9-]*$/.test(trimmed)) return false;

  return true;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded user-visible strings in JSX — use t() for localization',
      category: 'i18n',
      recommended: true,
    },
    messages: {
      hardcodedText:
        'I18N VIOLATION: Hardcoded string "{{text}}" found in JSX. Use t(\'namespace:key\') from useTranslation() instead.',
      hardcodedAttr:
        'I18N VIOLATION: Hardcoded string in "{{attr}}" attribute. Use t(\'namespace:key\') from useTranslation() instead.',
    },
    schema: [],
  },

  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      // Detect hardcoded text between JSX tags: <div>Hello World</div>
      JSXText(node: JSXText) {
        if (isHumanText(node.value)) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: 'hardcodedText',
            data: { text: node.value.trim() },
          });
        }
      },

      // Detect hardcoded strings in user-visible JSX attributes: <input placeholder="Enter name">
      JSXAttribute(node: JSXAttribute) {
        const attrName =
          typeof node.name.name === 'string' ? node.name.name : node.name.name.name;

        if (!USER_TEXT_ATTRS.has(attrName)) return;

        const valueNode = node.value;
        if (!valueNode || valueNode.type !== 'Literal') return;

        const literal = valueNode as Literal;
        if (typeof literal.value !== 'string') return;

        if (isHumanText(literal.value)) {
          context.report({
            node: node as unknown as Rule.Node,
            messageId: 'hardcodedAttr',
            data: { attr: attrName },
          });
        }
      },
    };
  },
};

export = rule;
