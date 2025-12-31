# Global API Plugins Specification

## Problem Statement

The HAI3 API layer needs a flexible plugin architecture that allows cross-cutting concerns (logging, authentication, mocking, telemetry) to be applied across API services. The current implementation has revealed architectural issues that require a new approach:

1. **Protocol-specific concerns mixed with generic plugin system** - REST and SSE have fundamentally different request/response models
2. **MockPlugin trying to be protocol-agnostic** - Leads to complex logic and unclear responsibilities
3. **Centralized plugin registry** - Makes protocol-level customization difficult

**Corrective Update (Post-Implementation Review):**
Based on implementation review, the architecture is being refactored to a protocol-specific plugin model where each protocol manages its own plugin type and mocking stays in plugins but is protocol-aware.

## User-Facing Behavior

### Protocol-Level Plugin Registration
- **Global**: `RestProtocol.globalPlugins.add(...)` applies to all REST services
- **Global**: `SseProtocol.globalPlugins.add(...)` applies to all SSE services
- **Instance**: `restProtocol.plugins.add(...)` for service-specific plugins
- Type-safe: Each protocol only accepts its own plugin type

### Mock Mode
- **REST**: `RestMockPlugin` returns fake responses via `{ shortCircuit: RestResponseContext }`
- **SSE**: `SseMockPlugin` returns fake EventSource via `{ shortCircuit: EventSourceLike }`
- Each mock plugin is honest about what it does - no cross-protocol logic
- Per-service mocking remains the preferred pattern for vertical slice compliance

### Short-Circuit Pattern
- Protocol-specific short-circuit types prevent type confusion
- REST: `{ shortCircuit: RestResponseContext }` - returns response data
- SSE: `{ shortCircuit: EventSourceLike }` - returns mock event source
- Type guards: `isRestShortCircuit()`, `isSseShortCircuit()`

## Non-Goals

- Plugin communication/shared state between plugins
- Plugin versioning or compatibility checks
- Complex dependency graph with topological sorting
- Async `destroy()` hooks
- String-based plugin naming or identification
- Centralized `apiRegistry.plugins.*` namespace (moved to protocol level)

## Requirements

### Functional Requirements

#### FR-1: Protocol-Specific Plugin Hooks
Each protocol defines its own plugin hook interfaces:
- `RestPluginHooks`: `onRequest`, `onResponse`
- `SsePluginHooks`: `onConnect`, `onEvent`
- `WsPluginHooks`: `onConnect`, `onMessage` (future)

#### FR-2: Protocol-Specific Short-Circuit Types
Short-circuit responses are protocol-specific:
- REST: `{ shortCircuit: RestResponseContext }` - complete response
- SSE: `{ shortCircuit: EventSourceLike }` - mock event source to use
- Type guards prevent accidental cross-protocol usage

#### FR-3: Protocol-Level Plugin Management
Plugin registration moves from central registry to protocol level:
- `RestProtocol.globalPlugins.add(plugin)` for global REST plugins
- `SseProtocol.globalPlugins.add(plugin)` for global SSE plugins
- `protocol.plugins.add(plugin)` for instance-specific plugins
- Plugin resolution: global plugins first, then instance plugins

#### FR-4: Pure SseProtocol
SseProtocol becomes pure - no mock simulation logic:
- Single branch: "did plugin short-circuit?" -> use provided EventSource, else create real one
- Same code path after getting the source (attaching handlers)
- All mock simulation logic moves to `SseMockPlugin`

#### FR-5: Protocol-Specific Mock Plugins
Mock plugins are protocol-aware and self-contained:
- `RestMockPlugin extends RestPluginWithConfig<RestMockConfig>`
- `SseMockPlugin extends SsePluginWithConfig<SseMockConfig>`
- SseMockPlugin creates and returns a fake EventSource
- Each is honest about what protocol it supports

#### FR-6: Vertical Slice Architecture Support
The plugin system must support vertical slice architecture:
- Screensets must have zero footprint outside their folder
- Each screenset can register its own services with its own mock configuration
- No global mock state that screensets need to contribute to

### Non-Functional Requirements

#### NFR-1: Type Safety
All plugin-related code must use proper TypeScript typing:
- No ESLint disable comments for type-related rules
- Proper type guards instead of type assertions where possible
- Protocol-specific generics prevent cross-protocol type errors

#### NFR-2: Performance
- Plugin chain execution should add minimal overhead
- Short-circuit should immediately stop the chain without unnecessary iterations

## Scenarios / User Journeys

### Scenario 1: REST Service with Protocol-Specific Mock Plugin

```typescript
// screensets/billing/services/BillingApiService.ts
class BillingApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol();
    super({ baseURL: '/api/billing' }, restProtocol);

    // Register protocol-specific mock plugin
    restProtocol.plugins.add(new RestMockPlugin({
      mockMap: {
        'GET /api/billing/invoices': () => mockInvoices,
        'POST /api/billing/payment': (body) => mockPaymentResult(body),
      },
      delay: 100,
    }));
  }
}
```

### Scenario 2: SSE Service with Protocol-Specific Mock Plugin

```typescript
// screensets/chat/services/ChatStreamService.ts
class ChatStreamService extends BaseApiService {
  constructor() {
    const sseProtocol = new SseProtocol();
    super({ baseURL: '/api/chat' }, sseProtocol);

    // Register SSE-specific mock plugin that returns fake EventSource
    sseProtocol.plugins.add(new SseMockPlugin({
      mockStreams: {
        '/api/chat/stream': () => createMockEventSource([
          { event: 'message', data: 'Hello' },
          { event: 'message', data: ' World' },
          { event: 'done', data: '' },
        ]),
      },
      delay: 50, // delay between events
    }));
  }
}
```

