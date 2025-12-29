# Tasks for add-global-api-plugins (Class-Based Design)

## Ordered Work Items

### 1. Add ApiPlugin Abstract Base Class to types.ts

**Goal**: Add the abstract base class for all plugins using TypeScript parameter property

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `ApiPlugin<TConfig>` abstract class with:
  - TypeScript parameter property: `constructor(protected readonly config: TConfig) {}`
  - Optional `onRequest` method
  - Optional `onResponse` method
  - Optional `onError` method
  - Optional `destroy` method

**Traceability**:
- Requirement: Type Definitions (spec.md)
- Scenario: ApiPlugin abstract class with parameter property (spec.md)
- Decision 1: Class-Based over Hooks-Based (design.md)
- Decision 9: Parameter Property for Config (design.md)

**Validation**:
- [ ] `ApiPlugin<TConfig>` abstract class is exported
- [ ] Uses parameter property: `constructor(protected readonly config: TConfig) {}`
- [ ] All lifecycle methods are optional
- [ ] TypeScript compiles without errors

**Dependencies**: None

---

### 2. Add Core Context Types to types.ts

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
- Decision 4: Pure Request Data in ApiRequestContext (design.md)

**Validation**:
- [ ] `ApiRequestContext` has only pure request data (method, url, headers, body)
- [ ] `ApiRequestContext` does NOT have serviceName
- [ ] All context properties are readonly
- [ ] `ShortCircuitResponse` type is exported
- [ ] TypeScript compiles without errors

**Dependencies**: None

---

### 3. Add PluginClass Type and isShortCircuit Guard

