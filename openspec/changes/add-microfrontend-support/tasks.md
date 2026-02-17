# Implementation Tasks

**Note on file size**: Completed phases (35-42) have been archived to [`tasks-archive.md`](./tasks-archive.md). This file contains the status table, construction patterns, and Phase 43 (active work) only.

## Status

Phases 1-42 are COMPLETE. Note: per-phase test counts in completed phases reflect counts at time of that phase's completion and may differ from the current total (tests were added/removed across phases).

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

None. Phase 43 is COMPLETE.

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
| Phase 39 | Restore screenset package selector in Studio ControlPanel using GTS package query API | COMPLETE |
| Phase 40 | Fix contract validation rule 3: exclude infrastructure lifecycle actions from subset check | COMPLETE |
| Phase 41 | Fix action schema oneOf/x-gts-ref bug, error visibility in executeActionsChain, dev server script | COMPLETE |
| Phase 42 | Shadow DOM mount pipeline fix + store synchronization for MFE React hooks | COMPLETE |
| Phase 43 | Theme and language propagation with full Shadow DOM isolation: platform-level `all: initial` in `createShadowRoot()`, propagation effects, `applyThemeToShadowRoot()`, lifecycle theme subscription, architecture audit fixes (remove L1 mount callback, fix MFE cross-boundary theme imports) | COMPLETE |

### Current Construction Patterns

| Component | Pattern |
|-----------|---------|
| GtsPlugin | Singleton constant (`gtsPlugin`) |
| ScreensetsRegistry | Factory-with-cache (`screensetsRegistryFactory`) |
| MfeStateContainer | Internal construction by `DefaultMountManager` |

---

> **Phases 35-42 (COMPLETE)**: Full task details for Phases 35-42 have been archived to [`tasks-archive.md`](./tasks-archive.md) to reduce file size. See the status table above for a summary of each phase.
>
> Phase summaries: 35 (shared properties, presentation metadata, demo conversion), 36 (feature parity remediation), 37 (remove notify_user, screen extension derived type, fix instance IDs), 38 (remove legacy screensets API), 39 (GTS package selector in Studio), 40 (contract validation rule 3 fix), 41 (action schema bug, error visibility, dev server), 42 (Shadow DOM mount pipeline, store synchronization).

## Phase 43: Theme and Language Propagation with Full Shadow DOM Isolation

**Status**: COMPLETE

**Problem**: Theme and language changes in the host application do not reach MFE screens rendered inside Shadow DOM. Three distinct gaps exist:

1. **No platform-level CSS isolation guarantee**: `createShadowRoot()` in `packages/screensets/src/mfe/shadow/index.ts` creates a shadow root but CSS custom properties still inherit from the host into the shadow tree by default. The existing `injectCssVariables()` function already has an `all: initial` rule, but it is only called when someone explicitly injects variables. Full isolation must be automatic -- every shadow root created by the platform must start from a clean CSS slate. This is a platform guarantee, not something each MFE has to implement.

2. **No propagation from host events to domain properties**: When the host calls `changeTheme({ themeId: 'dark' })`, the themes plugin emits `theme/changed` and applies the theme to `document.documentElement`. Similarly, `setLanguage({ language: 'de' })` emits `i18n/language/changed`. However, neither event triggers `updateDomainProperty()` on any domain. MFEs subscribed to theme/language via `bridge.subscribeToProperty()` never receive updates.

3. **No dynamic theme application inside MFE Shadow DOM**: MFE lifecycle `initializeStyles()` methods hardcode CSS custom property values in `:host` blocks (e.g., `--background: 0 0% 100%`). These are static and never update when the theme changes. MFEs need to subscribe to theme changes via the bridge, resolve the theme ID string to a Theme object, and apply CSS variables dynamically inside their isolated shadow root.

**Architecture rules**:
- Full isolation is a PLATFORM GUARANTEE from `createShadowRoot()`, not something each MFE implements
- Communication ONLY via GTS-defined contracts -- shared properties carry ONLY strings (theme ID, language code)
- How to apply themes is each MFE's internal concern -- the framework has zero knowledge of MFE rendering
- Consistent styles through tooling, not architecture -- all MFEs happen to use the same UIKit (different instances)
- Effects have INTERNAL KNOWLEDGE of which domains exist and which shared properties they support -- no generic `getRegisteredDomainIds()` API
- MFE lifecycles are CLASSES with private state

**Dependencies**: Phase 42 must be complete (Shadow DOM mount pipeline must work correctly; MFE lifecycles receive shadow root as mount target).

**Traceability**: design/principles.md "Shadow DOM Style Isolation (Default Handler)" line 97: "CSS variables from the host application do NOT penetrate into the MFE's shadow root." design/principles.md "Theme and Language as Domain Properties" line 118: "When the host changes theme/language, domain properties update via `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, 'dark')`." design/principles.md line 120: "CSS variables do NOT propagate from host to MFE -- the MFE sets its own CSS variables based on domain property values."

---

### 43.1 Guarantee Full Shadow DOM Isolation in createShadowRoot() (L1)

Currently `createShadowRoot()` creates a shadow root but CSS custom properties still inherit from the host into the shadow tree by default. This violates the platform's full isolation guarantee. The fix is to automatically inject isolation styles into every shadow root immediately after creation.

- [x] 43.1.1 In `packages/screensets/src/mfe/shadow/index.ts`, modify the `createShadowRoot()` function. After the shadow root is created (either by `attachShadow()` or by returning the existing `element.shadowRoot`), but BEFORE returning it, inject an isolation `<style>` element. The style element must have `id="__hai3-shadow-isolation__"` for idempotency (skip injection if an element with this ID already exists in the shadow root). The CSS content must be:
  ```css
  :host {
    all: initial;
    display: block;
  }
  ```
  `all: initial` resets ALL inherited CSS properties (including CSS custom properties) to their initial values. `display: block` ensures the host element behaves as a block container (since `all: initial` resets display to `inline`). This guarantees that every MFE starts from a completely clean CSS slate at the platform level.

- [x] 43.1.2 Implementation detail: When `createShadowRoot()` returns an existing shadow root (the `element.shadowRoot` early-return path), check if `shadowRoot.getElementById('__hai3-shadow-isolation__')` already exists. If it does, skip injection. If it does not (edge case: shadow root was created externally without using `createShadowRoot()`), inject the isolation styles. This ensures idempotency.

- [x] 43.1.3 In the same file (`packages/screensets/src/mfe/shadow/index.ts`), update the `injectCssVariables()` function to remove the now-redundant `all: initial; display: block;` CSS rules (lines 86-89 of the current file). Since `createShadowRoot()` now guarantees that every shadow root has these isolation styles injected automatically (via the `__hai3-shadow-isolation__` style element), the duplicate rules in `injectCssVariables()` are unnecessary. The `injectCssVariables()` function should ONLY generate the CSS custom properties in its `:host { ... }` block -- remove the separate `:host { all: initial; display: block; }` block entirely. Keep the first `:host { <css-rules> }` block with the injected variables.

