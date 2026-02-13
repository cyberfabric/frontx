/**
 * Tenant Effects
 *
 * Listens for tenant events and updates the tenant slice.
 * Event-driven architecture: consuming apps emit events, effects handle state updates.
 */

import { eventBus, getStore } from '@hai3/state';
import { setTenant, clearTenant } from '../slices/tenantSlice';
import type { Tenant } from '../layoutTypes';

// ============================================================================
// Event Types
// ============================================================================

/** Tenant event names */
export const TenantEvents = {
  Changed: 'app/tenant/changed',
  Cleared: 'app/tenant/cleared',
} as const;

/** Payload for tenant changed event */
export interface TenantChangedPayload {
  tenant: Tenant;
}

/** Payload for tenant cleared event */
export interface TenantClearedPayload {
  // Empty payload
}

// ============================================================================
// Module Augmentation for Type-Safe Events
// ============================================================================

declare module '@hai3/state' {
  interface EventPayloadMap {
    'app/tenant/changed': TenantChangedPayload;
    'app/tenant/cleared': TenantClearedPayload;
  }
}

// ============================================================================
// Effect Registration
// ============================================================================

/**
 * Initialize tenant effects
 * Call this once during app bootstrap to start listening for tenant events.
 */
export function initTenantEffects(): () => void {
  const store = getStore();

  // Listen for tenant changed event
  const subChanged = eventBus.on(TenantEvents.Changed, (payload) => {
    store.dispatch(setTenant(payload.tenant));
  });

  // Listen for tenant cleared event
  const subCleared = eventBus.on(TenantEvents.Cleared, () => {
    store.dispatch(clearTenant());
  });

  // Return cleanup function
  return () => {
    subChanged.unsubscribe();
    subCleared.unsubscribe();
  };
}