### Scenario 3: Cross-Cutting REST Plugin (Global)

```typescript
// Register auth plugin globally for all REST services
RestProtocol.globalPlugins.add(new AuthRestPlugin({
  getToken: () => localStorage.getItem('token'),
}));

// Later, any REST service will have auth applied
apiRegistry.register(BillingApiService); // Auth plugin runs for all requests
```

### Scenario 4: Pure SseProtocol Implementation

```typescript
// SseProtocol is now pure - single branch logic
class SseProtocol {
  connect(url: string, onMessage: (event: MessageEvent) => void): string {
    const connectionId = this.generateId();

    // Execute plugin chain
    const context: SseConnectContext = { url, headers: {} };
    const result = await this.executePluginChain(context);

    // Single branch: did plugin provide EventSource?
    const eventSource = isSseShortCircuit(result)
      ? result.shortCircuit  // Use plugin-provided EventSource
      : new EventSource(url); // Create real EventSource

    // Same code path for both - just attach handlers
    this.attachHandlers(connectionId, eventSource, onMessage);
    return connectionId;
  }
}
```

### Scenario 5: Cross-Cutting Plugin Implementing Multiple Protocols

```typescript
// For plugins that need to work across protocols
class TelemetryPlugin extends ApiPluginBase implements RestPluginHooks, SsePluginHooks {
  // REST hooks
  onRequest(ctx: RestRequestContext) {
    this.trackRequest('REST', ctx.url);
    return ctx;
  }

  onResponse(response: RestResponseContext) {
    this.trackResponse('REST', response.status);
    return response;
  }

  // SSE hooks
  onConnect(ctx: SseConnectContext) {
    this.trackRequest('SSE', ctx.url);
    return ctx;
  }

  onEvent(event: MessageEvent) {
    this.trackEvent('SSE', event.type);
    return event;
  }
}

// Register with both protocols
RestProtocol.globalPlugins.add(telemetryPlugin);
SseProtocol.globalPlugins.add(telemetryPlugin);
```

## Error Cases

### EC-1: Plugin Type Errors
- Compile-time: TypeScript errors when registering wrong plugin type with protocol
- Example: `SseProtocol.globalPlugins.add(new RestMockPlugin(...))` - compile error
- No runtime type assertions needed

### EC-2: Missing Mock Configuration
- If mock plugin is not registered and no real endpoint exists, normal HTTP/SSE error occurs
- No special handling required - follows standard error flow

### EC-3: Duplicate Global Plugin
- `RestProtocol.globalPlugins.add()` throws if plugin class already registered
- `SseProtocol.globalPlugins.add()` throws if plugin class already registered
- Instance-level plugins allow duplicates (different configurations)

### EC-4: Cross-Protocol Plugin Registration
- Cross-cutting plugins must implement correct hook interface for each protocol
- Registering plugin with protocol it doesn't support results in compile-time error

## Acceptance Criteria

### AC-1: Protocol-Specific Plugin Hooks
- [ ] `RestPluginHooks` interface defines `onRequest`, `onResponse`
- [ ] `SsePluginHooks` interface defines `onConnect`, `onEvent`
- [ ] Each protocol only accepts plugins implementing its hook interface

### AC-2: Protocol-Specific Short-Circuit Types
- [ ] REST short-circuit returns `{ shortCircuit: RestResponseContext }`
- [ ] SSE short-circuit returns `{ shortCircuit: EventSourceLike }`
- [ ] `isRestShortCircuit()` type guard correctly narrows REST short-circuit
- [ ] `isSseShortCircuit()` type guard correctly narrows SSE short-circuit

### AC-3: Protocol-Level Plugin Management
- [ ] `RestProtocol.globalPlugins.add()` registers global REST plugins
- [ ] `SseProtocol.globalPlugins.add()` registers global SSE plugins
- [ ] `protocol.plugins.add()` registers instance-specific plugins
- [ ] Plugin resolution order: global first, then instance
- [ ] `apiRegistry.plugins.*` namespace is removed

### AC-4: Pure SseProtocol
- [ ] SseProtocol has NO mock simulation logic
- [ ] SseProtocol has single branch: short-circuit EventSource vs real EventSource
- [ ] Same handler attachment code path for both mock and real
- [ ] All mock streaming logic is in `SseMockPlugin`

### AC-5: Protocol-Specific Mock Plugins
- [ ] `RestMockPlugin` extends `RestPluginWithConfig<RestMockConfig>`
- [ ] `SseMockPlugin` extends `SsePluginWithConfig<SseMockConfig>`
- [ ] `SseMockPlugin` returns `EventSourceLike` for short-circuit
- [ ] No cross-protocol mock logic in either plugin

### AC-6: Class Hierarchy
- [ ] `ApiPluginBase` is the base class with `destroy()` lifecycle
- [ ] `RestPlugin extends ApiPluginBase implements RestPluginHooks`
- [ ] `SsePlugin extends ApiPluginBase implements SsePluginHooks`
- [ ] `RestPluginWithConfig<T>` and `SsePluginWithConfig<T>` provide config support
- [ ] Cross-cutting plugins extend `ApiPluginBase` and implement multiple hook interfaces

### AC-7: Vertical Slice Support
- [ ] Screensets can register protocol-specific plugins on their services
- [ ] No global mock state that screensets need to contribute to
- [ ] Screenset services work independently of global plugin state

### AC-8: Type Safety
- [ ] No `eslint-disable` comments for type-related rules in api package
- [ ] Protocol-specific generics prevent cross-protocol type errors
- [ ] Type guards used instead of type assertions where possible
