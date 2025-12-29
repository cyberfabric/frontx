# Global API Plugins Design (Class-Based)

## Context

The HAI3 API layer follows a plugin-based architecture where plugins can intercept and modify API requests/responses. Currently, plugins are registered per-service via `BaseApiService.registerPlugin()`. This design adds a global plugin registry at the `apiRegistry` level using a **pure class-based approach** with type-safe plugin identification.

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
- **OCP-compliant** - Plugins should not know about specific services
- **Pure request data** - No service identification in ApiRequestContext
- **Namespaced plugin API** - Clear separation via `apiRegistry.plugins` and `service.plugins`

## Goals / Non-Goals

**Goals:**
- Enable global plugin registration at apiRegistry level via namespaced `plugins` object
- Ensure global plugins apply to ALL services (existing and future)
- Provide class-based API with abstract `ApiPlugin<TConfig>` base class using parameter property
- **Type-safe plugin identification by class reference** (not string names)
- **OCP-compliant dependency injection** via constructor config
- **Pure request data** - No service identification in ApiRequestContext
- Support short-circuit responses for mocking
- Provide flexible ordering (FIFO by default, explicit before/after positioning by class)
- Allow services to exclude specific global plugins by class reference
- Simplify mock mode toggle to single global registration
- Support plugin lifecycle management (cleanup via `destroy()`)
- **Tree-shaking compliance** - No static properties, no module-level instantiation
- **Clear duplicate policy** - Global: no duplicates; Service: duplicates allowed

**Non-Goals:**
- Plugin middleware chain with explicit `next()` calls
- Plugin communication/shared state between plugins
- Plugin versioning or compatibility checks
- Complex dependency graph with topological sorting
- Async `destroy()` hooks
- String-based plugin naming or identification
- Service identification in ApiRequestContext (use DI instead)

## Architecture Overview

### System Boundaries

```
apiRegistry (singleton)
  |
  +-- globalPlugins: ApiPlugin[] (NEW)
  |
  +-- services: Map<string, BaseApiService>
        |
        +-- plugins: ApiPlugin[] (per-service)
        +-- excludedPluginClasses: Set<PluginClass> (NEW)
```

### Data Flow

```
Request Flow (Automatic Chaining):
1. Service method called (e.g., service.get('/users'))
2. Build plugin chain: global plugins (filtered by exclusion) + service plugins
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

**ApiPlugin<TConfig> (abstract class):**
- Abstract base class defining plugin behavior
- Protected `config` property for dependency injection
- Optional lifecycle methods: `onRequest`, `onResponse`, `onError`, `destroy`
- No static properties (tree-shaking compliance)

**PluginClass<T> (type):**
- Type for referencing plugin classes
- Used for type-safe removal, exclusion, and positioning
- Enables compile-time validation

**apiRegistry (singleton):**
- Stores global plugins as instances
- Provides namespaced `plugins` object:
  - `plugins.add()` for bulk FIFO registration (no duplicates)
  - `plugins.addBefore()` / `plugins.addAfter()` for positioned registration
  - `plugins.remove()` for unregistration (by class reference)
  - `plugins.has()` for checking registration (by class reference)
  - `plugins.getAll()` for getting plugins in execution order
- Resolves before/after ordering constraints
- Detects circular dependencies and throws on registration

**BaseApiService:**
- Provides namespaced `plugins` object:
  - `plugins.add()` for service-specific plugins (duplicates allowed)
  - `plugins.exclude()` for excluding global plugins by class
  - `plugins.getExcluded()` for getting excluded classes
  - `plugins.getAll()` for getting service plugins
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
 * @template T - Plugin type (defaults to ApiPlugin)
 */
export type PluginClass<T extends ApiPlugin = ApiPlugin> = abstract new (...args: any[]) => T;
```

### Plugin Base Class

