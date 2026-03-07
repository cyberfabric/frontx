## 1. L1 — ScreensetsRegistry API change (screensets package)

- [x] 1.1 Add `updateSharedProperty(propertyId: string, value: unknown): void` abstract method to `ScreensetsRegistry` (`packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts`)
- [x] 1.2 Remove `updateDomainProperty(domainId, propertyTypeId, value)` abstract method from `ScreensetsRegistry`
- [x] 1.3 Remove `updateDomainProperties(domainId, properties)` abstract method from `ScreensetsRegistry`
- [x] 1.4 Add `updateSharedProperty` abstract method to `ExtensionManager` (`packages/screensets/src/mfe/runtime/extension-manager.ts`) — the internal abstraction that `ScreensetsRegistry` delegates to
- [x] 1.5 Remove `updateDomainProperty` abstract method from `ExtensionManager`

## 2. L1 — DefaultScreensetsRegistry / DefaultExtensionManager implementation

- [x] 2.1 Implement `updateSharedProperty` in `DefaultExtensionManager` (`packages/screensets/src/mfe/runtime/default-extension-manager.ts`): iterate all registered domains, check `domain.sharedProperties.includes(propertyId)`, perform GTS validation once (register + validateInstance) before propagation, then store/propagate the value to all matching domains. Validation MAY be performed once per call since the schema is derived from the property type ID, not per domain.
- [x] 2.2 Remove `updateDomainProperty` implementation from `DefaultExtensionManager`
- [x] 2.3 Implement `updateSharedProperty` in `DefaultScreensetsRegistry` (`packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`): delegate to `extensionManager.updateSharedProperty(propertyId, value)`
- [x] 2.4 Remove `updateDomainProperty` and `updateDomainProperties` implementations from `DefaultScreensetsRegistry`
- [x] 2.5 Verify `getDomainProperty` remains unchanged on both `ScreensetsRegistry` and `DefaultScreensetsRegistry`

## 3. L1 — Update screensets tests

- [x] 3.1 Rewrite `domain-properties.test.ts` — replace all `updateDomainProperty`/`updateDomainProperties` calls with `updateSharedProperty`; update assertions to match broadcast semantics (property set across all declaring domains); add a test verifying that late-registered domains do NOT retroactively receive prior property values (known limitation — the registering code is responsible for setting initial values after registration)
- [x] 3.2 Rewrite `property-validation.test.ts` — replace `updateDomainProperty` calls with `updateSharedProperty`; validation behavior unchanged (GTS register + validateInstance)
- [x] 3.3 Update `bridge-tracking.test.ts` — remove `updateDomainProperty`/`updateDomainProperties` from public API assertions, add `updateSharedProperty`

## 4. L2 — Microfrontends plugin config change (framework package)

- [x] 4.1 Remove `theme/changed` event listener from `microfrontends()` `onInit` (lines ~153-162)
- [x] 4.2 Remove `i18n/language/changed` event listener from `microfrontends()` `onInit` (lines ~163-172)
- [x] 4.3 Remove `propagationCleanup` closure and its call in `onDestroy`

## 5. L2 — Move propagation to owning plugins

- [x] 5.1 In `themes.ts` `onInit`, rename the `_app` parameter to `app` (the underscore prefix indicated the parameter was unused; it is now needed), then add `app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, payload.themeId)` inside the `theme/changed` event handler, wrapped in try/catch that logs the error on failure (GTS validation errors must not crash the event handler or prevent the theme registry from applying the theme)
- [x] 5.2 In `i18n.ts` `onInit`, rename the `_app` parameter to `app` (the underscore prefix indicated the parameter was unused; it is now needed), then add `app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, payload.language)` inside the `i18n/language/changed` event handler, wrapped in try/catch that logs the error on failure (GTS validation errors must not crash the event handler or prevent the i18n registry from setting the language)

## 6. L2 — Preset passes config through without defaults

- [x] 6.1 Update `full()` preset in `packages/framework/src/presets/index.ts` to forward `config?.microfrontends` to `microfrontends()` without injecting domain defaults
- [x] 6.2 Verify `createHAI3App()` with zero args builds a valid app with no pre-declared domains

## 7. L2 — Update framework tests

- [x] 7.1 Rewrite `theme-language-propagation.test.ts` — tests should verify propagation through `themes()` and `i18n()` plugins via `updateSharedProperty`, not through `microfrontends()` plugin via `updateDomainProperty`
- [x] 7.2 Update any framework tests that reference `updateDomainProperty` or `updateDomainProperties`
- [x] 7.3 Add test cases for the soft-dependency path where `app.screensetsRegistry` is `undefined`: verify that `themes()` plugin works correctly (theme applies, no error thrown) when microfrontends plugin is not installed; verify that `i18n()` plugin works correctly (language sets, no error thrown) when microfrontends plugin is not installed. The `?.` optional chain must silently skip propagation, not throw.

## 8. L3 — Re-exports (react package)

- [x] 8.1 Verify `updateSharedProperty` types and any new exports from `@hai3/framework` are re-exported from `@hai3/react`
- [x] 8.2 Verify `screenDomain`, `sidebarDomain`, `popupDomain`, `overlayDomain` remain importable from `@hai3/react`

## 9. Documentation and example updates

- [x] 9.1 Update `packages/screensets/docs/mfe/example-mfe.md` — replace `updateDomainProperty` usage with `updateSharedProperty`
- [x] 9.2 Update any existing nested MFE examples to show manual bridge forwarding pattern: `bridge.subscribeToProperty()` → `registry.updateSharedProperty()`
- [x] 9.3 Update `packages/screensets/CLAUDE.md` — replace references to `updateDomainProperty` with `updateSharedProperty` to reflect the new API surface

## 10. Build and integration verification

- [x] 10.1 Rebuild screensets package (`npm run build --workspace=@hai3/screensets`)
- [x] 10.2 Run screensets tests (`cd packages/screensets && npx vitest run`)
- [x] 10.3 Rebuild framework package (`npm run build --workspace=@hai3/framework`)
- [x] 10.4 Run framework tests (`cd packages/framework && npx vitest run`)
- [x] 10.5 Run react package tests (`cd packages/react && npx vitest run`)
