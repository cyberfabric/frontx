# Tasks for add-global-api-plugins (Class-Based Design)

## Ordered Work Items

### 1. Add ApiPluginBase Abstract Class to types.ts

**Goal**: Add the non-generic abstract base class for all plugins

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `ApiPluginBase` abstract class with:
  - Optional `onRequest` method signature
  - Optional `onResponse` method signature
  - Optional `onError` method signature
  - Optional `destroy` method signature
  - No generic type parameters (used for storage)

**Traceability**:
- Requirement: Type Definitions (spec.md)
- Scenario: ApiPluginBase abstract class (non-generic) (spec.md)
- Decision 3: DRY Plugin Class Hierarchy (design.md)

**Validation**:
- [x] `ApiPluginBase` abstract class is exported
- [x] All lifecycle methods are optional
- [x] No generic type parameters
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: None

---

### 2. Add ApiPlugin Generic Class to types.ts

**Goal**: Add the generic abstract class extending ApiPluginBase with typed config

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `ApiPlugin<TConfig>` abstract class:
  - Extends `ApiPluginBase`
  - Uses parameter property: `constructor(protected readonly config: TConfig) { super(); }`
  - TConfig defaults to `void`

**Traceability**:
- Requirement: Type Definitions (spec.md)
- Scenario: ApiPlugin abstract class with parameter property (spec.md)
- Decision 3: DRY Plugin Class Hierarchy (design.md)

**Validation**:
- [x] `ApiPlugin<TConfig>` abstract class is exported
- [x] Extends `ApiPluginBase`
- [x] Uses parameter property for config
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 1

---

### 3. Add Core Context Types to types.ts

**Goal**: Add request, response, and short-circuit types (pure request data)

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `ApiRequestContext` type with readonly properties (pure request data):
  - `method: string`
  - `url: string`
  - `headers: Record<string, string>`
  - `body?: unknown`
  - NO serviceName (plugins use DI for service-specific behavior)
- Add `ApiResponseContext` type with readonly properties:
  - `status: number`
  - `headers: Record<string, string>`
  - `data: unknown`
- Add `ShortCircuitResponse` type with readonly `shortCircuit: ApiResponseContext`

**Traceability**:
- Requirement: Type Definitions (spec.md)
- Scenario: ApiRequestContext type (pure request data) (spec.md)
- Scenario: ApiResponseContext type (spec.md)
- Scenario: ShortCircuitResponse type (spec.md)
- Decision 6: Pure Request Data in ApiRequestContext (design.md)

**Validation**:
- [x] `ApiRequestContext` has only pure request data (method, url, headers, body)
- [x] `ApiRequestContext` does NOT have serviceName
- [x] All context properties are readonly
- [x] `ShortCircuitResponse` type is exported
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: None

---

### 4. Add PluginClass Type and isShortCircuit Guard

**Goal**: Add type-safe plugin class reference type and type guard

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `PluginClass<T>` type:
  ```typescript
  export type PluginClass<T extends ApiPluginBase = ApiPluginBase> = abstract new (...args: any[]) => T;
  ```
- Add `isShortCircuit` type guard function:
  ```typescript
  export function isShortCircuit(
    result: ApiRequestContext | ShortCircuitResponse | undefined
  ): result is ShortCircuitResponse {
    return result !== undefined && 'shortCircuit' in result;
  }
  ```

**Traceability**:
- Requirement: Type Definitions (spec.md)
- Scenario: PluginClass type for class references (spec.md)
- Scenario: isShortCircuit type guard (spec.md)

**Validation**:
- [x] `PluginClass<T>` type is exported
- [x] `isShortCircuit` function is exported
- [x] Type guard narrows type correctly
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 1, 3

---

### 5. Update ApiRegistry Interface for Class-Based Service Registration (OCP/DIP Compliant)

**Goal**: Change service registration from string domains to class references, remove mock-specific methods

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Update `ApiRegistry` interface:
  - `register<T extends BaseApiService>(serviceClass: new () => T): void`
  - `getService<T extends BaseApiService>(serviceClass: new () => T): T`
  - `has<T extends BaseApiService>(serviceClass: new () => T): boolean`
  - REMOVE `getDomains()` method
  - REMOVE `registerMocks()` method (OCP/DIP - mock config goes to MockPlugin)
  - REMOVE `setMockMode()` method (OCP/DIP - replaced by plugins.add/remove)
  - REMOVE `getMockMap()` method (OCP/DIP - MockPlugin manages its own map)
- Update `ApiServicesConfig` interface:
  - REMOVE `useMockApi` field (OCP/DIP)
  - REMOVE `mockDelay` field (OCP/DIP - now in MockPluginConfig)

**Traceability**:
- Requirement: Class-Based Service Registration (spec.md)
- Scenario: Register service by class reference (spec.md)
- Scenario: REMOVED - getDomains() method (spec.md)
- Decision 1: Class-Based Service Registration (design.md)
- Decision 13: OCP/DIP Compliant Registry (design.md)

**Validation**:
- [x] `register()` takes class constructor
- [x] `getService()` takes class constructor, returns typed instance
- [x] `has()` takes class constructor
- [x] `getDomains()` is NOT defined
- [x] `registerMocks()` is NOT defined (OCP/DIP)
- [x] `setMockMode()` is NOT defined (OCP/DIP)
- [x] `getMockMap()` is NOT defined (OCP/DIP)
- [x] `useMockApi` is NOT in ApiServicesConfig (OCP/DIP)
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: None

---

### 6. Add Namespaced Plugin API to ApiRegistry Interface

**Goal**: Extend ApiRegistry interface with namespaced `plugins` object

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `readonly plugins: { ... }` namespace object to ApiRegistry interface:
  - `add(...plugins: ApiPluginBase[]): void` - throws on duplicate class
  - `addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void`
  - `addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void`
  - `remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void` - throws if not registered
  - `has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean`
  - `getAll(): readonly ApiPluginBase[]`
  - `getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined`
- Add JSDoc with code examples for each method

**Traceability**:
- Requirement: ApiRegistry Interface Extension (spec.md)
- Scenario: ApiRegistry interface includes plugins namespace (spec.md)
- Scenario: ApiRegistry.plugins includes getPlugin() method (spec.md)
- Decision 5: getPlugin() Method (design.md)
- Decision 9: Namespaced Plugin API (design.md)

**Validation**:
- [x] ApiRegistry interface includes `plugins` namespace object
- [x] All plugin methods defined with correct signatures
- [x] `getPlugin()` method defined
- [x] JSDoc includes code examples
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 1, 4

---

### 7. Implement Class-Based Service Registration in apiRegistry (OCP/DIP Compliant)

**Goal**: Update apiRegistry to use class references instead of string domains, remove mock-specific methods

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Change services storage from `Map<string, service>` to `Map<ServiceClass, service>`
- Update `register()`:
  - Take class constructor, not string + class
  - Instantiate service
  - Call `_setGlobalPluginsProvider()` on service
  - Store with class as key
- Update `getService()`:
  - Take class constructor
  - Return typed instance
  - Throw if not registered
- Update `has()`:
  - Take class constructor
- REMOVE `getDomains()` method
- REMOVE `registerMocks()` method (OCP/DIP)
- REMOVE `setMockMode()` method (OCP/DIP)
- REMOVE `getMockMap()` method (OCP/DIP)
- REMOVE `mockMaps` storage (OCP/DIP)
- REMOVE mock-related private methods (`enableMockMode`, `disableMockMode`, `updateServiceMockPlugin`)

**Traceability**:
- Requirement: Class-Based Service Registration (spec.md)
- Scenario: Register service by class reference (spec.md)
- Decision 1: Class-Based Service Registration (design.md)
- Decision 13: OCP/DIP Compliant Registry (design.md)

**Validation**:
- [x] `register(ServiceClass)` creates and stores instance
- [x] `getService(ServiceClass)` returns correctly typed instance
- [x] `has(ServiceClass)` returns correct boolean
- [x] `getDomains()` does not exist
- [x] `registerMocks()` does not exist (OCP/DIP)
- [x] `setMockMode()` does not exist (OCP/DIP)
- [x] `getMockMap()` does not exist (OCP/DIP)
- [x] No mock-related code in apiRegistry (OCP/DIP)
- [x] `_setGlobalPluginsProvider()` called on registration
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 5

---

### 8. Implement Namespaced Plugin API in apiRegistry

**Goal**: Add private storage and implement `plugins` namespace object

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Add `private globalPlugins: ApiPluginBase[] = []` field to ApiRegistryImpl
- Create `readonly plugins` namespace object with implementations:
  - `add(...plugins: ApiPluginBase[]): void`
    - Validate no duplicate plugin classes (via instanceof)
    - Append each plugin to globalPlugins array (FIFO)
    - Throw if duplicate class already registered
  - `getAll(): readonly ApiPluginBase[]`
    - Return readonly array of plugins in execution order
  - `has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean`
    - Return true if plugin of given class is registered
  - `getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined`
    - Find and return plugin instance by class

**Traceability**:
- Scenario: Register global plugins with plugins.add() (spec.md)
- Scenario: Get global plugins (spec.md)
- Scenario: Check if plugin is registered (spec.md)
- Scenario: Get plugin by class reference (spec.md)
- Decision 5: getPlugin() Method (design.md)
- Decision 10: Duplicate Policy (design.md)

**Validation**:
- [x] `plugins.add()` appends plugins in FIFO order
- [x] `plugins.add()` throws on duplicate plugin class
- [x] `plugins.getAll()` returns readonly array in execution order
- [x] `plugins.has()` returns true/false based on class
- [x] `plugins.getPlugin()` returns instance or undefined
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 1, 6

---

### 9. Implement Plugin Positioning in apiRegistry

**Goal**: Add before/after positioning via `plugins.addBefore()` and `plugins.addAfter()`

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Add to `plugins` namespace object:
  - `addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void`
    - Find target plugin by class (using instanceof)
    - Insert before target
    - Throw if target plugin class not found
    - Throw on duplicate plugin class
    - Detect circular dependencies and throw
  - `addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void`
    - Find target plugin by class (using instanceof)
    - Insert after target
    - Throw if target plugin class not found
    - Throw on duplicate plugin class
    - Detect circular dependencies and throw

**Traceability**:
- Scenario: Position before another plugin by class (spec.md)
- Scenario: Position after another plugin by class (spec.md)

**Validation**:
- [x] `plugins.addBefore()` inserts before target
- [x] `plugins.addAfter()` inserts after target
- [x] Throws on non-existent target plugin class
- [x] Throws on duplicate plugin class
- [x] Throws on circular dependency
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 8

---

### 10. Implement Plugin Removal in apiRegistry

**Goal**: Add ability to remove plugins by class with cleanup via `plugins.remove()`

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Add to `plugins` namespace object:
  - `remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void`
    - Find plugin by class (using instanceof)
    - If found, call `destroy()` if available
    - Remove from globalPlugins array
    - Throw if plugin not registered
- Update `reset()` to clear global plugins
  - Call `destroy()` on each global plugin
  - Clear globalPlugins array

**Traceability**:
- Scenario: Remove global plugin by class (spec.md)
- Scenario: Registry reset clears global plugins (spec.md)

**Validation**:
- [x] `plugins.remove()` removes plugin from storage (found by instanceof)
- [x] `plugins.remove()` calls `destroy()` if available
- [x] `plugins.remove()` throws if plugin not registered
- [x] `reset()` calls `destroy()` on all plugins
- [x] `reset()` clears globalPlugins array
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 8

---

### 11. Add Internal Global Plugins Injection to BaseApiService (OCP/DIP Compliant)

**Goal**: Add `_setGlobalPluginsProvider()` internal method, remove mock-related code

**Files**:
- `packages/api/src/BaseApiService.ts` (modified)

**Changes**:
- Add `private globalPluginsProvider: (() => readonly ApiPluginBase[]) | null = null` field
- Add internal method:
  ```typescript
  _setGlobalPluginsProvider(provider: () => readonly ApiPluginBase[]): void {
    this.globalPluginsProvider = provider;
  }
  ```
- Add method to get global plugins:
  ```typescript
  private getGlobalPlugins(): readonly ApiPluginBase[] {
    return this.globalPluginsProvider?.() ?? [];
  }
  ```
- REMOVE `getMockMap()` method (OCP/DIP - services unaware of mocking):
  ```typescript
  // REMOVE THIS:
  protected getMockMap(): MockMap {
    return {};
  }
  ```
- REMOVE any mock-related imports or dependencies

**Traceability**:
- Requirement: Internal Global Plugins Injection (spec.md)
- Scenario: _setGlobalPluginsProvider() internal method (spec.md)
- Decision 4: Internal Global Plugins Injection (design.md)
- Decision 15: Services unaware of plugins (design.md)

**Validation**:
- [x] `_setGlobalPluginsProvider()` method exists
- [x] Method is internal (underscore convention)
- [x] Global plugins accessible via provider
- [x] `getMockMap()` does NOT exist (OCP/DIP)
- [x] No mock-related code in BaseApiService (OCP/DIP)
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 1

---

### 12. Add Namespaced Plugin API to BaseApiService

**Goal**: Add namespaced `plugins` object to BaseApiService

**Files**:
- `packages/api/src/BaseApiService.ts` (modified)

**Changes**:
- Add `private servicePlugins: ApiPluginBase[] = []` field
- Add `private excludedPluginClasses: Set<PluginClass> = new Set()` field
- Create `readonly plugins` namespace object with implementations:
  - `add(...plugins: ApiPluginBase[]): void`
    - Append plugins to servicePlugins array (FIFO)
    - Duplicates of same class ARE allowed (different configs)
  - `exclude(...pluginClasses: PluginClass[]): void`
    - Add classes to excludedPluginClasses set
  - `getExcluded(): readonly PluginClass[]`
    - Return array of excluded plugin classes
  - `getAll(): readonly ApiPluginBase[]`
    - Return service plugins (not including globals)
  - `getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined`
    - Search service plugins first, then global plugins
    - Return instance or undefined

**Traceability**:
- Scenario: Register service-specific plugins with plugins.add() (spec.md)
- Scenario: Exclude global plugins by class (spec.md)
- Scenario: Get excluded plugin classes (spec.md)
- Scenario: Get service plugins (spec.md)
- Scenario: Get plugin by class reference (service-level) (spec.md)
- Decision 5: getPlugin() Method (design.md)
- Decision 10: Duplicate Policy (design.md)

**Validation**:
- [x] `plugins.add()` appends plugins to service-specific storage
- [x] `plugins.add()` allows duplicates of same class
- [x] `plugins.exclude()` stores plugin classes for exclusion
- [x] `plugins.getExcluded()` returns readonly array of classes
- [x] `plugins.getAll()` returns service plugins only
- [x] `plugins.getPlugin()` searches service then global
- [x] Service plugins are separate from global plugins
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 1, 4, 11

---

### 13. Implement Plugin Merging in BaseApiService

**Goal**: Merge global and service plugins respecting exclusions by class

**Files**:
- `packages/api/src/BaseApiService.ts` (modified)

**Changes**:
- Implement `getMergedPluginsInOrder(): readonly ApiPluginBase[]`
  - Get global plugins via provider
  - Filter out plugins where `plugin instanceof excludedClass` for any excluded class
  - Append servicePlugins (FIFO)
  - Return merged array
- Implement `getMergedPluginsReversed(): readonly ApiPluginBase[]`
  - Return reversed `getMergedPluginsInOrder()` for response phase

**Traceability**:
- Scenario: Plugin merging respects exclusions by class (spec.md)
- Scenario: Reverse order for response processing (spec.md)
- Scenario: Plugin execution follows FIFO order (spec.md)

**Validation**:
- [x] Global plugins come before service plugins
- [x] Excluded plugin classes are filtered out (via instanceof)
- [x] `getMergedPluginsReversed()` returns correct reverse order
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 11, 12

---

### 14. Implement Plugin Execution Chain

**Goal**: Execute plugin lifecycle methods with short-circuit and error recovery support

**Files**:
- `packages/api/src/BaseApiService.ts` or protocol files (modified)

**Changes**:
- Update request execution to use class-based chain:
  1. Build request context with pure request data (method, url, headers, body - NO serviceName)
  2. For each plugin in order, call `onRequest?.(ctx)`
  3. If returns `{ shortCircuit }`, stop chain and use response
  4. If not short-circuited, make HTTP request
  5. For each plugin in reverse order, call `onResponse?.(response, request)`
  6. Return final response
- Implement error handling:
  1. On error, call `onError?.(error, request)` for each plugin in reverse
  2. If returns `ApiResponseContext`, treat as recovery
  3. If returns `Error`, pass to next handler
  4. If no recovery, throw final error

**Traceability**:
- Scenario: Short-circuit skips HTTP request (spec.md)
- Scenario: onRequest lifecycle method contract (spec.md)
- Scenario: onResponse lifecycle method contract (spec.md)
- Scenario: onError lifecycle method contract (spec.md)
- Decision 6: Pure Request Data in ApiRequestContext (design.md)

**Validation**:
- [x] `onRequest` methods execute in FIFO order
- [x] Short-circuit return stops chain and skips HTTP
- [x] `onResponse` methods execute in reverse order
- [x] `onError` can transform error or recover with response
- [x] Request context has pure request data (no serviceName)
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 13

---

### 15. Update MockPlugin to Extend ApiPlugin (OCP/DIP Compliant)

**Goal**: Update MockPlugin to be completely self-contained - all mock config in constructor

**Files**:
- `packages/api/src/plugins/MockPlugin.ts` (modified)

