# Global API Plugins Design (Class-Based)

## Context

The HAI3 API layer follows a plugin-based architecture where plugins can intercept and modify API requests/responses. Currently, plugins are registered per-service via `BaseApiService.registerPlugin()`. This design adds a global plugin registry at the `apiRegistry` level using a **pure class-based approach** with type-safe plugin identification and class-based service registration.

**Stakeholders:**
- SDK consumers who want cross-cutting API behavior (logging, auth, telemetry)
- HAI3 framework internals (mock mode management)
- Future plugin authors

**Constraints:**
- Must maintain conceptual backward compatibility (per-service plugins still work)
- Must follow Open/Closed Principle (existing code should not require modification)
- Must work with dynamic service registration (services registered after global plugins)
- Plugin ordering must be intuitive and follow industry standards (FIFO by default)
- Services must be able to opt-out of specific global plugins when needed
- **Type-safe plugin identification** - No string names, compile-time safety
- **Class-based service registration** - No string domains, class reference IS the type
- **OCP-compliant** - Plugins should not know about specific services
- **Pure request data** - No service identification in ApiRequestContext
- **Namespaced plugin API** - Clear separation via `apiRegistry.plugins` and `service.plugins`
- **DRY plugin classes** - No duplication of method signatures between base and generic class
- **Internal global plugins injection** - Services receive global plugins via internal method
- **Concurrency safety for stateful plugins** - Plugins with state should use request-scoped storage (WeakMap)

## Goals / Non-Goals

**Goals:**
- Enable global plugin registration at apiRegistry level via namespaced `plugins` object
- Enable class-based service registration (replaces string domains)
- Ensure global plugins apply to ALL services (existing and future)
- Provide DRY class hierarchy: `ApiPluginBase` (non-generic) + `ApiPlugin<TConfig>` (generic)
- **Type-safe plugin identification by class reference** (not string names)
- **Type-safe service registration by class reference** (not string domains)
- **OCP-compliant dependency injection** via constructor config
- **Pure request data** - No service identification in ApiRequestContext
- Support short-circuit responses for mocking
- Provide flexible ordering (FIFO by default, explicit before/after positioning by class)
- Allow services to exclude specific global plugins by class reference
- Simplify mock mode toggle to single global registration
- Support plugin lifecycle management (cleanup via `destroy()`)
- **Tree-shaking compliance** - No static properties, no module-level instantiation
- **Clear duplicate policy** - Global: no duplicates; Service: duplicates allowed
- **Internal global plugins injection** - `_setGlobalPluginsProvider()` called by apiRegistry
- **getPlugin() method** - Find plugin instance by class reference

**Non-Goals:**
- Plugin middleware chain with explicit `next()` calls
- Plugin communication/shared state between plugins
- Plugin versioning or compatibility checks
- Complex dependency graph with topological sorting
- Async `destroy()` hooks
- String-based plugin naming or identification
- String-based service domain registration
- Service identification in ApiRequestContext (use DI instead)
- Module augmentation for service type mapping
- Backward compatibility shims for deprecated methods

## Architecture Overview

### System Boundaries

```
apiRegistry (singleton)
  |
  +-- globalPlugins: ApiPluginBase[] (NEW)
  |
  +-- services: Map<ServiceClass, BaseApiService> (UPDATED - class key, not string)
        |
        +-- _globalPluginsProvider: () => readonly ApiPluginBase[] (NEW - internal)
        +-- plugins: ApiPluginBase[] (per-service)
        +-- excludedPluginClasses: Set<PluginClass> (NEW)
```

### Data Flow

```
Service Registration Flow:
1. apiRegistry.register(ServiceClass) is called
2. Service is instantiated: new ServiceClass()
3. apiRegistry calls service._setGlobalPluginsProvider(() => this.globalPlugins)
4. Service is stored in Map<ServiceClass, service>

Request Flow (Automatic Chaining):
1. Service method called (e.g., service.get('/users'))
2. Build plugin chain: global plugins (from provider, filtered by exclusion) + service plugins
3. Request phase (FIFO order):
   a. For each plugin with onRequest:
      - Call onRequest(ctx)
      - If returns { shortCircuit: response }, stop chain and use response
      - Otherwise, use returned ctx for next plugin
4. If not short-circuited, make actual HTTP request
5. Response phase (reverse order):
   a. For each plugin with onResponse (reversed):
      - Call onResponse(response, originalRequest)
      - Use returned response for next plugin
6. Return final response to caller

Error Flow:
1. Error occurs during request or response
2. For each plugin with onError (reverse order):
   a. Call onError(error, request)
   b. If returns ApiResponseContext, treat as recovery (continue response phase)
   c. If returns Error, pass to next onError handler
3. If no recovery, throw final error

Plugin Ordering (FIFO with Explicit Positioning):
1. Default: Registration order (FIFO) within each scope
2. Global plugins always run before service plugins (phase separation)
3. Explicit positioning via before/after options (by CLASS reference):
   - { before: AuthPlugin } - insert before AuthPlugin
   - { after: LoggingPlugin } - insert after LoggingPlugin
4. Circular dependencies throw error at registration time
```

### Component Responsibilities

**ApiPluginBase (abstract class - non-generic):**
- Abstract base class for all plugins (non-generic for storage)
- Optional lifecycle methods: `onRequest`, `onResponse`, `onError`, `destroy`
- No static properties (tree-shaking compliance)
- Used as storage type in arrays and maps

**ApiPlugin<TConfig> (abstract class - generic):**
- Extends ApiPluginBase with typed config support
- Protected `config` property for dependency injection
- Uses TypeScript parameter property: `constructor(protected readonly config: TConfig) {}`

**PluginClass<T> (type):**
- Type for referencing plugin classes
- Used for type-safe removal, exclusion, and positioning
- Enables compile-time validation

**apiRegistry (singleton):**
- Stores services by class reference (not string)
- Stores global plugins as instances
- Provides namespaced `plugins` object:
  - `plugins.add()` for bulk FIFO registration (no duplicates)
  - `plugins.addBefore()` / `plugins.addAfter()` for positioned registration
  - `plugins.remove()` for unregistration (by class reference)
  - `plugins.has()` for checking registration (by class reference)
  - `plugins.getAll()` for getting plugins in execution order
  - `plugins.getPlugin()` for finding plugin by class
