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
- [ ] `ApiPluginBase` abstract class is exported
- [ ] All lifecycle methods are optional
- [ ] No generic type parameters
- [ ] TypeScript compiles without errors

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
- [ ] `ApiPlugin<TConfig>` abstract class is exported
- [ ] Extends `ApiPluginBase`
- [ ] Uses parameter property for config
- [ ] TypeScript compiles without errors

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
- [ ] `ApiRequestContext` has only pure request data (method, url, headers, body)
- [ ] `ApiRequestContext` does NOT have serviceName
- [ ] All context properties are readonly
- [ ] `ShortCircuitResponse` type is exported
- [ ] TypeScript compiles without errors

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
- [ ] `PluginClass<T>` type is exported
- [ ] `isShortCircuit` function is exported
- [ ] Type guard narrows type correctly
- [ ] TypeScript compiles without errors

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
- [ ] `register()` takes class constructor
- [ ] `getService()` takes class constructor, returns typed instance
- [ ] `has()` takes class constructor
- [ ] `getDomains()` is NOT defined
- [ ] `registerMocks()` is NOT defined (OCP/DIP)
- [ ] `setMockMode()` is NOT defined (OCP/DIP)
- [ ] `getMockMap()` is NOT defined (OCP/DIP)
- [ ] `useMockApi` is NOT in ApiServicesConfig (OCP/DIP)
- [ ] TypeScript compiles without errors

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
- [ ] ApiRegistry interface includes `plugins` namespace object
- [ ] All plugin methods defined with correct signatures
- [ ] `getPlugin()` method defined
- [ ] JSDoc includes code examples
- [ ] TypeScript compiles without errors

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
- [ ] `register(ServiceClass)` creates and stores instance
- [ ] `getService(ServiceClass)` returns correctly typed instance
- [ ] `has(ServiceClass)` returns correct boolean
- [ ] `getDomains()` does not exist
- [ ] `registerMocks()` does not exist (OCP/DIP)
- [ ] `setMockMode()` does not exist (OCP/DIP)
- [ ] `getMockMap()` does not exist (OCP/DIP)
- [ ] No mock-related code in apiRegistry (OCP/DIP)
- [ ] `_setGlobalPluginsProvider()` called on registration
- [ ] TypeScript compiles without errors

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
- [ ] `plugins.add()` appends plugins in FIFO order
- [ ] `plugins.add()` throws on duplicate plugin class
- [ ] `plugins.getAll()` returns readonly array in execution order
- [ ] `plugins.has()` returns true/false based on class
- [ ] `plugins.getPlugin()` returns instance or undefined
- [ ] TypeScript compiles without errors

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
- [ ] `plugins.addBefore()` inserts before target
- [ ] `plugins.addAfter()` inserts after target
- [ ] Throws on non-existent target plugin class
- [ ] Throws on duplicate plugin class
- [ ] Throws on circular dependency
- [ ] TypeScript compiles without errors

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
- [ ] `plugins.remove()` removes plugin from storage (found by instanceof)
- [ ] `plugins.remove()` calls `destroy()` if available
- [ ] `plugins.remove()` throws if plugin not registered
- [ ] `reset()` calls `destroy()` on all plugins
- [ ] `reset()` clears globalPlugins array
- [ ] TypeScript compiles without errors

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
- [ ] `_setGlobalPluginsProvider()` method exists
- [ ] Method is internal (underscore convention)
- [ ] Global plugins accessible via provider
- [ ] `getMockMap()` does NOT exist (OCP/DIP)
- [ ] No mock-related code in BaseApiService (OCP/DIP)
- [ ] TypeScript compiles without errors

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
- [ ] `plugins.add()` appends plugins to service-specific storage
- [ ] `plugins.add()` allows duplicates of same class
- [ ] `plugins.exclude()` stores plugin classes for exclusion
- [ ] `plugins.getExcluded()` returns readonly array of classes
- [ ] `plugins.getAll()` returns service plugins only
- [ ] `plugins.getPlugin()` searches service then global
- [ ] Service plugins are separate from global plugins
- [ ] TypeScript compiles without errors

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
- [ ] Global plugins come before service plugins
- [ ] Excluded plugin classes are filtered out (via instanceof)
- [ ] `getMergedPluginsReversed()` returns correct reverse order
- [ ] TypeScript compiles without errors

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
- [ ] `onRequest` methods execute in FIFO order
- [ ] Short-circuit return stops chain and skips HTTP
- [ ] `onResponse` methods execute in reverse order
- [ ] `onError` can transform error or recover with response
- [ ] Request context has pure request data (no serviceName)
- [ ] TypeScript compiles without errors

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
- [ ] `MockPlugin` extends `ApiPlugin<MockPluginConfig>`
- [ ] Uses `this.config.mockMap` for mock data
- [ ] Matches full URL patterns (includes baseURL path)
- [ ] Uses short-circuit to return mock responses
- [ ] `setMockMap()` allows dynamic updates
- [ ] No dependency on registry mock methods
- [ ] Supports optional delay via `this.config.delay`
- [ ] No concurrency issues (MockPlugin is stateless except for config)
- [ ] TypeScript compiles without errors

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
- [ ] All new types importable from '@hai3/api'
- [ ] `ApiPluginBase` class importable from '@hai3/api'
- [ ] `ApiPlugin` class importable from '@hai3/api'
- [ ] `isShortCircuit` function importable from '@hai3/api'
- [ ] `apiRegistry.plugins.add()` method available
- [ ] TypeScript compiles without errors

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
- [ ] `import { ApiPluginBase, ApiPlugin, apiRegistry } from '@hai3/framework'` works
- [ ] `import { MockPlugin } from '@hai3/framework'` works
- [ ] TypeScript compiles without errors

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
- [ ] `import { ApiPluginBase, ApiPlugin, apiRegistry } from '@hai3/react'` works
- [ ] TypeScript compiles without errors

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
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] Architecture tests pass
- [ ] Dependency rules validated

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
- [ ] Test file created/updated
- [ ] All test cases pass: `npm run test -- packages/api/src/__tests__/apiRegistry.integration.test.ts`
- [ ] Type inference verified via TypeScript compilation