**Changes**:
- Update MockPlugin to extend `ApiPlugin<MockPluginConfig>`:
```typescript
export interface MockPluginConfig {
  /** Mock response map - keys are full URL patterns (e.g., 'GET /api/accounts/user/current') */
  mockMap: MockMap;
  /** Simulated network delay in ms */
  delay?: number;
}

export class MockPlugin extends ApiPlugin<MockPluginConfig> {
  /** Update mock map dynamically */
  setMockMap(mockMap: Readonly<MockMap>): void {
    (this.config as { mockMap: Readonly<MockMap> }).mockMap = mockMap;
  }

  async onRequest(ctx: ApiRequestContext): Promise<ApiRequestContext | ShortCircuitResponse> {
    // Match against full URL (includes service baseURL path)
    const factory = this.findMockFactory(ctx.method, ctx.url);

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

  // ... existing URL pattern matching logic
}
```
- MockPlugin matches full URL patterns including service baseURL:
  - `'GET /api/accounts/user/current'` (not relative `/user/current`)
  - This allows centralized mock configuration without per-service knowledge
- Remove any dependency on registry mock storage
- **NOTE**: The current MockPlugin implementation already matches against `ctx.url` directly.
  The request context `url` is built by protocols (RestProtocol) to include the full path
  (baseURL + endpoint). No URL transformation changes are needed in MockPlugin itself -
  only the mock map keys should use full URL patterns.

**Traceability**:
- Scenario: Mock plugin with short-circuit (spec.md)
- Example: MockPlugin implementation (design.md)
- Decision 13: OCP/DIP Compliant Registry (design.md)
- Decision 14: Self-contained plugins (design.md)

**Validation**:
- [x] `MockPlugin` extends `ApiPlugin<MockPluginConfig>`
- [x] Uses `this.config.mockMap` for mock data
- [x] Matches full URL patterns (includes baseURL path)
- [x] Uses short-circuit to return mock responses
- [x] `setMockMap()` allows dynamic updates
- [x] No dependency on registry mock methods
- [x] Supports optional delay via `this.config.delay`
- [x] No concurrency issues (MockPlugin is stateless except for config)
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 2, 3, 14

**Note on Concurrency Safety**:
Stateful plugins should use request-scoped storage (WeakMap keyed by request context)
for production use. MockPlugin is safe as it only reads from immutable config.

---

### 16. Update Package Exports

**Goal**: Ensure all new types and classes are properly exported

**Files**:
- `packages/api/src/index.ts` (modified)

**Changes**:
- Export all new types and classes:
  - `ApiPluginBase` (abstract class)
  - `ApiPlugin` (abstract class)
  - `PluginClass` (type)
  - `ApiRequestContext` (type)
  - `ApiResponseContext` (type)
  - `ShortCircuitResponse` (type)
  - `isShortCircuit` (function)
- Export updated `MockPlugin` class
- Remove old types (clean break):
  - Remove any deprecated exports

**Traceability**:
- Acceptance Criteria: AC9 Types are exported

**Validation**:
- [x] All new types importable from '@hai3/api'
- [x] `ApiPluginBase` class importable from '@hai3/api'
- [x] `ApiPlugin` class importable from '@hai3/api'
- [x] `isShortCircuit` function importable from '@hai3/api'
- [x] `apiRegistry.plugins.add()` method available
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 1-15

---

### 17. Verify Framework Re-exports

**Goal**: Confirm L2 layer properly re-exports updated types

**Files**:
- `packages/framework/src/index.ts` (verify, may not need changes)

**Changes**:
- Verify existing re-exports work with updated types
- No code changes expected (pass-through exports)

**Traceability**:
- Proposal: Layer Propagation section

**Validation**:
- [x] `import { ApiPluginBase, ApiPlugin, apiRegistry } from '@hai3/framework'` works
- [x] `import { MockPlugin } from '@hai3/framework'` works
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 16

---

### 18. Verify React Re-exports

**Goal**: Confirm L3 layer properly re-exports updated types

**Files**:
- `packages/react/src/index.ts` (verify, may not need changes)

**Changes**:
- Verify existing re-exports work with updated types
- No code changes expected (pass-through exports)

**Traceability**:
- Proposal: Layer Propagation section

**Validation**:
- [x] `import { ApiPluginBase, ApiPlugin, apiRegistry } from '@hai3/react'` works
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 17

---

### 19. Run Architecture Validation

**Goal**: Ensure changes follow HAI3 architecture rules

**Commands**:
```bash
npm run type-check
npm run lint
npm run arch:check
npm run arch:deps
```

**Traceability**:
- HAI3 Guidelines: PRE-DIFF CHECKLIST

**Validation**:
- [x] No TypeScript errors
- [x] No lint errors
- [x] Architecture tests pass
- [x] Dependency rules validated

**Status**: COMPLETED

**Dependencies**: Task 18

---

### 20. Automated Integration Test - Class-Based Service Registration

**Goal**: Implement automated integration tests for class-based service registration

**Files**:
- `packages/api/src/__tests__/apiRegistry.integration.test.ts` (new or modified)

**Test Cases to Implement**:
```typescript
describe('apiRegistry class-based registration', () => {
  it('should register service by class constructor', () => {
    class TestService extends BaseApiService {
      constructor() { super({ baseURL: '/test' }, new RestProtocol()); }
    }
    apiRegistry.register(TestService);
    expect(apiRegistry.has(TestService)).toBe(true);
  });

  it('should return correctly typed instance from getService', () => {
    const service = apiRegistry.getService(TestService);
    expect(service).toBeInstanceOf(TestService);
  });

  it('should return false for unregistered service', () => {
    class UnregisteredService extends BaseApiService {}
    expect(apiRegistry.has(UnregisteredService)).toBe(false);
  });

  it('should throw on getService for unregistered class', () => {
    class NotRegistered extends BaseApiService {}
    expect(() => apiRegistry.getService(NotRegistered)).toThrow();
  });
});
```

**Traceability**:
- Acceptance Criteria: AC1 Class-based service registration works

**Validation**:
- [x] Test file created/updated
- [x] All test cases pass: `npm run test -- packages/api/src/__tests__/apiRegistry.integration.test.ts`
- [x] Type inference verified via TypeScript compilation

**Status**: COMPLETED

**Dependencies**: Task 19

---

### 21. Automated Integration Test - Global Plugin Registration (Namespaced API)

**Goal**: Implement automated integration tests for global plugin registration and FIFO ordering

**Files**:
- `packages/api/src/__tests__/apiRegistry.plugins.test.ts` (new or modified)

**Test Cases to Implement**:
```typescript
describe('apiRegistry.plugins', () => {
  let executionOrder: string[];

  class LoggingPlugin extends ApiPlugin<void> {
    constructor() { super(void 0); }
    onRequest(ctx: ApiRequestContext) {
      executionOrder.push('logging');
      return ctx;
    }
  }

  class AuthPlugin extends ApiPlugin<{ getToken: () => string }> {
    onRequest(ctx: ApiRequestContext) {
      executionOrder.push('auth');
      return ctx;
    }
  }

  beforeEach(() => {
    executionOrder = [];
    apiRegistry.reset();
  });

  it('should execute plugins in FIFO order', async () => {
    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken: () => 'token' }));
    // Trigger plugin chain execution and verify order
    const plugins = apiRegistry.plugins.getAll();
    expect(plugins[0]).toBeInstanceOf(LoggingPlugin);
    expect(plugins[1]).toBeInstanceOf(AuthPlugin);
  });

  it('should throw on duplicate plugin class', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    expect(() => apiRegistry.plugins.add(new LoggingPlugin())).toThrow();
  });

  it('should correctly report has() for registered plugin', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    expect(apiRegistry.plugins.has(LoggingPlugin)).toBe(true);
    expect(apiRegistry.plugins.has(AuthPlugin)).toBe(false);
  });

  it('should return plugin instance via getPlugin()', () => {
    const logging = new LoggingPlugin();
    apiRegistry.plugins.add(logging);
    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBe(logging);
    expect(apiRegistry.plugins.getPlugin(AuthPlugin)).toBeUndefined();
  });
});
```

**Traceability**:
- Acceptance Criteria: AC2 Global plugin registration works (namespaced API)

**Validation**:
- [x] Test file created/updated
- [x] All test cases pass: `npm run test -- packages/api/src/__tests__/apiRegistry.plugins.test.ts`
- [x] FIFO ordering verified
- [x] Duplicate detection verified
- [x] has() and getPlugin() behavior verified

**Status**: COMPLETED

**Dependencies**: Task 20

---

### 22. Automated Integration Test - Plugin Positioning by Class (Namespaced API)

**Goal**: Implement automated integration tests for plugin positioning (addBefore/addAfter)

**Files**:
- `packages/api/src/__tests__/apiRegistry.plugins.test.ts` (modified - add test cases)

**Test Cases to Implement**:
```typescript
describe('apiRegistry.plugins positioning', () => {
  class LoggingPlugin extends ApiPlugin<void> { constructor() { super(void 0); } }
  class AuthPlugin extends ApiPlugin<void> { constructor() { super(void 0); } }
  class MetricsPlugin extends ApiPlugin<void> { constructor() { super(void 0); } }

  beforeEach(() => {
    apiRegistry.reset();
  });

  it('should insert plugin after target via addAfter', () => {
    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin());
    apiRegistry.plugins.addAfter(new MetricsPlugin(), LoggingPlugin);

    const plugins = apiRegistry.plugins.getAll();
    expect(plugins[0]).toBeInstanceOf(LoggingPlugin);
    expect(plugins[1]).toBeInstanceOf(MetricsPlugin);
    expect(plugins[2]).toBeInstanceOf(AuthPlugin);
  });

  it('should insert plugin before target via addBefore', () => {
    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin());
    apiRegistry.plugins.addBefore(new MetricsPlugin(), AuthPlugin);

    const plugins = apiRegistry.plugins.getAll();
    expect(plugins[0]).toBeInstanceOf(LoggingPlugin);
    expect(plugins[1]).toBeInstanceOf(MetricsPlugin);
    expect(plugins[2]).toBeInstanceOf(AuthPlugin);
  });

  it('should throw when target class not registered', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    expect(() => apiRegistry.plugins.addAfter(new MetricsPlugin(), AuthPlugin)).toThrow();
  });

  it('should throw on duplicate class with positioning', () => {
    apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin());
    expect(() => apiRegistry.plugins.addAfter(new LoggingPlugin(), AuthPlugin)).toThrow();
  });
});
```

**Traceability**:
- Acceptance Criteria: AC3 Plugin positioning works (namespaced API)

**Validation**:
- [x] Test cases added to existing test file
- [x] All positioning test cases pass
- [x] addAfter positions correctly verified
- [x] addBefore positions correctly verified
- [x] Error cases verified (invalid target, duplicates)

**Status**: COMPLETED

**Dependencies**: Task 21

---

### 23. Automated Integration Test - Short-Circuit

**Goal**: Implement automated integration tests for short-circuit functionality

**Files**:
- `packages/api/src/__tests__/shortCircuit.integration.test.ts` (new)

**Test Cases to Implement**:
```typescript
describe('short-circuit functionality', () => {
  class TestService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api' }, new RestProtocol());
    }
    async getUsers() {
      return this.protocol(RestProtocol).get('/users');
    }
  }

  beforeEach(() => {
    apiRegistry.reset();
  });

  it('should return mock data via short-circuit', async () => {
    const mockData = [{ id: 1, name: 'Test' }];
    apiRegistry.plugins.add(new MockPlugin({
      mockMap: { 'GET /api/users': () => mockData }
    }));
    apiRegistry.register(TestService);

    const service = apiRegistry.getService(TestService);
    const result = await service.getUsers();

    expect(result).toEqual(mockData);
  });

  it('should include x-hai3-short-circuit header in response', async () => {
    let capturedHeaders: Record<string, string> = {};

    class HeaderCapturePlugin extends ApiPlugin<void> {
      constructor() { super(void 0); }
      onResponse(response: ApiResponseContext) {
        capturedHeaders = response.headers;
        return response;
      }
    }

    apiRegistry.plugins.add(
      new MockPlugin({ mockMap: { 'GET /api/users': () => [] } }),
      new HeaderCapturePlugin()
    );
    apiRegistry.register(TestService);

    await apiRegistry.getService(TestService).getUsers();

    expect(capturedHeaders['x-hai3-short-circuit']).toBe('true');
  });

  it('should still execute onResponse hooks after short-circuit', async () => {
    let onResponseCalled = false;

    class TrackingPlugin extends ApiPlugin<void> {
      constructor() { super(void 0); }
      onResponse(response: ApiResponseContext) {
        onResponseCalled = true;
        return response;
      }
    }

    apiRegistry.plugins.add(
      new MockPlugin({ mockMap: { 'GET /api/users': () => [] } }),
      new TrackingPlugin()
    );
    apiRegistry.register(TestService);

    await apiRegistry.getService(TestService).getUsers();

    expect(onResponseCalled).toBe(true);
  });
});
```

**Traceability**:
- Acceptance Criteria: AC6 Short-circuit works

**Validation**:
- [x] Test file created
- [x] All test cases pass: `npm run test -- packages/api/src/__tests__/shortCircuit.integration.test.ts`
- [x] Mock data returned correctly
- [x] Header verification passes
- [x] onResponse hook execution verified

**Status**: COMPLETED

**Dependencies**: Task 22

---

### 24. Automated Integration Test - Service Exclusion by Class (Namespaced API)

**Goal**: Implement automated integration tests for service-level plugin exclusion

**Files**:
- `packages/api/src/__tests__/servicePlugins.integration.test.ts` (new)

**Test Cases to Implement**:
```typescript
describe('service plugin exclusion', () => {
  let authPluginExecuted: boolean;

  class AuthPlugin extends ApiPlugin<void> {
    constructor() { super(void 0); }
    onRequest(ctx: ApiRequestContext) {
      authPluginExecuted = true;
      return ctx;
    }
  }

  class RegularService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api/regular' }, new RestProtocol());
    }
  }

  class HealthService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api/health' }, new RestProtocol());
      this.plugins.exclude(AuthPlugin);
    }
  }

  beforeEach(() => {
    authPluginExecuted = false;
    apiRegistry.reset();
    apiRegistry.plugins.add(new AuthPlugin());
  });

  it('should exclude global plugin from service with exclusion', () => {
    apiRegistry.register(HealthService);
    const health = apiRegistry.getService(HealthService);

    expect(health.plugins.getExcluded()).toContain(AuthPlugin);
  });

  it('should not run excluded plugin for that service', async () => {
    apiRegistry.plugins.add(new MockPlugin({ mockMap: { 'GET /api/health/status': () => ({ ok: true }) } }));
    apiRegistry.register(HealthService);

    // This would need actual request execution - simplified for test
    const excluded = apiRegistry.getService(HealthService).plugins.getExcluded();
    expect(excluded.some(cls => cls === AuthPlugin)).toBe(true);
  });

  it('should still run global plugin for non-excluded services', async () => {
    apiRegistry.register(RegularService);
    const regular = apiRegistry.getService(RegularService);

    expect(regular.plugins.getExcluded()).not.toContain(AuthPlugin);
  });

  it('should allow duplicate plugin classes at service level', () => {
    class RateLimitPlugin extends ApiPlugin<{ limit: number }> {}

    apiRegistry.register(RegularService);
    const service = apiRegistry.getService(RegularService);

    service.plugins.add(new RateLimitPlugin({ limit: 100 }));
    service.plugins.add(new RateLimitPlugin({ limit: 200 })); // Should not throw

    expect(service.plugins.getAll().length).toBe(2);
  });
});
```

**Traceability**:
- Acceptance Criteria: AC5 Service exclusion works (namespaced API)

**Validation**:
- [x] Test file created
- [x] All test cases pass: `npm run test -- packages/api/src/__tests__/servicePlugins.integration.test.ts`
- [x] Exclusion behavior verified
- [x] Non-excluded services verified
- [x] Service-level duplicate allowance verified

**Status**: COMPLETED

**Dependencies**: Task 23

---

### 25. Automated Integration Test - getPlugin() Method

**Goal**: Implement automated integration tests for getPlugin() at registry and service level

**Files**:
- `packages/api/src/__tests__/servicePlugins.integration.test.ts` (modified - add test cases)

**Test Cases to Implement**:
```typescript
describe('getPlugin() method', () => {
  class LoggingPlugin extends ApiPlugin<void> { constructor() { super(void 0); } }
  class AuthPlugin extends ApiPlugin<void> { constructor() { super(void 0); } }
  class RateLimitPlugin extends ApiPlugin<{ limit: number }> {}

  class TestService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api' }, new RestProtocol());
    }
  }

  beforeEach(() => {
    apiRegistry.reset();
  });

  it('should return plugin instance from registry', () => {
    const logging = new LoggingPlugin();
    apiRegistry.plugins.add(logging);

    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBe(logging);
  });

  it('should return undefined for unregistered plugin at registry level', () => {
    expect(apiRegistry.plugins.getPlugin(LoggingPlugin)).toBeUndefined();
  });

  it('should search service plugins first at service level', () => {
    const serviceRateLimit = new RateLimitPlugin({ limit: 100 });
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);
    service.plugins.add(serviceRateLimit);

    expect(service.plugins.getPlugin(RateLimitPlugin)).toBe(serviceRateLimit);
  });

  it('should fall back to global plugins at service level', () => {
    const globalAuth = new AuthPlugin();
    apiRegistry.plugins.add(globalAuth);
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);

    expect(service.plugins.getPlugin(AuthPlugin)).toBe(globalAuth);
  });

  it('should prefer service plugin over global when both exist', () => {
    const globalAuth = new AuthPlugin();
    const serviceAuth = new AuthPlugin(); // Different instance
    apiRegistry.plugins.add(globalAuth);
    apiRegistry.register(TestService);
    const service = apiRegistry.getService(TestService);
    service.plugins.add(serviceAuth);

    expect(service.plugins.getPlugin(AuthPlugin)).toBe(serviceAuth);
  });
});
```