- Resolves before/after ordering constraints
- Detects circular dependencies and throws on registration
- Calls `_setGlobalPluginsProvider()` on services after instantiation

**BaseApiService:**
- Has internal `_setGlobalPluginsProvider()` method (called by apiRegistry)
- Provides namespaced `plugins` object:
  - `plugins.add()` for service-specific plugins (duplicates allowed)
  - `plugins.exclude()` for excluding global plugins by class
  - `plugins.getExcluded()` for getting excluded classes
  - `plugins.getAll()` for getting service plugins
  - `plugins.getPlugin()` for finding plugin by class
- Merges global + service plugins in execution, respecting exclusions

## Type Definitions

### Core Types

```typescript
/**
 * Request context passed through the plugin chain.
 * All properties are readonly to prevent accidental mutation.
 * Pure request data only - no service identification.
 * Plugins use DI via config for service-specific behavior.
 */
export type ApiRequestContext = {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
  // NO serviceName - plugins use DI for service-specific behavior
};

/**
 * Response context returned from the chain.
 * All properties are readonly to prevent accidental mutation.
 */
export type ApiResponseContext = {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly data: unknown;
};

/**
 * Short-circuit response to skip the actual HTTP request.
 * Return this from onRequest to immediately resolve with the response.
 */
export type ShortCircuitResponse = {
  readonly shortCircuit: ApiResponseContext;
};

/**
 * Type for referencing plugin classes.
 * Used for type-safe removal, exclusion, and positioning.
 *
 * @template T - Plugin type (defaults to ApiPluginBase)
 */
export type PluginClass<T extends ApiPluginBase = ApiPluginBase> = abstract new (...args: any[]) => T;

/**
 * Connection state for SseProtocol connections.
 * Proper union type for type safety instead of implicit EventSource | string.
 *
 * - EventSource: Active real SSE connection
 * - 'short-circuit': Mock/simulated connection from short-circuit plugin
 */
export type ConnectionState = EventSource | 'short-circuit';
```

### Plugin Base Classes (DRY Hierarchy)

```typescript
/**
 * Abstract base class for API plugins (non-generic).
 * Used as storage type to avoid generic array issues.
 * All plugins ultimately extend this class.
 *
 * @example
 * ```typescript
 * // Storage uses non-generic base
 * const plugins: ApiPluginBase[] = [];
 * plugins.push(new LoggingPlugin());
 * plugins.push(new AuthPlugin({ getToken }));
 * ```
 */
export abstract class ApiPluginBase {
  /**
   * Called before request is sent.
   * Return modified context, or ShortCircuitResponse to skip the request.
   */
  onRequest?(ctx: ApiRequestContext): ApiRequestContext | ShortCircuitResponse | Promise<ApiRequestContext | ShortCircuitResponse>;

  /**
   * Called after response is received.
   * Return modified response.
   */
  onResponse?(response: ApiResponseContext, request: ApiRequestContext): ApiResponseContext | Promise<ApiResponseContext>;

  /**
   * Called when an error occurs.
   * Return modified error, or ApiResponseContext for recovery.
   */
  onError?(error: Error, request: ApiRequestContext): Error | ApiResponseContext | Promise<Error | ApiResponseContext>;

  /**
   * Called when plugin is unregistered.
   * Override to cleanup resources (close connections, clear timers, etc.)
   */
  destroy?(): void;
}

/**
 * Abstract base class for API plugins with configuration.
 * Extends ApiPluginBase with typed config support.
 * Uses TypeScript parameter property for concise config declaration.
 *
 * @template TConfig - Configuration type passed to constructor (void if no config)
 *
 * @example Simple plugin (no config)
 * ```typescript
 * class LoggingPlugin extends ApiPlugin<void> {
 *   constructor() {
 *     super(void 0);
 *   }
 *
 *   onRequest(ctx: ApiRequestContext) {
 *     console.log(`[${ctx.method}] ${ctx.url}`);
 *     return ctx;
 *   }
 * }
 * ```
 *
 * @example Plugin with config (DI)
 * ```typescript
 * class AuthPlugin extends ApiPlugin<{ getToken: () => string | null }> {
 *   onRequest(ctx: ApiRequestContext) {
 *     const token = this.config.getToken();
 *     if (!token) return ctx;
 *     return {
 *       ...ctx,
 *       headers: { ...ctx.headers, Authorization: `Bearer ${token}` }
 *     };
 *   }
 * }
 * ```
 */
export abstract class ApiPlugin<TConfig = void> extends ApiPluginBase {
  // Uses TypeScript parameter property for concise declaration
  constructor(protected readonly config: TConfig) {
    super();
  }
}
```

### Type Guard

```typescript
/**
 * Type guard to check if onRequest result is a short-circuit response.
 * Useful for testing and custom plugin logic.
 *
 * @example
 * ```typescript
 * const result = await plugin.onRequest?.(ctx);
 * if (isShortCircuit(result)) {
 *   // result is ShortCircuitResponse
 *   console.log('Short-circuited with status:', result.shortCircuit.status);
 * } else {
 *   // result is ApiRequestContext
 *   console.log('Continuing with url:', result.url);
 * }
 * ```
 */
export function isShortCircuit(
  result: ApiRequestContext | ShortCircuitResponse | undefined
): result is ShortCircuitResponse {
  return result !== undefined && 'shortCircuit' in result;
}
```

### Registry Interface

