// @cpt-state:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1
// @cpt-algo:cpt-frontx-algo-perf-telemetry-export-gating:p2
// @cpt-algo:cpt-frontx-algo-perf-telemetry-session-id:p2
/**
 * OpenTelemetry Browser SDK initialization — action-first telemetry
 *
 * The HAI3SpanProcessor guarantees every span has action.name via ambient fallback.
 *
 * Required peer dependencies (install in your app):
 *   @opentelemetry/api
 *   @opentelemetry/sdk-trace-web
 *   @opentelemetry/sdk-trace-base
 *   @opentelemetry/exporter-trace-otlp-http
 *   @opentelemetry/resources
 *   @opentelemetry/semantic-conventions
 *   @opentelemetry/context-zone
 *   @opentelemetry/instrumentation
 *   @opentelemetry/instrumentation-fetch
 *   @opentelemetry/instrumentation-document-load
 *   @opentelemetry/instrumentation-user-interaction
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, type ReadableSpan, type SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace, context, type Context, type Tracer, type Span, SpanStatusCode } from '@opentelemetry/api';
import type { OtelConfig, TelemetryRuntimeConfig } from './types';
import {
  clearAmbientTracer,
  findRelatedActionScope,
  getTelemetryParentContext,
  setAmbientTracer,
  endAmbientAction,
} from './action-scope';
import { getClientInfo } from './client-info';
import { TelemetryStoreProcessor } from './telemetry-store';
import {
  acquireSharedTelemetryRegistry,
  releaseSharedTelemetryRegistry,
} from './shared-telemetry-registry';

// ─── Module state ────────────────────────────────────────────────────────────

let _provider: WebTracerProvider | null = null;
let _sessionId: string | null = null;
let _initialized = false;
let _visibilityHandler: (() => void) | null = null;
let _disableInstrumentations: (() => void) | null = null;
let _runtimeId: string | null = null;

function generateSessionId(): string {
  // Reflect.get on globalThis lets us treat `crypto` as optionally present
  // off-browser (Node 18 / older runners) without `typeof` checks Sonar
  // rejects (typescript:S7741) or direct comparisons TS narrows to truthy.
  const cryptoApi = Reflect.get(globalThis, 'crypto') as Crypto | undefined ?? null;
  // Use cryptographically secure random when available (all modern browsers)
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-random-uuid
    return cryptoApi.randomUUID();
    // @cpt-end:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-random-uuid
  }
  // Fallback: getRandomValues always exists on Crypto interface
  if (cryptoApi) {
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-random-values
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    // @cpt-end:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-random-values
  }
  // Last resort: timestamp-based (non-cryptographic, acceptable for telemetry session IDs)
  // @cpt-begin:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-timestamp-fallback
  return `${Date.now()}-${performance.now().toString(36)}`;
  // @cpt-end:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-timestamp-fallback
}

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  try {
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-read-storage
    const stored = sessionStorage.getItem('otel_session_id');
    if (stored) {
      _sessionId = stored;
    // @cpt-end:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-read-storage
    } else {
      // @cpt-begin:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-generate-and-store
      _sessionId = generateSessionId();
      sessionStorage.setItem('otel_session_id', _sessionId);
      // @cpt-end:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-generate-and-store
    }
  } catch { /* fail-open: sessionStorage may be unavailable (private browsing) */
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-storage-fallback
    _sessionId = generateSessionId();
    // @cpt-end:cpt-frontx-algo-perf-telemetry-session-id:p2:inst-session-storage-fallback
  }
  return _sessionId;
}

// ─── Runtime Config Integration ──────────────────────────────────────────────
// setRuntimeConfigProvider() lets the host app inject live config (feature flags,
// account attributes, export toggles) without coupling this package to any app module.

// Default no-op config — overridden by the host app via setRuntimeConfigProvider()
const _runtimeConfig: TelemetryRuntimeConfig = {
  exportToCollector: true,
  includeDebugData: false,
  policyProfile: 'baseline',
  accountId: '',
  accountName: '',
  accountPlan: '',
  accountRegion: '',
  accountSegment: '',
  accountTenureBucket: '',
  abBucketSeed: '',
};

function defaultRuntimeConfigGetter(): TelemetryRuntimeConfig {
  return _runtimeConfig;
}

let _getRuntimeConfig: () => TelemetryRuntimeConfig = defaultRuntimeConfigGetter;

export function setRuntimeConfigProvider(getter: () => TelemetryRuntimeConfig): void {
  _getRuntimeConfig = getter;
}

// ─── Span Processors ────────────────────────────────────────────────────────