**Design note**: The isolation is now a platform guarantee from `createShadowRoot()`. The `injectCssVariables()` function focuses solely on its responsibility: injecting CSS custom properties. Separation of concerns.

**Traceability**: design/principles.md "Shadow DOM Style Isolation (Default Handler)" line 97: "CSS variables from the host application do NOT penetrate into the MFE's shadow root." specs/screensets/spec.md "Default handler creates Shadow DOM boundary on mount."

### 43.2 Unit Tests -- Shadow DOM Isolation Styles (L1)

- [x] 43.2.1 In the shadow DOM utility test file (`packages/screensets/__tests__/mfe/shadow/` or equivalent), add a test: **"createShadowRoot injects isolation styles automatically"**. Create an `HTMLElement` mock with `attachShadow` available. Call `createShadowRoot(element)`. Assert that the shadow root contains a `<style>` element with `id="__hai3-shadow-isolation__"`. Assert that its `textContent` contains `:host` with `all: initial` and `display: block`.

- [x] 43.2.2 Add a test: **"createShadowRoot is idempotent for isolation styles"**. Create an element, call `createShadowRoot(element)` twice (second call returns existing shadow root). Assert that there is exactly ONE `<style id="__hai3-shadow-isolation__">` element in the shadow root, not two.

- [x] 43.2.3 Add a test: **"createShadowRoot injects isolation styles into pre-existing shadow root"**. Create an element with an existing shadow root that does NOT have the isolation style element. Call `createShadowRoot(element)`. Assert that the isolation style element was injected into the pre-existing shadow root.

**Traceability**: 43.2.1-43.2.3 trace to 43.1 (automatic isolation injection). All tests verify the platform guarantee that every shadow root created via `createShadowRoot()` has full CSS isolation.

### 43.3 Theme/Language Propagation Effects in Microfrontends Plugin (L2)

The microfrontends plugin must listen for `theme/changed` and `i18n/language/changed` events and propagate the values to all 4 known HAI3 domains via `updateDomainProperty()`. The effects have INTERNAL KNOWLEDGE of the 4 domain IDs (screen, sidebar, popup, overlay) and the 2 shared property IDs (`HAI3_SHARED_PROPERTY_THEME`, `HAI3_SHARED_PROPERTY_LANGUAGE`). No generic domain enumeration API is needed.

- [x] 43.3.1 In `packages/framework/src/plugins/microfrontends/index.ts`, add imports: `eventBus` from `@hai3/state`, `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` from `@hai3/screensets`. Note: `eventBus` may already be imported via `@hai3/state` (check existing imports). `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` may need to be imported from `@hai3/screensets` -- verify these are exported from the screensets package barrel.

- [x] 43.3.2 Inside the `microfrontends()` function, add a new closure variable: `let propagationCleanup: (() => void) | null = null;`. This will hold the cleanup function for the propagation event listeners.

- [x] 43.3.3 In the `onInit()` method, after the existing `setMfeRegistry()` and `initMfeEffects()` calls, add theme propagation. Subscribe to `theme/changed` via `eventBus.on()`:
  ```typescript
  const themeUnsub = eventBus.on('theme/changed', (payload) => {
    for (const domainId of [HAI3_SCREEN_DOMAIN, HAI3_SIDEBAR_DOMAIN, HAI3_POPUP_DOMAIN, HAI3_OVERLAY_DOMAIN]) {
      try {
        screensetsRegistry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, payload.themeId);
      } catch {
        // Domain may not be registered yet -- skip silently
      }
    }
  });
  ```
  The `try/catch` is essential: domains are registered dynamically at runtime, so at the time a theme change fires, some domains may not yet exist. The error is expected and must be silently ignored.

- [x] 43.3.4 In the same `onInit()` method, add language propagation. Subscribe to `i18n/language/changed` via `eventBus.on()`:
  ```typescript
  const langUnsub = eventBus.on('i18n/language/changed', (payload) => {
    for (const domainId of [HAI3_SCREEN_DOMAIN, HAI3_SIDEBAR_DOMAIN, HAI3_POPUP_DOMAIN, HAI3_OVERLAY_DOMAIN]) {
      try {
        screensetsRegistry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_LANGUAGE, payload.language);
      } catch {
        // Domain may not be registered yet -- skip silently
      }
    }
  });
  ```

- [x] 43.3.5 Compose the cleanup function: `propagationCleanup = () => { themeUnsub.unsubscribe(); langUnsub.unsubscribe(); };`. The `eventBus.on()` return value has an `unsubscribe()` method (consistent with the pattern in `initMfeEffects()`).

- [x] 43.3.6 In the `onDestroy()` method, add cleanup for propagation listeners:
  ```typescript
  if (propagationCleanup) {
    propagationCleanup();
    propagationCleanup = null;
  }
  ```
  This must be called alongside the existing `effectsCleanup()` call.

**Design note**: The propagation listeners are placed directly in `onInit()` of the microfrontends plugin (not in `initMfeEffects()`) because they are plugin-level orchestration concerns, not registration effects. They bridge two other plugins (themes, i18n) with the MFE domain property system. The effects file handles registration/unregistration coordination with the store, which is a different responsibility.

**Traceability**: design/principles.md "Theme and Language as Domain Properties" line 118: "When the host changes theme/language, domain properties update via `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, 'dark')`." All 4 base extension domains declare both shared properties (confirmed in `packages/framework/src/plugins/microfrontends/gts/hai3.screensets/instances/domains/*.json`).

### 43.4 Unit Tests -- Theme/Language Propagation Effects (L2)

- [x] 43.4.1 In the microfrontends plugin test file (`packages/framework/__tests__/plugins/microfrontends/` or equivalent), add a test: **"theme/changed event propagates theme ID to all 4 domains"**. Set up a mock `screensetsRegistry` with a spy on `updateDomainProperty`. Initialize the microfrontends plugin (call `onInit()`). Emit `theme/changed` with `{ themeId: 'dark' }` via `eventBus.emit()`. Assert that `updateDomainProperty` was called 4 times, once for each domain ID (`HAI3_SCREEN_DOMAIN`, `HAI3_SIDEBAR_DOMAIN`, `HAI3_POPUP_DOMAIN`, `HAI3_OVERLAY_DOMAIN`), with arguments `(domainId, HAI3_SHARED_PROPERTY_THEME, 'dark')`.

- [x] 43.4.2 Add a test: **"i18n/language/changed event propagates language code to all 4 domains"**. Same setup as 43.4.1. Emit `i18n/language/changed` with `{ language: 'de' }`. Assert that `updateDomainProperty` was called 4 times with `(domainId, HAI3_SHARED_PROPERTY_LANGUAGE, 'de')`.

