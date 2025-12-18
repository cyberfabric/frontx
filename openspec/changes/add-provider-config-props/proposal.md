# Change: Add HAI3Provider Configuration Props

## Why
Currently router type is hardcoded to BrowserRouter and layout parts visibility requires programmatic Redux dispatch. Developers need a declarative way to configure these settings at the application entry point.

## What Changes
- Add `router` prop to HAI3Provider accepting object with `type` (browser/hash/memory)
- Add `layout` prop to HAI3Provider for controlling visibility of layout parts (header, menu, footer, sidebar)
- Add `visible` flag to headerSlice (already exists in menu, footer, sidebar slices)
- AppRouter conditionally renders BrowserRouter/HashRouter/MemoryRouter based on config

## Impact
- Affected specs: app-configuration
- Affected code:
  - `packages/uicore/src/core/HAI3Provider.tsx`
  - `packages/uicore/src/core/routing/AppRouter.tsx`
  - `packages/uicore/src/layout/domains/header/headerSlice.ts`
  - `packages/uicore/src/layout/domains/header/Header.tsx`
  - `packages/uicore/src/index.ts`
