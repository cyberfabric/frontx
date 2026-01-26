## Context

HAI3 currently uses a flat routing model where URLs map directly to screen IDs (`/{base}/{screenId}`). The navigation plugin extracts only the first path segment and uses it as the screen ID. This limits the ability to build screens that require URL parameters (e.g., user detail pages, order items).

This change introduces parameterized routing while maintaining backward compatibility with existing screensets.

**Stakeholders**: Framework developers, screenset authors, end users (via deep linking)

## Goals / Non-Goals

**Goals:**
- Support route patterns with named parameters (e.g., `/users/:id`, `/orders/:orderId/items/:itemId`)
- Provide type-safe access to route params in screen components
- Maintain full backward compatibility (screens without `path` continue to work)
- Follow HAI3 layer architecture (SDK → Framework → React)

**Non-Goals:**
- Query string parameter handling (out of scope, can be added later)
- Nested routes / route hierarchies (HAI3 uses flat screenset model)
- Route guards / middleware (separate concern)
- Optional parameters or wildcards (keep initial implementation simple)

## Decisions

### Decision 1: Use `path-to-regexp` for route matching

**What**: Add `path-to-regexp` as a dependency to `@hai3/framework`.

**Why**:
- Battle-tested library used by Express.js and React Router
- Lightweight (~3KB minified)
- Handles edge cases in route matching correctly
- Well-documented API

**Alternatives considered**:
- Custom regex implementation → Error-prone, maintenance burden
- URLPattern API → Not available in all browsers yet

### Decision 2: Optional `path` property on MenuItemConfig

**What**: Add `path?: string` to `MenuItemConfig` in `@hai3/screensets`.

**Why**:
- Backward compatible (existing configs without `path` continue to work)
- Follows existing pattern of optional config properties
- Path is defined at menu item level, not screen level, because the same screen could theoretically be mounted at different paths

**Fallback behavior**: When `path` is not specified, the system uses `/${screenId}` as the default pattern (current behavior).

### Decision 3: Route params via React Context

**What**: Create `RouteParamsContext` and `useRouteParams()` hook in `@hai3/react`.

**Why**:
- Follows React best practices for cross-cutting concerns
- Decouples param access from navigation state
- Allows screens to be tested with mock params
- Consistent with HAI3's existing context patterns (HAI3Context)

**Alternative considered**:
- Props drilling → Breaks lazy loading pattern, requires AppRouter changes
- Redux state → Overkill for ephemeral URL state, adds unnecessary complexity

### Decision 4: Extend NavigateToScreenPayload with params

**What**: Add `params?: Record<string, string>` to `NavigateToScreenPayload`.

**Why**:
- Enables programmatic navigation with params
- Type-safe at call site
- Consistent with existing payload pattern

## Data Flow

```
1. URL Change (browser navigation or programmatic)
   ↓
2. Navigation Plugin extracts path
   ↓
3. RouteRegistry.matchRoute(path) returns { screenId, screensetId, params }
   ↓
4. Redux state updated with screenId
   ↓
5. AppRouter receives screenId, extracts params from URL
   ↓
6. RouteParamsContext.Provider wraps screen with params
   ↓
7. Screen component calls useRouteParams() to access params
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Route conflicts (multiple patterns match same URL) | Routes are matched in registration order; first match wins. Document this behavior. |
| Performance with many routes | `path-to-regexp` compiles patterns once; matching is O(n) but n is typically small (<50 routes). |
| Breaking change if `path` becomes required | Keep `path` optional forever; default to `/${screenId}`. |
| New dependency (`path-to-regexp`) | Well-maintained, minimal footprint, no transitive deps. |

## Migration Plan

1. **No migration required** - This is purely additive
2. Existing screensets continue to work unchanged
3. New screens can opt-in to parameterized routes by adding `path` property
4. Documentation update to show new pattern

## Open Questions

1. **Should params be validated?** (e.g., `:id` must be numeric) - Defer to v2, keep simple for now
2. **Should we support optional params?** (e.g., `/users/:id?`) - Defer to v2
3. **How to handle 404 for unmatched routes?** - Current behavior (warn + no navigation) is acceptable for now