- [x] 43.4.3 Add a test: **"propagation silently skips unregistered domains"**. Set up a mock `screensetsRegistry` where `updateDomainProperty` throws for `HAI3_SIDEBAR_DOMAIN` and `HAI3_OVERLAY_DOMAIN` (simulating domains not yet registered). Emit `theme/changed` with `{ themeId: 'light' }`. Assert that `updateDomainProperty` was called 4 times (all domains attempted). Assert no unhandled errors. Assert that the calls for `HAI3_SCREEN_DOMAIN` and `HAI3_POPUP_DOMAIN` succeeded (were called with correct arguments).

- [x] 43.4.4 Add a test: **"propagation cleanup unsubscribes on destroy"**. Initialize the microfrontends plugin. Call `onDestroy()`. Emit `theme/changed` and `i18n/language/changed` events. Assert that `updateDomainProperty` was NOT called (listeners were removed).

**Traceability**: 43.4.1 traces to 43.3.3 (theme propagation). 43.4.2 traces to 43.3.4 (language propagation). 43.4.3 traces to the `try/catch` in 43.3.3 and 43.3.4. 43.4.4 traces to 43.3.5 and 43.3.6 (cleanup). All tests verify design/principles.md "Theme and Language as Domain Properties."

### 43.5 Add applyThemeToShadowRoot() Utility (UIKit)

A TOOLING convenience for MFEs that use `@hai3/uikit`. Not part of any GTS contract. MFEs choose to use this utility; the framework has zero knowledge of it.

- [x] 43.5.1 In `packages/uikit/src/styles/applyTheme.ts`, add a new exported function `applyThemeToShadowRoot(shadowRoot: ShadowRoot, theme: Theme, themeName?: string): void`. This function applies theme CSS variables into a `<style>` element inside the given shadow root, targeting `:host { ... }` instead of `document.documentElement`.

- [x] 43.5.2 Implementation details for `applyThemeToShadowRoot()`:
  - Look for an existing `<style id="__hai3-theme-vars__">` element in the shadow root via `shadowRoot.getElementById('__hai3-theme-vars__')`. If found, reuse it. If not, create a new `<style>` element with that ID and append it to the shadow root.
  - Generate the CSS variable declarations using the same `hslToVar()` helper already in the file. The generated CSS uses `:host { ... }` as the selector (not `:root`).
  - The CSS content must include ALL the same variables as `applyTheme()`: shadcn color variables (`--background`, `--foreground`, etc.), state colors (`--error`, `--warning`, etc.), chart colors (`--chart-1` through `--chart-5`), left menu colors (`--left-menu`, etc.), spacing, border radius, shadows, and transitions.
  - If `themeName` is provided, set a `data-theme` attribute on the style element for debugging purposes.
  - If `themeName?.endsWith('-large')`, include a rule `:host { font-size: 125%; }`.
  - Set `styleElement.textContent` with the complete generated CSS.

- [x] 43.5.3 This function is a pure utility -- no state, no side effects beyond DOM mutation on the provided shadow root. It reuses the existing `hslToVar()` helper (which is already a module-level function in `applyTheme.ts`). No class needed -- this is a stateless transformation function, consistent with how `applyTheme()` itself is exported as a function.

- [x] 43.5.4 In `packages/uikit/src/index.ts`, add the export: `export { applyThemeToShadowRoot } from './styles/applyTheme';`. This sits alongside the existing `export { applyTheme } from './styles/applyTheme';`.

**Design note**: `applyThemeToShadowRoot()` mirrors `applyTheme()` exactly but targets a shadow root instead of `document.documentElement`. It is a TOOLING convenience. The framework layer has zero knowledge of this function. Each MFE independently decides whether and how to use it.

**Traceability**: design/principles.md "Theme and Language as Domain Properties" line 120: "the MFE sets its own CSS variables based on domain property values." This utility enables that pattern for MFEs using `@hai3/uikit`.

### 43.5b Unit Tests -- applyThemeToShadowRoot() (UIKit)

Test file: `packages/uikit/__tests__/styles/applyTheme.test.ts` (or equivalent location matching the UIKit test directory structure).

- [x] 43.5.5 Add a test: **"applyThemeToShadowRoot applies CSS variables to shadow root"**. Create a mock `ShadowRoot` with `getElementById` and `appendChild` stubs. Call `applyThemeToShadowRoot(shadowRoot, theme)` with a test theme object. Assert that a `<style id="__hai3-theme-vars__">` element was created and appended. Assert that its `textContent` contains `:host { ... }` with `--background`, `--foreground`, `--primary`, and other shadcn color variables set to values derived from the theme via `hslToVar()`.

- [x] 43.5.6 Add a test: **"applyThemeToShadowRoot is idempotent"**. Call `applyThemeToShadowRoot()` twice on the same shadow root -- once with theme A, once with theme B. Assert that there is exactly ONE `<style id="__hai3-theme-vars__">` element (reused, not duplicated). Assert that its `textContent` reflects theme B (the second call overwrites the first).

- [x] 43.5.7 Add a test: **"applyThemeToShadowRoot sets data-theme attribute when themeName provided"**. Call `applyThemeToShadowRoot(shadowRoot, theme, 'dark')`. Assert that the style element has `data-theme="dark"` attribute set.

- [x] 43.5.8 Add a test: **"applyThemeToShadowRoot applies font-size 125% for -large themes"**. Call `applyThemeToShadowRoot(shadowRoot, theme, 'dracula-large')`. Assert that the style element's `textContent` contains `:host { font-size: 125%; }` (or equivalent rule). Call again with `themeName: 'dark'` (not ending in `-large`). Assert that the font-size rule is NOT present.

- [x] 43.5.9 Add a test: **"applyThemeToShadowRoot includes all variable categories"**. Call `applyThemeToShadowRoot()` with a fully populated theme object. Assert that the generated CSS includes: (a) shadcn color variables (`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`); (b) state color variables (`--error`, `--warning`, `--success`, `--info`); (c) chart color variables (`--chart-1` through `--chart-5`); (d) left menu variables (`--left-menu`, `--left-menu-foreground`, `--left-menu-hover`, `--left-menu-selected`, `--left-menu-border`); (e) spacing variables (`--spacing-*`); (f) border radius variables (`--radius-*`); (g) shadow variables (`--shadow-*`); (h) transition variables (`--transition-*`).

**Traceability**: 43.5.5-43.5.6 trace to 43.5.1-43.5.2 (core functionality and idempotency). 43.5.7 traces to 43.5.2 `data-theme` attribute. 43.5.8 traces to 43.5.2 `-large` theme handling. 43.5.9 traces to 43.5.2 (all variable categories must match `applyTheme()`). All tests verify the new public API surface of `@hai3/uikit`.

### 43.6 Theme Resolution Module for Demo MFE (App Code)

Each MFE needs its own theme map to resolve a theme ID string (received via domain properties) to a `Theme` object (from `@hai3/uikit`). In a real application, themes would be in a shared npm package. For this demo, both MFEs import from the host app's theme definitions (same repo).

