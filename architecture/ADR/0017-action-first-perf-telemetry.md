# ADR 0017: Action-First Performance Telemetry

`p2` — **ID**: `cpt-hai3-adr-action-first-telemetry`

## Status

Accepted

## Context

HAI3 applications need frontend performance observability for diagnosing slow user interactions, API bottlenecks, and rendering issues. Standard OpenTelemetry Browser SDK instrumentation produces orphan spans (spans without a logical grouping), making per-action performance breakdown impossible.

## Decision Outcome

Adopt an **action-first correlation model** where every span MUST belong to a named action:

1. **Explicit actions** — `useTelemetryAction` wraps user-triggered work (clicks, submits, navigation) in a named action span. All child spans (API calls, renders) are automatically correlated.

2. **Ambient fallback** — when no explicit action is active, a synthetic `<routeId>.ambient` action is created automatically. Web vitals, long tasks, and auto-instrumented fetch spans are parented to it.

3. **Three-tier resolution** — `findRelatedActionScope(atMs, routeId)` searches: (a) active scopes, (b) recent scopes within 2500ms follow-up window, (c) ambient action fallback. This guarantees 100% correlation.

The system is implemented as `@hai3/perf-telemetry` (L1 SDK, zero @hai3 deps) with a framework plugin and Studio dev panel.

Backend path: Browser -> OTLP/HTTP -> OTel Collector (Docker) -> Datadog APM.

### Consequences

#### Positive

- 100% span correlation — no orphan spans in Datadog APM
- Per-action performance breakdown (Backend API % + Frontend % + Runtime % + Rendering %)
- Fail-open design — telemetry errors never crash business flows
- Local dev visibility via Studio panel without requiring a collector
- L1 SDK — usable by any React app, not just HAI3

#### Negative

- Ambient actions add span volume (cost in Datadog per-span pricing)
- OTel peer dependencies add ~50KB to bundle when tree-shaken
- Docker collector required for Datadog export (CORS + credential isolation)
- Zone.js dependency via ZoneContextManager for async context propagation

#### Risks

- OTel Browser SDK is less mature than Node.js SDK
- Datadog connector in OTel Collector may have version-specific quirks

### Confirmation

Decision confirmed by:
- All spans in Datadog APM have `action.name` attribute (verified via telemetry validation tools)
- `npm run validate:telemetry` passes (lint, contract check, smoke test)
- Studio dev panel shows live span data with action correlation
- Disabling collector does not affect application business flows (fail-open verified)

## Pros and Cons of the Options

### Action-First OTel with Ambient Fallback (chosen)

- Good: 100% correlation guarantee, no orphan spans
- Good: Standard OTel vendor-neutral instrumentation
- Good: Fail-open — no business impact from telemetry failures
- Bad: Ambient actions add span volume
- Bad: OTel peer deps add ~50KB bundle size

### Datadog RUM SDK

- Good: Managed SDK with built-in dashboard
- Bad: Vendor lock-in to Datadog
- Bad: No action-first correlation model
- Bad: No local dev panel capability

### Custom Fetch Wrapper Only

- Good: Minimal code, no OTel dependency
- Bad: No automatic correlation for web vitals, long tasks
- Bad: No ambient fallback — orphan spans inevitable
- Bad: No standardized trace hierarchy

### No Telemetry

- Good: Zero complexity, zero bundle cost
- Bad: 2-4 hour diagnosis time per performance incident
- Bad: No data-driven performance optimization possible
