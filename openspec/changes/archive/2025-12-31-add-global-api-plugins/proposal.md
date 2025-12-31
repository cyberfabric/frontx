# Change: Add Global API Service Plugins (Class-Based Design)

## Why

Currently, API plugins must be registered on each service individually. This creates friction when:

1. **Cross-cutting concerns**: Logging, authentication, or telemetry plugins need to be registered on every service manually
2. **Dynamic plugin management**: Toggling mock mode requires iterating through all services and registering/unregistering plugins individually
3. **Consistency**: No guarantee that all services have the same plugins applied, leading to inconsistent behavior

A global plugin registry at the apiRegistry level would allow plugins to be applied consistently across ALL API services (existing and future) with a single registration call.

## Design Direction: Class-Based Plugin Architecture

We are adopting a **pure class-based approach** for plugins:

- **Abstract `ApiPluginBase` class** - Non-generic base class for storage and identification
- **Generic `ApiPlugin<TConfig>` class** - Extends ApiPluginBase with typed config support
- **Type-safe plugin identification by class reference** - No string names, compile-time safety
- **Class-based service registration** - Use class constructor reference instead of string domains
- **OCP-compliant dependency injection via constructor config** - Plugins don't know about services
- **No `next()` call needed** - Framework chains automatically
- **Short-circuit via return value** - Return `{ shortCircuit: response }` to skip HTTP request
- **FIFO ordering** - Registration order determines execution order
- **Explicit positioning by class reference** - Optional `before`/`after` for specific ordering needs
- **Internal global plugins injection** - BaseApiService has internal `_setGlobalPluginsProvider()` method

### Key Design Principles

1. **Class reference for identification** - Use `PluginClass<T>` type instead of string names
2. **Class-based service registration** - Use class constructor instead of string domains
3. **DI via constructor config** - Service-specific behavior injected, not accessed via context
4. **Pure request data in ApiRequestContext** - No service identification; plugins use DI for service-specific behavior
5. **Tree-shaking compliant** - No static properties, no module-level instantiation
6. **DRY plugin classes** - ApiPluginBase for storage, ApiPlugin<TConfig> for typed config
7. **Internal global plugins injection** - `_setGlobalPluginsProvider()` called by apiRegistry after instantiation

## What Changes

### 1. Class-Based Service Registration (Replaces String Domains)

Instead of string domain keys, use class constructor references:

```typescript
// OLD (string-based) - REMOVED
apiRegistry.register('accounts', AccountsApiService);
const service = apiRegistry.getService('accounts');

// NEW (class-based)
apiRegistry.register(AccountsApiService);
const service = apiRegistry.getService(AccountsApiService);
```

### 2. Updated ApiRegistry Interface (OCP/DIP Compliant)

```typescript
interface ApiRegistry {
  // Service management - class-based
  register<T extends BaseApiService>(serviceClass: new () => T): void;
  getService<T extends BaseApiService>(serviceClass: new () => T): T;
  has<T extends BaseApiService>(serviceClass: new () => T): boolean;

  // REMOVED: getDomains() - no longer applicable with class-based registration
  // REMOVED: registerMocks() - mock configuration moved entirely to MockPlugin (OCP/DIP)
  // REMOVED: setMockMode() - replaced by plugins.add/remove(MockPlugin) (OCP/DIP)

  // Plugin management - unchanged namespace (generic, no plugin-specific methods)
  readonly plugins: {
    add(...plugins: ApiPluginBase[]): void;
    addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void;
    addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void;
    remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void;
    has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean;
    getAll(): readonly ApiPluginBase[];
    getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined;
  };
}
```

### 3. DRY Plugin Classes

Two-class hierarchy eliminates duplication:

```typescript
// Non-generic base class for storage and identification
abstract class ApiPluginBase {
  onRequest?(ctx: ApiRequestContext): ApiRequestContext | ShortCircuitResponse | Promise<...>;
  onResponse?(response: ApiResponseContext, request: ApiRequestContext): ApiResponseContext | Promise<...>;
  onError?(error: Error, request: ApiRequestContext): Error | ApiResponseContext | Promise<...>;
  destroy?(): void;
}

// Generic class with typed config support
abstract class ApiPlugin<TConfig> extends ApiPluginBase {
  constructor(protected readonly config: TConfig) {
    super();
  }
}
```

### 4. Internal Global Plugins Injection

BaseApiService receives global plugins provider via internal method:

```typescript
abstract class BaseApiService {
  // Internal method called by apiRegistry after instantiation
  // Not exposed to users (underscore convention)
  _setGlobalPluginsProvider(provider: () => readonly ApiPluginBase[]): void;

  // No burden on derived service classes
}
```