**Goal**: Add type-safe plugin class reference type and type guard

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `PluginClass<T>` type:
  ```typescript
  export type PluginClass<T extends ApiPlugin = ApiPlugin> = abstract new (...args: any[]) => T;
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
- Decision 2: Class Reference for Plugin Identification (design.md)

**Validation**:
- [ ] `PluginClass<T>` type is exported
- [ ] `isShortCircuit` function is exported
- [ ] Type guard narrows type correctly
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 1, 2

---

### 4. Add Namespaced Plugin API to ApiRegistry Interface

**Goal**: Extend ApiRegistry interface with namespaced `plugins` object

**Files**:
- `packages/api/src/types.ts` (modified)

**Changes**:
- Add `readonly plugins: { ... }` namespace object to ApiRegistry interface:
  - `add(...plugins: ApiPlugin[]): void` - throws on duplicate class
  - `addBefore<T extends ApiPlugin>(plugin: ApiPlugin, before: PluginClass<T>): void`
  - `addAfter<T extends ApiPlugin>(plugin: ApiPlugin, after: PluginClass<T>): void`
  - `remove<T extends ApiPlugin>(pluginClass: PluginClass<T>): void` - throws if not registered
  - `has<T extends ApiPlugin>(pluginClass: PluginClass<T>): boolean`
  - `getAll(): readonly ApiPlugin[]`
- Add JSDoc with code examples for each method

**Traceability**:
- Requirement: ApiRegistry Interface Extension (Namespaced API) (spec.md)
- Scenario: ApiRegistry interface includes plugins namespace (spec.md)
- Scenario: ApiRegistry.plugins includes add() method (spec.md)
- Scenario: ApiRegistry.plugins includes addBefore() method (spec.md)
- Scenario: ApiRegistry.plugins includes addAfter() method (spec.md)
- Scenario: ApiRegistry.plugins includes remove() method (spec.md)
- Scenario: ApiRegistry.plugins includes has() method (spec.md)
- Scenario: ApiRegistry.plugins includes getAll() method (spec.md)
- Decision 7: Namespaced Plugin API (design.md)

**Validation**:
- [ ] ApiRegistry interface includes `plugins` namespace object
- [ ] `plugins.add()` method signature defined
- [ ] `plugins.addBefore()` / `plugins.addAfter()` method signatures defined
- [ ] `plugins.remove()` method signature defined
- [ ] `plugins.has()` method signature defined
- [ ] `plugins.getAll()` method signature defined
- [ ] JSDoc includes code examples
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 1, 3

---

### 5. Implement Namespaced Plugin API in apiRegistry

**Goal**: Add private storage and implement `plugins` namespace object

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Add `private globalPlugins: ApiPlugin[] = []` field to ApiRegistryImpl
- Create `readonly plugins` namespace object with implementations:
  - `add(...plugins: ApiPlugin[]): void`
    - Validate no duplicate plugin classes (via instanceof)
    - Append each plugin to globalPlugins array (FIFO)
    - Throw if duplicate class already registered
  - `getAll(): readonly ApiPlugin[]`
    - Return readonly array of plugins in execution order
  - `has<T extends ApiPlugin>(pluginClass: PluginClass<T>): boolean`
    - Return true if plugin of given class is registered

**Traceability**:
- Scenario: Register global plugins with plugins.add() (spec.md)
- Scenario: Get global plugins (spec.md)
- Scenario: Check if plugin is registered (spec.md)
- Decision 8: Duplicate Policy (Global vs Service) (design.md)

**Validation**:
- [ ] `plugins.add()` appends plugins in FIFO order
- [ ] `plugins.add()` throws on duplicate plugin class
- [ ] `plugins.getAll()` returns readonly array in execution order
- [ ] `plugins.has()` returns true/false based on class
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 1, 4

---

### 6. Implement Plugin Positioning in apiRegistry

**Goal**: Add before/after positioning via `plugins.addBefore()` and `plugins.addAfter()`

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Add to `plugins` namespace object:
  - `addBefore<T extends ApiPlugin>(plugin: ApiPlugin, before: PluginClass<T>): void`
    - Find target plugin by class (using instanceof)
    - Insert before target
    - Throw if target plugin class not found
    - Throw on duplicate plugin class
    - Detect circular dependencies and throw
  - `addAfter<T extends ApiPlugin>(plugin: ApiPlugin, after: PluginClass<T>): void`
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

**Dependencies**: Task 5

---

### 7. Implement Plugin Removal in apiRegistry

**Goal**: Add ability to remove plugins by class with cleanup via `plugins.remove()`

**Files**:
- `packages/api/src/apiRegistry.ts` (modified)

**Changes**:
- Add to `plugins` namespace object:
  - `remove<T extends ApiPlugin>(pluginClass: PluginClass<T>): void`
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

**Dependencies**: Task 5

---

### 8. Add Namespaced Plugin API to BaseApiService

**Goal**: Add namespaced `plugins` object to BaseApiService

**Files**:
- `packages/api/src/BaseApiService.ts` (modified)

**Changes**:
- Add `private servicePlugins: ApiPlugin[] = []` field
- Add `private excludedPluginClasses: Set<PluginClass> = new Set()` field
- Create `readonly plugins` namespace object with implementations:
  - `add(...plugins: ApiPlugin[]): void`
    - Append plugins to servicePlugins array (FIFO)
    - Duplicates of same class ARE allowed (different configs)
  - `exclude(...pluginClasses: PluginClass[]): void`
    - Add classes to excludedPluginClasses set
  - `getExcluded(): readonly PluginClass[]`
    - Return array of excluded plugin classes
  - `getAll(): readonly ApiPlugin[]`
    - Return service plugins (not including globals)

**Traceability**:
- Scenario: Register service-specific plugins with plugins.add() (spec.md)
- Scenario: Exclude global plugins by class (spec.md)
- Scenario: Get excluded plugin classes (spec.md)
- Scenario: Get service plugins (spec.md)
- Decision 8: Duplicate Policy (Global vs Service) (design.md)

**Validation**:
- [ ] `plugins.add()` appends plugins to service-specific storage
- [ ] `plugins.add()` allows duplicates of same class
- [ ] `plugins.exclude()` stores plugin classes for exclusion
- [ ] `plugins.getExcluded()` returns readonly array of classes
- [ ] `plugins.getAll()` returns service plugins only
- [ ] Service plugins are separate from global plugins
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 1, 3

---

### 9. Implement Plugin Merging in BaseApiService

**Goal**: Merge global and service plugins respecting exclusions by class

**Files**:
- `packages/api/src/BaseApiService.ts` (modified)

**Changes**:
- Import `apiRegistry` (if not already)
- Implement or update `getPluginsInOrder(): readonly ApiPlugin[]`
  - Get global plugins via `apiRegistry.plugins.getAll()`
  - Filter out plugins where `plugin instanceof excludedClass` for any excluded class
  - Append servicePlugins (FIFO)
  - Return merged array
- Implement `getPluginsReversed(): readonly ApiPlugin[]`
  - Return reversed `getPluginsInOrder()` for response phase

**Traceability**:
- Scenario: Plugin merging respects exclusions by class (spec.md)
- Scenario: Reverse order for response processing (spec.md)
- Scenario: Plugin execution follows FIFO order (spec.md)

**Validation**:
- [ ] Global plugins come before service plugins
- [ ] Excluded plugin classes are filtered out (via instanceof)
- [ ] `getPluginsReversed()` returns correct reverse order
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 5, 8

---

### 10. Implement Plugin Execution Chain

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
- Decision 4: Pure Request Data in ApiRequestContext (design.md)

**Validation**:
- [ ] `onRequest` methods execute in FIFO order
- [ ] Short-circuit return stops chain and skips HTTP
- [ ] `onResponse` methods execute in reverse order
- [ ] `onError` can transform error or recover with response
- [ ] Request context has pure request data (no serviceName)
- [ ] TypeScript compiles without errors

**Dependencies**: Task 9

---

### 11. Update MockPlugin to Extend ApiPlugin

**Goal**: Update MockPlugin to use class-based design with config

**Files**:
- `packages/api/src/plugins/MockPlugin.ts` (modified)

**Changes**:
- Remove old interface-based patterns (alpha - clean break):
  - Remove `name = 'MockPlugin'` property
  - Remove `priority = 100` property
  - Remove `implements ApiPlugin` (now `extends`)
  - Replace `ApiPluginRequestContext` with `ApiRequestContext`
  - Replace `__mockResponse` pattern with proper `ShortCircuitResponse`
- Update MockPlugin to extend `ApiPlugin<{ mockMap: MockMap; delay?: number }>`:
```typescript
type MockMap = Record<string, (body?: unknown) => unknown>;

