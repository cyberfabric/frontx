# Tasks: Add API Plugin Retry Support and Full Legacy Cleanup

## 1. Remove Legacy Code (RestProtocol.ts)

- [x] 1.1 DELETE `executeOnRequest` method - legacy callback-based onRequest chain
- [x] 1.2 DELETE `executeOnResponse` method - legacy callback-based onResponse chain
- [x] 1.3 DELETE `executeOnError` method - legacy callback-based onError chain
- [x] 1.4 DELETE `private getPlugins` field - legacy callback storage
- [x] 1.5 DELETE `__mockResponse` handling in `request()` method - legacy mock hack
- [x] 1.6 UPDATE `initialize()` - remove `this.getPlugins = getPlugins` assignment
- [x] 1.7 UPDATE `request()` - remove calls to legacy `executeOnRequest()`, `executeOnResponse()`, `executeOnError()`

## 2. Rename Class-Based Methods (RestProtocol.ts)

- [x] 2.1 RENAME `executeClassPluginOnRequest` to `executePluginOnRequest`
- [x] 2.2 RENAME `executeClassPluginOnResponse` to `executePluginOnResponse`
- [x] 2.3 RENAME `executeClassPluginOnError` to `executePluginOnError`
- [x] 2.4 UPDATE all call sites in `request()` method to use new names

## 3. Migrate RestProtocol to Protocol-Specific Type Guard

RestProtocol currently imports and uses the generic `isShortCircuit()` function. It should use the protocol-specific `isRestShortCircuit()` for consistency with SseProtocol.

- [x] 3.1 CHANGE import from `isShortCircuit` to `isRestShortCircuit` in RestProtocol.ts
- [x] 3.2 UPDATE all `isShortCircuit()` calls to use `isRestShortCircuit()` instead

## 4. Remove Unused SseProtocol Code (SseProtocol.ts)

- [x] 4.1 DELETE `getPlugins()` method - never called externally
- [x] 4.2 DELETE `getClassBasedPlugins()` method - never called externally
- [x] 4.3 DELETE `private _getPlugins` field - stored but never used
- [x] 4.4 DELETE `private _getClassPlugins` field - stored but never used
- [x] 4.5 UPDATE `initialize()` - remove storage of `getPlugins` and `_getClassPlugins`

## 5. Remove Unused `_getClassPlugins` Parameter (ApiProtocol interface)

**Pre-check:** Verify no external consumers rely on this parameter by searching codebase for `initialize(` calls.

- [x] 5.0 VERIFY no external code depends on `_getClassPlugins` parameter (search for `protocol.initialize(` and `ApiProtocol.initialize`)
- [x] 5.1 UPDATE `ApiProtocol.initialize()` signature in types.ts - remove `_getClassPlugins` parameter
- [x] 5.2 UPDATE `RestProtocol.initialize()` - remove `_getClassPlugins` parameter
- [x] 5.3 UPDATE `SseProtocol.initialize()` - remove `_getClassPlugins` parameter
- [x] 5.4 UPDATE `BaseApiService` constructor - remove `() => this.getMergedPluginsInOrder()` callback from `protocol.initialize()` call (line 63)

## 6. Remove Unused Types (types.ts)

- [x] 6.1 DELETE `ApiService` interface - never implemented by any class
- [x] 6.2 DELETE `ProtocolPluginHooks` type alias - redundant alias for `BasePluginHooks`

## 7. Update apiRegistry.ts

- [x] 7.1 REPLACE `ProtocolPluginHooks` with `BasePluginHooks` in internal storage type
- [x] 7.2 UPDATE import statement to remove `ProtocolPluginHooks`

## 8. Add Retry Type Definitions (types.ts)

- [x] 8.1 ADD `ApiPluginErrorContext` interface with `error`, `request`, `retryCount`, and `retry` function
- [x] 8.2 ADD `maxRetryDepth?: number` to `RestProtocolConfig` interface
- [x] 8.3 UPDATE `RestPluginHooks.onError` signature to use `ApiPluginErrorContext`
- [x] 8.4 UPDATE `ApiPluginBase.onError` signature to use `ApiPluginErrorContext`

## 9. Implement Retry in RestProtocol

