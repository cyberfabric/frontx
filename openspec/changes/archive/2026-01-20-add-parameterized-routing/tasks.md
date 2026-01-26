## 1. SDK Layer (L1) - @hai3/screensets

- [x] 1.1 Add optional `path` property to `MenuItemConfig` interface in `packages/screensets/src/types.ts`
- [x] 1.2 Update type exports in `packages/screensets/src/index.ts` if needed
- [x] 1.3 Build @hai3/screensets package

## 2. Framework Layer (L2) - @hai3/framework

- [x] 2.1 Add `path-to-regexp` dependency to `packages/framework/package.json`
- [x] 2.2 Create `packages/framework/src/utils/routeMatcher.ts` with pattern matching utilities
- [x] 2.3 Extend `NavigateToScreenPayload` with optional `params` in `packages/framework/src/types.ts`
- [x] 2.4 Extend `RouteRegistry` interface with `matchRoute()` method in `packages/framework/src/types.ts`
- [x] 2.5 Update `createRouteRegistry()` to build route patterns and implement `matchRoute()` in `packages/framework/src/registries/routeRegistry.ts`
- [x] 2.6 Update navigation plugin to handle params in URL generation and extraction in `packages/framework/src/plugins/navigation.ts`
- [x] 2.7 Build @hai3/framework package

## 3. React Layer (L3) - @hai3/react

- [x] 3.1 Create `RouteParamsContext` in `packages/react/src/contexts/RouteParamsContext.tsx`
- [x] 3.2 Create `useRouteParams()` hook in `packages/react/src/hooks/useRouteParams.ts`
- [x] 3.3 Update `AppRouter` to extract params and provide via context in `packages/react/src/components/AppRouter.tsx`
- [x] 3.4 Export new context and hook from `packages/react/src/index.ts`
- [x] 3.5 Build @hai3/react package

## 4. Validation

- [x] 4.1 Run `npm run arch:check` to verify architecture rules
- [x] 4.2 Run `npm run build:packages` to verify all packages build
- [x] 4.3 Test parameterized routing manually via dev server
- [x] 4.4 Verify backward compatibility (screens without `path` still work)
