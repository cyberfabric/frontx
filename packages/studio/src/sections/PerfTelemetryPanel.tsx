// @cpt-flow:cpt-frontx-flow-perf-telemetry-studio-panel:p2
// @cpt-dod:cpt-frontx-dod-perf-telemetry-studio-panel:p2
// @cpt-flow:cpt-frontx-flow-perf-telemetry-cross-runtime-registry:p1
/**
 * PerfTelemetryPanel — Performance telemetry dev panel for FrontX Studio
 *
 * Displays live performance data from @cyberfabric/perf-telemetry when available.
 * Subscribes to the cross-runtime telemetry store (Symbol.for('frontx:telemetry-registry')
 * on globalThis) so the host panel sees spans from host + every joined MFE runtime.
 * Only renders when the perf-telemetry package is installed.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@cyberfabric/react';
import { loadStudioState, saveStudioState } from '../utils/persistence';

// ─── Types (mirrored from @cyberfabric/perf-telemetry; package is optional peer) ─

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

interface PerfTelemetryModule {
  telemetryStore?: TelemetryStoreApi;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_PERF_ENABLED = 'frontx:studio:perfTelemetry';
const STORAGE_PERF_TAB = 'frontx:studio:perfTelemetryTab';
const RUNTIME_ATTR = 'frontx.runtime';
const WEB_VITAL_LABELS = {
  'webvital.lcp': 'LCP',
  'webvital.cls': 'CLS',
  'webvital.inp': 'INP',
  'webvital.navigation': 'TTFB',
} as const;

type PerfTab = 'actions' | 'api' | 'rendering';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

function actionBarColor(durationMs: number): string {
  if (durationMs > 1000) return '#ef4444';
  if (durationMs > 300) return '#eab308';
  return '#22c55e';
}

function webVitalDisplayValue(name: string, s: StoredSpan): string {
  if (name === 'webvital.cls') return `${Number(s.attributes['webvital.value'] || 0).toFixed(3)}`;
  if (name === 'webvital.navigation') return `TTFB ${fmt(Number(s.attributes['webvital.ttfb_ms'] || 0))}`;
  return fmt(Number(s.attributes['webvital.value_ms'] || 0));
}

function ratingColor(rating: string | number | boolean | undefined): React.CSSProperties {
  const r = String(rating);
  if (r === 'good') return { color: '#16a34a' };
  if (r === 'needs-improvement') return { color: '#ca8a04' };
  if (r === 'poor') return { color: '#dc2626' };
  return { color: '#6b7280' };
}

function studioText(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

function spanRuntime(s: StoredSpan): string {
  const v = Reflect.get(s.attributes, RUNTIME_ATTR);
  return typeof v === 'string' && v.length > 0 ? v : 'host';
}

function buildTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: active ? 700 : 400,
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--primary, #3b82f6)' : '2px solid transparent',
    cursor: 'pointer',
    opacity: active ? 1 : 0.6,
  };
}

// ─── useTelemetryStore ──────────────────────────────────────────────────────

// @cpt-begin:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-resolve-store
/** Resolves telemetryStore via dynamic import. Fail-open: returns null if not installed. */
function useTelemetryStore(): TelemetryStoreApi | null {
  const [store, setStore] = useState<TelemetryStoreApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Vite/tsup keep the dynamic import for the runtime; if @cyberfabric/perf-telemetry
    // is not installed (optional peer) the import rejects and the panel hides.
    import('@cyberfabric/perf-telemetry')
      .then((mod: PerfTelemetryModule) => {
        if (cancelled) return;
        if (mod.telemetryStore) setStore(mod.telemetryStore);
      })
      .catch(() => { /* fail-open: package not installed; panel will not render */ });
    return () => { cancelled = true; };
  }, []);

  return store;
}
// @cpt-end:cpt-frontx-flow-perf-telemetry-studio-panel:p2:inst-resolve-store

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

function groupByRuntime(spans: StoredSpan[]): Map<string, StoredSpan[]> {
  const m = new Map<string, StoredSpan[]>();
  for (const s of spans) {
    const r = spanRuntime(s);
    const bucket = m.get(r);
    if (bucket) {
      bucket.push(s);
    } else {
      m.set(r, [s]);
    }
  }
  return m;
}

// ─── Sub-panels ─────────────────────────────────────────────────────────────