function shouldPreventUserInteractionSpanCreation(_eventName: string, element: HTMLElement): boolean {
  const interactiveControlSelector = 'input, select, textarea, option, button, label';
  return Boolean(element.closest(interactiveControlSelector));
}

class ExportGateSpanProcessor implements SpanProcessor {
  constructor(private readonly delegate: SpanProcessor) {}
  onStart(_span: Span, _parentContext: Context): void {}
  onEnd(span: ReadableSpan): void {
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-gate-span-on-end
    if (!_getRuntimeConfig().exportToCollector) return;
    this.delegate.onEnd(span);
    // @cpt-end:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-gate-span-on-end
  }
  async shutdown(): Promise<void> {
    // Gate shutdown to prevent flushing buffered spans when export is disabled
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-gate-shutdown
    if (!_getRuntimeConfig().exportToCollector) return;
    await this.delegate.shutdown();
    // @cpt-end:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-gate-shutdown
  }
  async forceFlush(): Promise<void> {
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-gate-force-flush
    if (!_getRuntimeConfig().exportToCollector) return;
    await this.delegate.forceFlush();
    // @cpt-end:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-gate-force-flush
  }
}

let _currentRouteId = 'unknown';

type SpanWithAttributes = Span & {
  readonly attributes?: Record<string, string | number | boolean>;
};

export function setCurrentRouteId(routeId: string): void {
  if (_currentRouteId !== routeId) {
    endAmbientAction();
  }
  _currentRouteId = routeId;
}

function getSpanAttributes(span: Span): SpanWithAttributes['attributes'] {
  return (span as SpanWithAttributes).attributes;
}

function applySpanActionContext(span: Span, currentRouteId: string): void {
  const attributes = getSpanAttributes(span);
  const existingActionName = attributes?.['action.name'];
  const existingScopeSpanId = typeof attributes?.['action.scope_span_id'] === 'string'
    ? attributes['action.scope_span_id']
    : '';
  const existingScopeTraceId = typeof attributes?.['action.scope_trace_id'] === 'string'
    ? attributes['action.scope_trace_id']
    : '';
  const lookupRouteId = typeof attributes?.['route.id'] === 'string' ? attributes['route.id'] : currentRouteId;

  if (typeof existingActionName === 'string' && existingActionName.length > 0) {
    // @cpt-begin:cpt-frontx-dod-perf-telemetry-action-first:p1:inst-preserve-explicit-action-context
    const spanContext = span.spanContext();
    if (existingScopeSpanId.length === 0) {
      span.setAttribute('action.scope_span_id', spanContext.spanId);
    }
    if (existingScopeTraceId.length === 0) {
      span.setAttribute('action.scope_trace_id', spanContext.traceId);
    }
    if (typeof attributes?.['route.id'] !== 'string') {
      span.setAttribute('route.id', lookupRouteId);
    }
    // @cpt-end:cpt-frontx-dod-perf-telemetry-action-first:p1:inst-preserve-explicit-action-context
    return;
  }

  // Guarantee every non-root span belongs to an action (ambient fallback)
  const relatedAction = findRelatedActionScope(performance.now(), lookupRouteId);
  if (relatedAction) {
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-ambient-fallback:p1:inst-apply-related-action-context
    span.setAttribute('action.name', relatedAction.actionName);
    span.setAttribute('action.scope_span_id', relatedAction.spanId);
    span.setAttribute('action.scope_trace_id', relatedAction.traceId);
    span.setAttribute('route.id', relatedAction.routeId);
    // @cpt-end:cpt-frontx-flow-perf-telemetry-ambient-fallback:p1:inst-apply-related-action-context
    return;
  }

  // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-attach-current-route-id
  span.setAttribute('route.id', lookupRouteId);
  // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-attach-current-route-id
}

/** Resolve `globalThis.document` defensively; returns null in non-browser runtimes. */
function getDocument(): Document | null {
  return Reflect.get(globalThis, 'document') as Document | undefined ?? null;
}

/** Resolve `globalThis.window.location.origin` defensively; returns 'unknown' off-browser. */
function resolveAppOrigin(): string {
  const win = Reflect.get(globalThis, 'window') as Window | undefined;
  return win?.location.origin ?? 'unknown';
}

function cleanupPartialInit(): void {
  const doc = getDocument();
  if (_visibilityHandler && doc) {
    doc.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }

  _disableInstrumentations?.();
  _disableInstrumentations = null;

  if (_provider) {
    _provider.forceFlush().catch(() => { /* fail-open */ });
    _provider.shutdown().catch(() => { /* fail-open */ });
  }

  endAmbientAction();
  clearAmbientTracer();
  trace.disable();
  context.disable();
  _provider = null;
  _initialized = false;
}

