/**
 * MFE Effects
 *
 * Listens for MFE events and coordinates with runtime.
 * Handles load, preload, mount, unmount, and host action events.
 */

import { eventBus, getStore } from '@hai3/state';
import { MfeEvents } from './actions';
import {
  setLoading,
  setBundleLoaded,
  setLoadError,
  setMounting,
  setMounted,
  setUnmounted,
  setMountError,
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
  // Load Effect
  // ============================================================================

  const unsubLoad = eventBus.on(MfeEvents.LoadRequested, async (payload) => {
    const { extensionId } = payload;

    try {
      // Update state: loading
      store.dispatch(setLoading({ extensionId }));

      // Call runtime to load extension
      await screensetsRegistry.loadExtension(extensionId);

      // Update state: loaded
      store.dispatch(setBundleLoaded({ extensionId }));
    } catch (error) {
      // Update state: error
      const errorMessage = error instanceof Error ? error.message : 'Unknown load error';
      store.dispatch(setLoadError({ extensionId, error: errorMessage }));
    }
  });
  unsubscribers.push(unsubLoad);

  // ============================================================================
  // Preload Effect
  // ============================================================================

  const unsubPreload = eventBus.on(MfeEvents.PreloadRequested, async (payload) => {
    const { extensionId } = payload;

    try {
      // Preload doesn't update state (it's fire-and-forget optimization)
      await screensetsRegistry.preloadExtension(extensionId);
    } catch (error) {
      // Silently ignore preload errors (they're optional optimizations)
      if (store.getState().mfe) {
        console.warn(`[MFE] Preload failed for ${extensionId}:`, error);
      }
    }
  });
  unsubscribers.push(unsubPreload);

  // ============================================================================
  // Mount Effect
  // ============================================================================

  const unsubMount = eventBus.on(MfeEvents.MountRequested, async (payload) => {
    const { extensionId, containerElement } = payload;

    try {
      // Update state: mounting
      store.dispatch(setMounting({ extensionId }));

      // Call runtime to mount extension (auto-loads if needed)
      await screensetsRegistry.mountExtension(extensionId, containerElement);

      // Update state: mounted
      store.dispatch(setMounted({ extensionId }));
    } catch (error) {
      // Update state: error
      const errorMessage = error instanceof Error ? error.message : 'Unknown mount error';
      store.dispatch(setMountError({ extensionId, error: errorMessage }));
    }
  });
  unsubscribers.push(unsubMount);

  // ============================================================================
  // Unmount Effect
  // ============================================================================

  const unsubUnmount = eventBus.on(MfeEvents.UnmountRequested, async (payload) => {
    const { extensionId } = payload;

    try {
      // Call runtime to unmount extension
      await screensetsRegistry.unmountExtension(extensionId);

      // Update state: unmounted
      store.dispatch(setUnmounted({ extensionId }));
    } catch (error) {
      // Update state: error
      const errorMessage = error instanceof Error ? error.message : 'Unknown unmount error';
      store.dispatch(setMountError({ extensionId, error: errorMessage }));
    }
  });
  unsubscribers.push(unsubUnmount);

  // ============================================================================
  // Host Action Effect
  // ============================================================================

  const unsubHostAction = eventBus.on(MfeEvents.HostActionRequested, async (payload) => {
    const { extensionId, actionTypeId, payload: actionPayload } = payload;

    try {
      // Handle host actions like load_ext/unload_ext for domains
      // This is used for popup, sidebar, overlay, and custom domains
      console.log(`[MFE] Host action requested: ${actionTypeId} for ${extensionId}`, actionPayload);
    } catch (error) {
      console.error(`[MFE] Host action failed for ${extensionId}:`, error);
    }
  });
  unsubscribers.push(unsubHostAction);

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
    const { domain } = payload;

    try {
      // Call runtime to register domain (synchronous operation)
      screensetsRegistry.registerDomain(domain);
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
