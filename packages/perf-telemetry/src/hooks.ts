// @cpt-flow:cpt-hai3-flow-perf-telemetry-route-instrumentation:p1
// @cpt-flow:cpt-hai3-flow-perf-telemetry-action-instrumentation:p1
// @cpt-flow:cpt-hai3-flow-perf-telemetry-api-instrumentation:p1
// @cpt-flow:cpt-hai3-flow-perf-telemetry-web-vitals:p1
// @cpt-dod:cpt-hai3-dod-perf-telemetry-route-render:p1
// @cpt-dod:cpt-hai3-dod-perf-telemetry-api:p1
// @cpt-dod:cpt-hai3-dod-perf-telemetry-vitals:p1
/**
 * Telemetry Hooks — HAI3-style instrumentation primitives
 *
 * Action-first: every span belongs to a named action.
 * These hooks work with any React 18+ app.
 *
 * Hooks provided:
 *   useRoutePerf       — route transition performance
 *   useDoneRendering   — visual readiness signal
 *   useTelemetryAction — critical action wrapper
 *   instrumentedFetch  — first-party API wrapper
 *   useWebVitals       — Core Web Vitals (LCP, CLS, INP, TTFB)
 *   useLongTaskObserver — main thread blocking detection
 *   useResourceTimingObserver — resource loading performance
 */

import { useEffect, useRef, useCallback } from 'react';
import type {
  ActionSnapshot,
  ActionTrigger,
  DoneRenderingDeps,
  DoneRenderingOptions,
  FetchMeta,
  TelemetryActionOptions,
} from './types';

// Module-level guard: navigation timing is only emitted once (page-load entry is static)
let _navigationTimingEmitted = false;
import { getTracer, setCurrentRouteId, SpanStatusCode, trace, context } from './otel-init';
import {
  beginActionScope,
  beginRouteUiScope,
  endActionScope,
  endRouteUiScope,
  findRelatedActionScope,
  getActionParentContext,
  getActiveRouteUiScope,
  getTelemetryParentContext,
} from './action-scope';

// ─── Route Performance ───────────────────────────────────────────────────────

/** Emits a `route.navigation` span on mount, measuring time from navigationStartMs to component mount. */
export function useRoutePerf(routeId: string, navigationStartMs: number) {
  const emittedRef = useRef(false);

  useEffect(() => {
    if (emittedRef.current) return;
    emittedRef.current = true;
    setCurrentRouteId(routeId);

    try {
      const tracer = getTracer('hai3-route');
      const span = tracer.startSpan('route.navigation', {
        startTime: navigationStartMs,
        attributes: {
          'route.id': routeId,
          'route.transition_type': navigationStartMs > 0 ? 'soft' : 'hard',
          'telemetry.breakdown.kind': 'frontend.route',
        },
      }, getActionParentContext(navigationStartMs, routeId));

      const mountTime = performance.now();
      span.setAttribute('route.navigation_ms', round2(mountTime - navigationStartMs));
      span.end(mountTime);
    } catch { /* fail-open */ }

    return () => { emittedRef.current = false; };
  }, [routeId, navigationStartMs]);
}

// ─── Done Rendering ──────────────────────────────────────────────────────────

/**
 * Emits a render readiness signal using double-rAF paint timing.
 * Ends the readySpan and uiSpan once `deps.dataReady` is true and two animation frames have elapsed.
 * Falls back to a timeout if dataReady never becomes true.
 */