function ActionsTab({ spans, emptyLabel }: Readonly<{ spans: StoredSpan[]; emptyLabel: string }>) {
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
    return <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {actions.map((span) => {
        const actionName = String(span.attributes['action.name'] || span.name);
        const pct = Math.min(100, (span.durationMs / maxDuration) * 100);
        const barColor = actionBarColor(span.durationMs);
        const runtime = spanRuntime(span);
        return (
          <div key={span.spanId} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {actionName}
              </span>
              <span style={{ fontSize: '10px', opacity: 0.6, whiteSpace: 'nowrap' }} title="runtime">{runtime}</span>
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

function ApiTab({ spans, emptyLabel, callsLabel, avgLabel, errorsLabel }: Readonly<{ spans: StoredSpan[]; emptyLabel: string; callsLabel: string; avgLabel: string; errorsLabel: string }>) {
  const grouped = useMemo(() => {
    const apiSpans = spans.filter(
      (s) => String(s.attributes['telemetry.breakdown.kind'] || '') === 'backend.api'
        || s.name.startsWith('HTTP ') || s.attributes['http.url']
    );
    const map = new Map<string, StoredSpan[]>();
    for (const s of apiSpans) {
      const url = String(s.attributes['http.url'] || s.name);
      const method = String(s.attributes['http.method'] || 'GET');
      const runtime = spanRuntime(s);
      const key = `${runtime} | ${method} ${url}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(s);
      } else {
        map.set(key, [s]);
      }
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
    return <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {grouped.map((g) => (
        <div key={g.key} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', fontSize: '11px' }}>
          <div style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
            {g.key}
          </div>
          <div style={{ display: 'flex', gap: '12px', opacity: 0.7 }}>
            <span>{g.count} {callsLabel}</span>
            <span>{avgLabel} {fmt(g.avgMs)}</span>
            {g.errors > 0 && <span style={{ color: '#dc2626' }}>{g.errors} {errorsLabel}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderingTab({ spans, emptyLabel, webVitalsLabel, routeRenderingLabel }: Readonly<{ spans: StoredSpan[]; emptyLabel: string; webVitalsLabel: string; routeRenderingLabel: string }>) {
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
    return <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {webVitals.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px' }}>{webVitalsLabel}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {(['webvital.lcp', 'webvital.cls', 'webvital.inp', 'webvital.navigation'] as const).map((name) => {
              const s = webVitals.find((x) => x.name === name);
              if (!s) return null;
              const label = Reflect.get(WEB_VITAL_LABELS, name) as string;
              const value = webVitalDisplayValue(name, s);
              const rating = s.attributes['webvital.rating'];
              return (
                <div key={name} style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, opacity: 0.6 }}>
                    <span>{label}</span>
                    {rating && <span style={ratingColor(rating)}>{String(rating)}</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{value}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renderSpans.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: '4px' }}>{routeRenderingLabel}</div>
          {renderSpans.map((s) => {
            const signal = String(s.attributes['signal.name'] || s.name);
            const total = Number(s.attributes['render.total_ms'] || s.durationMs);
            const runtime = spanRuntime(s);
            return (
              <div key={s.spanId} style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{signal}</span>
                <span style={{ fontSize: '10px', opacity: 0.6, whiteSpace: 'nowrap' }} title="runtime">{runtime}</span>
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

/** Studio section that renders live performance telemetry KPIs, action timings, API stats, and web vitals. */
export const PerfTelemetryPanel: React.FC = () => {
  const { t } = useTranslation();
  const store = useTelemetryStore();
  const spans = useTelemetryData(store);
  const [enabled, setEnabled] = useState(() => loadStudioState(STORAGE_PERF_ENABLED, true));
  const [tab, setTab] = useState<PerfTab>(() => loadStudioState(STORAGE_PERF_TAB, 'actions') as PerfTab);
  const labels = useMemo(() => ({
    title: studioText(t, 'studio:perfTelemetry.title', 'Performance'),
    clear: studioText(t, 'studio:perfTelemetry.clear', 'Clear'),
    toggleOn: studioText(t, 'studio:perfTelemetry.toggle.on', 'On'),
    toggleOff: studioText(t, 'studio:perfTelemetry.toggle.off', 'Off'),
    disabled: studioText(t, 'studio:perfTelemetry.disabled', 'Performance panel disabled'),
    spans: studioText(t, 'studio:perfTelemetry.kpis.spans', 'Spans'),
    actions: studioText(t, 'studio:perfTelemetry.kpis.actions', 'Actions'),
    errors: studioText(t, 'studio:perfTelemetry.kpis.errors', 'Errors'),
    runtimes: studioText(t, 'studio:perfTelemetry.kpis.runtimes', 'Runtimes'),
    tabActions: studioText(t, 'studio:perfTelemetry.tabs.actions', 'Actions'),
    tabApi: studioText(t, 'studio:perfTelemetry.tabs.api', 'API'),
    tabRendering: studioText(t, 'studio:perfTelemetry.tabs.rendering', 'Rendering'),
    noActions: studioText(t, 'studio:perfTelemetry.empty.actions', 'No actions yet'),
    noApi: studioText(t, 'studio:perfTelemetry.empty.api', 'No API calls yet'),
    noRendering: studioText(t, 'studio:perfTelemetry.empty.rendering', 'No rendering data yet'),
    calls: studioText(t, 'studio:perfTelemetry.api.calls', 'calls'),
    avg: studioText(t, 'studio:perfTelemetry.api.avg', 'avg'),
    apiErrors: studioText(t, 'studio:perfTelemetry.api.errors', 'errors'),
    webVitals: studioText(t, 'studio:perfTelemetry.sections.webVitals', 'Web Vitals'),
    routeRendering: studioText(t, 'studio:perfTelemetry.sections.routeRendering', 'Route Rendering'),
  }), [t]);

  const toggleEnabled = useCallback(() => {
    setEnabled((prev: boolean) => {
      const next = !prev;
      saveStudioState(STORAGE_PERF_ENABLED, next);
      return next;
    });
  }, []);

  const switchTab = useCallback((newTab: PerfTab) => {
    setTab(newTab);
    saveStudioState(STORAGE_PERF_TAB, newTab);
  }, []);

  const summary = useMemo(() => ({
    total: spans.length,
    actions: spans.filter((s) => String(s.attributes['telemetry.breakdown.kind'] || '') === 'action.total').length,
    errors: spans.filter((s) => s.status === 'error').length,
    runtimes: groupByRuntime(spans).size,
  }), [spans]);

  // Don't render if @cyberfabric/perf-telemetry is not installed
  if (!store) return null;

  const sectionStyle: React.CSSProperties = {
    borderTop: '1px solid var(--border, #e5e7eb)',
    paddingTop: '12px',
    marginTop: '12px',
  };

  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, margin: 0 }}>
          {labels.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {enabled && (
            <button
              type="button"
              onClick={() => { store.clear(); }}
              style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--border, #e5e7eb)', background: 'none', cursor: 'pointer' }}
            >
              {labels.clear}
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={toggleEnabled} style={{ width: '14px', height: '14px' }} />
            {enabled ? labels.toggleOn : labels.toggleOff}
          </label>
        </div>
      </div>

      {!enabled && (
        <div style={{ fontSize: '11px', opacity: 0.5, textAlign: 'center', padding: '8px' }}>
          {labels.disabled}
        </div>
      )}

      {enabled && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>{labels.spans}</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{summary.total}</div>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>{labels.actions}</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{summary.actions}</div>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>{labels.runtimes}</div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{summary.runtimes}</div>
            </div>
            <div style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border, #e5e7eb)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>{labels.errors}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: summary.errors > 0 ? '#dc2626' : undefined }}>{summary.errors}</div>
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border, #e5e7eb)', marginBottom: '8px' }}>
            <button type="button" style={buildTabStyle(tab === 'actions')} onClick={() => { switchTab('actions'); }}>{labels.tabActions}</button>
            <button type="button" style={buildTabStyle(tab === 'api')} onClick={() => { switchTab('api'); }}>{labels.tabApi}</button>
            <button type="button" style={buildTabStyle(tab === 'rendering')} onClick={() => { switchTab('rendering'); }}>{labels.tabRendering}</button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {tab === 'actions' && <ActionsTab spans={spans} emptyLabel={labels.noActions} />}
            {tab === 'api' && <ApiTab spans={spans} emptyLabel={labels.noApi} callsLabel={labels.calls} avgLabel={labels.avg} errorsLabel={labels.apiErrors} />}
            {tab === 'rendering' && <RenderingTab spans={spans} emptyLabel={labels.noRendering} webVitalsLabel={labels.webVitals} routeRenderingLabel={labels.routeRendering} />}
          </div>
        </>
      )}
    </div>
  );
};

PerfTelemetryPanel.displayName = 'PerfTelemetryPanel';