### 5. getPlugin() Method

Find a plugin by its constructor reference:

```typescript
// On BaseApiService or accessible via service
getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined;
```

### 6. Removed: ApiServicesMap Module Augmentation

No longer needed since class reference IS the type. TypeScript infers the return type from the class constructor.

### 7. Removed: Mock-Specific Registry Methods (OCP/DIP Compliance)

The following mock-specific methods are removed from apiRegistry:

- `registerMocks(serviceClass, mockMap)` - Mock configuration now goes entirely through MockPlugin constructor
- `setMockMode(boolean)` - Replaced by generic `plugins.add(MockPlugin)` / `plugins.remove(MockPlugin)`
- `getMockMap(domain)` - No longer needed; MockPlugin manages its own mock map
- `useMockApi` config option - Removed from ApiServicesConfig

Services no longer need to override `getMockMap()`:
```typescript
// BEFORE (OCP violation - service knows about mocking)
class AccountsApiService extends BaseApiService {
  protected getMockMap(): MockMap {
    return apiRegistry.getMockMap(ACCOUNTS_DOMAIN);  // Hardcoded coupling
  }
}

// AFTER (OCP compliant - service is completely unaware of mocking)
class AccountsApiService extends BaseApiService {
  // No mock-related code needed
}
```

### 8. Removed: Legacy/Deprecated Code

- No deprecated methods
- No backward compatibility shims
- Clean break

### 9. New Type Definitions

- **`ApiPluginBase`** - Abstract base class for all plugins (non-generic)
- **`ApiPlugin<TConfig>`** - Abstract class extending ApiPluginBase with config
- **`PluginClass<T>`** - Type for referencing plugin classes
- `ApiRequestContext` - Immutable request context (pure request data, no service identification)
- `ApiResponseContext` - Immutable response context returned from chain
- `ShortCircuitResponse` - Wrapper for short-circuiting requests

### 10. Namespaced Plugin API on apiRegistry

- Add `apiRegistry.plugins` namespace object for all plugin operations
- `plugins.add(...plugins)` - Bulk registration (FIFO), throws on duplicate class
- `plugins.addBefore(plugin, before)` - Position before target class
- `plugins.addAfter(plugin, after)` - Position after target class
- `plugins.remove(pluginClass)` - Remove by class, calls destroy()
- `plugins.has(pluginClass)` - Type-safe check
- `plugins.getAll()` - Get all plugins in execution order
- `plugins.getPlugin(pluginClass)` - Get plugin by class
- Automatically applied to ALL services (existing and future)

### 11. Plugin Lifecycle Methods

- `onRequest(ctx)` - Called before request, can modify context or short-circuit
- `onResponse(response, request)` - Called after response, can modify response
- `onError(error, request)` - Called on error, can recover or modify error
- `destroy()` - Called when plugin is unregistered for cleanup

### 12. Service-Level Plugin Management

- Add `service.plugins` namespace object for service-specific plugin operations
- `plugins.add(...plugins)` - Add service-specific plugins (duplicates allowed)
- `plugins.exclude(...pluginClasses)` - Exclude global plugins by class
- `plugins.getExcluded()` - Get excluded plugin classes
- `plugins.getAll()` - Get service plugins (not including globals)
- `plugins.getPlugin(pluginClass)` - Get plugin instance by class
- **Duplicate Policy**: Service plugins allow duplicates (same class with different configs)

### 13. Plugin Execution Model

- **Request phase**: Global plugins (FIFO) -> Service plugins (FIFO) -> HTTP request
- **Response phase**: Reverse order (onion model)
- **Short-circuit**: Return `{ shortCircuit: response }` from `onRequest` to skip HTTP
- **Error recovery**: Return `ApiResponseContext` from `onError` to recover

### 14. Layer Propagation

- `@hai3/framework` re-exports updated types (already does via pass-through)
- `@hai3/react` re-exports from framework (already does)
- No code changes needed in L2/L3 layers

## Impact

**Affected Specs:**
- `sdk-core` - New type definitions, ApiRegistry interface extension, BaseApiService extension

**Affected Files:**
- `packages/api/src/types.ts` - New types (ApiPluginBase, ApiPlugin class, ApiRequestContext, etc.)
- `packages/api/src/BaseApiService.ts` - Plugin methods, exclusion by class, internal global plugins injection
- `packages/api/src/apiRegistry.ts` - Class-based registration, global plugin storage and methods
- `packages/api/src/plugins/MockPlugin.ts` - Update to extend new `ApiPlugin<TConfig>` class
- `packages/api/src/index.ts` - Export changes (new types)

