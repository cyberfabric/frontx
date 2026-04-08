/**
 * @hai3/perf-telemetry - Type Definitions
 * Action-first performance telemetry types.
 */

import type { Span } from '@opentelemetry/api';

export type { Span } from '@opentelemetry/api';

export type ActionScope = {
  span: Span;
  spanId: string;
  traceId: string;
  actionName: string;
  routeId: string;
  startedAtMs: number;
  endedAtMs?: number;
};

export type RouteUiScope = {
  routeId: string;
  signalName: string;
  startedAtMs: number;
  readySpan: Span;
  uiSpan: Span;
  endedAtMs?: number;
};

export type OtelConfig = {
  serviceName: string;
  serviceVersion: string;
  collectorUrl: string;
  environment: string;
  enabled: boolean;
};

export type TelemetryRuntimeConfig = {
  exportToCollector: boolean;
  includeDebugData: boolean;
  policyProfile: PolicyProfile;
  accountId: string;
  /** Pseudonymous display name only — never store real PII */
  accountName: string;
  accountPlan: string;
  accountRegion: string;
  accountSegment: string;
  accountTenureBucket: string;
  abBucketSeed: string;
};

export type StoredSpan = {
  spanId: string;
  traceId: string;
  parentSpanId: string | undefined;
  name: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: 'ok' | 'error' | 'unset';
  attributes: Record<string, string | number | boolean>;
};

export type SpanListener = () => void;

export type TelemetryContextValue = {
  emit: (type: string, routeId: string, payload: Record<string, string | number | boolean | null>) => void;
  sessionId: string;
  enabled: boolean;
  killSwitch: () => void;
};

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

export interface TelemetryProviderProps {
  children: React.ReactNode;
  serviceName?: string;
  serviceVersion?: string;
  collectorUrl?: string;
  environment?: string;
  enabled?: boolean;
}

/** Flat key-value map of client fingerprint attributes attached to spans. */
export type ClientAttributes = Record<string, string | number | boolean>;

/** Navigator extended with Network Information API (non-standard, vendor-prefixed). */
export interface NavigatorWithConnection extends Navigator {
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  mozConnection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  webkitConnection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
}
