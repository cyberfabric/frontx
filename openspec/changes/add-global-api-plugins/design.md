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
- **Concurrency safety for stateful plugins** - Plugins with per-request state MUST use WeakMap (Decision 13)
- **Cross-protocol plugin independence** - Each protocol maintains its own plugins; cross-cutting plugins use separate instances (Decision 12)

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
 *
 * IMPORTANT: With protocol-specific architecture, this type simplifies to:
 *   type ConnectionState = EventSource | EventSourceLike
 *
 * The 'short-circuit' string literal is REMOVED because:
 * - SseMockPlugin returns EventSourceLike (MockEventSource) as short-circuit
 * - SseProtocol treats both real and mock EventSource identically
 * - No special string marker needed - the type itself indicates the source
 *
 * After implementing Tasks 62-63, this definition will be updated to:
 *   export type ConnectionState = EventSource | EventSourceLike;
 *
 * Legacy definition (to be replaced):
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

### Decision 12: Cross-Protocol Plugin Registration

**What:** Each protocol (`RestProtocol`, `SseProtocol`) maintains its own independent global plugins collection. The same plugin instance SHOULD NOT be registered with multiple protocols.

**Why:**
- **Type Safety** - `RestPluginHooks` and `SsePluginHooks` have different method signatures
- **Clear Ownership** - Each protocol owns and manages its plugin lifecycle independently
- **No Shared State Issues** - Plugins don't accidentally share state across protocol boundaries
- **Explicit Registration** - Cross-cutting concerns (logging, telemetry) should create separate plugin instances per protocol

**Clarification for Cross-Cutting Plugins:**

When the same plugin logic needs to apply to multiple protocols (e.g., TelemetryPlugin), create separate instances:

```typescript
// CORRECT: Separate instances for each protocol
class RestTelemetryPlugin extends ApiPlugin<TelemetryConfig> implements RestPluginHooks {
  onRequest(ctx: RestRequestContext) { /* REST-specific telemetry */ }
  onResponse(res: RestResponseContext) { /* REST-specific telemetry */ }
}

class SseTelemetryPlugin extends ApiPlugin<TelemetryConfig> implements SsePluginHooks {
  onConnect(ctx: SseConnectionContext) { /* SSE-specific telemetry */ }
  onMessage(msg: SseMessageContext) { /* SSE-specific telemetry */ }
}

// Register separately
RestProtocol.globalPlugins.add(new RestTelemetryPlugin(config));
SseProtocol.globalPlugins.add(new SseTelemetryPlugin(config));

// WRONG: Same instance for multiple protocols (TypeScript will prevent this anyway)
const sharedPlugin = new TelemetryPlugin(config);
RestProtocol.globalPlugins.add(sharedPlugin); // Type error if hooks don't match
SseProtocol.globalPlugins.add(sharedPlugin);  // Type error if hooks don't match
```

**What Happens with Same Plugin Class:**

If you register the same plugin CLASS (but different instances) with both protocols:
- Each protocol maintains its own instance
- No state is shared between instances
- `getPlugin(PluginClass)` returns the instance for that specific protocol

```typescript
// OK: Same class, different instances
RestProtocol.globalPlugins.add(new LoggingPlugin({ prefix: 'REST' }));
SseProtocol.globalPlugins.add(new LoggingPlugin({ prefix: 'SSE' }));

// Each protocol has its own instance with its own config
RestProtocol.globalPlugins.getPlugin(LoggingPlugin); // { prefix: 'REST' }
SseProtocol.globalPlugins.getPlugin(LoggingPlugin);  // { prefix: 'SSE' }
```

### Decision 13: Required WeakMap Pattern for Stateful Plugins

**What:** Plugins that maintain per-request state MUST use `WeakMap<RequestContext, State>` for request-scoped storage. Instance properties for request state are NOT allowed.

**Why:**
- **Concurrency Safety** - Multiple concurrent requests will corrupt shared instance state
- **Memory Management** - WeakMap automatically garbage collects when request context is dereferenced
- **No Race Conditions** - Each request has isolated state

**Required Pattern:**

