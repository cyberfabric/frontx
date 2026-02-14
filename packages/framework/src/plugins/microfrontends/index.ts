/**
 * Microfrontends Plugin
 *
 * Enables MFE capabilities in HAI3 applications.
 * This plugin accepts NO configuration parameters.
 * All MFE registration happens dynamically at runtime.
 *
 * @packageDocumentation
 */

import { screensetsRegistryFactory } from '@hai3/screensets';
import { gtsPlugin } from '@hai3/screensets/plugins/gts';
import type { HAI3Plugin } from '../../types';
import { mfeSlice } from './slice';
import { initMfeEffects } from './effects';
import { initMfeNavigation } from './navigation';
import {
  loadExtension,
  mountExtension,
  unmountExtension,
  registerExtension,
  unregisterExtension,
  setMfeRegistry,
} from './actions';

/**
 * Microfrontends plugin factory.
 *
 * Enables MFE capabilities in HAI3 applications with NO static configuration.
 * All MFE registration (domains, extensions, entries) happens dynamically at
 * runtime via actions or direct API calls.
 *
 * **Key Principles:**
 * - NO configuration parameters - plugin accepts nothing
 * - NO static domain registration - domains are registered at runtime
 * - Builds screensetsRegistry with GTS plugin at plugin initialization
 * - Same TypeSystemPlugin instance is propagated throughout
 * - Integrates MFE lifecycle with Flux data flow (actions, effects, slice)
 *
 * @throws Error if any configuration is passed
 *
 * @example
 * ```typescript
 * import { createHAI3, microfrontends } from '@hai3/framework';
 *
 * const app = createHAI3()
 *   .use(microfrontends())  // No config - just enables MFE capabilities
 *   .build();
 *
 * // Register domains dynamically at runtime:
 * app.screensetsRegistry.registerDomain(sidebarDomain, containerProvider);
 *
 * // Use MFE actions:
 * app.actions.loadExtension('my.extension.v1');
 * app.actions.mountExtension('my.extension.v1');
 * ```
 */
export function microfrontends(): HAI3Plugin {
  // Validate no config was passed
  // Function signature accepts no parameters, but TypeScript can't prevent
  // runtime calls like microfrontends({ anything: true })
  if (arguments.length > 0) {
    throw new Error(
      'microfrontends() plugin accepts NO configuration parameters. ' +
      'All MFE registration happens dynamically at runtime. ' +
      'Remove any configuration and call microfrontends() with no arguments.'
    );
  }

  // Build the ScreensetsRegistry instance with GTS plugin
  // This registry handles all MFE lifecycle: domains, extensions, actions, etc.
  // TypeSystemPlugin binding happens here at application wiring level.
  const screensetsRegistry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });

  // Store cleanup functions in closure (encapsulated per plugin instance)
  let effectsCleanup: (() => void) | null = null;
  let navigationCleanup: (() => void) | null = null;

  return {
    name: 'microfrontends',
    dependencies: ['screensets'], // Requires screensets to be initialized

    provides: {
      registries: {
        // Expose the MFE-enabled ScreensetsRegistry
        // This registry has registerDomain(), registerExtension(), etc.
        screensetsRegistry,
      },
      slices: [mfeSlice],
      // NOTE: Effects are NOT initialized via provides.effects.
      // They are initialized in onInit to capture cleanup references.
      // The framework calls provides.effects at build step 5, then onInit at step 7.
      // We only initialize effects in onInit to avoid duplicate event listeners.
      actions: {
        loadExtension,
        mountExtension,
        unmountExtension,
        registerExtension,
        unregisterExtension,
      },
    },

    onInit(app): void {
      // Wire the registry reference into actions module
      setMfeRegistry(screensetsRegistry);

      // Initialize effects and store cleanup references
      effectsCleanup = initMfeEffects(screensetsRegistry);
      navigationCleanup = initMfeNavigation();

      // Update debug mode based on app config
      if (app.config.devMode) {
        console.log('[microfrontends] Plugin initialized');
        console.log('[microfrontends] TypeSystemPlugin:', screensetsRegistry.typeSystem.name, screensetsRegistry.typeSystem.version);
        console.log('[microfrontends] Base domains are NOT pre-registered');
        console.log('[microfrontends] Register domains at runtime via app.screensetsRegistry.registerDomain()');
        console.log('[microfrontends] MFE actions available: loadExtension, mountExtension, unmountExtension');
      }

      // Plugin is now ready
      // Base domains are NOT registered here - they are registered dynamically
      // at runtime via app.screensetsRegistry.registerDomain() or actions
    },

    onDestroy(): void {
      // Cleanup event subscriptions
      if (effectsCleanup) {
        effectsCleanup();
        effectsCleanup = null;
      }
      if (navigationCleanup) {
        navigationCleanup();
        navigationCleanup = null;
      }
    },
  };
}

// Re-export MFE actions for direct usage
export {
  loadExtension,
  mountExtension,
  unmountExtension,
  registerExtension,
  unregisterExtension,
  type RegisterExtensionPayload,
  type UnregisterExtensionPayload,
} from './actions';

// Re-export MFE slice and selectors
export {
  mfeSlice,
  mfeActions,
  selectExtensionState,
  selectRegisteredExtensions,
  selectExtensionError,
  type MfeState,
  type ExtensionRegistrationState,
} from './slice';

// Re-export navigation integration
export {
  initMfeNavigation,
  getCurrentScreenExtension,
  NavigationEvents,
  type NavigateToScreenPayload as MfeNavigateToScreenPayload,
  type ScreenChangedPayload as MfeScreenChangedPayload,
} from './navigation';

// Re-export HAI3 layout domain constants and MfeEvents
export {
  HAI3_POPUP_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_SCREEN_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
  MfeEvents,
} from './constants';