export function useDoneRendering(
  signalName: string,
  deps: DoneRenderingDeps,
  opts?: DoneRenderingOptions
) {
  const firedRef = useRef(false);
  const mountTimeRef = useRef(performance.now());
  const dataReadyTimeRef = useRef<number | null>(null);
  const scopeCreatedRef = useRef(false);
  const rafIdsRef = useRef<number[]>([]);
  const timeoutMs = opts?.timeoutMs ?? 10000;
  const routeId = signalName.endsWith('.ready') ? signalName.slice(0, -'.ready'.length) : 'unknown';

  // Reset refs when signalName/routeId changes so stale state doesn't block new spans
  useEffect(() => {
    cancelPendingAnimationFrames(rafIdsRef.current);
    rafIdsRef.current = [];
    firedRef.current = false;
    scopeCreatedRef.current = false;
    mountTimeRef.current = performance.now();
    dataReadyTimeRef.current = null;
    return () => {
      cancelPendingAnimationFrames(rafIdsRef.current);
      rafIdsRef.current = [];
    };
  }, [signalName]);

  useEffect(() => {
    if (scopeCreatedRef.current || getActiveRouteUiScope(routeId, signalName)) return;
    scopeCreatedRef.current = true;
    const mountTime = mountTimeRef.current;

    try {
      const tracer = getTracer('hai3-render');
      const { actionSnapshot, parentContext } = resolveActionSnapshotAndParentContext(routeId, mountTime);
      const readySpan = tracer.startSpan(signalName, {
        startTime: mountTime,
        attributes: {
          'route.id': routeId,
          'signal.name': signalName,
          'telemetry.breakdown.kind': 'frontend.render',
        },
      }, parentContext);
      const uiParentContext = trace.setSpan(parentContext || context.active(), readySpan);
      const uiSpan = tracer.startSpan('ui', {
        startTime: mountTime,
        attributes: {
          'route.id': routeId,
          'signal.name': signalName,
          'telemetry.breakdown.kind': 'frontend.ui',
        },
      }, uiParentContext);

      applyActionSnapshotAttributes(actionSnapshot, readySpan, uiSpan);
      beginRouteUiScope({ routeId, signalName, startedAtMs: mountTime, readySpan, uiSpan, actionSnapshot });
    } catch { /* fail-open: reset ref so next mount can retry */
      scopeCreatedRef.current = false;
    }

    return () => {
      if (!firedRef.current) {
        const now = performance.now();
        const scope = endCapturedRouteUiScope(routeId, signalName, mountTime, now);
        if (scope) {
          applyActionSnapshotAttributes(scope.actionSnapshot, scope.readySpan, scope.uiSpan);
          scope.uiSpan.end(now);
          scope.readySpan.end(now);
        }
      }
    };
  }, [routeId, signalName]);

  useEffect(() => {
    if (firedRef.current) return;
    if (deps.dataReady) {
      const jsEndTime = performance.now();
      if (!dataReadyTimeRef.current) dataReadyTimeRef.current = jsEndTime;
      const mountTime = mountTimeRef.current;
      const dataReadyTime = dataReadyTimeRef.current || jsEndTime;
      firedRef.current = true;

      const firstRafId = requestAnimationFrame(() => {
        const secondRafId = requestAnimationFrame(() => {
          rafIdsRef.current = [];
          try {
            const paintTime = performance.now();
            const scope = endCapturedRouteUiScope(routeId, signalName, mountTime, paintTime);
            if (!scope?.readySpan || !scope?.uiSpan) return;

            scope.readySpan.setAttribute('render.total_ms', round2(paintTime - mountTime));
            scope.readySpan.setAttribute('render.external_wait_ms', round2(dataReadyTime - mountTime));
            scope.readySpan.setAttribute('render.js_to_paint_ms', round2(paintTime - dataReadyTime));
            scope.readySpan.setAttribute('render.method', 'dom-stable-double-raf');

            applyActionSnapshotAttributes(scope.actionSnapshot, scope.readySpan, scope.uiSpan);

            scope.uiSpan.end(paintTime);
            scope.readySpan.end(paintTime);
          } catch { /* fail-open */ }
        });
        rafIdsRef.current.push(secondRafId);
      });
      rafIdsRef.current.push(firstRafId);
    }
  }, [deps.dataReady, signalName, routeId]);

  useEffect(() => {
    const mountTime = mountTimeRef.current;
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        try {
          const now = performance.now();
          const scope = endCapturedRouteUiScope(routeId, signalName, mountTime, now);
          if (!scope?.readySpan || !scope?.uiSpan) return;
          applyActionSnapshotAttributes(scope.actionSnapshot, scope.readySpan, scope.uiSpan);
          scope.readySpan.setAttribute('render.total_ms', round2(now - mountTime));
          scope.readySpan.setAttribute('render.method', 'timeout-fallback');
          scope.readySpan.setAttribute('render.timed_out', true);
          scope.uiSpan.end(now);
          scope.readySpan.end(now);
        } catch { /* fail-open */ }
      }
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs, signalName, routeId]);
}

// ─── Telemetry Action ────────────────────────────────────────────────────────

// ActionTrigger, DoneRenderingDeps, FetchMeta defined in ./types.ts (single source of truth)