**Status**: NOT STARTED

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
- [ ] Test file created/updated
- [ ] All test cases pass: `npm run test -- packages/api/src/__tests__/apiRegistry.plugins.test.ts`
- [ ] FIFO ordering verified
- [ ] Duplicate detection verified
- [ ] has() and getPlugin() behavior verified

**Status**: NOT STARTED

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
- [ ] Test cases added to existing test file
- [ ] All positioning test cases pass
- [ ] addAfter positions correctly verified
- [ ] addBefore positions correctly verified
- [ ] Error cases verified (invalid target, duplicates)

**Status**: NOT STARTED

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
- [ ] Test file created
- [ ] All test cases pass: `npm run test -- packages/api/src/__tests__/shortCircuit.integration.test.ts`
- [ ] Mock data returned correctly
- [ ] Header verification passes
- [ ] onResponse hook execution verified

**Status**: NOT STARTED

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
- [ ] Test file created
- [ ] All test cases pass: `npm run test -- packages/api/src/__tests__/servicePlugins.integration.test.ts`
- [ ] Exclusion behavior verified
- [ ] Non-excluded services verified
- [ ] Service-level duplicate allowance verified

**Status**: NOT STARTED

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
- [ ] Test cases added to existing test file
- [ ] Registry-level getPlugin() verified
- [ ] Service-level search priority verified
- [ ] Fallback to global plugins verified
- [ ] Type inference verified via TypeScript compilation

**Status**: NOT STARTED

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
- [ ] Test file created
- [ ] All test cases pass: `npm run test -- packages/api/src/__tests__/globalPluginsInjection.integration.test.ts`
- [ ] Before-registration injection verified
- [ ] After-registration injection verified (provider pattern)
- [ ] Derived class simplicity verified

**Status**: NOT STARTED

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
- [ ] File stays under 100 lines
- [ ] ASCII only, no unicode
- [ ] Rules use keywords (REQUIRED, FORBIDDEN, STOP)
- [ ] No duplication with other target files

**Status**: NOT STARTED

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
- [ ] No string domain registration
- [ ] No module augmentation
- [ ] No `registerMocks()` references (OCP/DIP)
- [ ] Constructor takes no parameters
- [ ] File follows AI.md format rules

**Status**: NOT STARTED

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
- [ ] No string domain registration
- [ ] No module augmentation
- [ ] Imports from @hai3/framework

**Status**: NOT STARTED

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
- [ ] No string domain registration
- [ ] No module augmentation
- [ ] Effects use class-based getService
- [ ] Imports from @hai3/react

**Status**: NOT STARTED

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
- [ ] No string domain constant
- [ ] No module augmentation
- [ ] Class-based registration only

**Status**: NOT STARTED

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
- [ ] No `apiRegistry.register('string',` patterns
- [ ] No `apiRegistry.getService('string')` patterns
- [ ] No `apiRegistry.registerMocks()` references
- [ ] No `apiRegistry.setMockMode()` references
- [ ] No `ApiServicesMap` module augmentation examples
- [ ] Plugin examples extend `ApiPluginBase` or `ApiPlugin<TConfig>`
- [ ] Examples use namespaced plugin API (`plugins.add`)

