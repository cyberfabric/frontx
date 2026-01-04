# Design: API Plugin Retry Support and Full Legacy Cleanup

## Context

The HAI3 API plugin system uses a chain-of-responsibility pattern where plugins can intercept requests, responses, and errors. The current `onError` hook receives the error and original request context, allowing plugins to transform errors or provide fallback responses.

This change has two goals:
1. Add retry capability to `onError` for patterns like token refresh
2. Comprehensive cleanup of legacy code across RestProtocol, SseProtocol, types.ts, and apiRegistry.ts

## Goals

1. Enable plugins to retry failed requests with optional context modifications
2. Remove all legacy plugin execution code from RestProtocol
3. Remove unused methods and fields from SseProtocol
4. Remove unused `_getClassPlugins` parameter from ApiProtocol.initialize()
5. Rename class-based methods to clean names (remove "Class" prefix)
6. Migrate RestProtocol from generic to protocol-specific type guard
7. Remove unused `ApiService` interface and `ProtocolPluginHooks` alias
8. Maintain type safety and predictable behavior

## Non-Goals

1. Automatic retry logic (plugins implement their own strategies)
2. SSE retry support (SSE has no `onError` hook - it uses connection-level error handling)

## Decisions

### Decision 1: Single Error Context Object

**What:** `onError(context: ApiPluginErrorContext)`

**Why:**
- Cleaner API with room for future extensions
- Groups related data (error, request, retryCount, retry function)
- Follows pattern of single context objects in other hooks
- Easier to add new capabilities without signature changes

**Alternatives considered:**
- Keep separate parameters, add `retry` as third parameter - rejected due to signature clutter
- Pass retry function on the request context - rejected as it conflates request/error concerns

### Decision 2: Retry Function Accepts Partial Context

**What:** `retry(modifiedRequest?: Partial<ApiRequestContext>)`

**Why:**
- Most retries only modify headers (e.g., new auth token)
- Full context copy is verbose and error-prone
- Partial merge is intuitive: `retry({ headers: { ...request.headers, Authorization: newToken } })`

**Alternatives considered:**
- Require full context - rejected as too verbose for common cases
- No modifications allowed - rejected as it prevents token refresh use case

### Decision 3: Retry Executes Full Plugin Chain

**What:** When `retry()` is called, the request goes through the full `executePluginOnRequest` chain again.

**Why:**
- Consistent behavior - plugins expect to see all requests
- Allows other plugins to modify the retried request
- Short-circuit (mock) plugins still work correctly

**Alternatives considered:**
- Skip to HTTP request directly - rejected as it bypasses plugin chain
- Skip plugins before the current one - rejected as it's complex and inconsistent

### Decision 4: Built-in retryCount with Safety Net

**What:**
- Add `retryCount: number` to `ApiPluginErrorContext` - tracks retry depth automatically
- Add `maxRetryDepth?: number` to `RestProtocolConfig` (default: 10) - safety net

**Why:**
- Different use cases need different limits (auth refresh: 1, network: 3, rate limit: dynamic)
- `retryCount` helps plugins track attempts without maintaining custom state
- `maxRetryDepth` prevents infinite loops even if plugins forget limits
- Default of 10 is high enough for legitimate use cases but catches bugs

**Behavior:**
- `retryCount` starts at 0 for original request errors
- Each `retry()` call increments `retryCount`
- If `retryCount >= maxRetryDepth`, throw `Error('Max retry depth exceeded')`

### Decision 5: Multiple retry() Calls Behavior

**What:** If a plugin calls `retry()` multiple times within a single `onError` invocation, each call executes independently and the **first resolved result wins**.

**Why:**
- Simple mental model: first successful response is returned
- Prevents race conditions from affecting result
- Subsequent calls still execute but their results are ignored

