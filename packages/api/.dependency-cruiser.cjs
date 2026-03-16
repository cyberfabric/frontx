/**
 * @hai3/api Dependency Cruiser Configuration
 * Extends SDK layer config - enforces zero @hai3 dependencies and no React
 */

const sdkConfig = require('@hai3/depcruise-config/sdk.cjs');

module.exports = {
  forbidden: sdkConfig.forbidden,
  options: {
    ...sdkConfig.options,
    // Only analyze this package's source
    doNotFollow: {
      path: 'node_modules',
    },
  },
};
