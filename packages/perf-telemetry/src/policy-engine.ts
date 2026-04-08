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

/** Returns a cryptographically secure random float in [0, 1). */
function cryptoRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / 4294967296; // 2^32
}

// ─── Types ──────────────────────────────────────────────────────────────────

/** Telemetry event priority lane. A = critical errors, B = UI/network, C = runtime diagnostics. */
export type Lane = 'A' | 'B' | 'C';

/** Named policy profile controlling sampling rates and feature toggles. */
export type PolicyProfile = 'baseline' | 'investigation' | 'support-burst';

/** Full collection policy snapshot: sampling rates, rate limits, feature toggles, and kill switch state. */
export type CollectionPolicy = {
  version: number;
  updatedAt: number;
  profile: PolicyProfile;
  samplingRates: {
    laneA: number;
    laneB: number;
    laneC: number;
  };
  limits: {
    maxEventsPerMinute: number;
    maxBatchSizeBytes: number;
    flushIntervalMs: number;
  };
  featureToggles: {
    networkDiagnostics: boolean;
    actionTracing: boolean;
    resourceTiming: boolean;
    longTaskObserver: boolean;
  };
  killSwitch: {
    active: boolean;
    reason?: string;
    activatedAt?: number;
  };
  ttl: number;
};

// ─── Predefined Policies ────────────────────────────────────────────────────

/** Default policy: full lane A/B collection, 10% lane C, resource timing and long tasks disabled. */
export const BASELINE_POLICY: CollectionPolicy = {
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
};

/** High-fidelity policy: all lanes at 100%, all feature toggles on, short TTL for incident investigation. */
export const INVESTIGATION_POLICY: CollectionPolicy = {
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
};

/** Elevated policy for support sessions: increased limits, resource timing on, 50% lane C. */
export const SUPPORT_BURST_POLICY: CollectionPolicy = {
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
};

/** Emergency policy that sets all sampling to 0 and activates the kill switch. */
export const KILL_SWITCH_POLICY: CollectionPolicy = {
  version: 1,
  updatedAt: Date.now(),
  profile: 'baseline',
  samplingRates: { laneA: 0, laneB: 0, laneC: 0 },
  limits: { maxEventsPerMinute: 0, maxBatchSizeBytes: 0, flushIntervalMs: 0 },
  featureToggles: { networkDiagnostics: false, actionTracing: false, resourceTiming: false, longTaskObserver: false },
  killSwitch: { active: true, reason: 'Manual kill switch activated', activatedAt: Date.now() },
  ttl: 60,
};

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
  private eventCounter: Map<Lane, number> = new Map([['A', 0], ['B', 0], ['C', 0]]);
  private windowStartMs: number = Date.now();
  private readonly RATE_WINDOW_MS = 60000;

  constructor(initialPolicy: CollectionPolicy = BASELINE_POLICY) {
    this.currentPolicy = structuredClone(initialPolicy);
  }

  /** Replaces the active policy (deep-cloned) and resets the rate window. */
  updatePolicy(policy: CollectionPolicy): void {
    this.currentPolicy = structuredClone(policy);
    this.resetRateWindow();
  }

  /** Returns a deep copy of the currently active collection policy. */
  getPolicy(): CollectionPolicy {
    return structuredClone(this.currentPolicy);
  }

  /** Returns true if the event should be sampled based on the lane's configured rate. */
  shouldSampleEvent(lane: Lane): boolean {
    if (this.currentPolicy.killSwitch.active) return false;
    const rate = this.currentPolicy.samplingRates[`lane${lane}`];
    return cryptoRandom() < rate;
  }

  /** Evaluates kill switch, rate limit, and sampling in order; returns accept/reject with reason. */
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

  /** Returns true if the given feature toggle is enabled and the kill switch is inactive. */
  isFeatureEnabled(feature: keyof CollectionPolicy['featureToggles']): boolean {
    if (this.currentPolicy.killSwitch.active) return false;
    return this.currentPolicy.featureToggles[feature];
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
    return this.currentPolicy.killSwitch.reason;
  }

  /** Returns per-lane event counts and limits for the current rate window. */
  getStats(): { lane: Lane; count: number; limit: number }[] {
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns a fresh CollectionPolicy instance for the given profile name. */
export function getPolicyByProfile(profile: PolicyProfile): CollectionPolicy {
  switch (profile) {
    case 'investigation': return { ...INVESTIGATION_POLICY, updatedAt: Date.now() };
    case 'support-burst': return { ...SUPPORT_BURST_POLICY, updatedAt: Date.now() };
    default: return { ...BASELINE_POLICY, updatedAt: Date.now() };
  }
}

/** Deep-merges policy overrides into a base policy, refreshing the updatedAt timestamp. */
export function mergePolicy(base: CollectionPolicy, overrides: Partial<CollectionPolicy>): CollectionPolicy {
  return {
    ...base,
    ...overrides,
    samplingRates: { ...base.samplingRates, ...overrides.samplingRates },
    limits: { ...base.limits, ...overrides.limits },
    featureToggles: { ...base.featureToggles, ...overrides.featureToggles },
    killSwitch: { ...base.killSwitch, ...overrides.killSwitch },
    updatedAt: Date.now(),
  };
}