**Example:**
```typescript
onError({ error, request, retry, retryCount }: ApiPluginErrorContext) {
  // DON'T DO THIS - only first result matters
  const result1 = await retry({ headers: { 'X-Attempt': '1' } });
  const result2 = await retry({ headers: { 'X-Attempt': '2' } }); // result ignored
  return result1; // This is what gets returned anyway
}
```

### Decision 6: Remove All RestProtocol Legacy Code

**What:** Delete `executeOnRequest`, `executeOnResponse`, `executeOnError` methods, `getPlugins` callback, and `__mockResponse` handling.

**Why:**
- These are redundant with the class-based plugin system
- Single execution path is easier to maintain and debug
- Removes ~80 lines of dead code
- "No legacy code" is a project mandate

**Impact:**
- The `request()` method becomes simpler with only one plugin chain path
- The `initialize()` method no longer needs to store the `getPlugins` callback

### Decision 7: Remove SseProtocol Unused Code

**What:** Delete `getPlugins()`, `getClassBasedPlugins()` methods and `_getPlugins`, `_getClassPlugins` fields.

**Why:**
- These methods are never called externally
- The fields are stored but never used
- Keeping unused code adds confusion

### Decision 8: Remove `_getClassPlugins` Parameter from ApiProtocol.initialize()

**What:** Remove the `_getClassPlugins` parameter from the ApiProtocol interface and both protocol implementations.

**Why:**
- RestProtocol has a comment explicitly stating it's unused
- SseProtocol stores it but never uses it
- Both protocols use `apiRegistry.plugins.getAll(ProtocolClass)` instead

### Decision 9: Rename Methods (Remove "Class" Prefix)

**What:** Rename `executeClassPluginOnRequest` to `executePluginOnRequest`, etc.

**Why:**
- The "Class" prefix was to distinguish from legacy methods
- With legacy removed, these are the only plugin methods
- Cleaner names improve readability

### Decision 10: Migrate to Protocol-Specific Type Guard

**What:** Change RestProtocol to use `isRestShortCircuit()` instead of generic `isShortCircuit()`.

**Why:**
- Protocol-specific type guards exist and provide better type narrowing
- Generic `isShortCircuit()` can be removed from exports after migration
- Consistency with SseProtocol which already uses `isSseShortCircuit()`

### Decision 11: Remove Redundant Types

**What:** Delete `ApiService` interface and `ProtocolPluginHooks` type alias.

**Why:**
- `ApiService` is never implemented by any class
- `ProtocolPluginHooks` is just an alias for `BasePluginHooks`
- Removing unused code keeps the codebase clean

### Decision 12: Retry Errors Propagate Normally

**What:** If the retried request fails, the error flows through onError chain again.

**Why:**
- Consistent error handling behavior
- Plugins can decide whether to retry again or give up
- Error transformation still works

**Example:** With `retryCount`, plugins can easily implement limits:
```typescript
class AuthPlugin extends RestPluginWithConfig<{ getToken: () => string }> {
  async onError({ error, request, retry, retryCount }: ApiPluginErrorContext) {
    // Use retryCount instead of maintaining custom state
    if (this.is401(error) && retryCount === 0) {
      const newToken = await this.refreshToken();
      return retry({
        headers: { ...request.headers, Authorization: `Bearer ${newToken}` }
      });
    }
    return error;
  }
}
```

## Implementation Notes

### RestProtocol Changes

The `executePluginOnError` method (renamed from `executeClassPluginOnError`) needs to:
1. Create a retry function that re-executes the request through the existing `request()` method
2. Pass `ApiPluginErrorContext` with `retryCount` to plugins
3. Check `maxRetryDepth` before executing retry

**Implementation approach:** Create a new private method `requestInternal()` that handles the core request logic, then have both `request()` and the retry function call it:

