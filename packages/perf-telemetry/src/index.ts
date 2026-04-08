/**
 * @hai3/perf-telemetry — Action-first performance telemetry for HAI3
 */

export { TelemetryProvider, useTelemetryContext } from './TelemetryProvider';
export {
  useRoutePerf,
  useDoneRendering,
  useTelemetryAction,
  runTelemetryAction,
  useInstrumentedFetch,
  instrumentedFetch,
  useWebVitals,
  useResourceTimingObserver,
  useLongTaskObserver,
} from './hooks';
export {
  initOtel,
  getOtelSessionId,
  flushOtel,
  shutdownOtel,
  setRuntimeConfigProvider,
  runFrontendWork,
  getTracer,
  isOtelInitialized,
  setCurrentRouteId,
} from './otel-init';
export {
  beginActionScope,
  endActionScope,
  getActiveActionScopes,
  findRelatedActionScope,
  getActionParentContext,
  getTelemetryParentContext,
  setAmbientTracer,
  endAmbientAction,
  getAmbientScope,
  beginRouteUiScope,
  endRouteUiScope,
  getActiveRouteUiScope,
  getRouteUiParentContext,
} from './action-scope';
export {
  telemetryStore,
  TelemetryStoreProcessor,
} from './telemetry-store';
export {
  getTelemetryRuntimeConfig,
  subscribeTelemetryRuntimeConfig,
  updateTelemetryRuntimeConfig,
  getTelemetryConsentMode,
} from './runtime-config';
export { useTelemetryRuntimeConfig } from './useTelemetryRuntimeConfig';
export { getClientInfo } from './client-info';
export { TelemetryErrorBoundary } from './TelemetryErrorBoundary';
export {
  PolicyEngine,
  getPolicyByProfile,
  mergePolicy,
  classifyLane,
  BASELINE_POLICY,
  INVESTIGATION_POLICY,
  SUPPORT_BURST_POLICY,
  KILL_SWITCH_POLICY,
} from './policy-engine';
export type {
  OtelConfig,
  TelemetryRuntimeConfig,
  TelemetryContextValue,
  TelemetryProviderProps,
  ActionScope,
  RouteUiScope,
  StoredSpan,
  SpanListener,
  CollectionPolicy,
  PolicyProfile,
  Lane,
} from './types';
