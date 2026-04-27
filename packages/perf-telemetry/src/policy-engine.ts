// @cpt-flow:cpt-frontx-flow-perf-telemetry-export-toggle:p2
/**
 * Policy Engine — collection policies, sampling, rate limiting, and kill switch.
 *
 * Provides predefined policy profiles (baseline, investigation, support-burst)
 * and handles sampling decisions, rate limiting, and feature toggles.
 *
 * Usage:
 *   const engine = new PolicyEngine();
 *   if (engine.shouldAcceptEvent('B').accept) { ... }
 *   if (engine.isFeatureEnabled('resourceTiming')) { ... }
 */

// ─── CSPRNG Helper ──────────────────────────────────────────────────────────

type FreezableValue = FreezableRecord | string | number | boolean | null | undefined;

interface FreezableRecord {
  [key: string]: FreezableValue;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value as Readonly<T>;
  }

  for (const nestedValue of Object.values(
    value as FreezableRecord
  )) {
    if (nestedValue && typeof nestedValue === 'object') {
      deepFreeze(nestedValue);
    }
  }

  return Object.freeze(value);
}

/** Returns the `Crypto` instance via globalThis when present, null otherwise (Node/JSDOM compat). */
function getCryptoApi(): Crypto | null {
  return Reflect.get(globalThis, 'crypto') as Crypto | undefined ?? null;
}

/** Returns a cryptographically secure random float in [0, 1). */
// @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-check-crypto-rng
function hasCryptoRandomValues(): boolean {
  return typeof getCryptoApi()?.getRandomValues === 'function';
}

