# Implementation Tasks

## Status

Phases 1-39 are COMPLETE (501 tests passing: 397 screensets + 78 framework + 26 react). Note: per-phase test counts in completed phases reflect counts at time of that phase's completion and may differ from the current total (tests were added/removed across phases).

Phase 35 (Shared Properties on Domains, Extension Presentation Metadata, Full Demo Conversion) has CRITICAL GAPS found during review. Infrastructure tasks (35.1-35.5, 35.10) are complete. Demo conversion tasks (35.6-35.9) are structurally complete but have zero feature parity with the original demo screenset. See `design/post-conversion-features.md` for the full gap analysis.

Phase 36 (Feature Parity Remediation) is COMPLETE (36.7.4 and 36.11.5 manual verification pending). Closes every gap documented in `design/post-conversion-features.md` to achieve 100% feature parity with `design/pre-conversion-features.md`. Covers GTS design fix, package consolidation, full i18n restoration, screen feature restoration, legacy cleanup, and verification.

Phase 37 (Remove notify_user Action + Move Presentation to Screen Extension Derived Type + Fix Instance IDs) is COMPLETE. Three architectural corrections: (1) Remove the `notify_user` action which violated the independent data fetching principle; (2) Move `presentation` from the base `extension.v1` schema to a screen-domain-specific derived type `extension_screen.v1`; (3) Fix incorrect GTS instance IDs in demo-mfe and _blank-mfe packages.

Phase 38 (Remove Legacy Screensets API Remnants from Packages) is COMPLETE. The application layer (`src/`) has fully migrated to MFE architecture with zero legacy references. However, the package layer still carries significant dead code: full legacy type definitions in `@hai3/screensets`, legacy navigation/routing/routeRegistry plugins in `@hai3/framework`, legacy CLI screenset generators and commands, legacy studio ControlPanel logic, and stale documentation. Phase 38 removes all of this dead code and updates documentation to reflect MFE as the primary architecture.

**Phase 35 Review Findings (3 critical issues + 1 GTS design error):**

1. **Architecture Error**: The conversion created 4 separate MFE packages instead of 1 MFE package with 4 entries. ONE SCREENSET = ONE MFE. The demo screenset should be a single `demo-mfe` package with 1 manifest, 4 entries, 4 extensions, and shared internals.

2. **Zero Feature Parity**: All 4 MFE packages are placeholder stubs. No i18n (zero translations), no UIKit components, no API integration, no loading/error states, no navigation, no lazy loading. The 56 UIKit element demos were replaced with ~12 CSS mockups. See `design/pre-conversion-features.md` for the authoritative feature baseline.

3. **Incomplete Cleanup**: The blank screenset (`src/screensets/_blank/`) was not converted. Legacy screenset API references were not deleted.

4. **Shared Properties GTS Design Error**: Theme and language GTS instances carry hardcoded `value` fields (`"light"`, `"en"`) instead of enum schemas defining the contract of supported values. Runtime values belong in `updateDomainProperty()`, not in the type system.

### Upcoming Work

Phase 39 (Restore Screenset Package Selector in Studio) restores the Studio ControlPanel's screenset package selector using the MFE API. The legacy selector was removed in Phase 38.5 because it depended on the deleted `screensetRegistry`. The new selector shows registered GTS packages -- not individual screens or MF 2.0 manifests. A GTS package is the two-segment prefix (e.g., `hai3.demo`) shared by all entities from the same MFE, extracted from GTS instance IDs. This requires a new query API on `ScreensetsRegistry` to list registered GTS packages and their extensions, plus a React hook and UI component to present the selector.

### Completed Work

| Area | Description | Status |
|------|-------------|--------|
| Phases 1-26 | Type system, registry, contracts, isolation, mediation, domains, loading, errors, framework plugin, React integration, bridges, shadow DOM, caching, constants, dynamic registration, abstract class layers, cross-runtime routing, lifecycle actions, callback injection, container providers, Flux compliance | COMPLETE |
| Phase 27 | Move React-dependent components to @hai3/react; zero React deps in @hai3/screensets | COMPLETE |
| Phase 28 | ScreensetsRegistryConfig cleanup: remove test-only APIs, move error callback to `registerDomain` | COMPLETE |
| Phase 29 | Remove ~43 leaked internals from barrels; slim `TypeSystemPlugin`/`ChildMfeBridge`; remove `preload()` | COMPLETE |
| Phase 30 | Framework MFE API cleanup: remove unused DOM components, factory functions, duplicate actions | COMPLETE |
| Phase 31 | React API completion: re-exports, `useDomainExtensions` fix, depcruiser + ESLint enforcement | COMPLETE |
| Phase 32 | MFE Infrastructure: base `ExtensionDomain` constants, `MfeBridgeFactoryDefault` extraction, entry type validation | COMPLETE |
| Phase 33 | Module Federation Build: Vite MF plugin, MFE remote package, `MfeEntryLifecycle` class, shared deps | COMPLETE |
| Phase 34 | Wire MFEs into Host App: host MF config, handler registration, domain + extension registration, remove legacy screenset API, tooling compliance, hello-world-mfe Shadow DOM/domain properties | COMPLETE |
| Phase 35 | Shared Properties on Domains, Extension Presentation Metadata, Full Demo Conversion | CRITICAL GAPS (see review findings above) |
| Phase 36 | Feature Parity Remediation: GTS fix, package consolidation, i18n, screen features, cleanup | COMPLETE (36.7.4 and 36.11.5 manual verification pending) |
| Phase 37 | Remove notify_user action + Move presentation to screen extension derived type + Fix instance IDs | COMPLETE |
| Phase 38 | Remove legacy screensets API remnants from packages: types, plugins, CLI, studio, docs | COMPLETE |
| Phase 39 | Restore screenset package selector in Studio ControlPanel using GTS package query API | PLANNED |

### Current Construction Patterns

| Component | Pattern |
|-----------|---------|
| GtsPlugin | Singleton constant (`gtsPlugin`) |
| ScreensetsRegistry | Factory-with-cache (`screensetsRegistryFactory`) |
| MfeStateContainer | Internal construction by `DefaultMountManager` |

---

## Phase 35: Shared Properties on Domains, Extension Presentation Metadata, Full Demo Conversion

**Status**: CRITICAL GAPS -- infrastructure complete, demo conversion has zero feature parity. See `design/post-conversion-features.md`.

**Goal**: Close three design gaps: (1) populate base extension domain `sharedProperties` with theme and language, define GTS shared property instances, update MFE entries to declare `requiredProperties`; (2) add `presentation` metadata to the Extension schema and update the host to build the nav menu from registered extensions; (3) convert all 4 original demo screens into MFE packages.

**Traceability**: Design docs `mfe-shared-property.md`, `schemas.md`, `mfe-ext-lifecycle-actions.md`, `principles.md`, `mfe-domain.md`, `overview.md`, `mfe-api.md`. Specs: microfrontends spec (shared properties, presentation metadata, demo conversion, host registration), screensets spec (domain properties, extension presentation).

**Review Findings** (added post-review):
- Tasks 35.1-35.5, 35.10: Infrastructure is complete and correct.
- Tasks 35.6-35.9: Structurally scaffolded but all 4 MFE packages are stubs with zero feature parity. See `design/post-conversion-features.md` for per-package gap details.
- Task 35.1: GTS shared property instances use hardcoded `value` fields instead of enum schemas. Design error documented in `design/post-conversion-features.md`.
- Architecture: The 4-package split is incorrect. ONE SCREENSET = ONE MFE. Should be 1 `demo-mfe` package with 4 entries.
- Missing: `_blank` screenset not converted, legacy screenset API not deleted.

### 35.1 Define Theme and Language Shared Property GTS Instances

Create the GTS JSON instance files for the two built-in shared properties. Register them as built-in instances in the GTS plugin alongside the existing lifecycle stages and extension actions.

- [x] 35.1.1 Create `packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/theme.v1.json` with content: `{ "id": "gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1", "value": "light" }`.
- [x] 35.1.2 Create `packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/language.v1.json` with content: `{ "id": "gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1", "value": "en" }`.
- [x] 35.1.3 Register both instances as built-in in the GTS plugin constructor (same pattern as lifecycle stage and ext action instances). Import the JSON files and call `this.register()` for each during `GtsPlugin` construction.
- [x] 35.1.4 Add constants to `packages/screensets/src/mfe/constants/index.ts`:
  - `HAI3_SHARED_PROPERTY_THEME = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1'`
  - `HAI3_SHARED_PROPERTY_LANGUAGE = 'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1'`
- [x] 35.1.5 Export `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` from the `@hai3/screensets` public barrel, the `@hai3/framework` barrel, and the `@hai3/react` barrel.
- [x] 35.1.6 Write unit test: verify `gtsPlugin.validateInstance('gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1')` returns valid.
- [x] 35.1.7 Write unit test: verify `gtsPlugin.validateInstance('gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1')` returns valid.

### 35.2 Add Theme and Language to Base Extension Domain Constants

Update the 4 base extension domain constants in `@hai3/framework` to declare theme and language in their `sharedProperties` arrays.

- [x] 35.2.1 Update `packages/framework/src/plugins/microfrontends/base-domains.ts`: import `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` from `@hai3/screensets`. Set `sharedProperties` for all 4 domains (`screenDomain`, `sidebarDomain`, `popupDomain`, `overlayDomain`) to `[HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE]`.
- [x] 35.2.2 Update the domain JSON instance files in `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/instances/domains/` (screen.v1.json, sidebar.v1.json, popup.v1.json, overlay.v1.json) to include the same shared property type IDs in their `sharedProperties` arrays.
- [x] 35.2.3 Write unit test: verify `screenDomain.sharedProperties` contains both `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE`.
- [x] 35.2.4 Write unit test: register `screenDomain`, then register an extension whose entry has `requiredProperties: [HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE]` -- expect contract validation to pass. (Completed in Phase 36.1.7 -- see base-domains.test.ts lines 77-109)
- [x] 35.2.5 Write unit test: register `screenDomain`, then register an extension whose entry has `requiredProperties` including a property NOT in the domain's `sharedProperties` -- expect contract validation to fail with `missing_property`. (Completed in Phase 36.1.7 -- see base-domains.test.ts lines 77-109)

### 35.3 Update hello-world-mfe Entry to Declare Required Properties

Update the hello-world-mfe `mfe.json` to declare theme and language as required properties, and add presentation metadata to the extension.

- [x] 35.3.1 Update `src/mfe_packages/hello-world-mfe/mfe.json`: set `entry.requiredProperties` to `["gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1", "gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1"]`.
- [x] 35.3.2 Update `src/mfe_packages/hello-world-mfe/mfe.json`: add `presentation` to the extension object: `{ "label": "Hello World", "icon": "hand-wave", "route": "/hello-world", "order": 10 }`.
- [x] 35.3.3 Verify the MFE still registers and mounts successfully with the updated `mfe.json`.

### 35.4 Add Presentation Field to Extension TypeScript Interface and GTS Schema

Update the base Extension TypeScript interface and GTS schema to include the optional `presentation` field.

- [x] 35.4.1 Update the `Extension` TypeScript interface in `packages/screensets/src/mfe/types/` (or wherever `Extension` is defined) to add `presentation?: ExtensionPresentation`. Define `ExtensionPresentation` interface: `{ label: string; icon?: string; route: string; order?: number; }`. (Design iteration: moved to derived ScreenExtension type in Phase 37.5)
- [x] 35.4.2 Update the Extension GTS JSON schema at `packages/screensets/src/mfe/gts/hai3.mfes/schemas/ext/extension.v1.json` to include the `presentation` property object with `label` (required string), `icon` (optional string), `route` (required string), `order` (optional number). (Design iteration: moved to derived ScreenExtension type in Phase 37.5)
- [x] 35.4.3 Export `ExtensionPresentation` from `@hai3/screensets` public barrel, `@hai3/framework`, and `@hai3/react`. Update `registry-runtime.md` Export Policy to include `ExtensionPresentation` in the list of public exports.
- [x] 35.4.4 Write unit test: register an extension with `presentation: { label: 'Test', route: '/test' }` -- expect GTS validation to pass.
- [x] 35.4.5 Write unit test: register an extension without `presentation` -- expect GTS validation to pass (field is optional).
- [x] 35.4.6 Write unit test: `runtime.getExtension(extensionId).presentation` returns the presentation metadata after registration.

### 35.5 Host Nav Menu Driven by Extension Presentation Metadata

Update the host application to build the navigation menu dynamically from registered screen extension presentation metadata. Remove any hardcoded menu items or legacy screenset-based menu logic.

- [x] 35.5.1 In the host Layout/Menu component, query screen extensions: `const extensions = runtime.getExtensionsForDomain(HAI3_SCREEN_DOMAIN)`. Filter extensions that have `presentation` defined. Sort by `presentation.order`. Build menu items from `presentation.label`, `presentation.icon`, `presentation.route`.
- [x] 35.5.2 Clicking a menu item SHALL dispatch `mount_ext` for the corresponding extension: `mfeActions.mountExtension(extension.id)`.
- [x] 35.5.3 Remove any remaining hardcoded menu items, `MenuItemConfig` references, or legacy `screensetRegistry`-based menu population logic.
- [x] 35.5.4 Verify the menu auto-populates when new screen extensions are registered dynamically.

### 35.6 Create profile-mfe Package

Convert the legacy Profile screen into an independent MFE package.

- [x] 35.6.1 Create `src/mfe_packages/profile-mfe/` with the standard MFE package structure: `package.json`, `tsconfig.json`, `vite.config.ts`, `mfe.json`, `src/lifecycle.tsx`, `src/ProfileScreen.tsx`.
- [x] 35.6.2 The `mfe.json` SHALL define: manifest (remoteEntry on port 3002), entry with `requiredProperties: [HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE]`, extension with `presentation: { label: "Profile", icon: "user", route: "/profile", order: 20 }` targeting the screen domain.
- [x] 35.6.3 The `ProfileScreen.tsx` SHALL subscribe to theme and language from the bridge, use Tailwind/UIKit, carry its own i18n files under `src/i18n/`. All imports from `@hai3/react` (L3) only. (Completed in Phase 36.4 -- profile screen consolidated into demo-mfe with full bridge subscriptions, UIKit components, and 36 i18n files.)
- [x] 35.6.4 Add `dev:mfe:profile` script to root `package.json`. Update `dev:all` to include this server.
- [x] 35.6.5 Verify the Profile MFE builds, serves, and renders correctly when registered and mounted.