**Status**: NOT STARTED

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
- [ ] `ApiServicesMap` interface does NOT exist in types.ts
- [ ] `ApiServicesMap` is NOT exported from index.ts
- [ ] No ApiServicesMap module augmentation in src/
- [ ] No ApiServicesMap module augmentation in app code
- [ ] TypeScript compiles without errors
- [ ] `grep -rn "ApiServicesMap" packages/api/src/` returns 0 results

**Status**: NOT STARTED

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
- [ ] No MockPlugin import in SseProtocol.ts
- [ ] TypeScript compiles without errors
- [ ] No runtime errors in SSE functionality

**Status**: NOT STARTED

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
- [ ] No `instanceof MockPlugin` in SseProtocol.ts
- [ ] No string literal 'MockPlugin' in SseProtocol.ts
- [ ] TypeScript compiles without errors

**Status**: NOT STARTED

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
- [ ] `executePluginChainAsync()` method implemented
- [ ] Uses `isShortCircuit()` type guard (not instanceof)
- [ ] connect() method uses the new plugin chain
- [ ] TypeScript compiles without errors

**Status**: NOT STARTED

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
- [ ] `extractStreamContent()` method handles string input
- [ ] `extractStreamContent()` method handles OpenAI chat completion format
- [ ] `extractStreamContent()` method handles SSE content wrapper
- [ ] `extractStreamContent()` method falls back to JSON for unknown formats
- [ ] Type guards properly narrow types
- [ ] No MockPlugin references in extraction logic
- [ ] TypeScript compiles without errors

**Status**: NOT STARTED

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
- [ ] Method renamed to `simulateStreamFromShortCircuit`
- [ ] Accepts `ApiResponseContext` parameter
- [ ] Uses `extractStreamContent()` for data handling
- [ ] Works with any plugin's short-circuit response
- [ ] No MockPlugin-specific logic inside the method
- [ ] TypeScript compiles without errors

**Status**: NOT STARTED

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
- [ ] connect() builds proper ApiRequestContext
- [ ] connect() executes plugin chain before connecting
- [ ] Short-circuit detection uses `isShortCircuit()` type guard
- [ ] Real SSE connection only established when no short-circuit
- [ ] TypeScript compiles without errors
- [ ] SSE mock functionality still works

**Status**: NOT STARTED

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
- [ ] All eslint-disable comments documented
- [ ] Each comment categorized as legitimate vs needs-fix
- [ ] List of files/lines requiring type fixes created

**Status**: NOT STARTED

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
- [ ] No new eslint-disable comments added
- [ ] Type assertions minimized (only where truly necessary)
- [ ] All types properly inferred or explicitly typed
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without type-related errors

**Status**: NOT STARTED

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
- [ ] Per-service MockPlugin example in all command variants
- [ ] Warning about global MockPlugin for screensets
- [ ] Examples show proper constructor pattern
- [ ] File follows AI.md format rules

**Status**: NOT STARTED

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
- [ ] PLUGIN RULES updated with per-service pattern
- [ ] Vertical slice compliance documented
- [ ] File stays under 100 lines
- [ ] ASCII only, no unicode

**Status**: NOT STARTED

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
- [ ] SSE mock streaming works via generic plugin chain
- [ ] No MockPlugin-specific code in SseProtocol
- [ ] Real SSE connections work when no short-circuit
- [ ] Console shows no errors

**Status**: NOT STARTED

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
- [ ] Service A returns mock data from its own MockPlugin
- [ ] Service B returns mock data from its own MockPlugin
- [ ] No mock data cross-contamination between services
- [ ] Services can be independently registered and work correctly

**Status**: NOT STARTED

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
- [ ] No eslint-disable comments for @typescript-eslint rules
- [ ] Any remaining disables are documented with legitimate reasons
- [ ] ESLint passes without errors

**Status**: NOT STARTED

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
- [ ] `ApiPluginRequestContext` type does NOT exist
- [ ] `ApiPluginResponseContext` type does NOT exist
- [ ] `ApiRequestContext` is standalone (no extends)
- [ ] `ApiResponseContext` is standalone (no extends)
- [ ] No `@deprecated` annotations in types.ts
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Both must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "ApiPluginRequestContext" packages/
grep -rn "ApiPluginResponseContext" packages/
```

**Status**: NOT STARTED

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
- [ ] `LegacyApiPlugin` interface does NOT exist
- [ ] All plugin arrays use `ApiPluginBase[]` type
- [ ] No `@deprecated` annotations related to LegacyApiPlugin
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "LegacyApiPlugin" packages/
```

