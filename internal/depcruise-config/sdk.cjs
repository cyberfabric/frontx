/**
 * HAI3 Dependency Cruiser SDK Configuration (L1)
 * Rules for SDK packages: @hai3/state, @hai3/layout, @hai3/api, @hai3/i18n
 *
 * SDK packages MUST have:
 * - ZERO @hai3/* dependencies (complete isolation)
 * - NO React dependencies (framework-agnostic)
 */

const base = require('./base.cjs');

module.exports = {
  forbidden: [
    ...base.forbidden,

    // ============ SDK ISOLATION RULES ============
    {
      name: 'sdk-no-hai3-imports',
      severity: 'error',
      from: { path: '^packages/(state|screensets|api|i18n)/src' },
      to: { path: 'node_modules/@hai3/' },
      comment: 'SDK VIOLATION: SDK packages must have ZERO @hai3 dependencies. Each SDK package is completely isolated.',
    },
    {
      name: 'sdk-no-react',
      severity: 'error',
      from: { path: '^packages/(state|screensets|api|i18n)/src' },
      to: { path: 'node_modules/react' },
      comment: 'SDK VIOLATION: SDK packages cannot import React. SDK packages must be framework-agnostic.',
    },
  ],
  options: base.options,
};
