/**
 * HAI3 ESLint Configuration (Monorepo Root)
 *
 * This file contains the complete ESLint rules for the HAI3 monorepo:
 * - Standalone rules from packages/cli/template-sources/project/configs/eslint.config.js
 * - Monorepo-specific package boundary rules
 * - SDK/Framework package exceptions (unknown type is required for generic code)
 *
 * For standalone projects, use packages/cli/template-sources/project/configs/eslint.config.js
 */

import standaloneConfig from './packages/cli/template-sources/project/configs/eslint.config.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Include all standalone configs
  ...standaloneConfig,

  // Additional monorepo ignores
  {
    ignores: [
      'packages/**/dist/**',
      'packages/**/templates/**', // CLI templates are build artifacts
      'packages/cli/template-sources/**', // CLI template sources (linted separately in standalone)
      'scripts/**', // Monorepo scripts
      '**/.vitepress/**',
      // Legacy config files (still used by dependency-cruiser)
      '.dependency-cruiser.cjs',
    ],
  },

  // SDK packages: Allow unknown/object types (required for generic event bus, store, etc.)
  // These packages use generics and need flexible typing for consumer code to augment
  // Also disable layer enforcement - library packages are allowed to import from lower layers
  {
    files: [
      'packages/state/**/*.ts',
      'packages/api/**/*.ts',
      'packages/i18n/**/*.ts',
      'packages/screensets/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-restricted-imports': 'off', // Library packages can import from lower layers
    },
  },

  // Framework package: Allow unknown/object types (wraps SDK with plugin architecture)
  // Also disable layer enforcement - framework imports from SDK packages
  // BUT keep Flux rules for effects files
  {
    files: ['packages/framework/**/*.ts'],
    ignores: ['**/effects.ts', '**/*Effects.ts', '**/effects/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-restricted-imports': 'off', // Framework imports from SDK (L1) packages
    },
  },

  // Framework effects: Keep Flux rules but disable layer enforcement
  {
    files: ['packages/framework/**/effects.ts', 'packages/framework/**/*Effects.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off', // Framework imports from SDK (L1) packages
      '@typescript-eslint/no-empty-object-type': 'off',
      // Keep no-restricted-syntax (enforced by frameworkConfig Flux rules)
    },
  },

  // Framework action files in effects directory: Allow event emission but disable layer enforcement
  {
    files: ['packages/framework/**/effects/**/*Actions.ts', 'packages/framework/**/effects/**/actions.ts'],
    rules: {
      'no-restricted-syntax': 'off', // Actions emit events as their primary purpose
      '@typescript-eslint/no-restricted-imports': 'off', // Framework imports from SDK (L1) packages
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  // React package: Allow unknown types for hook generics
  // Also disable layer enforcement - react imports from framework (L2) packages
  {
    files: ['packages/react/**/*.ts', 'packages/react/**/*.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-empty-object-type': 'off', // Allow empty EventPayloadMap for module augmentation
      '@typescript-eslint/no-restricted-imports': 'off', // React imports from Framework (L2) packages
    },
  },

  // CLI package: Allow unknown types for dynamic command handling
  // Also disable layer enforcement - CLI is a dev tool, not app code
  {
    files: ['packages/cli/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-restricted-imports': 'off', // CLI is a dev tool, not app code
    },
  },

  // Layout components: Allow unknown types for API registry type assertions
  {
    files: ['src/layout/**/*.tsx', 'src/layout/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // Keep flux/lodash rules but remove TSUnknownKeyword restriction
        {
          selector: "CallExpression[callee.name='dispatch'] > MemberExpression[object.name='store']",
          message: 'FLUX VIOLATION: Components must not call store.dispatch directly. Use actions instead.',
        },
      ],
    },
  },

  // Monorepo-specific: Package internals and @/ aliases
  {
    files: ['packages/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@hai3/*/src/**'],
              message:
                'MONOREPO VIOLATION: Import from package root, not internal paths.',
            },
            {
              group: ['@/*'],
              message:
                'PACKAGE VIOLATION: Use relative imports within packages. @/ aliases are only for app code (src/).',
            },
          ],
        },
      ],
    },
  },

  // App: Layer enforcement for src/app/** (must use @hai3/react, not L1/L2 packages)
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      // Use @typescript-eslint rule to catch TypeScript-specific imports (import type, side-effect imports)
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@hai3/framework', '@hai3/framework/*'],
              message:
                'LAYER VIOLATION: App-layer code must import from @hai3/react, not directly from @hai3/framework (Layer 2).',
            },
            {
              group: ['@hai3/state', '@hai3/state/*'],
              message:
                'LAYER VIOLATION: App-layer code must import from @hai3/react, not directly from @hai3/state (Layer 1).',
            },
            {
              group: ['@hai3/api', '@hai3/api/*'],
              message:
                'LAYER VIOLATION: App-layer code must import from @hai3/react, not directly from @hai3/api (Layer 1).',
            },
            {
              group: ['@hai3/i18n', '@hai3/i18n/*'],
              message:
                'LAYER VIOLATION: App-layer code must import from @hai3/react, not directly from @hai3/i18n (Layer 1).',
            },
            {
              group: ['@hai3/screensets', '@hai3/screensets/*'],
              message:
                'LAYER VIOLATION: App-layer code must import from @hai3/react, not directly from @hai3/screensets (Layer 1).',
            },
            // Redux term bans - use HAI3 state terms instead
            {
              group: ['react-redux'],
              importNames: ['useDispatch'],
              message:
                'REDUX VIOLATION: Do not use useDispatch from react-redux. Use useAppDispatch from @hai3/react instead.',
            },
            {
              group: ['react-redux'],
              importNames: ['useSelector'],
              message:
                'REDUX VIOLATION: Do not use useSelector from react-redux. Use useAppSelector from @hai3/react instead.',
            },
          ],
        },
      ],
    },
  },

  // App: Studio should only be imported via HAI3Provider (auto-detection)
  // Only App.tsx variants are allowed to import StudioOverlay directly
  {
    files: ['src/**/*'],
    ignores: [
      'src/app/App.tsx', // Monorepo demo app - renders StudioOverlay
      'src/app/App.no-uikit.tsx', // --uikit none variant - renders StudioOverlay
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@hai3/studio', '@hai3/studio/**'],
              message:
                'STUDIO VIOLATION: Studio should not be imported directly in app code. HAI3Provider auto-detects and loads Studio in development mode.',
            },
          ],
        },
      ],
    },
  },

  // Studio: Exclude from inline styles rule (dev-only package with intentional glassmorphic effects)
  {
    files: ['packages/studio/**/*.tsx'],
    rules: {
      'local/no-inline-styles': 'off',
    },
  },

  // Monorepo: uicore components must also follow flux rules (no direct slice dispatch)
  {
    files: [
      'packages/uicore/src/components/**/*.tsx',
      'packages/uicore/src/layout/domains/**/*.tsx',
    ],
    ignores: ['**/*.test.*', '**/*.spec.*'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='dispatch'] CallExpression[callee.name=/^set[A-Z]/]",
          message:
            'FLUX VIOLATION: Components cannot call slice reducers (setXxx functions). Use actions from /actions/ instead.',
        },
        {
          selector:
            "CallExpression[callee.name='dispatch'] CallExpression[callee.object.name][callee.property.name]",
          message:
            'FLUX VIOLATION: Do not dispatch slice actions directly. Use event-emitting actions instead. See EVENTS.md.',
        },
        {
          selector:
            "CallExpression[callee.object.name=/Store$/][callee.property.name!='getState']",
          message:
            'FLUX VIOLATION: Components cannot call custom store methods directly. Use Redux actions and useSelector.',
        },
      ],
    },
  },

  // App: Domain-based architecture rules for actions/effects
  {
    files: ['src/app/actions/**/*', 'src/app/effects/**/*'],
    rules: {
      'local/no-barrel-exports-events-effects': 'error',
    },
  },

  // App: Prevent coordinator effect anti-pattern in effects
  {
    files: ['src/app/effects/**/*'],
    rules: {
      'local/no-coordinator-effects': 'error',
    },
  },

  // App: Domain event format for events
  {
    files: ['src/app/events/**/*'],
    rules: {
      'local/domain-event-format': 'error',
    },
  },
];