```typescript
export interface ApiRegistry {
  // Service management - class-based (replaces string domains)
  register<T extends BaseApiService>(serviceClass: new () => T): void;
  getService<T extends BaseApiService>(serviceClass: new () => T): T;
  has<T extends BaseApiService>(serviceClass: new () => T): boolean;

  // REMOVED: getDomains() - no longer applicable with class-based registration
  // REMOVED: registerMocks() - mock configuration moved to MockPlugin (OCP/DIP)
  // REMOVED: setMockMode() - replaced by plugins.add/remove(MockPlugin) (OCP/DIP)
  // REMOVED: getMockMap() - MockPlugin manages its own map (OCP/DIP)

  /**
   * Plugin management namespace
   */
  readonly plugins: {
    /**
     * Add global plugins in FIFO order.
     * @throws Error if plugin of same class already registered
     *
     * @example
     * ```typescript
     * apiRegistry.plugins.add(
     *   new LoggingPlugin(),
     *   new AuthPlugin({ getToken: () => localStorage.getItem('token') })
     * );
     * ```
     */
    add(...plugins: ApiPluginBase[]): void;

    /**
     * Add a plugin positioned before another plugin class.
     * @throws Error if target class not registered
     * @throws Error if creates circular dependency
     *
     * @example
     * ```typescript
     * apiRegistry.plugins.addBefore(new ErrorPlugin(), AuthPlugin);
     * ```
     */
    addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void;

    /**
     * Add a plugin positioned after another plugin class.
     * @throws Error if target class not registered
     * @throws Error if creates circular dependency
     *
     * @example
     * ```typescript
     * apiRegistry.plugins.addAfter(new MetricsPlugin(), LoggingPlugin);
     * ```
     */
    addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void;

    /**
     * Remove a plugin by class.
     * Calls destroy() if defined.
     * @throws Error if plugin not registered
     *
     * @example
     * ```typescript
     * apiRegistry.plugins.remove(MockPlugin);
     * ```
     */
    remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void;

    /**
     * Check if a plugin class is registered.
     *
     * @example
     * ```typescript
     * if (apiRegistry.plugins.has(AuthPlugin)) {
     *   console.log('Auth is enabled');
     * }
     * ```
     */
    has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean;

    /**
     * Get all plugins in execution order.
     */
    getAll(): readonly ApiPluginBase[];

    /**
     * Get a plugin instance by class reference.
     * Returns undefined if not found.
     *
     * @example
     * ```typescript
     * const authPlugin = apiRegistry.plugins.getPlugin(AuthPlugin);
     * if (authPlugin) {
     *   console.log('Auth is configured');
     * }
     * ```
     */
    getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined;
  };
}
```

### BaseApiService Extension

```typescript
export abstract class BaseApiService {
  /**
   * Internal method called by apiRegistry after instantiation.
   * Sets the provider function for accessing global plugins.
   * Not exposed to users (underscore convention).
   *
   * @internal
   */
  _setGlobalPluginsProvider(provider: () => readonly ApiPluginBase[]): void;

  /**
   * Service-level plugin management
   */
  readonly plugins: {
    /**
     * Add service-specific plugins.
     * Duplicates of same class ARE allowed (different configs).
     *
     * @example
     * ```typescript
     * userService.plugins.add(
     *   new CachingPlugin({ ttl: 60000 }),
     *   new RateLimitPlugin({ limit: 100 })
     * );
     * ```
     */
    add(...plugins: ApiPluginBase[]): void;

    /**
     * Exclude global plugin classes from this service.
     *
     * @example
     * ```typescript
     * class HealthCheckService extends BaseApiService {
     *   constructor() {
     *     super();
     *     this.plugins.exclude(AuthPlugin, MetricsPlugin);
     *   }
     * }
     * ```
     */
    exclude(...pluginClasses: PluginClass[]): void;

    /**
     * Get excluded plugin classes.
     */
    getExcluded(): readonly PluginClass[];

    /**
     * Get service plugins (not including globals).
     */
    getAll(): readonly ApiPluginBase[];

    /**
     * Get a plugin instance by class reference.
     * Searches service plugins first, then global plugins.
     * Returns undefined if not found.
     *
     * @example
     * ```typescript
     * const authPlugin = service.plugins.getPlugin(AuthPlugin);
     * if (authPlugin) {
     *   console.log('Auth is available for this service');
     * }
     * ```
     */
    getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined;
  };
}
```

## Example Plugins

### Logging Plugin (No Config)

```typescript
/**
 * Logs all API requests and responses to console.
 */
class LoggingPlugin extends ApiPlugin<void> {
  constructor() {
    super(void 0);
  }

  onRequest(ctx: ApiRequestContext) {
    console.log(`-> [${ctx.method}] ${ctx.url}`);
    return ctx;
  }

  onResponse(response: ApiResponseContext, request: ApiRequestContext) {
    console.log(`<- [${response.status}] ${request.url}`);
    return response;
  }

  onError(error: Error, request: ApiRequestContext) {
    console.error(`!! [ERROR] ${request.url}:`, error.message);
    return error;
  }
}
```

### Auth Plugin (With Config - DI)

```typescript
/**
 * Adds Authorization header to requests if token is available.
 * Token getter is injected via config (OCP compliant).
 */
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
```

### Mock Plugin (Short-Circuit)

```typescript
type MockMap = Record<string, (body?: unknown) => unknown>;

/**
 * Intercepts matching requests and returns mock responses.
 * Uses short-circuit to skip actual HTTP request.
 */
class MockPlugin extends ApiPlugin<{ mockMap: MockMap; delay?: number }> {
  async onRequest(ctx: ApiRequestContext): Promise<ApiRequestContext | ShortCircuitResponse> {
    const key = `${ctx.method} ${ctx.url}`;
    const factory = this.config.mockMap[key];

    if (factory) {
      if (this.config.delay) {
        await new Promise(r => setTimeout(r, this.config.delay));
      }
      return {
        shortCircuit: {
          status: 200,
          headers: { 'x-hai3-short-circuit': 'true' },
          data: factory(ctx.body)
        }
      };
    }
    return ctx;
  }
}
```

### Retry Plugin (Error Recovery)

```typescript
/**
 * Retries failed requests up to N times.
 * Re-throws error to signal retry intent.
 *
 * NOTE: This basic implementation uses instance state which is NOT safe
 * for concurrent requests. For production use, consider request-scoped
 * state (e.g., using WeakMap keyed by request context) or implement
 * retry logic per-request rather than per-plugin.
 */
class RetryPlugin extends ApiPlugin<{ attempts: number; delay?: number }> {
  private attemptCount = 0;

  onRequest(ctx: ApiRequestContext) {
    this.attemptCount = 0; // Reset on new request
    return ctx;
  }

  async onError(error: Error, request: ApiRequestContext): Promise<Error | ApiResponseContext> {
    if (this.attemptCount < this.config.attempts) {
      this.attemptCount++;
      if (this.config.delay) {
        await new Promise(r => setTimeout(r, this.config.delay));
      }
      throw error; // Re-throw signals retry
    }
    return error;
  }
}
```

