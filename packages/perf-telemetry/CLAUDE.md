# @cyberfabric/perf-telemetry

L1 SDK for action-first performance telemetry using the OpenTelemetry Browser SDK.

## SDK Layer

This package is part of the **SDK Layer (L1)** — zero `@cyberfabric` dependencies. It can be consumed by any FrontX MFE or third-party React app. All OpenTelemetry packages are peer dependencies; the host app installs them.

## Key Principle

Every span MUST belong to a named action. This is enforced at two levels:

1. **Explicit actions** — `useTelemetryAction` / `runTelemetryAction` wrap user-triggered work in a named action span. All child spans (API calls, renders) are correlated to it.
2. **Ambient fallback** — when no explicit action is active, `HAI3SpanProcessor.onStart()` calls `findRelatedActionScope()` which falls back to `ensureAmbientAction(routeId)`. This creates a synthetic `<routeId>.ambient` span so no span is ever orphaned.

No span may appear in the trace backend without `action.name`.

## Files and Responsibilities

| File | Responsibility |
|---|---|
| `src/types.ts` | All shared types. Single source of truth — no inline type definitions elsewhere. |
| `src/action-scope.ts` | Correlation engine. Manages active/recent action scopes and resolves parent context for child spans. |
| `src/otel-init.ts` | OTel SDK bootstrap. Registers `HAI3SpanProcessor`, `ExportGateSpanProcessor`, auto-instrumentations. Exports `initOtel`, `getTracer`, `runFrontendWork`, etc. |
| `src/hooks.ts` | React instrumentation hooks. `useRoutePerf`, `useDoneRendering`, `useTelemetryAction`, `useWebVitals`, `useLongTaskObserver`, `useResourceTimingObserver`. |
| `src/TelemetryProvider.tsx` | React context provider. Initializes OTel on mount, exposes `emit()` and `killSwitch()`. |
| `src/telemetry-store.ts` | In-memory `SpanProcessor`. Captures completed spans for dev tools / analytics dashboards without hitting the remote collector. |
| `src/index.ts` | Barrel export — all public API. |

## Public API

### React

```typescript
import { TelemetryProvider, useTelemetryContext } from '@cyberfabric/perf-telemetry';

// Wrap root
<TelemetryProvider serviceName="my-app" collectorUrl="https://otel.example.com" environment="production">
  <App />
</TelemetryProvider>

// Inside components
const { emit, sessionId, killSwitch } = useTelemetryContext();
```

### Hooks

```typescript
import {
  useRoutePerf,           // Emits route.navigation span on mount
  useDoneRendering,       // Emits render readiness signal with double-rAF paint timing
  useTelemetryAction,     // Returns a callback that wraps work in an action span
  useInstrumentedFetch,   // Returns instrumentedFetch bound to useCallback
  useWebVitals,           // Observes LCP, CLS, INP, TTFB
  useLongTaskObserver,    // Observes longtask entries
  useResourceTimingObserver, // Observes resource timing entries
} from '@cyberfabric/perf-telemetry';

// Route screen pattern
function MyScreen() {
  useRoutePerf('my-screen', navigationStartMs);
  useDoneRendering('my-screen.ready', { dataReady: !!data });
  useWebVitals('my-screen');

  const doAction = useTelemetryAction('my-screen.save', { routeId: 'my-screen' });
  // doAction(() => saveData());
}
```

### Programmatic

```typescript
import {
  runTelemetryAction,     // Standalone action wrapper (outside React)
  instrumentedFetch,      // Fetch with span correlation
  initOtel,               // Manual SDK init (if not using TelemetryProvider)
  setRuntimeConfigProvider, // Inject live runtime config (feature flags, account attrs)
  runFrontendWork,        // Wrap non-action frontend work in a span
  getTracer,              // Get a named tracer
  setCurrentRouteId,      // Update route context (called automatically by useRoutePerf)
  flushOtel,              // Force-flush pending spans
  shutdownOtel,           // Shutdown SDK
  isOtelInitialized,      // Check init state
  getOtelSessionId,       // Get stable session ID
} from '@cyberfabric/perf-telemetry';
```

