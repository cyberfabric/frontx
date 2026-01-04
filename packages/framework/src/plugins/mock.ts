/**
 * Mock Plugin - Centralized mock mode control
 *
 * Framework Layer: L2
 *
 * Automatically registers mockSlice and initializes mock effects.
 * Apps don't need to manually call registerSlice(mockSlice) or initMockEffects().
 */

import type { HAI3Plugin } from '../types';
import { mockSlice } from '../slices/mockSlice';
import { initMockEffects, toggleMockMode } from '../effects/mockEffects';

// Store cleanup function per plugin instance
let cleanup: (() => void) | null = null;

/**
 * Detect if running in development environment.
 * Uses runtime heuristics since framework is pre-built.
 */
function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const { hostname } = window.location;
  // localhost, 127.0.0.1, or any .local domain
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.local');
}

/**
 * Mock plugin configuration
 */
export interface MockPluginConfig {
  /**
   * Enable mock mode by default.
   * When true, mock plugins are activated immediately on app init.
   * @default true (enabled in dev mode by default)
   */
  enabledByDefault?: boolean;
}

/**
 * Mock plugin factory.
 *
 * Provides centralized mock mode control for API services.
 * Automatically registers the mock slice and initializes mock effects.
 * In dev mode, mock mode is enabled by default.
 *
 * @param config - Optional plugin configuration
 * @returns Mock plugin
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(effects())
 *   .use(mock())  // Automatic mock mode support (enabled in dev)
 *   .build();
 *
 * // Toggle mock mode via actions
 * app.actions.toggleMockMode(true);
 * ```
 */
export function mock(config?: MockPluginConfig): HAI3Plugin {
  return {
    name: 'mock',
    dependencies: ['effects'],

    provides: {
      slices: [mockSlice],
      actions: {
        toggleMockMode,
      },
    },

    onInit() {
      // Initialize mock effects after store is ready
      cleanup = initMockEffects();

      // Determine if mock mode should be enabled by default
      // Auto-detect dev environment (localhost) unless explicitly configured
      const isDev = isDevEnvironment();
      const enabledByDefault = config?.enabledByDefault ?? isDev;

      if (enabledByDefault) {
        // Enable mock mode immediately after initialization
        toggleMockMode(true);

        if (isDev) {
          console.log('[HAI3] Mock mode enabled by default (dev environment detected)');
        }
      }
    },

    onDestroy() {
      // Cleanup event subscriptions
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  };
}
