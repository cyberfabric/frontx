<!-- @standalone -->
# frontx:instrument-action-telemetry - Instrument Critical Action

## PREREQUISITES (CRITICAL - STOP IF FAILED)
FORBIDDEN: Adding telemetry without reading .ai/targets/PERF_TELEMETRY.md first.
FORBIDDEN: Orphan spans (every span MUST have action.name).

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/PERF_TELEMETRY.md before starting.
2) Identify the critical action to instrument (submit, save, delete, run, apply).
3) Wrap with useTelemetryAction following the pattern below.

## STEPS

1. Add `@telemetry-critical-action` comment sentinel near the action handler.
2. Create action hook: `const runAction = useTelemetryAction('domain.actionName', { routeId })`.
3. Wrap the async work inside the action callback.
4. Validate: `npm run lint:telemetry`.

## REQUIRED IMPORTS

```tsx
import { useTelemetryAction } from '@cyberfabric/perf-telemetry';
```

## PATTERN

```tsx
// @telemetry-critical-action
const runSubmit = useTelemetryAction('billing.submit', { routeId: 'billing.overview' });

const onSubmit = () => runSubmit(async () => {
  await apiRegistry.getService(BillingApiService).save(payload);
});
```

## VALIDATE

```bash
npm run lint:telemetry
```