```typescript
/**
 * Abstract base class for API plugins.
 * Plugins extend this class and override lifecycle methods.
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
export abstract class ApiPlugin<TConfig = void> {
  // Uses TypeScript parameter property for concise declaration
  constructor(protected readonly config: TConfig) {}

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
  // ... existing methods (register, getService, etc.) ...

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
    add(...plugins: ApiPlugin[]): void;

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
    addBefore<T extends ApiPlugin>(plugin: ApiPlugin, before: PluginClass<T>): void;

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
    addAfter<T extends ApiPlugin>(plugin: ApiPlugin, after: PluginClass<T>): void;

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
    remove<T extends ApiPlugin>(pluginClass: PluginClass<T>): void;

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
    has<T extends ApiPlugin>(pluginClass: PluginClass<T>): boolean;

    /**
     * Get all plugins in execution order.
     */
    getAll(): readonly ApiPlugin[];
  };
}
```

### BaseApiService Extension

```typescript
export abstract class BaseApiService {
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
    add(...plugins: ApiPlugin[]): void;

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
    getAll(): readonly ApiPlugin[];
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

### URL-Based Rate Limit Plugin (Global)

```typescript
/**
 * If a global plugin truly needs URL-based limits:
 */
class UrlRateLimitPlugin extends ApiPlugin<{ getLimitForUrl: (url: string) => number }> {
  private requestCounts = new Map<string, number>();

  onRequest(ctx: ApiRequestContext) {
    const limit = this.config.getLimitForUrl(ctx.url);
    const count = this.requestCounts.get(ctx.url) ?? 0;

    if (count >= limit) {
      return {
        shortCircuit: {
          status: 429,
          headers: {},
          data: { error: 'Rate limit exceeded' }
        }
      };
    }

    this.requestCounts.set(ctx.url, count + 1);
    return ctx;
  }

  destroy() {
    this.requestCounts.clear();
  }
}

// Usage - URL-based limits
apiRegistry.plugins.add(new UrlRateLimitPlugin({
  getLimitForUrl: (url) => url.includes('/admin') ? 1000 : 100
}));
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

### Decision 1: Class-Based over Hooks-Based

**What:** Use abstract `ApiPlugin<TConfig>` class instead of plain hooks objects.

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

### Decision 2: Class Reference for Plugin Identification

**What:** Use `PluginClass<T>` type (class reference) instead of string names for removal, exclusion, and positioning.

**Why:**
- **Compile-time safety** - TypeScript catches typos and refactoring issues
- **IDE support** - Autocomplete, go-to-definition, find references
- **No runtime lookup** - Direct class comparison via `instanceof`
- **Refactoring-friendly** - Rename class, all references update

**Alternatives Considered:**
1. String names - Rejected: Typos not caught at compile time
2. Symbols - Rejected: Verbose, need separate export
3. Factory function reference - Rejected: Doesn't work for configured plugins

**Trade-offs:**
- (+) Compile-time validation
- (+) IDE support (autocomplete, refactoring)
- (+) No string typos possible
- (-) Requires importing plugin class for removal/exclusion

### Decision 3: OCP-Compliant Dependency Injection

**What:** Plugins receive service-specific behavior via constructor config, not by accessing ServiceContext.

**Why:**
- **Open/Closed Principle** - Plugin code doesn't change when services change
- **Testability** - Easy to mock config in tests
- **Decoupling** - Plugin doesn't know about service internals
- **Flexibility** - Caller decides the mapping, not the plugin

**Alternatives Considered:**
1. ServiceContext in ApiRequestContext - Rejected: Violates OCP, tight coupling
2. Plugin-level `shouldApply(service)` - Rejected: Plugin knows about services
3. Service-level metadata only - Rejected: Less flexible for cross-cutting logic

**Trade-offs:**
- (+) OCP compliant
- (+) Better testability
- (+) Plugins are more reusable
- (-) Caller must provide configuration
- (-) Slightly more setup code

### Decision 4: Pure Request Data in ApiRequestContext

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

### Decision 5: Short-Circuit via Return Type

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

### Decision 6: FIFO with Before/After Positioning by Class

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

### Decision 7: Namespaced Plugin API

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

