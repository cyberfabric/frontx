# Exploration: TanStack Query v5 Integration with Existing API Service Layer

Date: 2026-03-17

## Research question

How does TanStack Query v5 work architecturally, and how does it integrate into a codebase that already has its own API service layer (BaseApiService with protocols and plugins) and Redux-based state management? Specifically: package split, queryFn wrapping patterns, AbortSignal handling, headless usage via query-core, bundle size, key features, and coexistence with Redux/Zustand.

## Scope

**In scope:** TanStack Query v5 architecture, package contents, integration patterns with existing service classes, AbortSignal support, framework-agnostic usage, bundle size, caching/deduplication/refetch/optimistic updates/infinite queries, relationship with client state managers.

**Out of scope:** TanStack Query v4 or older, comparison with SWR or other data-fetching libraries, React Server Components integration specifics, TanStack Router integration.

**Constraints:** HAI3 already has `@hai3/api` (BaseApiService, RestProtocol, plugin system) and `@hai3/state` (Redux via RTK, EventBus). Any integration must coexist with these, not replace them.

## Findings

### 1. Package split: `@tanstack/query-core` vs `@tanstack/react-query`

`@tanstack/query-core` is the framework-agnostic engine. It has [zero runtime dependencies](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/package.json) and is marked `"sideEffects": false` (fully tree-shakeable). Current version is `5.90.20`. It exports:

**Classes:** `QueryClient`, `QueryCache`, `MutationCache`, `QueryObserver`, `InfiniteQueryObserver`, `QueriesObserver`, `MutationObserver`, `Query`, `Mutation`

**Managers:** `focusManager`, `onlineManager`, `notifyManager`, `timeoutManager`

**Utilities:** `dehydrate`, `hydrate`, `hashKey`, `matchQuery`, `matchMutation`, `replaceEqualDeep`, `skipToken`, `isCancelledError`, `CancelledError`, `keepPreviousData`

**Types:** `QueryFunctionContext`, `QueryKey`, `QueryState`, `MutationState`, `DehydratedState`, plus all types from the internal types module.

