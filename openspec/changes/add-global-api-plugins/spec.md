# Global API Plugins Specification

## Problem Statement

The HAI3 API layer needs a flexible plugin architecture that allows cross-cutting concerns (logging, authentication, mocking, telemetry) to be applied across API services. The current implementation has revealed three architectural violations that must be corrected:

1. **SSE Protocol has direct knowledge of MockPlugin** - Violates Open/Closed Principle (OCP) and Dependency Inversion Principle (DIP)
2. **MockPlugin is designed for global registration** - Violates vertical slice architecture principles for screensets
3. **Type safety shortcuts** - ESLint exceptions may have been used instead of proper typing

## User-Facing Behavior

### Plugin Registration
- Global plugins registered via `apiRegistry.plugins.add()` apply to all services
- Service-level plugins registered via `service.plugins.add()` apply only to that service
- Services can exclude global plugins via `service.plugins.exclude(PluginClass)`

### Mock Mode
- Mocking is handled by MockPlugin instances registered per-service or per-screenset
- Screensets can register their own services with their own MockPlugin configurations
- No global mock coordination is required - each service is self-contained

### Short-Circuit Pattern
- Any plugin can short-circuit a request by returning `{ shortCircuit: ApiResponseContext }`
- Protocols execute the plugin chain generically without knowing specific plugin types
- The short-circuit pattern works uniformly for all plugins, not just MockPlugin

## Non-Goals

- Plugin communication/shared state between plugins
- Plugin versioning or compatibility checks
- Complex dependency graph with topological sorting
- Async `destroy()` hooks
- String-based plugin naming or identification

## Requirements

### Functional Requirements

#### FR-1: Per-Service Mock Configuration
MockPlugin must support per-service registration, not just global registration:
- Each service can have its own MockPlugin instance with its own mock map
- Screensets can register services with mocks without affecting other screensets
- No global mock map coordination is required

#### FR-2: Protocol Plugin Agnosticism (OCP/DIP Compliance)
Protocols must not have direct knowledge of specific plugin implementations:
- Protocols invoke the plugin chain generically
- Short-circuit detection uses the `isShortCircuit()` type guard
- No `instanceof MockPlugin` checks in protocol code
- Protocols are closed for modification, open for extension

#### FR-3: Type Safety
All plugin-related code must use proper TypeScript typing:
- No ESLint disable comments for type-related rules
- Proper type guards instead of type assertions where possible
- Generic plugin execution chain with type-safe short-circuit handling

#### FR-4: Vertical Slice Architecture Support
The plugin system must support vertical slice architecture:
- Screensets must have zero footprint outside their folder
- Each screenset can register its own services with its own mock configuration
- No global mock state that screensets need to contribute to

### Non-Functional Requirements

#### NFR-1: Backward Compatibility
- Existing service registrations must continue to work
- Legacy plugin system (`LegacyApiPlugin`) remains supported during migration

#### NFR-2: Performance
- Plugin chain execution should add minimal overhead
- Short-circuit should immediately stop the chain without unnecessary iterations

## Scenarios / User Journeys

### Scenario 1: Screenset with Self-Contained Mocks

```typescript
// screensets/billing/services/BillingApiService.ts
class BillingApiService extends BaseApiService {
  constructor() {
    super({ baseURL: '/api/billing' }, new RestProtocol());

    // Register service-level MockPlugin with screenset-specific mocks
    this.plugins.add(new MockPlugin({
      mockMap: {
        'GET /api/billing/invoices': () => mockInvoices,
        'POST /api/billing/payment': (body) => mockPaymentResult(body),
      },
      delay: 100,
    }));
  }
}
```

### Scenario 2: Protocol Executing Plugin Chain Without Plugin Knowledge

```typescript
// RestProtocol executes plugins generically
private async executeClassPluginOnRequest(
  context: ApiRequestContext
): Promise<ApiRequestContext | ShortCircuitResponse> {
  for (const plugin of this.getClassPlugins()) {
    if (plugin.onRequest) {
      const result = await plugin.onRequest(currentContext);

      // Generic short-circuit detection - no instanceof checks
      if (isShortCircuit(result)) {
        return result;
      }

      currentContext = result;
    }
  }
  return currentContext;
}
```

### Scenario 3: SSE Protocol Generic Mock Handling

```typescript
// SseProtocol must NOT do this:
// BAD: const mockPlugin = this.getPlugins().find(p => p instanceof MockPlugin);

// SseProtocol should use generic plugin chain:
// GOOD: Execute onRequest for all plugins, check for short-circuit
connect(url, onMessage, onComplete) {
  const context = { method: 'GET', url, headers: {} };
  const result = await this.executePluginOnRequest(context);

  if (isShortCircuit(result)) {
    // Handle short-circuit generically
    this.simulateStreamFromResponse(result.shortCircuit, onMessage, onComplete);
    return connectionId;
  }

  // Real SSE connection
  // ...
}
```

## Error Cases

### EC-1: Plugin Type Errors
- Compile-time: TypeScript errors for incorrect plugin return types
- No runtime type assertions needed

### EC-2: Missing Mock Configuration
- If MockPlugin is not registered and no real endpoint exists, normal HTTP error occurs
- No special handling required - follows standard error flow

### EC-3: Duplicate Global Plugin
- `apiRegistry.plugins.add()` throws if plugin class already registered
- Service-level plugins allow duplicates (different configurations)

## Acceptance Criteria

### AC-1: Per-Service MockPlugin Registration
- [ ] MockPlugin can be registered on individual services via `service.plugins.add()`
- [ ] Each service can have its own mock map
- [ ] Screensets can register their own services with their own mocks
- [ ] No global mock coordination needed

### AC-2: Protocol OCP/DIP Compliance
- [ ] SseProtocol does NOT use `instanceof MockPlugin`
- [ ] RestProtocol does NOT use `instanceof MockPlugin`
- [ ] All protocols use `isShortCircuit()` type guard for short-circuit detection
- [ ] Protocols execute plugin chain generically without plugin-specific knowledge

### AC-3: Type Safety
- [ ] No `eslint-disable` comments for type-related rules in api package
- [ ] Proper TypeScript typing for all plugin-related code
- [ ] Type guards used instead of type assertions where possible

### AC-4: Vertical Slice Support
- [ ] Screensets can be fully self-contained with their own mock configuration
- [ ] No global mock state that screensets need to contribute to
- [ ] Screenset services work independently of global plugin state