/** Returns a stable callback that wraps async work in a named action span with full correlation. */
export function useTelemetryAction(actionName: string, defaults?: TelemetryActionOptions) {
  const routeId = defaults?.routeId || 'unknown';
  const trigger = defaults?.trigger || 'click';
  return useCallback(
    async <T>(fn: () => Promise<T> | T): Promise<T> => runTelemetryAction(actionName, routeId, fn, trigger),
    [actionName, routeId, trigger]
  );
}

/**
 * Executes `fn` inside a named action span, recording status and correlating child spans.
 * Use this outside React or when you need programmatic control over the action boundary.
 */
export async function runTelemetryAction<T>(
  actionName: string,
  routeId: string,
  fn: () => Promise<T> | T,
  trigger: ActionTrigger = 'click'
): Promise<T> {
  const tracer = getTracer('hai3-action');
  const startedAtMs = performance.now();
  const span = tracer.startSpan(actionName, {
    attributes: {
      'action.name': actionName,
      'route.id': routeId,
      'telemetry.breakdown.kind': 'action.total',
      'action.trigger': trigger,
    },
  });
  const spanContext = span.spanContext();
  beginActionScope({ span, spanId: spanContext.spanId, traceId: spanContext.traceId, actionName, routeId, startedAtMs });
  const parentContext = trace.setSpan(context.active(), span);

  try {
    const result = await context.with(parentContext, () => fn());
    span.setAttribute('action.status', 'ok');
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setAttribute('action.status', 'error');
    span.setAttribute('action.error_type', err instanceof Error ? err.name : 'UnknownError');
    span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
    throw err;
  } finally {
    endActionScope(spanContext.spanId, performance.now());
    span.end();
  }
}

// ─── Instrumented Fetch ──────────────────────────────────────────────────────

/**
 * Fetch wrapper that creates an HTTP span correlated to the active action and route UI scope.
 * @param url - Request URL
 * @param meta - Route and optional action name for correlation
 * @param init - Standard RequestInit options
 */
