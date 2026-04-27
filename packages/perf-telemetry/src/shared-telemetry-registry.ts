// @cpt-flow:cpt-frontx-flow-perf-telemetry-cross-runtime-registry:p1
// @cpt-algo:cpt-frontx-algo-perf-telemetry-cross-runtime-registry:p1
// @cpt-state:cpt-frontx-state-perf-telemetry-shared-registry:p1
// @cpt-dod:cpt-frontx-dod-perf-telemetry-cross-runtime-registry:p1
/**
 * Shared telemetry registry for cross-runtime span aggregation.
 *
 * Stored on globalThis so multiple bundle instances in the same realm
 * (host + MFE child runtimes) converge on one telemetry store without
 * introducing direct dependencies between runtimes.
 *
 * Mirrors the pattern established by `sharedFetchCache` in @cyberfabric/api:
 *   - Symbol.for() key on globalThis
 *   - Singleton with retain/release counters
 *   - Versioned protocol so older/newer runtimes can fail-soft
 *
 * Lifecycle:
 *   - initOtel() retains the registry; appends spans into the shared buffer
 *   - shutdownOtel() releases the registry; resets when last retainer leaves
 *   - Subscribers are kept on the shared store so Studio sees host + child spans
 */

import type { StoredSpan, SpanListener } from './types';

/** Bumped when the registry shape changes incompatibly. */
export const SHARED_TELEMETRY_REGISTRY_VERSION: number = 1;

/** Default cap to keep the shared buffer bounded. Matches the per-runtime store. */
const DEFAULT_MAX_SPANS = 500;

export const SHARED_TELEMETRY_REGISTRY_SYMBOL = Symbol.for('frontx:telemetry-registry');

interface SharedTelemetryRegistryV1 {
  readonly version: number;
  spans: StoredSpan[];
  readonly listeners: Set<SpanListener>;
  readonly runtimes: Set<string>;
  retainers: number;
  maxSpans: number;
}

function createRegistry(): SharedTelemetryRegistryV1 {
  return {
    version: SHARED_TELEMETRY_REGISTRY_VERSION,
    spans: [],
    listeners: new Set(),
    runtimes: new Set(),
    retainers: 0,
    maxSpans: DEFAULT_MAX_SPANS,
  };
}

function readRegistry(): SharedTelemetryRegistryV1 | undefined {
  // Symbol-keyed reflection avoids string-key computed access that Codacy's
  // generic-object-injection-sink rule flags; Reflect.get accepts a Symbol key.
  const value = Reflect.get(globalThis, SHARED_TELEMETRY_REGISTRY_SYMBOL) as SharedTelemetryRegistryV1 | undefined;
  if (!value || value.version !== SHARED_TELEMETRY_REGISTRY_VERSION) {
    // Fail-soft: if a foreign / older shape is parked at the symbol, leave it
    // alone and fall back to a private registry by returning undefined here.
    return undefined;
  }
  return value;
}

function parkRegistry(registry: SharedTelemetryRegistryV1): void {
  Reflect.set(globalThis, SHARED_TELEMETRY_REGISTRY_SYMBOL, registry);
}

function unparkRegistry(): void {
  Reflect.deleteProperty(globalThis, SHARED_TELEMETRY_REGISTRY_SYMBOL);
}

function isUnparked(): boolean {
  return Reflect.get(globalThis, SHARED_TELEMETRY_REGISTRY_SYMBOL) === undefined;
}

function ensureRegistry(): SharedTelemetryRegistryV1 {
  const existing = readRegistry();
  if (existing) return existing;
  // Either nothing is parked, or an incompatible value is parked. In the
  // incompatible case we keep the foreign value untouched and return a
  // fresh local registry so writes still work without crashing the host.
  if (isUnparked()) {
    const fresh = createRegistry();
    parkRegistry(fresh);
    return fresh;
  }
  return createRegistry();
}

function notify(registry: SharedTelemetryRegistryV1): void {
  registry.listeners.forEach((fn) => {
    try { fn(); } catch { /* fail-open: subscriber error must not break store */ }
  });
}

// @cpt-begin:cpt-frontx-flow-perf-telemetry-cross-runtime-registry:p1:inst-acquire
/**
 * Retain the shared telemetry registry for a runtime. Idempotent per runtimeId.
 * Call from initOtel; pair with `releaseSharedTelemetryRegistry(runtimeId)` on shutdown.
 */
export function acquireSharedTelemetryRegistry(runtimeId: string): void {
  try {
    const registry = ensureRegistry();
    if (registry.runtimes.has(runtimeId)) return;
    registry.runtimes.add(runtimeId);
    registry.retainers += 1;
  } catch { /* fail-soft: never break host on registry I/O */ }
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-cross-runtime-registry:p1:inst-acquire

// @cpt-begin:cpt-frontx-flow-perf-telemetry-cross-runtime-registry:p1:inst-release
/**
 * Release the shared registry for a runtime. Resets the registry when the
 * last retainer leaves so memory is reclaimed in test/teardown scenarios.
 */
export function releaseSharedTelemetryRegistry(runtimeId: string): void {
  try {
    const registry = readRegistry();
    if (!registry) return;
    if (!registry.runtimes.delete(runtimeId)) return;
    registry.retainers = Math.max(0, registry.retainers - 1);
    if (registry.retainers === 0) {
      registry.spans = [];
      registry.listeners.clear();
      unparkRegistry();
    }
  } catch { /* fail-soft */ }
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-cross-runtime-registry:p1:inst-release

/** Append a span to the shared buffer. Fail-soft if the registry is unreachable. */
export function appendSharedSpan(span: StoredSpan): void {
  try {
    const registry = ensureRegistry();
    registry.spans = [span, ...registry.spans].slice(0, registry.maxSpans);
    notify(registry);
  } catch { /* fail-soft */ }
}

/** Read the current span buffer (newest first). Returns a copy. */
export function getSharedSpans(): StoredSpan[] {
  const registry = readRegistry();
  return registry ? [...registry.spans] : [];
}

/** Subscribe to span updates. Returns an unsubscribe fn (no-op if registry missing). */
export function subscribeSharedSpans(listener: SpanListener): () => void {
  try {
    const registry = ensureRegistry();
    registry.listeners.add(listener);
    return () => {
      try {
        const current = readRegistry();
        current?.listeners.delete(listener);
      } catch { /* fail-soft */ }
    };
  } catch {
    return () => { /* no-op: registry unreachable, nothing to unsubscribe */ };
  }
}

/** Clear all spans across runtimes. Notifies subscribers. */
export function clearSharedSpans(): void {
  try {
    const registry = readRegistry();
    if (!registry) return;
    registry.spans = [];
    notify(registry);
  } catch { /* fail-soft */ }
}

/** Inspect the registry without creating one. Used by Studio to detect liveness. */
export function peekSharedTelemetryRegistry(): {
  version: number;
  runtimes: readonly string[];
  spanCount: number;
} | undefined {
  const registry = readRegistry();
  if (!registry) return undefined;
  return {
    version: registry.version,
    runtimes: [...registry.runtimes],
    spanCount: registry.spans.length,
  };
}

/** Test helper. Do not call from production code. */
export function resetSharedTelemetryRegistry(): void {
  unparkRegistry();
}