**Concurrency-safe alternative:**
```typescript
class RetryPlugin extends ApiPlugin<{ attempts: number; delay?: number }> {
  private attempts = new WeakMap<ApiRequestContext, number>();

  onRequest(ctx: ApiRequestContext) {
    this.attempts.set(ctx, 0);
    return ctx;
  }

  async onError(error: Error, request: ApiRequestContext): Promise<Error | ApiResponseContext> {
    const count = this.attempts.get(request) ?? 0;
    if (count < this.config.attempts) {
      this.attempts.set(request, count + 1);
      if (this.config.delay) {
        await new Promise(r => setTimeout(r, this.config.delay));
      }
      throw error;
    }
    return error;
  }
}
```

### Rate Limit Plugin (Pure DI - No Service Identification)

```typescript
/**
 * Applies rate limiting with injected limit.
 * Uses pure DI - no service identification in context.
 */
class RateLimitPlugin extends ApiPlugin<{ limit: number }> {
  private requestCount = 0;

  onRequest(ctx: ApiRequestContext) {
    if (this.requestCount >= this.config.limit) {
      return {
        shortCircuit: {
          status: 429,
          headers: {},
          data: { error: 'Rate limit exceeded' }
        }
      };
    }

    this.requestCount++;
    return ctx;
  }

  destroy() {
    this.requestCount = 0;
  }
}

// Different limits per service via service-level plugins (duplicates allowed)
userService.plugins.add(new RateLimitPlugin({ limit: 100 }));
adminService.plugins.add(new RateLimitPlugin({ limit: 1000 }));
```

### Cache Plugin (With Cleanup)

```typescript
/**
 * Caches GET responses for specified TTL.
 * Returns cached response via short-circuit if valid.
 */
class CachePlugin extends ApiPlugin<{ ttl: number }> {
  private store = new Map<string, { data: ApiResponseContext; expires: number }>();

  onRequest(ctx: ApiRequestContext): ApiRequestContext | ShortCircuitResponse {
    if (ctx.method !== 'GET') return ctx;

    const key = `${ctx.method}:${ctx.url}`;
    const cached = this.store.get(key);
    if (cached && cached.expires > Date.now()) {
      return { shortCircuit: cached.data };
    }
    return ctx;
  }

  onResponse(response: ApiResponseContext, request: ApiRequestContext) {
    if (request.method === 'GET' && response.status === 200) {
      const key = `${request.method}:${request.url}`;
      this.store.set(key, {
        data: response,
        expires: Date.now() + this.config.ttl
      });
    }
    return response;
  }

  destroy() {
    this.store.clear();
  }
}
```

## Decisions

### Decision 1: Class-Based Service Registration

**What:** Use class constructor reference instead of string domain keys for service registration.

**Why:**
- **Type-safe service retrieval** - `getService(ServiceClass)` returns correctly typed instance
- **No module augmentation needed** - Class reference IS the type
- **Simpler API** - No need for `ApiServicesMap` interface extension
- **Refactoring-friendly** - Rename class, all references update
- **IDE support** - Go-to-definition, find references work naturally

**Example:**
```typescript
// OLD (string-based) - REMOVED
apiRegistry.register('accounts', AccountsApiService);
const service = apiRegistry.getService('accounts'); // needs type assertion

// NEW (class-based)
apiRegistry.register(AccountsApiService);
const service = apiRegistry.getService(AccountsApiService); // correctly typed
```

**Alternatives Considered:**
1. String keys with module augmentation - Rejected: Verbose, maintenance burden
2. Symbol keys - Rejected: Less ergonomic, requires separate export
3. Factory function reference - Rejected: More complex than class reference

**Trade-offs:**
- (+) Simpler, cleaner API
- (+) No module augmentation needed
- (+) Type-safe by default
- (-) Breaking change from string-based API
- (-) Requires class import at call site

### Decision 2: Class-Based over Hooks-Based Plugins

**What:** Use abstract `ApiPluginBase` and `ApiPlugin<TConfig>` classes instead of plain hooks objects.

**Why:**
- **Type-safe plugin identification** - Use class reference instead of string names
- Consistent with HAI3 patterns (BaseApiService, etc.)
- Clear inheritance model for shared behavior
- Protected `config` property for dependency injection
- Enables `instanceof` checks for plugin identification

**Alternatives Considered:**
1. Hooks objects with string names - Rejected: No type safety for names
2. Factory functions with Symbol IDs - Rejected: Verbose, unfamiliar pattern
3. Decorator pattern - Rejected: Too complex for this use case

**Trade-offs:**
- (+) Type-safe plugin identification
- (+) Consistent with HAI3 patterns
- (+) Clear DI via constructor
- (-) Slightly more boilerplate than plain objects
- (-) Requires `constructor() { super(void 0); }` for no-config plugins

### Decision 3: DRY Plugin Class Hierarchy

**What:** Two-class hierarchy: `ApiPluginBase` (non-generic) + `ApiPlugin<TConfig>` (generic with config).

**Why:**
- **DRY principle** - No duplication of method signatures
- **Storage type** - ApiPluginBase can be used in arrays without generic issues
- **Type safety** - ApiPlugin<TConfig> provides typed config access
- **Flexibility** - Plugins without config can extend either class

**Example:**
```typescript
// Non-generic base for storage
abstract class ApiPluginBase {
  onRequest?(ctx: ApiRequestContext): ...;
  onResponse?(response: ApiResponseContext, request: ApiRequestContext): ...;
  onError?(error: Error, request: ApiRequestContext): ...;
  destroy?(): void;
}

// Generic class for config
abstract class ApiPlugin<TConfig> extends ApiPluginBase {
  constructor(protected readonly config: TConfig) {
    super();
  }
}

// Storage uses non-generic base
const plugins: ApiPluginBase[] = [];
```

**Alternatives Considered:**
1. Single generic class with default `void` - Rejected: Awkward storage typing
2. Duplicate method signatures - Rejected: DRY violation
3. Interface + class - Rejected: More complex, no clear benefit

**Trade-offs:**
- (+) Clean separation of concerns
- (+) No method signature duplication
- (+) Works naturally with TypeScript arrays
- (-) Two classes to understand

### Decision 4: Internal Global Plugins Injection

**What:** BaseApiService has internal `_setGlobalPluginsProvider()` method called by apiRegistry after instantiation.

**Why:**
- **No burden on derived classes** - Service classes don't need to know about global plugins
- **Encapsulation** - Internal implementation detail, not public API
- **Flexibility** - apiRegistry controls injection timing
- **Testability** - Can mock global plugins provider in tests