export class MockPlugin extends ApiPlugin<{ mockMap: MockMap; delay?: number }> {
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

**Traceability**:
- Scenario: Mock plugin with short-circuit (spec.md)
- Example: MockPlugin implementation (design.md)

**Validation**:
- [ ] `MockPlugin` extends `ApiPlugin<TConfig>`
- [ ] Uses `this.config.mockMap` for mock data
- [ ] Uses short-circuit to return mock responses
- [ ] Supports optional delay via `this.config.delay`
- [ ] No `name` or `priority` properties
- [ ] No `__mockResponse` pattern (uses `ShortCircuitResponse`)
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 1, 2, 10

---

### 12. Update Package Exports

**Goal**: Ensure all new types and classes are properly exported

**Files**:
- `packages/api/src/index.ts` (modified)

**Changes**:
- Export all new types and classes:
  - `ApiPlugin` (abstract class)
  - `PluginClass` (type)
  - `ApiRequestContext` (type)
  - `ApiResponseContext` (type)
  - `ShortCircuitResponse` (type)
  - `isShortCircuit` (function)
- Export updated `MockPlugin` class
- Remove old types (alpha - no deprecation, clean break):
  - Remove `ApiPluginRequestContext` (replaced by `ApiRequestContext`)
  - Remove old `ApiPlugin` interface (replaced by abstract class)

**Traceability**:
- Acceptance Criteria: AC8 Types are exported

**Validation**:
- [ ] All new types importable from '@hai3/api'
- [ ] `ApiPlugin` class importable from '@hai3/api'
- [ ] `isShortCircuit` function importable from '@hai3/api'
- [ ] `apiRegistry.plugins.add()` method available
- [ ] Old `ApiPluginRequestContext` type removed
- [ ] TypeScript compiles without errors

**Dependencies**: Tasks 1-11

---

### 13. Verify Framework Re-exports

**Goal**: Confirm L2 layer properly re-exports updated types

**Files**:
- `packages/framework/src/index.ts` (verify, may not need changes)

**Changes**:
- Verify existing re-exports work with updated types
- No code changes expected (pass-through exports)

**Traceability**:
- Proposal: Layer Propagation section

**Validation**:
- [ ] `import { ApiPlugin, apiRegistry } from '@hai3/framework'` works
- [ ] `import { MockPlugin } from '@hai3/framework'` works
- [ ] TypeScript compiles without errors

**Dependencies**: Task 12

---

### 14. Verify React Re-exports

**Goal**: Confirm L3 layer properly re-exports updated types

**Files**:
- `packages/react/src/index.ts` (verify, may not need changes)

**Changes**:
- Verify existing re-exports work with updated types
- No code changes expected (pass-through exports)

**Traceability**:
- Proposal: Layer Propagation section

**Validation**:
- [ ] `import { ApiPlugin, apiRegistry } from '@hai3/react'` works
- [ ] TypeScript compiles without errors

**Dependencies**: Task 13

---

### 15. Run Architecture Validation

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

**Dependencies**: Task 14

---

### 16. Manual Testing - Global Plugin Registration (Namespaced API)

**Goal**: Verify global plugins work with FIFO ordering via namespaced API

**Steps**:
1. Start dev server: `npm run dev`
2. Open browser console
3. Test FIFO ordering:
   ```typescript
   class LoggingPlugin extends ApiPlugin<void> {
     constructor() { super(void 0); }
     onRequest(ctx) { console.log('1: Logging'); return ctx; }
   }
   class AuthPlugin extends ApiPlugin<{ getToken: () => string }> {
     onRequest(ctx) { console.log('2: Auth'); return ctx; }
   }
   apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken: () => 'token' }));
   ```
4. Make an API request
5. Verify console shows: "1: Logging" then "2: Auth"
6. Test `plugins.has()`: `apiRegistry.plugins.has(LoggingPlugin)` returns `true`

**Traceability**:
- Acceptance Criteria: AC1 Global plugin registration works (namespaced API)

**Validation**:
- [ ] FIFO ordering works correctly
- [ ] Duplicate class throws error
- [ ] `plugins.has()` returns correct boolean
- [ ] No console errors

**Dependencies**: Task 15

---

### 17. Manual Testing - Plugin Positioning by Class (Namespaced API)

**Goal**: Verify before/after positioning works via namespaced API

**Steps**:
1. Register plugins with positioning:
   ```typescript
   apiRegistry.plugins.add(new LoggingPlugin(), new AuthPlugin({ getToken }));
   apiRegistry.plugins.addAfter(new MetricsPlugin(), LoggingPlugin);
   ```
2. Make a request
3. Verify order: LoggingPlugin -> MetricsPlugin -> AuthPlugin

**Traceability**:
- Acceptance Criteria: AC2 Plugin positioning works (namespaced API)

**Validation**:
- [ ] `plugins.addAfter(plugin, TargetClass)` positions correctly
- [ ] `plugins.addBefore(plugin, TargetClass)` positions correctly
- [ ] Invalid class reference throws error

**Dependencies**: Task 16

---

### 18. Manual Testing - Short-Circuit

**Goal**: Verify short-circuit skips HTTP request

**Steps**:
1. Register mock plugin:
   ```typescript
   apiRegistry.plugins.add(new MockPlugin({
     mockMap: { 'GET /api/users': () => [{ id: 1, name: 'Test' }] }
   }));
   ```
2. Make request to `/api/users`
3. Verify mock data returned without network request
4. Check for `x-hai3-short-circuit: true` header in response

**Traceability**:
- Acceptance Criteria: AC5 Short-circuit works
- design.md: Short-circuit header convention

**Validation**:
- [ ] Mock data returned
- [ ] No network request made
- [ ] Response includes `x-hai3-short-circuit: true` header
- [ ] `onResponse` hooks still execute

**Dependencies**: Task 17

---

### 19. Manual Testing - Service Exclusion by Class (Namespaced API)

**Goal**: Verify services can exclude global plugins via namespaced API

**Steps**:
1. Register global auth plugin
2. Create a health check service that excludes auth:
   ```typescript
   class HealthService extends BaseApiService {
     constructor() {
       super();
       this.plugins.exclude(AuthPlugin);
     }
   }
   ```
3. Make requests to both regular and health services
4. Verify auth plugin runs for regular service but not health service

**Traceability**:
- Acceptance Criteria: AC4 Service exclusion works (namespaced API)

**Validation**:
- [ ] Excluded plugin classes do not run for the service
- [ ] Other services still receive the global plugin
- [ ] `plugins.getExcluded()` returns correct classes
- [ ] Service-level duplicates are allowed

**Dependencies**: Task 18

---

### 20. Manual Testing - Error Recovery

**Goal**: Verify onError can transform errors or recover

**Steps**:
1. Create a plugin that recovers from specific errors:
   ```typescript
   class ErrorRecoveryPlugin extends ApiPlugin<void> {
     constructor() { super(void 0); }
     onError(error: Error, request: ApiRequestContext) {
       if (error.message.includes('404')) {
         return { status: 200, headers: {}, data: { fallback: true } };
       }
       return error;
     }
   }
   ```
2. Register globally
3. Make request that would 404
4. Verify recovery response is returned

**Traceability**:
- Acceptance Criteria: AC6 Error recovery works

**Validation**:
- [ ] Error can be transformed
- [ ] Returning ApiResponseContext recovers
- [ ] Unhandled errors propagate normally

**Dependencies**: Task 19

---

### 21. Manual Testing - OCP-Compliant DI (Pure Request Data)

**Goal**: Verify plugins use DI for service-specific behavior (no serviceName in context)

**Steps**:
1. Create a rate limit plugin with pure DI:
   ```typescript
   class RateLimitPlugin extends ApiPlugin<{ limit: number }> {
     onRequest(ctx: ApiRequestContext) {
       // ctx has only pure request data (method, url, headers, body)
       console.log(`Rate limit: ${this.config.limit}`);
       return ctx;
     }
   }
   ```
2. Register different limits per service (using service-level plugins):
   ```typescript
   userService.plugins.add(new RateLimitPlugin({ limit: 100 }));
   adminService.plugins.add(new RateLimitPlugin({ limit: 1000 }));
   ```
3. Make requests from different services
4. Verify correct limits are applied per service

**Traceability**:
- Decision 3: OCP-Compliant Dependency Injection (design.md)
- Decision 4: Pure Request Data in ApiRequestContext (design.md)
- Decision 8: Duplicate Policy (Global vs Service) (design.md)

**Validation**:
- [ ] Plugin receives limits via config, not from context
- [ ] Different services get different limits via service-level plugins
- [ ] Plugin doesn't access serviceName (not available in context)
- [ ] Service-level duplicates work correctly

**Dependencies**: Task 20

---

### 22. Update Package CLAUDE.md (Shipped with @hai3/api)

**Goal**: Update package-level AI guidelines that ship with the @hai3/api package

**Files**:
- `packages/api/CLAUDE.md` (modified)

**Changes**:
- Update "Plugin System" section (lines 88-115) to use class-based pattern:
  - Replace `implements ApiPlugin` with `extends ApiPlugin<TConfig>`
  - Replace string `name` property with class reference pattern
  - Replace `priority` number with FIFO ordering explanation
  - Add `apiRegistry.plugins.add()` for global registration
  - Add `service.plugins.add()` for service-specific plugins
  - Add `service.plugins.exclude()` for excluding global plugins
- Update exports section to include new types:
  - `ApiPlugin` - Abstract base class
  - `PluginClass` - Type for class references
  - `ApiRequestContext`, `ApiResponseContext`, `ShortCircuitResponse` - Context types
  - `isShortCircuit` - Type guard function
- Keep file under 200 lines (package CLAUDE.md files are more detailed than .ai/targets/)

**Traceability**:
- AI_COMMANDS.md: Package CLAUDE.md files contain package-specific guidelines
- AI.md: Files must use declarative rules with keywords

**Validation**:
- [ ] Plugin System section updated to class-based pattern
- [ ] Global plugin registration documented (`apiRegistry.plugins.*`)
- [ ] Service-level plugins documented (`service.plugins.*`)
- [ ] Short-circuit pattern documented
- [ ] New exports listed
- [ ] File remains coherent and under 200 lines

**Dependencies**: Tasks 1-21 (after implementation complete)

---

### 23. Update .ai/targets/API.md (Monorepo Guidelines)

**Goal**: Update monorepo-specific API guidelines with new plugin rules

**Files**:
- `.ai/targets/API.md` (modified)

**Changes**:
- Update "PLUGIN RULES" section to reflect class-based API:
  - Change `Extend ApiPlugin abstract class` to `Extend ApiPlugin<TConfig> abstract class`
  - Add rule: `REQUIRED: Use constructor config for DI, not context access`
  - Add rule: `REQUIRED: Use class reference for plugin identification (not strings)`
  - Add rule: `FORBIDDEN: Accessing serviceName in plugin context (use service-level plugins)`
  - Update `destroy()` guidance
- Keep file under 100 lines (per AI.md rules)
- Use ASCII only, no unicode

**Traceability**:
- AI.md: Files must stay under 100 lines, ASCII only
- AI.md: Use keywords MUST, REQUIRED, FORBIDDEN

**Validation**:
- [ ] PLUGIN RULES section updated with class-based rules
- [ ] OCP-compliant DI pattern enforced via rules
- [ ] File remains under 100 lines
- [ ] ASCII only, no unicode
- [ ] Uses proper keywords (REQUIRED, FORBIDDEN)

**Dependencies**: Task 22

---

### 24. Verify App/Screenset Backward Compatibility

**Goal**: Ensure existing app and screenset code continues to work without changes

**Files**:
- `src/app/main.tsx` (verify, no changes expected)
- `src/screensets/*/api/*.ts` (verify, no changes expected)
- `packages/api/src/apiRegistry.ts` (may need internal refactor)

**Changes**:
- Verify `apiRegistry.initialize({ useMockApi: true })` still works
- Verify `apiRegistry.registerMocks(domain, mockMap)` still works
- Verify `apiRegistry.setMockMode(boolean)` still works
- Internal: Consider refactoring `enableMockMode()` to use global plugins
  - Option A: Keep per-service MockPlugin (backward compatible, simpler)
  - Option B: Use single global MockPlugin with combined mockMaps (cleaner)
- Either option must maintain the existing public API

**Traceability**:
- design.md: Migration Plan states "Non-Breaking"
- Proposal: "Maintains backward compatibility for per-service plugins"

**Validation**:
- [ ] `apiRegistry.initialize({ useMockApi: true })` works without code changes
- [ ] `apiRegistry.registerMocks(domain, mockMap)` works without code changes
- [ ] `apiRegistry.setMockMode(boolean)` toggles mock mode correctly
- [ ] Existing screenset mock maps continue to function
- [ ] No changes required in `src/app/main.tsx`
- [ ] No changes required in `src/screensets/*/api/*.ts`
- [ ] App starts and mock API calls return expected data

**Dependencies**: Tasks 5-11 (after core implementation)

---

### 25. Update hai3-new-api-service Command (SDK Layer)

**Goal**: Update SDK command to include plugin creation guidance

**Files**:
- `packages/api/commands/hai3-new-api-service.md` (modified)

**Changes**:
- Add optional plugin creation section in implementation steps
- Add example of creating a service-specific plugin extending `ApiPlugin<TConfig>`
- Add example of excluding global plugins via `this.plugins.exclude()`
- Keep existing OpenSpec workflow pattern
- Keep file under 100 lines (per AI.md rules)

**Traceability**:
- AI_COMMANDS.md: Commands are self-contained with full procedural steps
- AI_COMMANDS.md: Commands follow AI.md format rules (under 100 lines)

**Validation**:
- [ ] Plugin creation guidance added (optional section)
- [ ] `ApiPlugin<TConfig>` pattern shown
- [ ] `service.plugins.exclude()` pattern shown
- [ ] Existing OpenSpec workflow preserved
- [ ] File remains under 100 lines

**Dependencies**: Task 22

---

## Task Dependency Graph

```
Task 1 (ApiPlugin Class) ────┬─────────────────────────────────────────────┐
                             │                                             │
Task 2 (Context Types) ──────┼─────────────────────────────────────────────┼──┐
                             │                                             │  │
                             v                                             │  │
Task 3 (PluginClass + Guard)─┴──>Task 4 (Registry Interface)               │  │
                                        │                                  │  │
                                        v                                  │  │
                                 Task 5 (Storage)──>Task 6 (Positioning)   │  │
                                        │                  │               │  │
                                        │                  v               │  │
                                        │           Task 7 (Removal)       │  │
                                        │                  │               │  │
                                        v                  │               v  v
                                 Task 8 (Service Methods)──┴────>Task 9 (Merging)
                                                                      │
                                                                      v
                                                              Task 10 (Execution)
                                                                      │
                                                                      v
                                                              Task 11 (MockPlugin)
                                                                      │
                                                                      v
                                                              Task 12 (Exports)
                                                                      │
                                                         ┌────────────┴────────────┐
                                                         v                         v
                                                  Task 13 (Framework)       Task 14 (React)
                                                         │                         │
                                                         v                         v
                                                  Task 15 (Validate) <─────────────┘
                                                         │
                                                         v
                                                  Task 16 (Test Registration)
                                                         │
                                                         v
                                                  Task 17 (Test Positioning)
                                                         │
                                                         v
                                                  Task 18 (Test Short-Circuit)
                                                         │
                                                         v
                                                  Task 19 (Test Exclusion)
                                                         │
                                                         v
                                                  Task 20 (Test Error Recovery)
                                                         │
                                                         v
                                                  Task 21 (Test OCP DI)
                                                         │
                                            ┌────────────┴────────────┐
                                            v                         v
                                    Task 22                    Task 24
                               (Package CLAUDE.md)        (Backward Compat)
                                            │
                                       ┌────┴────┐
                                       v         v
                                   Task 23   Task 25
                                  (API.md)  (Command)
```

## Parallelizable Work

- Tasks 1 and 2 can run in parallel (both are type definitions)
- Task 3 depends on Tasks 1 and 2
- Tasks 5-7 (apiRegistry changes) and Task 8 (BaseApiService changes) can run in parallel after Task 4
- Task 9 depends on both apiRegistry and BaseApiService changes
- Tasks 13-14 (re-export verification) can run in parallel after Task 12
- Tasks 16-21 (manual testing) must be sequential
- Task 22 (Package CLAUDE.md) and Task 24 (Backward Compat) can run in parallel after Task 21
- Tasks 23 and 25 (API.md and Command) can run in parallel after Task 22

## Estimated Effort

- Task 1: 30 minutes (abstract class)
- Task 2: 20 minutes (context types)
- Task 3: 15 minutes (PluginClass type + guard)
- Task 4: 20 minutes (interface extension)
- Tasks 5-7: 2 hours (apiRegistry implementation)
- Tasks 8-9: 1.5 hours (BaseApiService changes)
- Task 10: 2 hours (plugin execution chain with short-circuit)
- Task 11: 30 minutes (MockPlugin update)
- Task 12: 15 minutes (export verification)
- Tasks 13-14: 20 minutes (re-export verification)
- Task 15: 15 minutes (validation commands)
- Tasks 16-21: 1.5 hours (manual testing)
- Task 22: 30 minutes (Package CLAUDE.md update)
- Task 23: 15 minutes (.ai/targets/API.md update)
- Task 24: 30 minutes (backward compatibility verification)
- Task 25: 20 minutes (hai3-new-api-service command update)

**Total**: ~11 hours

## Success Criteria

- [ ] `ApiPlugin<TConfig>` abstract class exported from `@hai3/api` (with parameter property)
- [ ] `PluginClass<T>` type exported for class references
- [ ] `ApiRequestContext` exported with pure request data (no serviceName)
- [ ] All context types exported from `@hai3/api`
- [ ] `apiRegistry.plugins.add()` registers plugins in FIFO order (no duplicates)
- [ ] `apiRegistry.plugins.addBefore()` / `addAfter()` support positioning by class
- [ ] `apiRegistry.plugins.remove()` removes by class with cleanup
- [ ] `apiRegistry.plugins.has()` checks registration by class
- [ ] `apiRegistry.plugins.getAll()` returns ordered plugins
- [ ] `service.plugins.add()` registers service-specific plugins (duplicates allowed)
- [ ] `service.plugins.exclude()` excludes global plugins by class
- [ ] `service.plugins.getExcluded()` returns excluded classes
- [ ] `service.plugins.getAll()` returns service plugins
- [ ] Short-circuit via `{ shortCircuit: response }` skips HTTP
- [ ] `onResponse` hooks execute in reverse order (onion model)
- [ ] `onError` can transform errors or recover with response
- [ ] `MockPlugin` extends `ApiPlugin<TConfig>`
- [ ] `isShortCircuit()` type guard exported and functional
- [ ] Global plugins: duplicate class throws error
- [ ] Service plugins: duplicate class allowed (different configs)
- [ ] All architecture validations pass
- [ ] Framework and React layers re-export correctly
- [ ] Manual testing confirms end-to-end functionality
- [ ] OCP-compliant DI pattern works (pure request data, service-level plugins for per-service config)
- [ ] `packages/api/CLAUDE.md` updated with class-based plugin patterns
- [ ] `.ai/targets/API.md` updated with namespaced plugin API rules
- [ ] `packages/api/commands/hai3-new-api-service.md` updated with plugin guidance
- [ ] Existing `apiRegistry.initialize({ useMockApi })` works without changes
- [ ] Existing `apiRegistry.registerMocks()` works without changes
- [ ] App (`src/app/main.tsx`) requires no code changes
- [ ] Screensets (`src/screensets/*/api/*.ts`) require no code changes
