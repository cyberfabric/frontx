---
status: proposed
date: 2026-03-25
---

# Endpoint Descriptors on BaseApiService for Library-Agnostic Caching

<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Endpoint descriptors on BaseApiService](#endpoint-descriptors-on-baseapiservice)
  - [HAI3-owned queryOptions factory re-export](#hai3-owned-queryoptions-factory-re-export)
  - [Keep current pattern with manual query key factories](#keep-current-pattern-with-manual-query-key-factories)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-hai3-adr-endpoint-descriptor-cache-abstraction`

## Context and Problem Statement

ADR-0017 adopted TanStack Query at L3 for declarative data management. The resulting MFE pattern requires every screen-set to maintain a `data/` folder containing:

1. **Query key factories** — manually authored arrays like `['@accounts', 'current-user']`
2. **Query options factories** — calls to TanStack's `queryOptions()` with `queryKey` and `queryFn`
3. **Mutation options factories** — TanStack-shaped `UseApiMutationOptions` with callback wiring

This pattern couples every MFE to TanStack Query's API surface. With hundreds of MFEs planned, a future library swap (e.g., to GraphQL, SWR, or a custom solution) would require editing every MFE's `data/` folder — a migration measured in hundreds of files rather than a handful of framework files.

Before TanStack Query, services were self-contained: a class extending `BaseApiService` with typed methods like `getStatus()`. The `data/` folder did not exist. The question is whether the caching abstraction can move back into the service layer so MFEs remain library-agnostic.

## Decision Drivers

* Eliminate per-MFE coupling to the caching library (TanStack Query types, `queryOptions`, manual key factories)
* Derive cache keys automatically from what the service already knows (baseURL, HTTP method, path, params)
* Keep the MFE developer's API minimal: `useApiQuery(service.endpoint)` for reads, `useApiMutation({ endpoint: service.endpoint })` for writes
* Preserve all current capabilities: abort signal threading, optimistic updates, cache invalidation, shared cache across MFEs
* Support future protocol swaps (REST → GraphQL) without MFE changes
* Keep `EndpointDescriptor` at L1 (`@hai3/api`) so it has no caching library dependency
* Keep the caching library adapter at L3 (`@hai3/react`) as the sole integration point

## Considered Options

* Move caching metadata into **endpoint descriptors** on `BaseApiService`, eliminating the `data/` folder
* Replace TanStack's `queryOptions` re-export with a **HAI3-owned factory function** that hides the library
* **Keep the current pattern** with manual query key factories in each MFE

## Decision Outcome

Chosen option: **Endpoint descriptors on BaseApiService**, combined with a **`queryCache()` framework plugin** at L2 that owns the `QueryClient` lifecycle, event-driven cache invalidation, and mock mode integration. This moves the caching contract to the service layer where the request shape is already known, eliminates the `data/` folder in every MFE, derives cache keys automatically, and centralizes cache infrastructure management in the framework's plugin system.

### Consequences

* Good, because MFEs no longer import `queryOptions`, `UseApiQueryOptions`, or define manual key factories — the entire `data/` folder is eliminated
* Good, because cache keys are derived deterministically from `[baseURL, method, path, params]` — no manual key factories, no risk of key collisions or typos
* Good, because swapping the caching library (TanStack → SWR, Apollo, custom) requires changes only in the `queryCache()` plugin and `@hai3/react` hooks (~6 files), not in any MFE
* Good, because swapping the transport protocol (REST → GraphQL) requires changes only in the service class and protocol, not in MFE components — `useApiQuery(service.endpoint)` stays the same
* Good, because `EndpointDescriptor` lives at L1 with zero caching library dependency — it is a plain object with a key and a fetch function
* Good, because per-endpoint cache configuration (`staleTime`, `gcTime`) is colocated with the service method, not scattered across `data/` files
* Good, because `QueryCache` methods (`get`, `set`, `invalidate`, `cancel`, `remove`) accept endpoint descriptors directly, making cache operations type-safe and refactor-friendly
* Good, because the `queryCache()` framework plugin centralizes cache lifecycle, mock mode integration, and Flux cache invalidation — following the same pattern as `mock()`, `themes()`, and other framework plugins
* Good, because `QueryClient` is owned by the framework plugin and available without React (for tests, SSR, non-React contexts) via `app.queryClient`
* Good, because cache defaults (`staleTime`, `gcTime`) are configurable at the framework level via `queryCache({ staleTime: 60_000 })`, not hardcoded in React components
* Bad, because `BaseApiService` gains new methods (`query`, `queryWith`, `mutation`), increasing its surface area
* Bad, because existing MFEs with `data/` folders must be migrated (one-time cost, mechanical)
* Bad, because the descriptor's cache options (`staleTime`, `gcTime`) are HAI3-owned vocabulary that must be mapped to whatever the underlying library calls them

### Confirmation

Confirmed when:

**L1 — Endpoint Descriptors (`@hai3/api`)**:
* `BaseApiService` exposes `this.query<TData>(path, options?)` and `this.queryWith<TData, TParams>(pathFn, options?)` for read endpoints (always GET — method is implicit)
* `BaseApiService` exposes `this.mutation<TData, TVariables>(method, path)` for write endpoints
* `EndpointDescriptor<TData>` interface is defined in `@hai3/api` with `key`, `fetch(options?)`, and optional `staleTime`/`gcTime`
* `ParameterizedEndpointDescriptor<TData, TParams>` returns an `EndpointDescriptor` when called with params
* Cache keys are derived automatically: `[baseURL, method, path]` for static endpoints, `[baseURL, method, resolvedPath, params]` for parameterized ones

**L2 — `queryCache()` Framework Plugin (`@hai3/framework`)**:
* A `queryCache(config?)` plugin is available that creates and owns the `QueryClient` lifecycle
* The plugin provides `app.queryClient` via the registries mechanism
* The plugin is included in the `full()` preset alongside `mock()`, `themes()`, etc.
* Cache defaults (`staleTime`, `gcTime`, `retry: 0`, `refetchOnWindowFocus`) are configurable via plugin config: `queryCache({ staleTime: 60_000 })`
* The plugin listens for `MockEvents.Toggle` and clears cache on mock mode changes
* The plugin listens for `cache/invalidate` events from L2 Flux effects and invalidates the corresponding cache entries
* The plugin calls `queryClient.clear()` on `onDestroy`
* `@tanstack/query-core` is a peer dependency of `@hai3/framework`

**L3 — React Hooks (`@hai3/react`)**:
* `useApiQuery(descriptor)` accepts an `EndpointDescriptor` and returns `ApiQueryResult<TData>` (HAI3-owned type, not TanStack's `UseQueryResult`)
* `useApiMutation({ endpoint, onMutate?, ... })` accepts an endpoint descriptor for the mutation and descriptors in `queryCache` operations
* `QueryCache.get`, `set`, `invalidate`, `cancel`, `remove` accept `EndpointDescriptor | QueryKey` (descriptor extracts `.key` internally)
* `ApiQueryResult<TData>` and `ApiMutationResult<TData>` are HAI3-owned types exposing only the fields MFEs use (`data`, `error`, `isLoading`, `isPending`, `refetch`, `mutateAsync`, `reset`)
* `HAI3Provider` reads `app.queryClient` from the framework plugin instead of creating its own `QueryClient`
* The `queryOptions` re-export is removed from `@hai3/react` public API
* `UseApiQueryOptions` type alias is removed from `@hai3/react` public API

**MFE / CLI**:
* The MFE `data/` folder pattern is removed from CLI templates
* Per-endpoint cache options override framework defaults with three-tier cascade: component call > descriptor > framework default

## Pros and Cons of the Options

### Endpoint descriptors on BaseApiService

Service methods become declarative endpoint registrations. The service class carries both transport and caching metadata. Components consume descriptors without knowing the caching library.

```typescript
// Service (L1) — no TanStack dependency
class AccountsApiService extends BaseApiService {
  readonly getCurrentUser = this.query<GetCurrentUserResponse>('/user/current');
  readonly getUser = this.queryWith<GetUserResponse, { id: string }>(
    (params) => `/user/${params.id}`
  );
  readonly updateProfile = this.mutation<GetCurrentUserResponse, UpdateProfileVariables>(
    'PUT', '/user/profile'
  );
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

* Good, because the `data/` folder is eliminated entirely — service IS the data layer
* Good, because cache keys are automatic, deterministic, and collision-free
* Good, because per-endpoint cache options (`staleTime`, `gcTime`) are colocated with the endpoint definition
* Good, because protocol swap (REST → GraphQL) changes only the service internals, not the component API
* Good, because `EndpointDescriptor` is a plain object at L1 with no framework dependency
* Bad, because `BaseApiService` gains three new protected methods
* Bad, because existing `data/` folders must be migrated

### HAI3-owned queryOptions factory re-export

Replace TanStack's `queryOptions` with a HAI3-owned factory that has the same call signature but is framework-controlled. MFEs keep the `data/` folder but import from `@hai3/react` (which they already do).

* Good, because no changes to `BaseApiService` or the service layer
* Good, because migration is minimal — just ensure imports come from `@hai3/react`
* Bad, because the `data/` folder still exists in every MFE (hundreds of files to change on library swap)
* Bad, because the options shape (`queryKey`, `queryFn`, `{ signal }` injection) is still TanStack-specific
* Bad, because manual key factories are still required and must be kept in sync with service paths

### Keep current pattern with manual query key factories

No changes. Each MFE maintains its own `data/` folder with TanStack-specific code.

* Good, because zero migration cost
* Good, because the pattern is already documented and tested
* Bad, because every MFE is coupled to TanStack Query's API surface
* Bad, because a library swap requires editing hundreds of `data/` files
* Bad, because manual key factories are error-prone and must be manually kept in sync with service paths

## More Information

* The `EndpointDescriptor` pattern is protocol-agnostic. For GraphQL, the service would use `this.query<TData>(QUERY_DOCUMENT)` instead of `this.query<TData>('/path')`. The descriptor's `key` would be derived from the operation name and variables instead of the HTTP method and path. Component code remains identical: `useApiQuery(service.getCurrentUser)`.
* Cache configuration follows a three-tier cascade: component call overrides > descriptor defaults > framework defaults (plugin's `QueryClient` configuration).
* The `QueryCache` interface is unchanged in shape but now accepts `EndpointDescriptor` in addition to raw `QueryKey` arrays. Internally, it extracts `.key` from descriptors. This is backward-compatible.
* This ADR supersedes the `data/` folder convention established in ADR-0017. ADR-0017's decision to adopt TanStack Query at L3 remains valid — this ADR changes where the abstraction boundary sits (service layer vs. MFE data folder).

### Why `queryCache()` is a framework plugin, not an API plugin

TanStack's `RestPlugin` system (L1) handles the request/response lifecycle — `onRequest`, `onResponse`, `onError`. Caching does not fit this model because it requires a long-lived observer/subscription pattern: components subscribe to cache keys, receive updates when data changes, trigger background refetches on stale data, and GC entries when no subscribers remain. This is fundamentally different from intercepting a single request.

The `queryCache()` plugin follows the same framework plugin pattern as `mock()`:
* `mock()` owns mock mode state, listens for `MockEvents.Toggle`, syncs `isMockPlugin` plugins across all services
* `queryCache()` owns the `QueryClient`, listens for `cache/invalidate` events, syncs cache state on mock mode toggles

Both orchestrate cross-cutting behavior through event-driven effects without modifying the request chain.

### Layer responsibilities

```
L1  @hai3/api          EndpointDescriptor { key, fetch, staleTime?, gcTime? }
                        BaseApiService.query() / queryWith() / mutation()
                        No caching library dependency

L2  @hai3/framework    queryCache() plugin — owns QueryClient lifecycle
                        @tanstack/query-core as peer dependency
                        Event-driven cache invalidation + mock mode integration
                        Exposes app.queryClient for non-React access

L3  @hai3/react        useApiQuery(descriptor) / useApiMutation({ endpoint })
                        @tanstack/react-query as peer dependency
                        Maps descriptors → TanStack hooks using plugin's QueryClient
                        HAI3Provider reads app.queryClient instead of creating its own
```

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)
- **Supersedes**: `cpt-hai3-adr-tanstack-query-data-management` (ADR-0017) — query key factories and `data/` folder convention

This decision directly addresses:

* `cpt-hai3-fr-sdk-api-package` — `BaseApiService` gains endpoint descriptor methods
* `cpt-hai3-fr-sdk-react-layer` — `useApiQuery` and `useApiMutation` consume descriptors instead of TanStack options
* `cpt-hai3-constraint-zero-cross-deps-at-l1` — `EndpointDescriptor` is defined at L1 with zero caching library dependency
* `cpt-hai3-constraint-no-react-below-l3` — caching library remains confined to L3
* `cpt-hai3-component-api` — `@hai3/api` package scope for `EndpointDescriptor` and service methods
* `cpt-hai3-component-react` — `@hai3/react` package scope for descriptor-consuming hooks
