/**
 * PerfTelemetryPanel — Performance telemetry dev panel for HAI3 Studio
 *
 * Displays live performance data from @hai3/perf-telemetry when available.
 * Shows KPI cards, action breakdown, API stats, and web vitals.
 * Only renders when the perf-telemetry package is installed.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@hai3/react';
import { useStudioContext } from '../StudioProvider';
import { loadStudioState, saveStudioState } from '../utils/persistence';

// ─── Types (from @hai3/perf-telemetry, defined here to avoid hard dependency) ─

interface StoredSpan {
  spanId: string;
  traceId: string;
  parentSpanId: string | undefined;
  name: string;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  status: 'ok' | 'error' | 'unset';
  attributes: Record<string, string | number | boolean>;
}

interface TelemetryStoreApi {
  getSpans(): StoredSpan[];
  subscribe(fn: () => void): () => void;
  clear(): void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY_PERF_ENABLED = 'hai3:studio:perfTelemetry';
const STORAGE_KEY_PERF_TAB = 'hai3:studio:perfTelemetryTab';

type PerfTab = 'actions' | 'api' | 'rendering';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

function ratingColor(rating: string | number | boolean | undefined): string {
  const r = String(rating);
  if (r === 'good') return 'color: #16a34a';
  if (r === 'needs-improvement') return 'color: #ca8a04';
  if (r === 'poor') return 'color: #dc2626';
  return 'color: #6b7280';
}

// ─── useTelemetryStore ──────────────────────────────────────────────────────

function useTelemetryStore(): TelemetryStoreApi | null {
  const [store, setStore] = useState<TelemetryStoreApi | null>(null);

  useEffect(() => {
    try {
      // Dynamic require to keep @hai3/perf-telemetry optional
      const mod = require('@hai3/perf-telemetry');
      if (mod?.telemetryStore) {
        setStore(mod.telemetryStore);
      }
    } catch {
      // Not installed — no telemetry panel
    }
  }, []);

  return store;
}

function useTelemetryData(store: TelemetryStoreApi | null): StoredSpan[] {
  const [spans, setSpans] = useState<StoredSpan[]>([]);

  useEffect(() => {
    if (!store) return;
    setSpans([...store.getSpans()]);
    const unsub = store.subscribe(() => {
      setSpans([...store.getSpans()]);
    });
    return unsub;
  }, [store]);

  return spans;
}

// ─── Sub-panels ─────────────────────────────────────────────────────────────

function ActionsTab({ spans }: { spans: StoredSpan[] }) {
  const actions = useMemo(
    () => spans
      .filter((s) => String(s.attributes['telemetry.breakdown.kind'] || '') === 'action.total')
      .sort((a, b) => b.startTimeMs - a.startTimeMs)
      .slice(0, 15),
    [spans]
  );
  const maxDuration = useMemo(
    () => Math.max(1, ...actions.map((a) => a.durationMs)),
    [actions]
  );

  if (actions.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>No actions yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {actions.map((span) => {
        const actionName = String(span.attributes['action.name'] || span.name);
        const pct = Math.min(100, (span.durationMs / maxDuration) * 100);
        const barColor = span.durationMs > 1000 ? '#ef4444' : span.durationMs > 300 ? '#eab308' : '#22c55e';
        return (
          <div key={span.spanId} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {actionName}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(span.durationMs)}</span>
            </div>
            <div style={{ height: '3px', borderRadius: '2px', background: 'var(--muted, #f3f4f6)', marginTop: '4px' }}>
              <div style={{ height: '3px', borderRadius: '2px', background: barColor, width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApiTab({ spans }: { spans: StoredSpan[] }) {
  const grouped = useMemo(() => {
    const apiSpans = spans.filter(
      (s) => String(s.attributes['telemetry.breakdown.kind'] || '') === 'backend.api'
        || s.name.startsWith('HTTP ') || s.attributes['http.url']
    );
    const map = new Map<string, StoredSpan[]>();
    for (const s of apiSpans) {
      const url = String(s.attributes['http.url'] || s.name);
      const method = String(s.attributes['http.method'] || 'GET');
      const key = `${method} ${url}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries())
      .map(([key, calls]) => {
        const durations = calls.map((c) => c.durationMs);
        const errors = calls.filter((c) => c.status === 'error').length;
        return {
          key,
          count: calls.length,
          avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
          errors,
        };
      })
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 10);
  }, [spans]);

  if (grouped.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>No API calls yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {grouped.map((g) => (
        <div key={g.key} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', fontSize: '11px' }}>
          <div style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
            {g.key}
          </div>
          <div style={{ display: 'flex', gap: '12px', opacity: 0.7 }}>
            <span>{g.count} calls</span>
            <span>avg {fmt(g.avgMs)}</span>
            {g.errors > 0 && <span style={{ color: '#dc2626' }}>{g.errors} errors</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderingTab({ spans }: { spans: StoredSpan[] }) {
  const webVitals = useMemo(
    () => spans.filter((s) => s.name.startsWith('webvital.')),
    [spans]
  );
  const renderSpans = useMemo(
    () => spans.filter((s) =>
      String(s.attributes['telemetry.breakdown.kind'] || '') === 'frontend.render'
    ).slice(0, 8),
    [spans]
  );

  if (webVitals.length === 0 && renderSpans.length === 0) {
    return <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>No rendering data yet</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Web Vitals */}
      {webVitals.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px' }}>Web Vitals</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {(['webvital.lcp', 'webvital.cls', 'webvital.inp', 'webvital.navigation'] as const).map((name) => {
              const s = webVitals.find((x) => x.name === name);
              if (!s) return null;
              const label = name.replace('webvital.', '').toUpperCase();
              const value = name === 'webvital.cls'
                ? `${Number(s.attributes['webvital.value'] || 0).toFixed(3)}`
                : name === 'webvital.navigation'
                  ? `TTFB ${fmt(Number(s.attributes['webvital.ttfb_ms'] || 0))}`
                  : fmt(Number(s.attributes['webvital.value_ms'] || 0));
              const rating = s.attributes['webvital.rating'];
              return (
                <div key={name} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, opacity: 0.6 }}>
                    <span>{label}</span>
                    {rating && <span style={ratingColor(rating) as React.CSSProperties}>{String(rating)}</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{value}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Render spans */}
      {renderSpans.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px' }}>Route Rendering</div>
          {renderSpans.map((s) => {
            const signal = String(s.attributes['signal.name'] || s.name);
            const total = Number(s.attributes['render.total_ms'] || s.durationMs);
            return (
              <div key={s.spanId} style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{signal}</span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(total)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export const PerfTelemetryPanel: React.FC = () => {
  const { t } = useTranslation();
  const store = useTelemetryStore();
  const spans = useTelemetryData(store);
  const [enabled, setEnabled] = useState(() => loadStudioState(STORAGE_KEY_PERF_ENABLED, true));
  const [tab, setTab] = useState<PerfTab>(() => loadStudioState(STORAGE_KEY_PERF_TAB, 'actions') as PerfTab);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev: boolean) => {
      const next = !prev;
      saveStudioState(STORAGE_KEY_PERF_ENABLED, next);
      return next;
    });
  }, []);

  const switchTab = useCallback((newTab: PerfTab) => {
    setTab(newTab);
    saveStudioState(STORAGE_KEY_PERF_TAB, newTab);
  }, []);

  const summary = useMemo(() => ({
    total: spans.length,
    actions: spans.filter((s) => String(s.attributes['telemetry.breakdown.kind'] || '') === 'action.total').length,
    errors: spans.filter((s) => s.status === 'error').length,
  }), [spans]);

  // Don't render if @hai3/perf-telemetry is not installed
  if (!store) return null;

  const sectionStyle: React.CSSProperties = {
    borderTop: '1px solid var(--border, #e5e7eb)',
    paddingTop: '12px',
    marginTop: '12px',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: active ? 700 : 400,
    borderBottom: active ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: active ? 'var(--primary, #3b82f6)' : 'transparent',
    opacity: active ? 1 : 0.6,
  });

  return (
    <div style={sectionStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, margin: 0 }}>
          {t('studio:perfTelemetry.title') === 'studio:perfTelemetry.title' ? 'Performance' : t('studio:perfTelemetry.title')}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {enabled && (
            <button
              onClick={() => store.clear()}
              style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border, #e5e7eb)', background: 'none', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={toggleEnabled} style={{ width: '14px', height: '14px' }} />
            {enabled ? 'On' : 'Off'}
          </label>
        </div>
      </div>

      {!enabled && (
        <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'center', padding: '8px' }}>
          Performance panel disabled
        </div>
      )}

      {enabled && (
        <>
          {/* KPI row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>Spans</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{summary.total}</div>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>Actions</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{summary.actions}</div>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>Errors</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: summary.errors > 0 ? '#dc2626' : undefined }}>{summary.errors}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border, #e5e7eb)', marginBottom: '8px' }}>
            <button style={tabStyle(tab === 'actions')} onClick={() => switchTab('actions')}>Actions</button>
            <button style={tabStyle(tab === 'api')} onClick={() => switchTab('api')}>API</button>
            <button style={tabStyle(tab === 'rendering')} onClick={() => switchTab('rendering')}>Rendering</button>
          </div>

          {/* Tab content */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {tab === 'actions' && <ActionsTab spans={spans} />}
            {tab === 'api' && <ApiTab spans={spans} />}
            {tab === 'rendering' && <RenderingTab spans={spans} />}
          </div>
        </>
      )}
    </div>
  );
};

PerfTelemetryPanel.displayName = 'PerfTelemetryPanel';
