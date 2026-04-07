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

export function useDoneRendering(
  signalName: string,
  deps: { dataReady: boolean; [key: string]: string | number | boolean | null | undefined },
  opts?: { timeoutMs?: number }
) {
  const firedRef = useRef(false);
  const mountTimeRef = useRef(performance.now());
  const dataReadyTimeRef = useRef<number | null>(null);
  const scopeCreatedRef = useRef(false);
  const timeoutMs = opts?.timeoutMs ?? 10000;
  const routeId = signalName.endsWith('.ready') ? signalName.slice(0, -'.ready'.length) : 'unknown';

  useEffect(() => {
    if (scopeCreatedRef.current || getActiveRouteUiScope(routeId)) return;
    scopeCreatedRef.current = true;

    try {
      const mountTime = mountTimeRef.current;
      const tracer = getTracer('hai3-render');
      const parentContext = getActionParentContext(mountTime, routeId);
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

      beginRouteUiScope({ routeId, signalName, startedAtMs: mountTime, readySpan, uiSpan });
    } catch {
      scopeCreatedRef.current = false;
    }

    return () => {
      if (!firedRef.current) {
        const now = performance.now();
        const scope = endRouteUiScope(routeId, now);
        if (scope) { scope.uiSpan.end(now); scope.readySpan.end(now); }
      }
    };
  }, [routeId, signalName]);

  useEffect(() => {
    if (firedRef.current) return;
    if (deps.dataReady) {
      const jsEndTime = performance.now();
      if (!dataReadyTimeRef.current) dataReadyTimeRef.current = jsEndTime;
      firedRef.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            const paintTime = performance.now();
            const mountTime = mountTimeRef.current;
            const dataReadyTime = dataReadyTimeRef.current || jsEndTime;
            const scope = endRouteUiScope(routeId, paintTime);
            if (!scope?.readySpan || !scope?.uiSpan) return;

            scope.readySpan.setAttribute('render.total_ms', round2(paintTime - mountTime));
            scope.readySpan.setAttribute('render.external_wait_ms', round2(dataReadyTime - mountTime));
            scope.readySpan.setAttribute('render.js_to_paint_ms', round2(paintTime - dataReadyTime));
            scope.readySpan.setAttribute('render.method', 'dom-stable-double-raf');

            const relatedAttrs = getRelatedActionAttributes(routeId, paintTime);
            for (const [k, v] of Object.entries(relatedAttrs)) {
              scope.readySpan.setAttribute(k, v);
              scope.uiSpan.setAttribute(k, v);
            }

            scope.uiSpan.end(paintTime);
            scope.readySpan.end(paintTime);
          } catch { /* fail-open */ }
        });
      });
    }
  }, [deps.dataReady, signalName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        try {
          const now = performance.now();
          const scope = endRouteUiScope(routeId, now);
          if (!scope?.readySpan || !scope?.uiSpan) return;
          scope.readySpan.setAttribute('render.total_ms', round2(now - mountTimeRef.current));
          scope.readySpan.setAttribute('render.method', 'timeout-fallback');
          scope.readySpan.setAttribute('render.timed_out', true);
          scope.uiSpan.end(now);
          scope.readySpan.end(now);
        } catch { /* fail-open */ }
      }
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs, signalName]);
}

// ─── Telemetry Action ────────────────────────────────────────────────────────

export function useTelemetryAction(actionName: string, defaults?: { routeId?: string }) {
  const routeId = defaults?.routeId || 'unknown';
  return useCallback(
    async <T>(fn: () => Promise<T> | T): Promise<T> => runTelemetryAction(actionName, routeId, fn),
    [actionName, routeId]
  );
}