**Example:**
```typescript
// In apiRegistry.register()
register<T extends BaseApiService>(serviceClass: new () => T): void {
  const service = new serviceClass();
  service._setGlobalPluginsProvider(() => this.globalPlugins);
  this.services.set(serviceClass, service);
}

// In BaseApiService
_setGlobalPluginsProvider(provider: () => readonly ApiPluginBase[]): void {
  this.globalPluginsProvider = provider;
}
```

**Alternatives Considered:**
1. Constructor injection - Rejected: Changes constructor signature, burden on derived classes
2. Static registry access - Rejected: Tight coupling, harder to test
3. Public method - Rejected: Exposes internal detail to users

**Trade-offs:**
- (+) No changes to derived class constructors
- (+) Clean separation of concerns
- (+) Easy to test
- (-) Underscore convention may confuse some developers

### Decision 5: getPlugin() Method

**What:** Add method to find plugin instance by class reference.

**Why:**
- **Discoverability** - Easy to check if a plugin is active
- **Access** - Get plugin instance for inspection or configuration
- **Type-safe** - Returns correctly typed plugin instance
- **Useful for testing** - Verify plugin state

**Example:**
```typescript
// Find plugin by class
const authPlugin = service.plugins.getPlugin(AuthPlugin);
if (authPlugin) {
  // authPlugin is typed as AuthPlugin
}

// Also on apiRegistry
const loggingPlugin = apiRegistry.plugins.getPlugin(LoggingPlugin);
```

**Alternatives Considered:**
1. Only has() method - Rejected: Sometimes need access to instance
2. getAll() with filter - Rejected: Verbose, less type-safe
3. Property access - Rejected: Not dynamic

**Trade-offs:**
- (+) Type-safe instance access
- (+) Consistent with has() method pattern
- (-) Slightly more API surface

### Decision 6: Pure Request Data in ApiRequestContext

**What:** `ApiRequestContext` contains only pure request data (method, url, headers, body). No service identification at all.

**Why:**
- **Aligns with OCP-compliant DI** - Service-specific behavior via config, not context
- **Simpler type** - Only request data, nothing else
- **Clear separation** - Plugins get what they need via config
- **Prevents tight coupling** - Plugins can't access any service metadata
- **Enables service-level plugins** - Different configs per service via duplicates

**Alternatives Considered:**
1. Full ServiceContext - Rejected: Violates OCP, plugins become service-aware
2. serviceName string - Rejected: Still encourages service-specific logic in global plugins
3. Optional metadata field - Rejected: Opens door to tight coupling

**Trade-offs:**
- (+) Cleaner separation of concerns
- (+) Plugins stay OCP compliant
- (+) Forces proper DI patterns
- (-) Service-specific limits require service-level plugins (but this is the right pattern)

### Decision 7: Short-Circuit via Return Type

**What:** Return `{ shortCircuit: ApiResponseContext }` from `onRequest` to skip HTTP.

**Why:**
- Explicit - type-safe return makes intent clear
- Composable - other plugins can still see the short-circuited response
- No magic - no special methods or flags to understand
- Enables mocking without touching transport layer

**Alternatives Considered:**
1. Throw special error - Rejected: errors should be errors
2. Return `null` to skip - Rejected: ambiguous, not type-safe
3. Call `ctx.shortCircuit()` method - Rejected: adds complexity to context

**Trade-offs:**
- (+) Type-safe and explicit
- (+) Easy to understand
- (-) Slightly verbose syntax
- (-) Plugin must handle both return types

### Decision 8: FIFO with Before/After Positioning by Class

**What:** Plugins execute in registration order (FIFO) by default, with optional explicit positioning by class reference.

**Why:**
- Matches industry standards (Express, Koa middleware)
- More intuitive than numeric priority
- **Type-safe positioning** - Reference class, not string name
- Explicit positioning solves ordering conflicts without magic numbers

**Alternatives Considered:**
1. Priority numbers - Rejected: magic numbers, hard to reason about
2. String-based before/after - Rejected: no compile-time validation
3. Named phases (before/during/after) - Rejected: too rigid

**Trade-offs:**
- (+) Intuitive FIFO default
- (+) Type-safe before/after
- (+) No magic numbers or string typos
- (-) Requires importing plugin class for positioning

### Decision 9: Namespaced Plugin API

**What:** Plugin operations are namespaced under `apiRegistry.plugins` and `service.plugins` objects.

**Why:**
- **Clear separation** - Plugin operations grouped logically
- **Discoverability** - IDE autocomplete shows all plugin methods
- **Extensibility** - Namespace can grow without polluting main interface
- **Consistency** - Same pattern for both global and service-level plugins

**Alternatives Considered:**
1. Flat methods on apiRegistry - Rejected: Clutters main interface
2. Separate pluginRegistry - Rejected: Adds another global, complicates imports

**Trade-offs:**
- (+) Clean API organization
- (+) Easy to discover plugin operations
- (-) Slightly more verbose (`plugins.add` vs `use`)

### Decision 10: Duplicate Policy (Global vs Service)

**What:** Global plugins prohibit duplicates; service plugins allow duplicates.

**Why:**
- **Global clarity** - Only one instance per plugin class globally
- **Service flexibility** - Different configs per service via same class
- **Common pattern** - Rate limiting with different limits per service

**Example:**
```typescript
// Global: throws on duplicate
apiRegistry.plugins.add(new LoggingPlugin()); // OK
apiRegistry.plugins.add(new LoggingPlugin()); // Error!

// Service: allows duplicates (different configs)
userService.plugins.add(new RateLimitPlugin({ limit: 100 }));
adminService.plugins.add(new RateLimitPlugin({ limit: 1000 }));
```

**Alternatives Considered:**
1. No duplicates anywhere - Rejected: Limits service-level flexibility
2. Allow duplicates everywhere - Rejected: Global duplicates confusing

**Trade-offs:**
- (+) Clear policy, easy to understand
- (+) Enables per-service configuration patterns
- (-) Asymmetric behavior between scopes

### Decision 11: Clean Break Policy - No Deprecation

**What:** No deprecated methods, no backward compatibility shims. If something is deprecated, it should be deleted. Deprecation is just postponed deletion that creates technical debt.

**Policy:** Avoid deprecation in favor of deletion. Clean break, no backward compatibility cruft.

**Why:**
- **Simpler codebase** - No maintenance burden for old patterns
- **Clearer API** - Users see only the new patterns
- **No confusion** - No mixing old and new approaches
- **No deferred cleanup** - Deprecation creates "someday" tasks that never get done
- **Forces migration** - Users upgrade immediately rather than lingering on deprecated APIs