```typescript
// REQUIRED: WeakMap for per-request state
class RetryPlugin extends ApiPlugin<{ attempts: number }> implements RestPluginHooks {
  // Per-request state stored in WeakMap
  private attemptCounts = new WeakMap<RestRequestContext, number>();

  onRequest(ctx: RestRequestContext) {
    this.attemptCounts.set(ctx, 0);
    return ctx;
  }

  async onError(error: Error, request: RestRequestContext) {
    const count = this.attemptCounts.get(request) ?? 0;
    if (count < this.config.attempts) {
      this.attemptCounts.set(request, count + 1);
      throw error; // Re-throw signals retry
    }
    return error;
  }
}
```

**Prohibited Pattern:**

```typescript
// PROHIBITED: Instance properties for per-request state
class RetryPlugin extends ApiPlugin<{ attempts: number }> implements RestPluginHooks {
  // BAD: Shared across all concurrent requests!
  private attemptCount = 0;

  onRequest(ctx: RestRequestContext) {
    this.attemptCount = 0; // Race condition with concurrent requests
    return ctx;
  }

  async onError(error: Error, request: RestRequestContext) {
    if (this.attemptCount < this.config.attempts) {
      this.attemptCount++; // Wrong count if concurrent requests
      throw error;
    }
    return error;
  }
}
```

**Exceptions:**
- Global counters (e.g., total request count across all requests) MAY use instance properties
- Read-only config from constructor is always safe
- Singleton resources (e.g., database connection) MAY be instance properties

**Validation:**
- ESLint rule (future): Warn on mutable instance properties in plugin classes
- Code review: Check for WeakMap usage in stateful plugins

## Implementation Corrections (Post-Review) - SUPERSEDED

> **Note:** This section has been SUPERSEDED by the Protocol-Specific Plugin Architecture section below.
> The original corrections attempted to maintain a generic plugin system across protocols.
> After further review, we are adopting a protocol-specific approach instead.

### Original Correction 1: Per-Service MockPlugin (Not Global)

**Status:** RETAINED - Per-service mocking remains the preferred pattern.

### Original Correction 2: Protocol Plugin Agnosticism (OCP/DIP Compliance)

**Status:** SUPERSEDED - Replaced by protocol-specific plugin architecture.

## Protocol-Specific Plugin Architecture (Corrective Update v2)

### Why the Generic Approach Failed

The previous architecture attempted to make protocols agnostic to plugins via a generic short-circuit pattern. This created several problems:

1. **SSE mock simulation in protocol** - SseProtocol still had to know how to simulate streams from generic response data
2. **Type confusion** - `ShortCircuitResponse` with `ApiResponseContext` doesn't make sense for SSE (SSE doesn't return HTTP responses)
3. **Complex extraction logic** - `extractStreamContent()` became a catch-all trying to handle any data format

### New Architecture: Protocol-Specific Plugins

Each protocol defines and manages its own plugin system:

```
RestProtocol
  |
  +-- RestPluginHooks interface (onRequest, onResponse)
  +-- RestShortCircuitResponse { shortCircuit: RestResponseContext }
  +-- RestPlugin (convenience class)
  +-- RestPluginWithConfig<T> (with config)
  +-- RestMockPlugin (protocol-specific mock)
  +-- globalPlugins: Set<RestPluginHooks>
  +-- plugins: Set<RestPluginHooks> (instance)

SseProtocol
  |
  +-- SsePluginHooks interface (onConnect, onEvent)
  +-- SseShortCircuitResponse { shortCircuit: EventSourceLike }
  +-- SsePlugin (convenience class)
  +-- SsePluginWithConfig<T> (with config)
  +-- SseMockPlugin (protocol-specific mock)
  +-- globalPlugins: Set<SsePluginHooks>
  +-- plugins: Set<SsePluginHooks> (instance)

ApiPluginBase (shared base)
  |
  +-- destroy(): void (lifecycle)
```

### Key Insight: SSE Short-Circuit Returns EventSource, Not Data

The breakthrough is recognizing that SSE mocking should return an EventSource-like object, not response data:

```typescript
// OLD (wrong abstraction):
type ShortCircuitResponse = { shortCircuit: ApiResponseContext }; // HTTP response data
// Protocol must extract stream content and simulate events

// NEW (correct abstraction):
type SseShortCircuitResponse = { shortCircuit: EventSourceLike }; // Already an event source
// Protocol just uses it directly - no simulation needed
```