**Benefits:**
- Single point of registration for cross-cutting plugins
- Consistent plugin application across all services
- **Type-safe plugin identification** - No string typos, compile-time checking
- **Type-safe service registration** - Class reference IS the type
- **OCP-compliant** - Plugins don't need to know about services
- **DRY plugin classes** - No duplication of method signatures
- **Clean API** - No module augmentation needed
- **Clear namespace separation** - `apiRegistry.plugins` vs `service.plugins`
- Short-circuit capability for mocking without touching HTTP layer
- Future-proof for authentication, logging, telemetry plugins

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

6. **Breaking Change**: Class-based service registration replaces string domains
   - **Mitigation**: Clean break, no backward compatibility shims
   - **Benefit**: Simpler API, no module augmentation needed

## Testing Strategy

1. **Unit tests**: Class-based service registration
2. **Unit tests**: Global plugin registration/unregistration by class
3. **Unit tests**: Before/after ordering validation with class references
4. **Unit tests**: Service-level exclusion by class
5. **Unit tests**: Short-circuit behavior
6. **Unit tests**: Error recovery behavior
7. **Unit tests**: getPlugin() method
8. **Unit tests**: Internal global plugins injection
9. **Integration tests**: Plugin chaining order verification
10. **Manual testing**: Mock mode toggle via global plugin

## Example Usage

### Class-Based Service Registration

```typescript
// Define service
class AccountsApiService extends BaseApiService {
  // No getMockMap() override needed - services are completely unaware of mocking (OCP)
}

// Registration - class reference, not string
apiRegistry.register(AccountsApiService);

// Retrieval - class reference IS the type
const service = apiRegistry.getService(AccountsApiService);
// service is typed as AccountsApiService

// Check if registered
apiRegistry.has(AccountsApiService); // true
```

### MockPlugin Configuration (OCP/DIP Compliant)

MockPlugin is completely self-contained - all configuration is in the constructor:

```typescript
// Enable mocking - add MockPlugin with full URL patterns
apiRegistry.plugins.add(new MockPlugin({
  delay: 100,
  mockMap: {
    // Full URL patterns (includes service baseURL path)
    'GET /api/accounts/user/current': () => ({ id: '1', name: 'John' }),
    'GET /api/accounts/users/:id': () => ({ id: '1', name: 'User' }),
    'GET /api/billing/invoices': () => [{ id: 'inv-1', amount: 100 }],
    'POST /api/accounts/user/profile': (body) => ({ ...body, updatedAt: new Date() })
  }
}));

// Disable mocking - remove MockPlugin
apiRegistry.plugins.remove(MockPlugin);

// Check if mocking is enabled
const isMockEnabled = apiRegistry.plugins.has(MockPlugin);

// Update mock map dynamically
const mockPlugin = apiRegistry.plugins.getPlugin(MockPlugin);
if (mockPlugin) {
  mockPlugin.setMockMap({ ...newMocks });
}
```

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

### Finding a Plugin by Class

```typescript
// Get a specific plugin instance from a service
const authPlugin = service.plugins.getPlugin(AuthPlugin);
if (authPlugin) {
  // authPlugin is typed as AuthPlugin
  console.log('Auth is configured');
}

// Or from global plugins
const loggingPlugin = apiRegistry.plugins.getPlugin(LoggingPlugin);
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

1. **Class-based service registration** - Class reference replaces string domain keys
2. **Class-based over hooks-based** - Consistency with HAI3 patterns, type-safe identification
3. **Class reference for identification** - No string names, compile-time safety
4. **DI via constructor config** - OCP compliance, plugins don't know about services
5. **Pure request data in ApiRequestContext** - No serviceName; use DI for service-specific behavior
6. **Namespaced plugin API** - `apiRegistry.plugins` and `service.plugins` for clear separation
7. **Duplicate policy** - Global: no duplicates; Service: duplicates allowed
8. **DRY plugin classes** - ApiPluginBase (non-generic) + ApiPlugin<TConfig> (generic)
9. **Internal global plugins injection** - `_setGlobalPluginsProvider()` called by apiRegistry
10. **getPlugin() method** - Find plugin instance by class reference
11. **Tree-shaking compliant** - No static props, no module-level instantiation
12. **Clean break** - No deprecated methods, no backward compatibility shims
13. **OCP/DIP compliant registry** - Registry has NO plugin-specific methods (no registerMocks, no setMockMode)
14. **Self-contained plugins** - All plugin configuration in constructor; plugins don't require registry support
15. **Services unaware of plugins** - Services don't override getMockMap(); true separation of concerns

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