function applySpanClientInfo(span: Span, includeDebugData: boolean): void {
  const clientInfo = getClientInfo(includeDebugData);
  for (const [key, value] of Object.entries(clientInfo)) {
    span.setAttribute(key, value);
  }
}

function applySpanRuntimeConfig(span: Span, cfg: TelemetryRuntimeConfig): void {
  if (cfg.accountPlan) span.setAttribute('account.plan', cfg.accountPlan);
  if (cfg.accountRegion) span.setAttribute('account.region', cfg.accountRegion);
  if (cfg.accountSegment) span.setAttribute('account.segment', cfg.accountSegment);

  if (cfg.includeDebugData) {
    // Use debug.* namespace to avoid prohibited user.* metric labels per data-contracts.md
    if (cfg.accountId) span.setAttribute('debug.account_id', cfg.accountId);
    if (cfg.accountName) span.setAttribute('debug.account_display_name', cfg.accountName);
  }
}

/**
 * Automatically attaches route.id, session.id, and action correlation
 * to every span. Guarantees action.name via ambient fallback.
 */
class HAI3SpanProcessor implements SpanProcessor {
  onStart(span: Span): void {
    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-attach-base-span-attributes
    span.setAttribute('session.id', getSessionId());
    span.setAttribute('app.origin', resolveAppOrigin());
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-attach-base-span-attributes

    const runtimeConfig = _getRuntimeConfig();
    const currentRouteId = _currentRouteId;
    applySpanActionContext(span, currentRouteId);

    // Client fingerprint (basic always, high-cardinality only when debug enabled)
    applySpanClientInfo(span, runtimeConfig.includeDebugData);

    // Cohort / account attributes from runtime config
    applySpanRuntimeConfig(span, runtimeConfig);
  }
  onEnd(): void {}
  async shutdown(): Promise<void> { /* no-op: processor has no pending work */ }
  async forceFlush(): Promise<void> { /* no-op: processor has no pending work */ }
}

// ─── Initialization ──────────────────────────────────────────────────────────

export function initOtel(config: OtelConfig): void {
  // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-guard-init
  if (_initialized || !config.enabled) return;
  // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-guard-init

  // All setup in try block — _initialized only set on full success
  try {
    const appOrigin = resolveAppOrigin();

    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-build-otel-resource
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'deployment.environment': config.environment,
      'session.id': getSessionId(),
      'app.origin': appOrigin,
    });
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-build-otel-resource

    // @cpt-begin:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-build-export-pipeline
    const exporter = new OTLPTraceExporter({
      url: `${config.collectorUrl}/v1/traces`,
    });

    const batchProcessor = new BatchSpanProcessor(exporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    });
    const exportGateProcessor = new ExportGateSpanProcessor(batchProcessor);
    // @cpt-end:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-build-export-pipeline

    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-tracer-provider
    _runtimeId = `${config.serviceName}@${getSessionId()}`;
    acquireSharedTelemetryRegistry(_runtimeId);
    _provider = new WebTracerProvider({
      resource,
      spanProcessors: [new HAI3SpanProcessor(), new TelemetryStoreProcessor(_runtimeId), exportGateProcessor],
    });

    _provider.register({
      contextManager: new ZoneContextManager(),
    });
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-tracer-provider

    // Register ambient tracer so orphan spans always get an action parent
    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-ambient-tracer
    setAmbientTracer(() => trace.getTracer('hai3-ambient'));
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-ambient-tracer

    // Auto-instrumentations — only propagate trace headers to same-origin requests.
    // OTel accepts (string | RegExp)[] for propagateTraceHeaderCorsUrls; passing
    // the origin as a string yields a substring match in instrumentation-fetch,
    // which is acceptable here because appOrigin is `<protocol>://<host>` from
    // window.location and never user-supplied. Avoids `new RegExp(<variable>)`
    // (Codacy detect-non-literal-regexp).
    const corsPattern = appOrigin === 'unknown' ? [] : [appOrigin];
    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-auto-instrumentations
    _disableInstrumentations = registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          ignoreUrls: [/\/v1\/traces/, /\/v1\/metrics/, /\/v1\/logs/],
          propagateTraceHeaderCorsUrls: corsPattern,
          clearTimingResources: true,
        }),
        new DocumentLoadInstrumentation(),
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit'],
          shouldPreventSpanCreation: shouldPreventUserInteractionSpanCreation,
        }),
      ],
    });
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-auto-instrumentations

    // Flush on page hide — visibilitychange on document per spec
    // Handler captured for cleanup in shutdownOtel()
    const initDoc = getDocument();
    if (initDoc) {
      // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-visibility-flush
      _visibilityHandler = () => {
        if (initDoc.visibilityState === 'hidden') {
          _provider?.forceFlush().catch(() => { /* fail-open */ });
        }
      };
      initDoc.addEventListener('visibilitychange', _visibilityHandler);
      // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-register-visibility-flush
    }

    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-mark-sdk-initialized
    _initialized = true;
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-mark-sdk-initialized
  } catch {
    // Fail-open: clean up partial init to allow retry
    // @cpt-begin:cpt-frontx-dod-perf-telemetry-fail-open:p1:inst-reset-partial-init
    cleanupPartialInit();
    return;
    // @cpt-end:cpt-frontx-dod-perf-telemetry-fail-open:p1:inst-reset-partial-init
  }

  try {
    // Dev-only log — guarded to avoid leaking session info in production
    const meta = import.meta as { env?: { DEV?: boolean } };
    if (meta.env?.DEV) {
      // Pass literal label + structured values (Codacy detect-console-log warns
      // when the first arg is a non-literal interpolated string).
      console.info('[OTel] Initialized', {
        service: config.serviceName,
        collector: config.collectorUrl,
      });
    }
  } catch { /* fail-open: import.meta.env may not exist outside Vite */ }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function getTracer(name?: string): Tracer {
  return trace.getTracer(name || 'hai3-telemetry');
}

