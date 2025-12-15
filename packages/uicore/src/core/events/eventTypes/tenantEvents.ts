/**
 * Tenant Events
 * Events related to tenant changes
 */

import type { Tenant } from '../../../app/types';
import { UICORE_ID } from '../../constants';

const DOMAIN_ID = 'tenant';

export enum TenantEvents {
  Changed = `${UICORE_ID}/${DOMAIN_ID}/changed`,
}

export interface TenantChangedPayload {
  tenant: Tenant;
}

/**
 * Type map: ties each TenantEvent to its payload type
 * Uses string literal types as keys (event string values)
 */
export interface TenantEventPayloadMap {
  'uicore/tenant/changed': TenantChangedPayload;
}