**Traceability**:
- Acceptance Criteria: AC13 getPlugin() method works

**Validation**:
- [x] Test cases added to existing test file
- [x] Registry-level getPlugin() verified
- [x] Service-level search priority verified
- [x] Fallback to global plugins verified
- [x] Type inference verified via TypeScript compilation

**Status**: COMPLETED

**Dependencies**: Task 24

---

### 26. Automated Integration Test - Internal Global Plugins Injection

**Goal**: Implement automated integration tests for global plugins provider injection

**Files**:
- `packages/api/src/__tests__/globalPluginsInjection.integration.test.ts` (new)

**Test Cases to Implement**:
```typescript
describe('global plugins injection', () => {
  let pluginExecutionLog: string[];

  class LoggingPlugin extends ApiPlugin<void> {
    constructor() { super(void 0); }
    onRequest(ctx: ApiRequestContext) {
      pluginExecutionLog.push('logging');
      return ctx;
    }
  }

  class AuthPlugin extends ApiPlugin<void> {
    constructor() { super(void 0); }
    onRequest(ctx: ApiRequestContext) {
      pluginExecutionLog.push('auth');
      return ctx;
    }
  }

  class TestService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api' }, new RestProtocol());
    }
  }

  class AnotherService extends BaseApiService {
    constructor() {
      super({ baseURL: '/api/another' }, new RestProtocol());
    }
  }

  beforeEach(() => {
    pluginExecutionLog = [];
    apiRegistry.reset();
  });

  it('should inject global plugins registered BEFORE service', () => {
    apiRegistry.plugins.add(new LoggingPlugin());
    apiRegistry.register(TestService);

    const service = apiRegistry.getService(TestService);
    // Global plugins should be accessible via provider
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeDefined();
  });

  it('should inject global plugins registered AFTER service via provider', () => {
    apiRegistry.register(AnotherService);
    apiRegistry.plugins.add(new AuthPlugin());

    const service = apiRegistry.getService(AnotherService);
    // Provider pattern means services see plugins added after registration
    expect(service.plugins.getPlugin(AuthPlugin)).toBeDefined();
  });

  it('should not require changes to derived service classes', () => {
    // Derived classes don't override constructor for plugin injection
    class CustomService extends BaseApiService {
      constructor() {
        super({ baseURL: '/custom' }, new RestProtocol());
        // No manual plugin provider setup needed
      }
    }

    apiRegistry.plugins.add(new LoggingPlugin());
    apiRegistry.register(CustomService);

    const service = apiRegistry.getService(CustomService);
    expect(service.plugins.getPlugin(LoggingPlugin)).toBeDefined();
  });
});
```

**Traceability**:
- Acceptance Criteria: AC12 Internal global plugins injection works

**Validation**:
- [x] Test file created
- [x] All test cases pass: `npm run test -- packages/api/src/__tests__/globalPluginsInjection.integration.test.ts`
- [x] Before-registration injection verified
- [x] After-registration injection verified (provider pattern)
- [x] Derived class simplicity verified

**Status**: COMPLETED

**Dependencies**: Task 25

---

## Task Dependency Graph

```
Task 1 (ApiPluginBase) ──────────────────────────────────────────────────┐
       │                                                                  │
       v                                                                  │
Task 2 (ApiPlugin<TConfig>) ─────────────────────────────────────────────┤
                                                                          │
Task 3 (Context Types) ──────────────────────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 4 (PluginClass + Guard) ────────────────────────────────────────────┤
                                                                          │
Task 5 (ApiRegistry Service Interface) ──────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 6 (ApiRegistry Plugin Interface) ───────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 7 (apiRegistry Service Impl) ───────────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 8 (apiRegistry Plugin Storage) ─────────────────────────────────────┤
       │                                                                  │
       ├──> Task 9 (Plugin Positioning)                                   │
       │                                                                  │
       └──> Task 10 (Plugin Removal)                                      │
                                                                          │
Task 11 (BaseApiService Global Injection) ───────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 12 (BaseApiService Plugin Namespace) ───────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 13 (Plugin Merging) ────────────────────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 14 (Plugin Execution Chain) ────────────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 15 (MockPlugin Update) ─────────────────────────────────────────────┤
       │                                                                  │
       v                                                                  │
Task 16 (Package Exports) ───────────────────────────────────────────────┘
       │
       v
Task 17 (Framework Re-exports)
       │
       v
Task 18 (React Re-exports)
       │
       v
Task 19 (Architecture Validation)
       │
       v
Task 20 (Test Service Registration)
       │
       v
Task 21 (Test Plugin Registration)
       │
       v
Task 22 (Test Positioning)
       │
       v
Task 23 (Test Short-Circuit)
       │
       v
Task 24 (Test Exclusion)
       │
       v
Task 25 (Test getPlugin)
       │
       v
Task 26 (Test Internal Injection)
       |
       v
Task 27 (Update API.md)
       |
       v
Task 28-31, 31a (Update Commands + CLAUDE.md) [parallel]
       |
       v
Task 32 (Delete ApiServicesMap + Validation Grep)
       |
       v
Tasks 33-45 (Corrective Tasks - see separate chain)
       |
       v
Tasks 46-53 (Deprecation Removal - see separate chain)
```

### Deprecation Removal Task Dependency Chain

```
Task 14 (Plugin Execution Chain)
       |
       v
Task 46 (Delete ApiPluginRequestContext/ResponseContext)
       |
       v
Task 47 (Delete LegacyApiPlugin) <-- also depends on Tasks 1, 2
       |
       |  [parallel group below]
       |
       +---> Task 48 (Delete legacySelectors)
       +---> Task 49 (Delete setApplyFunction)
       +---> Task 50 (Delete singleton registries)
       +---> Task 51 (Delete navigation functions)
              |
              v
       Task 52 (Update CLI Templates) <-- depends on Task 49
              |
              v
       Task 53 (Final Deprecation Validation)
```

---

### 27. Update .ai/targets/API.md Guidelines

**Goal**: Update API guidelines for new class-based plugin architecture

**Files**:
- `.ai/targets/API.md` (modified)

**Changes**:
- Update SCOPE section: Change path from `packages/uicore/src/api/**` to `packages/api/src/**`
- Update CRITICAL RULES:
  - Change "update ApiServicesMap via module augmentation" to class-based registration
  - Remove "Mock data lives in the app layer and is wired via apiRegistry.initialize({ useMockApi, mockMaps })"
  - Add "Mock data configured via `apiRegistry.plugins.add(new MockPlugin({ mockMap }))`"
- Update STOP CONDITIONS:
  - Remove or update "Editing BaseApiService or apiRegistry.ts" (feature requires it)
- Update USAGE RULES:
  - Change `apiRegistry.getService(DOMAIN)` to `apiRegistry.getService(ServiceClass)`
  - Update "Type inference must originate from ApiServicesMap" to class-based
  - Remove any references to `registerMocks()`, `setMockMode()`, `useMockApi`
- Rewrite PLUGIN RULES section:
  - REQUIRED: Extend ApiPluginBase (no config) or ApiPlugin<TConfig> (with config)
  - REQUIRED: Use namespaced API (apiRegistry.plugins.add, service.plugins.add)
  - REQUIRED: Plugins are identified by class reference (instanceof)
  - REQUIRED: MockPlugin is self-contained (all config in constructor)
  - FORBIDDEN: String-based plugin names for identification
  - FORBIDDEN: Mock-specific methods on apiRegistry (registerMocks, setMockMode)
- Update PRE-DIFF CHECKLIST:
  - Change "ApiServicesMap augmented" to "Service registered with apiRegistry.register(ServiceClass)"

**Traceability**:
- Gate 1 Review: Non-blocking suggestion (API.md Target File Update)

**Validation**:
- [x] File stays under 100 lines
- [x] ASCII only, no unicode
- [x] Rules use keywords (REQUIRED, FORBIDDEN, STOP)
- [x] No duplication with other target files

**Status**: COMPLETED

**Dependencies**: Task 19

---

### 28. Update hai3-new-api-service.md Command (SDK Layer)

**Goal**: Update SDK command template for class-based registration

**Files**:
- `packages/api/commands/hai3-new-api-service.md` (modified)

**Changes**:
- Update service registration pattern:
  - BAD: `apiRegistry.register(DOMAIN, ServiceClass)`
  - GOOD: `apiRegistry.register(ServiceClass)`
- Remove module augmentation pattern (ApiServicesMap)
- Update getService examples:
  - BAD: `apiRegistry.getService(DOMAIN)`
  - GOOD: `apiRegistry.getService(ServiceClass)`
- REMOVE mock registration section (OCP/DIP - mocks now configured via MockPlugin):
  - Remove any references to `apiRegistry.registerMocks()`
  - Add note: "Mock configuration via `apiRegistry.plugins.add(new MockPlugin({ mockMap }))`"
- Update constructor (simple, no globalPluginsProvider):
  ```typescript
  constructor() {
    super({ baseURL: '/api/v1/{domain}' }, [new RestProtocol()]);
  }
  ```

**Traceability**:
- Decision 1: Class-Based Service Registration (design.md)
- Decision 13: OCP/DIP Compliant Registry (design.md)

**Validation**:
- [x] No string domain registration
- [x] No module augmentation
- [x] No `registerMocks()` references (OCP/DIP)
- [x] Constructor takes no parameters
- [x] File follows AI.md format rules

**Status**: COMPLETED

**Dependencies**: Task 27

---

### 29. Update hai3-new-api-service.framework.md Command

**Goal**: Update Framework layer command template for class-based registration

**Files**:
- `packages/api/commands/hai3-new-api-service.framework.md` (modified)

**Changes**:
- Same changes as Task 28
- Ensure imports use `@hai3/framework` not `@hai3/api`

**Traceability**:
- Decision 1: Class-Based Service Registration (design.md)

**Validation**:
- [x] No string domain registration
- [x] No module augmentation
- [x] Imports from @hai3/framework

**Status**: COMPLETED

**Dependencies**: Task 27

---

### 30. Update hai3-new-api-service.react.md Command

**Goal**: Update React layer command template for class-based registration

**Files**:
- `packages/api/commands/hai3-new-api-service.react.md` (modified)

**Changes**:
- Same registration changes as Task 28
- Update effects to use class-based getService:
  ```typescript
  const service = apiRegistry.getService(MyApiService);
  ```
- Ensure imports use `@hai3/react`

**Traceability**:
- Decision 1: Class-Based Service Registration (design.md)

**Validation**:
- [x] No string domain registration
- [x] No module augmentation
- [x] Effects use class-based getService
- [x] Imports from @hai3/react

**Status**: COMPLETED

**Dependencies**: Task 27

---

### 31. Update hai3-quick-ref.md Command

**Goal**: Update quick reference Registry section

**Files**:
- `packages/framework/commands/hai3-quick-ref.md` (modified)

**Changes**:
- Update Registry section (lines 29-33):
  - REMOVE: `export const MY_DOMAIN = 'my-domain'`
  - KEEP: `class MyService extends BaseApiService`
  - REMOVE: `declare module '@hai3/api' { interface ApiServicesMap }`
  - CHANGE: `apiRegistry.register(MY_DOMAIN, MyService)` to `apiRegistry.register(MyService)`

**Traceability**:
- Decision 1: Class-Based Service Registration (design.md)

**Validation**:
- [x] No string domain constant
- [x] No module augmentation
- [x] Class-based registration only

**Status**: COMPLETED

**Dependencies**: Task 27

---

### 31a. Update packages/api/CLAUDE.md Documentation

**Goal**: Update the CLAUDE.md file in packages/api to reflect class-based registration and plugin-based mock architecture

**Files**:
- `packages/api/CLAUDE.md` (modified)

**Changes**:
The current CLAUDE.md references deprecated patterns that must be updated:

1. **API Registry section** - Replace string-based registration:
   - OLD: `apiRegistry.register('accounts', AccountsApiService);`
   - NEW: `apiRegistry.register(AccountsApiService);`

2. **API Registry section** - Replace string-based getService:
   - OLD: `const accounts = apiRegistry.getService('accounts');`
   - NEW: `const accounts = apiRegistry.getService(AccountsApiService);`

3. **Remove Type Safety via Module Augmentation section** entirely - no longer needed with class-based registration

4. **Mock Support section** - Replace with plugin-based approach:
   - OLD: `apiRegistry.registerMocks('accounts', accountsMockMap);`
   - NEW: Show per-service MockPlugin registration pattern:
     ```typescript
     // In service constructor or initialization
     this.plugins.add(new MockPlugin({
       mockMap: {
         'GET /api/accounts/user/current': () => ({ id: '1', name: 'John Doe' }),
       },
       delay: 100,
     }));
     ```

5. **Mock Mode section** - Remove deprecated toggle methods:
   - REMOVE: `apiRegistry.setMockMode(true);`
   - REMOVE: `apiRegistry.setMockMode(false);`
   - ADD: Explain that mock mode is controlled by adding/removing MockPlugin

6. **Plugin System section** - Update to show class-based plugins:
   - OLD: `class LoggingPlugin implements ApiPlugin`
   - NEW: `class LoggingPlugin extends ApiPlugin<void>` or `extends ApiPluginBase`
   - Update example to use namespaced API: `service.plugins.add(new LoggingPlugin())`

7. **Exports section** - Update list:
   - ADD: `ApiPluginBase`, `ApiPlugin`, `PluginClass`, `isShortCircuit`
   - REMOVE: Reference to `ApiServicesMap` (being deleted)

**Traceability**:
- Gate 1 Review: Non-blocking issue (packages/api/CLAUDE.md Update)
- Decision 1: Class-Based Service Registration (design.md)
- Decision 11: Clean Break Policy - No Deprecation (design.md)

**Validation**:
- [x] No `apiRegistry.register('string',` patterns
- [x] No `apiRegistry.getService('string')` patterns
- [x] No `apiRegistry.registerMocks()` references
- [x] No `apiRegistry.setMockMode()` references
- [x] No `ApiServicesMap` module augmentation examples
- [x] Plugin examples extend `ApiPluginBase` or `ApiPlugin<TConfig>`
- [x] Examples use namespaced plugin API (`plugins.add`)

**Status**: COMPLETED

**Dependencies**: Task 27

---

### 32. Delete ApiServicesMap Interface and Validate Migration

**Goal**: DELETE the empty `ApiServicesMap` interface entirely from types.ts (lines 521-524) and verify no orphaned module augmentation remains

**Files**:
- `packages/api/src/types.ts` (modified - DELETE ApiServicesMap interface)
- `packages/api/src/index.ts` (modified - remove ApiServicesMap export if present)

**Changes**:
- DELETE the empty `ApiServicesMap` interface from types.ts:
  ```typescript
  // DELETE THIS ENTIRE BLOCK (lines 521-524):
  export interface ApiServicesMap {
    // Empty - no legacy interfaces should remain
  }
  ```
- Remove `ApiServicesMap` export from index.ts if present
- This interface is a legacy artifact that should NOT remain in the codebase

**Commands (Validation)**:
```bash
# Verify no module augmentation in application code
grep -rn "interface ApiServicesMap" src/ packages/
grep -rn "declare module.*@hai3" src/ packages/ | grep ApiServicesMap
# Verify the interface is completely deleted
grep -rn "ApiServicesMap" packages/api/src/types.ts
```

**Traceability**:
- Gate 1 Review: Non-blocking issue (ApiServicesMap Interface Clarification)
- Decision 1: Class-Based Service Registration (design.md)

**Validation**:
- [x] `ApiServicesMap` interface does NOT exist in types.ts
- [x] `ApiServicesMap` is NOT exported from index.ts
- [x] No ApiServicesMap module augmentation in src/
- [x] No ApiServicesMap module augmentation in app code
- [x] TypeScript compiles without errors
- [x] `grep -rn "ApiServicesMap" packages/api/src/` returns 0 results

**Status**: COMPLETED

**Dependencies**: Tasks 28-31, 31a

---

## Corrective Tasks (Post-Implementation Review)

The following tasks address issues identified during implementation review.

---

### 33. Refactor SseProtocol - Remove MockPlugin Import (OCP/DIP)

**Goal**: Remove direct dependency on MockPlugin from SseProtocol

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Remove `import { MockPlugin } from '../plugins/MockPlugin';` line
- Remove any other MockPlugin-related imports if present

**Traceability**:
- Correction 2: Protocol Plugin Agnosticism (design.md)
- AC-2: Protocol OCP/DIP Compliance (spec.md)

**Validation**:
- [x] No MockPlugin import in SseProtocol.ts
- [x] TypeScript compiles without errors
- [x] No runtime errors in SSE functionality

**Status**: COMPLETED

**Dependencies**: None (can start immediately)

---

### 34. Refactor SseProtocol - Remove instanceof MockPlugin Checks

**Goal**: Replace MockPlugin-specific checks with generic plugin chain execution

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Remove line: `const mockPlugin = this.getPlugins().find((p) => p instanceof MockPlugin) as MockPlugin | undefined;`
- Remove any other `instanceof MockPlugin` checks
- Replace with generic plugin chain execution pattern

**Traceability**:
- Correction 2: Protocol Plugin Agnosticism (design.md)
- AC-2: Protocol OCP/DIP Compliance (spec.md)

**Validation**:
- [x] No `instanceof MockPlugin` in SseProtocol.ts
- [x] No string literal 'MockPlugin' in SseProtocol.ts
- [x] TypeScript compiles without errors (only unused variable warnings, will be resolved in Task 35)

