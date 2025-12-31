## MODIFIED Requirements

### Requirement: @hai3/api package

The system SHALL provide API communication infrastructure with a class-based plugin system for extensibility.

- **WHEN** importing from `@hai3/api`
- **THEN** `BaseApiService`, `RestProtocol`, `SseProtocol`, `MockPlugin`, `apiRegistry` are available
- **AND** `ApiPluginBase`, `ApiPlugin`, `PluginClass`, `ApiRequestContext`, `ApiResponseContext` types are available
- **AND** `ShortCircuitResponse`, `isShortCircuit` are available
- **AND** the only external dependency is `axios`
- **AND** it has ZERO @hai3 dependencies

#### Scenario: ApiPluginBase is an abstract base class (non-generic)

- **WHEN** storing plugins in arrays or maps
- **THEN** use `ApiPluginBase` as the storage type
- **AND** it defines optional lifecycle methods `onRequest`, `onResponse`, `onError`, `destroy`
- **AND** it is non-generic (no type parameters)
- **AND** all plugins ultimately extend this class

#### Scenario: ApiPlugin is an abstract class with typed config

- **WHEN** creating a custom API plugin
- **THEN** the plugin class extends `ApiPlugin<TConfig>`
- **AND** `TConfig` is the configuration type (use `void` for no config)
- **AND** configuration is accessible via `this.config` (protected readonly)
- **AND** `ApiPlugin<TConfig>` extends `ApiPluginBase`
- **AND** no string name property is required (identification by class)

#### Scenario: Plugin without configuration

- **WHEN** creating a plugin that needs no configuration
- **THEN** extend `ApiPlugin<void>`
- **AND** call `super(void 0)` in constructor
- **AND** example:
```typescript
class LoggingPlugin extends ApiPlugin<void> {
  constructor() {
    super(void 0);
  }
  onRequest(ctx: ApiRequestContext) {
    console.log(`[${ctx.method}] ${ctx.url}`);
    return ctx;
  }
}
```

#### Scenario: Plugin with configuration (DI)

