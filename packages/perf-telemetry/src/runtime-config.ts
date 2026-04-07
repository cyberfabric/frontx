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

const DEFAULT_RUNTIME_CONFIG: TelemetryRuntimeConfig = {
  exportToCollector: true,
  includeDebugData: false,
  policyProfile: 'baseline',
  accountId: '',
  accountName: '',
  accountEmail: '',
  accountPlan: '',
  accountRegion: '',
  accountSegment: '',
  accountTenureBucket: '',
  abBucketSeed: '',
};

let runtimeConfig = loadRuntimeConfig();
const listeners = new Set<() => void>();

function loadRuntimeConfig(): TelemetryRuntimeConfig {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_RUNTIME_CONFIG };
    return { ...DEFAULT_RUNTIME_CONFIG, ...JSON.parse(raw) } as TelemetryRuntimeConfig;
  } catch {
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}

function persistRuntimeConfig(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeConfig));
    }
  } catch { /* fail-open */ }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Get current runtime config snapshot. */
export function getTelemetryRuntimeConfig(): TelemetryRuntimeConfig {
  return runtimeConfig;
}

/** Subscribe to runtime config changes. Returns unsubscribe function. */
export function subscribeTelemetryRuntimeConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Patch runtime config, persist to localStorage, and notify subscribers. */
export function updateTelemetryRuntimeConfig(patch: Partial<TelemetryRuntimeConfig>): TelemetryRuntimeConfig {
  runtimeConfig = { ...runtimeConfig, ...patch };
  persistRuntimeConfig();
  notify();
  return runtimeConfig;
}

/** Returns current consent mode based on includeDebugData flag. */
export function getTelemetryConsentMode(): 'anonymous' | 'support-identifiable' {
  return runtimeConfig.includeDebugData ? 'support-identifiable' : 'anonymous';
}