export async function instrumentedFetch(
  url: string,
  meta: FetchMeta,
  init?: RequestInit,
): Promise<Response> {
  // Fail-open: if telemetry setup throws, fall back to raw fetch
  let span: ReturnType<ReturnType<typeof getTracer>['startSpan']> | null = null;
  let parentCtx = context.active();
  try {
    const tracer = getTracer('hai3-api');
    const methodRaw = String(init?.method || 'GET');
    const HTTP_UPPER: Record<string, string> = { get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE', head: 'HEAD', options: 'OPTIONS', GET: 'GET', POST: 'POST', PUT: 'PUT', PATCH: 'PATCH', DELETE: 'DELETE', HEAD: 'HEAD', OPTIONS: 'OPTIONS' };
    const method = HTTP_UPPER[methodRaw] ?? methodRaw;
    const normalizedUrl = normalizeUrlForSpan(url);
    const startedAt = performance.now();
    parentCtx = getTelemetryParentContext(meta.routeId, startedAt) || context.active();
    const activeActionAttrs = getRelatedActionAttributes(meta.routeId, startedAt);
    const resolvedActionName = meta.actionName || activeActionAttrs['action.name'] || 'unknown';
    span = tracer.startSpan(`${method} ${normalizedUrl}`, {
      attributes: {
        ...activeActionAttrs,
        'route.id': meta.routeId,
        'action.name': resolvedActionName,
        'http.url': normalizedUrl,
        'http.method': method,
        'telemetry.breakdown.kind': 'backend.api',
      },
    }, parentCtx);
  } catch { /* fail-open: telemetry setup failed, proceed with raw fetch */ }

  try {
    const fetchCtx = span ? trace.setSpan(parentCtx, span) : parentCtx;
    const response = await context.with(fetchCtx, () => fetch(url, init));
    if (span) {
      span.setAttribute('http.status_code', response.status);
      span.setStatus({ code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    }
    return response;
  } catch (error) {
    if (span) span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    span?.end();
  }
}

/** Returns a stable `instrumentedFetch` reference bound via useCallback. */
export function useInstrumentedFetch() {
  return useCallback(
    (url: string, meta: FetchMeta, init?: RequestInit) =>
      instrumentedFetch(url, meta, init),
    []
  );
}

// ─── Web Vitals ──────────────────────────────────────────────────────────────

/** Observes Core Web Vitals (LCP, CLS, INP, TTFB) and emits a span per measurement. */
export function useWebVitals(routeId: string, enabled = true) {

  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    const tracer = getTracer('hai3-webvitals');
    const observers: PerformanceObserver[] = [];
    let clsCleanup: (() => void) | null = null;
    const mountTs = performance.now();

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        // Filter buffered entries to only include those from current route mount
        const entries = list.getEntries().filter((e) => e.startTime >= mountTs);
        let lastEntry: PerformanceEntry | undefined;
        for (const entry of entries) {
          lastEntry = entry;
        }
        if (lastEntry) {
          const parentCtx = getActionParentContext(performance.now(), routeId);
          const span = tracer.startSpan('webvital.lcp', {
            attributes: {
              'route.id': routeId,
              'telemetry.breakdown.kind': 'frontend.webvitals',
              'webvital.name': 'LCP',
              'webvital.value_ms': round2(lastEntry.startTime),
              'webvital.rating': rateWebVital(lastEntry.startTime, 2500, 4000),
            },
          }, parentCtx);
          span.end();
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);
    } catch { /* not supported */ }

    try {
      let clsValue = 0;
      let clsReported = false;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime < mountTs) continue;
          const layoutEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutEntry.hadRecentInput) clsValue += layoutEntry.value || 0;
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);

      const reportCLS = () => {
        if (clsReported) return;
        clsReported = true;
        if (clsValue > 0) {
          const parentCtx = getActionParentContext(performance.now(), routeId);
          const span = tracer.startSpan('webvital.cls', {
            attributes: {
              'route.id': routeId,
              'telemetry.breakdown.kind': 'frontend.webvitals',
              'webvital.name': 'CLS',
              'webvital.value': round2(clsValue),
              'webvital.rating': rateWebVital(clsValue, 0.1, 0.25),
            },
          }, parentCtx);
          span.end();
        }
      };
      document.addEventListener('visibilitychange', reportCLS, { once: true });
      // On unmount: report accumulated CLS then remove listener
      clsCleanup = () => {
        document.removeEventListener('visibilitychange', reportCLS);
        if (!clsReported) reportCLS();
      };
    } catch { /* not supported */ }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime < mountTs) continue;
          const duration = (entry as PerformanceEntry & { duration?: number }).duration || 0;
          if (duration > 0) {
            const parentCtx = getActionParentContext(performance.now(), routeId);
            const span = tracer.startSpan('webvital.inp', {
              attributes: {
                'route.id': routeId,
                'telemetry.breakdown.kind': 'frontend.webvitals',
                'webvital.name': 'INP',
                'webvital.value_ms': round2(duration),
                'webvital.rating': rateWebVital(duration, 200, 500),
              },
            }, parentCtx);
            span.end();
          }
        }
      });
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      observers.push(inpObserver);
    } catch { /* not supported */ }

    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0 && !_navigationTimingEmitted) {
        _navigationTimingEmitted = true;
        const nav = navEntries[0];
        const parentCtx = getActionParentContext(performance.now(), routeId);
        const span = tracer.startSpan('webvital.navigation', {
          attributes: {
            'route.id': routeId,
            'telemetry.breakdown.kind': 'frontend.webvitals',
            'webvital.ttfb_ms': round2(nav.responseStart - nav.startTime),
            'webvital.dom_interactive_ms': round2(nav.domInteractive - nav.fetchStart),
            'webvital.dom_complete_ms': round2(nav.domComplete - nav.fetchStart),
            'webvital.load_event_ms': round2(nav.loadEventEnd - nav.fetchStart),
          },
        }, parentCtx);
        span.end();
      }
    } catch { /* not supported */ }

    return () => {
      observers.forEach((o) => o.disconnect());
      clsCleanup?.();
    };
  }, [routeId, enabled]);
}

// ─── Long Task Observer ──────────────────────────────────────────────────────

/** Observes `longtask` entries and emits a `runtime.long_task` span for each one. */
export function useLongTaskObserver(routeId: string, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    try {
      const tracer = getTracer('hai3-runtime');
      const mountTime = performance.now();
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime < mountTime) continue;
          if (entry.entryType === 'longtask') {
            const parentCtx = getActionParentContext(entry.startTime, routeId);
            const span = tracer.startSpan('runtime.long_task', {
              attributes: {
                'route.id': routeId,
                'telemetry.breakdown.kind': 'frontend.runtime',
                'longtask.duration_ms': round2(entry.duration),
              },
            }, parentCtx);
            span.end();
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'], buffered: true });
      return () => observer.disconnect();
    } catch { /* fail-open */ return undefined; }
  }, [routeId, enabled]);
}

// ─── Resource Timing Observer ────────────────────────────────────────────────