- **WHEN** creating a plugin that needs configuration
- **THEN** extend `ApiPlugin<TConfig>` with a specific config type
- **AND** access configuration via `this.config`
- **AND** example:
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
```

#### Scenario: Plugin execution follows FIFO order

- **WHEN** multiple plugins are registered
- **THEN** plugins execute in registration order (FIFO) within their scope
- **AND** global plugins execute before service plugins (phase separation)
- **AND** response processing follows reverse order (onion model)

#### Scenario: Short-circuit skips HTTP request

- **WHEN** a plugin's `onRequest` returns `{ shortCircuit: ApiResponseContext }`
- **THEN** the HTTP request is NOT made
- **AND** subsequent plugins' `onRequest` methods are NOT called
- **AND** `onResponse` methods ARE called with the short-circuited response
- **AND** response flows through plugins in reverse order

## ADDED Requirements

### Requirement: Class-Based Service Registration

The system SHALL provide class-based service registration using class constructor references instead of string domains.

#### Scenario: Register service by class reference

- **WHEN** calling `apiRegistry.register(ServiceClass)`
- **THEN** an instance of the service class is created
- **AND** the instance is stored with the class as the key
- **AND** `_setGlobalPluginsProvider()` is called on the instance
- **AND** the service is available via `getService(ServiceClass)`

#### Scenario: Get service by class reference

- **WHEN** calling `apiRegistry.getService(ServiceClass)`
- **THEN** the service instance is returned
- **AND** the return type is correctly inferred as `ServiceClass`
- **AND** no type assertion is needed
- **AND** error is thrown if service not registered

#### Scenario: Check if service is registered by class

- **WHEN** calling `apiRegistry.has(ServiceClass)`
- **THEN** returns `true` if service class is registered
- **AND** returns `false` otherwise

#### Scenario: Register mocks by class reference

- **WHEN** calling `apiRegistry.registerMocks(ServiceClass, mockMap)`
- **THEN** mocks are registered for the specified service class
- **AND** service class must be registered first

#### Scenario: REMOVED - getDomains() method

- **WHEN** the new class-based API is in use
- **THEN** `getDomains()` method is NOT available
- **AND** there is no equivalent method (iterate services by class if needed)

### Requirement: Global API Plugin Registration (Namespaced API)

The system SHALL provide global plugin registration on `apiRegistry.plugins` namespace that applies plugins to ALL API services, both existing and future.

#### Scenario: Register global plugins with plugins.add()

- **WHEN** calling `apiRegistry.plugins.add(plugin1, plugin2, plugin3)`
- **THEN** all plugins are stored in the global plugins registry
- **AND** plugins are appended in registration order (FIFO)
- **AND** plugins are immediately applied to all existing service instances
- **AND** plugins will be automatically applied to any future service instances
- **AND** error is thrown if any plugin of same class is already registered (no duplicates)

#### Scenario: Position before another plugin by class

- **WHEN** calling `apiRegistry.plugins.addBefore(plugin, TargetPlugin)`
- **THEN** the plugin is inserted before the specified plugin class in execution order
- **AND** an error is thrown if the referenced plugin class is not registered
- **AND** an error is thrown if the positioning creates a circular dependency

#### Scenario: Position after another plugin by class

- **WHEN** calling `apiRegistry.plugins.addAfter(plugin, TargetPlugin)`
- **THEN** the plugin is inserted after the specified plugin class in execution order
- **AND** an error is thrown if the referenced plugin class is not registered
- **AND** an error is thrown if the positioning creates a circular dependency

#### Scenario: Remove global plugin by class

- **WHEN** calling `apiRegistry.plugins.remove(PluginClass)`
- **THEN** the plugin instance of that class is removed from the global plugins registry
- **AND** the plugin's `destroy()` method is called if available
- **AND** the plugin no longer executes for any service
- **AND** error is thrown if plugin not registered

#### Scenario: Check if plugin is registered

- **WHEN** calling `apiRegistry.plugins.has(PluginClass)`
- **THEN** returns `true` if a plugin of that class is registered
- **AND** returns `false` otherwise
- **AND** check is type-safe (compile-time validation)

#### Scenario: Get global plugins

- **WHEN** calling `apiRegistry.plugins.getAll()`
- **THEN** a readonly array of all global plugin instances is returned
- **AND** plugins are in execution order (respecting FIFO and before/after constraints)

#### Scenario: Get plugin by class reference

- **WHEN** calling `apiRegistry.plugins.getPlugin(PluginClass)`
- **THEN** the plugin instance of that class is returned
- **AND** the return type is correctly inferred
- **AND** returns `undefined` if not found

#### Scenario: Global plugins apply to new services

- **WHEN** a new service is registered via `apiRegistry.register()` after global plugins exist
- **THEN** all global plugins are automatically applied to the new service instance
- **AND** the order of registration (service vs plugin) does not affect behavior

#### Scenario: Registry reset clears global plugins

- **WHEN** calling `apiRegistry.reset()`
- **THEN** all global plugins are removed
- **AND** `destroy()` is called on each global plugin
- **AND** the global plugins array is cleared

### Requirement: Service-Level Plugin Management (Namespaced API)

The system SHALL allow individual services to register service-specific plugins and exclude global plugins by class via `service.plugins` namespace.

#### Scenario: Register service-specific plugins with plugins.add()

- **WHEN** calling `service.plugins.add(plugin1, plugin2)`
- **THEN** the plugins are registered for this service only
- **AND** service plugins execute after global plugins
- **AND** service plugins execute in registration order (FIFO)
- **AND** duplicates of same class ARE allowed (different configs)

#### Scenario: Exclude global plugins by class

- **WHEN** calling `service.plugins.exclude(AuthPlugin, MetricsPlugin)`
- **THEN** the specified plugin classes are added to the service's exclusion list
- **AND** subsequent requests will NOT execute excluded plugins
- **AND** the global registry is NOT modified (other services still receive the plugins)
- **AND** exclusion is type-safe (compile-time validation)

#### Scenario: Get excluded plugin classes

- **WHEN** calling `service.plugins.getExcluded()`
- **THEN** a readonly array of excluded plugin classes is returned

#### Scenario: Get service plugins

- **WHEN** calling `service.plugins.getAll()`
- **THEN** a readonly array of service-specific plugins is returned
- **AND** does NOT include global plugins

#### Scenario: Get plugin by class reference (service-level)

- **WHEN** calling `service.plugins.getPlugin(PluginClass)`
- **THEN** the plugin instance of that class is returned
- **AND** searches service plugins first, then global plugins
- **AND** the return type is correctly inferred
- **AND** returns `undefined` if not found

#### Scenario: Plugin merging respects exclusions by class

- **WHEN** `BaseApiService` executes a request
- **THEN** global plugins are filtered using `instanceof` to remove excluded classes
- **AND** remaining global plugins execute first (in FIFO order)
- **AND** service plugins execute after (in FIFO order)

#### Scenario: Reverse order for response processing

- **WHEN** response is received from HTTP request (or short-circuit)
- **THEN** `onResponse` methods are called in reverse order
- **AND** last registered plugin's `onResponse` runs first
- **AND** this implements the onion model

### Requirement: Internal Global Plugins Injection

The system SHALL provide internal mechanism for services to receive global plugins from the registry.

#### Scenario: _setGlobalPluginsProvider() internal method

- **WHEN** a service is registered via `apiRegistry.register(ServiceClass)`
- **THEN** `service._setGlobalPluginsProvider(provider)` is called
- **AND** the provider is a function returning readonly array of global plugins
- **AND** this method is internal (underscore convention)
- **AND** derived service classes do NOT need to know about this method

#### Scenario: Service accesses global plugins via provider

- **WHEN** a service needs to execute plugin chain
- **THEN** it calls the global plugins provider to get current plugins
- **AND** this ensures services see newly added global plugins
- **AND** this allows for dynamic global plugin registration

### Requirement: Plugin Lifecycle Method Contracts

The system SHALL enforce specific contracts for each plugin lifecycle method.

#### Scenario: onRequest lifecycle method contract

- **WHEN** a plugin defines `onRequest` method
- **THEN** it receives `ApiRequestContext` with method, url, headers, body (pure request data)
- **AND** it returns `ApiRequestContext` (modified or unchanged) for normal flow
- **AND** it returns `{ shortCircuit: ApiResponseContext }` to skip HTTP request
- **AND** it may return a Promise for async operations

#### Scenario: onResponse lifecycle method contract

- **WHEN** a plugin defines `onResponse` method
- **THEN** it receives `ApiResponseContext` and original `ApiRequestContext`
- **AND** it returns `ApiResponseContext` (modified or unchanged)
- **AND** it may return a Promise for async operations

#### Scenario: onError lifecycle method contract

- **WHEN** a plugin defines `onError` method
- **THEN** it receives `Error` and original `ApiRequestContext`
- **AND** it returns `Error` (modified or unchanged) to continue error flow
- **AND** it returns `ApiResponseContext` to recover from error
- **AND** it may return a Promise for async operations

#### Scenario: destroy lifecycle method contract

- **WHEN** a plugin defines `destroy` method
- **THEN** it is called when plugin is unregistered (via `remove`)
- **AND** it is called when registry is reset (via `reset`)
- **AND** it is synchronous (no Promise return)
- **AND** it should clean up resources (close connections, clear timers, etc.)

### Requirement: ApiRegistry Interface Extension (Class-Based)

The system SHALL provide class-based service management and namespaced plugin management.

#### Scenario: ApiRegistry interface includes class-based service methods

- **WHEN** checking the `ApiRegistry` interface in types.ts
- **THEN** `register<T extends BaseApiService>(serviceClass: new () => T): void` is defined
- **AND** `getService<T extends BaseApiService>(serviceClass: new () => T): T` is defined
- **AND** `registerMocks<T extends BaseApiService>(serviceClass: new () => T, mockMap: MockMap): void` is defined
- **AND** `has<T extends BaseApiService>(serviceClass: new () => T): boolean` is defined
- **AND** `getDomains()` is NOT defined (removed)

#### Scenario: ApiRegistry interface includes plugins namespace

- **WHEN** checking the `ApiRegistry` interface in types.ts
- **THEN** `readonly plugins: { ... }` namespace object is defined
- **AND** it contains all plugin management methods

#### Scenario: ApiRegistry.plugins includes add() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `add(...plugins: ApiPluginBase[]): void` method is defined
- **AND** it registers multiple plugins in FIFO order
- **AND** it throws on duplicate plugin class

#### Scenario: ApiRegistry.plugins includes addBefore() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void` method is defined
- **AND** it inserts plugin before the target class
- **AND** it throws if target class not registered
- **AND** it throws on circular dependency

