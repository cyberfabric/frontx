// @cpt-state:cpt-hai3-state-perf-telemetry-sdk-lifecycle:p1
// @cpt-algo:cpt-hai3-algo-perf-telemetry-export-gating:p2
// @cpt-algo:cpt-hai3-algo-perf-telemetry-session-id:p2
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
import { findRelatedActionScope, getTelemetryParentContext, setAmbientTracer, endAmbientAction } from './action-scope';
import { getClientInfo } from './client-info';
import { TelemetryStoreProcessor } from './telemetry-store';

// ─── Module state ────────────────────────────────────────────────────────────

let _provider: WebTracerProvider | null = null;
let _sessionId: string | null = null;
let _initialized = false;
let _visibilityHandler: (() => void) | null = null;

function generateSessionId(): string {
  // Use cryptographically secure random when available (all modern browsers)
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback: getRandomValues always exists on Crypto interface
  if (globalThis.crypto) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Last resort: timestamp-based (non-cryptographic, acceptable for telemetry session IDs)
  return `${Date.now()}-${performance.now().toString(36)}`;
}

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  try {
    const stored = sessionStorage.getItem('otel_session_id');
    if (stored) {
      _sessionId = stored;
    } else {
      _sessionId = generateSessionId();
      sessionStorage.setItem('otel_session_id', _sessionId);
    }
  } catch { /* fail-open: sessionStorage may be unavailable (private browsing) */
    _sessionId = generateSessionId();
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

export function setRuntimeConfigProvider(getter: () => TelemetryRuntimeConfig): void {
  _getRuntimeConfig = getter;
}

let _getRuntimeConfig: () => TelemetryRuntimeConfig = () => _runtimeConfig;

// ─── Span Processors ────────────────────────────────────────────────────────

function shouldPreventUserInteractionSpanCreation(_eventName: string, element: HTMLElement): boolean {
  const interactiveControlSelector = 'input, select, textarea, option, button, label';
  return Boolean(element.closest(interactiveControlSelector));
}

class ExportGateSpanProcessor implements SpanProcessor {
  constructor(private readonly delegate: SpanProcessor) {}
  onStart(_span: Span, _parentContext: Context): void {}
  onEnd(span: ReadableSpan): void {
    if (!_getRuntimeConfig().exportToCollector) return;
    this.delegate.onEnd(span);
  }
  async shutdown(): Promise<void> {
    // Gate shutdown to prevent flushing buffered spans when export is disabled
    if (!_getRuntimeConfig().exportToCollector) return;
    await this.delegate.shutdown();
  }
  async forceFlush(): Promise<void> {
    if (!_getRuntimeConfig().exportToCollector) return;
    await this.delegate.forceFlush();
  }
}

let _currentRouteId = 'unknown';

export function setCurrentRouteId(routeId: string): void {
  if (_currentRouteId !== routeId) {
    endAmbientAction();
  }
  _currentRouteId = routeId;
}

/**
 * Automatically attaches route.id, session.id, and action correlation
 * to every span. Guarantees action.name via ambient fallback.
 */
class HAI3SpanProcessor implements SpanProcessor {
  onStart(span: Span): void {
    span.setAttribute('session.id', getSessionId());
    span.setAttribute('app.origin', globalThis.window?.location?.origin ?? 'unknown');

    // Guarantee every span belongs to an action (ambient fallback)
    const relatedAction = findRelatedActionScope(performance.now(), _currentRouteId);
    if (relatedAction) {
      span.setAttribute('action.name', relatedAction.actionName);
      span.setAttribute('action.scope_span_id', relatedAction.spanId);
      span.setAttribute('action.scope_trace_id', relatedAction.traceId);
      span.setAttribute('route.id', relatedAction.routeId);
    } else {
      span.setAttribute('route.id', _currentRouteId);
    }

    // Client fingerprint (basic always, high-cardinality only when debug enabled)
    const clientInfo = getClientInfo(_getRuntimeConfig().includeDebugData);
    for (const [key, value] of Object.entries(clientInfo)) {
      span.setAttribute(key, value);
    }

    // Cohort / account attributes from runtime config
    const cfg = _getRuntimeConfig();
    if (cfg.accountPlan) span.setAttribute('account.plan', cfg.accountPlan);
    if (cfg.accountRegion) span.setAttribute('account.region', cfg.accountRegion);
    if (cfg.accountSegment) span.setAttribute('account.segment', cfg.accountSegment);

    if (cfg.includeDebugData) {
      // Use debug.* namespace to avoid prohibited user.* metric labels per data-contracts.md
      if (cfg.accountId) span.setAttribute('debug.account_id', cfg.accountId);
      if (cfg.accountName) span.setAttribute('debug.account_display_name', cfg.accountName);
    }
  }
  onEnd(): void {}
  async shutdown(): Promise<void> { /* no-op: processor has no pending work */ }
  async forceFlush(): Promise<void> { /* no-op: processor has no pending work */ }
}

// ─── Initialization ──────────────────────────────────────────────────────────

export function initOtel(config: OtelConfig): void {
  if (_initialized || !config.enabled) return;

  // All setup in try block — _initialized only set on full success
  try {
    const appOrigin = globalThis.window?.location?.origin ?? 'unknown';

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'deployment.environment': config.environment,
      'session.id': getSessionId(),
      'app.origin': appOrigin,
    });

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

    _provider = new WebTracerProvider({
      resource,
      spanProcessors: [new HAI3SpanProcessor(), new TelemetryStoreProcessor(), exportGateProcessor],
    });

    _provider.register({
      contextManager: new ZoneContextManager(),
    });

    // Register ambient tracer so orphan spans always get an action parent
    setAmbientTracer(() => trace.getTracer('hai3-ambient'));

    // Auto-instrumentations — only propagate trace headers to same-origin requests
    // Use split+map+join instead of replace(/g) to satisfy SonarCloud S7781
    const escapeForRegex = (s: string) => s.split('').map((c) => '.+?^${}()|[]\\'.includes(c) ? `\\${c}` : c).join('');
    const corsPattern = appOrigin === 'unknown' ? [] : [new RegExp(`^${escapeForRegex(appOrigin)}`)];
    registerInstrumentations({
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

    // Flush on page hide — visibilitychange on document per spec
    // Handler captured for cleanup in shutdownOtel()
    if (globalThis.document) {
      _visibilityHandler = () => {
        if (globalThis.document.visibilityState === 'hidden') {
          _provider?.forceFlush().catch(() => { /* fail-open */ });
        }
      };
      globalThis.document.addEventListener('visibilitychange', _visibilityHandler);
    }

    _initialized = true;
  } catch {
    // Fail-open: clean up partial init to allow retry
    _provider = null;
    return;
  }

  try {
    // Dev-only log — guarded to avoid leaking session info in production
    const meta: Record<string, Record<string, boolean>> = import.meta as never;
    if (meta.env?.DEV) {
      console.log(`[OTel] Initialized: service=${config.serviceName}, collector=${config.collectorUrl}`);
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
  if (_visibilityHandler && globalThis.document) {
    globalThis.document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
  if (_provider) {
    await _provider.shutdown();
    _provider = null;
    _initialized = false;
  }
}

export async function flushOtel(): Promise<void> {
  if (_provider) {
    await _provider.forceFlush();
  }
}

export async function runFrontendWork<T>(
  workName: string,
  attributes: Record<string, string | number | boolean>,
  work: () => Promise<T> | T
): Promise<T> {
  const tracer = getTracer('hai3-frontend-work');
  const routeId = typeof attributes['route.id'] === 'string'
    ? attributes['route.id']
    : _currentRouteId;
  const parentContext = getTelemetryParentContext(routeId, performance.now()) || context.active();
  const span = tracer.startSpan(workName, {
    attributes: {
      'work.name': workName,
      'telemetry.breakdown.kind': 'frontend.internal',
      ...attributes,
    },
  }, parentContext);

  try {
    return await context.with(trace.setSpan(parentContext, span), () => Promise.resolve(work()));
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    span.end();
  }
}

export { trace, context, SpanStatusCode } from '@opentelemetry/api';
export type { Span } from '@opentelemetry/api';
