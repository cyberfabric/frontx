/**
 * useActivePackage Hook - Active GTS package subscription
 *
 * Subscribes to store changes and returns the GTS package of the currently
 * mounted screen extension.
 *
 * React Layer: L3
 */

import { useSyncExternalStore, useCallback, useRef } from 'react';
import { useHAI3 } from '../../HAI3Context';
import { extractGtsPackage, HAI3_SCREEN_DOMAIN } from '@hai3/framework';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for observing the active GTS package (the package of the currently
 * mounted screen extension).
 *
 * Subscribes to the HAI3 store to detect mount state changes, and returns
 * the GTS package extracted from the currently mounted screen extension's ID.
 *
 * Returns `undefined` if no screen extension is currently mounted.
 *
 * @returns GTS package string of the active screen extension, or undefined
 *
 * @example
 * ```tsx
 * function ActivePackageIndicator() {
 *   const activePackage = useActivePackage();
 *
 *   if (!activePackage) {
 *     return <div>No active screen</div>;
 *   }
 *
 *   return <div>Active package: {activePackage}</div>;
 * }
 * ```
 */
export function useActivePackage(): string | undefined {
  const app = useHAI3();
  const registry = app.screensetsRegistry;

  if (!registry) {
    throw new Error(
      'useActivePackage requires the microfrontends plugin. ' +
      'Add microfrontends() to your HAI3 app configuration.'
    );
  }

  // Subscribe to store changes.
  // Any dispatch (including mount state updates) triggers a snapshot check.
  // The snapshot comparison ensures only actual active package changes cause re-renders.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return app.store.subscribe(onStoreChange);
    },
    [app.store]
  );

  // Cache the snapshot to maintain referential stability for useSyncExternalStore.
  // Only update when the active package actually changes.
  const cacheRef = useRef<{ activePackage: string | undefined }>({ activePackage: undefined });

  const getSnapshot = useCallback(() => {
    const mountedExtensionId = registry.getMountedExtension(HAI3_SCREEN_DOMAIN);

    // Guard: if no extension is mounted, return undefined immediately
    if (!mountedExtensionId) {
      const result = undefined;
      if (result !== cacheRef.current.activePackage) {
        cacheRef.current = { activePackage: result };
      }
      return cacheRef.current.activePackage;
    }

    // Extract GTS package from the mounted extension ID
    const activePackage = extractGtsPackage(mountedExtensionId);
    if (activePackage !== cacheRef.current.activePackage) {
      cacheRef.current = { activePackage };
    }
    return cacheRef.current.activePackage;
  }, [registry]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