#### Scenario: ApiRegistry.plugins includes addAfter() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void` method is defined
- **AND** it inserts plugin after the target class
- **AND** it throws if target class not registered
- **AND** it throws on circular dependency

#### Scenario: ApiRegistry.plugins includes remove() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void` method is defined
- **AND** it removes plugin by class reference (type-safe)
- **AND** it calls destroy() if defined
- **AND** it throws if plugin not registered

#### Scenario: ApiRegistry.plugins includes has() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean` method is defined
- **AND** it checks registration by class reference (type-safe)

#### Scenario: ApiRegistry.plugins includes getAll() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `getAll(): readonly ApiPluginBase[]` method is defined
- **AND** it returns plugins in execution order

#### Scenario: ApiRegistry.plugins includes getPlugin() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined` method is defined
- **AND** it returns the plugin instance or undefined

### Requirement: Type Definitions

The system SHALL provide comprehensive type definitions for the class-based plugin system.

#### Scenario: ApiPluginBase abstract class (non-generic)

- **WHEN** using `ApiPluginBase` abstract class
- **THEN** it defines optional `onRequest` method signature
- **AND** it defines optional `onResponse` method signature
- **AND** it defines optional `onError` method signature
- **AND** it defines optional `destroy` method signature
- **AND** it is non-generic (used for storage)