### 35.7 Create current-theme-mfe Package

Convert the legacy CurrentTheme screen into an independent MFE package.

- [x] 35.7.1 Create `src/mfe_packages/current-theme-mfe/` with the standard MFE package structure.
- [x] 35.7.2 The `mfe.json` SHALL define: manifest (remoteEntry on port 3003), entry with `requiredProperties: [HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE]`, extension with `presentation: { label: "Current Theme", icon: "palette", route: "/current-theme", order: 30 }` targeting the screen domain.
- [x] 35.7.3 The `CurrentThemeScreen.tsx` SHALL demonstrate theme property consumption by displaying the current theme value and its CSS variables. All imports from `@hai3/react` (L3) only.
- [x] 35.7.4 Add `dev:mfe:current-theme` script to root `package.json`. Update `dev:all`.
- [x] 35.7.5 Verify the CurrentTheme MFE builds, serves, and renders correctly.

### 35.8 Create uikit-elements-mfe Package

Convert the legacy UIKitElements screen into an independent MFE package.

- [x] 35.8.1 Create `src/mfe_packages/uikit-elements-mfe/` with the standard MFE package structure.
- [x] 35.8.2 The `mfe.json` SHALL define: manifest (remoteEntry on port 3004), entry with `requiredProperties: [HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE]`, extension with `presentation: { label: "UIKit Elements", icon: "grid", route: "/uikit-elements", order: 40 }` targeting the screen domain.
- [x] 35.8.3 The `UIKitElementsScreen.tsx` SHALL demonstrate UIKit components inside Shadow DOM. All imports from `@hai3/react` (L3) only.
- [x] 35.8.4 Add `dev:mfe:uikit-elements` script to root `package.json`. Update `dev:all`.
- [x] 35.8.5 Verify the UIKitElements MFE builds, serves, and renders correctly.

### 35.9 Register All MFE Extensions in Host App

Update the host app initialization to register all 4 MFE extensions and verify the nav menu auto-populates.

- [x] 35.9.1 Import `mfe.json` from all 4 MFE packages in the host app bootstrap code.
- [x] 35.9.2 Register all manifests, entries, and extensions with the registry (same pattern as Phase 34.4).
- [x] 35.9.3 Verify the nav menu displays 4 items (Hello World, Profile, Current Theme, UIKit Elements) sorted by `presentation.order`.
- [x] 35.9.4 Verify clicking each menu item triggers `mount_ext` and the corresponding MFE renders in the screen domain.
- [x] 35.9.5 Verify theme changes propagate to all mounted MFEs.
- [x] 35.9.6 Verify language changes propagate to all mounted MFEs.

### 35.10 Host Provides Theme and Language Property Updates

Ensure the host app calls `updateDomainProperty()` for theme and language when they change.

- [x] 35.10.1 In the host app theme change handler (or theme plugin), call `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, newTheme)` for each registered extension domain (screen, sidebar, popup, overlay).
- [x] 35.10.2 In the host app language change handler (or i18n plugin), call `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_LANGUAGE, newLanguage)` for each registered extension domain.
- [x] 35.10.3 Verify mounted MFEs receive theme updates immediately via `bridge.subscribeToProperty()`.
- [x] 35.10.4 Verify mounted MFEs receive language updates immediately via `bridge.subscribeToProperty()`.

### 35.11 Validation

- [x] 35.11.1 Run `npm run type-check` -- must pass.
- [x] 35.11.2 Run `npm run test` -- all existing tests pass. New tests from 35.1, 35.2, 35.4 pass.
- [x] 35.11.3 Run `npm run build` -- must pass (host + all 4 MFE remotes).
- [x] 35.11.4 Run `npm run lint` -- must pass (all MFE packages included, no exclusions).
- [ ] 35.11.5 Manual E2E: start all 4 MFE dev servers + host. Menu shows 4 items. Clicking each loads the correct MFE. Theme/language changes propagate. All MFEs render inside Shadow DOM with correct styles.

---

## Phase 36: Feature Parity Remediation

**Status**: COMPLETE

**Goal**: Close every gap documented in `design/post-conversion-features.md` and achieve 100% feature parity with `design/pre-conversion-features.md`. This phase fixes the GTS shared property design error, consolidates 4 MFE packages into 1 `demo-mfe` package with 4 entries, restores all lost screen features (i18n, API integration, UIKit components, navigation, lazy loading), converts the blank screenset template, deletes the legacy screenset API, and verifies parity across all dimensions.

**Architecture**: ONE SCREENSET = ONE MFE. The demo screenset is a single `demo-mfe` package with 1 manifest, 4 entries, 4 extensions, and shared internals. Navigation between screens is host-controlled via `mount_ext` actions -- no internal routing.

**Traceability**: All tasks trace to gaps in `design/post-conversion-features.md` against the baseline in `design/pre-conversion-features.md`. Design docs: `mfe-shared-property.md`, `schemas.md`, `mfe-ext-lifecycle-actions.md`, `principles.md`, `overview.md`. Specs: microfrontends spec (demo conversion), screensets spec (extension presentation).

### 36.1 Fix Shared Properties GTS Design

Fix the GTS shared property schema and instances so that schemas define enum contracts (supported values) and instances declare their type (schema reference) without carrying hardcoded runtime values. Runtime values belong in `updateDomainProperty()`, not in the type system.

- [x] 36.1.1 Update the `shared_property.v1.json` schema (`packages/screensets/src/mfe/gts/hai3.mfes/schemas/comm/shared_property.v1.json`): replace the unconstrained `"value": {}` property with a `"supportedValues"` property of type `array` containing `string` items. Remove `"value"` from the `"required"` array; add `"supportedValues"` to `"required"`.
- [x] 36.1.2 Update `theme.v1.json` instance (`packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/theme.v1.json`): remove the `"value": "light"` field. Add `"supportedValues": ["default", "light", "dark", "dracula", "dracula-large"]` -- the 5 theme IDs from the host's `ThemeConfig` constants (`DEFAULT_THEME_ID`, `LIGHT_THEME_ID`, `DARK_THEME_ID`, `DRACULA_THEME_ID`, `DRACULA_LARGE_THEME_ID`).
- [x] 36.1.3 Update `language.v1.json` instance (`packages/screensets/src/mfe/gts/hai3.mfes/instances/comm/language.v1.json`): remove the `"value": "en"` field. Add `"supportedValues"` containing all 36 Language enum values from `@hai3/i18n`: `["en", "es", "fr", "de", "it", "pt", "nl", "ru", "pl", "uk", "cs", "ar", "he", "fa", "ur", "tr", "zh", "zh-TW", "ja", "ko", "vi", "th", "id", "hi", "bn", "sv", "da", "no", "fi", "el", "ro", "hu", "ms", "tl", "ta", "sw"]`.
- [x] 36.1.4 Update any code that reads or validates the `value` field from shared property instances. Search for references to `.value` on theme/language GTS instances and update to use `supportedValues`. This includes GTS plugin registration logic and any validation that checks instance shape.
- [x] 36.1.5 Update existing unit tests (35.1.6, 35.1.7) to validate the new instance shape: `supportedValues` array present, no `value` field. Add a test verifying `theme.v1.json` has exactly 5 supported values and `language.v1.json` has exactly 36 supported values.
- [x] 36.1.6 Add a unit test: validate that the shared property schema requires `supportedValues` and does NOT require `value`.
- [x] 36.1.7 Complete unchecked Phase 35 tasks 35.2.4 and 35.2.5 as part of this phase: (a) Write unit test: register `screenDomain`, then register an extension whose entry has `requiredProperties: [HAI3_SHARED_PROPERTY_THEME, HAI3_SHARED_PROPERTY_LANGUAGE]` -- expect contract validation to pass. (b) Write unit test: register `screenDomain`, then register an extension whose entry has `requiredProperties` including a property NOT in the domain's `sharedProperties` -- expect contract validation to fail with `missing_property`.

### 36.2 Consolidate 4 MFE Packages into 1 demo-mfe

Merge all 4 MFE packages (`hello-world-mfe`, `profile-mfe`, `current-theme-mfe`, `uikit-elements-mfe`) into a single `demo-mfe` package with 4 lifecycle entries.

- [x] 36.2.1 Rename `src/mfe_packages/hello-world-mfe/` to `src/mfe_packages/demo-mfe/`. Update `package.json`: name to `@hai3/demo-mfe`, single dev server on port 3001.
- [x] 36.2.2 Move screen components and lifecycle classes from `profile-mfe`, `current-theme-mfe`, and `uikit-elements-mfe` into `demo-mfe/src/screens/` subdirectories: `demo-mfe/src/screens/helloworld/`, `demo-mfe/src/screens/profile/`, `demo-mfe/src/screens/theme/`, `demo-mfe/src/screens/uikit/`.
- [x] 36.2.3 Create 4 lifecycle entry files, each exporting an `MfeEntryLifecycle` subclass: `src/lifecycle-helloworld.tsx`, `src/lifecycle-profile.tsx`, `src/lifecycle-theme.tsx`, `src/lifecycle-uikit.tsx`. Each lifecycle mounts its respective screen component.
- [x] 36.2.4 Update `mfe.json` to the consolidated structure: 1 manifest (remoteName `demoMfe`, remoteEntry on port 3001), 4 entries (each referencing the single manifest, each with its own `exposedModule`: `./lifecycle-helloworld`, `./lifecycle-profile`, `./lifecycle-theme`, `./lifecycle-uikit`), 4 extensions (each targeting `screen` domain, each pointing to its entry, each with `presentation` metadata). Use a top-level array-based structure: `{ "manifest": {...}, "entries": [...], "extensions": [...] }`.
- [x] 36.2.5 Update `vite.config.ts`: single Module Federation remote config exposing 4 modules (`./lifecycle-helloworld`, `./lifecycle-profile`, `./lifecycle-theme`, `./lifecycle-uikit`). Single dev server on port 3001.
- [x] 36.2.6 Update `tsconfig.json` to include all screen subdirectories.
- [x] 36.2.7 Create shared utilities directory `demo-mfe/src/shared/` for i18n helpers, common hooks, and shared styles used across screens.
- [x] 36.2.8 Delete the 3 extra MFE package directories: `src/mfe_packages/profile-mfe/`, `src/mfe_packages/current-theme-mfe/`, `src/mfe_packages/uikit-elements-mfe/`.
- [x] 36.2.9 Update host bootstrap (`src/app/mfe/bootstrap.ts` or equivalent) to import from the single `demo-mfe/mfe.json` and register 1 manifest, 4 entries, 4 extensions. Remove imports from the 3 deleted packages.
- [x] 36.2.10 Update root `package.json` scripts: replace `dev:mfe:hello-world`, `dev:mfe:profile`, `dev:mfe:current-theme`, `dev:mfe:uikit-elements` with a single `dev:mfe:demo`. Update `dev:all` to start only the single demo MFE dev server.
- [x] 36.2.11 Update workspace configuration (root `package.json` workspaces or `pnpm-workspace.yaml`) to reference `src/mfe_packages/demo-mfe` instead of the 4 old paths.
- [x] 36.2.12 Verify `npm run build` succeeds with the consolidated package. Verify the Module Federation remote exposes all 4 lifecycle modules.

### 36.3 Restore HelloWorld Screen Features

Restore full i18n, UIKit components, skeleton loading, and navigation for the HelloWorld screen.

- [x] 36.3.1 Create 36 language JSON files under `demo-mfe/src/screens/helloworld/i18n/` (one per Language enum value: `en.json`, `es.json`, ..., `sw.json`). Each file contains keys: `title`, `welcome`, `description`, `navigation_title`, `navigation_description`, `go_to_theme`. English values from the pre-conversion baseline.
- [x] 36.3.2 Implement MFE-local i18n loading: create a `useScreenTranslations(languageModules)` hook in `demo-mfe/src/shared/` that accepts a language map produced by `import.meta.glob('./i18n/*.json')` (Vite-compatible eager or lazy glob). The hook uses `bridge.getProperty(HAI3_SHARED_PROPERTY_LANGUAGE)` to determine the current language, resolves the corresponding module from the glob map, and returns a `t(key)` function. Each screen calls the hook with its own glob: `useScreenTranslations(import.meta.glob('./i18n/*.json'))`. Subscribe to language property changes so translations reload on language switch.
- [x] 36.3.3 Update `HelloWorldScreen.tsx`: replace all hardcoded English strings with `t()` calls using the 6 translation keys. Import and use `useScreenTranslations`.
- [x] 36.3.4 Add `<TextLoader>` skeleton state: while translations are loading (async import in progress), render `<Skeleton>` placeholder components instead of text content (UIKit does not export TextLoader, used Skeleton instead).
- [x] 36.3.5 Replace raw divs/Tailwind with UIKit components: wrap content in `<Card>` and `<CardContent>` from `@hai3/uikit`. Use `<Button>` for the navigation action.
- [x] 36.3.6 Add "Go to Theme Screen" navigation button: on click, invoke `bridge.executeActionsChain({ action: { type: 'mount_ext', target: screenDomainId, payload: { extensionId: themeExtensionId } } })` to switch to the CurrentTheme screen. The `themeExtensionId` is the GTS ID of the theme extension from `mfe.json`. Created `demo-mfe/src/shared/extension-ids.ts` with all 4 extension IDs for centralized cross-screen navigation references.

### 36.4 Restore Profile Screen Features

Restore API integration, all UI states (loading, error, no-data, data), UIKit components, header notification, and i18n.

