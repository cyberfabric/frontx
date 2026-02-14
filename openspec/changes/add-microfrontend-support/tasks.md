# Implementation Tasks

## Status

All MFE implementation tasks through Phase 30 are COMPLETE (409 tests passing: 364 screensets + 16 react + 45 framework, 4 tests skipped identifying validation gaps).

Phase 27 (React component migration) is COMPLETE. @hai3/screensets has zero React dependencies.

Phase 28 (ScreensetsRegistryConfig cleanup and test-only API removal) is COMPLETE.

Phase 29 (Public API cleanup — remove internal symbols from barrels) is COMPLETE.

Phase 30 (Framework MFE API cleanup) is COMPLETE.

### Completed Work

| Area | Description | Status |
|------|-------------|--------|
| Phases 1-26 | Type system, registry, contracts, isolation, mediation, domains, loading, errors, framework plugin, React integration, bridges, shadow DOM, caching, constants, dynamic registration, abstract class layers, cross-runtime routing, lifecycle actions, callback injection, container providers, Flux compliance | COMPLETE |
| Phase 27 | Move React-dependent components (RefContainerProvider, ExtensionDomainSlot) to @hai3/react; zero React dependencies in @hai3/screensets | COMPLETE |
| Phase 28 | Clean up ScreensetsRegistryConfig (remove test-only APIs, internal collaborator injection); move error callback to per-domain `registerDomain` | COMPLETE |
| Phase 29 | Remove ~43 leaked internals from public barrels; simplify `executeActionsChain` to `Promise<void>`; slim `TypeSystemPlugin` to 7 methods; slim `ChildMfeBridge` (remove `entryTypeId`, `subscribeToAllProperties`); remove `preload()` from `MfeHandler`; provide handlers via config only; update specs and design docs | COMPLETE |

### Current Construction Patterns

| Component | Pattern |
|-----------|---------|
| GtsPlugin | Singleton constant (`gtsPlugin`) |
| ScreensetsRegistry | Factory-with-cache (`screensetsRegistryFactory`) |
| MfeStateContainer | Internal construction by `DefaultMountManager` |

---

## Phase 30: Framework MFE API Cleanup

**Goal**: The `@hai3/framework` MFE public API exports ~30 symbols, most with zero consumer usage. Remove unused components, redundant actions, and trivial wrappers. Add missing `@hai3/screensets` re-exports so `@hai3/react` never imports from screensets directly (layering principle: L3 imports L2, not L1).

### 30.1 Remove Unused Vanilla DOM Components

Delete the following files entirely:
- `packages/framework/src/plugins/microfrontends/components/MfeErrorBoundary.ts`
- `packages/framework/src/plugins/microfrontends/components/MfeLoadingIndicator.ts`
- `packages/framework/src/plugins/microfrontends/components/ShadowDomContainer.ts`
- `packages/framework/src/plugins/microfrontends/components/index.ts` (entire `components/` directory)

Remove associated config types: `MfeErrorBoundaryConfig`, `MfeLoadingIndicatorConfig`, `ShadowDomContainerConfig`.

Remove all re-exports of these symbols from:
- `packages/framework/src/plugins/microfrontends/index.ts`
- `packages/framework/src/plugins/index.ts`
- `packages/framework/src/index.ts`

- [x] 30.1.1 Delete the `components/` directory and all 4 files.
- [x] 30.1.2 Remove component and config type exports from barrel files.

**Traceability**: Proposal -- these are unused placeholder components. `ShadowDomContainer` duplicates `createShadowRoot` + `injectCssVariables` from screensets. The component files themselves note "React-based equivalents should be in @hai3/react".

### 30.2 Remove Domain Factory Functions

Delete `packages/framework/src/plugins/microfrontends/base-domains.ts` entirely. The JSON domain definitions and factory functions (`createSidebarDomain()`, `createPopupDomain()`, `createScreenDomain()`, `createOverlayDomain()`) are trivial wrappers with zero consumer usage. Tests that need domain JSON constants can import from `gts/loader.ts` directly.

- [x] 30.2.1 Delete `base-domains.ts` entirely.
- [x] 30.2.2 Remove `base-domains` exports from barrel files (`packages/framework/src/plugins/microfrontends/index.ts`, `packages/framework/src/plugins/index.ts`, and the top-level `packages/framework/src/index.ts` barrel).

**Traceability**: Proposal -- unnecessary public API surface; consumers use domain JSON constants directly.

### 30.3 Remove Redundant Domain Registration Actions

Remove `registerDomain()` and `unregisterDomain()` action functions from `packages/framework/src/plugins/microfrontends/actions.ts`. Remove their payload types (`RegisterDomainPayload`, `UnregisterDomainPayload`). Remove from barrel exports and from the plugin's `provides.actions`. Remove the corresponding effects in `packages/framework/src/plugins/microfrontends/effects.ts` (domain registration/unregistration event handlers). Remove event augmentation entries for `mfe/registerDomainRequested` and `mfe/unregisterDomainRequested`. Remove `MfeEvents.RegisterDomainRequested` and `MfeEvents.UnregisterDomainRequested` from constants.