### Decision 8: Duplicate Policy (Global vs Service)

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

### Decision 9: Parameter Property for Config

**What:** `ApiPlugin` class uses TypeScript parameter property: `constructor(protected readonly config: TConfig) {}`

**Why:**
- **Concise** - Single line instead of three
- **TypeScript idiomatic** - Well-known pattern
- **Less boilerplate** - Reduces class overhead

**Alternatives Considered:**
1. Explicit property + assignment - Rejected: More verbose
2. No config (use setters) - Rejected: Less type-safe

**Trade-offs:**
- (+) Minimal boilerplate
- (+) Clear and concise
- (-) Less familiar to devs new to TypeScript

### Decision 10: Tree-Shaking Compliance

**What:** Plugin classes have no static properties; no module-level instantiation.

**Why:**
- **Bundler optimization** - Unused plugins can be tree-shaken
- **Lazy instantiation** - Plugins created only when needed
- **Smaller bundles** - Only used plugins in final build

**Requirements:**
- No `static` properties on plugin classes
- No module-level `new Plugin()` calls
- `"sideEffects": false` in package.json
- `"module": "ESNext"` in tsconfig.json

**Trade-offs:**
- (+) Better tree-shaking
- (+) Smaller bundles for apps that don't use all plugins
- (-) Can't use static properties for plugin metadata

## Risks / Trade-offs

### Risk 1: Class Boilerplate

**Risk:** Plugins require more code than plain objects.

**Likelihood:** Medium (all plugins affected)

**Impact:** Low (boilerplate is minimal)

**Mitigation:**
- Abstract base class handles common pattern
- No-config plugins need only `constructor() { super(void 0); }`
- Clear examples in documentation

**Note on `super(void 0)` pattern:**
For plugins without configuration, use `void 0` (or `undefined`) as the config value:
```typescript
class LoggingPlugin extends ApiPlugin<void> {
  constructor() {
    super(void 0); // void 0 is preferred over undefined for explicitness
  }
}
```
Alternative: use `super(undefined)` - both are equivalent but `void 0` makes the intentional absence of config explicit.

### Risk 2: Global Plugin Class Collisions

**Risk:** Two instances of same plugin class registered globally.

**Likelihood:** Low (clear error message)

**Impact:** Low (error at registration time)

**Mitigation:**
- Throw error on duplicate class registration (global only)
- Include plugin class name in error message
- Service-level plugins allow duplicates by design

**Error class recommendation:**
Consider using a custom `PluginRegistrationError` class for clearer error handling:
```typescript
class PluginRegistrationError extends Error {
  constructor(
    public readonly pluginClass: PluginClass,
    message: string
  ) {
    super(`Plugin registration error (${pluginClass.name}): ${message}`);
    this.name = 'PluginRegistrationError';
  }
}

// Usage in apiRegistry.plugins.add()
if (this.globalPlugins.some(p => p instanceof pluginClass)) {
  throw new PluginRegistrationError(pluginClass, 'already registered globally');
}
```

### Risk 3: Short-Circuit Confusion

**Risk:** Plugin short-circuits unexpectedly, other plugins don't understand.

**Likelihood:** Low (explicit return type)

**Impact:** Medium (request not made)

**Mitigation:**
- Response includes marker (e.g., header) for short-circuited requests
- Documentation clearly explains short-circuit behavior
- Type system makes short-circuit explicit

**Header convention for short-circuited responses:**
Use the `x-hai3-short-circuit: true` header to mark responses that did not make an actual HTTP request:
```typescript
return {
  shortCircuit: {
    status: 200,
    headers: { 'x-hai3-short-circuit': 'true' },
    data: mockData
  }
};
```
This allows downstream code to detect mocked/cached responses if needed.

### Risk 4: Memory Leaks in Long-Running Plugins

**Risk:** Plugin instance state not cleaned up.

**Likelihood:** Medium (class instances hold state)

**Impact:** Medium (memory growth over time)

