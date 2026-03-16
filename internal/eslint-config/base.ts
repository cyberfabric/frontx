/**
 * HAI3 ESLint Base Configuration (L0)
 * Universal rules that apply to ALL HAI3 code
 *
 * This is the foundation layer - all other configs extend this.
 */

import js from '@eslint/js';
import tseslint, { type ConfigArray } from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

const baseConfig: ConfigArray = [
  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.*',
      '**/*.cjs',
    ],
  },

  // Base JS config
  js.configs.recommended,

  // TypeScript config
  ...tseslint.configs.recommended,

  // Main configuration for all TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Unused detection
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Type safety
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      // Ban loose types that provide no type safety
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            object: {
              message: 'The `object` type is too loose. Use a specific interface, Record<string, T>, or the actual base class.',
            },
            Object: {
              message: 'The `Object` type is too loose. Use a specific interface or Record<string, T>.',
              fixWith: 'Record<string, unknown>',
            },
            '{}': {
              message: 'The `{}` type means "any non-nullish value". Use `Record<string, never>` for empty object or a specific interface.',
            },
          },
        },
      ],

      // Code quality
      'prefer-const': 'error',
      'no-console': 'off',
      'no-var': 'error',
      'no-empty-pattern': 'error',
    },
  },
];

export { baseConfig };
