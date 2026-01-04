# sdk-core Spec Delta

## ADDED Requirements

### Requirement: ApiPluginErrorContext Type

The system SHALL provide an `ApiPluginErrorContext` type that encapsulates error handling context including a retry function.

#### Scenario: ApiPluginErrorContext structure

- **WHEN** using `ApiPluginErrorContext` type
- **THEN** it has readonly `error: Error` property
- **AND** it has readonly `request: ApiRequestContext` property (original request context)
- **AND** it has readonly `retryCount: number` property (tracks retry depth, starts at 0)
- **AND** it has `retry: (modifiedRequest?: Partial<ApiRequestContext>) => ApiResponseContext | Promise<ApiResponseContext>` function

#### Scenario: retry function accepts partial context

- **WHEN** calling `retry()` with no arguments
- **THEN** the request is retried with the original request context
- **AND** `retryCount` is incremented by 1

- **WHEN** calling `retry({ headers: { Authorization: 'Bearer newToken' } })`
- **THEN** the request is retried with headers merged into original context
- **AND** other context fields (method, url, body) remain unchanged
- **AND** `retryCount` is incremented by 1

#### Scenario: retry function executes full plugin chain

- **WHEN** calling `retry()` within onError
- **THEN** the retried request goes through the full onRequest plugin chain
- **AND** plugins can modify or short-circuit the retried request
- **AND** onResponse chain executes on successful retry

#### Scenario: retry error propagates through chain

- **WHEN** calling `retry()` and the retried request fails
- **THEN** the new error flows through the onError plugin chain
- **AND** the same plugin's onError may be called again with incremented `retryCount`
- **AND** plugins can use `retryCount` to track retry attempts

#### Scenario: maxRetryDepth safety net

- **WHEN** `retryCount >= maxRetryDepth` (default: 10)
- **THEN** the system throws `Error('Max retry depth exceeded')`
- **AND** this prevents infinite retry loops even if plugins forget limits

### Requirement: Plugin Retry Best Practices

The system SHALL document best practices for implementing retry logic in plugins.

#### Scenario: Retry limit enforcement using retryCount

- **WHEN** implementing a plugin with retry capability
- **THEN** the plugin SHOULD use `retryCount` from `ApiPluginErrorContext`
- **AND** the plugin checks `retryCount === 0` for first retry attempt
- **AND** the plugin does NOT need to maintain custom retry state

#### Scenario: Token refresh retry pattern

- **WHEN** implementing authentication token refresh
- **THEN** the plugin checks for 401 status in error
- **AND** the plugin checks `retryCount === 0` to attempt refresh only once
- **AND** the plugin retries with new Authorization header
- **AND** the plugin returns original error if refresh or retry fails

### Requirement: RestProtocolConfig maxRetryDepth

The system SHALL provide a `maxRetryDepth` configuration option for safety.

#### Scenario: maxRetryDepth configuration

- **WHEN** configuring `RestProtocol`
- **THEN** `maxRetryDepth?: number` is optional (default: 10)
- **AND** this provides a safety net against infinite retry loops
- **AND** plugins should still implement their own appropriate limits

## MODIFIED Requirements

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
- **THEN** it receives `ApiPluginErrorContext` with error, request, retryCount, and retry function
- **AND** it returns `Error` (modified or unchanged) to continue error flow
- **AND** it returns `ApiResponseContext` to recover from error
- **AND** it calls `context.retry(modifiedRequest?)` to retry the request with optional modifications
- **AND** it may return a Promise for async operations

#### Scenario: destroy lifecycle method contract

- **WHEN** a plugin defines `destroy` method
- **THEN** it is called when plugin is unregistered (via `remove`)
- **AND** it is called when registry is reset (via `reset`)
- **AND** it is synchronous (no Promise return)
- **AND** it should clean up resources (close connections, clear timers, etc.)

### Requirement: Type Definitions

The system SHALL provide comprehensive type definitions for the class-based plugin system.

#### Scenario: ApiPluginBase abstract class (non-generic)

- **WHEN** using `ApiPluginBase` abstract class
- **THEN** it defines optional `onRequest` method signature
- **AND** it defines optional `onResponse` method signature
- **AND** it defines optional `onError(context: ApiPluginErrorContext)` method signature
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

#### Scenario: ApiPluginErrorContext type

- **WHEN** using `ApiPluginErrorContext` type
- **THEN** it has readonly `error: Error` property
- **AND** it has readonly `request: ApiRequestContext` property
- **AND** it has readonly `retryCount: number` property
- **AND** it has `retry: (modifiedRequest?: Partial<ApiRequestContext>) => ApiResponseContext | Promise<ApiResponseContext>` function

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

### Requirement: ApiProtocol Initialize Signature

The system SHALL define the ApiProtocol.initialize() method signature for protocol initialization.

#### Scenario: ApiProtocol.initialize() signature

- **WHEN** implementing `ApiProtocol.initialize()` method
- **THEN** it accepts `config: Readonly<ApiServiceConfig>` as first parameter
- **AND** it accepts `getPlugins: () => ReadonlyArray<ApiPluginBase>` as second parameter
- **AND** it accepts optional `getExcludedClasses?: () => ReadonlySet<PluginClass>` as third parameter
- **AND** it does NOT accept `_getClassPlugins` parameter

## REMOVED Requirements

### Requirement: ApiService Interface

The `ApiService` interface is not implemented by any class. `BaseApiService` is the actual base class used by all API services.

#### Scenario: ApiService interface removal

- **WHEN** checking `@hai3/api` exports
- **THEN** `ApiService` interface is NOT exported
- **AND** all services extend `BaseApiService` instead

### Requirement: ProtocolPluginHooks Type Alias

`ProtocolPluginHooks` is a redundant type alias for `BasePluginHooks`. Use `BasePluginHooks` directly instead.

#### Scenario: ProtocolPluginHooks removal

- **WHEN** checking `@hai3/api` exports
- **THEN** `ProtocolPluginHooks` type is NOT exported
- **AND** `BasePluginHooks` is exported and should be used instead

### Requirement: Legacy Plugin Execution Methods

The callback-based plugin execution methods (`executeOnRequest`, `executeOnResponse`, `executeOnError`) in RestProtocol are redundant with the class-based plugin system.

#### Scenario: Legacy methods removed from RestProtocol

- **WHEN** checking RestProtocol implementation
- **THEN** `executeOnRequest` method does NOT exist
- **AND** `executeOnResponse` method does NOT exist
- **AND** `executeOnError` method does NOT exist
- **AND** `getPlugins` field does NOT exist
- **AND** `__mockResponse` handling does NOT exist in `request()` method

### Requirement: Unused SseProtocol Methods

The `getPlugins()` and `getClassBasedPlugins()` methods in SseProtocol are never called externally. The corresponding fields `_getPlugins` and `_getClassPlugins` are stored but never used.

#### Scenario: Unused methods removed from SseProtocol

- **WHEN** checking SseProtocol implementation
- **THEN** `getPlugins()` method does NOT exist
- **AND** `getClassBasedPlugins()` method does NOT exist
- **AND** `_getPlugins` field does NOT exist
- **AND** `_getClassPlugins` field does NOT exist
