# Change: Add Global API Service Plugins (Class-Based Design)

## Why

Currently, API plugins must be registered on each service individually. This creates friction when:

1. **Cross-cutting concerns**: Logging, authentication, or telemetry plugins need to be registered on every service manually
2. **Dynamic plugin management**: Toggling mock mode requires iterating through all services and registering/unregistering plugins individually
3. **Consistency**: No guarantee that all services have the same plugins applied, leading to inconsistent behavior

A global plugin registry at the apiRegistry level would allow plugins to be applied consistently across ALL API services (existing and future) with a single registration call.

## Design Direction: Class-Based Plugin Architecture

We are adopting a **pure class-based approach** for plugins:

- **Abstract `ApiPlugin<TConfig>` base class** - All plugins extend this class
- **Type-safe plugin identification by class reference** - No string names, compile-time safety
- **OCP-compliant dependency injection via constructor config** - Plugins don't know about services
- **No `next()` call needed** - Framework chains automatically
- **Short-circuit via return value** - Return `{ shortCircuit: response }` to skip HTTP request
- **FIFO ordering** - Registration order determines execution order
- **Explicit positioning by class reference** - Optional `before`/`after` for specific ordering needs

### Key Design Principles

1. **Class reference for identification** - Use `PluginClass<T>` type instead of string names
2. **DI via constructor config** - Service-specific behavior injected, not accessed via context
3. **Pure request data in ApiRequestContext** - No service identification; plugins use DI for service-specific behavior
4. **Tree-shaking compliant** - No static properties, no module-level instantiation
5. **Parameter property for config** - Simplified `ApiPlugin` class using TypeScript parameter property

## What Changes

### 1. New Type Definitions

- **`ApiPlugin<TConfig>`** - Abstract base class for all plugins
- **`PluginClass<T>`** - Type for referencing plugin classes
- `ApiRequestContext` - Immutable request context (pure request data, no service identification)
- `ApiResponseContext` - Immutable response context returned from chain
- `ShortCircuitResponse` - Wrapper for short-circuiting requests

### 2. Namespaced Plugin API on apiRegistry

- Add `apiRegistry.plugins` namespace object for all plugin operations
- `plugins.add(...plugins)` - Bulk registration (FIFO), throws on duplicate class
- `plugins.addBefore(plugin, before)` - Position before target class
- `plugins.addAfter(plugin, after)` - Position after target class
- `plugins.remove(pluginClass)` - Remove by class, calls destroy()
- `plugins.has(pluginClass)` - Type-safe check
- `plugins.getAll()` - Get all plugins in execution order
- Automatically applied to ALL services (existing and future)

### 3. Plugin Lifecycle Methods

- `onRequest(ctx)` - Called before request, can modify context or short-circuit
- `onResponse(response, request)` - Called after response, can modify response
- `onError(error, request)` - Called on error, can recover or modify error
- `destroy()` - Called when plugin is unregistered for cleanup

### 4. Service-Level Plugin Management

- Add `service.plugins` namespace object for service-specific plugin operations
- `plugins.add(...plugins)` - Add service-specific plugins (duplicates allowed)
- `plugins.exclude(...pluginClasses)` - Exclude global plugins by class
- `plugins.getExcluded()` - Get excluded plugin classes
- `plugins.getAll()` - Get service plugins (not including globals)
- **Duplicate Policy**: Service plugins allow duplicates (same class with different configs)

### 5. Plugin Execution Model

- **Request phase**: Global plugins (FIFO) -> Service plugins (FIFO) -> HTTP request
- **Response phase**: Reverse order (onion model)
- **Short-circuit**: Return `{ shortCircuit: response }` from `onRequest` to skip HTTP
- **Error recovery**: Return `ApiResponseContext` from `onError` to recover

### 6. Layer Propagation

- `@hai3/framework` re-exports updated types (already does via pass-through)
- `@hai3/react` re-exports from framework (already does)
- No code changes needed in L2/L3 layers

## Impact

**Affected Specs:**
- `sdk-core` - New type definitions, ApiRegistry interface extension, BaseApiService extension

**Affected Files:**
- `packages/api/src/types.ts` - New types (ApiPlugin class, ApiRequestContext, etc.)
- `packages/api/src/BaseApiService.ts` - Plugin methods, exclusion by class
- `packages/api/src/apiRegistry.ts` - Global plugin storage and methods
- `packages/api/src/plugins/MockPlugin.ts` - Update to extend new `ApiPlugin<TConfig>` class
- `packages/api/src/index.ts` - Export changes (new types)

**Benefits:**
- Single point of registration for cross-cutting plugins
- Consistent plugin application across all services
- **Type-safe plugin identification** - No string typos, compile-time checking
- **OCP-compliant** - Plugins don't need to know about services
- **Clear namespace separation** - `apiRegistry.plugins` vs `service.plugins`
- Short-circuit capability for mocking without touching HTTP layer
- Future-proof for authentication, logging, telemetry plugins
- Maintains backward compatibility for per-service plugins

## Dependencies

None. This is a self-contained enhancement to the API package.

## Risks

1. **Class Boilerplate**: Plugins require class syntax
   - **Mitigation**: Base class handles most boilerplate; simple plugins remain simple
   - **Benefit**: Consistent with HAI3 patterns, type-safe identification