This makes SseProtocol pure:
```typescript
// Pure SseProtocol - single branch, same code path
connect(url, onMessage) {
  const result = await this.executePluginChain(context);

  const eventSource = isSseShortCircuit(result)
    ? result.shortCircuit  // Plugin-provided mock EventSource
    : new EventSource(url); // Real EventSource

  // Same handler attachment for both
  this.attachHandlers(eventSource, onMessage);
}
```

## Architectural Direction Evaluation - Updated

### Evaluated Architectural Directions

#### Direction A: Network-Level Mocking (MSW Approach)
**Verdict:** REJECTED (unchanged)

#### Direction B: Protocol-Specific Mock Plugins
**Verdict:** NOW CHOSEN

Previous objections and rebuttals:
- "Creates duplication of mock logic" - **Rebutted:** Mock logic IS protocol-specific. REST returns response data, SSE returns event streams. No real duplication.
- "Services must register multiple mock plugins" - **Rebutted:** Services typically use one protocol. A REST service uses RestMockPlugin, SSE service uses SseMockPlugin.
- "Breaks single MockPlugin configuration" - **Rebutted:** This was a false constraint. Protocols are fundamentally different.

#### Direction C: Dependency Injection in Protocols
**Verdict:** REJECTED (unchanged)

#### Direction D: Generic Short-Circuit with Stream Simulation
**Verdict:** NOW REJECTED

Why this failed:
- SseProtocol still had mock-specific logic (stream simulation)
- Type mismatch: `ApiResponseContext` doesn't fit SSE model
- Complex `extractStreamContent()` method trying to guess data format

### Why Direction B (Protocol-Specific) Is Best

**1. True OCP Compliance:**
Each protocol is open for extension via its own plugin system. Adding a new plugin type doesn't require modifying the protocol - just implementing the correct hook interface.

**2. True DIP Compliance:**
Protocol depends on its own abstraction (`RestPluginHooks` or `SsePluginHooks`), not on any concrete plugin. No `instanceof` checks needed.

**3. Type Safety:**
TypeScript enforces correct plugin types at compile time. You cannot accidentally register a REST plugin with SSE protocol.

**4. Protocol Purity:**
SseProtocol becomes truly pure - no mock simulation logic at all. It just uses whatever EventSource it gets (real or from plugin).

**5. Honest Abstractions:**
Each mock plugin is honest about what it does:
- `RestMockPlugin`: "I return fake HTTP responses"
- `SseMockPlugin`: "I return fake EventSource objects"

### New Type Definitions

