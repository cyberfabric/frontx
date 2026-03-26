# Feature: Request Lifecycle & Query Integration


<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Flow 1 — REST Request with AbortSignal Cancellation](#flow-1-rest-request-with-abortsignal-cancellation)
  - [Flow 2 — Declarative Query via useApiQuery Hook](#flow-2-declarative-query-via-useapiquery-hook)
  - [Flow 3 — Declarative Mutation via useApiMutation Hook](#flow-3-declarative-mutation-via-useapimutation-hook)
  - [Flow 5 — Cross-Feature Orchestration via Flux (Escape Hatch)](#flow-5-cross-feature-orchestration-via-flux-escape-hatch)
  - [Flow 4 — QueryClient Lifecycle in HAI3Provider](#flow-4-queryclient-lifecycle-in-hai3provider)
- [3. Processes / Business Logic (CDSL)](#3-processes-business-logic-cdsl)
  - [Algorithm 1 — AbortSignal Threading in RestProtocol](#algorithm-1-abortsignal-threading-in-restprotocol)
  - [Algorithm 2 — CanceledError Detection and Bypass](#algorithm-2-cancelederror-detection-and-bypass)
  - [Algorithm 3 — RequestOptions Pattern for HTTP Methods](#algorithm-3-requestoptions-pattern-for-http-methods)
  - [Algorithm 4 — QueryClient Default Configuration](#algorithm-4-queryclient-default-configuration)
  - [Algorithm 5 — Optimistic Update with Rollback](#algorithm-5-optimistic-update-with-rollback)
  - [Algorithm 6 — Query Invalidation After Mutation](#algorithm-6-query-invalidation-after-mutation)
- [4. States (CDSL)](#4-states-cdsl)
  - [State 1 — Query Lifecycle State](#state-1-query-lifecycle-state)
  - [State 2 — Mutation Lifecycle State](#state-2-mutation-lifecycle-state)
- [5. Definitions of Done](#5-definitions-of-done)
  - [DoD 1 — AbortSignal Support in RestProtocol](#dod-1-abortsignal-support-in-restprotocol)
  - [DoD 2 — QueryClientProvider in HAI3Provider](#dod-2-queryclientprovider-in-hai3provider)
  - [DoD 3 — useApiQuery Hook](#dod-3-useapiquery-hook)
  - [DoD 4 — useApiMutation Hook](#dod-4-useapimutation-hook)
- [6. Acceptance Criteria](#6-acceptance-criteria)
- [Additional Context](#additional-context)
  - [TanStack Query Retry Disabled by Default](#tanstack-query-retry-disabled-by-default)
  - [Event-Driven Pattern Coexistence](#event-driven-pattern-coexistence)
  - [AbortSignal in Short-Circuit Path](#abortsignal-in-short-circuit-path)
  - [QueryCache Interface](#querycache-interface)
  - [Shared QueryClient Across MFEs](#shared-queryclient-across-mfes)
  - [Query Key Factories and `@domain` Prefix Convention](#query-key-factories-and-domain-prefix-convention)
  - [Event-Based Cache Invalidation for Flux Effects](#event-based-cache-invalidation-for-flux-effects)

<!-- /toc -->

- [ ] `p1` - **ID**: `cpt-hai3-featstatus-request-lifecycle`

- [ ] `p2` - `cpt-hai3-feature-request-lifecycle`
---

## 1. Feature Context

### 1.1 Overview

Adds request cancellation via `AbortSignal` to the REST protocol at L1, and integrates `@tanstack/react-query` at L3 to provide declarative data fetching with automatic caching, deduplication, background refetch, and cancellation on top of existing `BaseApiService` instances.

Problem: `RestProtocol` has no mechanism to cancel in-flight requests. Screen-set authors must manually manage loading/error/data states in Redux slices and write action/event/effect boilerplate for every API call. No request deduplication exists when multiple components fetch the same data.

Primary value: Developers get automatic request cancellation on unmount, stale-while-revalidate caching, request deduplication, and a declarative hook API — while preserving the existing plugin chain, mock mode, and service registry patterns.

Key assumptions: `@tanstack/react-query` remains a peer dependency (not bundled). `@tanstack/query-core` has zero runtime dependencies. TanStack Query is the default mechanism for both reads and writes at the component level. The existing event-driven Flux pattern (action → event → effect → reducer) is reserved for cross-feature orchestration where a mutation in one screen-set must trigger effects in another.

### 1.2 Purpose

Enable developers to cancel in-flight REST requests via the standard `AbortSignal` browser API at L1, and adopt declarative query and mutation hooks at L3 that eliminate per-endpoint Redux boilerplate for both reads and writes while preserving the service registry, plugin chain, and mock mode architecture.

Success criteria: A developer can fetch data with `useApiQuery` and submit changes with `useApiMutation` — with automatic loading/error states, request cancellation on unmount, cached responses on re-mount, optimistic updates, and cache invalidation — without writing a slice, effect, event, or action.

### 1.3 Actors

- `cpt-hai3-actor-developer`
- `cpt-hai3-actor-screenset-author`
- `cpt-hai3-actor-runtime`
- `cpt-hai3-actor-host-app`

### 1.4 References

- Overall Design: [DESIGN.md](../../DESIGN.md)
- Decomposition: [DECOMPOSITION.md](../../DECOMPOSITION.md) — sections 2.4, 2.7
- PRD: [PRD.md](../../PRD.md) — sections 5.1 (API Package), 5.19 (Mock Mode)
- Parent features: `cpt-hai3-feature-api-communication`, `cpt-hai3-feature-react-bindings`
- ADRs: `cpt-hai3-adr-protocol-separated-api-architecture`, `cpt-hai3-adr-tanstack-query-data-management`

---

## 2. Actor Flows (CDSL)

### Flow 1 — REST Request with AbortSignal Cancellation

- [ ] `p1` - **ID**: `cpt-hai3-flow-request-lifecycle-rest-abort`

**Actors**: `cpt-hai3-actor-developer`, `cpt-hai3-actor-runtime`

1. [ ] - `p1` - Developer creates an `AbortController` instance — `inst-create-controller`
2. [ ] - `p1` - Developer calls a REST method with `signal` option (e.g., `protocol.get(url, { signal })`) — `inst-call-with-signal`
3. [ ] - `p1` - `RestProtocol` builds `RestRequestContext` including the `signal` property — `inst-build-context-signal`
4. [ ] - `p1` - `RestProtocol` executes `onRequest` plugin chain; plugins receive context with `signal` — `inst-plugin-chain-signal`
5. [ ] - `p1` - IF any plugin short-circuits, RETURN short-circuit response (signal is irrelevant) — `inst-short-circuit-bypass`
6. [ ] - `p1` - `RestProtocol` passes `signal` to `AxiosRequestConfig` for the HTTP call — `inst-axios-signal`
7. [ ] - `p1` - IF `controller.abort()` is called before response arrives, Axios throws `CanceledError` — `inst-abort-fires`
8. [ ] - `p1` - `RestProtocol` catches the `CanceledError` and re-throws it without entering the `onError` plugin chain — `inst-cancel-skip-plugins`
9. [ ] - `p1` - RETURN error to caller; caller handles cancellation (typically a no-op on unmount) — `inst-return-cancel-error`

---

### Flow 2 — Declarative Query via useApiQuery Hook

- [ ] `p2` - **ID**: `cpt-hai3-flow-request-lifecycle-use-api-query`

**Actors**: `cpt-hai3-actor-screenset-author`, `cpt-hai3-actor-runtime`

1. [ ] - `p2` - Screen-set author calls `useApiQuery(service.endpoint)` passing an `EndpointDescriptor` from the service class — `inst-call-use-api-query`
2. [ ] - `p2` - `useApiQuery` extracts `key` and `fetch` from the descriptor, delegates to the underlying caching library (e.g., TanStack Query's `useQuery`) — `inst-delegate-use-query`
3. [ ] - `p2` - The caching library invokes `descriptor.fetch({ signal })`, passing an internally created `AbortSignal` — `inst-tanstack-provides-signal`
4. [ ] - `p2` - `fetch` calls the appropriate `BaseApiService` protocol method, forwarding the `signal` — `inst-service-call-with-signal`
5. [ ] - `p2` - IF the descriptor's key is already cached and fresh, return cached data immediately — `inst-cache-hit`
6. [ ] - `p2` - IF another component uses the same descriptor (same key) in-flight, deduplicate (share the single request promise) — `inst-dedup`
7. [ ] - `p2` - On success, cache the response and RETURN `ApiQueryResult { data, isLoading: false, error: null }` — `inst-return-data`
8. [ ] - `p2` - On error, RETURN `ApiQueryResult { data: undefined, isLoading: false, error }` — `inst-return-error`
9. [ ] - `p2` - On component unmount, abort the in-flight request via the signal — `inst-unmount-abort`

---

### Flow 3 — Declarative Mutation via useApiMutation Hook

- [ ] `p2` - **ID**: `cpt-hai3-flow-request-lifecycle-use-api-mutation`

**Actors**: `cpt-hai3-actor-screenset-author`, `cpt-hai3-actor-runtime`

1. [ ] - `p2` - Screen-set author calls `useApiMutation({ endpoint: service.mutationDescriptor, onMutate?, onSuccess?, onError?, onSettled? })` — `inst-call-use-api-mutation`
2. [ ] - `p2` - Hook returns `ApiMutationResult { mutate, mutateAsync, isPending, error, data, reset }` — `inst-return-mutation-state`
3. [ ] - `p2` - Hook internally creates a `QueryCache` accessor (`get`, `getState`, `set`, `cancel`, `invalidate`, `invalidateMany`, `remove`) wrapping the internal cache client — MFEs never receive the cache client directly. `QueryCache` methods accept `EndpointDescriptor` or raw `QueryKey` — `inst-create-query-cache`
4. [ ] - `p2` - Author calls `mutate(variables)` from an event handler or form submission — `inst-invoke-mutate`
5. [ ] - `p2` - IF `onMutate` provided (optimistic update), execute it with `(variables, { queryCache })`: snapshot via `queryCache.get(service.queryDescriptor)`, apply optimistic data via `queryCache.set(service.queryDescriptor, ...)`, RETURN snapshot for rollback — `inst-optimistic-apply`
6. [ ] - `p2` - The caching library invokes `descriptor.fetch(variables)` which calls the service protocol method (e.g., `RestProtocol.post()`, `RestProtocol.put()`) — `inst-mutation-service-call`
7. [ ] - `p2` - On success, IF `onSuccess` provided, execute it with `(data, variables, context, { queryCache })` — typically calls `queryCache.invalidate(service.queryDescriptor)` to refetch affected queries — `inst-mutation-on-success`
8. [ ] - `p2` - On error, IF `onError` provided, execute it with `(error, variables, context, { queryCache })` — IF optimistic update was applied, rollback by restoring snapshot via `queryCache.set(service.queryDescriptor, context.snapshot)` — `inst-mutation-on-error-rollback`
9. [ ] - `p2` - On settled (success or error), IF `onSettled` provided, execute it with `(data, error, variables, context, { queryCache })` — typically used for final cleanup or conditional invalidation — `inst-mutation-on-settled`

---

### Flow 5 — Cross-Feature Orchestration via Flux (Escape Hatch)

- [ ] `p2` - **ID**: `cpt-hai3-flow-request-lifecycle-flux-escape-hatch`

**Actors**: `cpt-hai3-actor-developer`, `cpt-hai3-actor-runtime`

1. [ ] - `p2` - Developer determines that a mutation must trigger effects across multiple screen-sets or update shared Redux state — `inst-identify-cross-feature`
2. [ ] - `p2` - Developer uses the existing Flux pattern: action → eventBus.emit → effect → service call → dispatch — `inst-use-flux`
3. [ ] - `p2` - Effect calls the service method directly (not through TanStack) — `inst-effect-service-call`
4. [ ] - `p2` - After effect completes, IF TanStack queries are active for the affected data, effect uses a framework-level cache invalidation utility (not direct `queryClient` access) to keep the query cache consistent — `inst-invalidate-after-flux`
5. [ ] - `p2` - RETURN: both Redux state and TanStack cache are synchronized — `inst-state-sync`

---

### Flow 4 — QueryClient Lifecycle in HAI3Provider

- [ ] `p2` - **ID**: `cpt-hai3-flow-request-lifecycle-query-client-lifecycle`

**Actors**: `cpt-hai3-actor-host-app`, `cpt-hai3-actor-runtime`

1. [ ] - `p2` - The `queryCache()` framework plugin creates a `QueryClient` instance with configurable defaults during `onInit` and exposes it as `app.queryClient` — `inst-create-query-client`
2. [ ] - `p2` - `HAI3Provider` reads `app.queryClient` from the framework plugin (or accepts an injected host-owned client) and renders `QueryClientProvider` wrapping children — `inst-render-query-provider`
3. [ ] - `p2` - IF MFE mode, the host passes its `QueryClient` to each separately mounted MFE root via opaque mount context, and the MFE forwards that client into `HAI3Provider` — shared cache across all MFEs, each using its own `apiRegistry` as `queryFn` — `inst-mfe-query-client`
4. [ ] - `p2` - The `queryCache()` plugin listens for `MockEvents.Toggle` and clears cache on mock mode changes — `inst-mock-cache-clear`
5. [ ] - `p2` - The `queryCache()` plugin listens for `cache/invalidate` events from L2 Flux effects and invalidates the corresponding cache entries — `inst-flux-cache-invalidate`
6. [ ] - `p2` - On `app.destroy()`, the `queryCache()` plugin's `onDestroy` clears and garbage-collects the `QueryClient` — `inst-cleanup-query-client`

---

## 3. Processes / Business Logic (CDSL)

### Algorithm 1 — AbortSignal Threading in RestProtocol

- [ ] `p1` - **ID**: `cpt-hai3-algo-request-lifecycle-signal-threading`

1. [ ] - `p1` - Receive `signal` from caller via `RequestOptions` parameter — `inst-receive-signal`
2. [ ] - `p1` - Attach `signal` to `RestRequestContext` as a readonly optional property — `inst-attach-to-context`
3. [ ] - `p1` - Pass `RestRequestContext` through `executePluginOnRequest` chain (plugins can read `signal` but MUST NOT replace it) — `inst-plugin-passthrough`
4. [ ] - `p1` - Copy `signal` from context to `AxiosRequestConfig.signal` before HTTP execution — `inst-copy-to-axios`
5. [ ] - `p1` - IF `signal` is already aborted before Axios call, Axios throws synchronously — `inst-pre-aborted`
6. [ ] - `p1` - RETURN: Axios handles abort natively; no additional wiring needed — `inst-axios-native`

---

### Algorithm 2 — CanceledError Detection and Bypass

- [ ] `p1` - **ID**: `cpt-hai3-algo-request-lifecycle-cancel-detection`

1. [ ] - `p1` - In `requestInternal` catch block, check if error is an Axios `CanceledError` (via `axios.isCancel(error)`) — `inst-check-is-cancel`
2. [ ] - `p1` - IF `axios.isCancel(error)` is true, re-throw immediately without entering `executePluginOnError` — `inst-rethrow-cancel`
3. [ ] - `p1` - IF `axios.isCancel(error)` is false, proceed to `executePluginOnError` as before — `inst-normal-error-path`
4. [ ] - `p1` - RETURN: cancellation errors are never retried and never processed by plugins — `inst-no-retry-cancel`

---

### Algorithm 3 — RequestOptions Pattern for HTTP Methods

- [ ] `p1` - **ID**: `cpt-hai3-algo-request-lifecycle-request-options`

1. [ ] - `p1` - Define `RestRequestOptions` interface with optional `signal?: AbortSignal` and optional `params?: Record<string, string>` — `inst-define-options`
2. [ ] - `p1` - Update `get`, `post`, `put`, `patch`, `delete` method signatures to accept `RestRequestOptions` as final parameter — `inst-update-signatures`
3. [ ] - `p1` - Extract `signal` and `params` from options in each method, forward to `request()` — `inst-extract-options`
4. [ ] - `p1` - `request()` passes `signal` and `params` to `requestInternal()` — `inst-forward-to-internal`
5. [ ] - `p1` - RETURN: existing callers without options continue to work (options parameter is optional) — `inst-backward-compat`

---

### Algorithm 4 — QueryClient Default Configuration (queryCache Plugin)

- [ ] `p2` - **ID**: `cpt-hai3-algo-request-lifecycle-query-client-defaults`

1. [ ] - `p2` - The `queryCache()` plugin creates `QueryClient` with defaults merged from plugin config — `inst-create-in-plugin`
2. [ ] - `p2` - Set `staleTime` to `config.staleTime ?? 30_000` (avoid immediate refetch on re-mount) — `inst-stale-time`
3. [ ] - `p2` - Set `gcTime` to `config.gcTime ?? 300_000` (garbage-collect unused cache entries) — `inst-gc-time`
4. [ ] - `p2` - Set `retry` to 0 (HAI3 has its own retry plugin system; avoid double retry) — `inst-no-retry`
5. [ ] - `p2` - Set `refetchOnWindowFocus` to `config.refetchOnWindowFocus ?? true` (refresh stale data on tab switch) — `inst-refetch-focus`
6. [ ] - `p2` - Expose `QueryClient` as `app.queryClient` via `provides.registries` — `inst-expose-client`
7. [ ] - `p2` - `HAI3Provider` reads `app.queryClient` (or uses injected host-owned client for MFEs) — `inst-provider-reads-client`
8. [ ] - `p2` - RETURN: QueryClient available to both React hooks and non-React contexts — `inst-return-client`

---

### Algorithm 5 — Optimistic Update with Rollback

- [ ] `p2` - **ID**: `cpt-hai3-algo-request-lifecycle-optimistic-update`

All cache operations use the `QueryCache` interface, either injected into mutation callbacks by `useApiMutation` or returned by `useQueryCache()`. MFEs never access the caching library client directly. `QueryCache` methods accept `EndpointDescriptor` or raw `QueryKey`.

1. [ ] - `p2` - In `onMutate` callback, cancel any outgoing refetches for the affected endpoint via `queryCache.cancel(service.queryDescriptor)` to prevent race conditions — `inst-cancel-refetches`
2. [ ] - `p2` - Snapshot the current cache value via `queryCache.get(service.queryDescriptor)` — `inst-snapshot`
3. [ ] - `p2` - Apply the optimistic update via `queryCache.set(service.queryDescriptor, optimisticData)` — `inst-apply-optimistic`
4. [ ] - `p2` - RETURN the snapshot as the `onMutate` return value (passed to `onError` as `context`) — `inst-return-snapshot`
5. [ ] - `p2` - IF mutation fails, `onError` receives the snapshot via `context` and restores it via `queryCache.set(service.queryDescriptor, context.snapshot)` — `inst-rollback`
6. [ ] - `p2` - In `onSettled`, call `queryCache.invalidate(service.queryDescriptor)` to refetch the authoritative server state regardless of success or failure — `inst-refetch-authoritative`

---

### Algorithm 6 — Query Invalidation After Mutation

- [ ] `p2` - **ID**: `cpt-hai3-algo-request-lifecycle-query-invalidation`

1. [ ] - `p2` - In `onSuccess` or `onSettled` callback, determine which endpoint descriptors are affected by the mutation — `inst-determine-keys`
2. [ ] - `p2` - Call `queryCache.invalidate(service.descriptor)` for each affected endpoint, or `queryCache.invalidateMany(filters)` for namespace-wide invalidation, via the `QueryCache` interface — `inst-invalidate`
3. [ ] - `p2` - TanStack Query marks matched cached entries as stale — `inst-mark-stale`
4. [ ] - `p2` - IF any component is currently mounted and observing an invalidated key, TanStack Query triggers a background refetch automatically — `inst-auto-refetch`
5. [ ] - `p2` - IF no component is observing the key, the stale data remains in cache until next access or GC — `inst-lazy-refetch`

---

## 4. States (CDSL)

### State 1 — Query Lifecycle State

- [ ] `p2` - **ID**: `cpt-hai3-state-request-lifecycle-query`

**States**: IDLE, FETCHING, SUCCESS, ERROR, STALE

**Initial State**: IDLE

1. [ ] - `p2` - **FROM** IDLE **TO** FETCHING **WHEN** `useApiQuery` mounts and no cached data exists — `inst-initial-fetch`
2. [ ] - `p2` - **FROM** FETCHING **TO** SUCCESS **WHEN** `queryFn` resolves — `inst-fetch-success`
3. [ ] - `p2` - **FROM** FETCHING **TO** ERROR **WHEN** `queryFn` rejects — `inst-fetch-error`
4. [ ] - `p2` - **FROM** SUCCESS **TO** STALE **WHEN** `staleTime` elapses — `inst-become-stale`
5. [ ] - `p2` - **FROM** STALE **TO** FETCHING **WHEN** component re-mounts or window refocuses — `inst-refetch`
6. [ ] - `p2` - **FROM** ERROR **TO** FETCHING **WHEN** manual refetch triggered — `inst-retry-manual`
7. [ ] - `p2` - **FROM** any **TO** IDLE **WHEN** component unmounts and `gcTime` elapses — `inst-gc`

### State 2 — Mutation Lifecycle State

- [ ] `p2` - **ID**: `cpt-hai3-state-request-lifecycle-mutation`

**States**: IDLE, PENDING, SUCCESS, ERROR

**Initial State**: IDLE

1. [ ] - `p2` - **FROM** IDLE **TO** PENDING **WHEN** `mutate(variables)` is called — `inst-mutation-start`
2. [ ] - `p2` - **FROM** PENDING **TO** SUCCESS **WHEN** `mutationFn` resolves; `onSuccess` and `onSettled` callbacks fire — `inst-mutation-success`
3. [ ] - `p2` - **FROM** PENDING **TO** ERROR **WHEN** `mutationFn` rejects; `onError` and `onSettled` callbacks fire, optimistic rollback executes if applicable — `inst-mutation-error`
4. [ ] - `p2` - **FROM** SUCCESS **TO** IDLE **WHEN** `reset()` is called or component unmounts — `inst-mutation-reset-success`
5. [ ] - `p2` - **FROM** ERROR **TO** IDLE **WHEN** `reset()` is called or component unmounts — `inst-mutation-reset-error`
6. [ ] - `p2` - **FROM** ERROR **TO** PENDING **WHEN** `mutate(variables)` is called again (retry) — `inst-mutation-retry`

---

## 5. Definitions of Done

### DoD 1 — AbortSignal Support in RestProtocol

- [ ] `p1` - **ID**: `cpt-hai3-dod-request-lifecycle-abort-signal`

The system **MUST** support request cancellation via `AbortSignal` in `RestProtocol` without modifying the plugin chain contract.

**Implementation details**:

- Type: `RestRequestOptions` interface in `packages/api/src/types.ts` with `signal?: AbortSignal` and `params?: Record<string, string>`
- Type: Add `signal?: AbortSignal` to `RestRequestContext` interface
- Class: `RestProtocol` in `packages/api/src/protocols/RestProtocol.ts` — update HTTP method signatures to accept `RestRequestOptions`
- Method: `requestInternal` — pass `signal` to `AxiosRequestConfig.signal`
- Method: `requestInternal` catch block — detect `axios.isCancel(error)` and re-throw without plugin chain

**Implements**:
- `cpt-hai3-flow-request-lifecycle-rest-abort`
- `cpt-hai3-algo-request-lifecycle-signal-threading`
- `cpt-hai3-algo-request-lifecycle-cancel-detection`
- `cpt-hai3-algo-request-lifecycle-request-options`

**Covers (PRD)**:
- `cpt-hai3-fr-sdk-api-package`
- `cpt-hai3-fr-api-request-cancellation`

**Covers (DESIGN)**:
- `cpt-hai3-constraint-zero-cross-deps-at-l1`
- `cpt-hai3-constraint-no-react-below-l3`
- `cpt-hai3-component-api`

---

### DoD 2 — QueryClient Lifecycle via queryCache() Plugin

- [ ] `p2` - **ID**: `cpt-hai3-dod-request-lifecycle-query-provider`

The system **MUST** provide a `queryCache()` framework plugin at L2 that owns the `QueryClient` lifecycle, and a `QueryClientProvider` inside `HAI3Provider` at L3 that consumes the plugin's client. The `QueryClient` is shared across all MFEs even though each MFE renders in its own React root.

**Implementation details**:

- Plugin: `queryCache(config?)` in `packages/framework/src/plugins/queryCache.ts` — creates `QueryClient`, exposes as `app.queryClient`, manages lifecycle
- Package: `@tanstack/query-core` added as peer dependency of `@hai3/framework`
- Package: `@tanstack/react-query` added as peer dependency of `@hai3/react`
- Config: Default `staleTime: 30_000`, `gcTime: 300_000`, `retry: 0`, `refetchOnWindowFocus: true` — overridable via `queryCache({ staleTime: 60_000 })`
- Plugin provides: `registries: { queryClient }`, event listeners for `MockEvents.Toggle` (clear cache) and `cache/invalidate` (Flux escape hatch)
- Plugin is included in the `full()` preset
- Component: `HAI3Provider` in `packages/react/src/HAI3Provider.tsx` — reads `app.queryClient` from plugin, wraps children with `QueryClientProvider`, accepts optional injected `queryClient` for MFE override
- Runtime: screensets mount pipeline passes opaque mount context to `lifecycle.mount(...)`
- MFE lifecycle: MFE root forwards the injected host `QueryClient` into its own `HAI3Provider`
- Props: `HAI3ProviderProps.queryClient` for host-injected client (overrides plugin's client)

**Implements**:
- `cpt-hai3-flow-request-lifecycle-query-client-lifecycle`
- `cpt-hai3-algo-request-lifecycle-query-client-defaults`

**Covers (PRD)**:
- `cpt-hai3-fr-sdk-react-layer`
- `cpt-hai3-fr-react-query-client-isolation`

**Covers (DESIGN)**:
- `cpt-hai3-constraint-no-react-below-l3`
- `cpt-hai3-component-react`

---

### DoD 3 — useApiQuery Hook

- [ ] `p2` - **ID**: `cpt-hai3-dod-request-lifecycle-use-api-query`

The system **MUST** export a `useApiQuery` hook from `@hai3/react` that accepts an `EndpointDescriptor` from a service class, delegates to the underlying caching library, and returns a HAI3-owned `ApiQueryResult<TData>`.

**Implementation details**:

- Hook: `useApiQuery` in `packages/react/src/hooks/useApiQuery.ts`
- Signature: accepts `EndpointDescriptor<TData>` (from `BaseApiService.query()` / `queryWith()`) and optional per-call overrides `{ staleTime?, gcTime? }`
- Internally extracts `descriptor.key` and `descriptor.fetch` and delegates to the caching library (e.g., TanStack Query's `useQuery`)
- Returns `ApiQueryResult<TData>` — HAI3-owned type exposing only `data`, `error`, `isLoading`, `isFetching`, `isError`, `refetch`
- Does NOT re-export `queryOptions` or TanStack-specific types
- Cache configuration cascade: component call overrides > descriptor defaults > framework defaults

**Implements**:
- `cpt-hai3-flow-request-lifecycle-use-api-query`

**Covers (PRD)**:
- `cpt-hai3-fr-react-query-hooks`

**Covers (DESIGN)**:
- `cpt-hai3-constraint-no-react-below-l3`
- `cpt-hai3-component-react`

---

### DoD 4 — useApiMutation Hook

- [ ] `p2` - **ID**: `cpt-hai3-dod-request-lifecycle-use-api-mutation`

The system **MUST** export a `useApiMutation` hook from `@hai3/react` that accepts a `MutationDescriptor` from a service class, delegates to the underlying caching library, and supports optimistic updates, rollback, and cache invalidation via a restricted `QueryCache` interface.

**Implementation details**:

- Hook: `useApiMutation` in `packages/react/src/hooks/useApiMutation.ts`
- Type: `QueryCache` interface with `get<T>(descriptorOrKey)`, `getState<TData, TError>(descriptorOrKey)`, `set<T>(descriptorOrKey, dataOrUpdater)`, `cancel(descriptorOrKey)`, `invalidate(descriptorOrKey)`, `invalidateMany(filters)`, `remove(descriptorOrKey)` — accepts `EndpointDescriptor` (extracts `.key`) or raw `QueryKey`. Wraps the caching library client internally, never exposed to MFEs. `set` accepts both a value and an updater function for atomic read-modify-write.
- Signature: accepts `{ endpoint: MutationDescriptor, onMutate?, onSuccess?, onError?, onSettled? }` — each callback receives `{ queryCache }` as an additional final parameter
- Returns `ApiMutationResult<TData>` — HAI3-owned type exposing `mutate`, `mutateAsync`, `isPending`, `error`, `data`, `reset`
- The caching library client is used internally only and is NOT re-exported from `@hai3/react` — MFEs interact with the cache through `QueryCache` exposed by `useQueryCache()` and in mutation callbacks

**Implements**:
- `cpt-hai3-flow-request-lifecycle-use-api-mutation`
- `cpt-hai3-algo-request-lifecycle-optimistic-update`
- `cpt-hai3-algo-request-lifecycle-query-invalidation`

**Covers (PRD)**:
- `cpt-hai3-fr-react-query-hooks`

**Covers (DESIGN)**:
- `cpt-hai3-constraint-no-react-below-l3`
- `cpt-hai3-component-react`

---

## 6. Acceptance Criteria

- [ ] `RestProtocol.get('/url', { signal })` cancels the in-flight request when `controller.abort()` is called; Axios throws `CanceledError`
- [ ] Canceled requests do NOT enter the `onError` plugin chain and are NOT retried
- [ ] Existing callers without `signal` option continue to work unchanged (backward compatible)
- [ ] `queryCache()` framework plugin creates and owns the `QueryClient` with configurable defaults, exposed as `app.queryClient`
- [ ] `queryCache()` plugin is included in the `full()` preset
- [ ] `queryCache()` plugin clears cache on `MockEvents.Toggle` and handles `cache/invalidate` events from Flux effects
- [ ] `HAI3Provider` reads `app.queryClient` from the framework plugin (not creating its own) and renders `QueryClientProvider`
- [ ] All MFEs share the host's `QueryClient` via injected mount context — overlapping descriptor keys are deduplicated across MFE boundaries
- [ ] `useApiQuery(service.endpoint)` accepts an `EndpointDescriptor` and returns `ApiQueryResult { data, isLoading, error }` with automatic cancellation on unmount
- [ ] Two components using the same endpoint descriptor result in a single HTTP request (deduplication)
- [ ] Stale data is returned immediately on re-mount, with background refetch
- [ ] `useApiMutation({ endpoint: service.mutation, ... })` supports the full callback lifecycle: `onMutate` (optimistic), `onSuccess`, `onError` (rollback), `onSettled` — each callback receives `{ queryCache }` as an additional parameter
- [ ] `QueryCache` interface exposes `get`, `getState`, `set` (with updater function support), `cancel`, `invalidate`, `invalidateMany`, `remove` — accepts `EndpointDescriptor` or raw `QueryKey` — wraps the caching library client internally
- [ ] The caching library client is NOT re-exported from `@hai3/react` — MFEs cannot access it directly
- [ ] Optimistic updates apply immediately via `queryCache.set(service.endpoint, updater)` and rollback on error using the snapshot from `onMutate`
- [ ] `queryCache.invalidate(service.endpoint)` triggers background refetch for mounted observers
- [ ] Cache keys are derived automatically from `[baseURL, method, path]` via `BaseApiService.query()` / `queryWith()` / `mutation()` — no manual key factories
- [ ] MFEs do NOT have `data/` folders with query key factories or `queryOptions()` calls — the service IS the data layer
- [ ] Per-endpoint cache options (`staleTime`, `gcTime`) are set on the descriptor via `this.query('/path', { staleTime, gcTime })`
- [ ] Cache configuration follows three-tier cascade: component call overrides > descriptor defaults > framework defaults
- [ ] `ApiQueryResult<TData>` and `ApiMutationResult<TData>` are HAI3-owned types — not TanStack-specific types
- [ ] `queryOptions` is NOT re-exported from `@hai3/react` — endpoint descriptors replace it
- [ ] Cross-feature mutations use the Flux pattern with event-based cache invalidation (`cache/invalidate` event from L2, synchronous listener at L3 in HAI3Provider)
- [ ] Mock mode continues to work: `RestMockPlugin` short-circuits regardless of `signal` presence
- [ ] `@hai3/api` remains at zero `@hai3/*` dependencies (AbortSignal is a browser API)
- [ ] `@tanstack/react-query` is a peer dependency of `@hai3/react`, not bundled

---

## Additional Context

### TanStack Query Retry Disabled by Default

TanStack Query's built-in retry is set to 0 because HAI3 already provides retry via the `onError` plugin chain with `ApiPluginErrorContext.retry()`. Enabling both would cause double retries — the plugin retries the Axios call, and TanStack retries the entire `queryFn`. Consumers can re-enable TanStack retry per-query if they opt out of plugin-level retry.

### Event-Driven Pattern Coexistence

TanStack Query is the default mechanism for both **reads** (`useApiQuery`) and **writes** (`useApiMutation`) at the component level. This covers the vast majority of screen-set data operations: fetching lists, submitting forms, updating records, deleting items — all with automatic loading/error states, caching, and optimistic updates.

The existing event-driven Flux pattern (action → event → effect → reducer) is reserved as an **escape hatch for cross-feature orchestration** — cases where a mutation in one screen-set must trigger effects in another screen-set or update shared Redux state that multiple unrelated features observe. When using Flux for a mutation that affects data also tracked by TanStack queries, the effect must use a framework-level cache invalidation utility to keep the query cache consistent (effects do not have direct `queryClient` access).

**Decision rule**: If the mutation's effects are local to the component or screen-set, use `useApiMutation`. If the mutation must coordinate across feature boundaries via eventBus, use the Flux pattern.

### AbortSignal in Short-Circuit Path

When a mock plugin short-circuits a request, the `AbortSignal` is ignored because no HTTP call is made. This is correct behavior — there is nothing to abort. The short-circuit response is returned synchronously to the plugin chain.

### QueryCache Interface

MFEs and screen-set components interact with the cache through the `QueryCache` interface. It is injected into `useApiMutation` callbacks and returned by `useQueryCache()` for controlled imperative cache work. The underlying caching library client is internal to `@hai3/react` and is NOT exposed via re-exports.

All `QueryCache` methods accept either an `EndpointDescriptor` (from which `.key` is extracted) or a raw `QueryKey` array for backward compatibility:

```typescript
type CacheKeyInput = EndpointDescriptor<unknown> | QueryKey;

interface QueryCache {
  get<T>(target: CacheKeyInput): T | undefined;
  getState<TData = unknown, TError = Error>(
    target: CacheKeyInput
  ): QueryCacheState<TData, TError> | undefined;
  set<T>(target: CacheKeyInput, dataOrUpdater: T | ((old: T | undefined) => T | undefined)): void;
  cancel(target: CacheKeyInput): Promise<void>;
  invalidate(target: CacheKeyInput): Promise<void>;
  invalidateMany(filters: QueryCacheInvalidateFilters): Promise<void>;
  remove(target: CacheKeyInput): void;
}
```

Usage with endpoint descriptors (preferred):
```typescript
// In mutation callbacks:
onMutate: async (variables, { queryCache }) => {
  await queryCache.cancel(service.getCurrentUser);       // descriptor
  const snapshot = queryCache.get(service.getCurrentUser); // descriptor
  queryCache.set(service.getCurrentUser, (old) => ({ ...old, ...variables }));
  return { snapshot };
},
onSettled: async (_data, _err, _vars, _ctx, { queryCache }) => {
  await queryCache.invalidate(service.getCurrentUser);   // descriptor
},
```

- `set` accepts both a value and an updater function for atomic read-modify-write. Returning `undefined` from the updater cancels the update.
- `getState` exposes query status metadata without exposing the full cache client API.
- `invalidateMany` supports namespace-wide invalidation in shared-cache scenarios.
- `remove` evicts a single cache entry (e.g., clearing a specific user's data).

**Rationale**: With a shared cache across MFEs, unrestricted access would allow any MFE to read, write, or invalidate any cache entry. The `QueryCache` interface constrains the API surface without limiting functionality — optimistic updates (`get`/`set` with updater), rollback (`set`), state inspection (`getState`), targeted invalidation (`invalidate`), namespace invalidation (`invalidateMany`), race condition prevention (`cancel`), and targeted cache eviction (`remove`) are all supported. Declarative reads still go through `useApiQuery()`, while imperative cache work uses `useQueryCache()`.

**Known gap**: SSE/WebSocket event handlers that push live data into the cache are not mutation callbacks and do not receive `{ queryCache }`. When SSE-to-cache integration is designed, a separate access path (event-based `cache/update` pattern or a dedicated `useCacheUpdater` hook) will be needed.

### Shared QueryClient Across MFEs

All MFEs share the host's cache client, but not through React-context inheritance. Each MFE mounts in its own React root, so the host passes the shared cache client through opaque mount context and the MFE forwards it into its local `HAI3Provider`. Cache is keyed by the endpoint descriptor's derived key and is decoupled from which service instance fetches the data. When two MFEs use service endpoints with the same derived key (same baseURL, method, path), only one HTTP request fires — the second MFE receives the cached result. Each MFE still uses its own `apiRegistry` and service instances. `MfeProvider` does not create its own cache client.

**Shared-cache contract**: MFEs whose services share the same `baseURL` and endpoint paths will produce identical cache keys. This is correct behavior for overlapping queries (e.g., both MFEs fetching current user from the same backend). If two MFEs use different service configurations (different baseURL) for the same logical entity, their cache keys will differ naturally, preventing cross-contamination.

### Endpoint Descriptors and Automatic Cache Keys

> **Supersedes**: The per-MFE `data/` folder pattern with manual query key factories and `queryOptions()` calls is replaced by endpoint descriptors on `BaseApiService`. See [ADR-0018](../../ADR/0018-endpoint-descriptor-cache-abstraction.md).

Cache keys are derived automatically from the service's `baseURL`, the HTTP method, and the endpoint path. No manual key factories are needed.

```typescript
// Service (L1 — @hai3/api)
class AccountsApiService extends BaseApiService {
  constructor() {
    super({ baseURL: '/api/accounts' }, new RestProtocol());
  }

  // Static: key = ['/api/accounts', 'GET', '/user/current']
  readonly getCurrentUser = this.query<GetCurrentUserResponse>('/user/current');

  // Parameterized: key = ['/api/accounts', 'GET', '/user/123', { id: '123' }]
  readonly getUser = this.queryWith<GetUserResponse, { id: string }>(
    (params) => `/user/${params.id}`
  );

  // With cache config: staleTime override on the descriptor
  readonly getConfig = this.query<AppConfigResponse>('/config', {
    staleTime: 600_000,
    gcTime: Infinity,
  });

  // Mutation
  readonly updateProfile = this.mutation<GetCurrentUserResponse, UpdateProfileVariables>(
    'PUT', '/user/profile'
  );
}
```

Component usage:
```typescript
// Read — pass descriptor directly
const { data } = useApiQuery(service.getCurrentUser);

// Read with params
const { data } = useApiQuery(service.getUser({ id: '123' }));

// Read with per-call override (rare)
const { data } = useApiQuery(service.getConfig, { staleTime: 0 });

// Write with optimistic update — queryCache accepts descriptors
const { mutateAsync } = useApiMutation({
  endpoint: service.updateProfile,
  onMutate: async (variables, { queryCache }) => {
    const snapshot = queryCache.get(service.getCurrentUser);
    queryCache.set(service.getCurrentUser, (old) => ({ ...old, ...variables }));
    return { snapshot };
  },
});
```

`EndpointDescriptor` is defined at L1 (`@hai3/api`) with zero caching library dependency. It is a plain object carrying `key`, `fetch`, and optional cache configuration. The React layer (L3) consumes descriptors and maps them to the underlying caching library.

For GraphQL or other protocols, the service would use `this.query<TData>(QUERY_DOCUMENT)` and the key would be derived from the operation name and variables. Component code remains identical: `useApiQuery(service.endpoint)`.

### Event-Based Cache Invalidation for Flux Effects

L2 Flux effects that need to invalidate cached queries emit a `cache/invalidate` event via EventBus. The `queryCache()` framework plugin subscribes to this event during `onInit` and calls `queryClient.invalidateQueries({ queryKey: payload.queryKey })`. This is handled entirely at L2 — no React listener needed.

Previously, a synchronous listener inside `HAI3Provider` (L3) handled this. Moving the listener to the `queryCache()` plugin (L2) eliminates the bootstrap race window entirely — the subscription exists as soon as the framework is built, before any React component mounts.