function cryptoRandom(): number {
  const array = new Uint32Array(1);
  getCryptoApi()?.getRandomValues(array);
  return array[0] / 4294967296; // 2^32
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-check-crypto-rng

// ─── Types (canonical definitions in ./types.ts) ───────────────────────────

import type { Lane, PolicyProfile, CollectionPolicy, PolicyOverrides } from './types';

// ─── Predefined Policies (frozen — use getPolicyByProfile() for mutable copies) ─

/** Default policy: full lane A/B collection, 10% lane C, resource timing and long tasks disabled. */
export const BASELINE_POLICY: Readonly<CollectionPolicy> = deepFreeze({
  version: 1,
  updatedAt: Date.now(),
  profile: 'baseline',
  samplingRates: {
    laneA: 1,   // Always collect critical errors
    laneB: 1,   // Full collection of UI and network events
    laneC: 0.1,   // 10% sampling for runtime diagnostics
  },
  limits: {
    maxEventsPerMinute: 600,
    maxBatchSizeBytes: 65536,
    flushIntervalMs: 5000,
  },
  featureToggles: {
    networkDiagnostics: true,
    actionTracing: true,
    resourceTiming: false,
    longTaskObserver: false,
  },
  killSwitch: { active: false },
  ttl: 300,
});

/** High-fidelity policy: all lanes at 100%, all feature toggles on, short TTL for incident investigation. */
export const INVESTIGATION_POLICY: Readonly<CollectionPolicy> = deepFreeze({
  version: 1,
  updatedAt: Date.now(),
  profile: 'investigation',
  samplingRates: {
    laneA: 1,
    laneB: 1,
    laneC: 1,   // Full collection for deep diagnostics
  },
  limits: {
    maxEventsPerMinute: 1200,
    maxBatchSizeBytes: 131072,
    flushIntervalMs: 2000,
  },
  featureToggles: {
    networkDiagnostics: true,
    actionTracing: true,
    resourceTiming: true,
    longTaskObserver: true,
  },
  killSwitch: { active: false },
  ttl: 60,
});

/** Elevated policy for support sessions: increased limits, resource timing on, 50% lane C. */
export const SUPPORT_BURST_POLICY: Readonly<CollectionPolicy> = deepFreeze({
  version: 1,
  updatedAt: Date.now(),
  profile: 'support-burst',
  samplingRates: {
    laneA: 1,
    laneB: 1,
    laneC: 0.5,
  },
  limits: {
    maxEventsPerMinute: 900,
    maxBatchSizeBytes: 98304,
    flushIntervalMs: 3000,
  },
  featureToggles: {
    networkDiagnostics: true,
    actionTracing: true,
    resourceTiming: true,
    longTaskObserver: false,
  },
  killSwitch: { active: false },
  ttl: 120,
});

/** Emergency policy that sets all sampling to 0 and activates the kill switch. */
export const KILL_SWITCH_POLICY: Readonly<CollectionPolicy> = deepFreeze({
  version: 1,
  updatedAt: Date.now(),
  profile: 'kill-switch',
  samplingRates: { laneA: 0, laneB: 0, laneC: 0 },
  limits: { maxEventsPerMinute: 0, maxBatchSizeBytes: 0, flushIntervalMs: 0 },
  featureToggles: { networkDiagnostics: false, actionTracing: false, resourceTiming: false, longTaskObserver: false },
  killSwitch: { active: true, reason: 'Manual kill switch activated', activatedAt: Date.now() },
  ttl: 60,
});

// ─── Lane Classification ────────────────────────────────────────────────────

/** Maps an event type string to a collection lane (A/B/C) based on namespace prefix. */
export function classifyLane(eventType: string): Lane {
  if (eventType.startsWith('runtime.error') || eventType.startsWith('runtime.kill')) return 'A';
  if (eventType.startsWith('runtime.')) return 'C';
  return 'B'; // ui.* and net.* events are standard
}

// ─── Policy Engine ──────────────────────────────────────────────────────────

/** Runtime policy engine: evaluates sampling decisions and rate limits for each telemetry event. */
export class PolicyEngine {
  private currentPolicy: CollectionPolicy;
  private readonly eventCounter: Map<Lane, number> = new Map([['A', 0], ['B', 0], ['C', 0]]);
  private readonly sampleCarry: Map<Lane, number> = new Map([['A', 0], ['B', 0], ['C', 0]]);
  private windowStartMs: number = Date.now();
  private readonly RATE_WINDOW_MS = 60000;
  private readonly random?: () => number;

  constructor(initialPolicy: CollectionPolicy = BASELINE_POLICY, random?: () => number) {
    this.currentPolicy = structuredClone(initialPolicy);
    this.random = random;
  }

  /** Replaces the active policy (deep-cloned) and resets the rate window. */
  updatePolicy(policy: CollectionPolicy): void {
    this.currentPolicy = structuredClone(policy);
    this.resetSampleCarry();
    this.resetRateWindow();
  }

  /** Returns a deep copy of the currently active collection policy. */
  getPolicy(): CollectionPolicy {
    return structuredClone(this.currentPolicy);
  }

  /** Returns true if the event should be sampled based on the lane's configured rate. */
  // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-sample-event
  shouldSampleEvent(lane: Lane): boolean {
    if (this.currentPolicy.killSwitch.active) return false;
    const rate = this.currentPolicy.samplingRates[`lane${lane}`];
    if (rate <= 0) return false;
    if (rate >= 1) return true;

    const randomValue = this.random?.();
    if (typeof randomValue === 'number') {
      return randomValue < rate;
    }

    if (hasCryptoRandomValues()) {
      return cryptoRandom() < rate;
    }

    return this.shouldSampleDeterministically(lane, rate);
  }
  // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-sample-event

  /** Evaluates kill switch, per-lane rate limit, and sampling in order. Rate limits are intentionally per-lane (each lane has its own budget, e.g., lane A for critical errors gets a separate quota from lane C diagnostics). */
  // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-accept-event
  shouldAcceptEvent(lane: Lane): { accept: boolean; reason?: string } {
    if (this.currentPolicy.killSwitch.active) {
      return { accept: false, reason: 'kill_switch_active' };
    }

    this.checkRateWindow();
    const currentCount = this.eventCounter.get(lane) || 0;

    if (currentCount >= this.currentPolicy.limits.maxEventsPerMinute) {
      return { accept: false, reason: 'rate_limit_exceeded' };
    }

    this.eventCounter.set(lane, currentCount + 1);

    if (!this.shouldSampleEvent(lane)) {
      this.eventCounter.set(lane, currentCount);
      return { accept: false, reason: 'sampling_rejected' };
    }

    return { accept: true };
  }
  // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-accept-event

  /** Returns true if the given feature toggle is enabled and the kill switch is inactive. */
  isFeatureEnabled(feature: keyof CollectionPolicy['featureToggles']): boolean {
    if (this.currentPolicy.killSwitch.active) return false;
    return Boolean(Reflect.get(this.currentPolicy.featureToggles, feature));
  }

  /** Returns the configured batch flush interval in milliseconds. */
  getFlushIntervalMs(): number {
    return this.currentPolicy.limits.flushIntervalMs;
  }

  /** Returns the maximum allowed batch size in bytes. */
  getMaxBatchSizeBytes(): number {
    return this.currentPolicy.limits.maxBatchSizeBytes;
  }

  /** Returns true if the kill switch is currently active. */
  isKillSwitchActive(): boolean {
    return this.currentPolicy.killSwitch.active;
  }

  /** Returns the human-readable reason the kill switch was activated, or undefined if inactive. */
  getKillSwitchReason(): string | undefined {
    return this.currentPolicy.killSwitch.active ? this.currentPolicy.killSwitch.reason : undefined;
  }

  /** Returns per-lane event counts and limits for the current rate window. Resets stale windows before returning. */
  getStats(): { lane: Lane; count: number; limit: number }[] {
    this.checkRateWindow();
    return (['A', 'B', 'C'] as Lane[]).map((lane) => ({
      lane,
      count: this.eventCounter.get(lane) || 0,
      limit: this.currentPolicy.limits.maxEventsPerMinute,
    }));
  }

  private checkRateWindow(): void {
    if (Date.now() - this.windowStartMs >= this.RATE_WINDOW_MS) {
      this.resetRateWindow();
    }
  }

  private resetRateWindow(): void {
    this.windowStartMs = Date.now();
    this.eventCounter.set('A', 0);
    this.eventCounter.set('B', 0);
    this.eventCounter.set('C', 0);
  }

  // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-reset-deterministic-sampler
  private resetSampleCarry(): void {
    this.sampleCarry.set('A', 0);
    this.sampleCarry.set('B', 0);
    this.sampleCarry.set('C', 0);
  }
  // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-reset-deterministic-sampler

  // @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-deterministic-sampling-fallback
  private shouldSampleDeterministically(lane: Lane, rate: number): boolean {
    const nextCarry = (this.sampleCarry.get(lane) || 0) + rate;
    if (nextCarry >= 1) {
      this.sampleCarry.set(lane, nextCarry - 1);
      return true;
    }

    this.sampleCarry.set(lane, nextCarry);
    return false;
  }
  // @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-deterministic-sampling-fallback
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns a fresh CollectionPolicy instance for the given profile name. */
// @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-get-policy-profile
export function getPolicyByProfile(profile: PolicyProfile): CollectionPolicy {
  const now = Date.now();
  switch (profile) {
    case 'investigation': return { ...structuredClone(INVESTIGATION_POLICY), updatedAt: now };
    case 'support-burst': return { ...structuredClone(SUPPORT_BURST_POLICY), updatedAt: now };
    case 'kill-switch': {
      const policy = structuredClone(KILL_SWITCH_POLICY);
      return {
        ...policy,
        killSwitch: { ...policy.killSwitch, activatedAt: now },
        updatedAt: now,
      };
    }
    default: return { ...structuredClone(BASELINE_POLICY), updatedAt: now };
  }
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-get-policy-profile

/** Shallow-merge policy overrides for top-level fields; nested objects (samplingRates, limits, featureToggles, killSwitch) are merged one level deep. */
// @cpt-begin:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-merge-policy-overrides
export function mergePolicy(base: CollectionPolicy, overrides: PolicyOverrides): CollectionPolicy {
  const cloned = structuredClone(base);
  return {
    ...cloned,
    ...(overrides.version !== undefined && { version: overrides.version }),
    ...(overrides.profile !== undefined && { profile: overrides.profile }),
    ...(overrides.ttl !== undefined && { ttl: overrides.ttl }),
    samplingRates: { ...cloned.samplingRates, ...overrides.samplingRates },
    limits: { ...cloned.limits, ...overrides.limits },
    featureToggles: { ...cloned.featureToggles, ...overrides.featureToggles },
    killSwitch: (() => {
      const merged = { ...cloned.killSwitch, ...overrides.killSwitch };
      // Clear stale metadata when kill switch is deactivated
      if (!merged.active) { merged.reason = undefined; merged.activatedAt = undefined; }
      return merged;
    })(),
    updatedAt: Date.now(),
  };
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-export-toggle:p2:inst-merge-policy-overrides