Reason: these actions do not update the store slice -- they proxy to `screensetsRegistry.registerDomain()` with error logging. Consumers should call `app.screensetsRegistry.registerDomain()` directly.

- [x] 30.3.1 Remove `registerDomain()` and `unregisterDomain()` from `actions.ts`.
- [x] 30.3.2 Remove `RegisterDomainPayload` and `UnregisterDomainPayload` types.
- [x] 30.3.3 Remove domain registration/unregistration effects from `effects.ts`. This includes the `RegisterDomainRequested` and `UnregisterDomainRequested` event subscriptions in `initMfeEffects` AND their corresponding cleanup entries in the returned cleanup function.
- [x] 30.3.4 Remove `MfeEvents.RegisterDomainRequested` and `MfeEvents.UnregisterDomainRequested` from constants.
- [x] 30.3.5 Remove event augmentation entries for domain registration events.
- [x] 30.3.6 Remove from barrel exports and plugin's `provides.actions`.

**Traceability**: Proposal -- domain registration is synchronous; Flux event/effect/slice round-trip adds no value. Direct `screensetsRegistry.registerDomain()` is sufficient.

### 30.4 Remove `preloadExtension` Action

Remove `preloadExtension()` from `packages/framework/src/plugins/microfrontends/actions.ts`. Remove from barrel exports and plugin's `provides.actions`.

Reason: `preloadExtension()` is identical to `loadExtension()` (both call `HAI3_ACTION_LOAD_EXT`); the only difference is `console.error` vs `console.warn` on failure.

- [x] 30.4.1 Remove `preloadExtension()` from `actions.ts`.
- [x] 30.4.2 Remove from barrel exports and plugin's `provides.actions`.
- [x] 30.4.3 Update the `onInit` debug log in `packages/framework/src/plugins/microfrontends/index.ts` (line ~124) that prints "MFE actions available: loadExtension, preloadExtension, mountExtension, unmountExtension" -- remove `preloadExtension` from the list.

**Traceability**: Proposal -- duplicate of `loadExtension()`. Consumers call `loadExtension()` for both explicit load and preload.

### 30.5 Add Missing Screensets Re-Exports to Framework

**Layering principle**: Framework (L2) must fully cover screensets (L1) so consumers never need a direct `@hai3/screensets` import. Currently `@hai3/react` imports these from screensets directly:
- `ChildMfeBridge` (type)
- `ParentMfeBridge` (type)
- `ScreensetsRegistry` (abstract class)
- `ContainerProvider` (class)
- `Extension` (type)

Additionally, ALL public screensets exports must be re-exported from framework. Verify and add re-exports for: `ExtensionDomain`, `MfeHandler`, `ActionsChain`, `Action`, `SharedProperty`, `LifecycleStage`, `LifecycleHook`, `MfeEntryLifecycle`, `MfeEntry`, `MfeEntryMF`, `JSONSchema`, `ValidationError`, `ValidationResult`, `TypeSystemPlugin`, `ScreensetsRegistryConfig`, `screensetsRegistryFactory`, `ScreensetsRegistryFactory`, `LoadExtPayload`, `MountExtPayload`, `UnmountExtPayload`, `createShadowRoot`, `injectCssVariables`, `HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`.

Then update `packages/react/src/` imports to use `@hai3/framework` instead of `@hai3/screensets`.

Note: This task covers MFE-related screensets exports only. Non-MFE screensets exports are already re-exported by framework.

- [x] 30.5.1 Add re-exports of all public `@hai3/screensets` MFE symbols from `packages/framework/src/index.ts`.
- [x] 30.5.2 Update all `packages/react/src/` imports to use `@hai3/framework` instead of `@hai3/screensets`.

**Traceability**: Proposal -- layering principle: L3 (@hai3/react) imports from L2 (@hai3/framework), never from L1 (@hai3/screensets).

### 30.6 Update Framework Tests

Update tests that reference removed symbols. Delete or update tests for:
- Removed components (`MfeErrorBoundary`, `MfeLoadingIndicator`, `ShadowDomContainer`)
- Removed domain factory functions (`createSidebarDomain`, etc.)
- Removed domain registration actions (`registerDomain`, `unregisterDomain`)
- Removed `preloadExtension` action

- [x] 30.6.1 Delete or update tests referencing removed components.
- [x] 30.6.2 Delete or update tests referencing removed domain factories.
- [x] 30.6.3 Delete or update tests referencing removed domain registration actions/effects.
- [x] 30.6.4 Delete or update tests referencing `preloadExtension`.

**Traceability**: Tests must compile and pass after symbol removal.

### 30.7 Validation

- [x] 30.7.1 Run `npm run type-check` -- must pass.
- [x] 30.7.2 Run `npm run test` -- all tests pass.
- [x] 30.7.3 Run `npm run build` -- must pass.
- [x] 30.7.4 Run `npm run lint` -- must pass.

### 30.8 Spec and Design Doc Alignment

- [x] 30.8.1 Remove references to deleted symbols (`MfeErrorBoundary`, `ShadowDomContainer`, `registerDomain()` action event bus section) from spec and design docs.

**Traceability**: Proposal -- design docs represent target state only; stale references to removed symbols must be cleaned up.
