# ADR 0017: Action-First Performance Telemetry

<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Action-First OTel with Ambient Fallback](#action-first-otel-with-ambient-fallback)
  - [Datadog RUM SDK](#datadog-rum-sdk)
  - [Custom Fetch Wrapper Only](#custom-fetch-wrapper-only)
  - [No Telemetry](#no-telemetry)
- [More Information](#more-information)

<!-- /toc -->

**ID**: `cpt-hai3-adr-action-first-telemetry`

## Context and Problem Statement
HAI3 applications need frontend performance observability for diagnosing slow user interactions, API bottlenecks, and rendering issues. Standard OpenTelemetry Browser SDK instrumentation produces orphan spans (spans without a logical grouping), making per-action performance breakdown impossible. How should we instrument the frontend to guarantee 100% span correlation while maintaining fail-open semantics?

## Decision Drivers
- Every span must belong to a named action for per-action % breakdown
- Telemetry must never crash application business flows (fail-open)
- Vendor-neutral instrumentation (avoid lock-in)
- Local dev visibility without requiring a collector
- L1 SDK (zero @hai3 deps) for broad reusability

## Considered Options

1. Action-first OTel with ambient fallback
2. Datadog RUM SDK
3. Custom fetch wrapper only
4. No telemetry

## Decision Outcome

Chosen option: **Action-first OTel with ambient fallback**, because it provides 100% span correlation through a three-tier resolution algorithm (active scope, recent scope within 2500ms window, ambient fallback) while maintaining vendor-neutral OTel instrumentation and fail-open semantics.

The system is implemented as `@hai3/perf-telemetry` (L1 SDK, zero @hai3 deps) with a framework plugin and Studio dev panel. Backend path: Browser -> OTLP/HTTP -> OTel Collector (Docker) -> Datadog APM.

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

### Confirmation

Decision confirmed by:
- All spans in Datadog APM have `action.name` attribute (verified via telemetry validation tools)
- `npm run validate:telemetry` passes (lint, contract check, smoke test)
- Studio dev panel shows live span data with action correlation
- Disabling collector does not affect application business flows (fail-open verified)

## Pros and Cons of the Options

### Action-First OTel with Ambient Fallback

- Good: 100% correlation guarantee, no orphan spans
- Good: Standard OTel vendor-neutral instrumentation
- Good: Fail-open — no business impact from telemetry failures
- Good: Local dev panel without collector
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

## More Information

- FEATURE spec: `architecture/features/feature-perf-telemetry/FEATURE.md`
- Data contracts: `.ai/references/telemetry/data-contracts.md`
- Privacy governance: `.ai/references/telemetry/privacy-and-governance.md`