#### Scenario: ApiPlugin abstract class with parameter property

- **WHEN** using `ApiPlugin<TConfig>` abstract class
- **THEN** it extends `ApiPluginBase`
- **AND** it uses TypeScript parameter property: `constructor(protected readonly config: TConfig) {}`
- **AND** `TConfig` defaults to `void`

#### Scenario: PluginClass type for class references

- **WHEN** using `PluginClass<T>` type
- **THEN** it represents a class constructor for plugins
- **AND** it enables type-safe plugin identification
- **AND** definition: `type PluginClass<T extends ApiPluginBase = ApiPluginBase> = abstract new (...args: any[]) => T`

#### Scenario: ApiRequestContext type (pure request data)

- **WHEN** using `ApiRequestContext` type
- **THEN** it has readonly `method: string` property
- **AND** it has readonly `url: string` property
- **AND** it has readonly `headers: Record<string, string>` property
- **AND** it has readonly optional `body?: unknown` property
- **AND** it does NOT have `serviceName` (pure request data only)

#### Scenario: ApiResponseContext type

- **WHEN** using `ApiResponseContext` type
- **THEN** it has readonly `status: number` property
- **AND** it has readonly `headers: Record<string, string>` property
- **AND** it has readonly `data: unknown` property

#### Scenario: ShortCircuitResponse type

- **WHEN** using `ShortCircuitResponse` type
- **THEN** it has readonly `shortCircuit: ApiResponseContext` property
- **AND** returning this from `onRequest` skips HTTP request

#### Scenario: isShortCircuit type guard

- **WHEN** calling `isShortCircuit(result)` with a `ShortCircuitResponse`
- **THEN** it returns `true`
- **AND** TypeScript narrows `result` to `ShortCircuitResponse` type
- **WHEN** calling `isShortCircuit(result)` with an `ApiRequestContext`
- **THEN** it returns `false`
- **AND** TypeScript narrows `result` to `ApiRequestContext` type
- **WHEN** calling `isShortCircuit(undefined)`
- **THEN** it returns `false`

### Requirement: OCP-Compliant Dependency Injection

The system SHALL support OCP-compliant plugin configuration where plugins receive service-specific behavior via constructor config, not by accessing context.

#### Scenario: Plugin receives behavior via config (pure DI)

- **WHEN** a plugin needs service-specific behavior
- **THEN** the behavior is injected via constructor config
- **AND** the plugin does NOT access any service identification from context
- **AND** use service-level plugins for per-service configuration
- **AND** example:
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
```

#### Scenario: URL-based configuration for global plugins

- **WHEN** a global plugin needs to vary behavior
- **THEN** use URL-based configuration instead of service identification
- **AND** example:
```typescript
class UrlRateLimitPlugin extends ApiPlugin<{ getLimitForUrl: (url: string) => number }> {
  onRequest(ctx: ApiRequestContext) {
    const limit = this.config.getLimitForUrl(ctx.url);
    return ctx;
  }
}