`@tanstack/react-query` (current version `5.90.21`) depends on `@tanstack/query-core` as its sole production dependency, and has `react ^18 || ^19` as a peer dependency. It [re-exports everything from query-core](https://raw.githubusercontent.com/TanStack/query/main/packages/react-query/src/index.ts) (`export * from '@tanstack/query-core'`) and adds React-specific bindings:

**Hooks:** `useQuery`, `useQueries`, `useInfiniteQuery`, `useMutation`, `useSuspenseQuery`, `useSuspenseInfiniteQuery`, `useSuspenseQueries`, `usePrefetchQuery`, `usePrefetchInfiniteQuery`, `useIsFetching`, `useIsMutating`, `useMutationState`, `useQueryClient`, `useIsRestoring`, `useQueryErrorResetBoundary`

**Components:** `QueryClientProvider`, `HydrationBoundary`, `QueryErrorResetBoundary`, `IsRestoringProvider`

**Helpers:** `queryOptions`, `infiniteQueryOptions`, `mutationOptions` (type-safe option factory functions)

The split is clean: query-core contains all caching logic, observers, and the QueryClient. react-query adds only React hooks and context providers.

**Confidence:** Corroborated -- verified from source code on GitHub main branch.

### 2. Integration patterns: wrapping existing service methods as queryFn

The [`QueryFunction` type signature](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/types.ts) is:

```typescript
type QueryFunction<T, TQueryKey extends QueryKey, TPageParam = never> =
  (context: QueryFunctionContext<TQueryKey, TPageParam>) => T | Promise<T>
```

`QueryFunctionContext` contains:

```typescript
{
  client: QueryClient
  queryKey: TQueryKey
  signal: AbortSignal
  meta: QueryMeta | undefined
  pageParam?: unknown       // only for infinite queries
  direction?: unknown       // only for infinite queries, deprecated
}
```

Any function that returns a `Promise<T>` can serve as a `queryFn`. This means existing service methods can be wrapped directly:

```typescript
// Wrapping an existing service method
const accountsService = apiRegistry.getService(AccountsApiService);

useQuery({
  queryKey: ['user', 'current'],
  queryFn: () => accountsService.getCurrentUser(),
});
```

To pass the AbortSignal through:

```typescript
useQuery({
  queryKey: ['user', 'current'],
  queryFn: ({ signal }) => accountsService.getCurrentUser({ signal }),
});
```

The `queryOptions` helper (React-specific) provides type-safe option factories that can centralize query definitions:

```typescript
const userQueryOptions = queryOptions({
  queryKey: ['user', 'current'],
  queryFn: () => accountsService.getCurrentUser(),
});

// Used anywhere
useQuery(userQueryOptions);
queryClient.prefetchQuery(userQueryOptions);
```

TanStack Query does not dictate how data is fetched. It accepts any promise-returning function. The existing `BaseApiService` / `RestProtocol` / plugin chain would remain the transport layer; TanStack Query would sit above it as a caching and synchronization layer.

**Confidence:** Corroborated -- verified from source type definitions and documented API patterns.

### 3. AbortSignal support

TanStack Query creates an `AbortController` internally for each fetch operation. The signal is [attached to the QueryFunctionContext via `Object.defineProperty`](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/query.ts) with a lazy getter that sets an internal `#abortSignalConsumed` flag:

```typescript
// From query.ts source
const abortController = new AbortController()
Object.defineProperty(context, 'signal', {
  enumerable: true,
  get: () => {
    this.#abortSignalConsumed = true
    return abortController.signal
  },
})
```

This design means:
- The signal is always available on the context object.
- TanStack Query tracks whether the consumer actually read the signal.
- If the signal was consumed, TanStack Query calls `abortController.abort()` when the query is cancelled (component unmount, key change, manual cancellation via `queryClient.cancelQueries()`).
- If the signal was never read, TanStack Query skips aborting (the in-flight request completes but its result is discarded).

Automatic cancellation triggers:
- Component unmounts while query is in-flight
- Query key changes (previous fetch is cancelled)
- Manual call to `queryClient.cancelQueries({ queryKey: [...] })`

For axios integration, the signal can be passed directly since axios supports `AbortSignal` natively (axios >= 0.22.0):

```typescript
axios.get('/users', { signal: context.signal })
```

**Confidence:** Corroborated -- verified from source code (`query.ts`) and consistent with official documentation descriptions.

### 4. Headless usage via `@tanstack/query-core` (no React)

`@tanstack/query-core` is fully usable without React. The pattern centers on `QueryClient` + `QueryObserver`:

```typescript
import { QueryClient, QueryObserver } from '@tanstack/query-core'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
})

// Must call mount() to enable background refetch timers
queryClient.mount()

const observer = new QueryObserver(queryClient, {
  queryKey: ['user', 'current'],
  queryFn: () => accountsService.getCurrentUser(),
})

// Subscribe to changes
const unsubscribe = observer.subscribe((result) => {
  if (result.data) {
    // Use data
  }
})

// Get current result synchronously
const currentResult = observer.getCurrentResult()

// Manual refetch
await observer.refetch()

// Cleanup
unsubscribe()
queryClient.unmount()
```

`QueryObserver` extends an internal `Subscribable` class. Key behaviors:
- Queries only fetch when actively observed (at least one subscriber).
- Stale timers and refetch intervals activate on subscription.
- `InfiniteQueryObserver` and `QueriesObserver` (for parallel queries) are also available headlessly.
- `queryClient.fetchQuery()` and `queryClient.prefetchQuery()` work without observers for imperative one-shot fetches.

This means query-core could be used at the SDK/framework layer (L1/L2 in HAI3 terms) without introducing a React dependency.

**Confidence:** Corroborated -- verified from QueryObserver source code and QueryClient API.

### 5. Bundle size

Direct bundle size measurement from bundlephobia and pkg-size was not accessible during this research. The following figures are based on widely reported community measurements for TanStack Query v5, cross-referenced across multiple sources:

| Package | Minified | Minified + gzipped |
|---------|----------|--------------------|
| `@tanstack/query-core` | ~38-42 kB | ~11-12 kB |
| `@tanstack/react-query` | ~42-48 kB (includes core) | ~13-14 kB (includes core) |

Key size characteristics:
- `@tanstack/query-core` has [zero runtime dependencies](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/package.json).
- `@tanstack/react-query` adds only the React bindings on top of core.
- Both packages are marked `"sideEffects": false`, enabling tree-shaking. Actual impact depends on which APIs are imported.
- The react-query package re-exports all of query-core, so installing react-query is sufficient (no need to install both).

**Confidence:** Substantiated -- size figures are from community measurements and may vary by exact version. Zero-dependency claim is verified from package.json source.

### 6. Key features beyond caching

**Request deduplication.** Multiple components (or observers) requesting the same query key share a single in-flight request. From [query.ts source](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/query.ts): when `fetch()` is called while a fetch is already in progress, the existing `#retryer.promise` is returned rather than initiating a new request. This is automatic and requires no configuration.

**Background refetching.** TanStack Query refetches stale data automatically in several scenarios:
- Window regains focus (`refetchOnWindowFocus`, default: `true`)
- Network reconnects (`refetchOnReconnect`, default: `true`)
- Component mounts with stale data (`refetchOnMount`, default: `true`)
- Configurable polling interval (`refetchInterval`)

Default timing values (from TanStack Query v5 documentation and source defaults):
- `staleTime`: `0` -- data is considered stale immediately after fetch
- `gcTime` (formerly `cacheTime`): `5 * 60 * 1000` (5 minutes) -- inactive cache entries are garbage collected after this period
- `retry`: `3` for queries, `0` (false) for mutations and `fetchQuery` -- failed queries retry 3 times with exponential backoff

**Structural sharing.** Query results use structural sharing (`replaceEqualDeep`) by default. If the new data is deeply equal to the previous data, object references are preserved. This prevents unnecessary re-renders in React without manual memoization.

**Optimistic updates.** Implemented through `useMutation` callbacks:
- `onMutate`: runs before the mutation, used to snapshot current cache state and write optimistic data via `queryClient.setQueryData()`
- `onError`: receives the context from `onMutate`, used to roll back to the snapshot
- `onSettled`: runs after success or failure, typically invalidates queries to ensure consistency

**Infinite queries.** `useInfiniteQuery` (or `InfiniteQueryObserver` headlessly) manages paginated data with:
- `getNextPageParam(lastPage, allPages)`: determines the param for the next page
- `getPreviousPageParam(firstPage, allPages)`: for bidirectional pagination
- `pageParam` is passed to `queryFn` via `QueryFunctionContext`
- Pages accumulate in cache as `{ pages: T[], pageParams: unknown[] }`

**SSE/subscription support.** TanStack Query does not natively manage WebSocket or SSE connections. It is designed for request/response patterns. However, there are documented patterns for integrating with subscriptions:
- Use `queryClient.setQueryData()` from a subscription callback to push live data into the cache
- Use `enabled: false` to disable automatic fetching and drive the query entirely from external events
- The experimental `experimental_streamedQuery` export suggests streaming support is in development

**Confidence:** Substantiated for deduplication and AbortSignal (verified from source). Substantiated for defaults (widely documented, consistent across sources). Conjecture for exact bundle sizes. Substantiated for optimistic updates and infinite queries (documented API). Substantiated for SSE limitations (no native support observed in source exports).

### 7. State management coexistence (Redux/Zustand)

TanStack Query operates on a separate concern axis from Redux or Zustand:

| Concern | TanStack Query | Redux/Zustand |
|---------|---------------|---------------|
| Server state (API responses, cached data) | Primary purpose | Can do it, but manual |
| Client state (UI state, form data, local preferences) | Not designed for this | Primary purpose |
| Cache invalidation | Built-in (`invalidateQueries`, `staleTime`, automatic refetch) | Manual |
| Deduplication | Automatic | Manual |
| Optimistic updates | Built-in pattern via `onMutate` | Manual |
| Global client state | No | Yes |

The two are complementary, not competitive:
- TanStack Query manages the lifecycle of data fetched from the server: when to fetch, when to refetch, when to invalidate, what to cache, and for how long.
- Redux/Zustand manages application state that is local to the client: UI toggles, selected items, form state, user preferences, navigation state.

In HAI3's architecture, `@hai3/state` uses Redux for client state with an EventBus for cross-domain communication. The API services in `@hai3/api` handle transport (protocols, plugins, auth, retry). TanStack Query would sit between these layers -- consuming the API service methods as `queryFn` implementations while managing cache, deduplication, and refetch logic that currently does not exist in the architecture.

The overlap zone is "server data stored in Redux slices." If a Redux slice currently stores API response data (e.g., a list of threads fetched from the server), TanStack Query could take over that responsibility. The Redux slice would then only hold client-derived state (e.g., which thread is selected), while TanStack Query holds the server-fetched thread list.

**Confidence:** Substantiated -- this is the documented and widely practiced integration pattern. The HAI3-specific observations are based on reading the current `@hai3/state` and `@hai3/api` source code.

## Key takeaways

- `@tanstack/query-core` is a zero-dependency, framework-agnostic caching engine usable without React via `QueryClient` + `QueryObserver`. `@tanstack/react-query` adds only React hooks and providers on top. (Corroborated)
- Any `() => Promise<T>` function works as a `queryFn`, making it directly compatible with wrapping existing `BaseApiService` methods. No changes to the service layer are required. (Corroborated)
- AbortSignal is created internally per fetch and passed via `QueryFunctionContext.signal`. It is lazily tracked -- TanStack Query only aborts if the signal was actually consumed by the queryFn. (Corroborated)
- Request deduplication is automatic: multiple observers on the same query key share one in-flight request via a shared retryer promise. (Corroborated)
- TanStack Query manages server state (fetch, cache, refetch, invalidate). It complements Redux/Zustand for client state rather than replacing them. (Substantiated)

## Open questions

1. **Bundle size precision.** Exact minified+gzipped sizes for v5.90.x could not be verified from primary sources during this research. A local `npm pack` or bundlephobia check would provide exact numbers.
2. **SSE integration pattern.** HAI3 has `SseProtocol` in its API layer. How TanStack Query integrates with long-lived SSE connections (pushing data into cache via `setQueryData`) needs prototyping to validate.
3. **AbortSignal passthrough.** The current `BaseApiService` / `RestProtocol` does not appear to accept an `AbortSignal` parameter. Passing the signal from `queryFn` context through to the underlying axios call would require extending the protocol API.
4. **DevTools.** TanStack Query has a dedicated `@tanstack/react-query-devtools` package. Its value for debugging cache state during development was not investigated.
5. **`queryOptions` factory placement.** Where `queryOptions` definitions live in the architecture (colocated with services? separate query layer?) affects maintainability.
6. **Streaming queries.** The `experimental_streamedQuery` export in query-core suggests streaming/SSE support is being developed upstream. Maturity and timeline are unknown.

## Sources

1. [query-core/src/index.ts (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/index.ts) -- complete list of query-core exports
2. [react-query/src/index.ts (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/react-query/src/index.ts) -- complete list of react-query exports, shows re-export of query-core
3. [query-core/src/types.ts (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/types.ts) -- QueryFunctionContext, QueryFunction type definitions, AbortSignal integration
4. [query-core/src/query.ts (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/query.ts) -- AbortController creation, signal lazy tracking, request deduplication via retryer
5. [query-core/src/queryObserver.ts (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/queryObserver.ts) -- headless observer pattern, subscribe API
6. [query-core/package.json (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/package.json) -- zero dependencies, v5.90.20, sideEffects: false
7. [react-query/package.json (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/react-query/package.json) -- sole dependency on query-core, React 18/19 peer dep, v5.90.21
8. [queryClient.ts (GitHub main)](https://raw.githubusercontent.com/TanStack/query/main/packages/query-core/src/queryClient.ts) -- QueryClient public API, all methods
9. [TanStack Query v5 overview](https://tanstack.com/query/latest/docs/framework/react/overview) -- official documentation navigation, feature list
10. [TanStack Query cancellation guide](https://tanstack.com/query/v5/docs/framework/react/guides/query-cancellation) -- AbortSignal usage patterns
