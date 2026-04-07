/**
 * Microfrontends Plugin
 *
 * Enables MFE capabilities in FrontX applications.
 * This plugin accepts NO configuration parameters.
 * All MFE registration happens dynamically at runtime.
 *
 * @packageDocumentation
 */

// @cpt-flow:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1
// @cpt-flow:cpt-frontx-flow-framework-composition-shared-property-broadcast:p1
// @cpt-algo:cpt-frontx-algo-framework-composition-gts-validation:p1
// @cpt-state:cpt-frontx-state-framework-composition-mfe-mount:p1
// @cpt-dod:cpt-frontx-dod-framework-composition-mfe-plugin:p1
// @cpt-dod:cpt-frontx-dod-framework-composition-shared-property:p1

import {
  screensetsRegistryFactory,
  type ActionsChain,
  type MfeHandler,
  type TypeSystemPlugin,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from '@cyberfabric/screensets';
import { getStore } from '@cyberfabric/state';
import type { HAI3App, HAI3Plugin } from '../../types';
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
  clearMfeMountRuntimeContext,
  primeMfeMountRuntimeContextForChain,
  resolveMfeMountServerState,
} from './mountRuntimeContext';

/**
 * Configuration for the microfrontends plugin.
 */
export interface MicrofrontendsConfig {
  /**
   * Type system plugin for entity validation.
   * The registry uses this for domain, extension, and handler type validation.
   */
  typeSystem: TypeSystemPlugin;

  /**
   * Optional MFE handlers to register with the screensets registry.
   * Handlers enable loading of specific MFE entry types (e.g., MfeEntryMF).
   *
   * If not provided, no handlers are registered. Applications must register
   * handlers manually via screensetsRegistry API.
   */
  mfeHandlers?: MfeHandler[];
}

function collectLifecycleDomains(chain: ActionsChain): string[] {
  const domains = new Set<string>();

  const visit = (link: ActionsChain): void => {
    const actionType = link.action?.type;
    const domainId = link.action?.target;
    if (
      (actionType === HAI3_ACTION_MOUNT_EXT || actionType === HAI3_ACTION_UNMOUNT_EXT) &&
      domainId
    ) {
      domains.add(domainId);
    }

    if (link.next) {
      visit(link.next);
    }

    if (link.fallback) {
      visit(link.fallback);
    }
  };

  visit(chain);
  return [...domains];
}

/**
 * Microfrontends plugin factory.
 *
 * Enables MFE capabilities in FrontX applications. Optionally accepts MFE handlers
 * for registration at plugin initialization.
 *
 * **Key Principles:**
 * - Optional mfeHandlers config for handler registration
 * - NO static domain registration - domains are registered at runtime
 * - Builds screensetsRegistry with provided TypeSystemPlugin at plugin initialization
 * - Same TypeSystemPlugin instance is propagated throughout
 * - Integrates MFE lifecycle with Flux data flow (actions, effects, slice)
 *
 * @param config - Optional configuration with mfeHandlers array
 *
 * @example
 * ```typescript
 * import { createFrontX, microfrontends } from '@cyberfabric/framework';
 * import { MfeHandlerMF, FrontX_MFE_ENTRY_MF } from '@cyberfabric/screensets/mfe/handler';
 * import { gtsPlugin } from '@cyberfabric/screensets/plugins/gts';
 *
 * const app = createFrontX()
 *   .use(microfrontends({
 *     typeSystem: gtsPlugin,
 *     mfeHandlers: [new MfeHandlerMF(FrontX_MFE_ENTRY_MF)],
 *   }))
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
// @cpt-begin:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-1
// @cpt-begin:cpt-frontx-state-framework-composition-mfe-mount:p1:inst-1
// @cpt-begin:cpt-frontx-dod-framework-composition-mfe-plugin:p1:inst-1
export function microfrontends(config: MicrofrontendsConfig): HAI3Plugin {
  // Build the ScreensetsRegistry instance with provided TypeSystemPlugin and optional handlers
  // This registry handles all MFE lifecycle: domains, extensions, actions, etc.
  // TypeSystemPlugin binding happens here at application wiring level.
  const screensetsRegistry = screensetsRegistryFactory.build({
    typeSystem: config.typeSystem,
    mfeHandlers: config.mfeHandlers,
  });

  let hostApp: HAI3App | undefined;

  // Wrap executeActionsChain to intercept mount/unmount completions for store dispatch
  const originalExecuteActionsChain = screensetsRegistry.executeActionsChain.bind(screensetsRegistry);
  screensetsRegistry.executeActionsChain = async (chain) => {
    const lifecycleDomains = collectLifecycleDomains(chain);
    const mountedBeforeByDomain = new Map(
      lifecycleDomains.map((domainId) => [domainId, screensetsRegistry.getMountedExtension(domainId)])
    );

    const serverStateForHandoff = hostApp ? resolveMfeMountServerState(hostApp) : undefined;
    const mountRuntimeTokens =
      serverStateForHandoff === undefined
        ? []
        : primeMfeMountRuntimeContextForChain(chain, serverStateForHandoff);

    try {
      await originalExecuteActionsChain(chain);
      // Sync the store from the registry's post-condition instead of assuming
      // that a resolved chain mounted/unmounted only the root link's extension.
      if (lifecycleDomains.length > 0) {
        const store = getStore();
        for (const domainId of lifecycleDomains) {
          const mountedBefore = mountedBeforeByDomain.get(domainId);
          const mountedExtensionId = screensetsRegistry.getMountedExtension(domainId);
          if (mountedBefore === mountedExtensionId) {
            continue;
          }

          if (mountedExtensionId) {
            store.dispatch(setExtensionMounted({ domainId, extensionId: mountedExtensionId }));
          } else {
            store.dispatch(setExtensionUnmounted({ domainId }));
          }
        }
      }
    } finally {
      for (const token of mountRuntimeTokens) {
        clearMfeMountRuntimeContext(token);
      }
    }
  };

  // Store cleanup functions in closure (encapsulated per plugin instance)
  let effectsCleanup: (() => void) | null = null;

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
      // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-query-client
      hostApp = app;
      // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-query-client

      // Initialize effects and store cleanup references
      effectsCleanup = initMfeEffects(screensetsRegistry);

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
      hostApp = undefined;
    },
  };
}
// @cpt-end:cpt-frontx-flow-framework-composition-mfe-lifecycle:p1:inst-1
// @cpt-end:cpt-frontx-state-framework-composition-mfe-mount:p1:inst-1
// @cpt-end:cpt-frontx-dod-framework-composition-mfe-plugin:p1:inst-1

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

// Re-export FrontX layout domain constants and MfeEvents
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
