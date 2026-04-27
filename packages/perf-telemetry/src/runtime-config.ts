// @cpt-flow:cpt-frontx-flow-perf-telemetry-export-toggle:p2
/**
 * Runtime Configuration — persistent telemetry config with localStorage backing.
 *
 * Provides get/set/subscribe for TelemetryRuntimeConfig. Changes are persisted
 * to localStorage and broadcast to subscribers (e.g., the Studio panel or
 * the useTelemetryRuntimeConfig hook).
 *
 * The otel-init HAI3SpanProcessor reads this config on every span start
 * via setRuntimeConfigProvider(() => getTelemetryRuntimeConfig()).
 */

import type { TelemetryRuntimeConfig, PrimitiveRecord } from './types';

const RUNTIME_CONFIG_STORE_LOCATION = 'frontx.telemetry.runtime-config.v1';

/** Whitelisted keys that are safe to persist to localStorage. */
const PERSISTABLE_KEYS: ReadonlyArray<keyof TelemetryRuntimeConfig> = [
  'exportToCollector', 'includeDebugData', 'policyProfile',
  'accountPlan', 'accountRegion', 'accountSegment', 'accountTenureBucket', 'abBucketSeed',
];

const DEFAULT_RUNTIME_CONFIG: TelemetryRuntimeConfig = {
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

/** Resolve `localStorage` defensively; returns null off-browser / when access throws. */
function getLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch { return null; }
}

let runtimeConfig = loadRuntimeConfig();
const listeners = new Set<() => void>();

/** Loads config from localStorage, whitelisting only known keys. */
function loadRuntimeConfig(): TelemetryRuntimeConfig {
  try {
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-load-persisted-config
    const storage = getLocalStorage();
    const raw = storage ? storage.getItem(RUNTIME_CONFIG_STORE_LOCATION) : null;
    if (!raw) return { ...DEFAULT_RUNTIME_CONFIG };
    // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-load-persisted-config
    const parsed = JSON.parse(raw) as PrimitiveRecord;
    const result = { ...DEFAULT_RUNTIME_CONFIG };
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-restore-whitelisted-keys
    for (const key of PERSISTABLE_KEYS) {
      const incoming = Reflect.get(parsed, key) as string | number | boolean | undefined;
      if (incoming === undefined) continue;
      const expectedType: string = typeof Reflect.get(DEFAULT_RUNTIME_CONFIG, key);
      if ((typeof incoming as string) === expectedType) {
        Reflect.set(result, key, incoming);
      }
    }
    // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-restore-whitelisted-keys
    return result;
  } catch { /* fail-open: corrupted localStorage returns defaults */
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}

/** Persists only whitelisted non-PII keys to localStorage. */
function persistRuntimeConfig(): void {
  try {
    const storage = getLocalStorage();
    if (!storage) return;
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-build-persistable-payload
    const safe: PrimitiveRecord = {};
    for (const key of PERSISTABLE_KEYS) {
      Reflect.set(safe, key, Reflect.get(runtimeConfig, key));
    }
    // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-build-persistable-payload
    // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-write-persisted-config
    storage.setItem(RUNTIME_CONFIG_STORE_LOCATION, JSON.stringify(safe));
    // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-write-persisted-config
  } catch { /* fail-open */ }
}

// @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-notify-subscribers
function notify(): void {
  listeners.forEach((listener) => { listener(); });
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-notify-subscribers

/** Get current runtime config snapshot (defensive copy). */
export function getTelemetryRuntimeConfig(): TelemetryRuntimeConfig {
  return { ...runtimeConfig };
}

/** Subscribe to runtime config changes. Returns unsubscribe function. */
export function subscribeTelemetryRuntimeConfig(listener: () => void): () => void {
  // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-subscribe-runtime-config
  listeners.add(listener);
  return () => { listeners.delete(listener); };
  // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-subscribe-runtime-config
}

/** Patch runtime config, persist to localStorage, and notify subscribers. Returns defensive copy. */
export function updateTelemetryRuntimeConfig(patch: Partial<TelemetryRuntimeConfig>): TelemetryRuntimeConfig {
  // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-apply-runtime-config-patch
  runtimeConfig = { ...runtimeConfig, ...patch };
  persistRuntimeConfig();
  notify();
  return { ...runtimeConfig };
  // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-apply-runtime-config-patch
}

/** Returns current consent mode based on includeDebugData flag. */
export function getTelemetryConsentMode(): 'anonymous' | 'support-identifiable' {
  return runtimeConfig.includeDebugData ? 'support-identifiable' : 'anonymous';
}