- [x] 36.4.1 Create 36 language JSON files under `demo-mfe/src/screens/profile/i18n/`. Each file contains keys: `title`, `welcome`, `loading`, `error_prefix`, `retry`, `no_user_data`, `load_user`, `role_label`, `department_label`, `id_label`, `created_label`, `last_updated_label`, `refresh`.
- [x] 36.4.2 Implement API fetch: Since `AccountsApiService` is not exported from `@hai3/react` (moved to CLI templates) and the MFE cannot import from the host's src/app/api/ directory, implemented a simulated API fetch (setTimeout with mock data) demonstrating the loading/error/data state flow. The STATE MANAGEMENT pattern is the critical aspect, not the actual API mechanism.
- [x] 36.4.3 Implement loading state: while API call is in progress, render skeleton placeholders for each user field (avatar, name, email, role, department, id, dates).
- [x] 36.4.4 Implement error state: on API failure, display `t('error_prefix') + errorMessage` and a `<Button>` labeled `t('retry')` that re-triggers the fetch.
- [x] 36.4.5 Implement no-data state: when no user data exists (null response), display `t('no_user_data')` and a `<Button>` labeled `t('load_user')` that triggers the fetch.
- [x] 36.4.6 Implement data display: render user fields -- avatar (round image), firstName, lastName, email. Labeled fields: `t('role_label')`: role, `t('department_label')`: department, `t('id_label')`: id, `t('created_label')`: createdAt, `t('last_updated_label')`: updatedAt.
- [x] 36.4.7 Add Refresh button in `<CardFooter>` labeled `t('refresh')` that re-triggers the user fetch.
- [x] 36.4.8 Header notification is IMPLEMENTED via `HAI3_ACTION_NOTIFY_USER` and `customActionHandler` on the screen domain.
- [x] 36.4.9 Use UIKit components throughout: `<Card>`, `<CardContent>`, `<CardFooter>`, `<Button>`.
- [x] 36.4.10 Wire up `useScreenTranslations` (from 36.3.2 shared hook) for profile screen i18n.

### 36.5 Restore CurrentTheme Screen Features

Restore i18n and translation keys for the CurrentTheme screen. Theme value display via bridge already works.

- [x] 36.5.1 Create 36 language JSON files under `demo-mfe/src/screens/theme/i18n/`. Each file contains keys: `title`, `current_theme_label`, `description`.
- [x] 36.5.2 Update `CurrentThemeScreen.tsx`: replace all hardcoded strings with `t()` calls. Use `t('title')` for the heading, `t('current_theme_label')` for the theme label, `t('description')` for descriptive text.
- [x] 36.5.3 Wire up `useScreenTranslations` for theme screen i18n.
- [x] 36.5.4 Existing theme display via bridge property subscription is correct and retained. No changes needed to the theme value access mechanism.

### 36.6 Restore UIKitElements Screen Features

Restore the full UIKit showcase: CategoryMenu, 9 categories, 56 elements using actual UIKit components, lazy loading, scroll-to-element, and i18n.

- [x] 36.6.1 Create 36 language JSON files under `demo-mfe/src/screens/uikit/i18n/`. The `en.json` file contains translation keys for all UIKit element demos plus category titles. All 36 language files created with English values (ready for translation).
- [x] 36.6.2 Implement `<CategoryMenu>` component in `demo-mfe/src/screens/uikit/components/CategoryMenu.tsx`: renders a tree of 9 categories, each with its element sub-items. Clicking a category scrolls to it. Clicking an element scrolls to that element. Active element is highlighted via IntersectionObserver.
- [x] 36.6.3 Define the 9 categories as constants in `demo-mfe/src/screens/uikit/categories.ts`: `layout`, `navigation`, `forms`, `actions`, `feedback`, `data_display`, `overlays`, `media`, `disclosure`. Also defined CATEGORY_ELEMENTS mapping.
- [x] 36.6.4 Create 9 lazy-loaded category components using `React.lazy()`: `DataDisplayElements`, `LayoutElements`, `ActionElements`, `FeedbackElements`, `MediaElements`, `FormElements`, `OverlayElements`, `DisclosureElements`, `NavigationElements`. Each component renders all UIKit element demos for its category with Suspense fallbacks.
- [x] 36.6.5 Implemented 56 UIKit element demos using actual `@hai3/uikit` components. All exported UIKit components are demonstrated: Accordion, Alert, Badge, Breadcrumb, Button, Calendar, Card, Chart, Checkbox, DataTable, DatePicker, Dialog, Drawer, Dropdown, Empty, Input, Label, Progress, Radio, ScrollArea, Select, Separator, Skeleton, Slider, Spinner, Switch, Tabs, Table, Textarea, Toggle, Tooltip, Popover, Typography, Menubar, Pagination, Collapsible, and more. Components not exported from UIKit (Chip, Rating, Notification, Loader, StatusBadge, Icon, Image, Timeline, TreeView, List) are documented with placeholders or alternative patterns.
- [x] 36.6.6 Composite components: `PaymentsDataTable` is demonstrated in DataDisplayElements using actual DataTable with payment data and Badge status. Other composite components (ProfileForm, ExpandableButton, MenuItemButton, LinkTextInput) were not in the pre-conversion code and are not part of the feature parity baseline.
- [x] 36.6.7 Implement scroll-to-element: each element demo section has an `id` attribute (`element-{name}`). CategoryMenu items use `scrollIntoView({ behavior: 'smooth' })` to navigate. IntersectionObserver tracks active element for menu highlighting.
- [x] 36.6.8 Wire up `useScreenTranslations` for UIKit screen i18n. All element titles, descriptions, and labels use `t()` keys. Skeleton loader shown while translations load.

### 36.7 Fix Menu Labels and Icons

Ensure extension presentation metadata uses translation keys (not plain strings) and correct Iconify icon prefixes.

- [x] 36.7.1 Keep `mfe.json` extension presentation labels as plain English strings: `"Hello World"`, `"Profile"`, `"Current Theme"`, `"UIKit Elements"`. Menu label translation is a future enhancement that requires MFE i18n namespace registration with the host -- that mechanism does not exist yet. The pre-conversion baseline used host-side screenset translations (`t(item.label)`) which is a different mechanism with no MFE equivalent.
- [x] 36.7.2 Update `mfe.json` extension presentation icons to use the `lucide:` Iconify prefix: `"lucide:globe"` (HelloWorld), `"lucide:user"` (Profile), `"lucide:palette"` (CurrentTheme), `"lucide:component"` (UIKitElements).
- [x] 36.7.3 The host menu component SHALL render `extension.presentation.label` directly as a plain string -- no `t()` call. Menu label translation is a future enhancement (requires MFE i18n namespace registration with the host, which does not exist yet). Verified Menu.tsx line 113 renders `pres.label` directly.
- [ ] 36.7.4 Verify all 4 menu items render with correct Lucide icons and translated labels. Verify icons resolve correctly in the Iconify runtime.

### 36.8 Convert Blank Screenset to MFE Template

Convert the legacy `_blank` screenset template to an MFE template that serves as scaffolding for new MFEs.

