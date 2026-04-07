# Datadog Backend Reference

## Purpose

Minimal architecture reference for the standalone telemetry AI package.
Edit `.ai/references/telemetry/backend-config.json` when backend URLs, runtime values, service identity, or validation commands change.

## Baseline path

```text
Browser App
  -> OTLP HTTP
OTel Collector
  -> Datadog
```

Use this as the default backend path for frontend telemetry.

## Working assumptions

- Datadog APM is the default trace drilldown backend.
- The local collector stays in front of Datadog to preserve browser CORS support and a stable local OTLP endpoint.
- Frontend telemetry must remain fail-open.
- Route and action correlation must be preserved.
- Real parent/child trace hierarchy is required, not only shared attributes.

## Preferred trace tree

- action or navigation span
  - `<routeId>.ready`
    - `ui`
      - frontend internal work spans
      - first-party API spans

## Backend configuration source

Use `.ai/references/telemetry/backend-config.json` as the single editable source for:

- collector URL and OTLP traces path
- local app URL
- Datadog site and observability URLs
- frontend service name, version, and environment
- runtime env values used by the app
- collector-side Datadog env values
- preferred validation commands

## Datadog validation focus

Use Datadog for:

- single trace drilldown
- session or action investigation
- parent/child span analysis
- service- and endpoint-level latency investigation
- dashboarding and alerting from the same backend