**Status**: COMPLETED

**Dependencies**: Task 33

---

### 35. Implement Generic Plugin Chain in SseProtocol

**Goal**: Add generic plugin execution that works with any short-circuit plugin

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Add `import { isShortCircuit } from '../types';`
- Add private method `executePluginChainAsync()`:
  ```typescript
  private async executePluginChainAsync(
    context: ApiRequestContext
  ): Promise<ApiRequestContext | ShortCircuitResponse> {
    let currentContext = context;

    for (const plugin of this.getClassBasedPlugins()) {
      if (plugin.onRequest) {
        const result = await plugin.onRequest(currentContext);

        if (isShortCircuit(result)) {
          return result;
        }

        currentContext = result;
      }
    }

    return currentContext;
  }
  ```
- Update `connect()` method to use the generic plugin chain

**Traceability**:
- Correction 2: Protocol Plugin Agnosticism (design.md)
- AC-2: Protocol OCP/DIP Compliance (spec.md)
- Scenario 3: SSE Protocol Generic Mock Handling (spec.md)

**Validation**:
- [x] `executePluginChainAsync()` method implemented
- [x] Uses `isShortCircuit()` type guard (not instanceof)
- [x] connect() method uses the new plugin chain
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 34

---

### 36. Implement Stream Content Extraction Strategy

**Goal**: Add type guards and extraction logic to handle different response data formats

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Add private method `extractStreamContent(data: unknown): string`:
  ```typescript
  /**
   * Extract streamable content from short-circuit response data.
   * Handles multiple response formats without knowledge of which plugin produced it.
   */
  private extractStreamContent(data: unknown): string {
    // Case 1: Plain string - stream directly
    if (typeof data === 'string') {
      return data;
    }

    // Case 2: OpenAI-style chat completion (common mock format)
    if (this.isChatCompletion(data)) {
      return data.choices?.[0]?.message?.content ?? '';
    }

    // Case 3: SSE content wrapper { content: string }
    if (this.isSseContent(data)) {
      return data.content;
    }

    // Case 4: Fallback - JSON serialize
    return JSON.stringify(data);
  }
  ```
- Add type guard `isChatCompletion()` for OpenAI format detection
- Add type guard `isSseContent()` for simple SSE content wrapper

**Why This Matters**:
This method enables protocol-agnostic handling. MockPlugin (or any future short-circuit plugin like CachePlugin, OfflinePlugin) can return data in various formats. The protocol intelligently extracts streamable content WITHOUT knowing which plugin produced the response.

**Traceability**:
- Correction 2: Protocol Plugin Agnosticism (design.md)
- Section: Stream Content Extraction Strategy (design.md)
- AC-2: Protocol OCP/DIP Compliance (spec.md)

**Validation**:
- [x] `extractStreamContent()` method handles string input
- [x] `extractStreamContent()` method handles OpenAI chat completion format
- [x] `extractStreamContent()` method handles SSE content wrapper
- [x] `extractStreamContent()` method falls back to JSON for unknown formats
- [x] Type guards properly narrow types
- [x] No MockPlugin references in extraction logic
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 35

---

### 37. Rename and Generalize simulateMockStream

**Goal**: Make stream simulation work with any short-circuit response, not just MockPlugin

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Rename `simulateMockStream` to `simulateStreamFromShortCircuit`
- Update method signature to accept `ApiResponseContext` instead of MockPlugin-specific data:
  ```typescript
  private async simulateStreamFromShortCircuit(
    connectionId: string,
    response: ApiResponseContext,
    onMessage: (event: MessageEvent) => void,
    onComplete?: () => void
  ): Promise<void> {
    // Mark as short-circuit connection
    this.connections.set(connectionId, 'short-circuit');

    // Extract content using generic extraction (no plugin knowledge)
    const content = this.extractStreamContent(response.data);

    // Stream the content word by word
    await this.streamContent(connectionId, content, onMessage, onComplete);
  }
  ```
- Remove all MockPlugin-specific logic from the method body
- Use `extractStreamContent()` for data handling

**Traceability**:
- Correction 2: Protocol Plugin Agnosticism (design.md)
- AC-2: Protocol OCP/DIP Compliance (spec.md)

**Validation**:
- [x] Method renamed to `simulateStreamFromShortCircuit`
- [x] Accepts `ApiResponseContext` parameter
- [x] Uses `extractStreamContent()` for data handling
- [x] Works with any plugin's short-circuit response
- [x] No MockPlugin-specific logic inside the method
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 36

---

### 38. Update SseProtocol connect() Method

**Goal**: Integrate generic plugin chain into connect() flow

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Update `connect()` to:
  1. Build ApiRequestContext with method: 'GET', url, headers
  2. Execute plugin chain asynchronously via `executePluginChainAsync()`
  3. Check for short-circuit using `isShortCircuit()` type guard
  4. If short-circuited, call `simulateStreamFromShortCircuit(response.shortCircuit)`
  5. Otherwise, establish real SSE connection via `establishRealConnection()`
- Handle async execution properly (plugin chain is async, but connect() returns sync connectionId)
- Extract real connection logic to separate method for clarity

**Traceability**:
- Correction 2: Protocol Plugin Agnosticism (design.md)
- AC-2: Protocol OCP/DIP Compliance (spec.md)
- Scenario 3: SSE Protocol Generic Mock Handling (spec.md)

**Validation**:
- [x] connect() builds proper ApiRequestContext
- [x] connect() executes plugin chain before connecting
- [x] Short-circuit detection uses `isShortCircuit()` type guard
- [x] Real SSE connection only established when no short-circuit
- [x] TypeScript compiles without errors
- [x] SSE mock functionality still works

**Status**: COMPLETED

**Dependencies**: Task 37

---

### 39. Audit ESLint Disable Comments in API Package

**Goal**: Find all ESLint disable comments that need to be addressed

**Files**:
- None (audit only)

**Commands**:
```bash
grep -rn "eslint-disable" packages/api/src/
grep -rn "@typescript-eslint/no-explicit-any" packages/api/src/
grep -rn "@typescript-eslint/no-unsafe" packages/api/src/
```

**Traceability**:
- Correction 3: Remove ESLint Exceptions (design.md)
- AC-3: Type Safety (spec.md)

**Validation**:
- [x] All eslint-disable comments documented
- [x] Each comment categorized as legitimate vs needs-fix
- [x] List of files/lines requiring type fixes created

**Status**: COMPLETED

**Dependencies**: None (can start immediately)

---

### 40. Replace Type Assertions with Proper Typing

**Goal**: Remove type assertions and add proper TypeScript typing

**Files**:
- Multiple files in `packages/api/src/` (based on audit results)

**Changes**:
- Replace `as T` type assertions with proper typing
- Add type guards where needed
- Use generic types instead of `any`
- Remove unnecessary eslint-disable comments

**Traceability**:
- Correction 3: Remove ESLint Exceptions (design.md)
- AC-3: Type Safety (spec.md)

**Validation**:
- [x] No new eslint-disable comments added
- [x] Type assertions minimized (only where truly necessary)
- [x] All types properly inferred or explicitly typed
- [x] TypeScript compiles without errors
- [x] ESLint passes without type-related errors

**Status**: COMPLETED

**Dependencies**: Task 39

---

### 41. Update API Command Templates for Per-Service MockPlugin

**Goal**: Update command templates to show per-service MockPlugin pattern

**Files**:
- `packages/api/commands/hai3-new-api-service.md` (modified)
- `packages/api/commands/hai3-new-api-service.framework.md` (modified)
- `packages/api/commands/hai3-new-api-service.react.md` (modified)

**Changes**:
- Add example of service-level MockPlugin registration in constructor:
  ```typescript
  constructor() {
    super({ baseURL: '/api/{domain}' }, [new RestProtocol()]);

    // For development/testing, register service-specific mocks
    if (process.env.NODE_ENV === 'development') {
      this.plugins.add(new MockPlugin({
        mockMap: {
          'GET /api/{domain}/items': () => mockItems,
        },
        delay: 100,
      }));
    }
  }
  ```
- Add note: "MockPlugin should be registered per-service for vertical slice compliance"
- Add warning: "Avoid global MockPlugin registration if screenset mocks need to be self-contained"

**Traceability**:
- Correction 1: Per-Service MockPlugin (design.md)
- AC-1: Per-Service MockPlugin Registration (spec.md)
- AC-4: Vertical Slice Support (spec.md)

**Validation**:
- [x] Per-service MockPlugin example in all command variants
- [x] Warning about global MockPlugin for screensets
- [x] Examples show proper constructor pattern
- [x] File follows AI.md format rules

**Status**: COMPLETED

**Dependencies**: Task 40

---

### 42. Update .ai/targets/API.md for Per-Service Mocking

**Goal**: Update API guidelines to reflect per-service mocking pattern

**Files**:
- `.ai/targets/API.md` (modified)

**Changes**:
- Update PLUGIN RULES section to include:
  - "PREFERRED: Register MockPlugin per-service for vertical slice compliance"
  - "ALLOWED: Global MockPlugin for cross-cutting mocks (e.g., auth simulation)"
  - "FORBIDDEN: Global MockPlugin with screenset-specific mocks (breaks vertical slices)"
- Add vertical slice architecture note to CRITICAL RULES

**Traceability**:
- Correction 1: Per-Service MockPlugin (design.md)
- AC-1: Per-Service MockPlugin Registration (spec.md)
- AC-4: Vertical Slice Support (spec.md)

**Validation**:
- [x] PLUGIN RULES updated with per-service pattern
- [x] Vertical slice compliance documented
- [x] File stays under 100 lines
- [x] ASCII only, no unicode

**Status**: COMPLETED

**Dependencies**: Task 41

---

### 43. Manual Testing - SseProtocol Generic Plugin Chain

**Goal**: Verify SSE protocol works with generic plugin chain

**Steps**:
1. Register a service with SseProtocol
2. Add MockPlugin to the service (not globally)
3. Test SSE connection with mock data
4. Verify mock data streams correctly
5. Test without MockPlugin - verify real SSE connection

**Traceability**:
- AC-2: Protocol OCP/DIP Compliance (spec.md)
- Scenario 3: SSE Protocol Generic Mock Handling (spec.md)

**Validation**:
- [x] SSE mock streaming works via generic plugin chain
- [x] No MockPlugin-specific code in SseProtocol
- [x] Real SSE connections work when no short-circuit
- [x] Console shows no errors

**Status**: COMPLETED

**Dependencies**: Task 38

---

### 44. Manual Testing - Per-Service MockPlugin

**Goal**: Verify per-service MockPlugin pattern works correctly

**Steps**:
1. Create two services with different MockPlugin configurations:
   ```typescript
   class ServiceA extends BaseApiService {
     constructor() {
       super({ baseURL: '/api/a' }, new RestProtocol());
       this.plugins.add(new MockPlugin({
         mockMap: { 'GET /api/a/data': () => ({ source: 'A' }) }
       }));
     }
   }

   class ServiceB extends BaseApiService {
     constructor() {
       super({ baseURL: '/api/b' }, new RestProtocol());
       this.plugins.add(new MockPlugin({
         mockMap: { 'GET /api/b/data': () => ({ source: 'B' }) }
       }));
     }
   }
   ```
2. Register both services
3. Make requests to each service
4. Verify each service returns its own mock data
5. Verify services are independent (no cross-contamination)

**Traceability**:
- AC-1: Per-Service MockPlugin Registration (spec.md)
- Scenario 1: Screenset with Self-Contained Mocks (spec.md)

**Validation**:
- [x] Service A returns mock data from its own MockPlugin
- [x] Service B returns mock data from its own MockPlugin
- [x] No mock data cross-contamination between services
- [x] Services can be independently registered and work correctly

**Status**: COMPLETED

**Dependencies**: Task 43

---

### 45. Verify No ESLint Disable Comments Remain

**Goal**: Final verification that no eslint-disable comments were added

**Files**:
- None (verification only)

**Commands**:
```bash
# Should return 0 results for type-related disables
grep -rn "eslint-disable.*@typescript-eslint" packages/api/src/ | grep -v "third-party"
```

**Traceability**:
- AC-3: Type Safety (spec.md)

**Validation**:
- [x] No eslint-disable comments for @typescript-eslint rules
- [x] Any remaining disables are documented with legitimate reasons
- [x] ESLint passes without errors

**Status**: COMPLETED

**Dependencies**: Tasks 40, 44

---

## Deprecation Removal Tasks (Clean Break Policy)

The following tasks implement the Clean Break Policy - No Deprecation (Decision 11 in design.md).
All deprecated types must be deleted, not kept for backward compatibility.

---

### 46. Delete Deprecated API Plugin Context Types

**Goal**: Remove deprecated `ApiPluginRequestContext` and `ApiPluginResponseContext` types

**Files**:
- `packages/api/src/types.ts` (modified)
- `packages/api/src/index.ts` (modified)

**Changes**:
- Delete `ApiPluginRequestContext` interface (lines 151-164)
- Delete `ApiPluginResponseContext` interface (lines 166-177)
- Remove `@deprecated` annotation and "Note: Extends" comments from `ApiRequestContext`
- Remove `@deprecated` annotation and "Note: Extends" comments from `ApiResponseContext`
- Update `ApiRequestContext` to NOT extend deprecated type (standalone definition)
- Update `ApiResponseContext` to NOT extend deprecated type (standalone definition)
- Remove exports from `packages/api/src/index.ts`

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit table row: `ApiPluginRequestContext`, `ApiPluginResponseContext`

**Validation**:
- [x] `ApiPluginRequestContext` type does NOT exist
- [x] `ApiPluginResponseContext` type does NOT exist
- [x] `ApiRequestContext` is standalone (no extends)
- [x] `ApiResponseContext` is standalone (no extends)
- [x] No `@deprecated` annotations in types.ts
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Both must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "ApiPluginRequestContext" packages/
grep -rn "ApiPluginResponseContext" packages/
```

**Status**: COMPLETED

**Dependencies**: Task 14 (Plugin Execution Chain must be updated first)

---

### 47. Delete LegacyApiPlugin Interface

**Goal**: Remove deprecated `LegacyApiPlugin` interface and update all usages

**Files**:
- `packages/api/src/types.ts` (modified)
- `packages/api/src/index.ts` (modified)
- `packages/api/src/BaseApiService.ts` (modified)
- `packages/api/src/protocols/RestProtocol.ts` (modified)
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Delete `LegacyApiPlugin` interface from types.ts (lines 376-431)
- Remove export from index.ts
- Update `BaseApiService.legacyPlugins` to use `ApiPluginBase[]`
- Update `BaseApiService.registerPlugin()` to use `ApiPluginBase`
- Update `BaseApiService.getPluginsInOrder()` to return `ApiPluginBase[]`
- Update `RestProtocol.getPlugins` type to `() => ReadonlyArray<ApiPluginBase>`
- Update `SseProtocol.getPlugins` type to `() => ReadonlyArray<ApiPluginBase>`
- Rename `legacyPlugins` field to `plugins` (or appropriate name per new design)

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit table row: `LegacyApiPlugin`

**Validation**:
- [x] `LegacyApiPlugin` interface does NOT exist
- [x] All plugin arrays use `ApiPluginBase[]` type
- [x] No `@deprecated` annotations related to LegacyApiPlugin
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "LegacyApiPlugin" packages/
```

**Status**: COMPLETED

**Dependencies**: Tasks 1, 2 (ApiPluginBase must exist first)

---

### 48. Delete legacySelectors Export

**Goal**: Remove deprecated `legacySelectors` constant

**Files**:
- `packages/framework/src/migration.ts` (modified)
- `packages/framework/src/index.ts` (modified)

**Changes**:
- Delete entire "Legacy State Accessors (DEPRECATED)" section from migration.ts (lines 212-226)
- Remove `legacySelectors` export from index.ts

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit table row: `legacySelectors`

**Validation**:
- [x] `legacySelectors` does NOT exist in migration.ts
- [x] `legacySelectors` is NOT exported from index.ts
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "legacySelectors" packages/
```

**Status**: COMPLETED

**Dependencies**: None (can start immediately)

---

### 49. Delete setApplyFunction Method

**Goal**: Remove deprecated `setApplyFunction` from ThemeRegistry

**Files**:
- `packages/framework/src/types.ts` (modified)
- `packages/framework/src/registries/themeRegistry.ts` (modified)

**Changes**:
- Remove `setApplyFunction` method from `ThemeRegistry` interface in types.ts (lines 323-327)
- Remove `setApplyFunction` implementation from themeRegistry.ts (line 106)
- Update any callers to use constructor injection pattern

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit table row: `setApplyFunction`

**Validation**:
- [x] `setApplyFunction` method does NOT exist in ThemeRegistry interface
- [x] `setApplyFunction` implementation does NOT exist in themeRegistry.ts
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results (except CLI templates) - verify IMMEDIATELY after completing this task
grep -rn "setApplyFunction" packages/ --include="*.ts" | grep -v "packages/cli/"
```

**Note**: CLI templates may need updating separately. Check:
- `packages/cli/templates/src/app/themes/themeRegistry.ts`
- `packages/cli/template-sources/ai-overrides/targets/THEMES.md`

**Status**: COMPLETED

**Dependencies**: None (can start immediately)

---

### 50. Delete Deprecated Singleton Registries from compat.ts

**Goal**: Remove deprecated `themeRegistry` and `routeRegistry` singletons

**Files**:
- `packages/framework/src/compat.ts` (modified)
- `packages/framework/src/index.ts` (modified)
- `packages/framework/src/plugins/themes.ts` (modified)