### Action Scope (advanced)

```typescript
import {
  beginActionScope,         // Register an active action scope
  endActionScope,           // Remove and archive a scope
  getActiveActionScopes,    // List all active scopes
  findRelatedActionScope,   // Resolve nearest action for a timestamp
  getActionParentContext,   // Get OTel Context for a child span
  getTelemetryParentContext, // Prefer routeUiScope context, fall back to action context
  setAmbientTracer,         // Register the ambient span tracer factory
  endAmbientAction,         // End current ambient span (called on route change)
  getAmbientScope,          // Inspect current ambient scope
  beginRouteUiScope,        // Register a render scope (readySpan + uiSpan)
  endRouteUiScope,          // End and retrieve a render scope
  getActiveRouteUiScope,    // Inspect active render scope for a route
  getRouteUiParentContext,  // Get OTel Context parented to the active uiSpan
} from '@cyberfabric/perf-telemetry';
```

### Dev Tools Store

```typescript
import { telemetryStore, TelemetryStoreProcessor } from '@cyberfabric/perf-telemetry';

// Register in OTel provider
spanProcessors: [new TelemetryStoreProcessor(), ...otherProcessors]

// Subscribe in a component
const unsubscribe = telemetryStore.subscribe(() => {
  const spans = telemetryStore.getSpans(); // StoredSpan[]
  render(spans);
});
```

### Types

```typescript
import type {
  OtelConfig,
  TelemetryRuntimeConfig,
  TelemetryContextValue,
  TelemetryProviderProps,
  ActionScope,
  RouteUiScope,
  StoredSpan,
  SpanListener,
} from '@cyberfabric/perf-telemetry';
```

## Peer Dependencies

Install all of these in the consuming app:

```
@opentelemetry/api >=1.0.0
@opentelemetry/sdk-trace-web >=1.0.0
@opentelemetry/sdk-trace-base >=1.0.0
@opentelemetry/exporter-trace-otlp-http >=0.50.0
@opentelemetry/resources >=1.0.0
@opentelemetry/semantic-conventions >=1.0.0
@opentelemetry/context-zone >=1.0.0
@opentelemetry/instrumentation >=0.50.0
@opentelemetry/instrumentation-fetch >=0.50.0
@opentelemetry/instrumentation-document-load >=0.30.0
@opentelemetry/instrumentation-user-interaction >=0.30.0
react >=18.0.0
```

## Integration Pattern

```tsx
// 1. app root — wrap with provider
import { TelemetryProvider } from '@cyberfabric/perf-telemetry';

export function AppRoot() {
  return (
    <TelemetryProvider
      serviceName="my-app"
      serviceVersion={APP_VERSION}
      collectorUrl={OTEL_COLLECTOR_URL}
      environment={ENV}
      enabled={!isLocalDev}
    >
      <Router />
    </TelemetryProvider>
  );
}

// 2. inject runtime config after auth
import { setRuntimeConfigProvider } from '@cyberfabric/perf-telemetry';

setRuntimeConfigProvider(() => ({
  exportToCollector: runtimeConfig.telemetryEnabled,
  includeDebugData: runtimeConfig.telemetryDebug,
  accountId: user.id,
  accountPlan: user.plan,
  // ...
}));

// 3. screen — instrument route and render
function InboxScreen() {
  useRoutePerf('inbox', navigationStartMs);
  useDoneRendering('inbox.ready', { dataReady: !!threads });
  useWebVitals('inbox');

  const loadThread = useTelemetryAction('inbox.loadThread', { routeId: 'inbox' });

  return <ThreadList onOpen={(id) => loadThread(() => openThread(id))} />;
}
```
