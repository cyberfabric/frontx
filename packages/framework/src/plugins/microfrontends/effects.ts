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
      // NOTE: Phase 19 stub - will throw until fully implemented
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
      // NOTE: Phase 19 stub - will throw until fully implemented
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
      // NOTE: Phase 19 stub - will throw until fully implemented
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
      // NOTE: Phase 19 stub - will throw until fully implemented
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
      // NOTE: Phase 19 implementation required for full functionality

      // For now, just log the action request
      console.log(`[MFE] Host action requested: ${actionTypeId} for ${extensionId}`, actionPayload);

      // In Phase 19, this will:
      // 1. Create an ActionsChain for the action
      // 2. Execute via mediator.executeChain()
      // 3. Handle load_ext (mount) or unload_ext (unmount) semantics
    } catch (error) {
      console.error(`[MFE] Host action failed for ${extensionId}:`, error);
    }
  });
  unsubscribers.push(unsubHostAction);

  // ============================================================================
  // Return Cleanup Function
  // ============================================================================

  return () => {
    unsubscribers.forEach((unsub) => unsub.unsubscribe());
  };
}
