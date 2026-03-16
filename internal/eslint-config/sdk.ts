/**
 * HAI3 ESLint SDK Configuration (L1)
 * Rules for SDK packages: @hai3/state, @hai3/layout, @hai3/api, @hai3/i18n
 *
 * SDK packages MUST have:
 * - ZERO @hai3/* dependencies (complete isolation)
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
              group: ['@hai3/*'],
              message: 'SDK VIOLATION: SDK packages cannot import other @hai3 packages. SDK packages must have ZERO @hai3 dependencies.',
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