export async function runTelemetryAction<T>(
  actionName: string,
  routeId: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const tracer = getTracer('hai3-action');
  const startedAtMs = performance.now();
  const span = tracer.startSpan(actionName, {
    attributes: {
      'action.name': actionName,
      'route.id': routeId,
      'telemetry.breakdown.kind': 'action.total',
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

export async function instrumentedFetch(
  url: string,
  meta: { routeId: string; actionName?: string },
  init?: RequestInit,
): Promise<Response> {
  const tracer = getTracer('hai3-api');
  const method = String(init?.method || 'GET').toUpperCase();
  const startedAt = performance.now();
  const activeActionAttrs = getRelatedActionAttributes(meta.routeId, startedAt);
  const parentContext = getTelemetryParentContext(meta.routeId, startedAt) || context.active();
  const span = tracer.startSpan(`${method} ${url}`, {
    attributes: {
      'route.id': meta.routeId,
      'action.name': meta.actionName || activeActionAttrs['action.name'] || 'unknown',
      'http.url': url,
      'http.method': method,
      'telemetry.breakdown.kind': 'backend.api',
      ...activeActionAttrs,
    },
  }, parentContext);

  try {
    const response = await context.with(trace.setSpan(parentContext, span), () => fetch(url, init));
    span.setAttribute('http.status_code', response.status);
    span.setStatus({ code: response.ok ? SpanStatusCode.OK : SpanStatusCode.ERROR });
    return response;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    span.end();
  }
}

export function useInstrumentedFetch() {
  return useCallback(
    (url: string, meta: { routeId: string; actionName?: string }, init?: RequestInit) =>
      instrumentedFetch(url, meta, init),
    []
  );
}

// ─── Web Vitals ──────────────────────────────────────────────────────────────

export function useWebVitals(routeId: string, enabled = true) {
  const observersRef = useRef<PerformanceObserver[]>([]);

  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    const tracer = getTracer('hai3-webvitals');
    const observers: PerformanceObserver[] = [];

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        if (lastEntry) {
          const parentCtx = getActionParentContext(performance.now(), routeId);
          const span = tracer.startSpan('webvital.lcp', {
            attributes: {
              'route.id': routeId,
              'telemetry.breakdown.kind': 'frontend.webvitals',
              'webvital.name': 'LCP',
              'webvital.value_ms': round2(lastEntry.startTime),
              'webvital.rating': lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor',
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
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutEntry.hadRecentInput) clsValue += layoutEntry.value || 0;
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);

      const reportCLS = () => {
        if (clsValue > 0) {
          const parentCtx = getActionParentContext(performance.now(), routeId);
          const span = tracer.startSpan('webvital.cls', {
            attributes: {
              'route.id': routeId,
              'telemetry.breakdown.kind': 'frontend.webvitals',
              'webvital.name': 'CLS',
              'webvital.value': round2(clsValue),
              'webvital.rating': clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
            },
          }, parentCtx);
          span.end();
        }
      };
      document.addEventListener('visibilitychange', reportCLS, { once: true });
    } catch { /* not supported */ }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = (entry as PerformanceEntry & { duration?: number }).duration || 0;
          if (duration > 0) {
            const parentCtx = getActionParentContext(performance.now(), routeId);
            const span = tracer.startSpan('webvital.inp', {
              attributes: {
                'route.id': routeId,
                'telemetry.breakdown.kind': 'frontend.webvitals',
                'webvital.name': 'INP',
                'webvital.value_ms': round2(duration),
                'webvital.rating': duration < 200 ? 'good' : duration < 500 ? 'needs-improvement' : 'poor',
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
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        const parentCtx = getActionParentContext(performance.now(), routeId);
        const span = tracer.startSpan('webvital.navigation', {
          attributes: {
            'route.id': routeId,
            'telemetry.breakdown.kind': 'frontend.webvitals',
            'webvital.ttfb_ms': round2(nav.responseStart - nav.requestStart),
            'webvital.dom_interactive_ms': round2(nav.domInteractive - nav.fetchStart),
            'webvital.dom_complete_ms': round2(nav.domComplete - nav.fetchStart),
            'webvital.load_event_ms': round2(nav.loadEventEnd - nav.fetchStart),
          },
        }, parentCtx);
        span.end();
      }
    } catch { /* not supported */ }

    observersRef.current = observers;
    return () => { observers.forEach((o) => o.disconnect()); };
  }, [routeId, enabled]);
}

// ─── Long Task Observer ──────────────────────────────────────────────────────

export function useLongTaskObserver(routeId: string, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    try {
      const tracer = getTracer('hai3-runtime');
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
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

export function useResourceTimingObserver(routeId: string, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === 'undefined') return;
    try {
      const tracer = getTracer('hai3-runtime');
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const res = entry as PerformanceResourceTiming;
            const parentCtx = getActionParentContext(res.startTime, routeId);
            const span = tracer.startSpan('runtime.resource', {
              attributes: {
                'route.id': routeId,
                'telemetry.breakdown.kind': 'frontend.runtime',
                'resource.name': res.name,
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

function getRelatedActionAttributes(routeId: string, atMs: number): Record<string, string> {
  const relatedAction = findRelatedActionScope(atMs, routeId);
  if (!relatedAction) return {};
  return {
    'action.name': relatedAction.actionName,
    'action.scope_span_id': relatedAction.spanId,
    'action.scope_trace_id': relatedAction.traceId,
  };
}
