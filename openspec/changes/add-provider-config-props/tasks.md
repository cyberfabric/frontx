## 1. Header Domain Configuration (consistent with Menu/Footer/Sidebar)
- [x] 1.1 Add `visible: boolean` to HeaderState in headerSlice.ts
- [x] 1.2 Add `setHeaderVisible` action to headerSlice.ts
- [x] 1.3 Add `setHeaderConfig` action to headerSlice.ts (Partial<HeaderState>)
- [x] 1.4 Add visibility check `if (!visible) return null` in Header.tsx
- [x] 1.5 Export setHeaderConfig from uicore index.ts

## 2. Router Configuration
- [x] 2.1 Create RouterConfig type with `type` field in HAI3Provider.tsx
- [x] 2.2 Add `router` prop to HAI3ProviderProps
- [x] 2.3 Pass router type to AppRouter component
- [x] 2.4 Implement conditional router selection in AppRouter (BrowserRouter/HashRouter/MemoryRouter)
- [x] 2.5 Export RouterConfig type from uicore index.ts

## 3. Layout Configuration
- [x] 3.1 Create LayoutConfig type in HAI3Provider.tsx
- [x] 3.2 Add `layout` prop to HAI3ProviderProps
- [x] 3.3 Create useApplyLayoutConfig hook and HAI3ProviderInner component
- [x] 3.4 Dispatch setHeaderConfig/setMenuConfig/setFooterConfig/setSidebarConfig based on layout prop
- [x] 3.5 Export LayoutConfig type from uicore index.ts

## 4. Validation
- [x] 4.1 Verify TypeScript compilation passes
- [x] 4.2 Run npm run arch:check
- [x] 4.3 Test in browser with different router types
- [x] 4.4 Test layout visibility toggling via props