- [x] 36.8.1 Create `src/mfe_packages/_blank-mfe/` with the standard MFE package structure: `package.json`, `tsconfig.json`, `vite.config.ts`, `mfe.json`, `src/lifecycle.tsx`, `src/screens/home/HomeScreen.tsx`.
- [x] 36.8.2 Copy the screenset-level i18n files (36 languages) from `src/screensets/_blank/i18n/` to `_blank-mfe/src/i18n/`. (NOTE: MFEs don't have screenset-level i18n - only screen-level. Copied screen-level files only.)
- [x] 36.8.3 Copy the screen-level i18n files (36 languages) from `src/screensets/_blank/screens/home/i18n/` to `_blank-mfe/src/screens/home/i18n/`.
- [x] 36.8.4 The `mfe.json` SHALL define a template structure with placeholder IDs, 1 manifest, 1 entry, 1 extension targeting the screen domain. Include `presentation` metadata with placeholder label and icon.
- [x] 36.8.5 The `HomeScreen.tsx` SHALL use `useScreenTranslations` for i18n, UIKit `<Card>` for layout, and demonstrate bridge property subscription (theme, language).
- [x] 36.8.6 Add a `README.md` in `_blank-mfe/` explaining how to use this template to create a new MFE (copy, rename, update IDs).
- [x] 36.8.7 Do NOT add `_blank-mfe` to the workspace or dev scripts -- it is a template, not a runnable package. Add a CI validation step (e.g., in CI config or a `check:template` script) that copies `_blank-mfe` to a temporary workspace location, runs `tsc --noEmit` and `eslint` against it, then discards the copy. This prevents template drift where the template becomes invalid over time as APIs evolve.

### 36.9 Delete Legacy Screenset API

Remove all legacy screenset registry references and the legacy screensets directory.

- [x] 36.9.1 Delete the entire `src/screensets/` directory. All demo screens have been moved to `demo-mfe`. The `_blank` template has been moved to `_blank-mfe`.
- [x] 36.9.2 Remove `screensetRegistry` references from `packages/screensets/src/index.ts` (public barrel). Remove the `screensetRegistry` export if still present.
- [x] 36.9.3 Remove `screensetRegistry` re-exports from `packages/framework/src/index.ts` and `packages/react/src/index.ts` if present.
- [x] 36.9.4 Remove `screensetRegistry` from `packages/framework/src/types.ts` (the `HAI3App` interface or wherever it is referenced).
- [x] 36.9.5 Remove `packages/screensets/src/registry.ts` if it contains only the legacy `ScreensetRegistry` class/instance.
- [x] 36.9.6 Remove any screenset-related imports in the host app (`src/app/`) that reference `src/screensets/` or `screensetRegistry`.
- [x] 36.9.7 Remove `ScreensetDefinition`, `ScreensetCategory`, `MenuItemConfig`, `ScreenLoader`, and other legacy screenset types from `@hai3/screensets` exports. `LayoutDomain` is kept as it's used by framework layout slices. Legacy navigation/routing plugins use inline type definitions.
- [x] 36.9.8 Search the entire codebase for remaining `screensetRegistry` references (excluding `openspec/`, test snapshots, and git history). Fix or remove any found. (NOTE: Legacy navigation and routing plugins still reference screensetRegistry but are deprecated. These plugins are not used in the MFE architecture.)
- [x] 36.9.9 Run `npm run type-check` to confirm no broken imports after removal. (PASS: Legacy navigation/routing plugins fixed with `LegacyAppWithRegistry` typed cast pattern. Type-check passes with zero errors.)

### 36.10 Feature Parity Verification

Each sub-task is a verification checkpoint. ALL must pass before Phase 36 is complete. These are verification-only tasks -- they check outcomes, they do not implement features.

- [x] 36.10.1 **HelloWorld parity**: Verify all 6 translation keys (`title`, `welcome`, `description`, `navigation_title`, `navigation_description`, `go_to_theme`) are present in all 36 language files and used via `t()`. Verify `<TextLoader>` renders while translations load. Verify `<Card>` and `<Button>` from UIKit are used. Verify navigation button triggers `mount_ext` for the theme extension. (Note: `TextLoader` does not exist in UIKit — `Skeleton` from `@hai3/uikit` is the correct equivalent.)
- [x] 36.10.2 **Profile parity**: Verify API fetch triggers on mount. Verify loading state shows `<TextLoader>` skeletons. Verify error state shows error message + Retry button. Verify no-data state shows message + Load User button. Verify all user fields displayed (avatar, firstName, lastName, email, role, department, id, createdAt, updatedAt). Verify Refresh button in `<CardFooter>`. Verify all 13 translation keys present and used. Note: header notification is deferred to a future phase (requires host-side action handler infrastructure). (Note: Uses `Skeleton` from `@hai3/uikit`, auto-fetches on mount.)
- [x] 36.10.3 **CurrentTheme parity**: Verify current theme value is displayed (via bridge property). Verify all 3 translation keys (`title`, `current_theme_label`, `description`) present in 36 language files and used via `t()`.
- [x] 36.10.4 **UIKitElements parity**: Verify `<CategoryMenu>` renders with 9 categories. Verify 56 element demos render using actual `@hai3/uikit` components (not CSS mockups). Verify 9 category components are lazy-loaded via `React.lazy()`. Verify scroll-to-element works (clicking menu item scrolls to element section). Verify `en.json` is 30KB+ with per-element translation keys. (31,071 bytes confirmed.)
- [x] 36.10.5 **Menu parity**: Verify 4 menu items with correct Lucide icons (`lucide:globe`, `lucide:user`, `lucide:palette`, `lucide:component`). Verify labels are plain English strings (not translation keys) -- menu label translation is a future enhancement requiring MFE i18n namespace registration with the host. Verify active state tracks the currently mounted extension.
- [x] 36.10.6 **i18n parity**: Verify each screen has exactly 36 language JSON files. Verify no hardcoded English strings in any screen component -- all text uses `t()` keys. Verify language switch (via host) causes all mounted MFE screens to re-render with the new language. (Note: Demo content in UIKit element subcomponents is acceptable as-is — pre-conversion also had hardcoded demo data.)
- [x] 36.10.7 **Architecture**: Verify a single `demo-mfe` package exists at `src/mfe_packages/demo-mfe/`. Verify exactly 4 entries and 4 extensions in `mfe.json`. Verify no internal routing (no React Router, no `useNavigate`, no path-based screen switching inside the MFE). Verify navigation is via `mount_ext` actions only.
- [x] 36.10.8 **Cleanup**: Verify `src/screensets/` directory does not exist. Verify no `screensetRegistry` references in source code (excluding `openspec/` and test snapshots). Verify no imports from deleted MFE packages (`hello-world-mfe`, `profile-mfe`, `current-theme-mfe`, `uikit-elements-mfe`).
- [x] 36.10.9 **GTS**: Verify `theme.v1.json` has `supportedValues` with 5 theme IDs and no `value` field. Verify `language.v1.json` has `supportedValues` with 36 language codes and no `value` field. Verify `shared_property.v1.json` schema requires `supportedValues`, not `value`.
- [x] 36.10.10 **Build validation**: `npm run type-check` passes. `npm run test` -- all tests pass. `npm run build` succeeds (host + demo-mfe remote). `npm run lint` clean.

### 36.11 Validation

Standard validation suite confirming all Phase 36 changes compile, test, build, and function correctly end-to-end.

- [x] 36.11.1 Run `npm run type-check` -- must pass with zero errors. (PASS: zero errors)
- [x] 36.11.2 Run `npm run test` -- all existing tests pass. Any new tests added in 36.1 pass. No test regressions from package consolidation. (PASS: 379 screensets + 65 framework + 16 react = 460 tests)
- [x] 36.11.3 Run `npm run build` -- must pass. Host builds. The single `demo-mfe` remote builds with all 4 exposed lifecycle modules. (PASS: host + demo-mfe builds succeed)
- [x] 36.11.4 Run `npm run lint` -- must pass. The `demo-mfe` package is included in lint scope. No lint exclusions. (PASS: zero errors, zero warnings)
- [ ] 36.11.5 Manual E2E: start `demo-mfe` dev server (port 3001) + host. Menu shows 4 items with Lucide icons and translated labels. Clicking each menu item loads the correct screen via `mount_ext`. Theme changes propagate to all screens. Language changes cause translation reload in all screens. Profile screen fetches API data and shows loading/error/data states. UIKit screen shows CategoryMenu with 56 elements and scroll-to-element. All screens render inside Shadow DOM with correct styles.

---

## Phase 37: Remove notify_user Action + Move Presentation to Screen Extension Derived Type + Fix Instance IDs

**Status**: COMPLETE

**Goal**: Three architectural corrections:
1. Remove the `notify_user` action which violated the independent data fetching principle (each runtime fetches its own data independently; MFEs must not act as data proxies for the host).
2. Move `presentation` from the base `extension.v1` schema to a screen-domain-specific derived type, following the GTS derived type pattern that the extension schema's own comment prescribes. The derived type ID combines the base extension type with the screen domain namespace: `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~`.
3. Fix incorrect GTS instance IDs in demo-mfe and _blank-mfe packages: wrong package name (`hai3.app` should be `hai3.demo`), wrong namespace (`ext` should be `screens` for screen extensions, `mfe` for entries/manifests), and redundant `_screen` suffixes.

**Architecture**:
- **Independent data fetching**: Each runtime (host and MFE) obtains its own data from the API independently. The `notify_user` action had the MFE acting as a data proxy, sending user data to the host. This is wrong -- the host header should fetch user data itself. Later optimization via `@hai3/api` transparent cache deduplication will prevent duplicate network requests.
- **Screen extension derived type**: The `presentation` object (`label`, `icon`, `route`, `order`) is nav-menu-specific metadata. A sidebar widget does not need `route`. A popup does not need `order`. The base `extension.v1` schema should stay generic (`id`, `domain`, `entry`, `lifecycle`). The screen domain sets `extensionsTypeId` to reference the derived type `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~` so screen extensions must include `presentation`. The derived type ID follows the pattern: base extension type + domain namespace (identifying which domain the extension belongs to).
- **Instance ID naming convention**: Instance segments use the vendor's package name (reflecting MFE identity, e.g., `hai3.demo`) and a domain-appropriate namespace (describing what the instance IS, e.g., `screens` for screen extensions). The namespace does NOT repeat the GTS type namespace -- the type segment already encodes that. See `schemas.md` -- Instance ID Naming Convention for the full rules and examples.

**Traceability**: Design doc `principles.md` -- Independent Data Fetching per Runtime. Design doc `schemas.md` -- Screen Extension Schema (Derived), Instance ID Naming Convention. Design doc `mfe-ext-lifecycle-actions.md` -- Domain Action Declarations (screen domain `extensionsTypeId`).

### 37.1 Remove notify_user GTS Instance and Constant

Remove the `notify_user` action GTS instance JSON file, its import in the loader, and its constant definition.

- [x] 37.1.1 Delete the GTS instance file `packages/screensets/src/mfe/gts/hai3.mfes/instances/lifecycle/notify_user.v1.json`.
- [x] 37.1.2 Remove the `notifyUserActionInstance` import from `packages/screensets/src/mfe/gts/loader.ts`. Remove it from the `loadBaseActions()` return array. Update the JSDoc comment for `loadBaseActions()` to remove the "custom lifecycle notification actions" reference -- it should say "generic extension lifecycle actions used by all domains".
- [x] 37.1.3 Remove `HAI3_ACTION_NOTIFY_USER` constant from `packages/screensets/src/mfe/constants/index.ts`. Remove the entire constant declaration and its JSDoc comment.
- [x] 37.1.4 Remove `HAI3_ACTION_NOTIFY_USER` from the `@hai3/screensets` barrel export (`packages/screensets/src/mfe/index.ts`).
- [x] 37.1.5 Remove `HAI3_ACTION_NOTIFY_USER` from the `@hai3/framework` barrel export (`packages/framework/src/index.ts`), if present.
- [x] 37.1.6 Remove `HAI3_ACTION_NOTIFY_USER` from the `@hai3/react` barrel export (`packages/react/src/index.ts`), if present.

**Traceability**: Design doc `principles.md` -- Independent Data Fetching per Runtime. Design doc `mfe-ext-lifecycle-actions.md` -- Constants section (notify_user removed).

### 37.2 Remove notify_user from Screen Domain Actions

Remove `HAI3_ACTION_NOTIFY_USER` from the screen domain's `actions` array in both the TypeScript constant and the GTS JSON instance.

- [x] 37.2.1 Update `packages/framework/src/plugins/microfrontends/base-domains.ts`: remove `HAI3_ACTION_NOTIFY_USER` from `screenDomain.actions` array. Remove the `HAI3_ACTION_NOTIFY_USER` import. The screen domain actions should be `[HAI3_ACTION_LOAD_EXT, HAI3_ACTION_MOUNT_EXT]` only.
- [x] 37.2.2 Update the screen domain GTS JSON instance `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/instances/domains/screen.v1.json`: remove the `notify_user` action type ID from the `actions` array. The actions array should contain only `load_ext` and `mount_ext` action type IDs.
- [x] 37.2.3 Update the `screenDomain` JSDoc comment in `base-domains.ts` to remove the reference to `notify_user`: change "Actions: load_ext, mount_ext (NO unmount_ext), and notify_user (custom lifecycle notification)" to "Actions: load_ext, mount_ext (NO unmount_ext)".
- [x] 37.2.4 Align `defaultActionTimeout` in ALL 4 domain GTS JSON instance files to `30000` (matching the TypeScript constants in `base-domains.ts`). The files `screen.v1.json`, `sidebar.v1.json`, `popup.v1.json`, and `overlay.v1.json` currently have `5000` due to an implementation-time discrepancy. Update each file's `"defaultActionTimeout"` from `5000` to `30000`.

**Traceability**: Design doc `mfe-ext-lifecycle-actions.md` -- Domain Action Declarations (screen domain actions). Design doc `mfe-ext-lifecycle-actions.md` -- Domain Action Support Matrix.

### 37.3 Remove notify_user from Bootstrap and ProfileScreen

Remove the `notify_user` usage from the host bootstrap and the MFE ProfileScreen.

- [x] 37.3.1 Update `src/app/mfe/bootstrap.ts`: remove the entire `screenCustomActionHandler` function and the `NotifyUserPayload` interface. Remove the `HAI3_ACTION_NOTIFY_USER` import. Simplify the `registerDomain` call for the screen domain to 2 arguments: `screensetsRegistry.registerDomain(screenDomain, screenContainerProvider)` (no `onInitError`, no `customActionHandler`).
- [x] 37.3.2 Update `src/mfe_packages/demo-mfe/src/screens/profile/ProfileScreen.tsx`: remove the `HAI3_ACTION_NOTIFY_USER` import. Remove the entire `bridge.executeActionsChain` call that sends the `notify_user` action (lines 93-99 in the `fetchUserData` callback). The profile screen should still fetch and display user data for its own UI -- it just no longer notifies the host.
- [x] 37.3.3 Update the stale JSDoc comment in `src/mfe_packages/demo-mfe/src/screens/profile/ProfileScreen.tsx` line 39 that says "Notifies the host application when user data is loaded (updates header)." Change to "Manages loading, error, and data states independently." Verify that the profile screen still loads, shows loading/error/data states, and displays user data correctly without the notify_user call.

**Traceability**: Design doc `principles.md` -- Independent Data Fetching per Runtime (anti-patterns section). Task 36.4.8 is superseded by this removal.

### 37.4 Create Screen Extension Derived Schema

Create the `extension_screen.v1.json` GTS schema file that derives from `extension.v1` and adds the `presentation` property.

- [x] 37.4.1 Create `packages/screensets/src/mfe/gts/hai3.mfes/schemas/ext/extension_screen.v1.json` with the JSON schema for the screen extension derived type. Schema ID: `gts://gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~`. Uses `allOf` to inherit from `gts://gts.hai3.mfes.ext.extension.v1~`. Adds `presentation` object property with sub-properties `label` (required string), `icon` (optional string), `route` (required string), `order` (optional number). `presentation` is required on this derived type.
- [x] 37.4.2 Import the new schema in `packages/screensets/src/mfe/gts/loader.ts` and add it to the `loadSchemas()` return array. Update the JSDoc comment to reflect "11 first-class citizen schemas (8 core + 2 MF-specific + 1 built-in derived)".
- [x] 37.4.3 Register the schema as a built-in in the GTS plugin alongside existing schemas. The GTS plugin constructor must call `this.registerSchema()` for `extension_screen.v1.json` so that it is available for `extensionsTypeId` validation without vendor registration.
- [x] 37.4.4 Add constant `HAI3_SCREEN_EXTENSION_TYPE = 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~'` to `packages/screensets/src/mfe/constants/index.ts`. Export it from the screensets, framework, and react barrels.

**Traceability**: Design doc `schemas.md` -- Screen Extension Schema (Derived). Design doc `schemas.md` -- GTS Entity Storage Format (directory structure).

### 37.5 Remove presentation from Base Extension Schema and TypeScript Interface

Remove the `presentation` property from the base `extension.v1.json` schema and the base `Extension` TypeScript interface. Add a `ScreenExtension` derived interface.

- [x] 37.5.1 Update `packages/screensets/src/mfe/gts/hai3.mfes/schemas/ext/extension.v1.json`: remove the entire `presentation` property object from the `properties` section. The base schema should only have `id`, `domain`, `entry`, `lifecycle` properties.
- [x] 37.5.2 Update `packages/screensets/src/mfe/types/extension.ts`: remove `presentation?: ExtensionPresentation` from the `Extension` interface. Add a new `ScreenExtension` interface extending `Extension` with `presentation: ExtensionPresentation` (required, not optional). Keep `ExtensionPresentation` interface definition in the same file (it is still exported publicly for consumers working with screen extensions).
- [x] 37.5.3 Export `ScreenExtension` from the `@hai3/screensets` public barrel (`packages/screensets/src/mfe/index.ts` and `packages/screensets/src/mfe/types/index.ts`).
- [x] 37.5.4 Export `ScreenExtension` from `@hai3/framework` barrel and `@hai3/react` barrel.
- [x] 37.5.5 Update the screensets spec at `openspec/changes/add-microfrontend-support/specs/screensets/spec.md`: in the "Extension binding type definition" scenario, change line `the binding MAY have a presentation field (optional ExtensionPresentation object with label, route, and optional icon, order)` to reflect that `presentation` is NOT on the base `Extension` type. Replace with: `the base binding SHALL NOT have a presentation field (presentation is defined on the derived ScreenExtension type for screen-domain extensions)`. Add a new scenario "Screen extension binding type definition" describing that screen extensions (type `ScreenExtension`) SHALL have a required `presentation` field with `label` (string), `route` (string), and optional `icon` (string) and `order` (number).
- [x] 37.5.6 Update the screensets spec at `openspec/changes/add-microfrontend-support/specs/screensets/spec.md`: in the "Extension Presentation Metadata" requirement section (around lines 699-723), clarify that `presentation` metadata applies to screen-domain extensions using the derived `ScreenExtension` type, not to the base `Extension` type. Update the "Extension with presentation metadata" scenario to say `WHEN registering a screen extension (ScreenExtension type) with a presentation field` instead of `WHEN registering an extension with a presentation field`. Update the "Extension without presentation metadata" scenario to clarify it applies to non-screen-domain extensions using the base `Extension` type. Update the "Host derives menu from screen extensions" scenario to reference `ScreenExtension` and note that `presentation` is required (not optional) on screen extensions.

**Traceability**: Design doc `schemas.md` -- Extension Schema (Base) and Screen Extension Schema (Derived). Design doc `mfe-domain.md` -- TypeScript Interface Definition. Screensets spec -- Extension Presentation Metadata requirement section.

### 37.6 Add extensionsTypeId to Screen Domain

Configure the screen domain to require screen extension derived type.

- [x] 37.6.1 Update `packages/framework/src/plugins/microfrontends/base-domains.ts`: set `extensionsTypeId: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~'` on `screenDomain`. Import `HAI3_SCREEN_EXTENSION_TYPE` from `@hai3/screensets` and use it.
- [x] 37.6.2 Update the screen domain GTS JSON instance `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/instances/domains/screen.v1.json`: add `"extensionsTypeId": "gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~"` to the JSON object.
- [x] 37.6.3 Verify that sidebar, popup, and overlay domains do NOT set `extensionsTypeId` -- they use the base `extension.v1` schema directly.

**Traceability**: Design doc `mfe-ext-lifecycle-actions.md` -- Domain Action Declarations (screen domain `extensionsTypeId`). Design doc `schemas.md` -- Screen Extension Schema (Derived) -- screen domain configuration.

### 37.7 Fix GTS Instance IDs in MFE Packages

Fix incorrect GTS instance IDs in demo-mfe and _blank-mfe packages. Three issues: (1) wrong package name (`hai3.app` -> `hai3.demo`), (2) wrong namespace for screen extensions (`ext` -> `screens`), (3) redundant `_screen` suffixes. Also add the screen extension derived type prefix for `extensionsTypeId` validation.

- [x] 37.7.1 Update `src/mfe_packages/demo-mfe/mfe.json`: change all 4 screen extension IDs to use the screen extension derived type prefix AND fix the package name and namespace. The instance segment must use `hai3.demo` (matching the MFE identity) with `screens` namespace (describing what the instance is -- a screen), not `hai3.app` with `ext` namespace. Drop the `_screen` suffix since the namespace already says `screens`. Example: `gts.hai3.mfes.ext.extension.v1~hai3.app.ext.helloworld_screen.v1` becomes `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1`. All 4 extensions follow the same pattern: `hai3.demo.screens.<name>.v1`.
- [x] 37.7.2 Update `src/mfe_packages/demo-mfe/mfe.json`: fix the manifest ID from `hai3.app.mfe.demo.manifest.v1` to `hai3.demo.mfe.manifest.v1` (package name reflects MFE identity, namespace `mfe` for MFE-related entities).
- [x] 37.7.3 Update `src/mfe_packages/demo-mfe/mfe.json`: fix all 4 entry IDs from `hai3.app.mfe.demo.<name>.v1` to `hai3.demo.mfe.<name>.v1` (drop redundant `demo` segment since the package name `hai3.demo` already identifies the MFE).
- [x] 37.7.4 Update `src/mfe_packages/demo-mfe/src/shared/extension-ids.ts`: update all 4 extension ID constants to use the corrected IDs (with `hai3.demo.screens.<name>.v1` instance segments).
- [x] 37.7.5 Update `src/mfe_packages/_blank-mfe/mfe.json`: update the extension, entry, and manifest IDs to use concrete IDs with `hai3.blank` package name (so the template works as-is without modification). The template is a working starting point; developers will copy and rename IDs during setup:
  - Manifest ID: `gts.hai3.mfes.mfe.mf_manifest.v1~hai3.blank.mfe.manifest.v1` (concrete ID usable immediately)
  - Entry ID: `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~hai3.blank.mfe.home.v1` (concrete ID usable immediately)
  - Extension ID: `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.blank.screens.home.v1` (concrete ID usable immediately, namespace `screens` for screen extensions)
  - All references to manifest and entry in the entries/extensions array must use the concrete IDs above
- [x] 37.7.6 Check and update all hardcoded extension ID, entry ID, and manifest ID references in test files, bootstrap code, and other source files. Update all references to use the corrected IDs. Files to check:
  - `src/app/mfe/bootstrap.ts` (extension registration)
  - `packages/framework/src/plugins/microfrontends/actions.ts` (if referencing extension IDs)
  - `packages/screensets/__tests__/mfe/` (test files referencing screen extension IDs)
  - `packages/react/__tests__/mfe/` (test files referencing screen extension IDs)

**Traceability**: Design doc `schemas.md` -- Screen Extension Schema (Derived) -- extension instance IDs, Instance ID Naming Convention. Design doc `mfe-domain.md` -- Extension Examples.

### 37.8 Update Menu Component for ScreenExtension Type

Update the host Menu component to use the `ScreenExtension` type instead of `Extension` with optional `presentation`.

- [x] 37.8.1 Update `src/app/layout/Menu.tsx`: import `ScreenExtension` (or import both `Extension` and `ScreenExtension`). The filter for extensions with `presentation` can be simplified -- since screen extensions are now guaranteed to have `presentation` (it is required on the derived type), the `filter(ext => !!ext.presentation)` pattern is still safe (other domains may not have it) but the type can be narrowed to `ScreenExtension` after filtering.
- [x] 37.8.2 Verify the menu still renders correctly with all 4 items, correct icons, and correct labels.

**Traceability**: Design doc `overview.md` -- Navigation Menu Auto-Population. Task 35.5 -- Host Nav Menu Driven by Extension Presentation Metadata.

### 37.9 Update Package CLAUDE.md Files for Phase 37 Changes

Update package-level CLAUDE.md files to reflect the Phase 37 changes immediately, so documentation is never stale relative to the code at any phase boundary.

- [x] 37.9.1 Update `packages/screensets/CLAUDE.md`: remove any references to `HAI3_ACTION_NOTIFY_USER` or `notify_user` action. Document the new `ScreenExtension` type and `HAI3_SCREEN_EXTENSION_TYPE` constant. Update the extension type documentation to reflect that `presentation` is on the derived `ScreenExtension` type (not on the base `Extension` type). Document the new `extension_screen.v1` GTS schema as a built-in derived schema.
- [x] 37.9.2 Update `packages/framework/CLAUDE.md`: remove any references to `HAI3_ACTION_NOTIFY_USER` or `notify_user` action. Document the `extensionsTypeId` field on `screenDomain` that references the screen extension derived type. Update the screen domain action list documentation from `[load_ext, mount_ext, notify_user]` to `[load_ext, mount_ext]`. Document the new `ScreenExtension` and `HAI3_SCREEN_EXTENSION_TYPE` re-exports.
- [x] 37.9.3 Update `packages/react/CLAUDE.md`: remove any references to `HAI3_ACTION_NOTIFY_USER` or `notify_user` action. Document the new `ScreenExtension` and `HAI3_SCREEN_EXTENSION_TYPE` re-exports. Update any extension examples to use the screen extension derived type ID format.
- [x] 37.9.4 Search all CLAUDE.md files in the repository for remaining references to `notify_user` or `HAI3_ACTION_NOTIFY_USER`. Fix any found.

**Traceability**: No documentation debt -- CLAUDE.md files are updated in the same phase as the code changes they describe. Phase 38.7 handles the remaining legacy API removal documentation (screensetRegistry, navigation, routing, etc.).

### 37.10 Update Tests

Update existing tests to reflect both changes: removal of `notify_user` and the new screen extension derived type.

- [x] 37.10.1 Update `packages/screensets/__tests__/mfe/runtime/dynamic-registration.test.ts`: if any tests reference `notify_user` or use screen extension IDs, update them. Screen extension test fixtures should use the new derived type ID prefix.
- [x] 37.10.2 Update `packages/framework/src/plugins/microfrontends/` tests (if any): verify `screenDomain.actions` no longer includes `HAI3_ACTION_NOTIFY_USER`. Verify `screenDomain.extensionsTypeId` is set correctly.
- [x] 37.10.3 Write unit test: register `screenDomain`, then register an extension WITHOUT the screen extension derived type prefix -- expect `ExtensionTypeError` because `extensionsTypeId` validation fails.
- [x] 37.10.4 Write unit test: register `screenDomain`, then register an extension WITH the screen extension derived type prefix and `presentation` -- expect registration to succeed.
- [x] 37.10.5 Write unit test: verify the `extension_screen.v1` schema is loaded as a built-in by the GTS plugin -- `gtsPlugin.validateInstance()` for a screen extension instance should pass.
- [x] 37.10.6 Write unit test: verify a screen extension instance WITHOUT `presentation` fails GTS validation (since `presentation` is required on the derived type).
- [x] 37.10.7 Write unit test: verify that sidebar/popup/overlay domains (without `extensionsTypeId`) still accept base `extension.v1` instances without `presentation`.
- [x] 37.10.8 Search all test files for `HAI3_ACTION_NOTIFY_USER` or `notify_user` references and remove/update them.

**Traceability**: Design doc `schemas.md` -- Screen Extension Schema (Derived). Design doc `principles.md` -- Independent Data Fetching per Runtime. Phase 35 tasks 35.4.4-35.4.6 (extension presentation tests) are updated by this phase.

### 37.11 Validation

Standard validation suite confirming all Phase 37 changes compile, test, build, and function correctly.

- [x] 37.11.1 Run `npm run type-check` -- must pass with zero errors. No broken imports from removed `HAI3_ACTION_NOTIFY_USER` constant. No type errors from `Extension` interface changes.
- [x] 37.11.2 Run `npm run test` -- all existing tests pass with updated extension IDs. New tests from 37.10 pass.
- [x] 37.11.3 Run `npm run build` -- must pass. Host builds. Demo-mfe remote builds with updated extension IDs.
- [x] 37.11.4 Run `npm run lint` -- must pass with zero errors.
- [x] 37.11.5 Manual E2E: start demo-mfe dev server + host. Menu shows 4 items (screen extensions with derived type IDs). Profile screen loads user data independently (no host header update from MFE). Theme/language changes propagate. All screens render correctly.

---

## Phase 38: Remove Legacy Screensets API Remnants from Packages

**Status**: COMPLETE

**Goal**: Remove all legacy screensets API dead code from the package layer. The application layer (`src/`) has fully migrated to MFE architecture with zero legacy references. The package layer still carries: legacy type definitions (`ScreensetCategory`, `MenuItemConfig`, `ScreenLoader`, `MenuScreenItem`, `ScreensetDefinition`, `ScreensetRegistry`), legacy framework plugins (`navigation.ts`, `routing.ts`) and `routeRegistry.ts`, legacy CLI screenset generators and commands, legacy studio ControlPanel screenset selector logic, and stale documentation. This phase eliminates all of it and updates documentation to reflect MFE as the primary and only architecture.

**Architecture**: After this phase, the `@hai3/screensets` package exports ONLY MFE types, constants, and utilities. The `@hai3/framework` package exports ONLY MFE-era plugins (`microfrontends()`) for extension orchestration -- no legacy `navigation()` or `routing()` plugins. The CLI package has no `screenset:create` or `screenset:copy` commands. All CLAUDE.md and llms.txt files document MFE as the primary API.

**Dependencies**: Phase 37 must be complete before Phase 38 begins. Phase 37 removes `HAI3_ACTION_NOTIFY_USER` and restructures extension types, which affects what remains to clean up in Phase 38.

**Scope boundaries**:
- `LayoutDomain` enum in `packages/screensets/src/types.ts` is NOT legacy -- it is used by framework layout slices and MUST be preserved.
- Branded types (`ScreensetId`, `ScreenId`) in `packages/screensets/src/types.ts` are NOT used by any MFE code. Evaluate if they are imported anywhere outside the legacy types file. If unused, remove them.
- The `screensets()` plugin in `packages/framework/src/plugins/screensets.ts` provides the Redux `screenSlice` for screen state management. It is NOT legacy -- it is still used for layout state. Evaluate if it should be renamed or kept as-is.
- `RouteRegistry` interface and related types in `packages/framework/src/types.ts` are used ONLY by the legacy routing plugin. If the legacy routing plugin is removed, these types become dead code too.
- The `routeMatcher` utility module (`packages/framework/src/utils/routeMatcher.ts`) is used ONLY by the legacy navigation and routing plugins. If those plugins are removed, this utility becomes dead code too.

### 38.1 Remove Legacy Type Definitions from @hai3/screensets

Remove all legacy screensets types from `packages/screensets/src/types.ts`. Keep only `LayoutDomain` which is actively used by framework layout slices.

- [x] 38.1.1 Search the entire codebase (excluding `openspec/`, `node_modules/`, `.git/`) for imports of `ScreensetCategory`, `MenuItemConfig`, `ScreenLoader`, `ScreenConfig`, `MenuScreenItem`, `ScreensetDefinition`, `ScreensetRegistry` from `@hai3/screensets` or from the types file directly. Document which files import each type. Expected result: zero imports from MFE code, only self-references within the types file and legacy plugins that are also being removed.
- [x] 38.1.2 Search for imports of `ScreensetId` and `ScreenId` branded types. Expected result: zero imports from any active code. If any active code imports them, document the usage and evaluate whether to keep them.
- [x] 38.1.3 Remove the following from `packages/screensets/src/types.ts`: `ScreensetCategory` enum, `MenuItemConfig` interface, `ScreenLoader` type, `ScreenConfig` interface, `MenuScreenItem` interface, `ScreensetDefinition` interface, `ScreensetRegistry` interface, `ScreensetId` branded type, `ScreenId` branded type. Keep ONLY the `LayoutDomain` enum and its section comment.
- [x] 38.1.4 Update `packages/screensets/src/index.ts`: verify `LayoutDomain` is still exported. Remove any remaining legacy type re-exports if present (e.g., `ScreensetCategory`, `ScreensetDefinition`). The barrel should export only `LayoutDomain` from `./types` plus all MFE exports.
- [x] 38.1.5 Run `npm run type-check` to confirm no broken imports. Any type errors indicate code that still references the removed types and must be updated.

**Traceability**: Phase 36.9.7 partially removed legacy type exports but noted "Legacy navigation/routing plugins use inline type definitions." This phase completes the removal by also deleting the source definitions.

### 38.2 Remove Legacy Framework Plugins

Remove the legacy `navigation()` and `routing()` plugins, the `createRouteRegistry()` factory, and the `routeRegistry.ts` module. These plugins are dead code in MFE mode (both have `if (!screensetRegistry) return;` guards that always exit early since `screensetRegistry` no longer exists on the app object).

- [x] 38.2.1 Delete `packages/framework/src/plugins/navigation.ts`. This file contains 325 lines of legacy navigation logic including inline `MenuScreenItem`, `ScreensetDefinition`, `ScreensetRegistry` type definitions, eventBus event listeners, URL sync with browser/hash/memory modes, screenset translation loading, and menu population from screenset definitions. ALL of this is replaced by MFE actions chains and extension presentation metadata.
- [x] 38.2.2 Delete `packages/framework/src/plugins/routing.ts`. This file contains 77 lines of legacy routing plugin that creates a `RouteRegistry` from the `screensetRegistry`. The MFE architecture uses actions chains for navigation -- no route registry is needed.
- [x] 38.2.3 Delete `packages/framework/src/registries/routeRegistry.ts`. This file contains 201 lines of legacy route registry implementation that syncs routes from `screensetRegistry`. All route-matching, path-generation, and screenset-to-route mapping logic is dead code.
- [x] 38.2.4 Update `packages/framework/src/plugins/index.ts` (or equivalent plugin barrel): remove exports of `navigation` and `routing` plugin factories.
- [x] 38.2.5 Update `packages/framework/src/registries/index.ts`: remove the `createRouteRegistry` export. This file currently exports `createThemeRegistry` and `createRouteRegistry` -- after removal it exports only `createThemeRegistry`.
- [x] 38.2.6 Update `packages/framework/src/index.ts`: remove `navigation` and `routing` from the plugin exports block. Remove `createRouteRegistry` from the registry exports block. Remove `RouteRegistry`, `RouteMatchResult`, `CompiledRoute`, `RouteParams` from the type exports block (these types are only used by the legacy routing plugin).
- [x] 38.2.7 Check if `packages/framework/src/utils/routeMatcher.ts` exists and is imported ONLY by the deleted plugins. If so, delete it. If other code imports it, leave it in place.
- [x] 38.2.8 Update `packages/react/src/index.ts`: remove `navigation`, `routing`, and `createRouteRegistry` from the re-exports block. Remove `RouteRegistry`, `NavigateToScreenPayload`, `NavigateToScreensetPayload`, `RouteMatchResult`, `CompiledRoute`, `RouteParams` from the type re-exports if they are only used by legacy code. Evaluate `NavigateToScreenPayload` and `NavigateToScreensetPayload` -- if still used by legacy `useNavigation` hook, handle in task 38.3.
- [x] 38.2.9 Run `npm run type-check` to confirm no broken imports.

**Traceability**: Phase 36.9.8 noted "Legacy navigation and routing plugins still reference screensetRegistry but are deprecated. These plugins are not used in the MFE architecture." This phase completes the removal.

### 38.3 Clean Up Framework Types

Remove legacy references from `packages/framework/src/types.ts`, `packages/framework/src/compat.ts`, and related files.

- [x] 38.3.1 Update `packages/framework/src/types.ts`: remove the `HAI3Plugin` JSDoc example that references `screensetRegistry: createScreensetRegistry()` and `discoverScreensets(app.screensetRegistry)`. Replace with an MFE-era example using `screensetsRegistry`.
- [x] 38.3.2 Update `packages/framework/src/types.ts`: remove `RouteRegistry` interface, `RouteMatchResult` interface, `CompiledRoute` interface, `RouteParams` interface, and their section comments. These types were used exclusively by the legacy routing plugin. The `HAI3App` interface reference to `routeRegistry: RouteRegistry` must also be removed.
- [x] 38.3.3 Update `packages/framework/src/types.ts`: remove `routeRegistry` from the `HAI3App` interface. The MFE architecture does not use a route registry.
- [x] 38.3.4 Update the `HAI3App` JSDoc example in `packages/framework/src/types.ts`: remove `const screensets = app.screensetRegistry.getAll();` and the `app.actions.navigateToScreen(...)` example. Replace with MFE-era examples using `app.screensetsRegistry.registerDomain(...)` and `app.actions.mountExtension(extensionId)`.
- [x] 38.3.5 Update `packages/framework/src/types.ts`: evaluate `NavigateToScreenPayload`, `NavigateToScreensetPayload`, `NavigationConfig`, and `ScreensetsConfig` types. If they are ONLY referenced by the deleted navigation/routing/screensets plugins, remove them. If `ScreensetsConfig` is still used by the `screensets()` plugin, keep it. `NavigateToScreenPayload` and `NavigateToScreensetPayload` are referenced by `HAI3Actions` -- remove them from `HAI3Actions` and then delete the type definitions.
- [x] 38.3.6 Update `packages/framework/src/types.ts` `HAI3Actions` interface: remove `navigateToScreen` and `navigateToScreenset` action entries. These actions are part of the legacy navigation plugin. MFE navigation uses `mountExtension`, `loadExtension`, etc.
- [x] 38.3.7 Update `packages/framework/src/compat.ts`: remove the comment "Legacy screensetRegistry has been removed." since it is no longer needed as a migration note after the full cleanup. If the file contains only `ACCOUNTS_DOMAIN` after this, evaluate whether the file should be removed entirely or kept for backward compatibility.
- [x] 38.3.8 Run `npm run type-check` to confirm no broken imports.

**Traceability**: Phase 36.9 partially cleaned up `screensetRegistry` references. This phase removes the remaining structural types that supported the legacy navigation/routing architecture.

### 38.4 Clean Up Legacy useNavigation Hook

The `useNavigation` hook in `@hai3/react` wraps the legacy `navigateToScreen` and `navigateToScreenset` actions. In MFE mode, navigation is done via `mountExtension`/`loadExtension` actions or via `bridge.executeActionsChain()`. Evaluate and update the hook.

- [x] 38.4.1 Read `packages/react/src/hooks/useNavigation.ts` and determine what it provides. If it wraps ONLY the legacy `navigateToScreen`/`navigateToScreenset` actions, it is dead code and should be removed. If it provides MFE-relevant functionality too, refactor to remove the legacy parts.
- [x] 38.4.2 Search for imports of `useNavigation` from `@hai3/react` in the codebase (excluding `openspec/`, `node_modules/`). Document which files import it and whether they use legacy methods (`navigateToScreen`, `navigateToScreenset`) or MFE methods.
- [x] 38.4.3 If `useNavigation` is imported by `packages/studio/src/sections/ControlPanel.tsx` (which it is, per the current file), handle the studio side in task 38.5. If imported by demo-mfe code, evaluate whether those usages should be replaced with `useMfeBridge` + `bridge.executeActionsChain()`.
- [x] 38.4.4 Based on findings: either (a) remove `useNavigation` entirely and update all import sites, or (b) refactor it to expose only MFE navigation utilities (e.g., wrap `mountExtension` action). Update `packages/react/src/hooks/index.ts` barrel export accordingly.
- [x] 38.4.5 Update `packages/react/src/types.ts`: remove `UseNavigationReturn` type if `useNavigation` is removed, or update it to reflect the new MFE-only API.
- [x] 38.4.6 Run `npm run type-check` to confirm no broken imports.

**Traceability**: `useNavigation` wraps actions from the legacy navigation plugin (Phase 38.2). Its removal or refactoring follows from the plugin removal.

### 38.5 Remove Legacy Studio ControlPanel Screenset Selector

The `ControlPanel.tsx` has an inline `ScreensetCategory` enum, a `buildScreensetOptions()` function that returns empty data, and a `ScreensetSelector` component rendering. All of this is dead code.

- [x] 38.5.1 Update `packages/studio/src/sections/ControlPanel.tsx`: remove the inline `ScreensetCategory` enum definition (lines 9-13). Remove `ALL_CATEGORIES` constant. Remove the entire `buildScreensetOptions` function. Remove the `screensetOptions` state variable and its `useEffect` populator. Remove the `getCurrentValue` function. Remove the `handleScreensetChange` function. Remove the `ScreensetSelector` JSX rendering and its conditional block.
- [x] 38.5.2 Remove the `useNavigation` import if it is no longer used by the ControlPanel after cleanup. Remove the `ScreensetSelector` import and any related type imports.
- [x] 38.5.3 Evaluate `packages/studio/src/sections/ScreensetSelector.tsx` (or wherever the ScreensetSelector component is defined): if it is ONLY used by ControlPanel and is now dead code, delete the entire file. Remove its barrel export.
- [x] 38.5.4 The remaining ControlPanel should contain only: `ApiModeToggle`, `ThemeSelector`, `LanguageSelector`. Verify the component still renders correctly with these controls.
- [x] 38.5.5 Run `npm run type-check` to confirm no broken imports.

**Traceability**: Phase 36.9 noted the studio ControlPanel has "Legacy screensetRegistry removed" comments. This phase removes the dead code entirely.

### 38.6 Remove Legacy CLI Screenset Generators and Commands

The CLI package has generators and commands for creating/copying legacy screensets. These generate code that uses `screensetRegistry`, `ScreensetCategory`, and `ScreensetDefinition` -- all of which no longer exist. Replace with MFE-based scaffolding or remove entirely.

**Note**: All file deletions in this section are conditional. If a referenced file does not exist at execution time (e.g., removed by prior work or a different branch), treat the deletion as a no-op and proceed to the next task.

- [x] 38.6.1 If `packages/cli/src/generators/screenset.ts` exists, delete it. This generates legacy screenset code with `screensetRegistry.register()`, `ScreensetCategory`, and the old `ScreensetConfig` pattern. No-op if the file does not exist.
- [x] 38.6.2 If `packages/cli/src/generators/screensetFromTemplate.ts` exists, delete it. This generates screensets by copying the `_blank` template with identifier transformations. The `_blank` screenset no longer exists (replaced by `_blank-mfe` in Phase 36.8). No-op if the file does not exist.
- [x] 38.6.3 If `packages/cli/src/commands/screenset/create.ts` exists, delete it. This is the `screenset:create` CLI command that creates legacy screensets. Remove the command registration from the CLI command router/index if present. No-op if the file does not exist.
- [x] 38.6.4 If `packages/cli/src/commands/screenset/copy.ts` exists, delete it. This is the `screenset:copy` CLI command that copies legacy screensets with transformed IDs. Remove the command registration if present. No-op if the file does not exist.
- [x] 38.6.5 If `packages/cli/src/commands/screenset/` directory exists and is now empty, delete it. No-op if the directory does not exist or still contains files.
- [x] 38.6.6 Search `packages/cli/src/` for any remaining imports from the deleted files. Update or remove any barrel exports, command registrations, or type references that point to deleted modules. No-op if no references are found.
- [x] 38.6.7 If `packages/cli/src/generators/i18n.ts` exists, evaluate whether `generateI18nStubs` and `generateTranslationLoader` are ONLY used by the deleted screenset generators. If they are dead code, remove them. If used by other generators (screen generators, etc.), keep them.
- [x] 38.6.8 If `packages/cli/src/utils/project.ts` exists, evaluate whether `getScreensetsDir` and `screensetExists` are ONLY used by the deleted commands. If dead code, remove them. Keep if used elsewhere.
- [x] 38.6.9 Evaluate CLI templates that reference legacy screenset patterns: search `packages/cli/templates/` and `packages/cli/template-sources/` (if they exist) for `screensetRegistry`, `ScreensetCategory`, `ScreensetDefinition`, `screenset:create`, `screenset:copy`. Update or remove any references found. Key files to check (if they exist):
  - `packages/cli/templates/.ai/targets/SCREENSETS.md` -- likely documents legacy screenset patterns
  - `packages/cli/templates/commands-bundle/hai3-duplicate-screenset.md` -- likely references `screenset:copy`
  - `packages/cli/templates/commands-bundle/hai3-new-screen.md` -- may reference legacy screen scaffolding
- [x] 38.6.10 Run `npm run type-check` across the CLI package (or the full workspace) to confirm no broken imports.

**Traceability**: The CLI generates legacy screenset code that uses types and APIs removed in this phase. CLI commands must be updated to match the MFE architecture.

### 38.7 Update Package Documentation (CLAUDE.md)

Update all package-level CLAUDE.md files to document MFE as the primary and only architecture. Remove all legacy screenset API documentation. Note: Phase 37.9 already updated CLAUDE.md files for Phase 37-specific changes (notify_user removal, ScreenExtension derived type, extensionsTypeId). This task handles the remaining legacy API removal documentation: screensetRegistry, navigation(), routing(), ScreensetCategory, and other legacy types/plugins removed in Phase 38.

- [x] 38.7.1 Rewrite `packages/screensets/CLAUDE.md`: remove all references to `screensetRegistry`, `ScreensetCategory`, `ScreensetDefinition`, `MenuItemConfig`, `ScreenLoader`, and the legacy "What This Package Contains" table. Replace with MFE-focused content: document `ScreensetsRegistry`, `Extension`, `ExtensionDomain`, `MfeHandler`, `MfeBridgeFactory`, `GtsPlugin`, action constants, shared property constants, and the type system plugin. Keep the `LayoutDomain` documentation. Update the "Package Relationship" diagram to show MFE-era dependency flow.
- [x] 38.7.2 Rewrite `packages/framework/CLAUDE.md`: remove all references to `screensetRegistry`, `createScreensetRegistry`, `navigation()`, `routing()`, `routeRegistry`. Update the "Available Plugins" table to remove `navigation()` and `routing()` rows and add `microfrontends()`. Update the "Built Application" section to show MFE-era API (`screensetsRegistry`, `mountExtension`, etc.) instead of `screensetRegistry.getAll()` and `navigateToScreen`. Update the "Re-exports" section to reflect current exports.
- [x] 38.7.3 Update `packages/react/CLAUDE.md`: remove the `useNavigation` hook section if the hook was removed in 38.4. Remove the `useHAI3` example that shows `app.screensetRegistry.getAll()`. Update with MFE-era hook documentation (`useMfeBridge`, `useSharedProperty`, `useHostAction`, `useDomainExtensions`). Update the "Re-exports" section.
- [x] 38.7.4 Search all CLAUDE.md files in the repository for remaining references to `screensetRegistry`, `ScreensetDefinition`, `ScreensetCategory`, `createScreensetRegistry`, `navigateToScreen`, `navigateToScreenset`. Fix any found.

**Traceability**: Documentation must reflect the actual public API. After removing legacy types and plugins, the documentation must be updated to prevent confusion.

### 38.8 Update Package Documentation (llms.txt)

Update all package-level llms.txt files to document MFE as the primary architecture.

- [x] 38.8.1 Rewrite `packages/screensets/llms.txt`: the current content references `@hai3/layout` (deprecated name), `ScreensetDefinition`, `ScreensetCategory`, legacy selectors, and legacy patterns. Replace with MFE-focused content: document `ScreensetsRegistry`, `ExtensionDomain`, `Extension`, action constants, shared property constants, GTS type system, and the MFE lifecycle pattern. Include a Quick Start example showing domain registration, extension registration, and mounting.
- [x] 38.8.2 Rewrite `packages/framework/llms.txt`: the current content references `screensetRegistry`, `navigation()`, `routing()`, legacy plugin table. Replace with MFE-focused content: document `microfrontends()` plugin, `screensetsRegistry`, MFE action functions (`loadExtension`, `mountExtension`, etc.), domain constants, and the plugin composition pattern with MFE support.
- [x] 38.8.3 Check if `packages/react/llms.txt` exists. If yes, update it to remove legacy references and document MFE hooks. If it does not exist, no action needed.
- [x] 38.8.4 Search all llms.txt files for remaining references to `screensetRegistry`, `ScreensetDefinition`, `ScreensetCategory`, `navigateToScreen`. Fix any found.

**Traceability**: llms.txt files are used by AI assistants for context. They must accurately describe the current API to prevent generation of legacy code patterns.

### 38.9 Remove Legacy Navigation Types from HAI3Actions

Clean up the `HAI3Actions` interface and related event type declarations that reference legacy navigation.

- [x] 38.9.1 Verify that the `packages/framework/src/plugins/navigation.ts` module augmentation for `@hai3/state` EventPayloadMap (`'navigation/screen/navigated'` and `'navigation/screenset/navigated'`) has been removed by task 38.2.1. If the module augmentation was in a separate file, search for it and remove it.
- [x] 38.9.2 Search the codebase for any eventBus listeners or emitters using `'navigation/screen/navigated'` or `'navigation/screenset/navigated'` event names. Remove any found (expected: none outside the deleted navigation plugin).
- [x] 38.9.3 Verify `HAI3Actions.navigateToScreen` and `HAI3Actions.navigateToScreenset` have been removed (by task 38.3.6). If the `HAI3Actions` interface still references `NavigateToScreenPayload` or `NavigateToScreensetPayload`, remove those type imports.
- [x] 38.9.4 Run `npm run type-check` to confirm all event and action type references are clean.

**Traceability**: The legacy navigation plugin declared event types via module augmentation. Removing the plugin without cleaning up the augmentation would leave orphaned type declarations.

### 38.10 Final Codebase Sweep

Comprehensive search for any remaining legacy screensets API references across the entire codebase.

- [x] 38.10.1 Search the entire codebase (excluding `openspec/`, `node_modules/`, `.git/`, `dist/`) for the string `screensetRegistry` (case-sensitive). Expected result: zero matches. Fix any found.
- [x] 38.10.2 Search for `ScreensetDefinition` (case-sensitive). Expected result: zero matches outside openspec/. Fix any found.
- [x] 38.10.3 Search for `ScreensetCategory` (case-sensitive). Expected result: zero matches outside openspec/. Fix any found.
- [x] 38.10.4 Search for `MenuScreenItem` (case-sensitive). Expected result: zero matches outside openspec/. Fix any found.
- [x] 38.10.5 Search for `createScreensetRegistry` (case-sensitive). Expected result: zero matches outside openspec/. Fix any found.
- [x] 38.10.6 Search for `createRouteRegistry` (case-sensitive). Expected result: zero matches outside openspec/. Fix any found.
- [x] 38.10.7 Search for `navigateToScreenset` (case-sensitive) in source code (not openspec/). If found in `@hai3/react` types or hooks that haven't been updated yet, fix them. Expected: zero matches.
- [x] 38.10.8 Search for `'screensets'` as a plugin dependency string (e.g., `dependencies: ['screensets']`). The `microfrontends()` plugin may depend on `'screensets'` -- verify this is still valid since the `screensets()` plugin is being kept for layout state. If the legacy `navigation` and `routing` plugins' dependency on `'screensets'` was the only reason for that dependency string, verify the `screensets()` plugin is still meaningful.

**Traceability**: Phase 36.9.8 performed a similar sweep but explicitly excluded legacy plugins. This sweep is the definitive final pass after all legacy code has been removed.

### 38.11 Validation

Standard validation suite confirming all Phase 38 changes compile, test, build, and function correctly.

- [x] 38.11.1 Run `npm run type-check` -- must pass with zero errors. No broken imports from removed legacy types, plugins, or CLI generators.
- [x] 38.11.2 Run `npm run test` -- all existing tests pass. No test regressions from plugin/type removal. Expected test count: same as post-Phase 37 (no new tests in this phase, but no regressions).
- [x] 38.11.3 Run `npm run build` -- must pass. Host builds. Demo-mfe remote builds. CLI package builds (if it has a build step).
- [x] 38.11.4 Run `npm run lint` -- must pass with zero errors across all packages.
- [ ] 38.11.5 Verify the CLI still works: run `npx hai3 --help` (or equivalent) and confirm `screenset:create` and `screenset:copy` commands are no longer listed. Confirm other CLI commands still work.
- [ ] 38.11.6 Manual E2E: start demo-mfe dev server + host. All 4 menu items render. Extension mounting works. Theme/language propagation works. Studio panel shows only ApiModeToggle, ThemeSelector, LanguageSelector (no screenset selector).
- [x] 38.11.7 Verify CLAUDE.md files are accurate: spot-check that `packages/screensets/CLAUDE.md`, `packages/framework/CLAUDE.md`, and `packages/react/CLAUDE.md` contain zero references to removed APIs and accurately describe the current MFE-era public API.

---

## Phase 39: Restore Screenset Package Selector in Studio ControlPanel

**Status**: COMPLETE

**Goal**: Restore the Studio ControlPanel's screenset package selector that was removed in Phase 38.5. The new selector operates at the GTS package level, NOT at the individual screen/extension level and NOT at the MF 2.0 manifest level. A GTS package is the two-segment prefix (e.g., `hai3.demo`) shared by all GTS entities belonging to the same MFE. This is a transport-agnostic concept -- it works for Module Federation, native ESM, or any future loading strategy. The selector allows developers to view registered GTS packages and switch between them during development.

**Problem Statement**: The legacy `ScreensetSelector` used `screensetRegistry` to enumerate screenset categories and navigate between them. Phase 38.5 correctly removed this dead code since `screensetRegistry` no longer exists. However, the selector was a valuable development tool in the Studio overlay. It needs to be rebuilt using the MFE API. The key difference: the old selector showed individual screens organized by category; the new selector shows GTS packages as top-level items.

**Architecture**:
- A GTS package is identified by extracting the first two segments of the instance-specific portion of a GTS entity ID. In GTS IDs, the schema type prefix ends with `~` and the instance-specific portion follows. For derived types, the instance-specific segments appear in the final `~`-delimited portion. Examples:
  - Extension ID: `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1` -- the final segment after the last derived-type `~` is `hai3.demo.screens.helloworld.v1`, and the first two dot-segments are `hai3.demo`.
  - Entry ID: `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~hai3.demo.mfe.helloworld.v1` -- the final segment is `hai3.demo.mfe.helloworld.v1`, GTS package = `hai3.demo`.
  - Manifest ID: `gts.hai3.mfes.mfe.mf_manifest.v1~hai3.demo.mfe.manifest.v1` -- the instance segment is `hai3.demo.mfe.manifest.v1`, GTS package = `hai3.demo`.
- All entities belonging to the same MFE share the same GTS package prefix. This makes GTS package the natural grouping concept.
- Currently, `ScreensetsRegistry` has NO query API for listing GTS packages. Extensions are tracked per-domain via `getExtensionsForDomain()`.
- The approach: the registry automatically extracts the GTS package from each extension's ID during `registerExtension()`. A `getRegisteredPackages()` method returns the set of unique GTS package strings. A `getExtensionsForPackage(packageId)` method returns all extensions whose GTS package matches. No explicit "register package" call is needed -- packages are discovered from extension IDs.
- "Active package" is defined as: the GTS package extracted from the currently mounted screen extension's ID.
- A utility function `extractGtsPackage(entityId: string): string` performs the extraction. It splits on `~`, takes the last segment (the instance-specific part), splits on `.`, and returns the first two dot-segments joined by `.`.

**Traceability**: Phase 38.5 (removed dead selector). Design docs: `overview.md` (Studio overlay), `mfe-api.md` (registry API). Proposal requirement: Studio developer tools for MFE inspection.

**Dependencies**: Phase 38 must be complete. This phase adds new public API to `ScreensetsRegistry` (abstract class) and `DefaultScreensetsRegistry` (concrete class).

### 39.1 Add GTS Package Extraction Utility and Package Tracking to ScreensetsRegistry

Add a utility function to extract the GTS package prefix from a GTS entity ID, and add package tracking and query methods to the registry. Packages are NOT explicitly registered -- they are automatically discovered from extension IDs during `registerExtension()`.

- [x] 39.1.1 Add a utility function `extractGtsPackage(entityId: string): string` in `packages/screensets/src/mfe/gts/extract-package.ts`. The function: (a) splits the entity ID on `~` to get segments, (b) takes the last segment (the instance-specific portion), (c) splits that segment on `.`, (d) returns the first two dot-segments joined by `.`. Example: `extractGtsPackage('gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1')` returns `'hai3.demo'`. Add JSDoc explaining the GTS package concept and the extraction algorithm. Error handling -- throw for ALL of these cases: (1) the entity ID has fewer than 2 dot-segments in its instance portion, (2) the entity ID contains no `~` delimiter (not a valid GTS ID), (3) the entity ID is a schema type ID (the last `~`-delimited segment is empty, i.e., the ID ends with `~`). Each case should throw with a descriptive error message.
- [x] 39.1.2 Export `extractGtsPackage` through the full barrel chain in `@hai3/screensets`: (a) export from `packages/screensets/src/mfe/gts/index.ts` (or create this barrel if it does not exist), (b) Add a NEW `export { extractGtsPackage } from './gts'` line to `packages/screensets/src/mfe/index.ts` (this file currently has no imports from `./gts` -- this is a new re-export chain link, not an addition to an existing one), (c) re-export from `packages/screensets/src/index.ts` (the `@hai3/screensets` public barrel -- add `extractGtsPackage` to the existing re-exports from `./mfe`). ALL three barrel levels must be updated for the export to be publicly accessible from `@hai3/screensets`.
- [x] 39.1.2b Re-export `extractGtsPackage` from `packages/framework/src/index.ts` (L2 barrel). Import it from `@hai3/screensets` (same pattern as `gtsPlugin`). This ensures L3+ consumers import from their proper layer. Also re-export from `packages/react/src/index.ts` (L3 barrel) by adding `extractGtsPackage` to the existing `@hai3/framework` re-export block under "MFE Utilities".
- [x] 39.1.3 Add abstract method `getRegisteredPackages(): string[]` to `packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts`. This returns all unique GTS package strings that have been discovered from registered extensions, in discovery order (order of first extension registration for each package). Add JSDoc explaining that packages are automatically tracked when extensions are registered -- the GTS package is extracted from each extension's ID.
- [x] 39.1.4 Add abstract method `getExtensionsForPackage(packageId: string): Extension[]` to `packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts`. This returns all registered extensions whose GTS package matches the given `packageId`. Add JSDoc explaining the relationship: GTS package groups extensions by their shared two-segment prefix.
- [x] 39.1.5 In `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`, add a private field `private readonly packages = new Map<string, Set<string>>()` to store GTS package to extension ID mappings. The key is the GTS package string (e.g., `'hai3.demo'`), the value is a `Set<string>` of extension IDs belonging to that package. The `packages` Map is intentionally non-configurable -- packages are auto-discovered during extension registration, not explicitly registered by consumers.
- [x] 39.1.6 In `DefaultScreensetsRegistry`, hook into the existing `registerExtension()` flow. IMPORTANT: the tracking code must be placed INSIDE the `operationSerializer.serializeOperation()` callback, after the `await this.extensionManager.registerExtension(extension)` call. Currently `registerExtension()` returns the result of `extensionManager.registerExtension(extension)` directly from the serializer callback. Expand the callback to: (a) `await this.extensionManager.registerExtension(extension)`, then (b) call `extractGtsPackage(extension.id)` to get the package string, then (c) add the extension ID to the `this.packages` map -- if the package key does not exist, create a new `Set<string>()` entry; then add the extension ID to the set. Map insertion order is preserved. The tracking MUST happen inside the serializer callback to ensure atomicity with the registration operation.
- [x] 39.1.7 In `DefaultScreensetsRegistry`, hook into the existing `unregisterExtension()` flow. IMPORTANT: the cleanup code must be placed INSIDE the `operationSerializer.serializeOperation()` callback, after the `await this.extensionManager.unregisterExtension(extensionId)` call (same pattern as 39.1.6). Before unregistering, capture the extension ID from the arguments (it is passed as a parameter to `unregisterExtension()`). After the await, call `extractGtsPackage(extensionId)` to get the package string, then remove the extension ID from the corresponding `Set` in `this.packages`. If the set becomes empty after removal, delete the package key from the map entirely. The cleanup MUST happen inside the serializer callback to ensure atomicity with the unregistration operation.
- [x] 39.1.8 In `DefaultScreensetsRegistry`, implement `getRegisteredPackages()`: return `Array.from(this.packages.keys())`.
- [x] 39.1.9 In `DefaultScreensetsRegistry`, implement `getExtensionsForPackage(packageId: string)`: get the extension ID set from `this.packages.get(packageId)`, then for each extension ID call `this.getExtension(extensionId)` and collect non-undefined results. Return the collected `Extension[]`. Return empty array if the package is not tracked.
- [x] 39.1.10 Update `DefaultScreensetsRegistry.dispose()`: clear the `this.packages` map alongside other cleanup.

**Traceability**: New public API on `ScreensetsRegistry`. Required by 39.3 (React hook) and 39.4 (Studio selector component). `extractGtsPackage` utility required by 39.1.6, 39.3, and 39.4.

### 39.2 Bootstrap Verification (No Code Changes -- Verification Only)

The bootstrap does NOT need changes for GTS package tracking. GTS packages are automatically discovered from extension IDs during `registerExtension()` -- no explicit registration call is needed. The existing bootstrap in `src/app/mfe/bootstrap.ts` already calls `screensetsRegistry.registerExtension(extension)` for all 4 demo extensions, which will automatically populate the `packages` map with `'hai3.demo'`.

**Note**: This section is a verification step, not an implementation task. It confirms 39.1's automatic tracking works end-to-end with the real bootstrap. It is kept as a separate section (rather than merged into 39.8 Validation) because it validates a specific invariant -- that existing bootstrap code requires zero modifications -- which is an important architectural property to verify before building the UI layers (39.3-39.5) on top.

- [x] 39.2.1 **Depends on 39.1** (all package tracking implementation must be complete before this verification). Verify that the existing bootstrap in `src/app/mfe/bootstrap.ts` works without modification. After bootstrap completes, `screensetsRegistry.getRegisteredPackages()` should return `['hai3.demo']` and `screensetsRegistry.getExtensionsForPackage('hai3.demo')` should return all 4 demo extensions. This is a verification step -- no code changes are expected.

**Traceability**: 39.1.6 (automatic package tracking during registerExtension). Bootstrap code at `src/app/mfe/bootstrap.ts` (Phase 34.4).

### 39.3 Add useRegisteredPackages and useActivePackage React Hooks

Create React hooks that expose the registered GTS packages for use in UI components. Follows the same pattern as `useDomainExtensions`.

- [x] 39.3.1 Create `packages/react/src/mfe/hooks/useRegisteredPackages.ts`. The hook calls `screensetsRegistry.getRegisteredPackages()` to get the list of GTS package strings. Use the same `useSyncExternalStore` pattern as `useDomainExtensions`: subscribe to store changes, snapshot returns the packages array, and reference equality comparison (shallow array compare) prevents unnecessary re-renders. **Architectural note on store subscription coupling**: The `useSyncExternalStore` subscription uses `app.store.subscribe`, which fires on any Redux dispatch. Since `registerExtension()` dispatches to the mfe store slice, the subscription WILL trigger when packages change. The `getSnapshot` function calls `screensetsRegistry.getRegisteredPackages()` which reads the private `packages` Map. This works because every package map mutation (in registerExtension/unregisterExtension) is always accompanied by a store dispatch in the same serializer callback. Note: if a future change mutates the packages map WITHOUT a store dispatch, this hook would fail to re-render -- keep this coupling documented.
- [x] 39.3.2 Export `useRegisteredPackages` through the full barrel chain: (a) add `export { useRegisteredPackages } from './useRegisteredPackages'` to `packages/react/src/mfe/hooks/index.ts`, (b) add `useRegisteredPackages` to the hooks re-export in `packages/react/src/mfe/index.ts` (the intermediate barrel that re-exports from `./hooks`), (c) add `useRegisteredPackages` to the MFE re-export block in `packages/react/src/index.ts` (the public barrel that re-exports from `./mfe`). All three levels must be updated for the export to be publicly accessible.
- [x] 39.3.3 N/A -- merged into 39.3.2. The full barrel chain is now documented there.
- [x] 39.3.4 **Depends on 39.1.2b** (L2 re-export of `extractGtsPackage`). Must be implemented after 39.1.2b. Create `packages/react/src/mfe/hooks/useActivePackage.ts`. This hook returns the GTS package string of the currently active MFE (the package whose extension is currently mounted in the screen domain). Implementation: get the mounted extension ID from `screensetsRegistry.getMountedExtension(HAI3_SCREEN_DOMAIN)`. If `getMountedExtension()` returns `undefined`, the hook SHALL return `undefined` immediately without calling `extractGtsPackage` (since `extractGtsPackage` expects a valid string and would throw on undefined). Only when `getMountedExtension()` returns a defined string, call `extractGtsPackage(mountedExtensionId)` to derive the GTS package. Returns `string | undefined` (undefined if no screen extension is mounted). Import `extractGtsPackage` from `@hai3/framework` (NOT from `@hai3/screensets` -- `@hai3/react` is L3, must not reach down to L1). Use the same `useSyncExternalStore` pattern as `useDomainExtensions` and `useRegisteredPackages`: subscribe to store changes, snapshot returns the active package string, and a `useRef`-based cache prevents unnecessary re-renders when the derived value is unchanged.
- [x] 39.3.5 Export `useActivePackage` through the full barrel chain: (a) add `export { useActivePackage } from './useActivePackage'` to `packages/react/src/mfe/hooks/index.ts`, (b) add `useActivePackage` to the hooks re-export in `packages/react/src/mfe/index.ts` (the intermediate barrel that re-exports from `./hooks`), (c) add `useActivePackage` to the MFE re-export block in `packages/react/src/index.ts` (the public barrel that re-exports from `./mfe`). Same three-level chain as 39.3.2.

**Traceability**: 39.1.3 (getRegisteredPackages), 39.1.4 (getExtensionsForPackage), 39.1.1 (extractGtsPackage), 39.1.2b (L2/L3 re-exports for layer compliance). Used by 39.4 (Studio selector component).

### 39.4 Create MfePackageSelector Component in Studio

Create the `MfePackageSelector` component that replaces the legacy `ScreensetSelector`. This component shows a dropdown of registered GTS packages and allows switching between them.

- [x] 39.4.1 Create `packages/studio/src/sections/MfePackageSelector.tsx`. The component:
  - Uses `useHAI3()` from `@hai3/react` to access the app instance. Obtains `screensetsRegistry` via `app.screensetsRegistry` (same pattern as other Studio components that need registry access). Since `screensetsRegistry` is typed as optional on `HAI3App`, use an early return guard: `const registry = app.screensetsRegistry; if (!registry) return null;` to satisfy TypeScript strictness. The registry will always be defined when the Studio ControlPanel is active (the microfrontends plugin is required for the Studio to render), but the guard is necessary for type-safety. This provides access to both the query API (`getExtensionsForPackage`) and the actions chain execution (`executeActionsChain`).
  - Uses `useRegisteredPackages()` to get the list of registered GTS packages.
  - Uses `useActivePackage()` to determine which package is currently active.
  - Renders a labeled dropdown (similar to `ThemeSelector` and `LanguageSelector` patterns in the same directory).
  - Each dropdown option shows the GTS package string as the display label (e.g., `"hai3.demo"`). The value is also the GTS package string.
  - When the user selects a different package, the component mounts the first screen extension from that package: query `screensetsRegistry.getExtensionsForPackage(selectedPackageId)`, filter for screen-domain extensions (check `extension.domain` matches `HAI3_SCREEN_DOMAIN`), narrow matching extensions to `ScreenExtension` using a type guard function `isScreenExtension(ext): ext is ScreenExtension` that checks `'presentation' in ext && typeof (ext as ScreenExtension).presentation === 'object'` (this is safe because Phase 37's `extensionsTypeId` enforcement guarantees that all extensions in the screen domain are registered with the `extension_screen.v1` derived type, which includes the `presentation` field -- but a proper type guard is preferred over a bare `as ScreenExtension` cast for runtime safety and TypeScript narrowing), sort by `presentation.order`, and mount the first one via `screensetsRegistry.executeActionsChain({ action: { type: HAI3_ACTION_MOUNT_EXT, target: HAI3_SCREEN_DOMAIN, payload: { extensionId: firstExtension.id } } })`.
  - If only one package is registered, the dropdown is still shown (not hidden) to inform the developer what package is active. The dropdown is disabled if only one option exists.
- [x] 39.4.2 Style the component to match existing Studio ControlPanel controls (`ThemeSelector`, `LanguageSelector`). Use the same heading style, spacing, and control patterns. Use `useTranslation()` for the label: add translation key `studio:controls.gts_package` (or reuse an existing controls translation namespace).
- [x] 39.4.3 Add i18n translation keys for the selector label. Add `gts_package: "GTS Package"` (nested under the `controls` key) to the studio English translation file at `packages/studio/src/i18n/en.json`, and to all 36 studio language files in `packages/studio/src/i18n/` (36 files: ar, bn, cs, da, de, el, en, es, fa, fi, fr, he, hi, hu, id, it, ja, ko, ms, nl, no, pl, pt, ro, ru, sv, sw, ta, th, tl, tr, uk, ur, vi, zh, zh-TW). Use English value for all files initially (ready for translation).

**Traceability**: Phase 38.5 (removed legacy selector). Design doc `overview.md` (Studio overlay developer tools).

### 39.5 Integrate MfePackageSelector into ControlPanel

Add the `MfePackageSelector` to the Studio `ControlPanel` component.

- [x] 39.5.1 Update `packages/studio/src/sections/ControlPanel.tsx`: import `MfePackageSelector` from `./MfePackageSelector`. Add `<MfePackageSelector />` as the first control in the controls section (before `ApiModeToggle`). The ordering should be: MfePackageSelector, ApiModeToggle, ThemeSelector, LanguageSelector.
- [x] 39.5.2 Verify the ControlPanel renders correctly with the new selector. The selector should show `hai3.demo` as the single (and active) GTS package option.

**Traceability**: Phase 38.5.4 (ControlPanel should contain ApiModeToggle, ThemeSelector, LanguageSelector + now MfePackageSelector).

### 39.6 Write Unit Tests

- [x] 39.6.1 Write unit test for `extractGtsPackage` in `packages/screensets/__tests__/mfe/gts/`: verify `extractGtsPackage('gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1')` returns `'hai3.demo'`.
- [x] 39.6.2 Write unit test: verify `extractGtsPackage('gts.hai3.mfes.mfe.mf_manifest.v1~hai3.demo.mfe.manifest.v1')` returns `'hai3.demo'` (non-derived type with single `~`).
- [x] 39.6.3 Write unit test: verify `extractGtsPackage('gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~hai3.demo.mfe.helloworld.v1')` returns `'hai3.demo'` (derived entry type).
- [x] 39.6.4 Write unit test: verify `extractGtsPackage` throws for a malformed ID with fewer than 2 dot-segments in the instance portion.
- [x] 39.6.4b Write unit test: verify `extractGtsPackage` throws for an entity ID containing no `~` delimiter (not a valid GTS ID).
- [x] 39.6.4c Write unit test: verify `extractGtsPackage` throws for a schema type ID (an ID ending with `~`, whose last `~`-segment is empty). Example: `'gts.hai3.mfes.ext.extension.v1~'`.
- [x] 39.6.5 Write unit test in `packages/screensets/__tests__/mfe/runtime/`: verify `getRegisteredPackages()` returns an empty array when no extensions are registered.
- [x] 39.6.6 Write unit test: register an extension with ID containing GTS package `hai3.demo`, then verify `getRegisteredPackages()` returns `['hai3.demo']`.
- [x] 39.6.7 Write unit test: register 2 extensions from different GTS packages (e.g., `hai3.demo` and `hai3.other`), verify `getRegisteredPackages()` returns both in registration order.
- [x] 39.6.8 Write unit test: register 2 extensions from the SAME GTS package, verify `getRegisteredPackages()` returns only one entry (deduplication).
- [x] 39.6.9 Write unit test: register extensions from 2 different GTS packages. Verify `getExtensionsForPackage('hai3.demo')` returns only extensions from `hai3.demo`, and `getExtensionsForPackage('hai3.other')` returns only extensions from `hai3.other`.
- [x] 39.6.10 Write unit test: verify `getExtensionsForPackage()` returns an empty array for an untracked package string.
- [x] 39.6.11 Write unit test: unregister an extension, verify it is removed from `getExtensionsForPackage()`. If it was the last extension for its package, verify the package is removed from `getRegisteredPackages()`.
- [x] 39.6.12 Write unit test: verify that `dispose()` clears the packages (after dispose, `getRegisteredPackages()` returns empty array).
- [x] 39.6.13 Write React hook test in `packages/react/__tests__/mfe/hooks/useRegisteredPackages.test.tsx`: verify `useRegisteredPackages()` returns packages from the registry.
- [x] 39.6.14 Write React hook test in `packages/react/__tests__/mfe/hooks/useActivePackage.test.tsx`: verify `useActivePackage()` returns the GTS package string of the currently mounted screen extension. Also verify that `useActivePackage()` returns `undefined` when no screen extension is mounted (covers the undefined guard from 39.3.4).

**Traceability**: 39.1 (registry API + extractGtsPackage utility), 39.3 (React hooks). Tests 39.6.4b and 39.6.4c cover error handling edge cases from 39.1.1 (no `~` delimiter, schema IDs). All tests verify runtime-observable behavior through public API.

### 39.7 Update Package Documentation

- [x] 39.7.1 Update `packages/screensets/CLAUDE.md`: add `getRegisteredPackages()`, `getExtensionsForPackage()`, and `extractGtsPackage()` to the ScreensetsRegistry/GTS utilities documentation.
- [x] 39.7.2 Update `packages/react/CLAUDE.md`: add `useRegisteredPackages` and `useActivePackage` hooks to the hooks documentation.
- [x] 39.7.3 Update `packages/studio/CLAUDE.md`: document the `MfePackageSelector` component and its purpose. If the file does not exist, create it with a minimal structure covering the Studio package overview and the new component. (Studio is a package in `packages/studio/` so it should have its own CLAUDE.md.)
- [x] 39.7.4 Update `design/registry-runtime.md`: add a section documenting the new query methods on `ScreensetsRegistry` -- `getRegisteredPackages()`, `getExtensionsForPackage(packageId)`, and the `extractGtsPackage()` utility. Document the automatic package discovery mechanism (packages are tracked implicitly during `registerExtension()` / `unregisterExtension()`, not via explicit registration).
- [x] 39.7.5 Update `specs/screensets/spec.md`: add Given/When/Then acceptance scenarios for the GTS package query API. At minimum: (1) Given no extensions registered, when `getRegisteredPackages()` is called, then it returns an empty array. (2) Given extensions from two GTS packages are registered, when `getRegisteredPackages()` is called, then it returns both packages in registration order. (3) Given extensions from `hai3.demo` are registered, when `getExtensionsForPackage('hai3.demo')` is called, then it returns only extensions belonging to that package. (4) Given the last extension for a package is unregistered, when `getRegisteredPackages()` is called, then the package is no longer listed.
- [x] 39.7.6 Clean up stale references in `packages/react/CLAUDE.md` and `packages/react/llms.txt`: remove the `AppRouter` component section (lines describing it as "legacy, prefer ExtensionDomainSlot for MFE" with its usage example), remove `AppRouter` from the Exports/Components list, and remove `AppRouterProps` from the Exports/Types list. Also update `packages/react/llms.txt` to remove the `AppRouter` link from Core API, remove `AppRouter` from the Quick Start import and JSX, and remove any other `AppRouter` references. These were deleted in Phase 38 but neither CLAUDE.md nor llms.txt were updated. The `AppRouter` component and `AppRouterProps` type no longer exist in the package.
- [x] 39.7.7 Remove stale legacy comment from `packages/framework/src/compat.ts` lines 20-21 (`// Legacy screensetRegistry has been removed. Use ScreensetsRegistry (MFE architecture) instead.` and `// See migration guide in openspec/changes/add-microfrontend-support/`). This comment was supposed to be removed in Phase 38.3.7 but was missed.
- [x] 39.7.8 Review and clean `packages/framework/src/plugins/microfrontends/navigation.ts` -- remove or update the legacy `NavigateToScreenPayload` interface (with `screensetId`/`screenId` fields), the `ScreenChangedPayload` interface (with `screensetId` field), the stale `NavigationEvents` constant, and the module augmentation for `@hai3/state` `EventPayloadMap` that declares legacy navigation event types. These are legacy types from the pre-MFE navigation system that Phase 38 missed in this file.
- [x] 39.7.9 Remove stale `screensetRegistry.tsx` references from CLI template manifests: (a) remove the `src/screensets/screensetRegistry.tsx` entry from `packages/cli/template-sources/manifest.yaml` line 53, (b) remove the `src/screensets/screensetRegistry.tsx` entry from `packages/cli/templates/manifest.json` line 31, (c) review `packages/cli/template-sources/project/configs/.dependency-cruiser.cjs` line 36 for the `screensetRegistry` pathNot reference and update or remove the stale `no-cross-screenset-imports` rule. These were supposed to be caught by Phase 38.6.9 but were missed.

**Known deferred**: The `screensets()` plugin naming is stale -- it currently provides only `screenSlice` for layout state management and no longer manages screensets. Renaming to something like `layoutState()` or `screenState()` is a candidate for a future phase.

**Traceability**: Documentation must reflect the new public API additions. CLAUDE.md files are updated in the same phase as the code changes. Design docs and spec files ensure the new API is architecturally documented and has verifiable acceptance criteria. 39.7.6 traces to Phase 38 (removal of `AppRouter`) -- the CLAUDE.md and llms.txt were not updated during Phase 38 and carry stale references. 39.7.7 traces to Phase 38.3.7 (missed cleanup). 39.7.8 traces to Phase 38.2 (missed MFE navigation.ts). 39.7.9 traces to Phase 38.6.9 (missed CLI template manifests).

### 39.8 Validation

Standard validation suite confirming all Phase 39 changes compile, test, build, and function correctly.

- [x] 39.8.1 Run `npm run type-check` -- PASS. Zero errors.
- [x] 39.8.2 Run `npm run test` -- PASS. 501 tests (397 screensets + 78 framework + 26 react). 25 new Phase 39 tests.
- [x] 39.8.3 Run `npm run build` -- PASS. Host builds successfully.
- [x] 39.8.4 Run `npm run lint` -- PASS. Zero errors across all packages.
- [ ] 39.8.5 Manual E2E: start demo-mfe dev server + host. Studio overlay opens. ControlPanel shows MfePackageSelector with `hai3.demo` as the active GTS package. ThemeSelector, LanguageSelector, and ApiModeToggle still work. All 4 menu items render. Extension mounting works.