**Status**: NOT STARTED

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
- [ ] `legacySelectors` does NOT exist in migration.ts
- [ ] `legacySelectors` is NOT exported from index.ts
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "legacySelectors" packages/
```

**Status**: NOT STARTED

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
- [ ] `setApplyFunction` method does NOT exist in ThemeRegistry interface
- [ ] `setApplyFunction` implementation does NOT exist in themeRegistry.ts
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results (except CLI templates) - verify IMMEDIATELY after completing this task
grep -rn "setApplyFunction" packages/ --include="*.ts" | grep -v "packages/cli/"
```

**Note**: CLI templates may need updating separately. Check:
- `packages/cli/templates/src/app/themes/themeRegistry.ts`
- `packages/cli/template-sources/ai-overrides/targets/THEMES.md`

**Status**: NOT STARTED

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
- [ ] No `@deprecated` singleton exports in compat.ts
- [ ] themes.ts plugin uses proper DI (no singleton import)
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "singletonThemeRegistry\|singletonRouteRegistry" packages/framework/src/
# Also verify no deprecated singleton imports remain
grep -rn "import.*from.*compat.*themeRegistry\|import.*from.*compat.*routeRegistry" packages/framework/src/
```

**Status**: NOT STARTED

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
- [ ] `navigateToScreen` function does NOT exist in compat.ts
- [ ] `fetchCurrentUser` function does NOT exist in compat.ts
- [ ] Functions are NOT exported from index.ts
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results (plugin actions may have navigateToScreen action type) - verify IMMEDIATELY
grep -rn "navigateToScreen" packages/framework/src/ | grep -v "actions\|types"
grep -rn "fetchCurrentUser" packages/framework/src/
```

**Status**: NOT STARTED

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
- [ ] No `setApplyFunction` references in CLI templates
- [ ] Templates use constructor injection pattern
- [ ] TypeScript compiles without errors

**Immediate Verification (run after completing this task)**:
```bash
# Must return 0 results - verify IMMEDIATELY after completing this task
grep -rn "setApplyFunction" packages/cli/
```

**Status**: NOT STARTED

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
- [ ] `grep -rn "@deprecated" packages/api/src/` returns 0 results
- [ ] `grep -rn "@deprecated" packages/framework/src/` returns 0 results
- [ ] `grep -rn "@deprecated" packages/react/src/` returns 0 results
- [ ] All deprecated type grep checks return 0 results
- [ ] TypeScript compiles without errors
- [ ] All tests pass

**Status**: NOT STARTED

**Dependencies**: Tasks 46-52

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

**Total**: ~27 hours

## Success Criteria

### Type Definitions
- [ ] `ApiPluginBase` abstract class exported from `@hai3/api` (non-generic)
- [ ] `ApiPlugin<TConfig>` abstract class exported (extends ApiPluginBase)
- [ ] `PluginClass<T>` type exported for class references
- [ ] `ApiRequestContext` exported with pure request data (no serviceName)
- [ ] All context types exported from `@hai3/api`

### Class-Based Service Registration
- [ ] `apiRegistry.register(ServiceClass)` creates and stores instance
- [ ] `apiRegistry.getService(ServiceClass)` returns correctly typed instance
- [ ] `apiRegistry.has(ServiceClass)` returns correct boolean
- [ ] `getDomains()` method does NOT exist

### OCP/DIP Compliance (Registry)
- [ ] `apiRegistry.registerMocks()` does NOT exist
- [ ] `apiRegistry.setMockMode()` does NOT exist
- [ ] `apiRegistry.getMockMap()` does NOT exist
- [ ] `useMockApi` is NOT in ApiServicesConfig
- [ ] No mock-related private methods in apiRegistry

### OCP/DIP Compliance (Services)
- [ ] `BaseApiService.getMockMap()` does NOT exist
- [ ] Services have zero knowledge of mocking
- [ ] No mock-related imports in BaseApiService

### OCP/DIP Compliance (MockPlugin)
- [ ] MockPlugin is completely self-contained
- [ ] MockPlugin receives all mock config in constructor
- [ ] MockPlugin matches full URL patterns (includes baseURL path)
- [ ] `MockPlugin.setMockMap()` for dynamic updates