```typescript
// ============= Base =============

/**
 * Base class for all plugins. Provides lifecycle management.
 */
export abstract class ApiPluginBase {
  /**
   * Called when plugin is unregistered.
   * Override to cleanup resources (close connections, clear timers, etc.)
   */
  destroy?(): void;
}

// ============= REST Protocol Plugins =============

/**
 * Hook interface for REST protocol plugins.
 */
export interface RestPluginHooks {
  onRequest?(ctx: RestRequestContext): RestRequestContext | RestShortCircuitResponse | Promise<RestRequestContext | RestShortCircuitResponse>;
  onResponse?(response: RestResponseContext, request: RestRequestContext): RestResponseContext | Promise<RestResponseContext>;
  onError?(error: Error, request: RestRequestContext): Error | RestResponseContext | Promise<Error | RestResponseContext>;
}

export type RestRequestContext = {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body?: unknown;
};

export type RestResponseContext = {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly data: unknown;
};

export type RestShortCircuitResponse = {
  readonly shortCircuit: RestResponseContext;
};

/**
 * Convenience class for REST plugins without config.
 */
export abstract class RestPlugin extends ApiPluginBase implements RestPluginHooks {}

/**
 * Convenience class for REST plugins with config.
 */
export abstract class RestPluginWithConfig<TConfig> extends ApiPluginBase implements RestPluginHooks {
  constructor(protected readonly config: TConfig) {
    super();
  }
}

// ============= SSE Protocol Plugins =============

/**
 * Hook interface for SSE protocol plugins.
 */
export interface SsePluginHooks {
  onConnect?(ctx: SseConnectContext): SseConnectContext | SseShortCircuitResponse | Promise<SseConnectContext | SseShortCircuitResponse>;
  onEvent?(event: MessageEvent): MessageEvent | void;
  onDisconnect?(connectionId: string): void;
}

export type SseConnectContext = {
  readonly url: string;
  readonly headers: Record<string, string>;
};

/**
 * Interface matching EventSource API for mock implementations.
 */
export interface EventSourceLike {
  readonly url: string;
  readonly readyState: number;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onopen: ((event: Event) => void) | null;
  close(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export type SseShortCircuitResponse = {
  readonly shortCircuit: EventSourceLike;
};

/**
 * Convenience class for SSE plugins without config.
 */
export abstract class SsePlugin extends ApiPluginBase implements SsePluginHooks {}

/**
 * Convenience class for SSE plugins with config.
 */
export abstract class SsePluginWithConfig<TConfig> extends ApiPluginBase implements SsePluginHooks {
  constructor(protected readonly config: TConfig) {
    super();
  }
}

/**
 * DESIGN ALTERNATIVE: Interface-First Approach
 *
 * An alternative to class-based plugins is an interface-first approach with factory functions.
 * This can reduce inheritance complexity for simple plugins:
 *
 * ```typescript
 * type RestPlugin = RestPluginHooks & { destroy?(): void };
 *
 * function createRestPlugin<T>(
 *   config: T,
 *   hooks: (config: T) => RestPluginHooks
 * ): RestPlugin {
 *   return { ...hooks(config) };
 * }
 *
 * // Usage:
 * const authPlugin = createRestPlugin({ getToken }, (config) => ({
 *   onRequest(ctx) {
 *     const token = config.getToken();
 *     return { ...ctx, headers: { ...ctx.headers, Authorization: `Bearer ${token}` } };
 *   }
 * }));
 * ```
 *
 * We chose the class-based approach because:
 * 1. Consistent with existing BaseApiService patterns in HAI3
 * 2. instanceof checks work naturally for plugin identification
 * 3. Lifecycle methods (destroy) are more naturally expressed in classes
 * 4. TypeScript abstract classes provide better IDE support
 *
 * Teams preferring functional composition may adapt this interface pattern.
 */

// ============= Type Guards =============

export function isRestShortCircuit(
  result: RestRequestContext | RestShortCircuitResponse | undefined
): result is RestShortCircuitResponse {
  return result !== undefined && 'shortCircuit' in result && 'status' in (result as RestShortCircuitResponse).shortCircuit;
}

export function isSseShortCircuit(
  result: SseConnectContext | SseShortCircuitResponse | undefined
): result is SseShortCircuitResponse {
  return result !== undefined && 'shortCircuit' in result && 'readyState' in (result as SseShortCircuitResponse).shortCircuit;
}
```

### Protocol-Level Plugin Management

```typescript
class RestProtocol {
  // Static global plugins - apply to all RestProtocol instances
  private static _globalPlugins: Set<RestPluginHooks> = new Set();

  static readonly globalPlugins = {
    add(plugin: RestPluginHooks): void {
      if (RestProtocol._globalPlugins.has(plugin)) {
        throw new Error('Plugin already registered globally');
      }
      RestProtocol._globalPlugins.add(plugin);
    },
    remove(plugin: RestPluginHooks): void {
      if (!RestProtocol._globalPlugins.delete(plugin)) {
        throw new Error('Plugin not registered');
      }
      if ('destroy' in plugin && typeof plugin.destroy === 'function') {
        plugin.destroy();
      }
    },
    has(plugin: RestPluginHooks): boolean {
      return RestProtocol._globalPlugins.has(plugin);
    },
    getAll(): ReadonlySet<RestPluginHooks> {
      return RestProtocol._globalPlugins;
    },
    clear(): void {
      for (const plugin of RestProtocol._globalPlugins) {
        if ('destroy' in plugin && typeof plugin.destroy === 'function') {
          plugin.destroy();
        }
      }
      RestProtocol._globalPlugins.clear();
    }
  };

  // Instance plugins - apply only to this protocol instance
  private _instancePlugins: Set<RestPluginHooks> = new Set();

  readonly plugins = {
    add: (plugin: RestPluginHooks): void => {
      this._instancePlugins.add(plugin); // Duplicates allowed at instance level
    },
    remove: (plugin: RestPluginHooks): void => {
      if (!this._instancePlugins.delete(plugin)) {
        throw new Error('Plugin not registered on this instance');
      }
      if ('destroy' in plugin && typeof plugin.destroy === 'function') {
        plugin.destroy();
      }
    },
    getAll: (): ReadonlySet<RestPluginHooks> => {
      return this._instancePlugins;
    }
  };

  // Plugin resolution: global first, then instance
  private getPluginsInOrder(): RestPluginHooks[] {
    return [...RestProtocol._globalPlugins, ...this._instancePlugins];
  }
}
```