apiRegistry.plugins.add(new UrlRateLimitPlugin({
  getLimitForUrl: (url) => url.includes('/admin') ? 1000 : 100
}));
```

#### Scenario: Pure request data in context

- **WHEN** plugin receives `ApiRequestContext`
- **THEN** only pure request data is available (method, url, headers, body)
- **AND** `ctx.serviceName` is NOT available
- **AND** service-specific behavior comes from config or service-level plugins

### Requirement: Tree-Shaking Compliance

The system SHALL ensure plugin classes are tree-shakeable.

#### Scenario: No static properties on plugin classes

- **WHEN** defining plugin classes
- **THEN** no `static` properties are allowed
- **AND** no module-level instantiation is allowed
- **AND** bundlers can tree-shake unused plugins

#### Scenario: Package configuration for tree-shaking

- **WHEN** building the @hai3/api package
- **THEN** package.json has `"sideEffects": false`
- **AND** tsconfig.json has `"module": "ESNext"`

## Example Plugin Implementations

### Scenario: Logging plugin implementation (no config)

- **WHEN** implementing a logging plugin
- **THEN** it follows this pattern:
```typescript
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

### Scenario: Auth plugin with configuration (DI)

- **WHEN** implementing an auth plugin with token provider
- **THEN** it follows this pattern:
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

// Usage
apiRegistry.plugins.add(new AuthPlugin({ getToken: () => localStorage.getItem('token') }));
```

### Scenario: Mock plugin with short-circuit

- **WHEN** implementing a mock plugin
- **THEN** it uses short-circuit to skip HTTP:
```typescript
type MockMap = Record<string, (body?: unknown) => unknown>;

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

### Scenario: Class-based service registration example

- **WHEN** registering and using services
- **THEN** use class references:
```typescript
// Define service
class AccountsApiService extends BaseApiService {
  // ...
}

// Registration - class reference, not string
apiRegistry.register(AccountsApiService);

// Retrieval - class reference IS the type
const service = apiRegistry.getService(AccountsApiService);
// service is typed as AccountsApiService

// Check if registered
apiRegistry.has(AccountsApiService); // true

// Register mocks
apiRegistry.registerMocks(AccountsApiService, {
  'GET /accounts': () => [{ id: 1, name: 'Test' }]
});
```

### Scenario: Service exclusion by class

- **WHEN** implementing a service that excludes plugins
- **THEN** it uses class references via namespaced API:
```typescript
class HealthCheckService extends BaseApiService {
  constructor() {
    super();
    this.plugins.exclude(AuthPlugin, MetricsPlugin); // Type-safe, by class
  }
}

// Later - verify exclusion
healthService.plugins.getExcluded(); // [AuthPlugin, MetricsPlugin]
```

### Scenario: Plugin retrieval by class

- **WHEN** retrieving plugins by class reference
- **THEN** use getPlugin() method:
```typescript
// From global plugins
const authPlugin = apiRegistry.plugins.getPlugin(AuthPlugin);
if (authPlugin) {
  // authPlugin is typed as AuthPlugin
}

// From service (searches service first, then global)
const loggingPlugin = service.plugins.getPlugin(LoggingPlugin);
```

### Scenario: Plugin removal and check by class

- **WHEN** managing plugins dynamically
- **THEN** use class references via namespaced API:
```typescript
// Registration
apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken }));

// Check
apiRegistry.plugins.has(LoggingPlugin);  // true
apiRegistry.plugins.has(MockPlugin);     // false

// Removal - type-safe
apiRegistry.plugins.remove(LoggingPlugin);
apiRegistry.plugins.has(LoggingPlugin);  // false

// Positioning - type-safe
apiRegistry.plugins.addAfter(new MetricsPlugin(), AuthPlugin);

// Get all plugins
apiRegistry.plugins.getAll();
```

## Acceptance Criteria

### AC1: Class-based service registration works

- [ ] `apiRegistry.register(ServiceClass)` creates and stores service instance
- [ ] `apiRegistry.getService(ServiceClass)` returns correctly typed instance
- [ ] `apiRegistry.has(ServiceClass)` returns correct boolean
- [ ] `apiRegistry.registerMocks(ServiceClass, mockMap)` registers mocks
- [ ] No `getDomains()` method exists

### AC2: Global plugin registration works (namespaced API)

- [ ] `apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin(config))` registers both plugins
- [ ] Plugins execute in registration order for all services
- [ ] Duplicate plugin class throws error (global: no duplicates)

### AC3: Plugin positioning works (namespaced API)

- [ ] `plugins.addAfter(new MetricsPlugin(), LoggingPlugin)` positions correctly
- [ ] `plugins.addBefore(new ErrorHandler(), AuthPlugin)` positions correctly
- [ ] Invalid class reference throws error
- [ ] Circular dependencies throw error

### AC4: Plugin removal and retrieval works (namespaced API)

