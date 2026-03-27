/**
 * FrontX ESLint React Configuration (L3)
 * Rules for @cyberfabric/react package
 *
 * React package CAN import:
 * - @cyberfabric/framework (wires everything together)
 * - @cyberfabric/i18n (only for Language enum re-export due to isolatedModules)
 * - react, react-dom (React adapter)
 *
 * React package CANNOT import:
 * - @cyberfabric/state, @cyberfabric/screensets, @cyberfabric/api (use framework re-exports)
 */

import type { ConfigArray } from 'typescript-eslint';
import { baseConfig } from './base';
import reactHooks from 'eslint-plugin-react-hooks';

export const reactConfig: ConfigArray = [
  ...baseConfig,

  // React hooks rules
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // React package-specific restrictions
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@cyberfabric/state', '@cyberfabric/state/*'],
              message: 'REACT VIOLATION: Import from @cyberfabric/framework instead. React package uses framework re-exports.',
            },
            {
              group: ['@cyberfabric/screensets', '@cyberfabric/screensets/*'],
              message: 'REACT VIOLATION: Import from @cyberfabric/framework instead. React package uses framework re-exports.',
            },
            {
              group: ['@cyberfabric/api', '@cyberfabric/api/*'],
              message: 'REACT VIOLATION: Import from @cyberfabric/framework instead. React package uses framework re-exports.',
            },
          ],
        },
      ],
    },
  },
];