**Alternatives Considered:**
1. Deprecation warnings - Rejected: Adds complexity, delays migration, creates tech debt
2. Adapter layer - Rejected: More code to maintain, hides underlying changes
3. Gradual deprecation cycle - Rejected: Extends maintenance burden indefinitely

**Trade-offs:**
- (+) Cleaner implementation
- (+) No technical debt
- (+) Smaller package size (no legacy code)
- (+) Easier to understand codebase
- (-) Breaking change for existing code (acceptable for this project)

**Audit of Existing Deprecated Types:**

The following deprecated types exist in the codebase and MUST be deleted (not kept for compatibility):

| Package | File | Line | Deprecated Item | Replacement |
|---------|------|------|-----------------|-------------|
| @hai3/api | types.ts | 153 | `ApiPluginRequestContext` | `ApiRequestContext` |
| @hai3/api | types.ts | 168 | `ApiPluginResponseContext` | `ApiResponseContext` |
| @hai3/api | types.ts | 378 | `LegacyApiPlugin` | `ApiPluginBase` / `ApiPlugin<TConfig>` |
| @hai3/framework | migration.ts | 219 | `legacySelectors` | `useAppSelector((state) => ...)` |
| @hai3/framework | types.ts | 325 | `setApplyFunction` | Constructor injection |
| @hai3/framework | compat.ts | 39 | `themeRegistry` (singleton) | `app.themeRegistry` |
| @hai3/framework | compat.ts | 46 | `routeRegistry` (singleton) | `app.routeRegistry` |
| @hai3/framework | compat.ts | 64 | `navigateToScreen` | `useNavigation()` / `app.actions.navigateToScreen()` |
| @hai3/framework | compat.ts | 79 | `fetchCurrentUser` | Direct service call |

**Removal Strategy:**
1. Delete the deprecated type/function entirely
2. Remove any `@deprecated` JSDoc annotations
3. Update any code still using deprecated types to use replacements
4. Remove exports from index.ts files
5. Validate: `grep -rn "@deprecated" packages/` must return 0 results

**Validation Command:**
```bash
grep -rn "@deprecated" packages/api/src/ packages/framework/src/ packages/react/src/
# Expected output: (empty - no results)
```

## Implementation Corrections (Post-Review)

This section documents architectural corrections identified during implementation review.

### Correction 1: Per-Service MockPlugin (Not Global)

**Issue:** The initial implementation used MockPlugin globally via `apiRegistry.plugins.add(new MockPlugin({ mockMap }))`. This violates the vertical slice architecture principle.

**Problem Statement:**
- Screensets are true vertical slices with zero footprint outside their folder
- If MockPlugin is registered globally, screensets cannot be self-contained
- Screensets would need to contribute their mocks to a global mock map

**Required Solution:**
MockPlugin should be used per-service, not globally. Each service can have its own MockPlugin instance.

**Design Pattern:**
```typescript
// WRONG: Global MockPlugin (violates vertical slice)
apiRegistry.plugins.add(new MockPlugin({
  mockMap: { /* ALL mocks from ALL screensets */ }
}));

// CORRECT: Per-service MockPlugin (vertical slice compliant)
class BillingApiService extends BaseApiService {
  constructor() {
    super({ baseURL: '/api/billing' }, new RestProtocol());

    // Each service registers its own MockPlugin
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

**Implications:**
- Services are self-contained with their own mock configuration
- No global mock state coordination needed
- Screensets can be fully independent
- `apiRegistry.plugins.add(new MockPlugin(...))` is still valid for cross-cutting mocks, but per-service is the preferred pattern for vertical slices

### Correction 2: Protocol Plugin Agnosticism (OCP/DIP Compliance)

**Issue:** SseProtocol has direct knowledge of MockPlugin, violating OCP and DIP.

**Current Violation in SseProtocol:**
```typescript
// BAD: Protocol knows about specific plugin type
const mockPlugin = this.getPlugins().find((p) => p instanceof MockPlugin) as MockPlugin | undefined;

if (mockPlugin) {
  this.simulateMockStream(connectionId, url, onMessage, onComplete);
  return connectionId;
}
```

**Problem Statement:**
- A protocol should not know about specific plugin implementations
- The protocol should be open for extension but closed for modification
- Adding new short-circuit plugins would require modifying the protocol
- The fundamental challenge: REST is request-response (single), SSE is request-stream (ongoing)

## Architectural Direction Evaluation

### Industry Research: How MSW Handles SSE Mocking

MSW (Mock Service Worker) uses a **protocol-agnostic interception strategy**. Key insight from their documentation:
> "The stream of server events is still a regular HTTP connection."

MSW intercepts at the HTTP layer, treating EventSource as a standard HTTP GET that returns streaming responses with `content-type: text/event-stream`. This means:
- MSW doesn't need specialized SSE protocol handling
- The protocol layer remains pure - mocking happens above/around it
- Any plugin that understands streaming can provide mock data

**Sources:**
- [MSW SSE Documentation](https://mswjs.io/docs/sse/)
- [MSW Blog: Server-Sent Events Are Here](https://mswjs.io/blog/server-sent-events-are-here)

### Evaluated Architectural Directions

#### Direction A: Network-Level Mocking (MSW Approach)
- Mock at fetch/EventSource level globally
- Protocols use native APIs, completely unaware of mocking
- MockPlugin would patch or wrap global EventSource constructor

**Verdict:** REJECTED
- Requires global patching which has side effects
- Not suitable for per-service mocking (vertical slice)
- Violates principle of minimal global footprint

#### Direction B: Protocol-Specific Mock Plugins
- `RestMockPlugin` for REST mocking
- `SseMockPlugin` for SSE mocking
- Each plugin knows its protocol's semantics
- Protocols don't know about plugins

**Verdict:** REJECTED
- Creates duplication of mock logic
- Services must register multiple mock plugins
- Breaks single MockPlugin configuration

#### Direction C: Dependency Injection in Protocols
- Protocols accept injected fetch/EventSource via constructor
- MockPlugin provides mock implementations
- Protocols use whatever is injected

**Verdict:** REJECTED
- Complicates protocol construction
- Moves complexity to service authors
- Testing injection pattern is heavyweight for this use case

#### Direction D: Generic Short-Circuit with Stream Simulation (CHOSEN)
- SseProtocol uses generic plugin chain (like RestProtocol)
- `ShortCircuitResponse.data` can contain streaming data or complete response
- SseProtocol extracts stream content from ANY short-circuit response
- No knowledge of which plugin produced the short-circuit

**Verdict:** CHOSEN
- Follows RestProtocol pattern exactly
- OCP/DIP compliant - protocol depends on abstraction
- Single MockPlugin works for both REST and SSE
- Per-service mocking fully supported (vertical slice)

### Why Direction D Is Best

**1. OCP Compliance:**
Protocol is open for extension (new plugins can short-circuit) but closed for modification (no changes needed when adding plugins).

**2. DIP Compliance:**
Protocol depends on `ShortCircuitResponse` abstraction, not `MockPlugin` concretion.

**3. Vertical Slice Support:**
Per-service MockPlugin works identically for REST and SSE services. Screensets remain self-contained.

**4. Symmetry with RestProtocol:**
RestProtocol already uses this pattern successfully. SseProtocol should be refactored to match.

**5. Industry Alignment:**
MSW's insight that SSE is "still HTTP" validates treating short-circuit responses uniformly.

### Required Solution

Protocols must execute the plugin chain generically using the short-circuit pattern.

**Design Pattern:**
```typescript
// CORRECT: Protocol uses generic plugin execution
connect(url, onMessage, onComplete): string {
  const connectionId = this.generateId();

  // Build request context
  const context: ApiRequestContext = {
    method: 'GET',
    url: `${this.baseConfig.baseURL}${url}`,
    headers: {},
  };

  // Execute plugin chain generically
  this.executePluginChainAsync(context).then((result) => {
    if (isShortCircuit(result)) {
      // Generic short-circuit handling - no plugin-specific knowledge
      this.simulateStreamFromShortCircuit(
        connectionId,
        result.shortCircuit,
        onMessage,
        onComplete
      );
    } else {
      // Real SSE connection
      this.establishRealConnection(connectionId, url, onMessage, onComplete);
    }
  });

  return connectionId;
}

