# Change: Add Retry Support to API Plugins and Full Legacy Cleanup

## Why

### Primary Goal: Add Retry Support

Currently, when an API request fails and `onError` is called, plugins can either:
1. Transform the error and let it propagate
2. Return an `ApiResponseContext` to recover with cached/fallback data

However, there is no way for plugins to **retry the request** with potentially modified context. This is a common pattern needed for:
- **Token refresh**: When a 401 is received, refresh the auth token and retry with new Authorization header
- **Circuit breaker recovery**: After a timeout, retry with longer timeout or different endpoint
- **Rate limiting**: After receiving 429, wait and retry
- **Failover**: On connection error, retry against backup server

### Secondary Goal: Full Legacy Cleanup

**Critical requirement: NO LEGACY CODE IN THIS PROJECT**

Multiple legacy artifacts exist across the API package:

1. **RestProtocol.ts**: Legacy callback-based plugin execution (`executeOnRequest`, `executeOnResponse`, `executeOnError`) and `__mockResponse` hack
2. **SseProtocol.ts**: Unused `getPlugins()` and `getClassBasedPlugins()` methods, unused `_getPlugins` and `_getClassPlugins` fields
3. **types.ts**: Unused `ApiService` interface, redundant `ProtocolPluginHooks` alias
4. **ApiProtocol interface**: Unused `_getClassPlugins` parameter in `initialize()` signature
5. **RestProtocol**: Currently uses generic `isShortCircuit()` but should use protocol-specific `isRestShortCircuit()`

## What Changes

### 1. Add Retry Feature

**Add `ApiPluginErrorContext` type:**
```typescript
interface ApiPluginErrorContext {
  readonly error: Error;
  readonly request: ApiRequestContext;
  readonly retryCount: number;  // Tracks retry depth for plugins
  retry: (modifiedRequest?: Partial<ApiRequestContext>) => ApiResponseContext | Promise<ApiResponseContext>;
}
```

**Add safety net configuration to `RestProtocolConfig`:**
```typescript
interface RestProtocolConfig {
  // ... existing fields
  maxRetryDepth?: number;  // Default: 10 - safety net to prevent infinite loops
}
```

**Update `onError` signature** to use `(context: ApiPluginErrorContext)`

### 2. Remove Legacy Plugin Execution (RestProtocol.ts)

**DELETE these methods:**
- `executeOnRequest` method - Legacy callback-based onRequest chain
- `executeOnResponse` method - Legacy callback-based onResponse chain
- `executeOnError` method - Legacy callback-based onError chain

**DELETE these fields:**
- `private getPlugins` field - Legacy callback

**DELETE legacy mock handling:**
- `__mockResponse` check in `request()` method - Legacy mock hack

**UPDATE `request()` method:**
- Remove calls to legacy `executeOnRequest()`, `executeOnResponse()`, `executeOnError()`
- Remove `__mockResponse` handling
- Use only the class-based plugin chain methods

### 3. Rename Class-Based Plugin Methods (RestProtocol.ts)

Remove the "Class" prefix from method names (they are now the only plugin methods):
- `executeClassPluginOnRequest` -> `executePluginOnRequest`
- `executeClassPluginOnResponse` -> `executePluginOnResponse`
- `executeClassPluginOnError` -> `executePluginOnError`

### 4. Migrate RestProtocol to Protocol-Specific Type Guard

RestProtocol currently imports and uses the generic `isShortCircuit()` function. It should use the protocol-specific `isRestShortCircuit()` for consistency with SseProtocol which already uses `isSseShortCircuit()`.

**UPDATE RestProtocol.ts:**
- Change import from `isShortCircuit` to `isRestShortCircuit`
- Update all calls to use `isRestShortCircuit()` instead of generic `isShortCircuit()`

### 5. Remove Unused SseProtocol Methods (SseProtocol.ts)

**DELETE these methods:**
- `getPlugins()` method - Never called externally
- `getClassBasedPlugins()` method - Never called externally

**DELETE these fields:**
- `private _getPlugins` field - Stored but never used
- `private _getClassPlugins` field - Stored but never used

**UPDATE `initialize()` method:**
- Remove storage of `getPlugins` and `_getClassPlugins` parameters

### 6. Remove Unused `_getClassPlugins` Parameter (ApiProtocol interface)

**UPDATE types.ts ApiProtocol.initialize() signature:**
- Remove `_getClassPlugins: () => ReadonlyArray<ApiPluginBase>` parameter
- This parameter is stored but never used by either protocol