### Plugin Registry API
- [ ] `apiRegistry.plugins.add()` registers plugins in FIFO order (no duplicates)
- [ ] `apiRegistry.plugins.addBefore()` / `addAfter()` support positioning by class
- [ ] `apiRegistry.plugins.remove()` removes by class with cleanup
- [ ] `apiRegistry.plugins.has()` checks registration by class
- [ ] `apiRegistry.plugins.getAll()` returns ordered plugins
- [ ] `apiRegistry.plugins.getPlugin()` returns instance by class

### Plugin Service API
- [ ] `service.plugins.add()` registers service-specific plugins (duplicates allowed)
- [ ] `service.plugins.exclude()` excludes global plugins by class
- [ ] `service.plugins.getExcluded()` returns excluded classes
- [ ] `service.plugins.getAll()` returns service plugins
- [ ] `service.plugins.getPlugin()` searches service then global

### Plugin Execution
- [ ] `_setGlobalPluginsProvider()` called on service registration
- [ ] Short-circuit via `{ shortCircuit: response }` skips HTTP
- [ ] `onResponse` hooks execute in reverse order (onion model)
- [ ] `onError` can transform errors or recover with response
- [ ] `MockPlugin` extends `ApiPlugin<TConfig>`
- [ ] `isShortCircuit()` type guard exported and functional
- [ ] Global plugins: duplicate class throws error
- [ ] Service plugins: duplicate class allowed (different configs)

### Validation
- [ ] All architecture validations pass
- [ ] Framework and React layers re-export correctly
- [ ] Manual testing confirms end-to-end functionality

### Documentation
- [ ] `.ai/targets/API.md` updated for class-based registration
- [ ] `.ai/targets/API.md` PLUGIN RULES section reflects new class hierarchy
- [ ] `hai3-new-api-service.md` uses class-based registration (all variants)
- [ ] `hai3-quick-ref.md` Registry section updated
- [ ] No orphaned ApiServicesMap module augmentation in codebase

### Corrective Implementation (Post-Review)

#### Protocol OCP/DIP Compliance
- [ ] SseProtocol does NOT import MockPlugin
- [ ] SseProtocol does NOT use `instanceof MockPlugin`
- [ ] SseProtocol uses `isShortCircuit()` type guard for short-circuit detection
- [ ] SseProtocol has generic `executePluginChainAsync()` method
- [ ] SseProtocol has `extractStreamContent()` method with type guards
- [ ] `extractStreamContent()` handles: string, OpenAI format, SSE content wrapper, fallback JSON
- [ ] `simulateMockStream` renamed to `simulateStreamFromShortCircuit`
- [ ] Stream simulation works with any short-circuit response, not just MockPlugin
- [ ] SseProtocol follows same pattern as RestProtocol for plugin chain execution

#### Per-Service MockPlugin Pattern
- [ ] Documentation shows per-service MockPlugin registration
- [ ] Command templates include per-service MockPlugin examples
- [ ] Vertical slice architecture compliance documented
- [ ] Warning against global MockPlugin for screensets included

#### Type Safety
- [ ] No eslint-disable comments for @typescript-eslint rules in api package
- [ ] Type assertions minimized and properly documented
- [ ] Type guards used instead of instanceof where appropriate
- [ ] ESLint passes without type-related errors

### Clean Break Policy - No Deprecation (Decision 11)

#### API Package Deprecation Removal
- [ ] `ApiPluginRequestContext` type does NOT exist
- [ ] `ApiPluginResponseContext` type does NOT exist
- [ ] `LegacyApiPlugin` interface does NOT exist
- [ ] `ApiRequestContext` is standalone (no extends deprecated type)
- [ ] `ApiResponseContext` is standalone (no extends deprecated type)
- [ ] No `@deprecated` annotations in `packages/api/src/`

#### Framework Package Deprecation Removal
- [ ] `legacySelectors` constant does NOT exist
- [ ] `setApplyFunction` method does NOT exist in ThemeRegistry
- [ ] `themeRegistry` singleton export removed from compat.ts
- [ ] `routeRegistry` singleton export removed from compat.ts
- [ ] `navigateToScreen` function does NOT exist in compat.ts
- [ ] `fetchCurrentUser` function does NOT exist in compat.ts
- [ ] No `@deprecated` annotations in `packages/framework/src/`

#### CLI Template Updates
- [ ] No `setApplyFunction` references in CLI templates
- [ ] Templates use constructor injection pattern for themes

#### Final Validation
- [ ] `grep -rn "@deprecated" packages/api/src/` returns 0 results
- [ ] `grep -rn "@deprecated" packages/framework/src/` returns 0 results
- [ ] `grep -rn "@deprecated" packages/react/src/` returns 0 results
- [ ] TypeScript compiles without errors
- [ ] All tests pass
