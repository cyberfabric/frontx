// @cpt-dod:cpt-frontx-dod-perf-telemetry-action-first:p1
/**
 * @cyberfabric/perf-telemetry — Action-first performance telemetry for FrontX
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
  SHARED_TELEMETRY_REGISTRY_SYMBOL,
  SHARED_TELEMETRY_REGISTRY_VERSION,
  acquireSharedTelemetryRegistry,
  releaseSharedTelemetryRegistry,
  appendSharedSpan,
  getSharedSpans,
  subscribeSharedSpans,
  clearSharedSpans,
  peekSharedTelemetryRegistry,
} from './shared-telemetry-registry';
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
export type { PolicyOverrides } from './types';
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
  ClientAttributes,
  NavigatorWithConnection,
  ActionTrigger,
  ActionSnapshot,
  DoneRenderingDeps,
  DoneRenderingOptions,
  FetchMeta,
  TelemetryActionOptions,
} from './types';