// Generic plugin execution - works for ANY plugin that short-circuits
private async executePluginChainAsync(
  context: ApiRequestContext
): Promise<ApiRequestContext | ShortCircuitResponse> {
  let currentContext = context;

  for (const plugin of this.getClassPlugins()) {
    if (plugin.onRequest) {
      const result = await plugin.onRequest(currentContext);

      // Generic short-circuit detection using type guard
      if (isShortCircuit(result)) {
        return result;
      }

      currentContext = result;
    }
  }

  return currentContext;
}

// Generic stream simulation from any short-circuit response
private simulateStreamFromShortCircuit(
  connectionId: string,
  response: ApiResponseContext,
  onMessage: (event: MessageEvent) => void,
  onComplete?: () => void
): void {
  // Works with ANY plugin that provides short-circuit response
  // Not MockPlugin-specific
  // Uses ConnectionState union type for type safety
  this.connections.set(connectionId, 'short-circuit' as ConnectionState);

  // Stream the response data
  const content = this.extractStreamContent(response.data);
  this.streamContent(connectionId, content, onMessage, onComplete);
}
```

**Key Principles:**
1. Use `isShortCircuit()` type guard instead of `instanceof MockPlugin`
2. Handle short-circuit response generically regardless of which plugin produced it
3. Protocol can be extended by new plugins without modification (OCP)
4. Protocol depends on abstractions (`ShortCircuitResponse`), not concretions (`MockPlugin`) (DIP)

### Stream Content Extraction Strategy

The `extractStreamContent()` method must handle different response data formats:

```typescript
/**
 * Extract streamable content from short-circuit response data.
 * Handles both SSE-format data and plain content.
 */
private extractStreamContent(data: unknown): string {
  // Case 1: Data is already a string (plain text to stream)
  if (typeof data === 'string') {
    return data;
  }

  // Case 2: Data is OpenAI-style chat completion (common mock format)
  if (this.isChatCompletion(data)) {
    return data.choices?.[0]?.message?.content ?? '';
  }

  // Case 3: Data is SSE message format { content: string }
  if (this.isSseContent(data)) {
    return data.content;
  }

  // Case 4: Fallback - serialize to JSON string
  return JSON.stringify(data);
}

private isChatCompletion(data: unknown): data is { choices?: Array<{ message?: { content?: string } }> } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'choices' in data &&
    Array.isArray((data as { choices: unknown }).choices)
  );
}

private isSseContent(data: unknown): data is { content: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'content' in data &&
    typeof (data as { content: unknown }).content === 'string'
  );
}
```

This approach allows MockPlugin (or any other short-circuit plugin) to return data in various formats, and SseProtocol will intelligently extract streamable content without knowing which plugin produced it.

### Stream Content Edge Cases

The `extractStreamContent()` method handles edge cases with the following fallback behavior:

**Binary Data:**
- Binary data (ArrayBuffer, Blob, Uint8Array) is NOT supported for SSE streaming
- If binary data is detected, the method falls back to `"[Binary data not supported for SSE streaming]"`
- Type guard: `data instanceof ArrayBuffer || data instanceof Uint8Array || data instanceof Blob`
- Rationale: SSE is a text-based protocol; binary streaming requires WebSocket or different transport

**Very Large Responses:**
- No explicit size limit is enforced in `extractStreamContent()`
- Large responses are handled via the existing streaming mechanism (word-by-word chunking)
- Memory considerations are deferred to the caller/consumer
- Rationale: Limiting at extraction level would break legitimate large text streams (e.g., LLM responses)

**Null/Undefined Data:**
- Returns empty string `''` for null or undefined data
- Allows graceful handling of empty mock responses

**Circular References:**
- JSON.stringify fallback may throw on circular references
- Wrapped in try/catch, falls back to `"[Unserializable data]"` on error

```typescript
private extractStreamContent(data: unknown): string {
  // Handle null/undefined
  if (data == null) {
    return '';
  }

  // Case 1: Plain string - stream directly
  if (typeof data === 'string') {
    return data;
  }

  // Case 2: Binary data - not supported for SSE
  if (data instanceof ArrayBuffer || data instanceof Uint8Array || data instanceof Blob) {
    return '[Binary data not supported for SSE streaming]';
  }

  // Case 3: OpenAI-style chat completion
  if (this.isChatCompletion(data)) {
    return data.choices?.[0]?.message?.content ?? '';
  }

  // Case 4: SSE content wrapper
  if (this.isSseContent(data)) {
    return data.content;
  }

  // Case 5: Fallback - JSON serialize with circular reference protection
  try {
    return JSON.stringify(data);
  } catch {
    return '[Unserializable data]';
  }
}
```

### Correction 3: Remove ESLint Exceptions

**Issue:** During implementation, ESLint rule exceptions may have been added as shortcuts.

**Required Solution:**
All ESLint disable comments for type-related rules must be removed and replaced with proper typing.

**Design Pattern:**
```typescript
// BAD: Type assertion with eslint-disable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const result = plugin.onRequest(context) as any;

