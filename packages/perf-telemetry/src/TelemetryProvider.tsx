/**
 * TelemetryProvider — root React context for action-first telemetry
 *
 * Wrap your app root with this provider. It initializes the OTel SDK,
 * provides emit() for backward-compat event emission, and flushes on unload.
 */

import { createContext, useContext, useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { initOtel, getTracer, getOtelSessionId, flushOtel, SpanStatusCode } from './otel-init';
import { context } from '@opentelemetry/api';
import { getTelemetryParentContext } from './action-scope';
import type { TelemetryContextValue, TelemetryProviderProps } from './types';

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function useTelemetryContext(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetryContext must be inside TelemetryProvider');
  return ctx;
}

export function TelemetryProvider({
  children,
  serviceName = 'my-app',
  serviceVersion = '1.0.0',
  collectorUrl = 'http://localhost:14318',
  environment = 'development',
  enabled = true,
}: TelemetryProviderProps) {
  const [isKilled, setIsKilled] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!enabled || initRef.current) return;
    initRef.current = true;
    try {
      initOtel({ serviceName, serviceVersion, collectorUrl, environment, enabled: true });
    } catch (err) {
      console.warn('[Telemetry] OTel init failed (fail-open):', err);
    }
  }, [enabled, serviceName, serviceVersion, collectorUrl, environment]);

  useEffect(() => {
    const handleUnload = () => { flushOtel().catch(() => {}); };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  const emit = useCallback((type: string, routeId: string, payload: Record<string, unknown>) => {
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

  const killSwitch = useCallback(() => setIsKilled(true), []);

  const value = useMemo<TelemetryContextValue>(() => ({
    emit,
    sessionId: getOtelSessionId(),
    enabled: enabled && !isKilled,
    killSwitch,
  }), [emit, enabled, isKilled, killSwitch]);

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

function flattenPayload(payload: Record<string, unknown>, prefix = ''): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(payload)) {
    const attrKey = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[attrKey] = value;
    } else if (Array.isArray(value)) {
      result[attrKey] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      Object.assign(result, flattenPayload(value as Record<string, unknown>, attrKey));
    }
  }
  return result;
}