```typescript
/**
 * Internal request execution - can be called for initial request or retry
 */
private async requestInternal<T>(
  method: HttpMethod,
  url: string,
  data?: unknown,
  params?: Record<string, string>,
  retryCount: number = 0
): Promise<T> {
  // Check max retry depth safety net
  const maxDepth = this.config.maxRetryDepth ?? 10;
  if (retryCount >= maxDepth) {
    throw new Error(`Max retry depth (${maxDepth}) exceeded`);
  }

  // Build request context
  const requestContext: ApiRequestContext = { method, url: fullUrl, headers, body: data };

  try {
    const pluginResult = await this.executePluginOnRequest(requestContext);

    if (isRestShortCircuit(pluginResult)) {
      const response = await this.executePluginOnResponse(pluginResult.shortCircuit, requestContext);
      return response.data as T;
    }

    const response = await this.client.request(axiosConfig);
    const responseContext = { status: response.status, headers: response.headers, data: response.data };
    const finalResponse = await this.executePluginOnResponse(responseContext, requestContext);
    return finalResponse.data as T;

  } catch (error) {
    const finalResult = await this.executePluginOnError(
      error as Error,
      requestContext,
      url,
      params,
      retryCount
    );

    if ('status' in finalResult && 'data' in finalResult) {
      return (finalResult as ApiResponseContext).data as T;
    }
    throw finalResult;
  }
}

/**
 * Execute plugin onError chain with retry support
 */
private async executePluginOnError(
  error: Error,
  requestContext: ApiRequestContext,
  originalUrl: string,
  params: Record<string, string> | undefined,
  retryCount: number
): Promise<Error | ApiResponseContext> {
  // Create retry function that calls requestInternal with incremented retryCount
  const retry = async (modifiedRequest?: Partial<ApiRequestContext>): Promise<ApiResponseContext> => {
    const retryContext: ApiRequestContext = {
      ...requestContext,
      ...modifiedRequest,
      headers: { ...requestContext.headers, ...modifiedRequest?.headers },
    };

    // Re-execute through requestInternal with incremented retryCount
    const result = await this.requestInternal(
      retryContext.method,
      originalUrl,
      retryContext.body,
      params,
      retryCount + 1
    );

    // Wrap result in response context format
    return {
      status: 200,
      headers: {},
      data: result,
    };
  };

  const errorContext: ApiPluginErrorContext = {
    error,
    request: requestContext,
    retryCount,
    retry,
  };

  // ... plugin chain execution with errorContext
}

/**
 * Public request method - delegates to requestInternal
 */
public async get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return this.requestInternal('GET', url, undefined, params, 0);
}
```

### request() Method Simplification

After removing legacy code and migrating type guard, the public methods delegate to `requestInternal()`:

```typescript
public async get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return this.requestInternal('GET', url, undefined, params, 0);
}

public async post<T>(url: string, data?: unknown): Promise<T> {
  return this.requestInternal('POST', url, data, undefined, 0);
}
// etc.
```

### apiRegistry.ts Changes

Update internal storage type:

```typescript
private protocolPlugins: Map<ProtocolClass, Set<BasePluginHooks>> = new Map();
```

### Type Exports

- `@hai3/api` exports `ApiPluginErrorContext` (new)
- `@hai3/api` removes `ApiService` export
- `@hai3/api` removes `ProtocolPluginHooks` export
- `@hai3/framework` re-exports from api (removes `ApiService`, `ProtocolPluginHooks`)
- `@hai3/react` re-exports from framework (removes `ApiService`, `ProtocolPluginHooks`)

## Risks / Trade-offs

### Risk: Infinite Retry Loops

**Impact:** High - can hang the application and exhaust resources

**Mitigation:**
- `retryCount` field helps plugins track attempts easily
- `maxRetryDepth` config (default: 10) provides safety net
- Document retry limit best practices prominently
- Add example plugins showing proper limit handling

### Trade-off: Plugin Chain Re-execution

**Benefit:** Consistent behavior, works with mocks
**Cost:** Multiple plugin executions for a single user request

This is acceptable because:
- Retry is an exceptional case, not the hot path
- Plugins should be idempotent anyway
- Consistent behavior is more valuable than micro-optimization

## Open Questions

None - design is straightforward given the clear requirements.