- [x] 43.6.1 Create `src/mfe_packages/demo-mfe/src/shared/themes.ts`. This file:
  - Imports `Theme` type from `@hai3/uikit`
  - Imports theme objects: `defaultTheme` from `../../../../app/themes/default`, `darkTheme` from `../../../../app/themes/dark`, `lightTheme` from `../../../../app/themes/light`, `draculaTheme` from `../../../../app/themes/dracula`, `draculaLargeTheme` from `../../../../app/themes/dracula-large`
  - Exports `THEME_MAP: Record<string, Theme>` mapping theme ID strings to Theme objects: `{ default: defaultTheme, dark: darkTheme, light: lightTheme, dracula: draculaTheme, 'dracula-large': draculaLargeTheme }`
  - Exports `resolveTheme(themeId: string): Theme | undefined` that returns `THEME_MAP[themeId]`

- [x] 43.6.2 Create `src/mfe_packages/_blank-mfe/src/shared/themes.ts` with the same structure and imports as 43.6.1. The blank MFE template includes theme resolution so new MFEs created from it have working theme support out of the box.

**Design note**: The relative import paths (`../../../../app/themes/...`) work because both MFE packages are in `src/mfe_packages/` and the themes are in `src/app/themes/`. This is a demo/monorepo convenience. In production, themes would be in a shared npm package.

**Traceability**: design/principles.md "Theme and Language as Domain Properties" line 120: "the MFE sets its own CSS variables based on domain property values (e.g., `theme: 'dark'` triggers the MFE to apply its dark mode CSS variables)."

### 43.7 Update Demo MFE Lifecycle Files -- Theme Subscription and Dynamic Application

> **Note**: Tasks 43.7.1-43.7.4 were completed then immediately superseded by 43.12, which extracted the duplicated theme subscription logic into the `ThemeAwareReactLifecycle` abstract class. The verbose per-file instructions are no longer relevant -- see 43.12 for the current implementation pattern.

- [x] 43.7.1 `lifecycle-helloworld.tsx`: Added theme subscription, shadow root tracking, FOUC-preventing mount sequence. **Superseded by 43.12.2.**
- [x] 43.7.2 `lifecycle-profile.tsx`: Same theme subscription pattern. **Superseded by 43.12.3.**
- [x] 43.7.3 `lifecycle-theme.tsx`: Same theme subscription pattern. **Superseded by 43.12.4.**
- [x] 43.7.4 `lifecycle-uikit.tsx`: Same theme subscription pattern. **Superseded by 43.12.5.**

**Traceability**: design/principles.md "Theme and Language as Domain Properties" line 119.

### 43.8 Update Blank MFE Lifecycle -- Theme Subscription

> **Note**: Task 43.8.1 was completed then immediately superseded by 43.12.7, which refactored the blank MFE lifecycle to extend `ThemeAwareReactLifecycle`.

- [x] 43.8.1 `_blank-mfe/src/lifecycle.tsx`: Added theme subscription pattern. **Superseded by 43.12.7.**

**Traceability**: Same as 43.7.

### 43.9 Remove Hardcoded CSS Variables from initializeStyles()

All lifecycle files currently hardcode CSS custom property values in a `:host { --background: ...; --foreground: ...; }` block inside `initializeStyles()`. These must be removed because: (1) `createShadowRoot()` now resets ALL CSS properties via `all: initial` (task 43.1), and (2) theme CSS variables are now applied dynamically via `applyThemeToShadowRoot()` (tasks 43.7, 43.8).

KEEP in `initializeStyles()`:
- Tailwind base reset: `*, *::before, *::after { box-sizing: ...; }` and `* { margin: 0; padding: 0; }`
- Host font/line-height: `:host { font-family: ...; line-height: ...; }` base rules
- All Tailwind utility classes (`.p-8`, `.text-3xl`, `.bg-background`, etc.)
- Theme-aware utility classes (`.bg-background`, `.text-foreground`, `.border-border`, etc.) -- these use `var()` references and work once theme vars are injected by `applyThemeToShadowRoot()`

REMOVE from `initializeStyles()`:
- The entire `:host { --background: ...; --foreground: ...; --card: ...; ... --radius-xl: ...; }` block with hardcoded CSS custom property values

- [x] 43.9.1 In `src/mfe_packages/demo-mfe/src/lifecycle-helloworld.tsx`, remove the hardcoded CSS custom properties block from `initializeStyles()`. Remove the `:host { --background: 0 0% 100%; --foreground: 0 0% 3.9%; ... --radius-xl: 1rem; }` block and its associated comment. Keep the Tailwind base reset, `:host { font-family: ...; }` rules, and all Tailwind utility classes.

- [x] 43.9.2 In `src/mfe_packages/demo-mfe/src/lifecycle-profile.tsx`, same removal as 43.9.1.

- [x] 43.9.3 In `src/mfe_packages/demo-mfe/src/lifecycle-theme.tsx`, same removal as 43.9.1.

- [x] 43.9.4 In `src/mfe_packages/demo-mfe/src/lifecycle-uikit.tsx`, same removal as 43.9.1.

- [x] 43.9.5 In `src/mfe_packages/_blank-mfe/src/lifecycle.tsx`, same removal as 43.9.1.

**Traceability**: Removing hardcoded CSS variables is required by the isolation model in design/principles.md line 97: "CSS variables from the host application do NOT penetrate into the MFE's shadow root." With `all: initial` now enforced by `createShadowRoot()` and dynamic theme application via `applyThemeToShadowRoot()`, hardcoded fallback values are incorrect -- they would always show the default theme regardless of the host's current theme.

### 43.10b Remove Dead navigation.ts Code from Microfrontends Plugin

`packages/framework/src/plugins/microfrontends/navigation.ts` contains a `NavigationManager` abstract class with static methods (violating project class rules) and an empty `init()`. It is imported in the microfrontends plugin `onInit()` via `initMfeNavigation()` but does nothing at runtime. Phase 39.7.8 already cleaned the legacy payload types from this file, but the remaining `NavigationManager` class and `initMfeNavigation()` function are dead code.

- [x] 43.10b.1 Delete `packages/framework/src/plugins/microfrontends/navigation.ts` entirely.
- [x] 43.10b.2 In `packages/framework/src/plugins/microfrontends/index.ts`, remove the import of `initMfeNavigation` from `./navigation`. Remove the `navigationCleanup` closure variable. Remove the `navigationCleanup = initMfeNavigation();` call from `onInit()`. Remove the `navigationCleanup` cleanup block from `onDestroy()`.
- [x] 43.10b.3 In `packages/framework/src/plugins/microfrontends/index.ts`, remove the re-export line: `export { initMfeNavigation, getCurrentScreenExtension } from './navigation';`. If any other files import these symbols, update or remove those imports.
- [x] 43.10b.4 Search the codebase for any remaining imports of `initMfeNavigation` or `getCurrentScreenExtension`. Expected result: zero remaining imports after the above changes.

