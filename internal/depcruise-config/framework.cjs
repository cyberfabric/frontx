/**
 * FrontX Dependency Cruiser Framework Configuration (L2)
 * Rules for @cyberfabric/framework package
 *
 * Framework package CAN import:
 * - @cyberfabric/state, @cyberfabric/layout, @cyberfabric/api, @cyberfabric/i18n (SDK packages)
 *
 * Framework package CANNOT import:
 * - @cyberfabric/react (would create circular dependency)
 * - @cyberfabric/uicore (deprecated)
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
      to: { path: 'node_modules/@cyberfabric/(react|uicore)' },
      comment: 'FRAMEWORK VIOLATION: Framework can only import SDK packages (@cyberfabric/state, layout, api, i18n).',
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