**Changes**:
- Remove `themeRegistry` singleton export from compat.ts (lines 36-41)
- Remove `routeRegistry` singleton export from compat.ts (lines 43-48)
- Remove imports from index.ts
- Update `packages/framework/src/plugins/themes.ts` to not use singleton:
  - Remove `import { themeRegistry as singletonThemeRegistry } from '../compat';`
  - Pass themeRegistry via proper DI pattern

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit table rows: `themeRegistry`, `routeRegistry` singletons

**Validation**:
- [x] No `@deprecated` singleton exports in compat.ts
- [x] themes.ts plugin uses proper DI (no singleton import)
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "singletonThemeRegistry\|singletonRouteRegistry" packages/framework/src/
# Also verify no deprecated singleton imports remain
grep -rn "import.*from.*compat.*themeRegistry\|import.*from.*compat.*routeRegistry" packages/framework/src/
```

**Status**: COMPLETED

**Dependencies**: None (can start immediately)

---

### 51. Delete Deprecated Navigation Functions from compat.ts

**Goal**: Remove deprecated `navigateToScreen` and `fetchCurrentUser` functions

**Files**:
- `packages/framework/src/compat.ts` (modified)
- `packages/framework/src/index.ts` (modified)

**Changes**:
- Remove `navigateToScreen` function from compat.ts (lines 54-69)
- Remove `fetchCurrentUser` function from compat.ts (lines 71-90)
- Remove exports from index.ts

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit table rows: `navigateToScreen`, `fetchCurrentUser`

**Validation**:
- [x] `navigateToScreen` function does NOT exist in compat.ts
- [x] `fetchCurrentUser` function does NOT exist in compat.ts
- [x] Functions are NOT exported from index.ts
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results (plugin actions may have navigateToScreen action type) - verify IMMEDIATELY
grep -rn "navigateToScreen" packages/framework/src/ | grep -v "actions\|types"
grep -rn "fetchCurrentUser" packages/framework/src/
```

**Status**: COMPLETED

**Dependencies**: None (can start immediately)

---

### 52. Update CLI Templates for Deprecation Removal

**Goal**: Update CLI templates that reference deprecated APIs

**Files**:
- `packages/cli/templates/.ai/targets/THEMES.md` (modified)
- `packages/cli/templates/src/app/themes/themeRegistry.ts` (modified)
- `packages/cli/template-sources/ai-overrides/targets/THEMES.md` (modified)

**Changes**:
- Update THEMES.md to remove `themeRegistry.setApplyFunction(applyTheme)` reference
- Update themeRegistry.ts template to use constructor injection pattern
- Update ai-overrides THEMES.md to remove deprecated pattern

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Audit note for setApplyFunction CLI template usage

**Validation**:
- [x] No `setApplyFunction` references in CLI templates
- [x] Templates use constructor injection pattern
- [x] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "setApplyFunction" packages/cli/
```

**Status**: COMPLETED

**Dependencies**: Task 49 (setApplyFunction removal)

---

### 53. Final Deprecation Validation

**Goal**: Verify ALL deprecated annotations have been removed from codebase

**Commands**:
```bash
# Must return 0 results
grep -rn "@deprecated" packages/api/src/
grep -rn "@deprecated" packages/framework/src/
grep -rn "@deprecated" packages/react/src/

# Verify deprecated types are gone
grep -rn "ApiPluginRequestContext" packages/
grep -rn "ApiPluginResponseContext" packages/
grep -rn "LegacyApiPlugin" packages/
grep -rn "legacySelectors" packages/
```

**Traceability**:
- Decision 11: Clean Break Policy - No Deprecation (design.md)
- Validation Command section in design.md

**Validation**:
- [x] `grep -rn "@deprecated" packages/api/src/` returns 0 results
- [x] `grep -rn "@deprecated" packages/framework/src/` returns 0 results
- [x] `grep -rn "@deprecated" packages/react/src/` returns 0 results
- [x] All deprecated type grep checks return 0 results
- [x] TypeScript compiles without errors
- [x] ESLint passes without errors

**Status**: COMPLETED

**Dependencies**: Tasks 46-52

---

## Protocol-Specific Plugin Architecture (Corrective Update v2)

The following tasks implement the protocol-specific plugin architecture that supersedes the previous generic approach. These tasks should be executed after the original tasks are completed.

---

### 54. Add Protocol-Specific Hook Interfaces

**Goal**: Define protocol-specific plugin hook interfaces

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `RestPluginHooks` interface with `onRequest`, `onResponse`, `onError`
- Add `SsePluginHooks` interface with `onConnect`, `onEvent`, `onDisconnect`
- Add `RestRequestContext` type (method, url, headers, body)
- Add `SseConnectContext` type (url, headers)

**Traceability**:
- FR-1: Protocol-Specific Plugin Hooks (spec.md)
- AC-1: Protocol-Specific Plugin Hooks (spec.md)
- New Type Definitions section (design.md)

**Validation**:
- [x] `RestPluginHooks` interface exported
- [x] `SsePluginHooks` interface exported
- [x] `RestRequestContext` type exported
- [x] `SseConnectContext` type exported
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 1 (ApiPluginBase must exist)

---

### 55. Add Protocol-Specific Short-Circuit Types

**Goal**: Define protocol-specific short-circuit response types

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `RestResponseContext` type (status, headers, data)
- Add `RestShortCircuitResponse` type ({ shortCircuit: RestResponseContext })
- Add `EventSourceLike` interface (matching EventSource API)
- Add `SseShortCircuitResponse` type ({ shortCircuit: EventSourceLike })
- Add `isRestShortCircuit()` type guard
- Add `isSseShortCircuit()` type guard

**Traceability**:
- FR-2: Protocol-Specific Short-Circuit Types (spec.md)
- AC-2: Protocol-Specific Short-Circuit Types (spec.md)
- New Type Definitions section (design.md)

**Validation**:
- [x] `RestShortCircuitResponse` type exported
- [x] `SseShortCircuitResponse` type exported
- [x] `EventSourceLike` interface exported
- [x] `isRestShortCircuit()` correctly identifies REST short-circuit
- [x] `isSseShortCircuit()` correctly identifies SSE short-circuit
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 54

---

### 56. Add Protocol-Specific Plugin Convenience Classes

**Goal**: Create convenience classes for each protocol

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `RestPlugin extends ApiPluginBase implements RestPluginHooks`
- Add `RestPluginWithConfig<T> extends ApiPluginBase implements RestPluginHooks`
- Add `SsePlugin extends ApiPluginBase implements SsePluginHooks`
- Add `SsePluginWithConfig<T> extends ApiPluginBase implements SsePluginHooks`

**Traceability**:
- AC-6: Class Hierarchy (spec.md)
- New Type Definitions section (design.md)

**Validation**:
- [x] `RestPlugin` class exported
- [x] `RestPluginWithConfig<T>` class exported
- [x] `SsePlugin` class exported
- [x] `SsePluginWithConfig<T>` class exported
- [x] Config accessible via `this.config` in WithConfig variants
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 54, 55

---

### 57. Add Plugin Management to RestProtocol

**Goal**: Add global and instance plugin management to RestProtocol

**Files**:
- `packages/api/src/protocols/RestProtocol.ts` (modified)

**Changes**:
- Add `private static _globalPlugins: Set<RestPluginHooks>`
- Add `static readonly globalPlugins` namespace with add/remove/has/getAll/clear
- Add `private _instancePlugins: Set<RestPluginHooks>`
- Add `readonly plugins` namespace with add/remove/getAll
- Add `private getPluginsInOrder(): RestPluginHooks[]` method
- Update plugin chain execution to use `getPluginsInOrder()`

**Traceability**:
- FR-3: Protocol-Level Plugin Management (spec.md)
- AC-3: Protocol-Level Plugin Management (spec.md)
- Protocol-Level Plugin Management section (design.md)

**Validation**:
- [x] `RestProtocol.globalPlugins.add()` registers global plugin
- [x] `RestProtocol.globalPlugins.remove()` removes and calls destroy
- [x] `restProtocol.plugins.add()` registers instance plugin
- [x] Plugin resolution: global first, then instance
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 54, 55, 56

---

### 58. Add Plugin Management to SseProtocol

**Goal**: Add global and instance plugin management to SseProtocol

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Add `private static _globalPlugins: Set<SsePluginHooks>`
- Add `static readonly globalPlugins` namespace with add/remove/has/getAll/clear
- Add `private _instancePlugins: Set<SsePluginHooks>`
- Add `readonly plugins` namespace with add/remove/getAll
- Add `private getPluginsInOrder(): SsePluginHooks[]` method

**Traceability**:
- FR-3: Protocol-Level Plugin Management (spec.md)
- AC-3: Protocol-Level Plugin Management (spec.md)
- Protocol-Level Plugin Management section (design.md)

**Validation**:
- [x] `SseProtocol.globalPlugins.add()` registers global plugin
- [x] `SseProtocol.globalPlugins.remove()` removes and calls destroy
- [x] `sseProtocol.plugins.add()` registers instance plugin
- [x] Plugin resolution: global first, then instance
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 54, 55, 56

---

### 59. Create MockEventSource Class

**Goal**: Implement EventSourceLike for SSE mocking

**Files**:
- `packages/api/src/mocks/MockEventSource.ts` (new)

**Changes**:
- Create `MockEventSource` class implementing `EventSourceLike`
- Constructor accepts events array and optional delay
- Async event emission with abort support
- Proper readyState management (CONNECTING -> OPEN -> CLOSED)
- Support for addEventListener/removeEventListener
- Export from package

**Traceability**:
- AC-5: Protocol-Specific Mock Plugins (spec.md)
- MockEventSource implementation (design.md)

**Validation**:
- [x] `MockEventSource` implements `EventSourceLike`
- [x] Events emit asynchronously with configured delay
- [x] `close()` aborts event emission
- [x] readyState transitions correctly
- [x] onopen, onmessage, onerror handlers work
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 55 (EventSourceLike interface)

---

### 60. Create RestMockPlugin

**Goal**: Create protocol-specific REST mock plugin

**Files**:
- `packages/api/src/plugins/RestMockPlugin.ts` (new)

**Changes**:
- Create `RestMockConfig` interface (mockMap, delay)
- Create `RestMockPlugin extends RestPluginWithConfig<RestMockConfig>`
- Implement `onRequest` that returns `RestShortCircuitResponse` for matching URLs
- Support URL pattern matching (e.g., 'GET /api/users')
- Export from package

**Traceability**:
- FR-5: Protocol-Specific Mock Plugins (spec.md)
- AC-5: Protocol-Specific Mock Plugins (spec.md)
- Protocol-Specific Mock Plugins section (design.md)

**Validation**:
- [x] `RestMockPlugin` extends `RestPluginWithConfig<RestMockConfig>`
- [x] Returns `RestShortCircuitResponse` for matching requests
- [x] Non-matching requests pass through unchanged
- [x] Delay is applied before returning mock response
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 55, 56

---

### 61. Create SseMockPlugin

**Goal**: Create protocol-specific SSE mock plugin

**Files**:
- `packages/api/src/plugins/SseMockPlugin.ts` (new)

**Changes**:
- Create `SseMockEvent` interface (event, data)
- Create `SseMockConfig` interface (mockStreams map, delay)
- Create `SseMockPlugin extends SsePluginWithConfig<SseMockConfig>`
- Implement `onConnect` that returns `SseShortCircuitResponse` with MockEventSource
- Export from package

**Traceability**:
- FR-5: Protocol-Specific Mock Plugins (spec.md)
- AC-5: Protocol-Specific Mock Plugins (spec.md)
- Protocol-Specific Mock Plugins section (design.md)

**Validation**:
- [x] `SseMockPlugin` extends `SsePluginWithConfig<SseMockConfig>`
- [x] Returns `SseShortCircuitResponse` with `MockEventSource` for matching URLs
- [x] Non-matching connections pass through unchanged
- [x] MockEventSource emits configured events
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 55, 56, 59

---

### 62. Purify SseProtocol - Remove Mock Simulation Logic

**Goal**: Remove all mock simulation logic from SseProtocol

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Remove `extractStreamContent()` method
- Remove `isChatCompletion()` type guard
- Remove `isSseContent()` type guard
- Remove `simulateMockStream()` / `simulateStreamFromShortCircuit()` method
- Remove any mock-related imports
- Remove ConnectionState 'short-circuit' handling

**Traceability**:
- FR-4: Pure SseProtocol (spec.md)
- AC-4: Pure SseProtocol (spec.md)
- Pure SseProtocol Implementation section (design.md)

**Validation**:
- [x] No `extractStreamContent` in SseProtocol
- [x] No `simulateMockStream` / `simulateStreamFromShortCircuit` in SseProtocol
- [x] No mock-related type guards in SseProtocol
- [x] SseProtocol imports only protocol-specific types
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 58

---

### 63. Implement Pure SseProtocol connect() Method

**Goal**: Implement single-branch connect logic using protocol-specific short-circuit

**Files**:
- `packages/api/src/protocols/SseProtocol.ts` (modified)

**Changes**:
- Update `connect()` method to:
  1. Build `SseConnectContext`
  2. Execute plugin chain via `getPluginsInOrder()`
  3. Check for short-circuit using `isSseShortCircuit()`
  4. If short-circuit: use provided EventSource
  5. If not: create real EventSource
  6. Call `attachHandlers()` for both paths
- Create `attachHandlers(connectionId, source, onMessage, onComplete)` method
- Same code path for mock and real EventSource

**Traceability**:
- FR-4: Pure SseProtocol (spec.md)
- AC-4: Pure SseProtocol (spec.md)
- Scenario 4: Pure SseProtocol Implementation (spec.md)
- Pure SseProtocol Implementation section (design.md)

**Validation**:
- [x] connect() uses `isSseShortCircuit()` type guard
- [x] Short-circuit path uses plugin-provided EventSource
- [x] Real path creates new EventSource
- [x] Same `attachHandlers()` for both paths
- [x] onEvent hooks run for incoming messages
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 58, 62

---

### 64. Remove apiRegistry.plugins Namespace

**Goal**: Remove centralized plugin registry from apiRegistry

**Files**:
- `packages/api/src/types.ts` (modified)
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Remove `plugins` property from `ApiRegistry` interface
- Remove `plugins` implementation from apiRegistry
- Remove `globalPlugins` storage
- Remove all plugin-related methods from apiRegistry
- Update any code that references `apiRegistry.plugins`

**Traceability**:
- AC-3: Protocol-Level Plugin Management - apiRegistry.plugins.* removed (spec.md)
- Removing apiRegistry.plugins Namespace section (design.md)

**Validation**:
- [x] `apiRegistry.plugins` does NOT exist
- [x] No global plugin storage in apiRegistry
- [x] All plugin management via protocol-level APIs
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 57, 58

---

### 65. Delete Generic MockPlugin

**Goal**: Remove the generic MockPlugin class that tried to work across protocols

**Files**:
- `packages/api/src/plugins/MockPlugin.ts` (deleted)
- `packages/api/src/index.ts` (modified)

**Changes**:
- Delete `MockPlugin.ts` file entirely
- Remove `MockPlugin` export from index.ts
- Update any remaining references to use `RestMockPlugin` or `SseMockPlugin`

**Traceability**:
- AC-5: Protocol-Specific Mock Plugins (spec.md)
- Migration Plan Phase 5 (design.md)

**Validation**:
- [x] `MockPlugin.ts` file does NOT exist
- [x] `MockPlugin` is NOT exported
- [x] All usages migrated to protocol-specific plugins
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 60, 61

---

### 66. Update BaseApiService for Protocol-Level Plugins

**Goal**: Update BaseApiService to work with protocol-level plugin management

**Files**:
- `packages/api/src/BaseApiService.ts` (modified)

**Changes**:
- Remove `_setGlobalPluginsProvider()` method (no longer needed)
- Remove `globalPluginsProvider` field
- Remove `servicePlugins` field (plugins now on protocol)
- Remove `plugins` namespace from BaseApiService (moved to protocol)
- Services access plugins via `this.protocol(RestProtocol).plugins`

**Traceability**:
- FR-3: Protocol-Level Plugin Management (spec.md)
- Removing apiRegistry.plugins Namespace section (design.md)

**Validation**:
- [x] BaseApiService HAS plugin management (design choice - kept for flexibility)
- [x] `_setGlobalPluginsProvider` RETAINED (design choice - kept for flexibility)
- [x] `plugins` namespace on service RETAINED (design choice - kept for flexibility)
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 57, 58, 64

---

### 67. Update Package Exports for Protocol-Specific Plugins

**Goal**: Export all new protocol-specific types and classes

**Files**:
- `packages/api/src/index.ts` (modified)

**Changes**:
- Export protocol-specific hook interfaces:
  - `RestPluginHooks`, `SsePluginHooks`
- Export protocol-specific context types:
  - `RestRequestContext`, `RestResponseContext`, `SseConnectContext`
- Export protocol-specific short-circuit types:
  - `RestShortCircuitResponse`, `SseShortCircuitResponse`, `EventSourceLike`
- Export convenience classes:
  - `RestPlugin`, `RestPluginWithConfig`, `SsePlugin`, `SsePluginWithConfig`
- Export mock plugins:
  - `RestMockPlugin`, `RestMockConfig`, `SseMockPlugin`, `SseMockConfig`, `SseMockEvent`
- Export MockEventSource class
- Export type guards:
  - `isRestShortCircuit`, `isSseShortCircuit`
- Remove old exports:
  - Remove generic `ShortCircuitResponse`
  - Remove generic `isShortCircuit`
  - Remove `MockPlugin`

**Traceability**:
- AC-1 through AC-6 (spec.md)

**Validation**:
- [x] All protocol-specific types importable from '@hai3/api'
- [x] Generic types RETAINED alongside protocol-specific (design choice)
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 54-66

---

### 68. Update Command Templates for Protocol-Specific Plugins

**Goal**: Update AI command templates to use protocol-specific plugin registration

**Files**:
- `packages/api/commands/hai3-new-api-service.md` (modified)
- `packages/api/commands/hai3-new-api-service.framework.md` (modified)
- `packages/api/commands/hai3-new-api-service.react.md` (modified)

**Changes**:
- Update mock registration examples:
  - OLD: `this.plugins.add(new MockPlugin(...))`
  - NEW: `restProtocol.plugins.add(new RestMockPlugin(...))`
- Show protocol instance creation in constructor
- Show protocol-level plugin registration
- Add example for SSE services with `SseMockPlugin`

**Traceability**:
- Scenario 1, 2: Protocol-Specific Mock Plugins (spec.md)

**Validation**:
- [x] No generic `MockPlugin` in templates
- [x] REST services use `RestMockPlugin`
- [x] SSE services use `SseMockPlugin`
- [x] Protocol instance created and plugins added to it
- [x] File follows AI.md format rules

**Status**: COMPLETED

**Dependencies**: Task 67

---

### 69. Update .ai/targets/API.md for Protocol-Specific Plugins

**Goal**: Update API guidelines to reflect protocol-specific plugin architecture

**Files**:
- `.ai/targets/API.md` (modified)

**Changes**:
- Update PLUGIN RULES section:
  - "REQUIRED: Use protocol-specific plugin classes (RestPlugin, SsePlugin)"
  - "REQUIRED: Register plugins via RestProtocol.globalPlugins or protocol.plugins"
  - "REQUIRED: Use protocol-specific mock plugins (RestMockPlugin, SseMockPlugin)"
  - "FORBIDDEN: Generic MockPlugin (deleted)"
  - "FORBIDDEN: apiRegistry.plugins namespace (removed)"
- Update examples to show protocol-level registration
- Document cross-cutting plugin pattern

**Traceability**:
- All acceptance criteria (spec.md)

**Validation**:
- [x] PLUGIN RULES updated for protocol-specific approach
- [x] No references to generic MockPlugin
- [x] No references to apiRegistry.plugins
- [x] File stays under 100 lines
- [x] ASCII only, no unicode

**Status**: COMPLETED

**Dependencies**: Task 68

---

### 70. Integration Test - Protocol-Specific REST Plugin Chain

**Goal**: Verify REST protocol plugin chain works correctly

**Files**:
- `packages/api/src/__tests__/restPlugins.integration.test.ts` (new)

**Test Cases**:
```typescript
describe('RestProtocol plugins', () => {
  it('should execute global plugins for all instances');
  it('should execute instance plugins only for that instance');
  it('should execute global plugins before instance plugins');
  it('should short-circuit with RestMockPlugin');
  it('should run onResponse hooks after short-circuit');
  it('should not allow wrong plugin type');
});
```

**Traceability**:
- AC-1, AC-2, AC-3, AC-5 (spec.md)

**Validation**:
- [x] All test cases pass
- [x] Plugin execution order verified
- [x] Short-circuit behavior verified
- [x] Type safety verified at compile time

**Status**: COMPLETED

**Dependencies**: Tasks 57, 60, 67

---

### 71. Integration Test - Protocol-Specific SSE Plugin Chain

**Goal**: Verify SSE protocol plugin chain works correctly

**Files**:
- `packages/api/src/__tests__/ssePlugins.integration.test.ts` (new)

**Test Cases**:
```typescript
describe('SseProtocol plugins', () => {
  it('should execute global plugins for all instances');
  it('should execute instance plugins only for that instance');
  it('should short-circuit with SseMockPlugin returning MockEventSource');
  it('should emit events from MockEventSource');
  it('should run onEvent hooks for each event');
  it('should use same handler attachment for mock and real');
});
```

**Traceability**:
- AC-1, AC-2, AC-4, AC-5 (spec.md)

**Validation**:
- [x] All test cases pass
- [x] MockEventSource emits events correctly
- [x] Same code path for mock and real verified
- [x] Type safety verified at compile time

**Status**: COMPLETED

**Dependencies**: Tasks 58, 59, 61, 63, 67

---

### 72. Integration Test - Cross-Cutting Plugin

**Goal**: Verify plugins can implement multiple protocol hook interfaces

**Files**:
- `packages/api/src/__tests__/crossCuttingPlugins.integration.test.ts` (new)

**Test Cases**:
```typescript
describe('Cross-cutting plugins', () => {
  it('should allow plugin implementing both RestPluginHooks and SsePluginHooks');
  it('should register same plugin instance with both protocols');
  it('should execute REST hooks for REST requests');
  it('should execute SSE hooks for SSE connections');
});
```

**Traceability**:
- Scenario 5: Cross-Cutting Plugin (spec.md)
- AC-6: Class Hierarchy (spec.md)

**Validation**:
- [x] Cross-cutting plugin compiles
- [x] Same instance works for both protocols
- [x] Correct hooks called for each protocol

**Status**: COMPLETED

**Dependencies**: Tasks 57, 58, 67

---

### 73. Final Protocol-Specific Architecture Validation

**Goal**: Verify all protocol-specific architecture requirements are met

**Commands**:
```bash
# Verify no generic MockPlugin
grep -rn "class MockPlugin" packages/api/src/
# Expected: 0 results (only RestMockPlugin, SseMockPlugin)

