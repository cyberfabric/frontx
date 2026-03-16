/**
 * HAI3 Dependency Cruiser React Configuration (L3)
 * Rules for @hai3/react package
 *
 * React package CAN import:
 * - @hai3/framework (wires everything together)
 * - react, react-dom (React adapter)
 *
 * React package CANNOT import:
 * - @hai3/state, @hai3/screensets, @hai3/api, @hai3/i18n (use framework re-exports)
 * - @hai3/uikit-contracts (deprecated)
 * - @hai3/uicore (deprecated)
 */

const base = require('./base.cjs');

module.exports = {
  forbidden: [
    ...base.forbidden,

    // ============ REACT LAYER RULES ============
    {
      name: 'react-only-framework-dep',
      severity: 'error',
      from: { path: '^packages/react/src' },
      to: { path: 'node_modules/@hai3/(state|screensets|api|i18n)' },
      comment: 'REACT VIOLATION: React package imports SDK via @hai3/framework, not directly. Use framework re-exports.',
    },
    {
      name: 'react-no-uikit-contracts',
      severity: 'error',
      from: { path: '^packages/react/src' },
      to: { path: 'node_modules/@hai3/uikit-contracts' },
      comment: 'REACT VIOLATION: @hai3/uikit-contracts is deprecated.',
    },
    {
      name: 'react-no-uicore',
      severity: 'error',
      from: { path: '^packages/react/src' },
      to: { path: 'node_modules/@hai3/uicore' },
      comment: 'REACT VIOLATION: @hai3/uicore is deprecated. Use @hai3/framework and @hai3/react.',
    },
  ],
  options: base.options,
};
