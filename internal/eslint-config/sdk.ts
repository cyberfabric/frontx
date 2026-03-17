/**
 * FrontX ESLint SDK Configuration (L1)
 * Rules for SDK packages: @cyberfabric/state, @cyberfabric/layout, @cyberfabric/api, @cyberfabric/i18n
 *
 * SDK packages MUST have:
 * - ZERO @cyberfabric/* dependencies (complete isolation)
 * - NO React dependencies (framework-agnostic)
 */

import type { ConfigArray } from 'typescript-eslint';
import { baseConfig } from './base';

export const sdkConfig: ConfigArray = [
  ...baseConfig,

  // SDK-specific restrictions
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cyberfabric/*'],
              message: 'SDK VIOLATION: SDK packages cannot import other @cyberfabric packages. SDK packages must have ZERO @cyberfabric dependencies.',
            },
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'SDK VIOLATION: SDK packages cannot import React. SDK packages must be framework-agnostic.',
            },
          ],
        },
      ],
    },
  },
];