export function getOtelSessionId(): string {
  return getSessionId();
}

export function isOtelInitialized(): boolean {
  return _initialized;
}

export async function shutdownOtel(): Promise<void> {
  const doc = getDocument();
  if (_visibilityHandler && doc) {
    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-remove-visibility-handler
    doc.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-remove-visibility-handler
  }
  _disableInstrumentations?.();
  _disableInstrumentations = null;
  endAmbientAction();
  clearAmbientTracer();
  if (_provider) {
    // @cpt-begin:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-shutdown-provider
    await _provider.shutdown();
    _provider = null;
    _initialized = false;
    // @cpt-end:cpt-frontx-state-perf-telemetry-sdk-lifecycle:p1:inst-shutdown-provider
  }
  if (_runtimeId) {
    releaseSharedTelemetryRegistry(_runtimeId);
    _runtimeId = null;
  }
  trace.disable();
  context.disable();
}

export async function flushOtel(): Promise<void> {
  if (_provider) {
    // @cpt-begin:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-force-flush-provider
    await _provider.forceFlush();
    // @cpt-end:cpt-frontx-algo-perf-telemetry-export-gating:p2:inst-force-flush-provider
  }
}

export async function runFrontendWork<T>(
  workName: string,
  attributes: Record<string, string | number | boolean>,
  work: () => Promise<T> | T
): Promise<T> {
  const tracer = getTracer('hai3-frontend-work');
  // @cpt-begin:cpt-frontx-dod-perf-telemetry-action-first:p1:inst-resolve-work-parent-context
  const routeId = typeof attributes['route.id'] === 'string'
    ? attributes['route.id']
    : _currentRouteId;
  const parentContext = getTelemetryParentContext(routeId, performance.now()) || context.active();
  // @cpt-end:cpt-frontx-dod-perf-telemetry-action-first:p1:inst-resolve-work-parent-context
  // @cpt-begin:cpt-frontx-dod-perf-telemetry-action-first:p1:inst-start-frontend-work-span
  const span = tracer.startSpan(workName, {
    attributes: {
      'work.name': workName,
      'telemetry.breakdown.kind': 'frontend.internal',
      ...attributes,
    },
  }, parentContext);
  // @cpt-end:cpt-frontx-dod-perf-telemetry-action-first:p1:inst-start-frontend-work-span

  try {
    return await context.with(trace.setSpan(parentContext, span), () => Promise.resolve(work()));
  } catch (error) {
    // @cpt-begin:cpt-frontx-dod-perf-telemetry-fail-open:p1:inst-mark-frontend-work-error
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    // @cpt-end:cpt-frontx-dod-perf-telemetry-fail-open:p1:inst-mark-frontend-work-error
    throw error;
  } finally {
    // @cpt-begin:cpt-frontx-dod-perf-telemetry-fail-open:p1:inst-end-frontend-work-span
    span.end();
    // @cpt-end:cpt-frontx-dod-perf-telemetry-fail-open:p1:inst-end-frontend-work-span
  }
}

export { trace, context, SpanStatusCode } from '@opentelemetry/api';
export type { Span } from '@opentelemetry/api';
