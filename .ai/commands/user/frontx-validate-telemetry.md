<!-- @standalone -->
# frontx:validate-telemetry - Run Telemetry Validation

## AI WORKFLOW (REQUIRED)
1) Follow `.ai/GUIDELINES.md` as the single source of truth.
2) Run the full telemetry validation pipeline.
3) Report results and fix any issues found.

## STEPS

1. Run `npm run validate:telemetry` (runs all 3 checks below).
2. Review output for failures.
3. Fix any issues found.

## INDIVIDUAL CHECKS

```bash
# Lint: check instrumentation patterns in annotated files
npm run lint:telemetry

# Contract: validate event schema in poc-events.json
npm run test:telemetry-contract

# Smoke: check annotated route files have required hooks
npm run test:telemetry-smoke
```

## COMMON FIXES

- **Missing useRoutePerf**: Add to files marked with `@telemetry-route`.
- **Missing useTelemetryAction**: Add to files marked with `@telemetry-critical-action`.
- **Raw first-party fetch**: Replace `fetch('/api/...')` with `apiRegistry.getService()` calls.
- **Contract failure**: Fix poc-events.json to match schema (required fields, types, namespaces).
