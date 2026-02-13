/**
 * Tenant Actions
 *
 * Action functions for setting and clearing tenant.
 * These emit events that are consumed by tenantEffects.
 */

import { eventBus, getStore } from '@hai3/state';
import { setTenantLoading } from '../slices/tenantSlice';
import { TenantEvents } from './tenantEffects';
import type { Tenant } from '../layoutTypes';

/**
 * Set tenant via event bus
 * This is the recommended way for consuming apps to set tenant.
 *
 * @example
 * ```typescript
 * import { changeTenant } from '@hai3/framework';
 * changeTenant({ id: 'tenant-123' });
 * ```
 */
export function changeTenant(tenant: Tenant): void {
  eventBus.emit(TenantEvents.Changed, { tenant });
}

/**
 * Clear tenant via event bus
 */
export function clearTenantAction(): void {
  eventBus.emit(TenantEvents.Cleared, {});
}

/**
 * Set tenant loading state (direct dispatch, for internal use)
 */
export function setTenantLoadingState(loading: boolean): void {
  getStore().dispatch(setTenantLoading(loading));
}