### Protocol-Specific Mock Plugins

```typescript
// ============= REST Mock Plugin =============

export interface RestMockConfig {
  mockMap: Record<string, (body?: unknown) => unknown>;
  delay?: number;
}

export class RestMockPlugin extends RestPluginWithConfig<RestMockConfig> {
  async onRequest(ctx: RestRequestContext): Promise<RestRequestContext | RestShortCircuitResponse> {
    const key = `${ctx.method} ${ctx.url}`;
    const factory = this.config.mockMap[key];

    if (factory) {
      if (this.config.delay) {
        await new Promise(r => setTimeout(r, this.config.delay));
      }
      return {
        shortCircuit: {
          status: 200,
          headers: { 'x-mock': 'true' },
          data: factory(ctx.body)
        }
      };
    }
    return ctx;
  }
}

// ============= SSE Mock Plugin =============

export interface SseMockEvent {
  event?: string;
  data: string;
}

export interface SseMockConfig {
  mockStreams: Record<string, () => SseMockEvent[]>;
  delay?: number; // Delay between events
}

export class SseMockPlugin extends SsePluginWithConfig<SseMockConfig> {
  onConnect(ctx: SseConnectContext): SseConnectContext | SseShortCircuitResponse {
    const events = this.config.mockStreams[ctx.url];

    if (events) {
      // Return a mock EventSource that will emit the events
      return {
        shortCircuit: this.createMockEventSource(events(), this.config.delay)
      };
    }
    return ctx;
  }

  private createMockEventSource(events: SseMockEvent[], delay?: number): EventSourceLike {
    return new MockEventSource(events, delay);
  }
}

/**
 * Mock EventSource implementation that emits predefined events.
 *
 * Constructor accepts optional `url` parameter to better match the real EventSource API.
 * This allows mock implementations to preserve the original URL for debugging/logging.
 */
class MockEventSource implements EventSourceLike {
  readonly url: string;
  readyState = 0; // CONNECTING

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;

  private eventListeners = new Map<string, Set<EventListener>>();
  private aborted = false;

  constructor(
    private events: SseMockEvent[],
    private delay: number = 50,
    url: string = 'mock://'  // Optional URL for API compatibility
  ) {
    this.url = url;
    // Start emitting events asynchronously
    this.startEmitting();
  }

  private async startEmitting(): Promise<void> {
    // Simulate connection opening
    await new Promise(r => setTimeout(r, 10));
    if (this.aborted) return;

    this.readyState = 1; // OPEN
    this.onopen?.(new Event('open'));

    for (const event of this.events) {
      if (this.aborted) return;

      await new Promise(r => setTimeout(r, this.delay));
      if (this.aborted) return;

      const messageEvent = new MessageEvent(event.event || 'message', {
        data: event.data
      });

      this.onmessage?.(messageEvent);
      this.eventListeners.get(event.event || 'message')?.forEach(listener => {
        listener(messageEvent);
      });
    }

    // Simulate stream end
    this.readyState = 2; // CLOSED
  }

  close(): void {
    this.aborted = true;
    this.readyState = 2;
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }
}
```

### Pure SseProtocol Implementation

