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

// ─── Types ──────────────────────────────────────────────────────────────────

export type Lane = 'A' | 'B' | 'C';

export type PolicyProfile = 'baseline' | 'investigation' | 'support-burst';

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

export function classifyLane(eventType: string): Lane {
  if (eventType.startsWith('runtime.error') || eventType.startsWith('runtime.kill')) return 'A';
  if (eventType.startsWith('runtime.')) return 'C';
  return 'B'; // ui.* and net.* events are standard
}

// ─── Policy Engine ──────────────────────────────────────────────────────────

export class PolicyEngine {
  private currentPolicy: CollectionPolicy;
  private eventCounter: Map<Lane, number> = new Map([['A', 0], ['B', 0], ['C', 0]]);
  private windowStartMs: number = Date.now();
  private readonly RATE_WINDOW_MS = 60000;

  constructor(initialPolicy: CollectionPolicy = BASELINE_POLICY) {
    this.currentPolicy = initialPolicy;
  }

  updatePolicy(policy: CollectionPolicy): void {
    this.currentPolicy = policy;
    this.resetRateWindow();
  }

  getPolicy(): CollectionPolicy {
    return this.currentPolicy;
  }

  shouldSampleEvent(lane: Lane): boolean {
    if (this.currentPolicy.killSwitch.active) return false;
    const rate = this.currentPolicy.samplingRates[`lane${lane}`];
    return Math.random() < rate;
  }

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

  isFeatureEnabled(feature: keyof CollectionPolicy['featureToggles']): boolean {
    if (this.currentPolicy.killSwitch.active) return false;
    return this.currentPolicy.featureToggles[feature];
  }

  getFlushIntervalMs(): number {
    return this.currentPolicy.limits.flushIntervalMs;
  }

  getMaxBatchSizeBytes(): number {
    return this.currentPolicy.limits.maxBatchSizeBytes;
  }

  isKillSwitchActive(): boolean {
    return this.currentPolicy.killSwitch.active;
  }

  getKillSwitchReason(): string | undefined {
    return this.currentPolicy.killSwitch.reason;
  }

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

export function getPolicyByProfile(profile: PolicyProfile): CollectionPolicy {
  switch (profile) {
    case 'investigation': return { ...INVESTIGATION_POLICY, updatedAt: Date.now() };
    case 'support-burst': return { ...SUPPORT_BURST_POLICY, updatedAt: Date.now() };
    default: return { ...BASELINE_POLICY, updatedAt: Date.now() };
  }
}

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
