/**
 * useHostAction Hook - Host action requests
 *
 * Returns a callback to request host actions via the bridge.
 *
 * React Layer: L3
 */

import { useCallback } from 'react';
import { useMfeContext } from '../MfeContext';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for requesting host actions.
 *
 * Returns a callback function that sends an actions chain to the host.
 * Must be used within a MfeProvider (i.e., inside an MFE component).
 *
 * NOTE: Full bridge sendActionsChain() method is implemented in Phase 15.
 * This hook provides the interface.
 *
 * @param actionTypeId - Type ID of the action to request
 * @returns Callback function to request the action with payload
 *
 * @example
 * ```tsx
 * function MyMfeComponent() {
 *   const requestNavigation = useHostAction('gts.hai3.mfes.comm.action.v1~myapp.navigate.v1');
 *
 *   const handleClick = () => {
 *     requestNavigation({ path: '/dashboard' });
 *   };
 *
 *   return <button onClick={handleClick}>Navigate</button>;
 * }
 * ```
 */
export function useHostAction<TPayload = unknown>(
  actionTypeId: string
): (payload?: TPayload) => void {
  // Enforce MfeProvider context requirement
  // Hold reference for Phase 15 when bridge.sendActionsChain() is implemented
  useMfeContext(); // Throws if not in MfeProvider

  return useCallback((payload?: TPayload) => {
    // Phase 15 NOTE: bridge.sendActionsChain() is not yet implemented.
    // This hook provides the interface. When Phase 15 is complete:
    // 1. Construct an ActionsChain with the action
    // 2. Use bridge.sendActionsChain(chain)
    // 3. Handle response/errors

    // Stub implementation
    console.warn(
      `[useHostAction] Phase 15 dependency: bridge.sendActionsChain() not yet implemented. ` +
      `Action type: ${actionTypeId}, payload:`,
      payload
    );

    // Phase 15: Replace with actual implementation:
    // const chain: ActionsChain = {
    //   action: {
    //     type: actionTypeId,
    //     target: bridge.domainId,
    //     payload,
    //   },
    // };
    // bridge.sendActionsChain(chain);
  }, [actionTypeId]);
}
