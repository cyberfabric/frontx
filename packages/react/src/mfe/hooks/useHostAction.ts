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
 * NOTE: This hook provides the interface. Bridge executeActionsChain() delegates to the registry.
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
export function useHostAction<TPayload extends Record<string, unknown> = Record<string, unknown>>(
  actionTypeId: string
): (payload?: TPayload) => void {
  // Enforce MfeProvider context requirement
  const { bridge } = useMfeContext(); // Throws if not in MfeProvider

  return useCallback((payload?: TPayload) => {
    // Construct an ActionsChain with the action
    // With the constraint, TPayload extends Record<string, unknown>,
    // so this is a safe widening from specific to general
    const chain = {
      action: {
        type: actionTypeId,
        target: bridge.domainId,
        payload: payload as Record<string, unknown> | undefined,
      },
    };

    // Send the chain to the host
    bridge.executeActionsChain(chain).catch((error: Error) => {
      console.error(
        `[useHostAction] Failed to send action '${actionTypeId}':`,
        error
      );
    });
  }, [actionTypeId, bridge]);
}