**Traceability**: Dead code removal. Phase 39.7.8 cleaned the legacy payload types but left the empty `NavigationManager` skeleton. This task completes the cleanup.

### 43.11 Rebuild and Verification

- [x] 43.11.1 Rebuild `@hai3/screensets`: `npm run build --workspace=@hai3/screensets`. Expect PASS. The `createShadowRoot()` change must compile and bundle correctly.

- [x] 43.11.2 Rebuild `@hai3/uikit`: `npm run build --workspace=@hai3/uikit`. Expect PASS. The new `applyThemeToShadowRoot()` export must compile and bundle correctly.

- [x] 43.11.3 Run `npm run type-check` -- expect PASS, zero errors. The new imports in lifecycle files (`applyThemeToShadowRoot`, `HAI3_SHARED_PROPERTY_THEME`, `resolveTheme`) must resolve correctly. The `bridge.getProperty()` and `bridge.subscribeToProperty()` calls must type-check.

- [x] 43.11.4 Run `npm run test` in `packages/screensets` -- expect PASS. Existing Shadow DOM tests pass. New isolation style tests (43.2.1-43.2.3) pass. Existing mount/unmount tests (42.6.x) continue to pass with the new isolation style injection.

- [x] 43.11.5 Run `npm run test` in `packages/framework` -- expect PASS. Existing MFE plugin tests pass. New propagation tests (43.4.1-43.4.4) pass.

- [x] 43.11.6 Run `npm run test` in `packages/uikit` -- expect PASS. New `applyThemeToShadowRoot()` tests (43.5.5-43.5.9) pass.

- [x] 43.11.7 Run `npm run test` across all packages -- expect PASS. No regressions.

- [x] 43.11.8 Rebuild demo-mfe: `cd src/mfe_packages/demo-mfe && npm run build`. Expect PASS. The lifecycle changes must compile correctly.

- [x] 43.11.9 Run `npm run build` for the full host application -- expect PASS.

- [x] 43.11.10 Run `npm run lint` -- expect PASS. Zero errors across all packages.

- [x] 43.11.11 Manual E2E: (a) Start demo-mfe dev server + host. (b) Mount a screen extension. Inspect the Shadow DOM: verify `<style id="__hai3-shadow-isolation__">` is present with `all: initial; display: block;`. (c) Verify the MFE renders with theme-aware colors (not browser defaults and not hardcoded fallback values). (d) Change the theme via the host's theme selector. Verify the MFE's colors update to match the new theme (CSS variables inside the shadow root are updated by `applyThemeToShadowRoot()`). (e) Change the language via the host's language selector. Verify the MFE receives the language change (observable in dev tools via bridge property state). (f) Inspect the shadow root's `:host` styles: confirm there are NO hardcoded CSS variable values from the old `initializeStyles()` -- all CSS variables come from `applyThemeToShadowRoot()`. (g) Verify that CSS custom properties set on `document.documentElement` by the host do NOT appear inside the MFE's shadow root (the `all: initial` rule blocks inheritance).

### 43.12 Extract Shared Theme Subscription Logic into ThemeAwareReactLifecycle Abstract Class

Tasks 43.7.1-43.7.4 and 43.8.1 implemented identical theme subscription logic in 5 lifecycle files across 2 MFE packages. The shared logic -- shadow root detection, initial theme application, theme change subscription, and unmount cleanup -- is duplicated verbatim in every lifecycle class. This section extracts the shared pattern into a `ThemeAwareReactLifecycle` abstract class following the project's "abstract class + concrete implementation" pattern.

**Why an abstract class (not a standalone function or mixin)**:
- Project rules mandate: "EVERY component MUST be a class. NEVER create standalone functions." A `createThemeSubscription()` helper function would violate this.
- The abstract class + concrete class pattern (Dependency Inversion) is the established HAI3 idiom: abstract class defines the contract and shared behavior, concrete classes provide screen-specific rendering and styles.
- The abstract class owns private state (`shadowRoot`, `unsubscribeTheme`, `root`) with proper encapsulation -- no public getters or test seams.

**Why one copy per MFE package (not a shared npm package)**:
- `_blank-mfe` is a TEMPLATE for new MFE packages. It cannot import from `demo-mfe` (separate package, no dependency relationship).
- Both packages get their own copy of `ThemeAwareReactLifecycle` in their `shared/` directory. This is the correct L4 (application layer) approach -- the abstract class is an MFE application concern, not a platform utility.
- If a shared npm package is introduced later for cross-MFE utilities, the abstract class can be moved there. But that is a separate proposal, not a deferral.

**Architecture**:

```
MfeEntryLifecycle<ChildMfeBridge> (interface, from @hai3/react)
       ^
       |  implements
       |
ThemeAwareReactLifecycle (abstract class, in each MFE's shared/)
  - private root: Root | null
  - private shadowRoot: ShadowRoot | null
  - private unsubscribeTheme: (() => void) | null
  + mount(container, bridge): void  [concrete -- steps 1-6]
  + unmount(container): void        [concrete -- cleanup + React unmount]
  # abstract initializeStyles(container): void  [each lifecycle provides its own Tailwind utilities]
  # abstract renderContent(root: Root, bridge: ChildMfeBridge): void  [each lifecycle renders its own screen component]
       ^
       |  extends
       |
HelloWorldLifecycle / ProfileLifecycle / CurrentThemeLifecycle / UIKitElementsLifecycle / BlankMfeLifecycle
  # initializeStyles(container): void  [screen-specific Tailwind utility styles]
  # renderContent(root, bridge): void  [renders specific screen component via root.render()]
```

**Mount sequence (concrete in abstract class)**: Steps 1-6 are identical across all lifecycles and are implemented once in `ThemeAwareReactLifecycle.mount()`:
1. `this.shadowRoot = container instanceof ShadowRoot ? container : null;`
2. `this.initializeStyles(container);` -- calls the abstract method (subclass provides styles)
3. `const initialProperty = bridge.getProperty(HAI3_SHARED_PROPERTY_THEME);`
4. Apply initial theme: `if (initialProperty && typeof initialProperty.value === 'string' && this.shadowRoot) { ... resolveTheme ... applyThemeToShadowRoot ... }`
5. `this.unsubscribeTheme = bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_THEME, ...);`
6. `this.root = createRoot(container);`
7. `this.renderContent(this.root, bridge);` -- calls the abstract method (subclass renders its screen)

**Unmount sequence (concrete in abstract class)**:
1. `this.unsubscribeTheme?.(); this.unsubscribeTheme = null;`
2. `this.shadowRoot = null;`
3. `this.root?.unmount(); this.root = null;`

