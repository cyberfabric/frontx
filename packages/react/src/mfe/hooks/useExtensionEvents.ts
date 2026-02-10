/**
 * useExtensionEvents Hook - Extension registration event subscription
 *
 * Subscribes to extension registration/unregistration events for a specific domain.
 *
 * React Layer: L3
 */

import { useSyncExternalStore, useCallback, useRef } from 'react';
import { useHAI3 } from '../../HAI3Context';
import type { Extension } from '@hai3/screensets';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for subscribing to extension registration events for a domain.
 *
 * Subscribes to extensionRegistered and extensionUnregistered events from the runtime,
 * filters by domainId, and returns the current list of extensions for that domain.
 *
 * @param domainId - Domain ID to filter events by
 * @returns Array of extensions currently registered for the domain
 *
 * @example
 * ```tsx
 * function SidebarExtensions() {
 *   const extensions = useExtensionEvents('gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1');
 *
 *   return (
 *     <div>
 *       {extensions.map(ext => (
 *         <div key={ext.id}>{ext.id}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useExtensionEvents(domainId: string): Extension[] {
  const app = useHAI3();
  const registry = app.screensetsRegistry;

  if (!registry) {
    throw new Error(
      'useExtensionEvents requires the microfrontends plugin. ' +
      'Add microfrontends() to your HAI3 app configuration.'
    );
  }

  // Subscribe to extension registration events.
  // The callback notifies useSyncExternalStore that external state may have changed.
  // Domain filtering happens in getSnapshot via the cached snapshot comparison.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = () => onStoreChange();
      registry.on('extensionRegistered', handler);
      registry.on('extensionUnregistered', handler);

      return () => {
        registry.off('extensionRegistered', handler);
        registry.off('extensionUnregistered', handler);
      };
    },
    [registry]
  );

  // Cache the snapshot to maintain referential stability for useSyncExternalStore.
  // Only update when the extension IDs actually change.
  const cacheRef = useRef<{ ids: string; extensions: Extension[] }>({ ids: '', extensions: [] });

  const getSnapshot = useCallback(() => {
    const extensions = registry.getExtensionsForDomain(domainId);
    const ids = extensions.map(e => e.id).join(',');
    if (ids !== cacheRef.current.ids) {
      cacheRef.current = { ids, extensions };
    }
    return cacheRef.current.extensions;
  }, [registry, domainId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
