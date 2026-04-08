# Telemetry Data Contracts

## Required resource attributes

- `service.name`
- `service.version`
- `deployment.environment`
- `app.origin`

## Required span attributes (mandatory on every span)

- `route.id`
- `action.name` — **mandatory, no span without an action**
- `telemetry.breakdown.kind`

## Additional span attributes when applicable

- `http.method`
- `http.status_code`
- `ui.signal`
- `action.trigger` — on action root spans: `click`, `navigation`, `polling`, `timer`, `lifecycle`, `ambient`

## Forbidden attributes

- direct PII
- auth or session secrets
- payload bodies
- freeform user text

## Correlation contract

- **Every span MUST have `action.name`.** No orphan spans.
- If no explicit action is active, the ambient action (`<routeId>.ambient`) provides the parent.
- Web vitals, long tasks, resource timing, fetch spans — all MUST be children of an action.
- Background polling, timers, and lifecycle events are actions with appropriate trigger types.

## Datadog trace contract

Preserve these attributes on route, action, and network spans:

- `service.name`
- `route.id`
- `action.name`
- `telemetry.breakdown.kind`
- `http.method`
- `http.status_code`
- `session.id` for trace drilldown only (must be opaque synthetic ID — never auth tokens, cookies, or secrets)

## Datadog investigation flow

1. Search by `service.name` and time range.
2. Narrow by `route.id` or `action.name`.
3. Open the trace and inspect the full parent/child tree.
4. Every span in the tree belongs to an action — use `action.name` to filter.

## Optional metrics schema

Allowed label set for derived metrics:

- `service_name`
- `span_name`
- `span_kind`
- `status_code`
- `route_id`
- `action_name`
- `http_method`
- `http_status_code`
- `environment`

## Prohibited metric labels

- `trace_id`
- `session_id`
- `user_id`
- freeform error text
- raw URL with IDs or query strings

## Cardinality budget guidance

- `route_id`: keep finite and controlled
- `action_name`: keep finite and controlled
- `span_name`: avoid unbounded names
- any new metric label requires explicit review

## Compatibility rule

Keep the existing HAI3 API surface unchanged:

- `useRoutePerf`
- `useDoneRendering`
- `useTelemetryAction`
- instrumented first-party network path