**Mitigation:**
- `destroy()` method for cleanup
- `reset()` calls `destroy()` on all plugins
- Document cleanup patterns for stateful plugins

**Async cleanup guidance:**
The `destroy()` method is synchronous by design. For async cleanup needs, use fire-and-forget:
```typescript
destroy(): void {
  // Sync cleanup
  this.cache.clear();

  // Async cleanup (fire-and-forget)
  this.closeConnections().catch(console.error);
}

private async closeConnections(): Promise<void> {
  await this.connection?.close();
}
```
If you need to await cleanup completion, do so before calling `apiRegistry.plugins.remove()`.

### Risk 5: Import Overhead for Exclusion

**Risk:** Services must import plugin classes to exclude them.

**Likelihood:** High (required for type safety)

**Impact:** Low (minimal bundle impact)

**Mitigation:**
- Plugin classes are already typically imported
- Clear documentation on import patterns
- Consider barrel exports for common plugins

## Migration Plan

### Phase 1: Add Core Types (Non-Breaking)

1. Add `ApiPlugin<TConfig>` abstract class with parameter property
2. Add `PluginClass<T>` type
3. Add `ApiRequestContext` (pure request data, no serviceName)
4. Add `ApiResponseContext`, `ShortCircuitResponse` types
5. Add `isShortCircuit` type guard

### Phase 2: Add Namespaced Registry API (Non-Breaking)

1. Add `apiRegistry.plugins` namespace object
2. Implement `plugins.add(...plugins)` - FIFO, no duplicates
3. Implement `plugins.addBefore(plugin, before)` / `plugins.addAfter(plugin, after)`
4. Implement `plugins.remove(pluginClass)`
5. Implement `plugins.has(pluginClass)`
6. Implement `plugins.getAll()`
7. Internal: add global plugin storage

### Phase 3: Add Namespaced Service API (Non-Breaking)

1. Add `service.plugins` namespace object
2. Implement `plugins.add(...plugins)` - allows duplicates
3. Implement `plugins.exclude(...pluginClasses)`
4. Implement `plugins.getExcluded()`
5. Implement `plugins.getAll()`
6. Update plugin execution to use new chain pattern

### Phase 4: Update MockPlugin

1. Update `MockPlugin` to extend `ApiPlugin<TConfig>`
2. Update all MockPlugin usages

### Phase 5: Documentation

1. Update API.md guidelines
2. Create migration guide
3. Add plugin authoring guide

### Rollback Plan

If issues are discovered:
1. Class-based plugins can coexist with any existing patterns
2. Provide adapter utilities if needed
3. Gradual migration with clear deprecation path

## Open Questions (Resolved)

> These questions have been addressed in this design.

1. **Should plugins be classes or hooks objects?**
   - **RESOLVED**: Classes with abstract `ApiPlugin<TConfig>` base using parameter property
   - Rationale: Type-safe identification, consistent with HAI3, clear DI, minimal boilerplate

2. **How are plugins identified for removal/exclusion?**
   - **RESOLVED**: By class reference (`PluginClass<T>`)
   - Rationale: Compile-time safety, IDE support, no string typos

3. **How do plugins access service-specific information?**
   - **RESOLVED**: Via constructor config (DI), not context
   - Rationale: OCP compliance, plugins don't know about services

4. **Should serviceName be in ApiRequestContext?**
   - **RESOLVED**: No, pure request data only (method, url, headers, body)
   - Rationale: Forces proper DI patterns; use service-level plugins for per-service configs

5. **Should `onError` allow recovery?**
   - **RESOLVED**: Yes, return `ApiResponseContext` to recover
   - Rationale: Enables retry and fallback patterns

6. **Should plugin API be flat or namespaced?**
   - **RESOLVED**: Namespaced under `apiRegistry.plugins` and `service.plugins`
   - Rationale: Clean organization, discoverability, extensibility

7. **Should duplicates be allowed?**
   - **RESOLVED**: Global: no; Service: yes
   - Rationale: Global clarity + service flexibility (different configs per service)
