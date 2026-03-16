/**
 * HAI3 ESLint React Configuration (L3)
 * Rules for @hai3/react package
 *
 * React package CAN import:
 * - @hai3/framework (wires everything together)
 * - @hai3/uikit (standalone UI components)
 * - @hai3/i18n (only for Language enum re-export due to isolatedModules)
 * - react, react-dom (React adapter)
 *
 * React package CANNOT import:
 * - @hai3/state, @hai3/screensets, @hai3/api (use framework re-exports)
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
              group: ['@hai3/state', '@hai3/state/*'],
              message: 'REACT VIOLATION: Import from @hai3/framework instead. React package uses framework re-exports.',
            },
            {
              group: ['@hai3/screensets', '@hai3/screensets/*'],
              message: 'REACT VIOLATION: Import from @hai3/framework instead. React package uses framework re-exports.',
            },
            {
              group: ['@hai3/api', '@hai3/api/*'],
              message: 'REACT VIOLATION: Import from @hai3/framework instead. React package uses framework re-exports.',
            },
          ],
        },
      ],
    },
  },
];