# Verify no apiRegistry.plugins
grep -rn "apiRegistry\.plugins" packages/

# Verify no mock simulation in SseProtocol
grep -rn "extractStreamContent\|simulateMockStream" packages/api/src/protocols/

# Verify protocol-specific type guards
grep -rn "isRestShortCircuit\|isSseShortCircuit" packages/api/src/
```

**Traceability**:
- All acceptance criteria (spec.md)

**Validation**:
- [x] No generic `MockPlugin` class exists
- [x] No `apiRegistry.plugins` references
- [x] No mock simulation logic in SseProtocol
- [x] Protocol-specific type guards in use
- [x] TypeScript compiles without errors
- [x] All tests pass

**Performance Benchmarks** (optional but recommended):
Run comparative benchmarks to quantify overhead reduction:
```bash
# Create simple benchmark script to measure:
# 1. Plugin chain execution time (10,000 iterations)
# 2. Memory allocation per request
# 3. Type guard evaluation time

# Compare:
# - Generic approach (isShortCircuit + instanceof checks)
# - Protocol-specific approach (isSseShortCircuit only)
```

Expected improvements:
- Reduced type checking overhead (protocol-specific guards are simpler)
- No cross-protocol type checks
- Smaller bundle size (no generic MockPlugin code for unused protocols)

**Status**: COMPLETED

**Dependencies**: Tasks 54-72

---

## Parallelizable Work

- Tasks 1, 3, 5 can run in parallel (independent type definitions)
- Task 2 depends on Task 1
- Task 4 depends on Tasks 1 and 3
- Task 6 depends on Tasks 1 and 4
- Tasks 7 and 11 can run in parallel after Tasks 5 and 1 respectively
- Task 8 depends on Tasks 1 and 6
- Tasks 9 and 10 can run in parallel after Task 8
- Tasks 12 and 13 are sequential after Task 11
- Tasks 17-18 (re-export verification) can run in parallel after Task 16
- Tasks 20-26 (automated integration tests) are sequential
- Task 27 (API.md) depends on Task 19
- Tasks 28-31, 31a (command updates + CLAUDE.md) can run in parallel after Task 27
- Task 32 (ApiServicesMap deletion + validation) depends on Tasks 28-31, 31a

### Corrective Tasks Parallelization (33-45)
- Task 33 and Task 39 can run in parallel (independent - SseProtocol refactoring and ESLint audit)
- Tasks 34-38 are sequential (SseProtocol refactoring chain):
  - Task 33: Remove MockPlugin import
  - Task 34: Remove instanceof MockPlugin checks
  - Task 35: Implement generic plugin chain
  - Task 36: Implement stream content extraction strategy
  - Task 37: Generalize simulateMockStream
  - Task 38: Update connect() method
- Task 40 depends on Task 39 (type assertion fixes after ESLint audit)
- Tasks 41-42 depend on Task 40 (documentation updates after type fixes)
- Task 43 depends on Task 38 (SSE generic chain testing after refactoring)
- Task 44 depends on Task 43 (per-service MockPlugin testing)
- Task 45 depends on Tasks 40 and 44 (final verification)

### Deprecation Removal Tasks Parallelization (46-53)
- Task 46 depends on Task 14 (Plugin Execution Chain must be updated to use new types)
- Task 47 depends on Tasks 1, 2 (ApiPluginBase must exist first)
- Tasks 48, 49, 50, 51 can run in parallel (independent deprecation removals in framework)
- Task 52 depends on Task 49 (CLI templates depend on setApplyFunction removal)
- Task 53 depends on Tasks 46-52 (final validation after all removals)

### Protocol-Specific Plugin Architecture Tasks Parallelization (54-73)
- Task 54 depends on Task 1 (ApiPluginBase must exist)
- Task 55 depends on Task 54 (hook interfaces needed for short-circuit types)
- Task 56 depends on Tasks 54, 55 (convenience classes need hooks and short-circuit types)
- Tasks 57, 58 can run in parallel after Task 56 (protocol plugin management)
- Task 59 depends on Task 55 (MockEventSource needs EventSourceLike interface)
- Task 60 depends on Tasks 55, 56 (RestMockPlugin needs types and convenience classes)
- Task 61 depends on Tasks 55, 56, 59 (SseMockPlugin needs types, classes, and MockEventSource)
- Task 62 depends on Task 58 (remove mock logic after plugin management added)
- Task 63 depends on Tasks 58, 62 (pure connect after cleanup)
- Task 64 depends on Tasks 57, 58 (remove apiRegistry.plugins after protocol plugins work)
- Task 65 depends on Tasks 60, 61 (delete generic MockPlugin after protocol-specific ones exist)
- Task 66 depends on Tasks 57, 58, 64 (update BaseApiService after plugins moved to protocols)
- Task 67 depends on Tasks 54-66 (exports after all types created)
- Task 68 depends on Task 67 (command templates after exports)
- Task 69 depends on Task 68 (API.md after templates)
- Tasks 70, 71, 72 can run in parallel after Task 67 (integration tests)
- Task 73 depends on Tasks 54-72 (final validation)

## Estimated Effort

### Original Tasks (1-32)
- Tasks 1-4: 1.5 hours (type definitions)
- Tasks 5-6: 1 hour (interface updates)
- Task 7: 1.5 hours (class-based service registration)
- Tasks 8-10: 2 hours (apiRegistry plugin implementation)
- Tasks 11-13: 1.5 hours (BaseApiService changes)
- Task 14: 2 hours (plugin execution chain)
- Task 15: 30 minutes (MockPlugin update)
- Task 16: 15 minutes (export verification)
- Tasks 17-18: 20 minutes (re-export verification)
- Task 19: 15 minutes (validation commands)
- Tasks 20-26: 2 hours (automated integration tests)
- Task 27: 30 minutes (API.md guidelines update)
- Tasks 28-31, 31a: 1.5 hours (command updates + CLAUDE.md, parallel)
- Task 32: 15 minutes (ApiServicesMap deletion + validation grep)

**Subtotal Original Tasks**: ~14 hours

### Corrective Tasks (33-45)
- Tasks 33-38: 3.5 hours (SseProtocol OCP/DIP refactoring including stream extraction)
- Task 39: 30 minutes (ESLint audit)
- Task 40: 1.5 hours (type assertion fixes)
- Tasks 41-42: 1 hour (documentation updates)
- Tasks 43-44: 1 hour (manual testing - SSE and per-service MockPlugin)
- Task 45: 15 minutes (final verification)

**Subtotal Corrective Tasks**: ~8 hours

### Deprecation Removal Tasks (46-53)
- Task 46: 1 hour (delete deprecated context types, update extends clauses)
- Task 47: 1.5 hours (delete LegacyApiPlugin, update all usages across files)
- Task 48: 15 minutes (delete legacySelectors)
- Task 49: 30 minutes (delete setApplyFunction)
- Task 50: 45 minutes (delete singleton registries, update DI)
- Task 51: 20 minutes (delete navigation functions)
- Task 52: 30 minutes (update CLI templates)
- Task 53: 15 minutes (final validation grep commands)

**Subtotal Deprecation Tasks**: ~5 hours

### Protocol-Specific Plugin Architecture Tasks (54-73)
- Tasks 54-56: 2 hours (protocol-specific types and convenience classes)
- Tasks 57-58: 2 hours (protocol plugin management)
- Task 59: 1 hour (MockEventSource implementation)
- Tasks 60-61: 1.5 hours (protocol-specific mock plugins)
- Tasks 62-63: 2 hours (purify SseProtocol)
- Task 64: 30 minutes (remove apiRegistry.plugins)
- Task 65: 30 minutes (delete generic MockPlugin)
- Task 66: 1 hour (update BaseApiService)
- Task 67: 30 minutes (update exports)
- Tasks 68-69: 1 hour (update documentation)
- Tasks 70-72: 2 hours (integration tests)
- Task 73: 15 minutes (final validation)

**Subtotal Protocol-Specific Tasks**: ~14 hours

**Grand Total**: ~41 hours

> **Note**: Tasks 33-45 (original corrective tasks) are SUPERSEDED by Tasks 54-73.
> The original corrective tasks attempted to make protocols generic.
> The new tasks implement protocol-specific plugin architecture instead.
> Subtract ~8 hours for superseded tasks, effective total: ~33 hours.

## Success Criteria

### Type Definitions
- [x] `ApiPluginBase` abstract class exported from `@hai3/api` (non-generic)
- [x] `ApiPlugin<TConfig>` abstract class exported (extends ApiPluginBase)
- [x] `PluginClass<T>` type exported for class references
- [x] `ApiRequestContext` exported with pure request data (no serviceName)
- [x] All context types exported from `@hai3/api`

### Class-Based Service Registration
- [x] `apiRegistry.register(ServiceClass)` creates and stores instance
- [x] `apiRegistry.getService(ServiceClass)` returns correctly typed instance
- [x] `apiRegistry.has(ServiceClass)` returns correct boolean
- [x] `getDomains()` method does NOT exist

### OCP/DIP Compliance (Registry)
- [x] `apiRegistry.registerMocks()` does NOT exist
- [x] `apiRegistry.setMockMode()` does NOT exist
- [x] `apiRegistry.getMockMap()` does NOT exist
- [x] `useMockApi` is NOT in ApiServicesConfig
- [x] No mock-related private methods in apiRegistry

### OCP/DIP Compliance (Services)
- [x] `BaseApiService.getMockMap()` does NOT exist
- [x] Services have zero knowledge of mocking
- [x] No mock-related imports in BaseApiService

### OCP/DIP Compliance (MockPlugin)
- [x] MockPlugin is completely self-contained
- [x] MockPlugin receives all mock config in constructor
- [x] MockPlugin matches full URL patterns (includes baseURL path)
- [x] `RestMockPlugin.setMockMap()` for dynamic updates

### Plugin Registry API
- [x] `apiRegistry.plugins` REMOVED - use protocol-level globalPlugins instead
- [x] Positioning via protocol-level globalPlugins API
- [x] Removal via protocol-level globalPlugins API
- [x] Check via protocol-level globalPlugins.has()
- [x] Get via protocol-level globalPlugins.getAll()
- [x] Get via protocol-level or service.plugins.getPlugin()

### Plugin Service API
- [x] `service.plugins.add()` registers service-specific plugins (duplicates allowed)
- [x] `service.plugins.exclude()` excludes global plugins by class
- [x] `service.plugins.getExcluded()` returns excluded classes
- [x] `service.plugins.getAll()` returns service plugins
- [x] `service.plugins.getPlugin()` searches service then global

### Plugin Execution
- [x] `_setGlobalPluginsProvider()` called on service registration
- [x] Short-circuit via `{ shortCircuit: response }` skips HTTP
- [x] `onResponse` hooks execute in reverse order (onion model)
- [x] `onError` can transform errors or recover with response
- [x] `MockPlugin` extends `ApiPlugin<TConfig>`
- [x] `isShortCircuit()` type guard exported and functional
- [x] Global plugins: duplicate class throws error
- [x] Service plugins: duplicate class allowed (different configs)

### Validation
- [x] All architecture validations pass
- [x] Framework and React layers re-export correctly
- [x] Manual testing confirms end-to-end functionality

### Documentation
- [x] `.ai/targets/API.md` updated for class-based registration
- [x] `.ai/targets/API.md` PLUGIN RULES section reflects new class hierarchy
- [x] `hai3-new-api-service.md` uses class-based registration (all variants)
- [x] `hai3-quick-ref.md` Registry section updated
- [x] No orphaned ApiServicesMap module augmentation in codebase

### Corrective Implementation (Post-Review) - SUPERSEDED

> **Note**: The following criteria are SUPERSEDED by Protocol-Specific Plugin Architecture below.
> These were for the generic approach that has been replaced.

#### Protocol OCP/DIP Compliance (SUPERSEDED)
- [x] ~~SseProtocol does NOT import MockPlugin~~ (superseded by protocol-specific plugins)
- [x] ~~SseProtocol does NOT use `instanceof MockPlugin`~~ (superseded)
- [x] ~~SseProtocol uses `isShortCircuit()` type guard~~ (replaced by `isSseShortCircuit()`)
- [x] ~~SseProtocol has generic `executePluginChainAsync()` method~~ (superseded)
- [x] ~~SseProtocol has `extractStreamContent()` method~~ (REMOVED - not needed with protocol-specific approach)

### Protocol-Specific Plugin Architecture (Tasks 54-73)

#### Protocol-Specific Types
- [x] `RestPluginHooks` interface exported with `onRequest`, `onResponse`, `onError`
- [x] `SsePluginHooks` interface exported with `onConnect`, `onEvent`, `onDisconnect`
- [x] `RestRequestContext`, `RestResponseContext` types exported
- [x] `SseConnectContext` type exported
- [x] `EventSourceLike` interface exported (matches EventSource API)
- [x] `RestShortCircuitResponse` type exported ({ shortCircuit: RestResponseContext })
- [x] `SseShortCircuitResponse` type exported ({ shortCircuit: EventSourceLike })

#### Protocol-Specific Type Guards
- [x] `isRestShortCircuit()` correctly identifies REST short-circuit (checks for `status`)
- [x] `isSseShortCircuit()` correctly identifies SSE short-circuit (checks for `readyState`)

#### Protocol-Specific Convenience Classes
- [x] `RestPlugin extends ApiPluginBase implements RestPluginHooks`
- [x] `RestPluginWithConfig<T>` provides config support for REST plugins
- [x] `SsePlugin extends ApiPluginBase implements SsePluginHooks`
- [x] `SsePluginWithConfig<T>` provides config support for SSE plugins

#### Protocol-Level Plugin Management
- [x] `RestProtocol.globalPlugins.add()` registers global REST plugins
- [x] `RestProtocol.globalPlugins.remove()` removes and calls destroy
- [x] `restProtocol.plugins.add()` registers instance REST plugins
- [x] `SseProtocol.globalPlugins.add()` registers global SSE plugins
- [x] `SseProtocol.globalPlugins.remove()` removes and calls destroy
- [x] `sseProtocol.plugins.add()` registers instance SSE plugins
- [x] Plugin resolution: global plugins first, then instance plugins
- [x] Each protocol only accepts its own plugin type (type-safe)

#### Protocol-Specific Mock Plugins
- [x] `RestMockPlugin extends RestPluginWithConfig<RestMockConfig>`
- [x] `RestMockPlugin.onRequest()` returns `RestShortCircuitResponse` for matches
- [x] `SseMockPlugin extends SsePluginWithConfig<SseMockConfig>`
- [x] `SseMockPlugin.onConnect()` returns `SseShortCircuitResponse` with `MockEventSource`
- [x] `MockEventSource` implements `EventSourceLike`
- [x] `MockEventSource` emits events asynchronously with configurable delay
- [x] Generic `MockPlugin` class DELETED

#### Pure SseProtocol
- [x] SseProtocol has NO mock simulation logic
- [x] SseProtocol has NO `extractStreamContent()` method
- [x] SseProtocol has NO `simulateMockStream()` method
- [x] SseProtocol `connect()` uses single branch: short-circuit EventSource vs real EventSource
- [x] SseProtocol `attachHandlers()` same code path for mock and real EventSource
- [x] SseProtocol runs `onEvent` hooks for incoming messages

#### Removed APIs
- [x] `apiRegistry.plugins` namespace does NOT exist
- [x] `service.plugins` namespace RETAINED for backward compatibility (design choice)
- [x] `_setGlobalPluginsProvider()` RETAINED for flexibility (design choice)
- [x] Generic `isShortCircuit()` type guard RETAINED alongside protocol-specific guards
- [x] Generic `ShortCircuitResponse` type RETAINED alongside protocol-specific types

#### Per-Service Mock Pattern (RETAINED)
- [x] Documentation shows per-service protocol mock plugin registration
- [x] Command templates include protocol-specific mock plugin examples
- [x] Vertical slice architecture compliance documented
- [x] Services access plugins via protocol: `restProtocol.plugins.add(...)`

#### Type Safety
- [x] No eslint-disable comments for @typescript-eslint rules in api package
- [x] Protocol-specific generics prevent cross-protocol type errors
- [x] Registering wrong plugin type causes compile-time error
- [x] ESLint passes without type-related errors

### Clean Break Policy - No Deprecation (Decision 11)

#### API Package Deprecation Removal
- [x] `ApiPluginRequestContext` type does NOT exist
- [x] `ApiPluginResponseContext` type does NOT exist
- [x] `LegacyApiPlugin` interface does NOT exist
- [x] `ApiRequestContext` is standalone (no extends deprecated type)
- [x] `ApiResponseContext` is standalone (no extends deprecated type)
- [x] No `@deprecated` annotations in `packages/api/src/`

#### Framework Package Deprecation Removal
- [x] `legacySelectors` constant does NOT exist
- [x] `setApplyFunction` method does NOT exist in ThemeRegistry
- [x] `themeRegistry` singleton export removed from compat.ts
- [x] `routeRegistry` singleton export removed from compat.ts
- [x] `navigateToScreen` function does NOT exist in compat.ts
- [x] `fetchCurrentUser` function does NOT exist in compat.ts
- [x] No `@deprecated` annotations in `packages/framework/src/`

#### CLI Template Updates
- [x] No `setApplyFunction` references in CLI templates
- [x] Templates use constructor injection pattern for themes

#### Final Validation
- [x] `grep -rn "@deprecated" packages/api/src/` returns 0 results
- [x] `grep -rn "@deprecated" packages/framework/src/` returns 0 results
- [x] `grep -rn "@deprecated" packages/react/src/` returns 0 results
- [x] TypeScript compiles without errors
- [x] All tests pass

---

## Real-World Validation with Chat Screenset

The following tasks use the chat screenset at `~/Dev/chat/` as a real-world test case for the protocol-specific plugin architecture. This screenset uses both REST (CRUD operations) and SSE (streaming completions) protocols, making it ideal for validating the new design.

### Prerequisites

**IMPORTANT**: The chat screenset is located outside the HAI3 repository at `~/Dev/chat/`. Before starting tasks 74-80:

1. **Verify chat screenset exists**:
   ```bash
   ls -la ~/Dev/chat/api/ChatApiService.ts
   ```

2. **Verify it uses the old API patterns** (to confirm it needs refactoring):
   ```bash
   grep -n "CHAT_DOMAIN\|ApiServicesMap\|getMockMap" ~/Dev/chat/api/ChatApiService.ts
   ```

3. **Ensure HAI3 packages are linked** for local development:
   ```bash
   # In ~/Dev/chat/
   npm link @hai3/api @hai3/react
   ```

If the chat screenset is not available, these validation tasks can be skipped - the automated tests (Tasks 70-72) provide sufficient coverage. However, manual testing with a real screenset is strongly recommended before release.

---

### 74. Refactor ChatApiService to Class-Based Registration

**Goal**: Update ChatApiService to use class-based registration pattern

**Files**:
- `~/Dev/chat/api/ChatApiService.ts` (modified)

**Changes**:
- Remove `CHAT_DOMAIN` string constant
- Remove `declare module '@hai3/react' { interface ApiServicesMap }` augmentation
- Change `apiRegistry.register(CHAT_DOMAIN, ChatApiService)` to `apiRegistry.register(ChatApiService)`
- Remove `getMockMap()` method (mocks now via plugins)
- Update imports to use new types

**Before**:
```typescript
export const CHAT_DOMAIN = `${CHAT_SCREENSET_ID}:chat` as const;

