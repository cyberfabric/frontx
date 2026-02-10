/**
 * Microfrontends Plugin
 *
 * Enables MFE capabilities in HAI3 applications.
 * This plugin accepts NO configuration parameters.
 * All MFE registration happens dynamically at runtime.
 *
 * @packageDocumentation
 */

import { createGtsPlugin } from '@hai3/screensets/plugins/gts';
import { createScreensetsRegistry } from '@hai3/screensets';
import type { HAI3Plugin } from '../../types';
import { mfeSlice } from './slice';
import { initMfeEffects } from './effects';
import { initMfeNavigation } from './navigation';
import {
  loadExtension,
  preloadExtension,
  mountExtension,
  unmountExtension,
  handleMfeHostAction,
  registerExtension,
  unregisterExtension,
  registerDomain,
  unregisterDomain,
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
 * - Creates GTS plugin and ScreensetsRegistry during plugin initialization
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
 * const sidebarDomain = createSidebarDomain();
 * app.screensetsRegistry.registerDomain(sidebarDomain);
 *
 * // Use MFE actions:
 * app.actions.loadExtension('my.extension.v1');
 * app.actions.mountExtension('my.extension.v1', containerElement);
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

  // Create GTS plugin instance - this will be shared across all MFE operations
  // The same plugin instance ensures consistent type validation throughout
  const gtsPlugin = createGtsPlugin();

  // Create ScreensetsRegistry with the GTS plugin
  // This registry handles all MFE lifecycle: domains, extensions, actions, etc.
  const screensetsRegistry = createScreensetsRegistry({
    typeSystem: gtsPlugin,
    debug: false, // Will be set based on app.config.devMode in onInit
  });

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
        preloadExtension,
        mountExtension,
        unmountExtension,
        handleMfeHostAction,
        registerExtension,
        unregisterExtension,
        registerDomain,
        unregisterDomain,
      },
    },

    onInit(app): void {
      // Initialize effects and store cleanup references
      effectsCleanup = initMfeEffects(screensetsRegistry);
      navigationCleanup = initMfeNavigation();

      // Update debug mode based on app config
      if (app.config.devMode) {
        console.log('[microfrontends] Plugin initialized');
        console.log('[microfrontends] TypeSystemPlugin:', gtsPlugin.name, gtsPlugin.version);
        console.log('[microfrontends] Base domains are NOT pre-registered');
        console.log('[microfrontends] Register domains at runtime via app.screensetsRegistry.registerDomain()');
        console.log('[microfrontends] MFE actions available: loadExtension, preloadExtension, mountExtension, unmountExtension, handleMfeHostAction');
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

// Re-export base domain factories for convenience
export {
  createSidebarDomain,
  createPopupDomain,
  createScreenDomain,
  createOverlayDomain,
} from './base-domains';

// Re-export MFE actions for direct usage
export {
  loadExtension,
  preloadExtension,
  mountExtension,
  unmountExtension,
  handleMfeHostAction,
  registerExtension,
  unregisterExtension,
  registerDomain,
  unregisterDomain,
  MfeEvents,
  type LoadExtensionPayload,
  type PreloadExtensionPayload,
  type MountExtensionPayload,
  type UnmountExtensionPayload,
  type HostActionPayload,
  type RegisterExtensionPayload,
  type UnregisterExtensionPayload,
  type RegisterDomainPayload,
  type UnregisterDomainPayload,
} from './actions';

// Re-export MFE slice and selectors
export {
  mfeSlice,
  mfeActions,
  selectMfeLoadState,
  selectMfeMountState,
  selectMfeError,
  selectAllExtensionStates,
  selectExtensionState,
  selectRegisteredExtensions,
  type MfeState,
  type MfeLoadState,
  type MfeMountState,
  type ExtensionMfeState,
  type ExtensionRegistrationState,
} from './slice';

// Re-export MFE components
export {
  MfeErrorBoundary,
  MfeLoadingIndicator,
  ShadowDomContainer,
  type MfeErrorBoundaryConfig,
  type MfeLoadingIndicatorConfig,
  type ShadowDomContainerConfig,
} from './components';

// Re-export navigation integration
export {
  initMfeNavigation,
  getCurrentScreenExtension,
  NavigationEvents,
  type NavigateToScreenPayload as MfeNavigateToScreenPayload,
  type ScreenChangedPayload as MfeScreenChangedPayload,
} from './navigation';

// Re-export HAI3 layout domain constants
export {
  HAI3_POPUP_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_SCREEN_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
} from './constants';
