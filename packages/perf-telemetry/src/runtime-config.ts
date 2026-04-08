// @cpt-flow:cpt-hai3-flow-perf-telemetry-export-toggle:p2
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

import type { TelemetryRuntimeConfig } from './types';

const STORAGE_KEY = 'hai3.telemetry.runtime-config.v1';

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

let runtimeConfig = loadRuntimeConfig();
const listeners = new Set<() => void>();

/** Loads config from localStorage, whitelisting only known keys. */
function loadRuntimeConfig(): TelemetryRuntimeConfig {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_RUNTIME_CONFIG };
    const parsed = JSON.parse(raw) as Record<string, string | number | boolean>;
    const result = { ...DEFAULT_RUNTIME_CONFIG };
    for (const key of PERSISTABLE_KEYS) {
      if (key in parsed && typeof parsed[key] === typeof DEFAULT_RUNTIME_CONFIG[key]) {
        (result as Record<string, string | number | boolean>)[key] = parsed[key];
      }
    }
    return result;
  } catch { /* fail-open: corrupted localStorage returns defaults */
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}

/** Persists only whitelisted non-PII keys to localStorage. */
function persistRuntimeConfig(): void {
  try {
    if (!globalThis.localStorage) return;
    const safe: Record<string, string | number | boolean> = {};
    for (const key of PERSISTABLE_KEYS) {
      safe[key] = runtimeConfig[key];
    }
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  } catch { /* fail-open */ }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Get current runtime config snapshot (defensive copy). */
export function getTelemetryRuntimeConfig(): TelemetryRuntimeConfig {
  return { ...runtimeConfig };
}

/** Subscribe to runtime config changes. Returns unsubscribe function. */
export function subscribeTelemetryRuntimeConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Patch runtime config, persist to localStorage, and notify subscribers. Returns defensive copy. */
export function updateTelemetryRuntimeConfig(patch: Partial<TelemetryRuntimeConfig>): TelemetryRuntimeConfig {
  runtimeConfig = { ...runtimeConfig, ...patch };
  persistRuntimeConfig();
  notify();
  return { ...runtimeConfig };
}

/** Returns current consent mode based on includeDebugData flag. */
export function getTelemetryConsentMode(): 'anonymous' | 'support-identifiable' {
  return runtimeConfig.includeDebugData ? 'support-identifiable' : 'anonymous';
}