- [ ] `plugins.remove(MockPlugin)` removes the plugin (type-safe)
- [ ] Removed plugin's `destroy()` is called
- [ ] `plugins.has(MockPlugin)` returns false after removal
- [ ] `plugins.getPlugin(MockPlugin)` returns instance or undefined
- [ ] Error thrown if removing plugin not registered

### AC5: Service exclusion works (namespaced API)

- [ ] `service.plugins.exclude(AuthPlugin, MetricsPlugin)` excludes by class
- [ ] Excluded plugin classes do not execute for that service
- [ ] Other services are not affected
- [ ] `plugins.getExcluded()` returns correct classes
- [ ] Service-level duplicates are allowed

### AC6: Short-circuit works

- [ ] Returning `{ shortCircuit: response }` skips HTTP request
- [ ] `onResponse` hooks still execute with short-circuited response
- [ ] Short-circuit is detectable (e.g., via header)

### AC7: Error recovery works

- [ ] `onError` returning `Error` continues error flow
- [ ] `onError` returning `ApiResponseContext` recovers
- [ ] Re-throwing error signals retry intent

### AC8: OCP-compliant DI works (pure request data)

- [ ] Plugins receive service-specific behavior via config
- [ ] `ApiRequestContext` has only pure request data (method, url, headers, body)
- [ ] `ApiRequestContext` does NOT have `serviceName`
- [ ] Service-level plugins enable per-service configuration

### AC9: Types are exported

- [ ] `ApiPluginBase` abstract class is importable (non-generic)
- [ ] `ApiPlugin` abstract class is importable (with parameter property)
- [ ] `PluginClass` type is importable
- [ ] `ApiRequestContext` is importable (pure request data)
- [ ] `ApiResponseContext` is importable
- [ ] `ShortCircuitResponse` is importable
- [ ] `isShortCircuit` function is importable

### AC10: Tree-shaking compliance

- [ ] No static properties on plugin classes
- [ ] Unused plugins can be tree-shaken
- [ ] Package.json has `"sideEffects": false`

### AC11: Duplicate policy enforced

- [ ] Global plugins: duplicate class throws error
- [ ] Service plugins: duplicate class allowed (different configs)

### AC12: Internal global plugins injection works

- [ ] `_setGlobalPluginsProvider()` is called on service registration
- [ ] Services access global plugins via provider
- [ ] Derived classes don't need to know about this mechanism

### AC13: getPlugin() method works

- [ ] `apiRegistry.plugins.getPlugin(PluginClass)` returns instance or undefined
- [ ] `service.plugins.getPlugin(PluginClass)` searches service then global
- [ ] Return type is correctly inferred

### Requirement: Mock Map Self-Registration (Vertical Slice Architecture)

The system SHALL support mock map self-registration by services to maintain vertical slice architecture compliance. This ensures App layer does not need to know about service-specific mocks.

#### Scenario: Service registers its own mock map

- **WHEN** a service needs mock support
- **THEN** the service registers its own mock map during construction or initialization
- **AND** the mock map is registered with the service's RestProtocol instance
- **AND** App layer does NOT import or pass mock maps
- **AND** StudioOverlay only toggles mock mode ON/OFF (no mockConfig prop)

#### Scenario: RestMockPlugin uses pre-registered mock maps

- **WHEN** mock mode is enabled via Studio toggle
- **THEN** RestMockPlugin uses mock maps already registered by services
- **AND** no external mock map configuration is needed at toggle time
- **AND** each service's mock map remains encapsulated within that service

#### Scenario: StudioOverlay has no mockConfig prop

- **WHEN** StudioOverlay is rendered
- **THEN** it does NOT accept a `mockConfig` prop
- **AND** ApiModeToggle creates RestMockPlugin without external mock map
- **AND** mock mode toggle only enables/disables existing service mocks

#### Scenario: App.tsx does not import service mocks

- **WHEN** App.tsx renders
- **THEN** it does NOT import any mock maps from services
- **AND** it does NOT pass mock configuration to StudioOverlay
- **AND** mock configuration is fully encapsulated in services/screensets

### AC14: Mock Self-Registration works

- [ ] Services can register their own mock maps via RestProtocol
- [ ] StudioOverlay does NOT have mockConfig prop
- [ ] ApiModeToggle creates RestMockPlugin without external mock map
- [ ] App.tsx does NOT import service mock maps
- [ ] Mock mode toggle uses pre-registered service mocks