**UPDATE RestProtocol.initialize():**
- Remove `_getClassPlugins` parameter (already has comment saying it's unused)

**UPDATE SseProtocol.initialize():**
- Remove `_getClassPlugins` parameter

**UPDATE BaseApiService constructor (line 63):**
- Remove the `_getClassPlugins` callback argument from `protocol.initialize()` call
- Currently passes `() => this.getMergedPluginsInOrder()` which is never used

### 7. Remove Unused Types (types.ts)

**DELETE:**
- `ApiService` interface - Never implemented by any class
- `ProtocolPluginHooks` type alias - Redundant alias for `BasePluginHooks`

### 8. Update Exports (index.ts)

**REMOVE exports:**
- `ApiService` - Never implemented
- `ProtocolPluginHooks` - Redundant alias, use `BasePluginHooks` instead

**ADD exports:**
- `ApiPluginErrorContext` - New retry context type

### 9. Update Internal Usage (apiRegistry.ts)

**UPDATE:**
- Replace `ProtocolPluginHooks` with `BasePluginHooks` in internal storage type

## Impact

### Affected Specs
- `sdk-core` - Plugin lifecycle method contracts, type definitions

### Affected Files

**@hai3/api package (Core Changes):**

*types.ts:*
- ADD `ApiPluginErrorContext` type with `retryCount` field
- ADD `maxRetryDepth` to `RestProtocolConfig`
- UPDATE `RestPluginHooks.onError` signature to use `ApiPluginErrorContext`
- UPDATE `ApiPluginBase.onError` signature to use `ApiPluginErrorContext`
- UPDATE `ApiProtocol.initialize()` - remove `_getClassPlugins` parameter
- DELETE `ApiService` interface
- DELETE `ProtocolPluginHooks` type alias

*protocols/RestProtocol.ts:*
- DELETE `executeOnRequest`, `executeOnResponse`, `executeOnError` methods
- DELETE `getPlugins` field
- DELETE `__mockResponse` handling in `request()`
- RENAME `executeClassPlugin*` methods (remove "Class" prefix)
- UPDATE to use `isRestShortCircuit` instead of `isShortCircuit`
- UPDATE `initialize()` - remove `_getClassPlugins` parameter
- UPDATE `executePluginOnError` to pass `ApiPluginErrorContext` with retry function and retryCount
- ADD `maxRetryDepth` safety net check (default: 10)

*protocols/SseProtocol.ts:*
- DELETE `getPlugins()` method
- DELETE `getClassBasedPlugins()` method
- DELETE `_getPlugins` field
- DELETE `_getClassPlugins` field
- UPDATE `initialize()` - remove storage of unused parameters

*BaseApiService.ts:*
- UPDATE `protocol.initialize()` call in constructor - remove `_getClassPlugins` argument

*apiRegistry.ts:*
- UPDATE internal storage type from `ProtocolPluginHooks` to `BasePluginHooks`

*index.ts:*
- REMOVE `ApiService` export
- REMOVE `ProtocolPluginHooks` export
- ADD `ApiPluginErrorContext` export

**@hai3/framework package:**

*packages/framework/src/index.ts:*
- REMOVE `ApiService` re-export (line 266)
- REMOVE `ProtocolPluginHooks` re-export (line 282)
- ADD `ApiPluginErrorContext` re-export

**@hai3/react package:**

*packages/react/src/index.ts:*
- REMOVE `ApiService` re-export (line 293)
- REMOVE `ProtocolPluginHooks` re-export (line 309)
- ADD `ApiPluginErrorContext` re-export

**Tests:**
- `packages/api/src/__tests__/restPlugins.integration.test.ts` - Add retry tests

**Documentation:**
- `packages/api/CLAUDE.md` - Update exports list, add retry pattern
- `.ai/targets/API.md` - Add retry usage rules

**AI Commands:**
- `packages/api/commands/hai3-new-api-service.md` - Include retry pattern guidance
- `packages/api/commands/hai3-new-api-service.framework.md` - Include retry pattern guidance
- `packages/api/commands/hai3-new-api-service.react.md` - Include retry pattern guidance

## Benefits

1. **Token refresh pattern**: Auth plugins can transparently refresh tokens and retry
2. **Resilience**: Plugins can implement retry with exponential backoff
3. **Clean API**: Single context object with all error handling capabilities
4. **Built-in retry tracking**: `retryCount` field helps plugins track attempts without custom state
5. **Safety net**: `maxRetryDepth` config prevents infinite loops even if plugins forget limits
6. **No legacy code**: Single, clean plugin execution path in both protocols
7. **Simpler codebase**: Remove ~120 lines of redundant legacy code
8. **Type safety**: Full TypeScript support for retry function
9. **Cleaner exports**: No redundant type aliases

## Risks

- **Infinite retry loops**: Plugin authors must implement max retry limits (mitigated by `maxRetryDepth` safety net)

## Mitigation

- `retryCount` field helps plugins track attempts without custom state management
- `maxRetryDepth` config (default: 10) provides safety net against infinite loops
- Document best practices for retry limits
- Provide example plugins with proper retry limits
