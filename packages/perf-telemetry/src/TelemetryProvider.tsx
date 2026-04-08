// @cpt-dod:cpt-hai3-dod-perf-telemetry-fail-open:p1
/**
 * TelemetryProvider — root React context for action-first telemetry
 *
 * Wrap your app root with this provider. It initializes the OTel SDK,
 * provides emit() for backward-compat event emission, and flushes on unload.
 */

import { createContext, useContext, useLayoutEffect, useRef, useCallback, useState, useMemo } from 'react';
import { initOtel, getTracer, getOtelSessionId, flushOtel, shutdownOtel, SpanStatusCode } from './otel-init';
import { context } from '@opentelemetry/api';
import { getTelemetryParentContext } from './action-scope';
import type { TelemetryContextValue, TelemetryProviderProps } from './types';

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

/** Access the telemetry context. Must be used inside TelemetryProvider. */
export function useTelemetryContext(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetryContext must be inside TelemetryProvider');
  return ctx;
}

/** Root provider that initializes OTel SDK and exposes emit/killSwitch/sessionId. */
export function TelemetryProvider({
  children,
  serviceName = 'my-app',
  serviceVersion = '1.0.0',
  collectorUrl = 'http://localhost:14318',
  environment = 'development',
  enabled = true,
}: Readonly<TelemetryProviderProps>) {
  const [isKilled, setIsKilled] = useState(false);
  const initRef = useRef(false);

  // useLayoutEffect ensures OTel is initialized synchronously before child effects
  // (useRoutePerf, useDoneRendering) run, preventing getActionParentContext errors
  useLayoutEffect(() => {
    if (!enabled || initRef.current) return;
    initRef.current = true;
    try {
      initOtel({ serviceName, serviceVersion, collectorUrl, environment, enabled: true });
    } catch (err) {
      console.warn('[Telemetry] OTel init failed (fail-open):', err);
    }
  }, [enabled, serviceName, serviceVersion, collectorUrl, environment]);

  const emit = useCallback((type: string, routeId: string, payload: Record<string, string | number | boolean | null>) => {
    if (!enabled || isKilled) return;
    try {
      const tracer = getTracer('hai3-emit');
      const parentContext = getTelemetryParentContext(routeId, performance.now()) || context.active();
      const span = tracer.startSpan(type, {
        attributes: { 'route.id': routeId, ...flattenPayload(payload) },
      }, parentContext);
      if (type.includes('error')) {
        const errorMsg = typeof payload.errorMessage === 'string' ? payload.errorMessage : type;
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      }
      span.end();
    } catch { /* fail-open */ }
  }, [enabled, isKilled]);

  const killSwitch = useCallback(() => {
    setIsKilled(true);
    // Always attempt shutdown even if flush fails
    flushOtel().finally(() => { shutdownOtel().catch(() => { /* fail-open */ }); });
  }, []);

  const value = useMemo<TelemetryContextValue>(() => ({
    emit,
    sessionId: getOtelSessionId(),
    enabled: enabled && !isKilled,
    killSwitch,
  }), [emit, enabled, isKilled, killSwitch]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

type PayloadValue = string | number | boolean | null | undefined | PayloadValue[] | { [k: string]: PayloadValue };

function flattenPayload(payload: Record<string, PayloadValue>, prefix = ''): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(payload)) {
    const attrKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[attrKey] = value;
    } else if (Array.isArray(value)) {
      result[attrKey] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      Object.assign(result, flattenPayload(value as Record<string, PayloadValue>, attrKey));
    }
  }
  return result;
}