**Protected abstract methods**:
- `initializeStyles(container: Element | ShadowRoot): void` -- each concrete lifecycle provides its own Tailwind utility CSS. The style content varies per screen (different utility classes needed). This remains an abstract method, not a shared implementation.
- `renderContent(root: Root, bridge: ChildMfeBridge): void` -- each concrete lifecycle renders its own screen component (e.g., `root.render(<HelloWorldScreen bridge={bridge} />`). This is the only screen-specific behavior beyond styles.

#### 43.12.1 Create ThemeAwareReactLifecycle abstract class for demo-mfe

- [x] 43.12.1 Create `src/mfe_packages/demo-mfe/src/shared/ThemeAwareReactLifecycle.tsx`:
  - Import `{ createRoot, type Root }` from `react-dom/client`
  - Import `type { MfeEntryLifecycle, ChildMfeBridge, SharedProperty }` from `@hai3/react`
  - Import `{ HAI3_SHARED_PROPERTY_THEME }` from `@hai3/react`
  - Import `{ applyThemeToShadowRoot }` from `@hai3/uikit`
  - Import `{ resolveTheme }` from `./themes`
  - Define `abstract class ThemeAwareReactLifecycle implements MfeEntryLifecycle<ChildMfeBridge>`:
    - `private root: Root | null = null;`
    - `private shadowRoot: ShadowRoot | null = null;`
    - `private unsubscribeTheme: (() => void) | null = null;`
    - Concrete `mount(container: Element | ShadowRoot, bridge: ChildMfeBridge): void` implementing steps 1-7 from section 43.7, where step 2 calls `this.initializeStyles(container)` and step 7 calls `this.renderContent(this.root!, bridge)`
    - Concrete `unmount(_container: Element | ShadowRoot): void` implementing the cleanup sequence: unsubscribe theme, clear shadow root, unmount React root
    - `protected abstract initializeStyles(container: Element | ShadowRoot): void;`
    - `protected abstract renderContent(root: Root, bridge: ChildMfeBridge): void;`
  - Export the abstract class as a named export: `export { ThemeAwareReactLifecycle }`

#### 43.12.2 Refactor demo-mfe lifecycle files to extend ThemeAwareReactLifecycle

- [x] 43.12.2 Refactor `src/mfe_packages/demo-mfe/src/lifecycle-helloworld.tsx`:
  - Remove imports: `createRoot`, `Root`, `MfeEntryLifecycle`, `ChildMfeBridge`, `SharedProperty`, `HAI3_SHARED_PROPERTY_THEME`, `applyThemeToShadowRoot`, `resolveTheme`
  - Add import: `{ ThemeAwareReactLifecycle }` from `./shared/ThemeAwareReactLifecycle`
  - Add import: `type { Root }` from `react-dom/client` (needed for `renderContent` parameter type)
  - Add import: `type { ChildMfeBridge }` from `@hai3/react` (needed for `renderContent` parameter type)
  - Change class declaration from `class HelloWorldLifecycle implements MfeEntryLifecycle<ChildMfeBridge>` to `class HelloWorldLifecycle extends ThemeAwareReactLifecycle`
  - Remove private members: `root`, `shadowRoot`, `unsubscribeTheme` (now in abstract class)
  - Remove `mount()` method entirely (inherited from abstract class)
  - Remove `unmount()` method entirely (inherited from abstract class)
  - Keep `private initializeStyles(container: Element | ShadowRoot): void` but change to `protected initializeStyles(container: Element | ShadowRoot): void` (override of abstract method)
  - Add `protected renderContent(root: Root, bridge: ChildMfeBridge): void { root.render(<HelloWorldScreen bridge={bridge} />); }`
  - Keep `export default new HelloWorldLifecycle();`

- [x] 43.12.3 Refactor `src/mfe_packages/demo-mfe/src/lifecycle-profile.tsx`: Same refactoring pattern as 43.12.2, adapted for `ProfileLifecycle` class and `ProfileScreen` component. Extend `ThemeAwareReactLifecycle`, remove duplicated mount/unmount/private members, change `initializeStyles` to `protected`, add `renderContent` calling `root.render(<ProfileScreen bridge={bridge} />)`.

- [x] 43.12.4 Refactor `src/mfe_packages/demo-mfe/src/lifecycle-theme.tsx`: Same refactoring pattern as 43.12.2, adapted for `CurrentThemeLifecycle` class and `CurrentThemeScreen` component. Extend `ThemeAwareReactLifecycle`, remove duplicated mount/unmount/private members, change `initializeStyles` to `protected`, add `renderContent` calling `root.render(<CurrentThemeScreen bridge={bridge} />)`.

- [x] 43.12.5 Refactor `src/mfe_packages/demo-mfe/src/lifecycle-uikit.tsx`: Same refactoring pattern as 43.12.2, adapted for `UIKitElementsLifecycle` class and `UIKitElementsScreen` component. Extend `ThemeAwareReactLifecycle`, remove duplicated mount/unmount/private members, change `initializeStyles` to `protected`, add `renderContent` calling `root.render(<UIKitElementsScreen bridge={bridge} />)`.

#### 43.12.3b Create ThemeAwareReactLifecycle abstract class for blank-mfe

- [x] 43.12.6 Create `src/mfe_packages/_blank-mfe/src/shared/ThemeAwareReactLifecycle.tsx`: Same file as 43.12.1. This is a copy, not an import -- `_blank-mfe` is an independent template package. The import path for `resolveTheme` is `./themes` (same relative path since it is in the same `shared/` directory).

#### 43.12.4b Refactor blank-mfe lifecycle to extend ThemeAwareReactLifecycle

- [x] 43.12.7 Refactor `src/mfe_packages/_blank-mfe/src/lifecycle.tsx`: Same refactoring pattern as 43.12.2, adapted for `BlankMfeLifecycle` class and `HomeScreen` component. Extend `ThemeAwareReactLifecycle` (import from `./shared/ThemeAwareReactLifecycle`), remove duplicated mount/unmount/private members, change `initializeStyles` to `protected`, add `renderContent` calling `root.render(<HomeScreen bridge={bridge} />)`.

#### 43.12.5b Verification

- [x] 43.12.8 Run `npm run type-check` -- expect PASS. The abstract class, concrete extensions, and all imports must resolve correctly. No `as any` or `unknown` casts.

- [x] 43.12.9 Rebuild demo-mfe: `cd src/mfe_packages/demo-mfe && npm run build`. Expect PASS. The refactored lifecycle files must compile correctly with the abstract class.

- [x] 43.12.10 Run `npm run build` for the full host application -- expect PASS.

- [x] 43.12.11 Run `npm run lint` -- expect PASS. Zero errors across all packages.

- [x] 43.12.12 Manual E2E: (a) Start demo-mfe dev server + host. (b) Mount each screen extension (HelloWorld, Profile, Theme, UIKit). Verify all 4 render correctly with theme-aware colors. (c) Change the theme. Verify all 4 MFE extensions update their colors. (d) Verify no regressions from the refactoring -- behavior must be identical to pre-refactoring state.