/** Observes `resource` timing entries and emits a `runtime.resource` span per loaded asset. */
export function useResourceTimingObserver(routeId: string, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    try {
      const tracer = getTracer('hai3-runtime');
      const mountTime = performance.now();
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.startTime < mountTime) continue;
          if (entry.entryType === 'resource') {
            const res = entry as PerformanceResourceTiming;
            const resourceName = normalizeUrlForSpan(res.name);
            const parentCtx = getActionParentContext(res.startTime, routeId);
            const span = tracer.startSpan('runtime.resource', {
              attributes: {
                'route.id': routeId,
                'telemetry.breakdown.kind': 'frontend.runtime',
                'resource.name': resourceName,
                'resource.type': res.initiatorType,
                'resource.duration_ms': round2(res.duration),
                'resource.transfer_size': res.transferSize || 0,
              },
            }, parentCtx);
            span.end();
          }
        }
      });
      observer.observe({ entryTypes: ['resource'], buffered: true });
      return () => observer.disconnect();
    } catch { /* fail-open */ return undefined; }
  }, [routeId, enabled]);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rateWebVital(value: number, good: number, poor: number): string {
  if (value < good) return 'good';
  if (value < poor) return 'needs-improvement';
  return 'poor';
}

/** Strips query string and hash from a URL to prevent cardinality explosion and data leakage. */
function normalizeUrlForSpan(url: string): string {
  try {
    const parsed = new URL(url, globalThis.window?.location?.origin || 'http://localhost');
    // Return origin + pathname only (no query, no hash)
    return parsed.origin === 'null' ? parsed.pathname : `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Fallback: strip after ? or # manually
    return url.split('?')[0].split('#')[0];
  }
}

function cancelPendingAnimationFrames(rafIds: number[]): void {
  for (const rafId of rafIds) {
    cancelAnimationFrame(rafId);
  }
}

function endCapturedRouteUiScope(
  routeId: string,
  signalName: string,
  startedAtMs: number,
  endedAtMs: number
) {
  const scope = getActiveRouteUiScope(routeId, signalName);
  if (scope?.startedAtMs !== startedAtMs) return undefined;
  return endRouteUiScope(routeId, signalName, endedAtMs);
}

function resolveActionSnapshotAndParentContext(
  routeId: string,
  atMs: number
): {
  actionSnapshot: ActionSnapshot | undefined;
  parentContext: ReturnType<typeof getActionParentContext>;
} {
  const relatedAction = findRelatedActionScope(atMs, routeId);
  if (relatedAction) {
    return {
      actionSnapshot: getActionSnapshotFromScope(relatedAction),
      parentContext: trace.setSpan(context.active(), relatedAction.span),
    };
  }

  const parentContext = getActionParentContext(atMs, routeId);
  return {
    actionSnapshot: getActionSnapshotFromScope(findRelatedActionScope(atMs, routeId)),
    parentContext,
  };
}

function getActionSnapshot(routeId: string, atMs: number): ActionSnapshot | undefined {
  return getActionSnapshotFromScope(findRelatedActionScope(atMs, routeId));
}

function getActionSnapshotFromScope(
  relatedAction: ReturnType<typeof findRelatedActionScope>
): ActionSnapshot | undefined {
  if (!relatedAction) return undefined;
  return {
    actionName: relatedAction.actionName,
    spanId: relatedAction.spanId,
    traceId: relatedAction.traceId,
    routeId: relatedAction.routeId,
  };
}

function applyActionSnapshotAttributes(
  actionSnapshot: ActionSnapshot | undefined,
  ...spans: Array<{ setAttribute: (key: string, value: string) => void }>
): void {
  const actionAttributes = getActionSnapshotAttributes(actionSnapshot);
  for (const span of spans) {
    for (const [key, value] of Object.entries(actionAttributes)) {
      span.setAttribute(key, value);
    }
  }
}

function getRelatedActionAttributes(routeId: string, atMs: number): Record<string, string> {
  return getActionSnapshotAttributes(getActionSnapshot(routeId, atMs));
}

function getActionSnapshotAttributes(actionSnapshot: ActionSnapshot | undefined): Record<string, string> {
  if (!actionSnapshot) return {};
  return {
    'action.name': actionSnapshot.actionName,
    'action.scope_span_id': actionSnapshot.spanId,
    'action.scope_trace_id': actionSnapshot.traceId,
    'route.id': actionSnapshot.routeId,
  };
}