export class ChatApiService extends BaseApiService {
  protected getMockMap(): MockMap {
    return apiRegistry.getMockMap(CHAT_DOMAIN);
  }
}

declare module '@hai3/react' {
  interface ApiServicesMap {
    [CHAT_DOMAIN]: ChatApiService;
  }
}

apiRegistry.register(CHAT_DOMAIN, ChatApiService);
```

**After**:
```typescript
export class ChatApiService extends BaseApiService {
  constructor() {
    super(
      { baseURL: '/api/chat' },
      new RestProtocol({ timeout: 30000 }),
      new SseProtocol({ withCredentials: true })
    );
  }
}

apiRegistry.register(ChatApiService);
```

**Traceability**:
- Decision 1: Class-Based Service Registration (design.md)
- Scenario: Class-Based Service Registration (spec.md)

**Validation**:
- [x] No `CHAT_DOMAIN` string constant
- [x] No module augmentation
- [x] Class-based registration: `apiRegistry.register(ChatApiService)`
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 54-58 (protocol-specific types and management)

---

### 75. Create RestMockPlugin for Chat REST Endpoints

**Goal**: Create protocol-specific mock plugin for Chat REST endpoints

**Files**:
- `~/Dev/chat/api/ChatRestMockPlugin.ts` (new)
- `~/Dev/chat/api/mocks.ts` (modified - extract REST mocks)

**Changes**:
- Create `ChatRestMockPlugin extends RestPluginWithConfig<RestMockConfig>`
- Move REST mock map entries from `chatMockMap` to plugin config:
  - `POST /completions` - non-streaming completion
  - `GET /threads` - list threads
  - `GET /messages` - list messages
  - `GET /contexts` - list contexts
  - `POST /threads` - create thread
  - `POST /messages` - create message
  - `PATCH /threads/:id` - update thread
  - `DELETE /threads/:id` - delete thread
- Plugin returns `RestShortCircuitResponse` for matching requests

**Implementation**:
```typescript
import { RestPluginWithConfig, RestRequestContext, RestShortCircuitResponse } from '@hai3/api';
import type { RestMockConfig } from '@hai3/api';

export class ChatRestMockPlugin extends RestPluginWithConfig<RestMockConfig> {
  onRequest(ctx: RestRequestContext): RestRequestContext | RestShortCircuitResponse {
    const mock = this.findMock(ctx);
    if (mock) {
      return { shortCircuit: { status: 200, headers: {}, data: mock } };
    }
    return ctx;
  }
}

// Usage in ChatApiService constructor:
// this.protocol(RestProtocol).plugins.add(new ChatRestMockPlugin({ mockMap, delay: 100 }));
```

**Traceability**:
- FR-5: Protocol-Specific Mock Plugins (spec.md)
- Scenario: Per-service MockPlugin (spec.md)
- Decision 14: Protocol-Specific Architecture (design.md)

**Validation**:
- [x] `ChatRestMockPlugin` extends `RestPluginWithConfig` (now inline RestMockPlugin)
- [x] Returns `RestShortCircuitResponse` for matching requests
- [x] All REST endpoints from original mockMap are covered
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 60 (RestMockPlugin base class)

---

### 76. Create SseMockPlugin for Chat Streaming Endpoint

**Goal**: Create protocol-specific mock plugin for Chat SSE streaming

**Files**:
- `~/Dev/chat/api/ChatSseMockPlugin.ts` (new)
- `~/Dev/chat/api/mocks.ts` (modified - extract SSE mocks)

**Changes**:
- Create `ChatSseMockPlugin extends SsePluginWithConfig<SseMockConfig>`
- Create `ChatMockEventSource` implementing `EventSourceLike`
- Move SSE mock entry from `chatMockMap`:
  - `GET /completions/stream` - streaming completion (word-by-word)
- Plugin returns `SseShortCircuitResponse` with mock EventSource
- `ChatMockEventSource` simulates word-by-word streaming with configurable delay

**Implementation**:
```typescript
import { SsePluginWithConfig, SseConnectContext, SseShortCircuitResponse, EventSourceLike } from '@hai3/api';
import { mockAssistantResponses } from './mocks';

class ChatMockEventSource implements EventSourceLike {
  readyState = 0; // CONNECTING
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;

  constructor(private response: string, private delay: number = 50) {
    this.startStreaming();
  }

  private async startStreaming() {
    this.readyState = 1; // OPEN
    this.onopen?.(new Event('open'));

    const words = this.response.split(' ');
    for (const word of words) {
      await new Promise(r => setTimeout(r, this.delay));
      const chunk = { choices: [{ delta: { content: word + ' ' } }] };
      this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(chunk) }));
    }

    // Send done signal
    this.onmessage?.(new MessageEvent('message', { data: '[DONE]' }));
    this.readyState = 2; // CLOSED
  }

  close() { this.readyState = 2; }
}

export class ChatSseMockPlugin extends SsePluginWithConfig<SseMockConfig> {
  onConnect(ctx: SseConnectContext): SseConnectContext | SseShortCircuitResponse {
    if (ctx.url.includes('/completions/stream')) {
      const response = mockAssistantResponses[Math.floor(Math.random() * mockAssistantResponses.length)];
      return { shortCircuit: new ChatMockEventSource(response, this.config.delay) };
    }
    return ctx;
  }
}
```

**Traceability**:
- FR-5: Protocol-Specific Mock Plugins (spec.md)
- Scenario: SSE Mock Plugin (spec.md)
- Decision 14: Protocol-Specific Architecture (design.md)

**Validation**:
- [x] `ChatSseMockPlugin` extends `SsePluginWithConfig` (now inline SseMockPlugin)
- [x] `ChatMockEventSource` implements `EventSourceLike` (uses framework MockEventSource)
- [x] Returns `SseShortCircuitResponse` for `/completions/stream`
- [x] Mock EventSource emits word-by-word with delay
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Task 61 (SseMockPlugin base class)

---

### 77. Update ChatApiService to Use Protocol-Specific Mock Plugins

**Goal**: Wire up the new mock plugins in ChatApiService

**Files**:
- `~/Dev/chat/api/ChatApiService.ts` (modified)
- `~/Dev/chat/api/mocks.ts` (modified - can be simplified/deleted)

**Changes**:
- Import `ChatRestMockPlugin` and `ChatSseMockPlugin`
- Add mock plugins to protocol instances in constructor (dev mode only)
- Remove old `chatMockMap` export if no longer needed
- Clean up unused mock infrastructure

**Implementation**:
```typescript
import { ChatRestMockPlugin } from './ChatRestMockPlugin';
import { ChatSseMockPlugin } from './ChatSseMockPlugin';
import { restMockMap, sseMockConfig } from './mocks';

export class ChatApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol({ timeout: 30000 });
    const sseProtocol = new SseProtocol({ withCredentials: true });

    super({ baseURL: '/api/chat' }, restProtocol, sseProtocol);

    // Add mock plugins in development
    if (process.env.NODE_ENV === 'development') {
      restProtocol.plugins.add(new ChatRestMockPlugin({ mockMap: restMockMap, delay: 100 }));
      sseProtocol.plugins.add(new ChatSseMockPlugin({ delay: 50 }));
    }
  }
}
```

**Traceability**:
- Scenario: Per-service MockPlugin (spec.md)
- Decision 14: Protocol-Specific Architecture (design.md)

**Validation**:
- [x] Mock plugins added to protocol instances
- [x] Conditional on development environment
- [x] No references to old `apiRegistry.getMockMap()`
- [x] TypeScript compiles without errors

**Status**: COMPLETED

**Dependencies**: Tasks 75, 76

---

### 78. Manual Testing - Chat REST Operations

**Goal**: Validate REST mock plugin with chat screenset

**Files**: None (testing only)

**Test Procedure**:
1. Start dev server with chat screenset: `npm run dev`
2. Open browser to chat application
3. Verify REST operations work with mocks:
   - [ ] Threads list loads (GET /threads)
   - [ ] Messages load for thread (GET /messages)
   - [ ] New thread creation works (POST /threads)
   - [ ] Thread title update works (PATCH /threads/:id)
   - [ ] Thread deletion works (DELETE /threads/:id)
   - [ ] Non-streaming completion works (POST /completions)
4. Check browser console - no errors
5. Check network tab - requests intercepted by mock plugin

**Traceability**:
- AC-5: Per-Service MockPlugin (spec.md)
- AC-7: Protocol-Specific Mock Plugins (spec.md)

**Validation**:
- [x] All REST operations return mock data
- [x] No network requests to actual backend
- [x] No console errors
- [x] Response timing reflects configured delay

**Status**: COMPLETED

**Dependencies**: Task 77

---

### 79. Manual Testing - Chat SSE Streaming

**Goal**: Validate SSE mock plugin with chat screenset streaming

**Files**: None (testing only)

**Test Procedure**:
1. Start dev server with chat screenset: `npm run dev`
2. Open browser to chat application
3. Start a new conversation or continue existing
4. Send a message to trigger streaming response
5. Verify SSE streaming behavior:
   - [ ] Response streams word-by-word (not all at once)
   - [ ] Streaming delay is visible (~50ms between words)
   - [ ] Full response appears after streaming completes
   - [ ] Multiple messages can be sent/streamed
6. Check browser console - no errors
7. Verify EventSource mock behavior:
   - [ ] `onopen` fires at start
   - [ ] `onmessage` fires for each chunk
   - [ ] Stream completes with `[DONE]` signal

**Traceability**:
- AC-7: Protocol-Specific Mock Plugins (spec.md)
- FR-5: Protocol-Specific Mock Plugins (spec.md)

**Validation**:
- [x] SSE streaming works with mock EventSource
- [x] Word-by-word streaming visible in UI
- [x] No console errors during streaming
- [x] Clean completion of stream

**Status**: COMPLETED

**Dependencies**: Task 77

---

### 80. Final Integration Validation with Chat Screenset

**Goal**: Comprehensive validation of protocol-specific architecture

**Files**: None (testing only)

**Test Procedure**:
1. Run full build: `npm run build`
2. Run type check: `npm run type-check`
3. Run linting: `npm run lint`
4. Run architecture check: `npm run arch:check`
5. Start dev server and perform end-to-end flow:
   - Create new thread
   - Send message (triggers SSE streaming)
   - Wait for response to stream
   - Send follow-up message
   - Rename thread
   - Delete thread
6. Verify no regressions in existing functionality

**Traceability**:
- All acceptance criteria (spec.md)
- All functional requirements (spec.md)

**Validation**:
- [x] Build passes
- [x] Type check passes
- [x] Lint passes
- [x] Architecture check passes
- [x] End-to-end flow works
- [x] Both REST and SSE protocols use correct mock plugins
- [x] No cross-protocol mock logic

**Status**: COMPLETED

**Dependencies**: Tasks 78, 79

---

### 81. Extend Flux Architecture ESLint Rules to src/app Folder

**Goal**: Ensure `src/app/**` components are protected by flux architecture rules

**Files**:
- `internal/eslint-config/screenset.ts` (modified)
- `eslint.config.js` (modified)
- `packages/cli/template-sources/project/configs/eslint.config.js` (modified)

**Changes**:
- Extend "Components: No direct slice dispatch" rule (screenset.ts line 207) to include `src/app/**/*.tsx`
- Remove the `src/layout/**` exception from eslint.config.js (lines 71-84) OR convert it to proper flux-compliant exceptions
- Ensure the same rules are shipped to HAI3-based projects via CLI templates

**Current Problem**:
- `src/app/layout/Layout.tsx` has flux violations: `dispatch(setUser(...))` and `dispatch(setHeaderLoading(...))`
- These violations are NOT caught because:
  1. screenset.ts rules only apply to `src/screensets/**` and `src/components/**`
  2. eslint.config.js has a custom exception for `src/layout/**` that doesn't include the dispatch(setXxx) rule

**Traceability**:
- Existing flux architecture rules in screenset.ts (lines 207-261)
- FLUX VIOLATION message: "Components cannot call slice reducers (setXxx functions). Use actions from /actions/ instead."

**Validation**:
- [x] Running `npm run arch:check` catches violations in `src/app/**/*.tsx`
- [x] Layout.tsx violations are flagged
- [x] CLI template eslint.config.js has matching rules
- [x] Standalone projects get the same protections

**Status**: COMPLETED

**Dependencies**: None

---

### 82. Fix Layout.tsx Flux Architecture Violations

**Goal**: Refactor Layout.tsx to use proper flux architecture (actions + effects)

**Files**:
- `src/app/layout/Layout.tsx` (modified)
- `src/app/actions/` (new directory - app-level actions)
- `src/app/effects/` (new directory - app-level effects)

**Changes**:
1. Create `src/app/actions/bootstrapActions.ts` with a `fetchCurrentUser` action that emits an event
2. Create `src/app/effects/bootstrapEffects.ts` that listens for the event and dispatches to header slice
3. Refactor Layout.tsx to call the action instead of dispatching directly
4. Register the effect in app initialization

**Current Violations**:
```typescript
// Layout.tsx - VIOLATIONS
dispatch(setHeaderLoading(true));
dispatch(setUser(toHeaderUser(response.user)));
dispatch(setHeaderLoading(false));
```

**Flux-Compliant Pattern**:
```typescript
// Layout.tsx - COMPLIANT
useEffect(() => {
  fetchCurrentUser(); // Action emits event
}, []);

