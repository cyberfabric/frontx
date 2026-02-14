/**
 * useMfeBridge Hook - MFE bridge access
 *
 * Returns the ChildMfeBridge from context for communication with host.
 *
 * React Layer: L3
 */

import { useMfeContext } from '../MfeContext';
import type { ChildMfeBridge } from '@hai3/framework';

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for accessing the MFE bridge.
 *
 * Returns the ChildMfeBridge instance for communication with the host.
 * Must be used within a MfeProvider (i.e., inside an MFE component).
 *
 * @returns Child MFE bridge
 *
 * @example
 * ```tsx
 * function MyMfeComponent() {
 *   const bridge = useMfeBridge();
 *
 *   // Bridge methods:
 *   // bridge.executeActionsChain(chain);
 *   // bridge.subscribeToProperty(propertyTypeId, callback);
 *
 *   return <div>Domain: {bridge.domainId}</div>;
 * }
 * ```
 */
export function useMfeBridge(): ChildMfeBridge {
  const { bridge } = useMfeContext();
  return bridge;
}