**Traceability**: This section addresses the code duplication introduced by tasks 43.7.1-43.7.4 and 43.8.1. The abstract class pattern traces to the project rule "abstract class (exportable abstraction) + concrete class (private state/methods)" and to design/principles.md "Theme and Language as Domain Properties" (the mount sequence preventing FOUC is preserved in the abstract class). Each concrete lifecycle's `initializeStyles` and `renderContent` remain screen-specific per their original task definitions.

### 43.13 Architecture Audit Fixes: Remove L1 Mount Callback + Fix MFE Cross-Boundary Theme Imports

Two issues found during architecture audit. One blocker (ISP/layer violation) and one warning (cross-boundary imports violating MFE independence).

---

#### 43.13.1 BLOCKER: Remove `onMountStateChanged` from L1

**Problem**: `onMountStateChanged` in `ScreensetsRegistryConfig` is a React/store concern leaked into L1 (`@hai3/screensets`). L1 must have ZERO knowledge of the framework store. This is:
- An ISP violation: the config interface has a member serving only one consumer (the L2 microfrontends plugin).
- Capability duplication: L1 already triggers `activated`/`deactivated` lifecycle stages at the exact same mount/unmount points where the callback fires.
- Public API pollution: exists solely for L2 store synchronization.

**Current state**:
- `packages/screensets/src/mfe/runtime/config.ts` defines `onMountStateChanged` on `ScreensetsRegistryConfig`.
- `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts` passes it to `DefaultMountManager`.
- `packages/screensets/src/mfe/runtime/default-mount-manager.ts` stores it as a private field and invokes it after mount (lines 260-269) and unmount (lines 353-362).
- `packages/framework/src/plugins/microfrontends/index.ts` provides the callback that dispatches `setExtensionMounted`/`setExtensionUnmounted` to the store.

**Fix approach**: Remove the callback from L1 entirely. In L2, the `microfrontends()` plugin wraps the registry's `executeActionsChain` method before exposing the registry. The wrapper detects mount/unmount action completions and dispatches to the store. This keeps L1 pure and puts the framework concern in L2 where it belongs.

**Why wrapping `executeActionsChain` is the correct L2 mechanism**:
- L2 creates the `screensetsRegistry` instance via `screensetsRegistryFactory.build()`. L2 owns this instance.
- ALL mount/unmount operations flow through `executeActionsChain` with `HAI3_ACTION_MOUNT_EXT` / `HAI3_ACTION_UNMOUNT_EXT` action types. This includes direct L2 action calls AND child bridge `executeActionsChain` calls (swap semantics, MFE-initiated navigation).
- The wrapper intercepts the action chain AFTER successful resolution, reads the `action.type`, `action.target` (domainId), and `action.payload.extensionId`, then dispatches the appropriate store action.
- This is NOT monkey-patching an abstract class -- it is L2 decorating its own concrete instance before exposing it through `provides.registries`. The decorator pattern is a standard OOP technique.
- Alternative rejected: domain lifecycle hooks. Lifecycle hooks fire actions chains, which are L1 actions -- there is no "dispatch to store" action type. Adding a custom L2 action type for store dispatch is over-engineering.
- Alternative rejected: eventBus. L1 (`@hai3/screensets`) has zero dependencies and does not import `eventBus` from `@hai3/state`. Emitting events from L1 would introduce a dependency violation.

##### 43.13.1.1 Remove `onMountStateChanged` from `ScreensetsRegistryConfig`

- [x] 43.13.1.1 In `packages/screensets/src/mfe/runtime/config.ts`: Remove the `onMountStateChanged` property and its JSDoc from the `ScreensetsRegistryConfig` interface. The interface should contain only `typeSystem` and `mfeHandlers`.

##### 43.13.1.2 Remove `onMountStateChanged` from `DefaultScreensetsRegistry`

- [x] 43.13.1.2 In `packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts`: Remove the `onMountStateChanged: config.onMountStateChanged` line from the `DefaultMountManager` constructor call (currently line 190). No other changes needed -- the config field is simply no longer passed.

##### 43.13.1.3 Remove `onMountStateChanged` from `DefaultMountManager`

- [x] 43.13.1.3 In `packages/screensets/src/mfe/runtime/default-mount-manager.ts`:
  - Remove the `private readonly onMountStateChanged?` field declaration (line 79).
  - Remove `onMountStateChanged` from the constructor config parameter type (line 91) and the `this.onMountStateChanged = config.onMountStateChanged;` assignment (line 103).
  - Remove the `onMountStateChanged` notification block in `mountExtension` (lines 260-269): the `try { this.onMountStateChanged?.({ type: 'mounted', ... }) } catch { }` block.
  - Remove the `onMountStateChanged` notification block in `unmountExtension` (lines 353-362): the `try { this.onMountStateChanged?.({ type: 'unmounted', ... }) } catch { }` block.
  - Do NOT remove the `activated`/`deactivated` lifecycle stage triggers -- those remain.

##### 43.13.1.4 Wire L2 store dispatch via `executeActionsChain` wrapper

- [x] 43.13.1.4 In `packages/framework/src/plugins/microfrontends/index.ts`:
  - Remove the `onMountStateChanged` callback from the `screensetsRegistryFactory.build()` call. The build call should pass only `typeSystem` and `mfeHandlers`.
  - After the `screensetsRegistryFactory.build()` call, wrap the registry's `executeActionsChain` method to intercept mount/unmount completions:
    ```
    const originalExecuteActionsChain = screensetsRegistry.executeActionsChain.bind(screensetsRegistry);
    screensetsRegistry.executeActionsChain = async (chain) => {
      await originalExecuteActionsChain(chain);
      // After successful execution, dispatch store updates for mount/unmount
      const actionType = chain.action?.type;
      if (actionType === HAI3_ACTION_MOUNT_EXT) {
        const store = getStore();
        const domainId = chain.action!.target;
        const extensionId = chain.action!.payload?.extensionId as string;
        if (domainId && extensionId) {
          store.dispatch(setExtensionMounted({ domainId, extensionId }));
        }
      } else if (actionType === HAI3_ACTION_UNMOUNT_EXT) {
        const store = getStore();
        const domainId = chain.action!.target;
        if (domainId) {
          store.dispatch(setExtensionUnmounted({ domainId }));
        }
      }
    };
    ```
  - Import `HAI3_ACTION_MOUNT_EXT` and `HAI3_ACTION_UNMOUNT_EXT` from `@hai3/screensets` (add to existing import). These constants are already available in the `@hai3/screensets` barrel.
  - IMPORTANT: The wrapper must only dispatch on SUCCESSFUL completion. If `originalExecuteActionsChain` throws, the wrapper re-throws without dispatching (the `await` naturally propagates the error since dispatch is after await).
  - IMPORTANT for swap semantics: When the screen domain receives a `mount_ext` action for extension B while extension A is mounted, the L1 `ExtensionLifecycleActionHandler` auto-unmounts A then mounts B -- all within a single `executeActionsChain` call. The wrapper sees only the `HAI3_ACTION_MOUNT_EXT` action type. This is correct: dispatching `setExtensionMounted({ domainId, extensionId: B })` overwrites the previous value for that domain, which is the desired behavior for swap semantics. No separate unmount dispatch is needed because the store tracks "which extension is mounted in domain X", and the mount dispatch updates it to the new extension.

