/**
 * Tenant Actions
 * Follows Flux pattern
 * Pattern: Action → Event → Effect → Store update
 */

import { eventBus } from '../events/eventBus';
import { TenantEvents } from '../events/eventTypes/tenantEvents';
import type { Tenant } from '../../app/types';

/**
 * Change tenant
 * Actions are PURE FUNCTIONS - they cannot access store state
 * Emits event - effects handle store updates and side effects
 *
 * @param tenant - Tenant object with at least id field
 */
export const changeTenant = (tenant: Tenant): void => {
  eventBus.emit(TenantEvents.Changed, { tenant });
};
