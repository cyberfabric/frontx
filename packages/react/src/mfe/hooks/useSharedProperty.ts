/**
 * useSharedProperty Hook - Shared property subscription
 *
 * Subscribes to shared property updates from the host.
 *
 * React Layer: L3
 */

import { useSyncExternalStore, useCallback } from 'react';
import { useMfeContext } from '../MfeContext';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for subscribing to a shared property.
 *
 * Subscribes to property updates from the host and returns the current value.
 * Must be used within a MfeProvider (i.e., inside an MFE component).
 *
 * NOTE: Full bridge subscription mechanism is implemented in Phase 15.
 * This hook provides the interface and uses useSyncExternalStore with a stub subscription.
 *
 * @param _propertyTypeId - Type ID of the shared property to subscribe to (currently unused until Phase 15)
 * @returns Current property value
 *
 * @example
 * ```tsx
 * function MyMfeComponent() {
 *   const userData = useSharedProperty('gts.hai3.mfes.comm.shared_property.v1~myapp.user_data.v1');
 *
 *   return <div>User: {userData?.name}</div>;
 * }
 * ```
 */
export function useSharedProperty<T = unknown>(_propertyTypeId: string): T | undefined {
  // Enforce MfeProvider context requirement
  // Hold reference for Phase 15 when bridge methods are implemented
  useMfeContext(); // Throws if not in MfeProvider

  // Phase 15 NOTE: bridge.subscribeToProperty() is not yet implemented.
  // This hook provides the interface. When Phase 15 is complete:
  // 1. Use bridge.subscribeToProperty(propertyTypeId, callback)
  // 2. Use bridge.getProperty(propertyTypeId) for synchronous access
  // 3. Replace this stub with actual subscription logic

  // Stub subscription using useSyncExternalStore
  // Returns undefined until Phase 15 implements bridge subscription
  const subscribe = useCallback((_callback: () => void) => {
    // Phase 15: Replace with actual bridge.subscribeToProperty(propertyTypeId, callback)
    // For now, return a no-op unsubscribe function
    return () => {
      // no-op unsubscribe
    };
  }, []);

  const getSnapshot = useCallback(() => {
    // Phase 15: Replace with bridge.getProperty(propertyTypeId)
    return undefined as T | undefined;
  }, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return value;
}