##### 43.13.1.5 Verify no test references to `onMountStateChanged`

- [x] 43.13.1.5 Search for `onMountStateChanged` across ALL test files (`**/*.test.*`, `**/*.spec.*`) in the entire repository. Expect ZERO matches. If any test references `onMountStateChanged`, update the test to remove the reference. The existing `mfe-slice-mount.test.ts` tests reducers/selectors in isolation and does NOT reference `onMountStateChanged`.

##### 43.13.1.6 Verification

- [x] 43.13.1.6 Run `npm run type-check` -- expect PASS. The removed config field must not be referenced anywhere.

- [x] 43.13.1.7 Run `cd packages/screensets && npx vitest run` -- expect PASS. No regressions in L1 tests.

- [x] 43.13.1.8 Run `cd packages/framework && npx vitest run` -- expect PASS. The `mfe-slice-mount.test.ts` tests should still pass (they test reducers/selectors, not the callback mechanism). The store dispatch now flows through the `executeActionsChain` wrapper instead of the callback.

- [x] 43.13.1.9 Run `npm run build --workspace=@hai3/screensets && npm run build --workspace=@hai3/framework` -- expect PASS.

- [x] 43.13.1.10 Run `npm run lint` -- expect PASS.

- [x] 43.13.1.11 Manual E2E: (a) Start demo-mfe dev server + host. (b) Mount a screen extension. (c) Open React DevTools or store DevTools. (d) Verify the store's `mfe.mountedExtensions` state updates correctly when extensions mount/unmount (the `selectMountedExtension` selector should return the correct extension ID). (e) Switch between screen extensions (swap semantics). Verify the mounted extension in the store updates to the new extension. (f) If sidebar or popup domains are available, test mount/unmount (toggle semantics). Verify the store reflects mount and unmount correctly.

**Traceability**: This section addresses an ISP violation (ScreensetsRegistryConfig.onMountStateChanged) and L1/L2 layer boundary violation identified during architecture audit. The `onMountStateChanged` callback was introduced in Phase 42 (task 42.7) for store synchronization. This fix moves the synchronization to L2 via executeActionsChain wrapping, preserving the same store behavior (setExtensionMounted/setExtensionUnmounted dispatch) while eliminating the L1 callback. The slice, reducers, selectors, and React hooks (`useActivePackage`, `selectMountedExtension`) remain unchanged.

---

#### 43.13.2 WARNING: Fix Cross-Boundary Relative Imports in MFE Theme Files

**Problem**: Both `demo-mfe` and `_blank-mfe` import theme definitions from the host application via `../../../../app/themes/` relative imports. MFE packages must be independently deployable. Cross-boundary imports create a hard dependency on the host's file structure, breaking MFE isolation.

**Current state**:
- `src/mfe_packages/demo-mfe/src/shared/themes.ts` imports `defaultTheme`, `darkTheme`, `lightTheme`, `draculaTheme`, `draculaLargeTheme` from `../../../../app/themes/*`.
- `src/mfe_packages/_blank-mfe/src/shared/themes.ts` imports the same 5 themes from the same relative paths.
- The host theme files in `src/app/themes/` each export a `Theme` object (from `@hai3/uikit`) with color definitions using Tailwind color constants.

**Fix approach**: Each MFE package gets its OWN copy of the theme definitions inlined directly in its `shared/themes.ts`. The `../../../../app/themes/` relative imports are removed. The Tailwind color constants (`colors` from `tailwindColors.ts`) are also inlined -- each MFE's themes file must contain the actual color hex values, not references to the host's `tailwindColors` module.

**Why duplication is correct**: Each MFE is an independently deployable unit. Theme definitions are internal to each MFE. If themes are later published as a shared npm package (e.g., `@hai3/themes`), each MFE can import from that package. But cross-boundary relative imports are never acceptable.

##### 43.13.2.1 Inline theme definitions in demo-mfe

- [x] 43.13.2.1 Rewrite `src/mfe_packages/demo-mfe/src/shared/themes.ts`:
  - Remove ALL `../../../../app/themes/*` imports.
  - Keep the `import type { Theme } from '@hai3/uikit';` import.
  - Inline the complete theme objects (`defaultTheme`, `darkTheme`, `lightTheme`, `draculaTheme`, `draculaLargeTheme`) with resolved hex color values. Copy the color values from the host theme files (`src/app/themes/default.ts`, `dark.ts`, `light.ts`, `dracula.ts`, `dracula-large.ts`), resolving the Tailwind color references (`colors.blue[600]`, etc.) to their actual hex values.
  - Keep the `THEME_MAP` record and `resolveTheme` function unchanged.
  - The file must have ZERO imports from outside the MFE package boundary (except npm packages like `@hai3/uikit`).

##### 43.13.2.2 Inline theme definitions in blank-mfe

- [x] 43.13.2.2 Rewrite `src/mfe_packages/_blank-mfe/src/shared/themes.ts`:
  - Same approach as 43.13.2.1. Remove ALL `../../../../app/themes/*` imports. Inline the complete theme objects with resolved hex color values.
  - Keep the `import type { Theme} from '@hai3/uikit';` import.
  - Keep the `THEME_MAP` record and `resolveTheme` function unchanged.
  - The file must have ZERO imports from outside the MFE package boundary (except npm packages like `@hai3/uikit`).

##### 43.13.2.3 Verification

- [x] 43.13.2.3 Run `npm run type-check` -- expect PASS. The inlined theme objects must satisfy the `Theme` type from `@hai3/uikit`.

- [x] 43.13.2.4 Rebuild demo-mfe: `cd src/mfe_packages/demo-mfe && npm run build` -- expect PASS.

- [x] 43.13.2.5 Run `npm run build` for the full host application -- expect PASS.

- [x] 43.13.2.6 Run `npm run lint` -- expect PASS.

- [x] 43.13.2.7 Verify NO cross-boundary imports remain: search for `../../../../app/` across all files in `src/mfe_packages/`. Expect ZERO matches.

- [x] 43.13.2.8 Manual E2E: (a) Start demo-mfe dev server + host. (b) Mount a screen extension. (c) Change the theme. Verify the MFE renders with the correct theme colors (the inlined definitions must match the host's theme definitions exactly -- no visual regressions).

**Traceability**: This section addresses an MFE isolation warning from architecture audit. Cross-boundary relative imports violate the independently-deployable MFE principle established in design/principles.md. The inlined theme definitions maintain the same runtime behavior as the original imports.