// CORRECT: Proper typing with type guards
const result = await plugin.onRequest(context);
if (isShortCircuit(result)) {
  return result.shortCircuit;
}
// result is narrowed to ApiRequestContext
return result;
```

**Acceptable ESLint Disables:**
- Only for legitimate third-party library type issues
- Must be documented with reason

**Unacceptable ESLint Disables:**
- `@typescript-eslint/no-explicit-any` for internal code
- `@typescript-eslint/no-unsafe-*` rules
- Type-related rules that can be solved with proper typing

## Risks / Trade-offs

### Risk 1: Breaking Change for Service Registration

**Risk:** Existing code uses string-based service registration.

**Likelihood:** High (all existing code affected)

**Impact:** Medium (straightforward migration)

**Mitigation:**
- Document migration path clearly
- Find-and-replace pattern is simple
- IDE refactoring can help

**Migration example:**
```typescript
// Before
apiRegistry.register('accounts', AccountsApiService);
const service = apiRegistry.getService<AccountsApiService>('accounts');

// After
apiRegistry.register(AccountsApiService);
const service = apiRegistry.getService(AccountsApiService);
```

### Risk 2: Class Boilerplate

**Risk:** Plugins require more code than plain objects.

**Likelihood:** Medium (all plugins affected)

**Impact:** Low (boilerplate is minimal)

**Mitigation:**
- DRY class hierarchy handles most boilerplate
- No-config plugins need only `constructor() { super(void 0); }`
- Clear examples in documentation

### Risk 3: Global Plugin Class Collisions

**Risk:** Two instances of same plugin class registered globally.

**Likelihood:** Low (clear error message)

**Impact:** Low (error at registration time)

**Mitigation:**
- Throw error on duplicate class registration (global only)
- Include plugin class name in error message
- Service-level plugins allow duplicates by design

### Risk 4: Memory Leaks in Long-Running Plugins

**Risk:** Plugin instance state not cleaned up.

**Likelihood:** Medium (class instances hold state)

**Impact:** Medium (memory growth over time)

**Mitigation:**
- `destroy()` method for cleanup
- `reset()` calls `destroy()` on all plugins
- Document cleanup patterns for stateful plugins

## Migration Plan

### Phase 1: Add Core Types (Non-Breaking in isolation)

1. Add `ApiPluginBase` abstract class (non-generic)
2. Add `ApiPlugin<TConfig>` class extending ApiPluginBase
3. Add `PluginClass<T>` type
4. Add `ApiRequestContext` (pure request data, no serviceName)
5. Add `ApiResponseContext`, `ShortCircuitResponse` types
6. Add `isShortCircuit` type guard

### Phase 2: Update ApiRegistry (Breaking)

1. Change service storage from `Map<string, service>` to `Map<ServiceClass, service>`
2. Update `register()` to take class, not string + class
3. Update `getService()` to take class, return typed instance
4. Update `has()` to take class
5. Remove `getDomains()` method
6. Remove `registerMocks()` method (OCP/DIP - mock config goes to MockPlugin)
7. Remove `setMockMode()` method (OCP/DIP - replaced by plugins.add/remove)
8. Remove `getMockMap()` method (OCP/DIP - MockPlugin manages its own map)
9. Add `_setGlobalPluginsProvider()` call after service instantiation

### Phase 3: Add Namespaced Plugin API

1. Add `apiRegistry.plugins` namespace object
2. Implement `plugins.add(...plugins)` - FIFO, no duplicates
3. Implement `plugins.addBefore(plugin, before)` / `plugins.addAfter(plugin, after)`
4. Implement `plugins.remove(pluginClass)`
5. Implement `plugins.has(pluginClass)`
6. Implement `plugins.getAll()`
7. Implement `plugins.getPlugin(pluginClass)`
8. Internal: add global plugin storage

### Phase 4: Add Namespaced Service API

1. Add `_setGlobalPluginsProvider()` internal method
2. Add `service.plugins` namespace object
3. Implement `plugins.add(...plugins)` - allows duplicates
4. Implement `plugins.exclude(...pluginClasses)`
5. Implement `plugins.getExcluded()`
6. Implement `plugins.getAll()`
7. Implement `plugins.getPlugin(pluginClass)`
8. Update plugin execution to use new chain pattern

### Phase 5: Update MockPlugin

1. Update `MockPlugin` to extend `ApiPlugin<TConfig>`
2. Update all MockPlugin usages

### Phase 6: Documentation

1. Update API.md guidelines
2. Create migration guide
3. Add plugin authoring guide

### Phase 7: Corrective Implementation (Post-Review)

Based on implementation review feedback, the following corrections are required:

#### 7.1 Refactor SseProtocol for OCP/DIP Compliance
1. Remove `import { MockPlugin }` from SseProtocol
2. Remove `instanceof MockPlugin` checks
3. Add generic `executePluginChainAsync()` method
4. Use `isShortCircuit()` type guard for short-circuit detection
5. Rename `simulateMockStream` to `simulateStreamFromShortCircuit`
6. Make stream simulation work with any `ApiResponseContext`, not just MockPlugin responses

#### 7.2 Update Documentation for Per-Service MockPlugin Pattern
1. Update examples to show per-service MockPlugin registration
2. Document vertical slice architecture compliance
3. Update hai3-new-api-service.md command templates
4. Add warning against global MockPlugin for screensets

#### 7.3 Audit and Remove ESLint Exceptions
1. Scan for `eslint-disable` comments in api package
2. Replace type assertions with proper type guards
3. Add proper typing where `any` was used
4. Document any legitimate third-party library exceptions

### Rollback Plan

If issues are discovered:
1. This is a clean break, no rollback to string-based API planned
2. For critical issues, revert the entire change and redesign