```typescript
class SseProtocol {
  // ... globalPlugins and plugins setup (same pattern as RestProtocol) ...

  async connect(
    url: string,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): Promise<string> {
    const connectionId = this.generateId();

    // Build context
    const context: SseConnectContext = {
      url: `${this.baseURL}${url}`,
      headers: {}
    };

    // Execute plugin chain
    let currentContext = context;
    for (const plugin of this.getPluginsInOrder()) {
      if (plugin.onConnect) {
        const result = await plugin.onConnect(currentContext);

        if (isSseShortCircuit(result)) {
          // Plugin provided an EventSource - use it directly
          this.attachHandlers(connectionId, result.shortCircuit, onMessage, onComplete);
          return connectionId;
        }

        currentContext = result;
      }
    }

    // No short-circuit - create real EventSource
    const realSource = new EventSource(currentContext.url);
    this.attachHandlers(connectionId, realSource, onMessage, onComplete);
    return connectionId;
  }

  private attachHandlers(
    connectionId: string,
    source: EventSourceLike,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): void {
    // Same code path for mock and real EventSource
    this.connections.set(connectionId, source);

    source.onmessage = (event) => {
      // Run onEvent hooks
      let currentEvent = event;
      for (const plugin of this.getPluginsInOrder()) {
        if (plugin.onEvent) {
          const result = plugin.onEvent(currentEvent);
          if (result) currentEvent = result;
        }
      }
      onMessage(currentEvent);
    };

    source.onerror = () => {
      this.disconnect(connectionId);
      onComplete?.();
    };
  }
}
```

### Removing apiRegistry.plugins Namespace

The centralized plugin registry is removed. Services compose protocols, protocols manage plugins:

