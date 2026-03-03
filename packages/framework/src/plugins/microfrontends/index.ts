/**
 * Microfrontends Plugin
 *
 * Enables MFE capabilities in HAI3 applications.
 * This plugin accepts NO configuration parameters.
 * All MFE registration happens dynamically at runtime.
 *
 * @packageDocumentation
 */

import {
  screensetsRegistryFactory,
  type MfeHandler,
  HAI3_SHARED_PROPERTY_THEME,
  HAI3_SHARED_PROPERTY_LANGUAGE,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from '@hai3/screensets';
import { gtsPlugin } from '@hai3/screensets/plugins/gts';
import { getStore, eventBus } from '@hai3/state';
import type { HAI3Plugin } from '../../types';
import { mfeSlice, setExtensionMounted, setExtensionUnmounted } from './slice';
import { initMfeEffects } from './effects';
import {
  loadExtension,
  mountExtension,
  unmountExtension,
  registerExtension,
  unregisterExtension,
  setMfeRegistry,
} from './actions';
import {
  HAI3_SCREEN_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_POPUP_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
} from './constants';

/**
 * Configuration for the microfrontends plugin.
 */
export interface MicrofrontendsConfig {
  /**
   * Optional MFE handlers to register with the screensets registry.
   * Handlers enable loading of specific MFE entry types (e.g., MfeEntryMF).
   *
   * If not provided, no handlers are registered. Applications must register
   * handlers manually via screensetsRegistry API.
   */
  mfeHandlers?: MfeHandler[];
}

/**
 * Microfrontends plugin factory.
 *
 * Enables MFE capabilities in HAI3 applications. Optionally accepts MFE handlers
 * for registration at plugin initialization.
 *
 * **Key Principles:**
 * - Optional mfeHandlers config for handler registration
 * - NO static domain registration - domains are registered at runtime
 * - Builds screensetsRegistry with GTS plugin at plugin initialization
 * - Same TypeSystemPlugin instance is propagated throughout
 * - Integrates MFE lifecycle with Flux data flow (actions, effects, slice)
 *
 * @param config - Optional configuration with mfeHandlers array
 *
 * @example
 * ```typescript
 * import { createHAI3, microfrontends } from '@hai3/framework';
 * import { MfeHandlerMF } from '@hai3/screensets/mfe/handler';
 * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
 *
 * const app = createHAI3()
 *   .use(microfrontends({ mfeHandlers: [new MfeHandlerMF(gtsPlugin)] }))
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
export function microfrontends(config: MicrofrontendsConfig = {}): HAI3Plugin {
  // Build the ScreensetsRegistry instance with GTS plugin and optional handlers
  // This registry handles all MFE lifecycle: domains, extensions, actions, etc.
  // TypeSystemPlugin binding happens here at application wiring level.
  const screensetsRegistry = screensetsRegistryFactory.build({
    typeSystem: gtsPlugin,
    mfeHandlers: config.mfeHandlers,
  });

  // Wrap executeActionsChain to intercept mount/unmount completions for store dispatch
  const originalExecuteActionsChain = screensetsRegistry.executeActionsChain.bind(screensetsRegistry);
  screensetsRegistry.executeActionsChain = async (chain) => {
    await originalExecuteActionsChain(chain);
    // After successful execution, dispatch store updates for mount/unmount
    const actionType = chain.action?.type;
    if (actionType === HAI3_ACTION_MOUNT_EXT) {
      const store = getStore();
      const domainId = chain.action!.target;
      const extensionId = chain.action!.payload?.extensionId as string;
      if (domainId && extensionId) {
        store.dispatch(setExtensionMounted({ domainId, extensionId }));
      }
    } else if (actionType === HAI3_ACTION_UNMOUNT_EXT) {
      const store = getStore();
      const domainId = chain.action!.target;
      if (domainId) {
        store.dispatch(setExtensionUnmounted({ domainId }));
      }
    }
  };

  // Store cleanup functions in closure (encapsulated per plugin instance)
  let effectsCleanup: (() => void) | null = null;
  let propagationCleanup: (() => void) | null = null;

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

    onInit(): void {
      // Wire the registry reference into actions module
      setMfeRegistry(screensetsRegistry);

      // Initialize effects and store cleanup references
      effectsCleanup = initMfeEffects(screensetsRegistry);

      // Set up theme propagation
      const themeUnsub = eventBus.on('theme/changed', (payload) => {
        for (const domainId of [HAI3_SCREEN_DOMAIN, HAI3_SIDEBAR_DOMAIN, HAI3_POPUP_DOMAIN, HAI3_OVERLAY_DOMAIN]) {
          try {
            screensetsRegistry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, payload.themeId);
          } catch {
            // Domain may not be registered yet -- skip silently
          }
        }
      });

      // Set up language propagation
      const langUnsub = eventBus.on('i18n/language/changed', (payload) => {
        for (const domainId of [HAI3_SCREEN_DOMAIN, HAI3_SIDEBAR_DOMAIN, HAI3_POPUP_DOMAIN, HAI3_OVERLAY_DOMAIN]) {
          try {
            screensetsRegistry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_LANGUAGE, payload.language);
          } catch {
            // Domain may not be registered yet -- skip silently
          }
        }
      });

      // Compose propagation cleanup
      propagationCleanup = () => {
        themeUnsub.unsubscribe();
        langUnsub.unsubscribe();
      };

      // Plugin is now initialized
      // TypeSystemPlugin: bound to screensetsRegistry
      // MFE handlers: registered via config.mfeHandlers
      // Base domains: NOT pre-registered - registered dynamically at runtime
      // MFE actions: loadExtension, mountExtension, unmountExtension available

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
      if (propagationCleanup) {
        propagationCleanup();
        propagationCleanup = null;
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
  selectMountedExtension,
  setExtensionMounted,
  setExtensionUnmounted,
  type MfeState,
  type ExtensionRegistrationState,
} from './slice';

// Re-export HAI3 layout domain constants and MfeEvents
export {
  HAI3_POPUP_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_SCREEN_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
  MfeEvents,
} from './constants';

// Re-export base ExtensionDomain constants
export {
  screenDomain,
  sidebarDomain,
  popupDomain,
  overlayDomain,
} from './base-domains';