- [x] 9.1 CREATE new private `requestInternal()` method that handles core request logic with `retryCount` parameter
- [x] 9.2 ADD `maxRetryDepth` safety net check in `requestInternal()` (default: 10)
- [x] 9.3 UPDATE `executePluginOnError` to accept `retryCount` parameter
- [x] 9.4 CREATE retry function inside `executePluginOnError` that calls `requestInternal()` with incremented `retryCount`
- [x] 9.5 PASS `ApiPluginErrorContext` (with `retryCount` and `retry` function) to plugin `onError` methods
- [x] 9.6 UPDATE public methods (`get`, `post`, etc.) to delegate to `requestInternal()` with `retryCount: 0`

## 10. Update Exports (index.ts)

- [x] 10.1 REMOVE `ApiService` export
- [x] 10.2 REMOVE `ProtocolPluginHooks` export
- [x] 10.3 ADD `ApiPluginErrorContext` export

## 11. Layer Propagation

**@hai3/framework package:**
- [x] 11.1 REMOVE `ApiService` re-export from `packages/framework/src/index.ts`
- [x] 11.2 REMOVE `ProtocolPluginHooks` re-export from `packages/framework/src/index.ts`
- [x] 11.3 ADD `ApiPluginErrorContext` re-export to `packages/framework/src/index.ts`

**@hai3/react package:**
- [x] 11.4 REMOVE `ApiService` re-export from `packages/react/src/index.ts`
- [x] 11.5 REMOVE `ProtocolPluginHooks` re-export from `packages/react/src/index.ts`
- [x] 11.6 ADD `ApiPluginErrorContext` re-export to `packages/react/src/index.ts`

## 12. Tests

- [x] 12.1 UPDATE existing tests that use legacy `executeOnRequest/Response/Error` methods
- [x] 12.2 ADD unit test: retry function is called with error context and retryCount
- [x] 12.3 ADD unit test: retry with modified headers
- [x] 12.4 ADD unit test: retry error propagates through chain with incremented retryCount
- [x] 12.5 ADD unit test: maxRetryDepth safety net throws error when exceeded
- [x] 12.6 ADD integration test: token refresh pattern with retry

## 13. Documentation

- [x] 13.1 UPDATE `packages/api/CLAUDE.md` - remove `ApiService`, `ProtocolPluginHooks` from exports list
- [x] 13.2 UPDATE `packages/api/CLAUDE.md` - add retry pattern examples with `retryCount` usage
- [x] 13.3 UPDATE `.ai/targets/API.md` - add retry usage rules
- [x] 13.4 UPDATE `packages/api/commands/hai3-new-api-service.md` - include retry guidance
- [x] 13.5 UPDATE `packages/api/commands/hai3-new-api-service.framework.md` - include retry guidance
- [x] 13.6 UPDATE `packages/api/commands/hai3-new-api-service.react.md` - include retry guidance

## 14. Validation

- [x] 14.1 Run `npm run type-check` - all packages compile
- [x] 14.2 Run `npm run lint` - no lint errors
- [x] 14.3 Run `npm run test` - all tests pass
- [x] 14.4 Run `npm run arch:check` - architecture constraints met
- [x] 14.5 Run `npm run build:packages` - all packages build successfully

## Dependencies

```
Phase 1: Core Legacy Removal (can be parallelized)
  Task 1 (RestProtocol legacy)
  Task 4 (SseProtocol legacy)
  Task 6 (Remove unused types)

Phase 2: Protocol Updates (depends on Phase 1)
  Task 2 (Rename methods) - depends on Task 1
  Task 3 (Type guard migration) - depends on Task 1
  Task 5 (Remove _getClassPlugins) - depends on Tasks 1 and 4
  Task 7 (apiRegistry update) - depends on Task 6

Phase 3: Retry Feature (depends on Phase 2)
  Task 8 (Retry types) - can start after Task 6
  Task 9 (Retry implementation) - depends on Tasks 2 and 8

Phase 4: Exports and Propagation (depends on Phases 1-3)
  Task 10 (Update exports) - depends on Tasks 6 and 8
  Task 11 (Layer propagation) - depends on Task 10

Phase 5: Testing and Documentation (depends on Phase 4)
  Task 12 (Tests) - depends on all implementation tasks
  Task 13 (Documentation) - can be done in parallel with Phase 4-5

Phase 6: Final Validation
  Task 14 (Validation) - depends on all other tasks
```

## Parallelizable Work

- Tasks 1, 4, 6 can be done in parallel (independent removals)
- Tasks 2, 3 can be done together after Task 1
- Task 5 spans both protocols, do after Tasks 1 and 4
- Tasks 8, 9 are sequential (types then implementation)
- Task 13 (Documentation) can be done in parallel throughout
