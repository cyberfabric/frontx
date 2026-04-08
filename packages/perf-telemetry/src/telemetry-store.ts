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

// @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-notify-span-listeners
function notify() {
  _listeners.forEach((fn) => { try { fn(); } catch { /* fail-open: subscriber error must not break store */ } });
}
// @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-notify-span-listeners

/** In-memory span store for the dev tools panel. Subscribe to receive live updates. */
export const telemetryStore = {
  /** Returns all currently stored spans, newest first. */
  getSpans(): StoredSpan[] {
    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-read-stored-spans
    return [..._spans];
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-read-stored-spans
  },

  /** Subscribes to span updates. Returns an unsubscribe function. */
  subscribe(fn: SpanListener): () => void {
    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-subscribe-to-store
    _listeners.add(fn);
    return () => _listeners.delete(fn);
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-subscribe-to-store
  },

  /** Clears all stored spans and notifies subscribers. */
  clear() {
    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-clear-stored-spans
    _spans = [];
    notify();
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-clear-stored-spans
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
    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-convert-span-times
    const startMs = hrTimeToMs(span.startTime);
    const endMs = hrTimeToMs(span.endTime);
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-convert-span-times

    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-build-stored-span
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
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-build-stored-span

    // Copy attributes — flatten to primitives only
    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-copy-primitive-attributes
    for (const [k, v] of Object.entries(span.attributes || {})) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        stored.attributes[k] = v;
      }
    }
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-copy-primitive-attributes

    // @cpt-begin:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-store-and-publish-span
    _spans = [stored, ..._spans].slice(0, MAX_SPANS);
    notify();
    // @cpt-end:cpt-hai3-flow-perf-telemetry-studio-panel:p2:inst-store-and-publish-span
  }

  async shutdown(): Promise<void> { /* no-op: spans stored in-memory */ }
  async forceFlush(): Promise<void> { /* no-op: spans stored in-memory */ }
}
