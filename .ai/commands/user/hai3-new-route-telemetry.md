<!-- @standalone -->
# hai3:new-route-telemetry - Add Telemetry to Route

## PREREQUISITES (CRITICAL - STOP IF FAILED)
FORBIDDEN: Adding telemetry without reading .ai/targets/PERF_TELEMETRY.md first.
FORBIDDEN: Orphan spans (every span MUST have action.name).

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/PERF_TELEMETRY.md before starting.
2) Identify the route module to instrument.
3) Add telemetry hooks following the pattern below.
4) Validate with `npm run lint:telemetry`.

## STEPS

1. Define stable `routeId` (e.g., `billing.overview`).
2. Add `@telemetry-route` comment sentinel at file top.
3. Add `useRoutePerf(routeId, performance.now())`.
4. Add `useDoneRendering('${routeId}.ready', { dataReady })`.
5. Optionally add `useWebVitals(routeId)` for Core Web Vitals.
6. Ensure route-level API calls use `apiRegistry.getService()` (auto-instrumented via OTel FetchInstrumentation).
7. Validate: `npm run lint:telemetry`.

## REQUIRED IMPORTS

```tsx
import { useRoutePerf, useDoneRendering, useWebVitals } from '@hai3/perf-telemetry';
```

## PATTERN

```tsx
// @telemetry-route
function MyScreen() {
  const routeId = 'my-domain.screen-name';
  useRoutePerf(routeId, performance.now());
  useDoneRendering(`${routeId}.ready`, { dataReady: !!data });
  useWebVitals(routeId);
  // ...
}
```

## VALIDATE

```bash
npm run lint:telemetry
npm run test:telemetry-smoke
```
