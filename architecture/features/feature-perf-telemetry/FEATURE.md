# Feature: Performance Telemetry

- [ ] `p2` - **ID**: `cpt-hai3-featstatus-perf-telemetry`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Route Instrumentation](#route-instrumentation)
  - [Action Instrumentation](#action-instrumentation)
  - [API Auto-Instrumentation](#api-auto-instrumentation)
  - [Web Vitals Collection](#web-vitals-collection)
  - [Ambient Action Fallback](#ambient-action-fallback)
  - [Studio Panel Inspection](#studio-panel-inspection)
  - [Collector Export Toggle](#collector-export-toggle)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Scope Resolution Algorithm](#scope-resolution-algorithm)
  - [Ambient Action Lifecycle](#ambient-action-lifecycle)
  - [Span Export Gating](#span-export-gating)
  - [Session ID Generation](#session-id-generation)
- [4. States (CDSL)](#4-states-cdsl)
  - [OTel SDK Lifecycle](#otel-sdk-lifecycle)
  - [Action Scope Lifecycle](#action-scope-lifecycle)
  - [Ambient Action Lifecycle](#ambient-action-lifecycle-1)
- [5. Definitions of Done](#5-definitions-of-done)
  - [DoD: Action-First Correlation](#dod-action-first-correlation)
  - [DoD: Route and Render Instrumentation](#dod-route-and-render-instrumentation)
  - [DoD: API Instrumentation](#dod-api-instrumentation)
  - [DoD: Web Vitals and Runtime Observers](#dod-web-vitals-and-runtime-observers)
  - [DoD: Studio Dev Panel](#dod-studio-dev-panel)
  - [DoD: Fail-Open Guarantee](#dod-fail-open-guarantee)
- [6. Acceptance Criteria](#6-acceptance-criteria)
- [Additional Context](#additional-context)

<!-- /toc -->

- [ ] `p2` - `cpt-hai3-feature-perf-telemetry`

---

## 1. Feature Context

### 1.1 Overview

Performance Telemetry is an L1 SDK package (`@hai3/perf-telemetry`) providing action-first browser telemetry via the OpenTelemetry Browser SDK. It guarantees every span belongs to a named action through a three-tier correlation engine: active action scope, recent action scope, and ambient action fallback.

Problem: Without structured telemetry, diagnosing slow user actions requires 2-4 hours of manual reproduction. Orphan spans in standard OTel setups make per-action breakdown impossible.

Primary value: Per-action performance breakdown (Backend API % + Frontend Internal % + Runtime Blocking % + Rendering %) with 100% span correlation. Diagnosis drops from hours to minutes via Datadog APM drill-down.

Key assumptions: The package has zero @hai3 dependencies (L1 SDK). All OpenTelemetry packages are peer dependencies. The framework plugin (`telemetry()`) initializes the SDK. The Studio dev panel provides local visibility without requiring a collector. Telemetry MUST fail-open — errors never crash the application.

### 1.2 Purpose

Enable developers and SREs to observe frontend performance through action-correlated telemetry spans exported to Datadog APM, with a local dev panel in HAI3 Studio for immediate visibility during development.

Success criteria: Every span in Datadog APM has `action.name`. A developer can see action breakdown in the Studio panel within one second of an interaction. Disabling the collector does not affect application behavior.

### 1.3 Actors

- `cpt-hai3-actor-frontend-dev` — Developer instrumenting screens with hooks and inspecting the Studio panel
- `cpt-hai3-actor-sre` — SRE monitoring Datadog APM dashboards and investigating slow actions
- `cpt-hai3-actor-otel-sdk` — OTel Browser SDK processing spans through HAI3SpanProcessor pipeline
- `cpt-hai3-actor-collector` — Docker OTel Collector receiving OTLP/HTTP and forwarding to Datadog
- `cpt-hai3-actor-framework-plugin` — `telemetry()` plugin initializing OTel in the framework lifecycle

### 1.4 References

- Decomposition: [DECOMPOSITION.md](../../DECOMPOSITION.md) — `cpt-hai3-feature-perf-telemetry`
- ADR: `cpt-hai3-adr-action-first-telemetry`
- AI Target: `.ai/targets/PERF_TELEMETRY.md`
- Data Contracts: `.ai/references/telemetry/data-contracts.md`
- Privacy: `.ai/references/telemetry/privacy-and-governance.md`

---

## 2. Actor Flows (CDSL)

### Route Instrumentation

- [ ] `p1` - **ID**: `cpt-hai3-flow-perf-telemetry-route-instrumentation`

**Actors**: `cpt-hai3-actor-frontend-dev`, `cpt-hai3-actor-otel-sdk`

1. [ ] `p1` - Frontend Dev adds `useRoutePerf(routeId, navigationStartMs)` to a screen component — `inst-add-route-perf`
2. [ ] `p1` - On mount, hook calls `setCurrentRouteId(routeId)` to update ambient context — `inst-set-route-id`
3. [ ] `p1` - Hook creates `route.navigation` span with `startTime: navigationStartMs` — `inst-create-nav-span`
4. [ ] `p1` - Span attributes: `route.id`, `route.transition_type` (hard/soft), `telemetry.breakdown.kind: frontend.route` — `inst-nav-span-attrs`
5. [ ] `p1` - Hook calculates `route.navigation_ms` = mount time - navigationStartMs — `inst-calc-nav-ms`
6. [ ] `p1` - Span ends immediately with navigation duration — `inst-end-nav-span`

---

### Action Instrumentation

- [ ] `p1` - **ID**: `cpt-hai3-flow-perf-telemetry-action-instrumentation`

**Actors**: `cpt-hai3-actor-frontend-dev`, `cpt-hai3-actor-otel-sdk`

1. [ ] `p1` - Frontend Dev wraps critical work with `useTelemetryAction(actionName, { routeId })` — `inst-create-action-hook`
2. [ ] `p1` - On invocation, `runTelemetryAction` creates root span with `telemetry.breakdown.kind: action.total` — `inst-create-action-span`
3. [ ] `p1` - `beginActionScope()` registers the span in the active scopes map — `inst-register-scope`
4. [ ] `p1` - All child work (API calls, renders) executes within the OTel Context of the action span — `inst-context-propagation`
5. [ ] `p1` - On completion: `endActionScope()` moves scope to recent buffer, span ends — `inst-end-action`
6. [ ] `p1` - On error: span records `action.status: error`, `action.error_type`, re-throws — `inst-action-error`

---

### API Auto-Instrumentation

- [ ] `p1` - **ID**: `cpt-hai3-flow-perf-telemetry-api-instrumentation`

**Actors**: `cpt-hai3-actor-otel-sdk`

1. [ ] `p1` - OTel `FetchInstrumentation` auto-instruments all `fetch()` calls — `inst-auto-fetch`
2. [ ] `p1` - `HAI3SpanProcessor.onStart()` injects `action.name` from `findRelatedActionScope()` — `inst-inject-action`
3. [ ] `p1` - Span attributes: `route.id`, `session.id`, `app.origin`, action correlation IDs — `inst-api-attrs`
4. [ ] `p1` - OTel collector URLs are excluded from instrumentation — `inst-ignore-collector`

---

### Web Vitals Collection

- [ ] `p1` - **ID**: `cpt-hai3-flow-perf-telemetry-web-vitals`

**Actors**: `cpt-hai3-actor-frontend-dev`, `cpt-hai3-actor-otel-sdk`

1. [ ] `p1` - Frontend Dev adds `useWebVitals(routeId)` to screen — `inst-add-web-vitals`
2. [ ] `p1` - Hook creates PerformanceObservers for LCP, CLS, INP, Navigation timing — `inst-create-observers`
3. [ ] `p1` - Each metric creates a span with `telemetry.breakdown.kind: frontend.webvitals` — `inst-vital-span`
4. [ ] `p1` - Spans parented to active/ambient action via `getActionParentContext()` — `inst-vital-parenting`
5. [ ] `p1` - Rating badges computed: good (<2500ms LCP), needs-improvement, poor — `inst-vital-rating`

---

### Ambient Action Fallback

- [ ] `p1` - **ID**: `cpt-hai3-flow-perf-telemetry-ambient-fallback`

**Actors**: `cpt-hai3-actor-otel-sdk`

1. [ ] `p1` - `findRelatedActionScope(atMs, routeId)` searches active scopes (sorted by recency) — `inst-search-active`
2. [ ] `p1` - **IF** no active scope found **THEN** search recent scopes within 2500ms follow-up window — `inst-search-recent`
3. [ ] `p1` - **IF** no recent scope found **THEN** `ensureAmbientAction(routeId)` creates synthetic `<routeId>.ambient` span — `inst-create-ambient`
4. [ ] `p1` - Ambient span attributes: `action.name: <routeId>.ambient`, `action.trigger: ambient` — `inst-ambient-attrs`
5. [ ] `p1` - **RETURN** the resolved scope's OTel Context for child span parenting — `inst-return-context`

---

### Studio Panel Inspection

- [ ] `p2` - **ID**: `cpt-hai3-flow-perf-telemetry-studio-panel`

**Actors**: `cpt-hai3-actor-frontend-dev`

1. [ ] `p2` - `TelemetryStoreProcessor` captures every completed span in-memory (max 500) — `inst-store-capture`
2. [ ] `p2` - `PerfTelemetryPanel` subscribes to store changes via `telemetryStore.subscribe()` — `inst-panel-subscribe`
3. [ ] `p2` - Panel displays KPI cards: total spans, action count, error count — `inst-display-kpis`
4. [ ] `p2` - Tabs show Actions (with duration bars), API (grouped with avg/p95), Rendering (web vitals + render times) — `inst-display-tabs`
5. [ ] `p2` - Clear button empties the store — `inst-clear-store`
6. [ ] `p2` - Enable/disable toggle persisted to `hai3:studio:perfTelemetry` — `inst-toggle-persist`

---

### Collector Export Toggle

- [ ] `p2` - **ID**: `cpt-hai3-flow-perf-telemetry-export-toggle`

**Actors**: `cpt-hai3-actor-frontend-dev`

1. [ ] `p2` - `ExportGateSpanProcessor` wraps `BatchSpanProcessor` — `inst-wrap-batch`
2. [ ] `p2` - `onEnd(span)`: **IF** `exportToCollector` is false **THEN** drop span (local store still captures it) — `inst-gate-export`
3. [ ] `p2` - `setRuntimeConfigProvider()` injects live config (account attrs, feature flags) — `inst-inject-runtime`

---

## 3. Processes / Business Logic (CDSL)

### Scope Resolution Algorithm

- [ ] `p1` - **ID**: `cpt-hai3-algo-perf-telemetry-scope-resolution`

**Input**: `atMs: number` (timestamp), `routeId?: string`
**Output**: `ActionScope | undefined`

```text
1. filter activeScopes where routeId matches AND startedAtMs <= atMs
2. sort by startedAtMs descending (most recent first)
3. IF match found THEN RETURN match
4. search recentScopes where routeId matches AND atMs within [startedAtMs, endedAtMs + 2500ms]
5. IF match found THEN RETURN match
6. IF routeId provided THEN RETURN ensureAmbientAction(routeId)
7. RETURN undefined
```

---

### Ambient Action Lifecycle

- [ ] `p1` - **ID**: `cpt-hai3-algo-perf-telemetry-ambient-lifecycle`

```text
1. IF _ambientScope exists AND routeId matches THEN RETURN existing
2. IF _ambientScope exists AND routeId differs THEN end old ambient span
3. Create new ambient span via ambient tracer: name = `${routeId}.ambient`
4. Store as _ambientScope
5. On route change: endAmbientAction() ends current, new ensureAmbientAction() creates next
```

---

### Span Export Gating

- [ ] `p2` - **ID**: `cpt-hai3-algo-perf-telemetry-export-gating`

```text
1. ExportGateSpanProcessor.onEnd(span):
   a. read _getRuntimeConfig().exportToCollector
   b. IF false THEN return (span dropped from export but kept in local store)
   c. IF true THEN delegate.onEnd(span) — forward to BatchSpanProcessor
```

---

### Session ID Generation

- [ ] `p2` - **ID**: `cpt-hai3-algo-perf-telemetry-session-id`

```text
1. IF _sessionId cached THEN RETURN cached
2. TRY read sessionStorage 'otel_session_id'
3. IF found THEN cache and RETURN
4. ELSE generate via crypto.randomUUID() or Date.now() fallback
5. Store in sessionStorage
6. RETURN generated ID
```

---

## 4. States (CDSL)

### OTel SDK Lifecycle

- [ ] `p1` - **ID**: `cpt-hai3-state-perf-telemetry-sdk-lifecycle`

```text
[uninitialized] --initOtel()--> [initialized]
[initialized] --shutdownOtel()--> [shutdown]
Guard: initOtel() is idempotent (no-op if already initialized)
```

---

### Action Scope Lifecycle

- [ ] `p1` - **ID**: `cpt-hai3-state-perf-telemetry-action-scope`

```text
[idle] --beginActionScope()--> [active] (in activeScopes map)
[active] --endActionScope()--> [recent] (in recentScopes ring buffer, max 100)
[recent] --buffer overflow--> [evicted]
```

---

### Ambient Action Lifecycle

- [ ] `p1` - **ID**: `cpt-hai3-state-perf-telemetry-ambient-action`

```text
[none] --ensureAmbientAction(routeId)--> [active for routeId]
[active for routeId] --setCurrentRouteId(newRouteId)--> [ended] -> [active for newRouteId]
[active for routeId] --endAmbientAction()--> [none]
```

---

## 5. Definitions of Done

### DoD: Action-First Correlation

- [ ] `p1` - **ID**: `cpt-hai3-dod-perf-telemetry-action-first`

- [ ] `p1` - Every span has `action.name` attribute (verified in Datadog APM) — `inst-every-span-has-action`
- [ ] `p1` - `HAI3SpanProcessor.onStart()` injects action correlation on every span — `inst-processor-injects`
- [ ] `p1` - Ambient fallback creates `<routeId>.ambient` when no explicit action is active — `inst-ambient-fallback`
- [ ] `p1` - Active and recent scope resolution returns the most recent matching action — `inst-scope-resolution`

### DoD: Route and Render Instrumentation

- [ ] `p1` - **ID**: `cpt-hai3-dod-perf-telemetry-route-render`

- [ ] `p1` - `useRoutePerf` emits `route.navigation` span with navigation timing — `inst-route-nav-span`
- [ ] `p1` - `useDoneRendering` emits `<routeId>.ready` span with double-rAF paint measurement — `inst-done-rendering`
- [ ] `p1` - Timeout fallback (10s default) ends render span if `dataReady` never fires — `inst-render-timeout`

### DoD: API Instrumentation

- [ ] `p1` - **ID**: `cpt-hai3-dod-perf-telemetry-api`

- [ ] `p1` - `FetchInstrumentation` auto-instruments all fetch calls — `inst-auto-fetch`
- [ ] `p1` - `instrumentedFetch` creates manual spans with `telemetry.breakdown.kind: backend.api` — `inst-manual-fetch`
- [ ] `p1` - OTel collector URLs excluded from instrumentation — `inst-ignore-collector-urls`

### DoD: Web Vitals and Runtime Observers

- [ ] `p1` - **ID**: `cpt-hai3-dod-perf-telemetry-vitals`

- [ ] `p1` - LCP, CLS, INP, Navigation timing captured as spans — `inst-capture-vitals`
- [ ] `p1` - Long tasks (>50ms) captured via PerformanceObserver — `inst-long-tasks`
- [ ] `p1` - Resource timing captured for resource loading analysis — `inst-resource-timing`
- [ ] `p1` - All observer spans parented to active/ambient action — `inst-observer-parenting`

### DoD: Studio Dev Panel

- [ ] `p2` - **ID**: `cpt-hai3-dod-perf-telemetry-studio-panel`

- [ ] `p2` - `PerfTelemetryPanel` renders inside Studio `ControlPanel` — `inst-panel-in-studio`
- [ ] `p2` - Panel only renders when `@hai3/perf-telemetry` is installed — `inst-conditional-render`
- [ ] `p2` - KPI cards show total spans, actions, errors — `inst-kpi-cards`
- [ ] `p2` - Tabs: Actions (duration bars), API (grouped stats), Rendering (web vitals + render times) — `inst-tabs`
- [ ] `p2` - Enable/disable toggle persisted to localStorage — `inst-persist-toggle`

### DoD: Fail-Open Guarantee

- [ ] `p1` - **ID**: `cpt-hai3-dod-perf-telemetry-fail-open`

- [ ] `p1` - Every telemetry operation wrapped in try/catch — `inst-try-catch`
- [ ] `p1` - `ExportGateSpanProcessor` silently drops spans when export disabled — `inst-gate-drop`
- [ ] `p1` - Disabling the OTel collector does not affect application business flows — `inst-no-crash`

---

## 6. Acceptance Criteria

1. **AC-1**: Every span in Datadog APM has an `action.name` attribute.
2. **AC-2**: Route screens with `useRoutePerf` + `useDoneRendering` emit `route.navigation` and `<routeId>.ready` spans.
3. **AC-3**: Critical actions wrapped with `useTelemetryAction` produce `action.total` spans with child correlation.
4. **AC-4**: Web Vitals (LCP, CLS, INP) appear as spans with rating badges.
5. **AC-5**: Studio dev panel shows live span data (Actions, API, Rendering tabs).
6. **AC-6**: Stopping the OTel Collector does not break any application functionality.
7. **AC-7**: `@hai3/perf-telemetry` has zero `@hai3` dependencies (L1 SDK).
8. **AC-8**: Build: `npm run build --workspace=@hai3/perf-telemetry` succeeds.

---

## Additional Context

### Package Layer

`@hai3/perf-telemetry` is L1 SDK — zero `@hai3` dependencies. All OpenTelemetry packages are peer dependencies installed by the consuming app.

### Data Flow

```
Browser App (React)
  -> OTel Browser SDK (hooks + HAI3SpanProcessor)
    -> OTLP/HTTP
OTel Collector (Docker, port 14318)
  -> Datadog APM + Metrics
```

### Span Attribute Contract

Required on every span: `route.id`, `action.name`, `telemetry.breakdown.kind`.
Forbidden: PII, secrets, payload bodies, freeform user text.

### Breakdown Kinds

| Kind | Source |
|------|--------|
| `action.total` | useTelemetryAction / ambient |
| `backend.api` | instrumentedFetch / FetchInstrumentation |
| `frontend.route` | useRoutePerf |
| `frontend.render` | useDoneRendering |
| `frontend.ui` | useDoneRendering (child) |
| `frontend.webvitals` | useWebVitals |
| `frontend.runtime` | useLongTaskObserver / useResourceTimingObserver |
| `frontend.internal` | runFrontendWork |

### Studio Storage Keys

- `hai3:studio:perfTelemetry` — panel enable/disable (boolean)
- `hai3:studio:perfTelemetryTab` — active tab (string)

### Collector Ports

- 14317: gRPC
- 14318: HTTP (browser OTLP endpoint, CORS enabled)
- 18888: metrics