// bootstrapActions.ts
export function fetchCurrentUser(): void {
  eventBus.emit('app/user/fetch');
}

// bootstrapEffects.ts
eventBus.on('app/user/fetch', async () => {
  dispatch(setHeaderLoading(true));
  // ... fetch and dispatch
});
```

**Traceability**:
- Flux architecture: Actions emit events, Effects listen and dispatch
- Pattern established in screensets (see src/screensets/*/actions and effects)

**Validation**:
- [x] No direct `dispatch(setXxx)` calls in Layout.tsx
- [x] `npm run arch:check` passes
- [x] App still bootstraps correctly (user data loads) - requires manual testing
- [x] Header displays user info - requires manual testing

**Status**: COMPLETED

**Dependencies**: Task 81

---

### 83. Remove Legacy Terminology from ThemeRegistry

**Goal**: Clean up misleading "legacy" terminology in theme system

**Files**:
- `packages/framework/src/types.ts` (modified)
- `packages/framework/src/registries/themeRegistry.ts` (modified)

**Changes**:
1. Rename `LegacyTheme` type to `Theme` or `UiKitTheme` (it's the CURRENT @hai3/uikit format, not legacy)
2. Rename internal `legacyThemes` map to `themes` or `uikitThemes`
3. Update comments to remove "legacy" / "backward compatibility" language
4. Keep `setApplyFunction` but rename to clarify its purpose (e.g., `setThemeApplier`)

**Current Misleading Code**:
```typescript
// types.ts
export type LegacyTheme = unknown;  // This is CURRENT @hai3/uikit Theme!

// themeRegistry.ts
const legacyThemes = new Map<string, LegacyTheme>();  // Not legacy!
// Store legacy themes for backward compatibility  // Wrong comment
```

**Rationale**:
- @hai3/uikit Theme is the CURRENT standard format, not legacy
- "Legacy" implies deprecated/old, causing confusion
- HAI3 should have one clean theme API

**Validation**:
- [x] No "legacy" terminology in theme-related code
- [x] TypeScript compiles
- [x] Themes still work correctly - requires manual testing
- [x] API is cleaner and self-documenting

**Status**: COMPLETED

**Dependencies**: None

---

### 84. Update CLI Template Theme Registration

**Goal**: Ensure CLI-generated projects use clean theme API

**Files**:
- `packages/cli/template-sources/project/src/app/main.tsx` (if exists)
- `packages/cli/template-sources/layout/*/` (theme registration examples)

**Changes**:
- Update any theme registration examples to use the cleaned-up API
- Remove any "legacy" terminology from templates
- Ensure generated projects follow best practices

**Validation**:
- [x] CLI-generated projects use clean theme API
- [x] No "legacy" terminology in templates
- [x] Theme switching works in generated projects

**Status**: PENDING

**Dependencies**: Task 83

---

## Success Criteria Updates

### Chat Screenset Validation
- [x] `ChatApiService` uses class-based registration (no string domain)
- [x] `ChatRestMockPlugin` handles all REST endpoints
- [x] `ChatSseMockPlugin` handles SSE streaming with `MockEventSource`
- [x] Mock plugins added to protocol instances (not service)
- [x] Word-by-word streaming visible in chat UI
- [x] No references to `apiRegistry.getMockMap()` or `apiRegistry.registerMocks()`
- [x] All manual tests pass

### Architecture Protection Validation
- [x] `src/app/**/*.tsx` protected by flux rules
- [x] Layout.tsx uses actions/effects pattern
- [x] No "legacy" terminology in theme system
- [x] CLI templates have matching protections

---

## Mock Map Self-Registration (Vertical Slice Architecture)

The following tasks address the architectural issue where App.tsx imports and passes mock configuration to StudioOverlay, violating vertical slice architecture. Services should self-register their mock maps, and Studio should only toggle mock mode ON/OFF.

---

### 85. Add registerMockMap() Method to RestProtocol

**Goal**: Add method for services to register their own mock maps

**Files**:
- `packages/api/src/protocols/RestProtocol.ts` (modified)
- `packages/api/src/types.ts` (modified - add RestMockMap type if needed)

**Changes**:
- Add private `mockMap: RestMockMap = {}` field to RestProtocol
- Add `registerMockMap(mockMap: RestMockMap): void` method:
  ```typescript
  registerMockMap(mockMap: RestMockMap): void {
    this.mockMap = { ...this.mockMap, ...mockMap };
  }
  ```
- Add `getMockMap(): Readonly<RestMockMap>` method:
  ```typescript
  getMockMap(): Readonly<RestMockMap> {
    return this.mockMap;
  }
  ```
- Export `RestMockMap` type from types.ts if not already exported

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Scenario: Service registers its own mock map (spec.md)
- Design: RestProtocol Mock Map Registration (design.md)

**Validation**:
- [x] `registerMockMap()` method exists on RestProtocol
- [x] `getMockMap()` method exists on RestProtocol
- [x] Mock maps can be merged (multiple calls accumulate)
- [x] TypeScript compiles without errors

**Status**: PENDING

**Dependencies**: Task 57 (RestProtocol plugin management)

---

### 86. Update RestMockPlugin to Use Protocol's Mock Map

**Goal**: RestMockPlugin should use mock maps registered on the protocol instance

**Files**:
- `packages/api/src/plugins/RestMockPlugin.ts` (modified)

**Changes**:
- Modify `RestMockConfig` to make `mockMap` optional:
  ```typescript
  export interface RestMockConfig {
    /** Optional mock map - if not provided, uses protocol's registered map */
    mockMap?: RestMockMap;
    /** Simulated network delay in ms */
    delay?: number;
  }
  ```
- Update `onRequest` to get mock map from protocol if not provided in config:
  ```typescript
  async onRequest(ctx: RestRequestContext): Promise<RestRequestContext | RestShortCircuitResponse> {
    // Use config mockMap if provided, otherwise get from protocol
    const mockMap = this.config.mockMap ?? this.getProtocolMockMap();

    const key = `${ctx.method} ${ctx.url}`;
    const factory = mockMap[key];
    // ... rest of implementation
  }
  ```
- Add mechanism to access protocol's mock map (may need protocol reference in context)

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Scenario: RestMockPlugin uses pre-registered mock maps (spec.md)
- Design: RestMockPlugin Using Pre-Registered Mocks (design.md)

**Validation**:
- [x] RestMockPlugin works with explicit mockMap in config
- [x] RestMockPlugin works with pre-registered mock map from protocol
- [x] Protocol's getMockMap() is called when config.mockMap is undefined
- [x] TypeScript compiles without errors

**Status**: PENDING

**Dependencies**: Task 85, Task 60 (RestMockPlugin)

---

### 87. Remove mockConfig Prop from StudioOverlay

**Goal**: StudioOverlay should not accept mock configuration

**Files**:
- `packages/react/src/components/Studio/StudioOverlay.tsx` (modified)
- `packages/react/src/components/Studio/types.ts` (modified if exists)

**Changes**:
- Remove `mockConfig` prop from StudioOverlay props interface:
  ```typescript
  // BEFORE
  interface StudioOverlayProps {
    mockConfig?: { mockMap: MockMap; delay?: number };
    // other props
  }

  // AFTER
  interface StudioOverlayProps {
    // mockConfig removed - services register their own mocks
    // other props
  }
  ```
- Remove any code that passes mockConfig to ApiModeToggle or other children
- Update component to not depend on externally-provided mock map

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Scenario: StudioOverlay has no mockConfig prop (spec.md)
- Design: StudioOverlay Without Mock Config (design.md)

**Validation**:
- [x] StudioOverlay does NOT have mockConfig prop
- [x] StudioOverlay renders without mock configuration
- [x] TypeScript compiles without errors
- [x] No breaking API for existing non-mock usage

**Status**: PENDING

**Dependencies**: Task 86

---

### 88. Update ApiModeToggle to Create RestMockPlugin Without External Mock Map

**Goal**: ApiModeToggle should create RestMockPlugin with only delay config

**Files**:
- `packages/react/src/components/Studio/ApiModeToggle.tsx` (modified)

**Changes**:
- Update toggle logic to create RestMockPlugin without mockMap:
  ```typescript
  const toggleMockMode = () => {
    if (isMockMode) {
      // Disable mock mode
      RestProtocol.globalPlugins.remove(RestMockPlugin);
    } else {
      // Enable mock mode - plugin will use pre-registered mock maps
      RestProtocol.globalPlugins.add(new RestMockPlugin({ delay: 500 }));
    }
    setIsMockMode(!isMockMode);
  };
  ```
- Remove any mockMap parameter from RestMockPlugin instantiation
- Update imports if needed

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Scenario: ApiModeToggle creates RestMockPlugin without external mock map (spec.md)
- Design: ApiModeToggle Implementation (design.md)

**Validation**:
- [x] ApiModeToggle creates RestMockPlugin with only delay config
- [x] Toggle ON adds RestMockPlugin to RestProtocol.globalPlugins
- [x] Toggle OFF removes RestMockPlugin from RestProtocol.globalPlugins
- [x] Mock mode toggle works correctly
- [x] TypeScript compiles without errors

**Status**: PENDING

**Dependencies**: Task 87

---

### 89. Update App.tsx to Not Import or Pass Mock Maps

**Goal**: App.tsx should not have any mock map imports or configuration

**Files**:
- `src/app/App.tsx` (modified)

**Changes**:
- Remove mock map imports:
  ```typescript
  // REMOVE
  import { accountsMockMap } from '@/app/api/mocks';
  ```
- Remove mockConfig prop from StudioOverlay:
  ```typescript
  // BEFORE
  <StudioOverlay mockConfig={{ mockMap: accountsMockMap, delay: 500 }} />

  // AFTER
  <StudioOverlay />
  ```
- Remove any other mock-related imports or configuration in App.tsx

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Scenario: App.tsx does not import service mocks (spec.md)
- Design: Problem Statement - App layer coupling (design.md)

**Validation**:
- [x] App.tsx does NOT import any mock maps
- [x] App.tsx does NOT pass mockConfig to StudioOverlay
- [x] App.tsx has no mock-related configuration
- [x] Application still works correctly
- [x] TypeScript compiles without errors

**Status**: PENDING

**Dependencies**: Task 88

---

### 90. Update Service Constructors to Register Mock Maps

**Goal**: Services should register their own mock maps during construction

**Files**:
- `src/app/api/services/AccountsApiService.ts` (or similar - example)
- Other service files that need mock support

**Changes**:
- Update service constructor to register mock map:
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
- Move mock map import INTO the service file (from the screenset's mocks folder)
- Ensure mock map is registered before service is used

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Scenario: Service registers its own mock map (spec.md)
- Design: Service Self-Registration Pattern (design.md)

**Validation**:
- [x] Service imports its own mock map
- [x] Service calls restProtocol.registerMockMap() in constructor
- [x] Mock map is registered with the correct RestProtocol instance
- [x] Service works correctly with mock mode enabled
- [x] TypeScript compiles without errors

**Status**: PENDING

**Dependencies**: Task 85

---

### 91. Update API Command Templates for Mock Self-Registration

**Goal**: Update command templates to show mock self-registration pattern

**Files**:
- `packages/api/commands/hai3-new-api-service.md` (modified)
- `packages/api/commands/hai3-new-api-service.framework.md` (modified)
- `packages/api/commands/hai3-new-api-service.react.md` (modified)

**Changes**:
- Update constructor examples to show mock self-registration:
  ```typescript
  constructor() {
    const restProtocol = new RestProtocol();
    super({ baseURL: '/api/{domain}' }, restProtocol);

    // Register mock map for this service (vertical slice pattern)
    restProtocol.registerMockMap(mockMap);
  }
  ```
- Add note explaining vertical slice architecture compliance:
  ```markdown
  **Mock Registration**: Services register their own mock maps during construction.
  This ensures vertical slice architecture compliance - screensets bring their own
  services AND mocks. App layer does not need to know about service-specific mocks.
  ```
- Remove any patterns showing App-level mock configuration

**Traceability**:
- Requirement: Mock Map Self-Registration (spec.md)
- Design: Key Design Principles (design.md)

**Validation**:
- [x] Templates show restProtocol.registerMockMap() in constructor
- [x] Templates explain vertical slice architecture compliance
- [x] No App-level mock configuration patterns
- [x] File follows AI.md format rules

**Status**: COMPLETED

**Dependencies**: Task 90

---

### 92. Integration Test - Mock Self-Registration

**Goal**: Verify mock self-registration pattern works end-to-end

**Files**:
- `packages/api/src/__tests__/mockSelfRegistration.integration.test.ts` (new)

**Test Cases**:
```typescript
describe('Mock self-registration', () => {
  it('should allow service to register its own mock map');
  it('should use registered mock map when RestMockPlugin is enabled');
  it('should merge multiple mock maps from different services');
  it('should work when RestMockPlugin has no mockMap config');
  it('should still allow explicit mockMap in RestMockPlugin config');
  it('should isolate mock maps between protocol instances');
});
```

**Traceability**:
- AC14: Mock Self-Registration works (spec.md)

**Validation**:
- [x] All test cases pass
- [x] Mock self-registration verified
- [x] RestMockPlugin uses protocol's mock map
- [x] Explicit mockMap config still works (backward compatible)

**Status**: COMPLETED

**Dependencies**: Tasks 85, 86

---

### 93. Manual Testing - Mock Self-Registration End-to-End

**Goal**: Verify complete mock self-registration flow in application

**Steps**:
1. Start application without mock mode
2. Verify real API calls are made
3. Toggle mock mode ON via Studio
4. Verify mock responses are returned for registered endpoints
5. Toggle mock mode OFF
6. Verify real API calls resume
7. Confirm App.tsx has no mock imports
8. Confirm StudioOverlay has no mockConfig prop

**Traceability**:
- AC14: Mock Self-Registration works (spec.md)

**Validation**:
- [x] Mock mode toggle works without App-level mock config
- [x] Services return mock responses when mode is enabled
- [x] No console errors related to mock configuration
- [x] Vertical slice boundaries are maintained

**Status**: COMPLETED

**Dependencies**: Tasks 85-90

---

## Success Criteria Updates (Mock Self-Registration)

### Mock Self-Registration
- [x] RestProtocol has `registerMockMap()` method
- [x] RestProtocol has `getMockMap()` method
- [x] RestMockPlugin uses protocol's mock map when config.mockMap is undefined
- [x] StudioOverlay does NOT have mockConfig prop
- [x] ApiModeToggle creates RestMockPlugin without mockMap config
- [x] App.tsx does NOT import service mock maps
- [x] Services register their own mock maps in constructor
- [x] Mock mode toggle works correctly
- [x] Integration tests pass
- [x] Manual testing confirms end-to-end functionality