```typescript
// OLD (centralized):
apiRegistry.plugins.add(new MockPlugin({ ... }));

// NEW (protocol-level):
RestProtocol.globalPlugins.add(new RestMockPlugin({ ... }));
SseProtocol.globalPlugins.add(new SseMockPlugin({ ... }));

// Or per-service:
class MyService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol();
    super({ baseURL: '/api' }, restProtocol);

    restProtocol.plugins.add(new RestMockPlugin({ ... }));
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

1. Add `ApiPluginBase` abstract class (lifecycle base)
2. Add protocol-specific hook interfaces (`RestPluginHooks`, `SsePluginHooks`)
3. Add protocol-specific context types (`RestRequestContext`, `SseConnectContext`)
4. Add protocol-specific short-circuit types (`RestShortCircuitResponse`, `SseShortCircuitResponse`)
5. Add `EventSourceLike` interface for SSE mocking
6. Add protocol-specific type guards (`isRestShortCircuit`, `isSseShortCircuit`)

### Phase 2: Update ApiRegistry (Breaking)

1. Change service storage from `Map<string, service>` to `Map<ServiceClass, service>`
2. Update `register()` to take class, not string + class
3. Update `getService()` to take class, return typed instance
4. Update `has()` to take class
5. Remove `getDomains()` method
6. Remove `registerMocks()` method (OCP/DIP - mock config goes to protocol plugins)
7. Remove `setMockMode()` method (OCP/DIP - replaced by protocol plugins)
8. Remove `getMockMap()` method (OCP/DIP - mock plugins manage their own maps)
9. **REMOVE** `apiRegistry.plugins` namespace (moved to protocol level)

### Phase 3: Add Protocol-Level Plugin Management

1. Add `RestProtocol.globalPlugins` static namespace
2. Add `RestProtocol.plugins` instance namespace
3. Add `SseProtocol.globalPlugins` static namespace
4. Add `SseProtocol.plugins` instance namespace
5. Implement plugin resolution: global first, then instance
6. Each protocol only accepts its own plugin hook type

### Phase 4: Add Protocol-Specific Convenience Classes

1. Add `RestPlugin extends ApiPluginBase implements RestPluginHooks`
2. Add `RestPluginWithConfig<T>` with config support
3. Add `SsePlugin extends ApiPluginBase implements SsePluginHooks`
4. Add `SsePluginWithConfig<T>` with config support

### Phase 5: Create Protocol-Specific Mock Plugins

1. Create `RestMockPlugin extends RestPluginWithConfig<RestMockConfig>`
2. Create `SseMockPlugin extends SsePluginWithConfig<SseMockConfig>`
3. Create `MockEventSource` implementing `EventSourceLike`
4. **DELETE** generic `MockPlugin` class
5. Update all MockPlugin usages to protocol-specific versions

### Phase 6: Purify SseProtocol

1. Remove ALL mock simulation logic from SseProtocol
2. Remove `extractStreamContent()` and related methods
3. Remove `simulateMockStream()` / `simulateStreamFromShortCircuit()`
4. Implement single-branch logic: short-circuit EventSource vs real EventSource
5. Same `attachHandlers()` code path for both

### Phase 7: Documentation

1. Update API.md guidelines for protocol-specific plugins
2. Update command templates for protocol-specific registration
3. Add plugin authoring guide with examples for each protocol
4. Document cross-cutting plugin pattern (implements multiple hook interfaces)

### Phase 8: Corrective Implementation (Post-Review v2)

Based on implementation review feedback, the following corrections supersede Phase 7 from the original plan:

#### 8.1 Remove Centralized Plugin Registry
1. Delete `apiRegistry.plugins` namespace entirely
2. Update all usages to protocol-level registration
3. Services should access protocol plugins via `this.protocol(RestProtocol).plugins`

#### 8.2 Create MockEventSource Class
1. Implement `EventSourceLike` interface
2. Constructor accepts events array and delay
3. Async event emission with abort support
4. Proper readyState management

#### 8.3 Update Tests for Protocol-Specific Plugins
1. Update plugin registration tests to use protocol-level APIs
2. Add tests for `RestMockPlugin` and `SseMockPlugin`
3. Add tests for pure SseProtocol behavior
4. Verify type safety at compile time

### Rollback Plan

If issues are discovered:
1. This is a clean break, no rollback to centralized plugin API planned
2. For critical issues, revert the entire change and redesign

---

## API Versioning Policy

### Current Implementation

The "Clean Break Policy" (Decision 11) works well for internal HAI3 development where:
- All consumers are within the monorepo
- Breaking changes can be coordinated
- Migration is immediate and complete

### Future External Consumers

When exposing the plugin API to external consumers (published npm packages), the following versioning policy should apply:

1. **Major Version Bump**: Required for any of these breaking changes:
   - Removing or renaming hook interfaces (`RestPluginHooks`, `SsePluginHooks`)
   - Changing hook method signatures
   - Removing or renaming base classes (`RestPlugin`, `SsePlugin`, etc.)
   - Changing short-circuit type structures
   - Removing protocol-level plugin management methods

2. **Minor Version Bump**: For backward-compatible additions:
   - New optional hook methods
   - New plugin convenience classes
   - New short-circuit types for new protocols
   - New utility functions

3. **Migration Guide Requirement**: Any major version must include:
   - Detailed migration guide in CHANGELOG.md
   - Codemod scripts where possible
   - At least one minor version with deprecation warnings before removal (external only)

### Decision Record

For HAI3 internal development, continue using Clean Break Policy. When @hai3/api is published externally, update this section with formal semantic versioning commitment.

---

## Mock Map Self-Registration (Vertical Slice Architecture Compliance)

### Problem Statement

The current implementation in App.tsx violates vertical slice architecture:

```typescript
// src/app/App.tsx - WRONG PATTERN
import { accountsMockMap } from '@/app/api/mocks';
<StudioOverlay mockConfig={{ mockMap: accountsMockMap, delay: 500 }} />
```

This creates several architectural violations:

1. **App layer coupling to service mocks** - App.tsx imports service-specific mock maps
2. **Centralized mock configuration** - Mocks must be aggregated and passed from App
3. **Screenset boundary violation** - Screensets cannot fully encapsulate their mocks
4. **Studio knows too much** - StudioOverlay manages mock maps instead of just toggling mode

### Design Decision: Mock Map Self-Registration

**What:** Services register their own mock maps during construction. Studio only toggles mock mode ON/OFF.

**Why:**
- **Vertical slice compliance** - Screensets bring their own services AND mocks
- **Separation of concerns** - App layer doesn't know about service-specific details
- **Encapsulation** - Mock maps are implementation details of services
- **Simpler Studio** - Toggle is just ON/OFF, no configuration management

### Architecture

```
Vertical Slice (Screenset)
  |
  +-- AccountsApiService
  |     |
  |     +-- constructor()
  |           |
  |           +-- Creates RestProtocol
  |           +-- Registers mock map via restProtocol.registerMockMap(accountsMockMap)
  |           +-- Mock map stays with service
  |
  +-- accountsMockMap (imported only by AccountsApiService)

