# ADR 0017: Action-First Performance Telemetry

`p2` — **ID**: `cpt-hai3-adr-action-first-telemetry`

## Status

Accepted

## Context

HAI3 applications need frontend performance observability for diagnosing slow user interactions, API bottlenecks, and rendering issues. Standard OpenTelemetry Browser SDK instrumentation produces orphan spans (spans without a logical grouping), making per-action performance breakdown impossible.

## Decision

Adopt an **action-first correlation model** where every span MUST belong to a named action:

1. **Explicit actions** — `useTelemetryAction` wraps user-triggered work (clicks, submits, navigation) in a named action span. All child spans (API calls, renders) are automatically correlated.

2. **Ambient fallback** — when no explicit action is active, a synthetic `<routeId>.ambient` action is created automatically. Web vitals, long tasks, and auto-instrumented fetch spans are parented to it.

3. **Three-tier resolution** — `findRelatedActionScope(atMs, routeId)` searches: (a) active scopes, (b) recent scopes within 2500ms followup window, (c) ambient action fallback. This guarantees 100% correlation.

The system is implemented as `@hai3/perf-telemetry` (L1 SDK, zero @hai3 deps) with a framework plugin and Studio dev panel.

Backend path: Browser -> OTLP/HTTP -> OTel Collector (Docker) -> Datadog APM.

## Consequences

### Positive

- 100% span correlation — no orphan spans in Datadog APM
- Per-action performance breakdown (Backend API % + Frontend % + Runtime % + Rendering %)
- Fail-open design — telemetry errors never crash business flows
- Local dev visibility via Studio panel without requiring a collector
- L1 SDK — usable by any React app, not just HAI3

### Negative

- Ambient actions add span volume (cost in Datadog per-span pricing)
- OTel peer dependencies add ~50KB to bundle when tree-shaken
- Docker collector required for Datadog export (CORS + credential isolation)
- Zone.js dependency via ZoneContextManager for async context propagation

### Risks

- OTel Browser SDK is less mature than Node.js SDK
- Datadog connector in OTel Collector may have version-specific quirks

## Alternatives Considered

- **Datadog RUM SDK** — rejected: vendor lock-in, no action-first correlation, no local dev panel
- **Custom fetch wrapper only** — rejected: no automatic correlation, no web vitals, no ambient fallback
- **No telemetry** — rejected: diagnosis time remains 2-4 hours per incident
