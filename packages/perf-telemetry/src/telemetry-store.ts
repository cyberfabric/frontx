// @cpt-flow:cpt-hai3-flow-perf-telemetry-studio-panel:p2
/**
 * TelemetryStore — in-memory span collector for the in-app dashboard.
 *
 * Acts as a SpanProcessor: every completed span is captured here so the
 * dev tools panel can render live statistics without hitting the collector.
 */

import type { SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { Span } from '@opentelemetry/api';
import type { StoredSpan, SpanListener } from './types';

// ─── Store ───────────────────────────────────────────────────────────────────

const MAX_SPANS = 500;

let _spans: StoredSpan[] = [];
const _listeners = new Set<SpanListener>();

function notify() {
  _listeners.forEach((fn) => { try { fn(); } catch { /* fail-open: subscriber error must not break store */ } });
}

/** In-memory span store for the dev tools panel. Subscribe to receive live updates. */
export const telemetryStore = {
  /** Returns all currently stored spans, newest first. */
  getSpans(): StoredSpan[] {
    return [..._spans];
  },

  /** Subscribes to span updates. Returns an unsubscribe function. */
  subscribe(fn: SpanListener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  /** Clears all stored spans and notifies subscribers. */
  clear() {
    _spans = [];
    notify();
  },
};

// ─── SpanProcessor ───────────────────────────────────────────────────────────

function hrTimeToMs(hrTime: [number, number]): number {
  return hrTime[0] * 1000 + hrTime[1] / 1_000_000;
}

function statusCode(span: ReadableSpan): 'ok' | 'error' | 'unset' {
  const code = span.status?.code;
  if (code === 2) return 'error';
  if (code === 1) return 'ok';
  return 'unset';
}

/** OTel SpanProcessor that captures completed spans into telemetryStore for the dev panel. */
export class TelemetryStoreProcessor implements SpanProcessor {
  onStart(_span: Span): void {}

  onEnd(span: ReadableSpan): void {
    const startMs = hrTimeToMs(span.startTime);
    const endMs = hrTimeToMs(span.endTime);

    const stored: StoredSpan = {
      spanId: span.spanContext().spanId,
      traceId: span.spanContext().traceId,
      parentSpanId: (span as ReadableSpan & { parentSpanContext?: { spanId?: string } }).parentSpanContext?.spanId,
      name: span.name,
      startTimeMs: startMs,
      endTimeMs: endMs,
      durationMs: Math.max(0, endMs - startMs),
      status: statusCode(span),
      attributes: {},
    };

    // Copy attributes — flatten to primitives only
    for (const [k, v] of Object.entries(span.attributes || {})) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        stored.attributes[k] = v;
      }
    }

    _spans = [stored, ..._spans].slice(0, MAX_SPANS);
    notify();
  }

  async shutdown(): Promise<void> { /* no-op: spans stored in-memory */ }
  async forceFlush(): Promise<void> { /* no-op: spans stored in-memory */ }
}
