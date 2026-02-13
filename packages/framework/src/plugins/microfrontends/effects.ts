/**
 * MFE Effects
 *
 * Listens for MFE registration events and coordinates with runtime.
 * Handles registerExtension, unregisterExtension, registerDomain, and unregisterDomain events.
 *
 * Registration effects update slice state and delegate to the ScreensetsRegistry
 * for runtime registration operations.
 */

import { eventBus, getStore } from '@hai3/state';
import { MfeEvents } from './constants';
import {
  setExtensionRegistering,
  setExtensionRegistered,
  setExtensionUnregistered,
  setExtensionError,
} from './slice';
import type { ScreensetsRegistry } from '@hai3/screensets';

// ============================================================================
// Effect Initialization
// ============================================================================

/**
 * Initialize MFE effects.
 * Call this once during app bootstrap to start listening for MFE events.
 *
 * @param screensetsRegistry - MFE-enabled registry from microfrontends plugin
 * @returns Cleanup function to unsubscribe all effects
 */
export function initMfeEffects(screensetsRegistry: ScreensetsRegistry): () => void {
  const store = getStore();
  const unsubscribers: Array<{ unsubscribe: () => void }> = [];

  // ============================================================================
  // Register Extension Effect
  // ============================================================================

  const unsubRegisterExtension = eventBus.on(MfeEvents.RegisterExtensionRequested, async (payload) => {
    const { extension } = payload;

    try {
      // Update state: registering
      store.dispatch(setExtensionRegistering({ extensionId: extension.id }));

      // Call runtime to register extension
      await screensetsRegistry.registerExtension(extension);

      // Update state: registered
      store.dispatch(setExtensionRegistered({ extensionId: extension.id }));
    } catch (error) {
      // Update state: error
      const errorMessage = error instanceof Error ? error.message : 'Unknown registration error';
      store.dispatch(setExtensionError({ extensionId: extension.id, error: errorMessage }));
    }
  });
  unsubscribers.push(unsubRegisterExtension);

  // ============================================================================
  // Unregister Extension Effect
  // ============================================================================

  const unsubUnregisterExtension = eventBus.on(MfeEvents.UnregisterExtensionRequested, async (payload) => {
    const { extensionId } = payload;

    try {
      // Call runtime to unregister extension
      await screensetsRegistry.unregisterExtension(extensionId);

      // Update state: unregistered
      store.dispatch(setExtensionUnregistered({ extensionId }));
    } catch (error) {
      // Update state: error
      const errorMessage = error instanceof Error ? error.message : 'Unknown unregistration error';
      store.dispatch(setExtensionError({ extensionId, error: errorMessage }));
    }
  });
  unsubscribers.push(unsubUnregisterExtension);

  // ============================================================================
  // Register Domain Effect
  // ============================================================================

  const unsubRegisterDomain = eventBus.on(MfeEvents.RegisterDomainRequested, async (payload) => {
    const { domain, containerProvider } = payload;

    try {
      // Call runtime to register domain (synchronous operation)
      screensetsRegistry.registerDomain(domain, containerProvider);
    } catch (error) {
      console.error(`[MFE] Domain registration failed for ${domain.id}:`, error);
    }
  });
  unsubscribers.push(unsubRegisterDomain);

  // ============================================================================
  // Unregister Domain Effect
  // ============================================================================

  const unsubUnregisterDomain = eventBus.on(MfeEvents.UnregisterDomainRequested, async (payload) => {
    const { domainId } = payload;

    try {
      // Call runtime to unregister domain
      await screensetsRegistry.unregisterDomain(domainId);
    } catch (error) {
      console.error(`[MFE] Domain unregistration failed for ${domainId}:`, error);
    }
  });
  unsubscribers.push(unsubUnregisterDomain);

  // ============================================================================
  // Return Cleanup Function
  // ============================================================================

  return () => {
    unsubscribers.forEach((unsub) => unsub.unsubscribe());
  };
}
