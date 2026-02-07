/**
 * MFE Provider - Provides MFE context to child components
 *
 * Wraps MFE components with bridge and metadata.
 * Used by the MFE mounting system.
 *
 * React Layer: L3 (Depends on @hai3/framework)
 */

import React from 'react';
import { MfeContext, type MfeContextValue } from './MfeContext';

// ============================================================================
// Provider Props
// ============================================================================

/**
 * MFE Provider Props
 */
export interface MfeProviderProps {
  /** MFE context value */
  value: MfeContextValue;
  /** Child components */
  children: React.ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * MFE Provider Component
 *
 * Provides MFE bridge and metadata to child components.
 * Used by the MFE mounting system to wrap MFE components.
 *
 * @example
 * ```tsx
 * <MfeProvider value={{ bridge, extensionId, domainId, entryTypeId }}>
 *   <MyMfeComponent />
 * </MfeProvider>
 * ```
 */
export const MfeProvider: React.FC<MfeProviderProps> = ({ value, children }) => {
  return (
    <MfeContext.Provider value={value}>
      {children}
    </MfeContext.Provider>
  );
};