StudioOverlay
  |
  +-- ApiModeToggle
        |
        +-- Toggle ON: RestProtocol.globalPlugins.add(new RestMockPlugin())
        +-- Toggle OFF: RestProtocol.globalPlugins.remove(RestMockPlugin)
        +-- RestMockPlugin uses mock maps registered by services
```

### API Design

#### RestProtocol Mock Map Registration

```typescript
class RestProtocol {
  // Instance-level mock map storage
  private mockMap: RestMockMap = {};

  /**
   * Register mock map for this protocol instance.
   * Called by services during construction.
   */
  registerMockMap(mockMap: RestMockMap): void {
    this.mockMap = { ...this.mockMap, ...mockMap };
  }

  /**
   * Get the registered mock map.
   * Used by RestMockPlugin when enabled.
   */
  getMockMap(): Readonly<RestMockMap> {
    return this.mockMap;
  }
}
```

#### Service Self-Registration Pattern

```typescript
// screensets/accounts/services/AccountsApiService.ts
import { accountsMockMap } from '../mocks';

class AccountsApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol();
    super({ baseURL: '/api/accounts' }, restProtocol);

    // Self-register mock map - stays within screenset
    restProtocol.registerMockMap(accountsMockMap);
  }
}
```

#### StudioOverlay Without Mock Config

```typescript
// BEFORE (wrong - App knows about mocks)
<StudioOverlay mockConfig={{ mockMap: accountsMockMap, delay: 500 }} />

// AFTER (correct - Studio only toggles mode)
<StudioOverlay />
```

#### ApiModeToggle Implementation

```typescript
// components/Studio/ApiModeToggle.tsx
const ApiModeToggle = () => {
  const [isMockMode, setIsMockMode] = useState(false);

  const toggleMockMode = () => {
    if (isMockMode) {
      // Disable mock mode - remove global mock plugin
      RestProtocol.globalPlugins.remove(RestMockPlugin);
    } else {
      // Enable mock mode - add global mock plugin
      // Plugin will use mock maps already registered by services
      RestProtocol.globalPlugins.add(new RestMockPlugin({ delay: 500 }));
    }
    setIsMockMode(!isMockMode);
  };

  return <Toggle value={isMockMode} onChange={toggleMockMode} />;
};
```

#### RestMockPlugin Using Pre-Registered Mocks

```typescript
class RestMockPlugin extends RestPluginWithConfig<{ delay?: number }> {
  async onRequest(ctx: RestRequestContext): Promise<RestRequestContext | RestShortCircuitResponse> {
    // Get mock map from the protocol instance that will execute this request
    // This is accessed via the protocol's getMockMap() method
    const mockMap = this.getProtocolMockMap(ctx);

    const key = `${ctx.method} ${ctx.url}`;
    const factory = mockMap[key];

    if (factory) {
      if (this.config.delay) {
        await new Promise(r => setTimeout(r, this.config.delay));
      }
      return {
        shortCircuit: {
          status: 200,
          headers: { 'x-mock': 'true' },
          data: factory(ctx.body)
        }
      };
    }
    return ctx;
  }
}
```

### Key Design Principles

1. **Mock maps are owned by services** - Each service registers its own mocks
2. **Studio is a simple toggle** - No mock configuration knowledge
3. **App layer is clean** - No mock imports or configuration passing
4. **Vertical slices are complete** - Screensets bring services + mocks together
5. **Global plugin enables all mocks** - RestMockPlugin activates pre-registered maps

### Alternatives Considered

1. **Keep current pattern (rejected)** - Violates vertical slice architecture
2. **Global mock registry (rejected)** - Still requires App to aggregate mocks
3. **Service-level mock plugins (considered)** - More complex, services manage their own plugin lifecycle

### Trade-offs

- (+) Clean vertical slice boundaries
- (+) App layer has no mock knowledge
- (+) Studio is simpler (just toggle)
- (+) Services are self-contained
- (-) Services must call registerMockMap() in constructor
- (-) Mock maps must be registered before mock mode is enabled
