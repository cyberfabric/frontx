// @cpt-flow:cpt-frontx-flow-perf-telemetry-studio-panel:p2
/**
 * TelemetryStore — in-memory span collector for the in-app dashboard.
 *
 * Acts as a SpanProcessor: every completed span is captured into the shared
 * cross-runtime registry (Symbol.for('frontx:telemetry-registry') on globalThis)
 * so the dev tools panel sees spans from host + every joined MFE runtime
 * without hitting the collector.
 */

import type { SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import type { Span } from '@opentelemetry/api';
import type { StoredSpan, SpanListener } from './types';
import {
  appendSharedSpan,
  clearSharedSpans,
  getSharedSpans,
  subscribeSharedSpans,
} from './shared-telemetry-registry';

/** In-memory span store for the dev tools panel. Subscribe to receive live updates. */
export const telemetryStore = {
  /** Returns all currently stored spans across runtimes, newest first. */
  getSpans(): StoredSpan[] {
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-read-stored-spans
    return getSharedSpans();
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-read-stored-spans
  },

  /** Subscribes to span updates. Returns an unsubscribe function. */
  subscribe(fn: SpanListener): () => void {
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-subscribe-to-store
    return subscribeSharedSpans(fn);
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-subscribe-to-store
  },

  /** Clears all stored spans and notifies subscribers. */
  clear() {
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-clear-stored-spans
    clearSharedSpans();
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-clear-stored-spans
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
  private readonly runtimeId: string;

  constructor(runtimeId: string = 'unknown') {
    this.runtimeId = runtimeId;
  }

  onStart(_span: Span): void {}

  onEnd(span: ReadableSpan): void {
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-convert-span-times
    const startMs = hrTimeToMs(span.startTime);
    const endMs = hrTimeToMs(span.endTime);
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-convert-span-times

    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-build-stored-span
    const stored: StoredSpan = {
      spanId: span.spanContext().spanId,
      traceId: span.spanContext().traceId,
      parentSpanId: (span as ReadableSpan & { parentSpanContext?: { spanId?: string } }).parentSpanContext?.spanId,
      name: span.name,
      startTimeMs: startMs,
      endTimeMs: endMs,
      durationMs: Math.max(0, endMs - startMs),
      status: statusCode(span),
      attributes: { 'frontx.runtime': this.runtimeId },
    };
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-build-stored-span

    // Copy attributes — flatten to primitives only
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-copy-primitive-attributes
    for (const [k, v] of Object.entries(span.attributes || {})) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        stored.attributes[k] = v;
      }
    }
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-copy-primitive-attributes

    // @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-store-and-publish-span
    appendSharedSpan(stored);
    // @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-store-and-publish-span
  }

  async shutdown(): Promise<void> { /* no-op: spans stored in shared registry */ }
  async forceFlush(): Promise<void> { /* no-op: spans stored in shared registry */ }
}
