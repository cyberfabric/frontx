/**
 * @cyberfabric/state - FrontX State Management
 *
 * Provides:
 * - Type-safe event bus for pub/sub communication
 * - Store with dynamic slice registration
 * - Effect system for event-driven state updates
 *
 * SDK Layer: L1 (Only peer dependency on @reduxjs/toolkit)
 *
 * TERMINOLOGY:
 * - "Action" = FrontX Action (function that emits events)
 * - "Reducer" = pure function in slice that updates state
 * - Redux internals are completely hidden
 */
// @cpt-featstatus:cpt-frontx-featstatus-state-management:p1

// ============================================================================
// Type Exports (minimal public API)
// ============================================================================

export type {
  // For reducers
  ReducerPayload,
  // For module augmentation
  EventPayloadMap,
  RootState,
  // For effects
  AppDispatch,
  EffectInitializer,
  // For store/slice
  HAI3Store,
  SliceObject,
  // For event subscriptions
  EventBus,
  EventHandler,
  Subscription,
} from './types';

// ============================================================================
// Event Bus
// ============================================================================

export { eventBus } from './EventBus';

// ============================================================================
// Store
// ============================================================================

export {
  createStore,
  getStore,
  registerSlice,
  unregisterSlice,
  hasSlice,
  getRegisteredSlices,
  resetStore,
} from './store';

// ============================================================================
// Slice
// ============================================================================

export { createSlice } from './createSlice';
