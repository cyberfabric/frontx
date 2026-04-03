---
status: accepted
date: 2026-03-17
---

# Adopt TanStack Query with Endpoint Descriptors for Declarative Data Management


<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Adopt @tanstack/react-query at L3 with endpoint descriptors exposed through dedicated service contracts](#adopt-tanstackreact-query-at-l3-with-endpoint-descriptors-exposed-through-dedicated-service-contracts)
  - [Adopt @tanstack/react-query at L3 with per-MFE query key factories](#adopt-tanstackreact-query-at-l3-with-per-mfe-query-key-factories)
  - [Adopt RTK Query leveraging the existing Redux store](#adopt-rtk-query-leveraging-the-existing-redux-store)
  - [Build a custom query/cache layer inside @cyberfabric/react](#build-a-custom-querycache-layer-inside-cyberfabricreact)
  - [Keep Flux-only pattern with CLI boilerplate generators](#keep-flux-only-pattern-with-cli-boilerplate-generators)
- [More Information](#more-information)
  - [Why `queryCache()` is a framework plugin, not an API plugin](#why-querycache-is-a-framework-plugin-not-an-api-plugin)
  - [Layer responsibilities](#layer-responsibilities)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-frontx-adr-tanstack-query-data-management`

## Context and Problem Statement

Screen-set authors must write five files (action, event declaration, effect, Redux slice, component selector) for every API endpoint they consume. Each slice manually tracks `loading`, `error`, and `data` state. There is no request deduplication — if five components need the same user profile, five identical HTTP requests fire. There is no caching — navigating away and back triggers a full refetch. There is no built-in mechanism for optimistic updates or cache invalidation after mutations.

These are solved problems in the React ecosystem. The question is whether to build a custom solution inside FrontX or adopt an established library at the React layer (L3).

A secondary question follows: if an external caching library is adopted, where should the abstraction boundary sit? The naive approach places query key factories and `queryOptions` calls in per-MFE query modules, coupling every MFE to the chosen library's API surface. With hundreds of MFEs planned, a future library swap would require editing hundreds of files rather than a handful of framework files. The alternative is to move caching metadata into the service layer where the request shape is already known, so MFEs remain library-agnostic.

## Decision Drivers

* Provide request deduplication, caching, and stale-while-revalidate out of the box
* Enable a shared cache across MFEs so overlapping queries (e.g., current user) are fetched once, while each MFE retains its own API service instances and plugin chains
* Support optimistic updates with rollback for mutations
* Preserve the existing plugin chain, mock mode, and service registry at L1
* Respect the layer hierarchy: no new dependencies below L3
* Minimize bundle size impact
* Maintain the event-driven Flux pattern as an escape hatch for cross-feature orchestration
* Eliminate per-MFE coupling to the caching library (no manual query key factories, no `queryOptions` imports)
* Derive cache keys automatically from what the service already knows (baseURL, HTTP method, path, params)
* Keep the MFE developer's API minimal: `useApiQuery(service.endpoint)` for single-page reads, `useApiSuspenseQuery(service.endpoint)` for Suspense-driven single-page reads, `useApiInfiniteQuery({ initialPage, getNextPage })` for paginated reads, `useApiSuspenseInfiniteQuery({ initialPage, getNextPage })` for Suspense-driven paginated reads, and `useApiMutation({ endpoint: service.endpoint })` for writes
* Support future protocol swaps (REST → GraphQL, SSE) without MFE changes
* Keep `EndpointDescriptor` at L1 (`@cyberfabric/api`) with no caching library dependency
* Keep the caching library adapter at L3 (`@cyberfabric/react`) as the sole integration point

## Considered Options

* Adopt `@tanstack/react-query` at L3 with **endpoint descriptors exposed through dedicated service contracts** and a `queryCache()` framework plugin at L2
* Adopt `@tanstack/react-query` at L3 with **per-MFE query key factories** colocated in standalone query modules
* Adopt RTK Query (`@reduxjs/toolkit/query`) leveraging the existing Redux store
* Build a custom query/cache layer inside `@cyberfabric/react`
* Keep the current Flux-only pattern and add per-feature boilerplate generators via CLI

## Decision Outcome

Chosen option: **Adopt `@tanstack/react-query` at L3 with endpoint descriptors exposed through dedicated service contracts**, combined with a **`queryCache()` framework plugin** at L2 that owns the `QueryClient` lifecycle, event-driven cache invalidation, and mock mode integration.

TanStack Query provides caching, deduplication, optimistic updates, and cache invalidation with zero runtime dependencies in its core package, sits cleanly at the React layer without violating the L1/L2 boundary, and avoids rebuilding ~500 lines of battle-tested, race-condition-sensitive code (cache GC, structural sharing, stale tracking, subscriber lifecycle).

Endpoint descriptors move the caching contract to the service layer where the request shape is already known, but they are exposed through dedicated declarative contracts rather than `BaseApiService` itself. Cache keys are derived automatically from `[baseURL, method, path, params]`. MFEs consume descriptors via `useApiQuery(service.endpoint)` without knowing which caching library backs them. Swapping the caching library requires changes only in the `queryCache()` plugin and `@cyberfabric/react` hooks (~6 files), not in any MFE.

RTK Query was evaluated as a natural candidate given FrontX's existing Redux dependency, but was rejected primarily because its static `createApi` endpoint model and shared `baseQuery` conflict with FrontX's architecture, where each MFE keeps its own isolated `apiRegistry` and service instances. Wrapping per-MFE services into a shared `createApi` would require a service-bridge abstraction to resolve the correct service at runtime, which negates the simplicity RTK Query is meant to provide. RTK Query does offer infinite queries (`build.infiniteQuery` / `useInfiniteQuery`), structural sharing (`copyWithStructuralSharing`, with `structuralSharing: false` as an escape hatch), and `AbortSignal` / `abort()` cancellation support, but its cancellation lifecycle differs by design from FrontX's automatic unmount-driven behavior. The primary incompatibility is the `createApi` / `apiRegistry` mismatch, not missing features.

The existing Flux pattern (action → event → effect → reducer) is retained as an escape hatch for cross-feature orchestration — mutations that must trigger effects across multiple screen-sets or update shared Redux state. For all other reads and writes, TanStack Query hooks are the default, including descriptor-driven infinite queries for paginated screens.

### Consequences

* Good, because request deduplication and stale-while-revalidate caching are automatic with no custom code
* Good, because a single host-level `QueryClient` can be shared across all separately mounted MFE roots — cache is keyed by query key, decoupled from which service instance fetches the data, so overlapping queries across MFEs are deduplicated and cached once
* Good, because optimistic updates and rollback are supported via the `onMutate`/`onError` callback pattern and imperative cache work is available via `useQueryCache()`, both using the same restricted `QueryCache` accessor (`get`, `getState`, `set` with updater function, `cancel`, `invalidate`, `invalidateMany`, `remove`) — MFEs never access `queryClient` directly
* Good, because `@tanstack/query-core` has zero runtime dependencies and ~12kB gzipped bundle size
* Good, because each MFE retains its own `apiRegistry` and service instances — `queryFn` wraps the local service, but the cache layer is shared
* Good, because `queryClient` is internal to `@cyberfabric/react` — MFEs interact with the cache only through the `QueryCache` interface (`get`, `getState`, `set`, `cancel`, `invalidate`, `invalidateMany`, `remove`) exposed via `useQueryCache()` and injected into mutation callbacks, preventing uncontrolled cross-MFE cache tampering
* Good, because MFEs no longer import `queryOptions`, `UseApiQueryOptions`, or define manual key factories — standalone query modules for cache wiring are eliminated
* Good, because cache keys are derived deterministically from `[baseURL, method, path, params]` — no manual key factories, no risk of key collisions or typos
* Good, because swapping the caching library (TanStack → SWR, Apollo, custom) requires changes only in the `queryCache()` plugin and `@cyberfabric/react` hooks (~6 files), not in any MFE
* Good, because swapping the transport protocol (REST → GraphQL) requires changes only in the service class and protocol, not in MFE components — `useApiQuery(service.endpoint)` stays the same
* Good, because `EndpointDescriptor` lives at L1 with zero caching library dependency — it is a plain object with a key and a fetch function
* Good, because per-endpoint cache configuration (`staleTime`, `gcTime`) is colocated with the service method, not scattered across separate query-module files
* Good, because `QueryCache` methods (`get`, `set`, `invalidate`, `cancel`, `remove`) accept endpoint descriptors directly, making cache operations type-safe and refactor-friendly
* Good, because the `queryCache()` framework plugin centralizes cache lifecycle, mock mode integration, and Flux cache invalidation — following the same pattern as `mock()`, `themes()`, and other framework plugins
* Good, because `QueryClient` is owned by the framework plugin and available without React (for tests, SSR, non-React contexts) via `app.queryClient`
* Good, because cache defaults (`staleTime`, `gcTime`) are configurable at the framework level via `queryCache({ staleTime: 60_000 })`, not hardcoded in React components
* Good, because L2 Flux effects invalidate the cache via event-based pattern (`cache/invalidate` event), preserving layer boundaries without requiring L2 to depend on TanStack Query
* Bad, because two data-fetching patterns coexist (TanStack hooks for component-level operations, Flux for cross-feature orchestration), requiring a clear decision rule for authors
* Bad, because mutation callback signatures differ slightly from vanilla TanStack Query (extra `{ queryCache }` parameter), which developers familiar with TanStack will notice
* Bad, because TanStack Query's built-in retry must be disabled (set to 0) to avoid double-retry with the existing `onError` plugin chain
* Good, because `BaseApiService` stays protocol-agnostic and declarative endpoint/stream APIs remain explicit peer contracts
* Bad, because the descriptor's cache options (`staleTime`, `gcTime`) are FrontX-owned vocabulary that must be mapped to whatever the underlying library calls them

### Confirmation

Confirmed when:

**L1 — Endpoint Descriptors (`@cyberfabric/api`)**:
* `RestEndpointProtocol` exposes `query<TData>(path, options?)` and `queryWith<TData, TParams>(pathFn, options?)` for read endpoints (always GET — method is implicit)
* `RestEndpointProtocol` exposes `mutation<TData, TVariables>(method, path)` for write endpoints
* `SseStreamProtocol` exposes `stream<TEvent>(path, options?)` for SSE streaming endpoints — returns `StreamDescriptor<TEvent>` with `connect`/`disconnect`
* `EndpointDescriptor<TData>` interface is defined in `@cyberfabric/api` with `key`, `fetch(options?)`, and optional `staleTime`/`gcTime`
* `StreamDescriptor<TEvent>` interface is defined in `@cyberfabric/api` with `key`, `connect(onEvent, onComplete?)`, and `disconnect(connectionId)`
* `ParameterizedEndpointDescriptor<TData, TParams>` returns an `EndpointDescriptor` when called with params
* Cache keys are derived automatically: `[baseURL, method, path]` for static endpoints, `[baseURL, method, resolvedPath, params]` for parameterized ones, `[baseURL, 'SSE', path]` for streams
* `AbortSignal` is automatically created per query and passed to `queryFn` for cancellation on unmount

**L2 — `queryCache()` Framework Plugin (`@cyberfabric/framework`)**:
* A `queryCache(config?)` plugin is available that creates and owns the `QueryClient` lifecycle
* The plugin provides `app.queryClient` via the registries mechanism
* The plugin is included in the `full()` preset alongside `mock()`, `themes()`, etc.
* Cache defaults (`staleTime`, `gcTime`, `retry: 0`, `refetchOnWindowFocus`) are configurable via plugin config: `queryCache({ staleTime: 60_000 })`
* The plugin listens for `MockEvents.Toggle` and clears cache on mock mode changes
* The plugin listens for `cache/invalidate` events from L2 Flux effects and invalidates the corresponding cache entries
* The plugin calls `queryClient.clear()` on `onDestroy`
* `@tanstack/query-core` is a peer dependency of `@cyberfabric/framework`

**L3 — React Hooks (`@cyberfabric/react`)**:
* `@tanstack/react-query` is declared as a peer dependency of `@cyberfabric/react` (not bundled)
* `useApiQuery(descriptor)` accepts an `EndpointDescriptor` and returns `ApiQueryResult<TData>` (FrontX-owned type, not TanStack's `UseQueryResult`)
* `useApiSuspenseQuery(descriptor)` accepts an `EndpointDescriptor` for Suspense-driven reads and returns `ApiSuspenseQueryResult<TData>` (FrontX-owned type)
* `useApiInfiniteQuery({ initialPage, getNextPage, getPreviousPage? })` accepts descriptor resolvers for paginated reads and returns `ApiInfiniteQueryResult<TPage>` (FrontX-owned type)
* `useApiSuspenseInfiniteQuery({ initialPage, getNextPage, getPreviousPage? })` accepts the same descriptor resolvers for Suspense-driven paginated reads and returns `ApiSuspenseInfiniteQueryResult<TPage>` (FrontX-owned type)
* `useApiMutation({ endpoint, onMutate?, ... })` accepts an endpoint descriptor for the mutation and descriptors in `queryCache` operations
* `useApiStream(descriptor, options?)` accepts a `StreamDescriptor<TEvent>` and returns `ApiStreamResult<TEvent>` (FrontX-owned type) with automatic connect/disconnect lifecycle, `'latest'`/`'accumulate'` modes, and `{ data, events, status, error, disconnect }`
* `QueryCache.get`, `set`, `invalidate`, `cancel`, `remove` accept `EndpointDescriptor | QueryKey` (descriptor extracts `.key` internally)
* `ApiQueryResult<TData>`, `ApiSuspenseQueryResult<TData>`, `ApiInfiniteQueryResult<TPage>`, `ApiSuspenseInfiniteQueryResult<TPage>`, and `ApiMutationResult<TData>` are FrontX-owned types exposing only the fields MFEs use (`data`, `error`, `isLoading`, `isPending`, `isFetching`, `refetch`, `fetchNextPage`, `fetchPreviousPage`, `mutateAsync`, `reset`)
* `HAI3Provider` reads `app.queryClient` from the framework plugin instead of creating its own `QueryClient`
* The `queryOptions` re-export is removed from `@cyberfabric/react` public API
* `UseApiQueryOptions` type alias is removed from `@cyberfabric/react` public API
* Separately mounted MFEs receive the same host-owned `QueryClient` through the runtime mount-context resolver and pass it into `HAI3Provider` (no per-MFE `QueryClient`)

**MFE / CLI**:
* Legacy per-MFE query-module scaffolding is removed from CLI templates
* Per-endpoint cache options override framework defaults with three-tier cascade: component call > descriptor > framework default

## Pros and Cons of the Options

### Adopt @tanstack/react-query at L3 with endpoint descriptors exposed through dedicated service contracts

`@tanstack/react-query` (v5) wraps `@tanstack/query-core` (zero dependencies, framework-agnostic) with React hooks. Service classes register explicit declarative contracts alongside imperative transports. The service layer carries both transport and caching metadata without making `BaseApiService` itself a protocol router. Components consume descriptors without knowing the caching library.

```typescript
// Service (L1) — no TanStack dependency
class AccountsApiService extends BaseApiService {
  constructor() {
    const rest = new RestProtocol();
    super({ baseURL: '/api/accounts' }, rest, new RestEndpointProtocol(rest));
  }

  readonly getCurrentUser = this.protocol(RestEndpointProtocol)
    .query<GetCurrentUserResponse>('/user/current');
  readonly getUser = this.protocol(RestEndpointProtocol)
    .queryWith<GetUserResponse, { id: string }>((params) => `/user/${params.id}`);
  readonly updateProfile = this.protocol(RestEndpointProtocol)
    .mutation<GetCurrentUserResponse, UpdateProfileVariables>('PUT', '/user/profile');
}

// Component (L4) — no TanStack dependency
const { data } = useApiQuery(service.getCurrentUser);
const { data } = useApiQuery(service.getUser({ id: '123' }));
const { mutateAsync } = useApiMutation({
  endpoint: service.updateProfile,
  onMutate: async (variables, { queryCache }) => {
    const snapshot = queryCache.get(service.getCurrentUser);
    queryCache.set(service.getCurrentUser, (old) => ({ ...old, ...variables }));
    return { snapshot };
  },
});
```

* Good, because battle-tested for 5+ years across thousands of production React applications
* Good, because zero runtime dependencies in `@tanstack/query-core`; ~13kB gzipped total for `@tanstack/react-query`
* Good, because per-MFE query boilerplate is eliminated entirely — service IS the data layer
* Good, because cache keys are automatic, deterministic, and collision-free
* Good, because per-endpoint cache options (`staleTime`, `gcTime`) are colocated with the endpoint definition
* Good, because `queryFn` accepts any `() => Promise<T>`, wrapping existing service methods with no adapter code — each MFE uses its own service instances while sharing the cache
* Good, because cache is decoupled from the fetch implementation — a single `QueryClient` shared across MFEs deduplicates overlapping queries, while each MFE retains its own `apiRegistry` and plugin chains
* Good, because `AbortSignal` is automatically created per query and passed to `queryFn` for cancellation on unmount
* Good, because structural sharing preserves referential equality for unchanged data, reducing unnecessary React re-renders
* Good, because protocol swap (REST → GraphQL) changes only the service internals, not the component API
* Good, because `EndpointDescriptor` is a plain object at L1 with no framework dependency
* Bad, because it introduces a new peer dependency that all MFE consumers must install
* Bad, because developers must learn TanStack Query's mental model (query keys, stale time, invalidation)
* Bad, because services must register both imperative and declarative contracts explicitly

### Adopt @tanstack/react-query at L3 with per-MFE query key factories

Same TanStack Query adoption, but each MFE maintains standalone modules with manual query key factories (`['@accounts', 'current-user']`), `queryOptions()` calls, and mutation options factories. MFEs import TanStack-specific types and functions directly.

* Good, because no changes to `BaseApiService` or the service layer
* Good, because the pattern is straightforward for developers familiar with TanStack Query
* Bad, because every MFE is coupled to TanStack Query's API surface
* Bad, because a library swap requires editing hundreds of query-module files
* Bad, because manual key factories are error-prone and must be manually kept in sync with service paths
* Bad, because the options shape (`queryKey`, `queryFn`, `{ signal }` injection) is still TanStack-specific

### Adopt RTK Query leveraging the existing Redux store

RTK Query (`@reduxjs/toolkit/query`) is Redux Toolkit's built-in data-fetching solution. It auto-generates React hooks from `createApi` endpoint definitions and stores all cached data in the Redux store. Since FrontX already depends on `@reduxjs/toolkit` via `@cyberfabric/state`, RTK Query adds no new package — only incremental bundle size (~11kB gzipped on top of existing RTK).

* Good, because no new dependency — RTK Query ships inside `@reduxjs/toolkit`, which FrontX already uses
* Good, because cache state lives in the Redux store, visible in Redux DevTools alongside client state
* Good, because `createApi` auto-generates typed hooks (`useGetUserQuery`, `usePatchUserMutation`) from endpoint definitions, reducing manual hook authoring
* Good, because tag-based cache invalidation (`providesTags` / `invalidatesTags`) is declarative and colocated with endpoint definitions
* Good, because supports OpenAPI codegen for endpoint generation
* Bad, because `createApi` requires defining all endpoints statically at build time with a single `baseQuery`, which conflicts with FrontX's architecture where each MFE has its own isolated `apiRegistry` and service instances — a shared `createApi` would need a service-bridge abstraction to resolve the correct service instance per MFE, negating RTK Query's simplicity
* Bad, because cache is coupled to the Redux store, conflicting with FrontX's dynamic slice registration pattern (`registerSlice` at runtime vs. RTK Query's static reducer injection)
* Bad, because even though RTK Query offers infinite queries, structural sharing, and cancellation primitives, those capabilities do not solve the core mismatch between FrontX's dynamic per-MFE `apiRegistry` service model and RTK Query's static shared `createApi` / `baseQuery` model; cancellation semantics also differ by design
* Bad, because no React Suspense integration

### Build a custom query/cache layer inside @cyberfabric/react

Build custom `useApiQuery` and `useApiMutation` hooks with an in-memory cache, stale tracking, GC timer, deduplication map, and optimistic update/rollback mechanism.

* Good, because no external dependency; full control over implementation
* Good, because API can be tailored exactly to FrontX's patterns
* Bad, because caching + deduplication + GC + stale tracking + optimistic rollback is ~500-600 lines of race-condition-sensitive code
* Bad, because the resulting code would be functionally equivalent to TanStack Query but without 5 years of battle-testing
* Bad, because ongoing maintenance burden for edge cases (stale closures, concurrent mutations, GC timing, structural sharing)

### Keep Flux-only pattern with CLI boilerplate generators

Enhance the `@cyberfabric/cli` to generate action, event, effect, and slice files for each new API endpoint, reducing manual effort while keeping the Flux architecture.

* Good, because no new dependencies; existing architecture preserved
* Good, because CLI generation reduces typing effort
* Bad, because generated boilerplate still exists in the codebase and must be maintained per endpoint
* Bad, because no caching, deduplication, or optimistic updates — each navigation refetches all data
* Bad, because loading/error state management remains manual in every slice

## More Information

* TanStack Query documentation: https://tanstack.com/query/latest
* `@tanstack/query-core` is framework-agnostic with zero dependencies; `@tanstack/react-query` adds React hooks on top
* TanStack Query's retry is disabled (`retry: 0`) because FrontX's `onError` plugin chain already provides retry with `ApiPluginErrorContext.retry()` — enabling both would cause double retries
* The descriptor pattern is protocol-agnostic. For GraphQL, the service would register a GraphQL descriptor contract instead of a REST one. For SSE, `SseStreamProtocol.stream<TEvent>('/path')` returns a `StreamDescriptor` that routes through `SseProtocol`. The descriptor's `key` would be derived from the operation name and variables instead of the HTTP method and path. Component code remains identical: `useApiQuery(service.getCurrentUser)` for REST, `useApiStream(service.messageStream)` for SSE.
* Cache configuration follows a three-tier cascade: component call overrides > descriptor defaults > framework defaults (plugin's `QueryClient` configuration).
* The `QueryCache` interface accepts `EndpointDescriptor` in addition to raw `QueryKey` arrays. Internally, it extracts `.key` from descriptors.

### Why `queryCache()` is a framework plugin, not an API plugin

TanStack's `RestPlugin` system (L1) handles the request/response lifecycle — `onRequest`, `onResponse`, `onError`. Caching does not fit this model because it requires a long-lived observer/subscription pattern: components subscribe to cache keys, receive updates when data changes, trigger background refetches on stale data, and GC entries when no subscribers remain. This is fundamentally different from intercepting a single request.

The `queryCache()` plugin follows the same framework plugin pattern as `mock()`:
* `mock()` owns mock mode state, listens for `MockEvents.Toggle`, syncs `isMockPlugin` plugins across all services
* `queryCache()` owns the `QueryClient`, listens for `cache/invalidate` events, syncs cache state on mock mode toggles

Both orchestrate cross-cutting behavior through event-driven effects without modifying the request chain.

### Layer responsibilities

```text
L1  @cyberfabric/api          EndpointDescriptor { key, fetch, staleTime?, gcTime? }
                        StreamDescriptor { key, connect, disconnect }
                        RestEndpointProtocol.query() / queryWith() / mutation()
                        SseStreamProtocol.stream()
                        No caching library dependency

L2  @cyberfabric/framework    queryCache() plugin — owns QueryClient lifecycle
                        @tanstack/query-core as peer dependency
                        Event-driven cache invalidation + mock mode integration
                        Exposes app.queryClient for non-React access

L3  @cyberfabric/react        useApiQuery(descriptor) / useApiSuspenseQuery(descriptor) / useApiInfiniteQuery({ initialPage, getNextPage }) / useApiSuspenseInfiniteQuery({ initialPage, getNextPage }) / useApiMutation({ endpoint })
                        useApiStream(descriptor) — SSE lifecycle management
                        @tanstack/react-query as peer dependency
                        Maps descriptors → TanStack hooks using plugin's QueryClient
                        HAI3Provider reads app.queryClient instead of creating its own
```

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses:

* `cpt-frontx-fr-sdk-api-package` — API service layer gains explicit declarative endpoint/stream contracts alongside imperative protocols
* `cpt-frontx-fr-sdk-react-layer` — `useApiQuery` and `useApiMutation` consume descriptors; new hooks added to React layer public API surface
* `cpt-frontx-nfr-compat-react` — TanStack Query v5 requires React 18+; FrontX uses React 19
* `cpt-frontx-constraint-no-react-below-l3` — TanStack Query is confined to L3 (`@cyberfabric/react`); L1 and L2 are unaffected
* `cpt-frontx-constraint-zero-cross-deps-at-l1` — `EndpointDescriptor` is defined at L1 with zero caching library dependency; `@cyberfabric/api` gains no new dependencies (AbortSignal is a browser API)
* `cpt-frontx-component-react` — `@cyberfabric/react` package scope for descriptor-consuming hooks and provider integration
* `cpt-frontx-component-api` — `@cyberfabric/api` package scope for `EndpointDescriptor` and service methods
