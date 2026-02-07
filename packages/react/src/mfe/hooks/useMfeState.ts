/**
 * useMfeState Hook - MFE state access
 *
 * Returns the full MFE context state including bridge info and Redux states.
 *
 * React Layer: L3
 */

import { useMemo } from 'react';
import { useMfeContext } from '../MfeContext';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  selectMfeLoadState,
  selectMfeMountState,
  selectMfeError,
  type MfeLoadState,
  type MfeMountState,
  type MfeState,
} from '@hai3/framework';

// ============================================================================
// Return Type
// ============================================================================

/**
 * useMfeState Hook Return Type
 */
export interface UseMfeStateReturn {
  /** Extension ID */
  extensionId: string;
  /** Domain ID where MFE is mounted */
  domainId: string;
  /** Entry type ID */
  entryTypeId: string;
  /** Instance ID */
  instanceId: string;
  /** MFE load state */
  loadState: MfeLoadState;
  /** MFE mount state */
  mountState: MfeMountState;
  /** MFE error (if any) */
  error?: string;
}

// Re-export types from framework for convenience
export type { MfeLoadState, MfeMountState };

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if the Redux state contains the MFE slice.
 *
 * This provides runtime safety by checking for the presence of the MFE slice
 * before accessing it, and allows TypeScript to properly narrow the type.
 *
 * @param state - The Redux state to check
 * @returns True if the state has an MFE slice
 */
function hasMfeSlice(state: unknown): state is { mfe: MfeState } {
  return typeof state === 'object' && state !== null && 'mfe' in state;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for accessing MFE state.
 *
 * Returns the full MFE context including bridge info and load/mount states from Redux.
 * Must be used within a MfeProvider (i.e., inside an MFE component).
 *
 * @returns MFE state
 *
 * @example
 * ```tsx
 * function MyMfeComponent() {
 *   const { extensionId, domainId, loadState, mountState } = useMfeState();
 *
 *   if (loadState === 'loading') return <Loading />;
 *   if (loadState === 'error') return <Error />;
 *
 *   return <div>MFE mounted in {domainId}</div>;
 * }
 * ```
 */
export function useMfeState(): UseMfeStateReturn {
  const { bridge, extensionId, domainId, entryTypeId } = useMfeContext();

  // Select load and mount states from Redux with runtime type guard
  // If MFE slice is not present (plugin not loaded), provide safe defaults
  const loadState = useAppSelector((state) =>
    hasMfeSlice(state) ? selectMfeLoadState(state, extensionId) : 'idle'
  );
  const mountState = useAppSelector((state) =>
    hasMfeSlice(state) ? selectMfeMountState(state, extensionId) : 'unmounted'
  );
  const error = useAppSelector((state) =>
    hasMfeSlice(state) ? selectMfeError(state, extensionId) : undefined
  );

  return useMemo(
    () => ({
      extensionId,
      domainId,
      entryTypeId,
      instanceId: bridge.instanceId,
      loadState,
      mountState,
      error,
    }),
    [extensionId, domainId, entryTypeId, bridge.instanceId, loadState, mountState, error]
  );
}
