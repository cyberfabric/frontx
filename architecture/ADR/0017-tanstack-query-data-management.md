---
status: amended
date: 2026-03-17
amended-by: 0018-endpoint-descriptor-cache-abstraction
---

# Adopt TanStack Query for Declarative Data Management at L3

> **Amended by [ADR-0018](0018-endpoint-descriptor-cache-abstraction.md)**: The decision to adopt TanStack Query at L3 remains valid. However, the per-MFE `data/` folder pattern (query key factories, `queryOptions` calls) is superseded by endpoint descriptors on `BaseApiService`. Cache keys are now derived automatically by the service, and `useApiQuery`/`useApiMutation` consume endpoint descriptors instead of TanStack-specific options. See ADR-0018 for details.


<!-- toc -->

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Consequences](#consequences)
  - [Confirmation](#confirmation)
- [Pros and Cons of the Options](#pros-and-cons-of-the-options)
  - [Adopt @tanstack/react-query at L3](#adopt-tanstackreact-query-at-l3)
  - [Adopt RTK Query leveraging the existing Redux store](#adopt-rtk-query-leveraging-the-existing-redux-store)
  - [Build a custom query/cache layer inside @hai3/react](#build-a-custom-querycache-layer-inside-hai3react)
  - [Keep Flux-only pattern with CLI boilerplate generators](#keep-flux-only-pattern-with-cli-boilerplate-generators)
- [More Information](#more-information)
- [Traceability](#traceability)

<!-- /toc -->

**ID**: `cpt-hai3-adr-tanstack-query-data-management`

## Context and Problem Statement

Screen-set authors must write five files (action, event declaration, effect, Redux slice, component selector) for every API endpoint they consume. Each slice manually tracks `loading`, `error`, and `data` state. There is no request deduplication — if five components need the same user profile, five identical HTTP requests fire. There is no caching — navigating away and back triggers a full refetch. There is no built-in mechanism for optimistic updates or cache invalidation after mutations.

These are solved problems in the React ecosystem. The question is whether to build a custom solution inside HAI3 or adopt an established library at the React layer (L3).

## Decision Drivers

* Provide request deduplication, caching, and stale-while-revalidate out of the box
* Enable a shared cache across MFEs so overlapping queries (e.g., current user) are fetched once, while each MFE retains its own API service instances and plugin chains
* Support optimistic updates with rollback for mutations
* Preserve the existing plugin chain, mock mode, and service registry at L1
* Respect the layer hierarchy: no new dependencies below L3
* Minimize bundle size impact
* Maintain the event-driven Flux pattern as an escape hatch for cross-feature orchestration

## Considered Options

* Adopt `@tanstack/react-query` at L3 as the default for reads and writes
* Adopt RTK Query (`@reduxjs/toolkit/query`) leveraging the existing Redux store
* Build a custom query/cache layer inside `@hai3/react`
* Keep the current Flux-only pattern and add per-feature boilerplate generators via CLI

## Decision Outcome

Chosen option: **Adopt `@tanstack/react-query` at L3**, because it provides caching, deduplication, optimistic updates, and cache invalidation with zero runtime dependencies in its core package, sits cleanly at the React layer without violating the L1/L2 boundary, and avoids rebuilding ~500 lines of battle-tested, race-condition-sensitive code (cache GC, structural sharing, stale tracking, subscriber lifecycle).

RTK Query was evaluated as a natural candidate given HAI3's existing Redux dependency, but was rejected primarily because its `createApi` requires defining endpoints statically at build time with a single `baseQuery`, which conflicts with HAI3's architecture where each MFE has its own isolated `apiRegistry` and service instances. Wrapping per-MFE services into a shared `createApi` would require a service-bridge abstraction that negates the simplicity RTK Query is meant to provide. Additionally, RTK Query does not support automatic request cancellation on unmount, infinite queries, or structural sharing.

The existing Flux pattern (action → event → effect → reducer) is retained as an escape hatch for cross-feature orchestration — mutations that must trigger effects across multiple screen-sets or update shared Redux state. For all other reads and writes, TanStack Query hooks are the default.

### Consequences

* Good, because request deduplication and stale-while-revalidate caching are automatic with no custom code
* Good, because a single host-level `QueryClient` can be shared across all separately mounted MFE roots — cache is keyed by query key, decoupled from which service instance fetches the data, so overlapping queries across MFEs are deduplicated and cached once
* Good, because optimistic updates and rollback are supported via the `onMutate`/`onError` callback pattern and imperative cache work is available via `useQueryCache()`, both using the same restricted `QueryCache` accessor (`get`, `getState`, `set` with updater function, `cancel`, `invalidate`, `invalidateMany`, `remove`) — MFEs never access `queryClient` directly
* Good, because `@tanstack/query-core` has zero runtime dependencies and ~12kB gzipped bundle size
* Good, because each MFE retains its own `apiRegistry` and service instances — `queryFn` wraps the local service, but the cache layer is shared
* Good, because `queryClient` is internal to `@hai3/react` — MFEs interact with the cache only through the `QueryCache` interface (`get`, `getState`, `set`, `cancel`, `invalidate`, `invalidateMany`, `remove`) exposed via `useQueryCache()` and injected into mutation callbacks, preventing uncontrolled cross-MFE cache tampering
* Good, because query key factories live at L3 with a mandatory `@domain` prefix convention (e.g., `['@accounts', 'current-user']`), preventing accidental key collisions across domains in the shared cache
* Good, because L2 Flux effects invalidate the cache via event-based pattern (`cache/invalidate` event), preserving layer boundaries without requiring L2 to depend on TanStack Query
* Bad, because two data-fetching patterns coexist (TanStack hooks for component-level operations, Flux for cross-feature orchestration), requiring a clear decision rule for authors
* Bad, because mutation callback signatures differ slightly from vanilla TanStack Query (extra `{ queryCache }` parameter), which developers familiar with TanStack will notice
* Bad, because TanStack Query's built-in retry must be disabled (set to 0) to avoid double-retry with the existing `onError` plugin chain

### Confirmation

Confirmed when:

* `@tanstack/react-query` is declared as a peer dependency of `@hai3/react` (not bundled)
* `HAI3Provider` renders `QueryClientProvider` with `retry: 0`, configurable `staleTime`/`gcTime`, and optional injected `queryClient`
* Separately mounted MFEs receive the same host-owned `QueryClient` through an opaque mount context and pass it into `HAI3Provider` (no per-MFE `QueryClient`)
* `useApiQuery`, `useApiMutation`, `useApiStream`, and `useQueryCache` hooks are exported from `@hai3/react`; `useQueryClient` is NOT exported — cache operations go through the `QueryCache` interface instead of raw TanStack APIs
* Query key factories exist at L3 in `packages/react/src/queries/` with `@domain` prefix convention and lazy typed service getters inside `queryOptions()`
* `HAI3Provider` subscribes synchronously (render phase, not `useEffect`) to `cache/invalidate` events from EventBus for L2 Flux effect integration
* The demo MFE (`src/mfe_packages/demo-mfe`) demonstrates shared cache across MFEs by reusing the host-owned `QueryClient` in each MFE root — a query fetched by one MFE is available to another via the same query key

## Pros and Cons of the Options

### Adopt @tanstack/react-query at L3

`@tanstack/react-query` (v5) wraps `@tanstack/query-core` (zero dependencies, framework-agnostic) with React hooks. It manages server state: fetching, caching, deduplication, background refetch, optimistic updates, and cache invalidation. Existing `BaseApiService` methods are passed as `queryFn` / `mutationFn` with no changes to the service layer.

* Good, because battle-tested for 5+ years across thousands of production React applications
* Good, because zero runtime dependencies in `@tanstack/query-core`; ~13kB gzipped total for `@tanstack/react-query`
* Good, because `queryFn` accepts any `() => Promise<T>`, wrapping existing service methods with no adapter code — each MFE uses its own service instances while sharing the cache
* Good, because cache is decoupled from the fetch implementation — a single `QueryClient` shared across MFEs deduplicates overlapping queries, while each MFE retains its own `apiRegistry` and plugin chains
* Good, because `AbortSignal` is automatically created per query and passed to `queryFn` for cancellation on unmount
* Good, because structural sharing preserves referential equality for unchanged data, reducing unnecessary React re-renders
* Bad, because it introduces a new peer dependency that all MFE consumers must install
* Bad, because developers must learn TanStack Query's mental model (query keys, stale time, invalidation)

### Adopt RTK Query leveraging the existing Redux store

RTK Query (`@reduxjs/toolkit/query`) is Redux Toolkit's built-in data-fetching solution. It auto-generates React hooks from `createApi` endpoint definitions and stores all cached data in the Redux store. Since HAI3 already depends on `@reduxjs/toolkit` via `@hai3/state`, RTK Query adds no new package — only incremental bundle size (~11kB gzipped on top of existing RTK).

* Good, because no new dependency — RTK Query ships inside `@reduxjs/toolkit`, which HAI3 already uses
* Good, because cache state lives in the Redux store, visible in Redux DevTools alongside client state
* Good, because `createApi` auto-generates typed hooks (`useGetUserQuery`, `usePatchUserMutation`) from endpoint definitions, reducing manual hook authoring
* Good, because tag-based cache invalidation (`providesTags` / `invalidatesTags`) is declarative and colocated with endpoint definitions
* Good, because supports OpenAPI codegen for endpoint generation
* Bad, because `createApi` requires defining all endpoints statically at build time with a single `baseQuery`, which conflicts with HAI3's architecture where each MFE has its own isolated `apiRegistry` and service instances — a shared `createApi` would need a service-bridge abstraction to resolve the correct service instance per MFE, negating RTK Query's simplicity
* Bad, because cache is coupled to the Redux store, conflicting with HAI3's dynamic slice registration pattern (`registerSlice` at runtime vs. RTK Query's static reducer injection)
* Bad, because does not automatically cancel in-flight requests on component unmount — `AbortSignal` is available in `baseQuery` but auto-cancellation requires manual implementation
* Bad, because does not support infinite queries (`useInfiniteQuery` equivalent) — pagination must be implemented manually
* Bad, because does not support structural sharing — all cache updates trigger re-renders even when data is deeply equal, unlike TanStack Query's `replaceEqualDeep`
* Bad, because no React Suspense integration

### Build a custom query/cache layer inside @hai3/react

Build custom `useApiQuery` and `useApiMutation` hooks with an in-memory cache, stale tracking, GC timer, deduplication map, and optimistic update/rollback mechanism.

* Good, because no external dependency; full control over implementation
* Good, because API can be tailored exactly to HAI3's patterns
* Bad, because caching + deduplication + GC + stale tracking + optimistic rollback is ~500-600 lines of race-condition-sensitive code
* Bad, because the resulting code would be functionally equivalent to TanStack Query but without 5 years of battle-testing
* Bad, because ongoing maintenance burden for edge cases (stale closures, concurrent mutations, GC timing, structural sharing)

### Keep Flux-only pattern with CLI boilerplate generators

Enhance the `@hai3/cli` to generate action, event, effect, and slice files for each new API endpoint, reducing manual effort while keeping the Flux architecture.

* Good, because no new dependencies; existing architecture preserved
* Good, because CLI generation reduces typing effort
* Bad, because generated boilerplate still exists in the codebase and must be maintained per endpoint
* Bad, because no caching, deduplication, or optimistic updates — each navigation refetches all data
* Bad, because loading/error state management remains manual in every slice

## More Information

* TanStack Query documentation: https://tanstack.com/query/latest
* `@tanstack/query-core` is framework-agnostic with zero dependencies; `@tanstack/react-query` adds React hooks on top
* TanStack Query's retry is disabled (`retry: 0`) because HAI3's `onError` plugin chain already provides retry with `ApiPluginErrorContext.retry()` — enabling both would cause double retries

## Traceability

- **PRD**: [PRD.md](../PRD.md)
- **DESIGN**: [DESIGN.md](../DESIGN.md)

This decision directly addresses:

* `cpt-hai3-fr-sdk-api-package` — API service layer remains unchanged; TanStack wraps existing services
* `cpt-hai3-fr-sdk-react-layer` — New hooks added to React layer public API surface
* `cpt-hai3-nfr-compat-react` — TanStack Query v5 requires React 18+; HAI3 uses React 19
* `cpt-hai3-constraint-no-react-below-l3` — TanStack Query is confined to L3 (`@hai3/react`); L1 and L2 are unaffected
* `cpt-hai3-constraint-zero-cross-deps-at-l1` — `@hai3/api` gains no new dependencies (AbortSignal is a browser API)
* `cpt-hai3-component-react` — `@hai3/react` package scope for new hooks and provider integration
* `cpt-hai3-component-api` — `@hai3/api` package scope for AbortSignal threading (prerequisite, not part of this ADR)