2. **Ordering Complexity**: Before/after positioning edge cases
   - **Mitigation**: Clear validation with helpful error messages
   - **Design**: Circular dependency detection in registration

3. **Memory Leaks**: Global plugins not cleaned up properly
   - **Mitigation**: Add `reset()` cleanup for global plugins array, call `destroy()` methods

4. **Exclusion Correctness**: Type-safe exclusion prevents typos
   - **Benefit**: Compile-time validation instead of runtime warnings

5. **Short-circuit abuse**: Plugins may short-circuit unexpectedly
   - **Mitigation**: Clear documentation, short-circuit is explicit return type

## Testing Strategy

1. **Unit tests**: Global plugin registration/unregistration by class
2. **Unit tests**: Before/after ordering validation with class references
3. **Unit tests**: Service-level exclusion by class
4. **Unit tests**: Short-circuit behavior
5. **Unit tests**: Error recovery behavior
6. **Integration tests**: Plugin chaining order verification
7. **Manual testing**: Mock mode toggle via global plugin

## Example Usage

### Simple Plugin (No Config)

```typescript
class LoggingPlugin extends ApiPlugin<void> {
  constructor() {
    super(void 0);
  }

  onRequest(ctx: ApiRequestContext) {
    console.log(`[${ctx.method}] ${ctx.url}`);
    return ctx;
  }

  onResponse(response: ApiResponseContext, request: ApiRequestContext) {
    console.log(`[${response.status}] ${request.url}`);
    return response;
  }
}

// Registration via namespaced API
apiRegistry.plugins.add(new LoggingPlugin());

// Removal - by CLASS, not string
apiRegistry.plugins.remove(LoggingPlugin);
```

### Plugin with Config (DI)

```typescript
class AuthPlugin extends ApiPlugin<{ getToken: () => string | null }> {
  onRequest(ctx: ApiRequestContext) {
    const token = this.config.getToken();
    if (!token) return ctx;
    return {
      ...ctx,
      headers: { ...ctx.headers, Authorization: `Bearer ${token}` }
    };
  }
}

// Registration with config
apiRegistry.plugins.add(
  new AuthPlugin({ getToken: () => localStorage.getItem('token') })
);

// Exclusion - by CLASS (using namespaced API)
class HealthCheckService extends BaseApiService {
  constructor() {
    super();
    this.plugins.exclude(AuthPlugin);
  }
}
```

### Rate Limiting with Service-Level Plugins

```typescript
// Pure DI approach - no service identification needed in context
class RateLimitPlugin extends ApiPlugin<{ limit: number }> {
  onRequest(ctx: ApiRequestContext) {
    // Apply rate limiting with injected limit
    return ctx;
  }
}

// Different limits per service via service-level plugins (duplicates allowed)
userService.plugins.add(new RateLimitPlugin({ limit: 100 }));
adminService.plugins.add(new RateLimitPlugin({ limit: 1000 }));

// Or for URL-based limits as a global plugin:
class UrlRateLimitPlugin extends ApiPlugin<{ getLimitForUrl: (url: string) => number }> {
  onRequest(ctx: ApiRequestContext) {
    const limit = this.config.getLimitForUrl(ctx.url);
    // Apply rate limiting logic...
    return ctx;
  }
}

apiRegistry.plugins.add(new UrlRateLimitPlugin({
  getLimitForUrl: (url) => url.includes('/admin') ? 1000 : 100
}));
```

### Positioning by Class

```typescript
// Add plugins in FIFO order
apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken }));

// Position explicitly - by CLASS reference
apiRegistry.plugins.addAfter(new MetricsPlugin(), LoggingPlugin);
apiRegistry.plugins.addBefore(new ErrorPlugin(), AuthPlugin);

// Check if registered - by CLASS
apiRegistry.plugins.has(LoggingPlugin);  // true

// Get all plugins in execution order
apiRegistry.plugins.getAll();
```

## Key Design Decisions

1. **Class-based over hooks-based** - Consistency with HAI3 patterns, type-safe identification
2. **Class reference for identification** - No string names, compile-time safety
3. **DI via constructor config** - OCP compliance, plugins don't know about services
4. **Pure request data in ApiRequestContext** - No serviceName; use DI for service-specific behavior
5. **Namespaced plugin API** - `apiRegistry.plugins` and `service.plugins` for clear separation
6. **Duplicate policy** - Global: no duplicates; Service: duplicates allowed
7. **Parameter property for config** - Simplified `ApiPlugin` class
8. **Tree-shaking compliant** - No static props, no module-level instantiation

## Open Questions

> **Note**: These questions are tracked here to ensure they are addressed before or during implementation.

1. **Should multiple short-circuits in a chain be an error?**
   - Current decision: First short-circuit wins, subsequent plugins see the short-circuited response
   - Rationale: Predictable behavior, matches middleware patterns

2. **Should `onError` allow retry?**
   - Current decision: Re-throwing the error signals retry desire (framework handles retry logic)
   - Rationale: Keeps `onError` simple - transform error or recover with response

3. **Should there be a `beforeAll`/`afterAll` position for explicit first/last?**
   - Current decision: Not in initial implementation
   - Rationale: Can be added later if needed; YAGNI

4. **Should `destroy()` be async?**
   - Current decision: No, keep it sync
   - Rationale: Cleanup should be fast; async cleanup can use fire-and-forget pattern
