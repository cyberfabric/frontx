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
  policyProfile: string;
  accountId: string;
  accountName: string;
  accountEmail: string;
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

export interface TelemetryProviderProps {
  children: React.ReactNode;
  serviceName?: string;
  serviceVersion?: string;
  collectorUrl?: string;
  environment?: string;
  enabled?: boolean;
}
