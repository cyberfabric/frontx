/**
 * FrontX Dependency Cruiser React Configuration (L3)
 * Rules for @cyberfabric/react package
 *
 * React package CAN import:
 * - @cyberfabric/framework (wires everything together)
 * - react, react-dom (React adapter)
 *
 * React package CANNOT import:
 * - @cyberfabric/state, @cyberfabric/screensets, @cyberfabric/api, @cyberfabric/i18n (use framework re-exports)
 * - @cyberfabric/uicore (deprecated)
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
      to: { path: 'node_modules/@cyberfabric/(state|screensets|api|i18n)' },
      comment: 'REACT VIOLATION: React package imports SDK via @cyberfabric/framework, not directly. Use framework re-exports.',
    },
    {
      name: 'react-no-uicore',
      severity: 'error',
      from: { path: '^packages/react/src' },
      to: { path: 'node_modules/@cyberfabric/uicore' },
      comment: 'REACT VIOLATION: @cyberfabric/uicore is deprecated. Use @cyberfabric/framework and @cyberfabric/react.',
    },
  ],
  options: base.options,
};
