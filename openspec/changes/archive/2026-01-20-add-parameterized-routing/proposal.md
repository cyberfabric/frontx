# Change: Add Parameterized Routing Support

## Why

HAI3 currently uses flat URL routing (`/{base}/{screenId}`) with no support for route parameters. This limits the ability to create screens that depend on URL parameters (e.g., `/users/:id`, `/orders/:orderId/items/:itemId`). Modern applications require parameterized routes for deep linking, bookmarking, and RESTful URL patterns.

## What Changes

- **Extend `MenuItemConfig`** with optional `path` property for custom route patterns (e.g., `/users/:id`)
- **Add route matching logic** in `routeRegistry` using `path-to-regexp` for pattern matching and parameter extraction
- **Extend `NavigateToScreenPayload`** to include optional `params` for passing route parameters
- **Provide route params to screens** via React context accessible through `useRouteParams()` hook
- **Update `AppRouter`** to extract params from URL and provide them to screen components
- **Update navigation plugin** to handle parameterized URL generation and parsing

## Impact

- **Affected specs**: `screensets` (MenuItemConfig extension), new `routing` capability
- **Affected code**:
  - `packages/screensets/src/types.ts` - MenuItemConfig interface
  - `packages/framework/src/types.ts` - NavigateToScreenPayload, RouteRegistry
  - `packages/framework/src/registries/routeRegistry.ts` - Route matching logic
  - `packages/framework/src/plugins/navigation.ts` - URL sync with params
  - `packages/react/src/components/AppRouter.tsx` - Param extraction and context
  - `packages/react/src/hooks/useRouteParams.ts` - New hook (to be created)
  - `packages/react/src/contexts/RouteParamsContext.tsx` - New context (to be created)
- **New dependency**: `path-to-regexp` (lightweight, well-maintained, used by Express/React Router)
