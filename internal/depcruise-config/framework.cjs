/**
 * HAI3 Dependency Cruiser Framework Configuration (L2)
 * Rules for @hai3/framework package
 *
 * Framework package CAN import:
 * - @hai3/state, @hai3/layout, @hai3/api, @hai3/i18n (SDK packages)
 *
 * Framework package CANNOT import:
 * - @hai3/react (would create circular dependency)
 * - @hai3/uikit, @hai3/uikit-contracts (UI layer)
 * - @hai3/uicore (deprecated)
 * - react, react-dom (framework is headless)
 */

const base = require('./base.cjs');

module.exports = {
  forbidden: [
    ...base.forbidden,

    // ============ FRAMEWORK LAYER RULES ============
    {
      name: 'framework-only-sdk-deps',
      severity: 'error',
      from: { path: '^packages/framework/src' },
      to: { path: 'node_modules/@hai3/(react|uikit|uikit-contracts|uicore)' },
      comment: 'FRAMEWORK VIOLATION: Framework can only import SDK packages (@hai3/state, layout, api, i18n).',
    },
    {
      name: 'framework-no-react',
      severity: 'error',
      from: { path: '^packages/framework/src' },
      to: { path: 'node_modules/react' },
      comment: 'FRAMEWORK VIOLATION: Framework cannot import React. Framework is headless.',
    },
  ],
  options: base.options,
};
