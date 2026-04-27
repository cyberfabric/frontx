# Telemetry Integration and Validation

## Integration contract

Keep the existing HAI3 frontend APIs from @cyberfabric/perf-telemetry:

- `useRoutePerf`
- `useDoneRendering`
- `useTelemetryAction`
- first-party API calls through the instrumented wrapper

Only the backend endpoint or validation target should change.

## Runtime configuration

Source of truth: `.ai/references/telemetry/backend-config.json`

Apply the values from `runtimeEnv` and `frontend` in that file to your app runtime configuration.

Required runtime keys:

- `VITE_OTEL_COLLECTOR_URL`
- `VITE_TELEMETRY_ENABLED`
- `VITE_SERVICE_NAME`
- `VITE_SERVICE_VERSION`
- `VITE_ENVIRONMENT`

## Route instrumentation pattern

```tsx
const routeId = 'products.list';
const navigationStartMs = performance.now();

useRoutePerf(routeId, navigationStartMs);
useDoneRendering('products.list.ready', { dataReady: products.length > 0 });
```

## Critical action pattern

```tsx
const runSubmit = useTelemetryAction('products.add_to_cart');
```

## API pattern

```ts
await instrumentedFetch('/api/cart', {
  routeId: 'products.list',
  actionName: 'products.add_to_cart',
});
```

## Validation commands

```bash
npm run lint:telemetry
npm run test:telemetry-contract
npm run test:telemetry-smoke
npm run validate:telemetry
```

## Baseline validation flow

1. Read Datadog and collector URLs from `.ai/references/telemetry/backend-config.json`.
2. Select the service by `service.name`.
3. Verify traces for:
   - `route.navigation`
   - `<routeId>.ready`
   - action spans
4. Open one Datadog trace and confirm child HTTP spans and parent/child hierarchy.
5. Validate the APM service page and dashboard links from the `datadog` section.

## Failure-mode checks

- Datadog unavailable: app business flows still work
- Collector unavailable: telemetry export failure does not break UX
- Missing `DD_API_KEY`: collector-side export is blocked until credentials are provided and app business flows remain unaffected
