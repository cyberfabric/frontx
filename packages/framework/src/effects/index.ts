/**
 * Framework Effects
 *
 * Effects that handle event-driven state updates.
 * These are initialized during app bootstrap.
 */

export {
  initTenantEffects,
  changeTenant,
  clearTenantAction,
  setTenantLoadingState,
  TenantEvents,
  type TenantChangedPayload,
  type TenantClearedPayload,
} from './tenantEffects';

export {
  initMockEffects,
  toggleMockMode,
  MockEvents,
  type MockTogglePayload,
} from './mockEffects';
