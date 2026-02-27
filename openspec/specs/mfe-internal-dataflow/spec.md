## ADDED Requirements

### Requirement: MFE-Internal HAI3 App Bootstrap

Each MFE package SHALL create a minimal HAI3App via `createHAI3().use(effects()).use(mock()).build()` from `@hai3/react` and use `HAI3Provider` to provide store context to its React tree. Direct usage of `react-redux`, `redux`, or `@reduxjs/toolkit` in MFE code is forbidden.

#### Scenario: MFE creates minimal HAI3App at module level

- **WHEN** an MFE package initializes (first lifecycle entry loaded)
- **THEN** the MFE SHALL call `createHAI3().use(effects()).use(mock()).build()` from `@hai3/react` to create a minimal `HAI3App`
- **AND** the `createHAI3()` call SHALL use only `.use(effects())` and `.use(mock())` plugins (no themes, layout, microfrontends, i18n, or screensets)
- **AND** the resulting `HAI3App` SHALL contain an isolated store (the MFE's own `storeInstance` singleton from its bundled `@hai3/state`)
- **AND** the `HAI3App` SHALL be created as a module-level side effect in a shared `init.ts` module

#### Scenario: MFE wraps React tree in HAI3Provider

- **WHEN** an MFE lifecycle renders its React content via `ThemeAwareReactLifecycle.renderContent()`
- **THEN** the MFE SHALL wrap the React tree in `<HAI3Provider app={mfeApp}>` from `@hai3/react`
- **AND** `mfeApp` SHALL be the `HAI3App` instance exported from the shared `init.ts` module
- **AND** `useAppSelector` and `useAppDispatch` hooks inside MFE components SHALL connect to the MFE's isolated store via this Provider
- **AND** the MFE SHALL NOT import `Provider` from `react-redux` directly

#### Scenario: MFE store isolation via bundling

- **WHEN** the MFE's `createHAI3().build()` is called
- **THEN** the store created SHALL be the MFE's own isolated singleton (because `@hai3/react` is NOT in Module Federation `shared` config)
- **AND** the MFE's store SHALL NOT share state with the host's store
- **AND** `useAppSelector` in MFE components SHALL read from the MFE's store only

#### Scenario: No direct Redux imports in MFE code

- **WHEN** writing MFE package code under `src/mfe_packages/`
- **THEN** the MFE SHALL NOT import from `react-redux` directly
- **AND** the MFE SHALL NOT import from `redux` directly
- **AND** the MFE SHALL NOT import from `@reduxjs/toolkit` directly
- **AND** all store access SHALL go through `@hai3/react` APIs: `HAI3Provider`, `useAppSelector`, `useAppDispatch`, `createHAI3`, `registerSlice`, `createSlice`

### Requirement: Shared init.ts Module for Idempotent MFE Bootstrap

Each MFE package SHALL have a shared `init.ts` module that performs one-time bootstrap as a module-level side effect. All lifecycle entries import from `init.ts`; JavaScript module semantics guarantee the code executes exactly once.

#### Scenario: Demo MFE init.ts creates app, registers slices and API services

- **WHEN** any lifecycle entry in the demo MFE is loaded for the first time
- **THEN** the `init.ts` module SHALL execute as a side effect of import
- **AND** `init.ts` SHALL call `createHAI3().use(effects()).use(mock()).build()` to create the MFE's `HAI3App`
- **AND** `init.ts` SHALL call `registerSlice(profileSlice, initProfileEffects)` to register the profile slice with effects
- **AND** `init.ts` SHALL call `apiRegistry.register(AccountsApiService)` to register the API service
- **AND** `init.ts` SHALL call `apiRegistry.initialize()` to activate the API service
- **AND** `init.ts` SHALL export the `mfeApp` for use by lifecycle files

#### Scenario: init.ts is idempotent across multiple lifecycle entries

- **WHEN** multiple lifecycle entries (HelloWorld, Profile, Theme, UIKit) import from `init.ts`
- **THEN** the module-level code in `init.ts` SHALL execute exactly once (JavaScript module semantics)
- **AND** the same `mfeApp` instance SHALL be returned to all importers
- **AND** slices and API services SHALL not be double-registered

#### Scenario: Blank MFE init.ts provides scaffolding

- **WHEN** the `_blank-mfe` template initializes
- **THEN** `init.ts` SHALL call `createHAI3().use(effects()).use(mock()).build()` to create the MFE's `HAI3App`
- **AND** `init.ts` SHALL call `registerSlice(homeSlice, initHomeEffects)` with a placeholder slice
- **AND** `init.ts` SHALL call `apiRegistry.register(_BlankApiService)` with a placeholder API service
- **AND** `init.ts` SHALL export the `mfeApp` for use by lifecycle files

### Requirement: MFE-Internal Flux/Events Dataflow Cycle

Each MFE package SHALL implement the canonical flux/events dataflow cycle internally: Component calls Action, Action emits Event via eventBus, Effect listens for Event and calls API/dispatches to Store, Component reads from Store. The MFE's `eventBus`, `apiRegistry`, and store are all isolated per-bundle singletons.

#### Scenario: MFE action emits event via eventBus

- **WHEN** an MFE component triggers a data operation (e.g., Profile screen mounts)
- **THEN** the component SHALL call an action function (e.g., `fetchUser()`)
- **AND** the action function SHALL call `eventBus.emit()` with an MFE-internal event name
- **AND** the action SHALL NOT call API services directly
- **AND** the action SHALL NOT dispatch to the store directly

#### Scenario: MFE effect listens for event and fetches data

- **WHEN** an MFE effect initializer is registered via `registerSlice(slice, initEffects)`
- **THEN** the effect SHALL subscribe to events via `eventBus.on()`
- **AND** on receiving the event, the effect SHALL call the appropriate API service method via `apiRegistry.getService()`
- **AND** on success, the effect SHALL dispatch reducer functions to update the store
- **AND** on failure, the effect SHALL dispatch error state to the store

#### Scenario: MFE component reads from store via hooks

- **WHEN** an MFE component needs data from the store
- **THEN** the component SHALL use `useAppSelector(state => state['sliceName'].field)` from `@hai3/react`
- **AND** the component SHALL NOT use React-local `useState` for data that belongs in the store
- **AND** the component SHALL re-render when the selected store state changes

#### Scenario: Full Profile screen flux cycle

- **WHEN** the ProfileScreen component mounts
- **THEN** it SHALL call `fetchUser()` action in `useEffect`
- **AND** `fetchUser()` SHALL emit `'mfe/profile/user-fetch-requested'` via `eventBus.emit()`
- **AND** `profileEffects` SHALL listen for `'mfe/profile/user-fetch-requested'`
- **AND** the effect SHALL call `apiRegistry.getService(AccountsApiService).getCurrentUser()`
- **AND** on success: dispatch `setUser(user)` and `setLoading(false)` to update the store
- **AND** on failure: dispatch `setError(error)` and `setLoading(false)` to update the store
- **AND** ProfileScreen SHALL read state via `useAppSelector(state => state['demo/profile'].user)`, `.loading`, `.error`

### Requirement: MFE-Internal Event Naming Convention

MFE-internal events SHALL follow the naming format `mfe/<domain>/<eventName>` where event names use past tense for all events, including requests. Events never cross runtime boundaries.

#### Scenario: MFE event name format

- **WHEN** defining events for an MFE's internal flux cycle
- **THEN** event names SHALL follow the format `mfe/<domain>/<eventName>`
- **AND** all event names SHALL use past tense (e.g., `mfe/profile/user-fetch-requested`)
- **AND** the `mfe/` prefix SHALL distinguish MFE-internal events from host events (`app/`)
- **AND** only events that are actually emitted via `eventBus.emit()` SHALL have `EventPayloadMap` entries (effects dispatch directly to the store and do NOT emit outcome events)

#### Scenario: MFE event type safety via module augmentation

- **WHEN** defining typed events for an MFE package
- **THEN** the MFE SHALL augment `EventPayloadMap` on its own bundled copy of `@hai3/react`
- **AND** the augmentation SHALL use `declare module '@hai3/react'` syntax
- **AND** each emitted event SHALL specify its payload type (or `undefined` for no payload) in the augmentation
- **AND** only events that are actually emitted via `eventBus.emit()` SHALL appear in the augmentation (effects dispatch to the store directly and do NOT emit outcome events)
- **AND** `eventBus.emit()` and `eventBus.on()` SHALL enforce payload types at compile time

#### Scenario: MFE events are isolated to MFE runtime

- **WHEN** an MFE emits events via `eventBus.emit()`
- **THEN** only event listeners within the same MFE runtime SHALL receive the event
- **AND** the host's `eventBus` SHALL NOT receive MFE-internal events
- **AND** other MFE runtimes SHALL NOT receive the event
- **AND** this isolation is a natural property of bundling (each MFE bundles its own `@hai3/state` → own `eventBus` singleton)

### Requirement: MFE-Local AccountsApiService

The demo MFE SHALL define its own `AccountsApiService` class extending `BaseApiService` from `@hai3/api` (via `@hai3/react`). This is intentional duplication per the Independent Data Fetching principle.

#### Scenario: Demo MFE defines its own AccountsApiService

- **WHEN** the demo MFE needs to fetch user data
- **THEN** the MFE SHALL have its own `AccountsApiService` class in `demo-mfe/src/api/AccountsApiService.ts`
- **AND** the service SHALL extend `BaseApiService` from `@hai3/react`
- **AND** the service SHALL use `RestProtocol` from `@hai3/react`
- **AND** the service SHALL define a `getCurrentUser()` method returning user data
- **AND** the service SHALL register mock plugins via `this.registerPlugin()` in its constructor

#### Scenario: Demo MFE API service uses own apiRegistry

- **WHEN** the demo MFE registers its `AccountsApiService`
- **THEN** it SHALL call `apiRegistry.register(AccountsApiService)` where `apiRegistry` is imported from `@hai3/react`
- **AND** the `apiRegistry` instance SHALL be the MFE's own isolated singleton (bundled copy)
- **AND** the host's `apiRegistry` SHALL NOT contain the MFE's services and vice versa

#### Scenario: MFE does NOT proxy user data to host

- **WHEN** the MFE's Profile screen fetches user data
- **THEN** the MFE SHALL NOT call `notifyUserLoaded()` or any equivalent to send data to the host
- **AND** the host SHALL fetch its own user data independently via its own `bootstrapEffects`
- **AND** duplicate API requests are an accepted cost mitigated by future `@hai3/api` cache sharing

### Requirement: MFE Profile Slice Definition

The demo MFE SHALL define a Redux slice for Profile screen state using `createSlice` and `registerSlice` from `@hai3/react`.

#### Scenario: Profile slice state shape

- **WHEN** defining the profile slice for the demo MFE
- **THEN** the slice SHALL use `createSlice` from `@hai3/react` with name `'demo/profile'`
- **AND** the initial state SHALL include `user` (null or ApiUser), `loading` (boolean, initially true), and `error` (null or string)
- **AND** the slice SHALL export reducer functions: `setUser`, `setLoading`, `setError`

#### Scenario: Profile slice type safety via module augmentation

- **WHEN** defining the profile slice
- **THEN** the MFE SHALL augment `RootState` on its own bundled copy of `@hai3/react`
- **AND** the augmentation SHALL use `declare module '@hai3/react'` syntax
- **AND** `RootState['demo/profile']` SHALL be typed as the profile state shape
- **AND** `useAppSelector(state => state['demo/profile'])` SHALL be type-safe

### Requirement: Blank MFE Template Flux Scaffolding

The `_blank-mfe` template SHALL include the full flux/events directory structure with empty scaffolding files containing no imaginary domain logic. This is the CLI template for creating new screensets — new screensets must start with the correct internal dataflow architecture.

#### Scenario: Blank MFE template directory structure

- **WHEN** a developer creates a new screenset from the `_blank-mfe` template
- **THEN** the template SHALL include the following flux scaffolding directories and files:
  - `api/_BlankApiService.ts` — empty service extending `BaseApiService`; API response types are defined in this same file (no separate types file)
  - `api/mocks.ts` — mock map placeholder
  - `actions/homeActions.ts` — empty actions file (no actions defined; developers add their own action functions here)
  - `events/homeEvents.ts` — `EventPayloadMap` augmentation placeholder
  - `effects/homeEffects.ts` — effect initializer placeholder
  - `slices/homeSlice.ts` — `createSlice` with minimal state shape
  - `init.ts` — `createHAI3().use(effects()).use(mock()).build()` + slice registration + API registration

#### Scenario: Blank MFE template files are compilable empty scaffolding

- **WHEN** the `_blank-mfe` template is used without modification
- **THEN** all template files SHALL compile without TypeScript errors
- **AND** the files SHALL provide the correct file structure and import patterns but contain no imaginary domain logic
- **AND** the `init.ts` SHALL create a minimal `HAI3App` and register the placeholder slice and API service

#### Scenario: Blank MFE template follows naming conventions

- **WHEN** examining the `_blank-mfe` template files
- **THEN** all `_Blank` prefixes SHALL indicate replacement points for the developer
- **AND** the developer SHALL replace `_Blank` with their screenset name (same as existing template convention)
- **AND** event names SHALL use `mfe/home/` prefix as a placeholder domain

### Requirement: ThemeAwareReactLifecycle HAI3Provider Integration

The `ThemeAwareReactLifecycle` abstract class in both MFE packages SHALL wrap the React tree in `HAI3Provider` from `@hai3/react` with the MFE's `HAI3App` instance.

#### Scenario: renderContent wraps in HAI3Provider

- **WHEN** `ThemeAwareReactLifecycle.renderContent()` renders a screen component
- **THEN** the method SHALL wrap the component in `<HAI3Provider app={mfeApp}>`
- **AND** `mfeApp` SHALL be imported from the MFE's `init.ts` module
- **AND** `HAI3Provider` SHALL be imported from `@hai3/react`

#### Scenario: HAI3Provider wraps all screen entries

- **WHEN** any of the 4 demo MFE entries mount (HelloWorld, Profile, Theme, UIKit)
- **THEN** each entry's React tree SHALL be wrapped in `HAI3Provider` with the same `mfeApp`
- **AND** screens that don't use the store (HelloWorld, Theme, UIKit) SHALL still have the Provider (negligible overhead)
- **AND** screens that use the store (Profile) SHALL have full `useAppSelector`/`useAppDispatch` access

### Requirement: Demo MFE Screen Consistency — Bridge Info Section

ALL demo MFE screens SHALL display a "Bridge Info" section showing bridge properties (Domain ID, Instance ID, Current Theme, Current Language) for development visibility. This establishes a consistent screen pattern across all 4 demo MFE entries. The Bridge Info section uses the `bridge` prop that every screen already receives.

#### Scenario: All 4 demo MFE screens render Bridge Info

- **WHEN** any of the 4 demo MFE screens render (HelloWorld, Profile, Theme, UIKit)
- **THEN** each screen SHALL display a "Bridge Info" section using translated labels
- **AND** the section SHALL show `bridge.domainId` as "Domain ID"
- **AND** the section SHALL show `bridge.instanceId` as "Instance ID"
- **AND** the section SHALL show the current theme value (subscribed via `bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_THEME)`)
- **AND** the section SHALL show the current language value (subscribed via `bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_LANGUAGE)`)

#### Scenario: Bridge Info i18n keys present in all screen language files

- **WHEN** examining the i18n files for any demo MFE screen
- **THEN** the language files SHALL include the 5 bridge-related keys: `bridge_info`, `domain_id`, `instance_id`, `current_theme`, `current_language`
- **AND** the English values SHALL be: "Bridge Info", "Domain ID:", "Instance ID:", "Current Theme:", "Current Language:"
- **AND** all supported language files for that screen SHALL include translated values for these 5 keys

#### Scenario: UIKit Elements screen Bridge Info (pre-existing gap fix)

- **WHEN** the UIKit Elements screen renders
- **THEN** it SHALL display the Bridge Info section matching the pattern used by HelloWorld, Profile, and CurrentTheme screens
- **AND** the UIKit Elements screen SHALL subscribe to theme and language properties to display current values
- **AND** the UIKit screen's i18n files under `src/mfe_packages/demo-mfe/src/screens/uikit/i18n/` SHALL include the 5 bridge-related keys

### Requirement: Blank MFE Screen Consistency — Bridge Info Section

The blank MFE HomeScreen SHALL use i18n keys for all bridge-related labels, matching the same pattern established by the demo MFE screens. Hardcoded English strings in the Bridge Info section are not acceptable because the blank MFE is a registered, running MFE that renders in the sidebar alongside the demo MFE.

#### Scenario: Blank MFE HomeScreen uses i18n keys for Bridge Info labels

- **WHEN** the blank MFE HomeScreen renders the Bridge Info section
- **THEN** the section heading SHALL use `{t('bridge_info')}` instead of a hardcoded "Bridge Properties" string
- **AND** the "Domain ID:" label SHALL use `{t('domain_id')}` instead of hardcoded text
- **AND** the "Instance ID:" label SHALL use `{t('instance_id')}` instead of hardcoded text
- **AND** the "Current Theme:" label SHALL use `{t('current_theme')}` instead of hardcoded text
- **AND** the "Current Language:" label SHALL use `{t('current_language')}` instead of hardcoded text

#### Scenario: Blank MFE i18n files include 5 bridge-related keys

- **WHEN** examining the i18n files for the blank MFE HomeScreen under `src/mfe_packages/_blank-mfe/src/screens/home/i18n/`
- **THEN** ALL 36 language files SHALL include the 5 bridge-related keys: `bridge_info`, `domain_id`, `instance_id`, `current_theme`, `current_language`
- **AND** the English (`en.json`) values SHALL be: `"bridge_info": "Bridge Info"`, `"domain_id": "Domain ID:"`, `"instance_id": "Instance ID:"`, `"current_theme": "Current Theme:"`, `"current_language": "Current Language:"`
- **AND** non-English locale files SHALL use English-only placeholder text for bridge keys (matching the existing pattern across demo MFE i18n files — bridge info is a developer debug section, not user-facing content)

### Requirement: Blank MFE Presentation Metadata — Proper Values

The blank MFE `mfe.json` presentation section SHALL use proper display values instead of template placeholders. Since the blank MFE is registered in `bootstrap.ts` and actively runs in the application, template brackets in the label and route cause visible UI issues (literal `[Your Screen Label]` in the sidebar, URL matching failures from bracket characters in `/[your-route]`).

#### Scenario: Blank MFE mfe.json has proper label and route

- **WHEN** examining the blank MFE `mfe.json` file at `src/mfe_packages/_blank-mfe/mfe.json`
- **THEN** the extension presentation `label` SHALL be `"Blank Home"` (not `"[Your Screen Label]"`)
- **AND** the extension presentation `route` SHALL be `"/blank-home"` (not `"/[your-route]"`)
- **AND** the `icon` and `order` fields SHALL remain unchanged (`"lucide:home"` and `100`)

#### Scenario: Blank MFE appears correctly in sidebar navigation

- **WHEN** the application loads with the blank MFE registered
- **THEN** the sidebar navigation SHALL show "Blank Home" as the menu label (no bracket characters)
- **AND** navigating to the blank MFE SHALL use the URL path `/blank-home` (no bracket characters)
- **AND** route matching SHALL work correctly for the `/blank-home` path

### Requirement: CurrentThemeScreen Color Swatches — Correct CSS Classes

The demo MFE CurrentThemeScreen color swatches array SHALL use the correct Tailwind CSS utility classes that match each semantic color name. Each swatch must apply its own semantic background and foreground classes so that the rendered swatches visually demonstrate the actual theme colors.

#### Scenario: Color swatches use correct semantic Tailwind classes

- **WHEN** examining the `colorSwatches` array in `CurrentThemeScreen.tsx` at `src/mfe_packages/demo-mfe/src/screens/theme/CurrentThemeScreen.tsx`
- **THEN** the Background swatch SHALL use `bg-background text-foreground`
- **AND** the Foreground swatch SHALL use `bg-foreground text-background`
- **AND** the Primary swatch SHALL use `bg-primary text-primary-foreground`
- **AND** the Secondary swatch SHALL use `bg-secondary text-secondary-foreground`
- **AND** the Muted swatch SHALL use `bg-muted text-muted-foreground`
- **AND** the Accent swatch SHALL use `bg-accent text-accent-foreground`
- **AND** the Destructive swatch SHALL use `bg-destructive text-destructive-foreground`

#### Scenario: All 7 swatches render with visually distinct colors

- **WHEN** the CurrentThemeScreen renders and a theme is applied
- **THEN** the 7 color swatches SHALL each render with their own distinct background and foreground colors as defined by the active theme's CSS custom properties
- **AND** no two semantically different swatches (e.g., Secondary vs Muted vs Accent) SHALL appear identical due to sharing the same CSS classes

### Requirement: Demo MFE Translations — Restore Lost Locale Content

During MFE conversion, the original translated i18n content for all 4 demo-mfe screens (helloworld, theme, profile, uikit) was overwritten with English-only text across all 35 non-English locale files. The translations SHALL be restored from the pre-MFE codebase (git history) and merged with new MFE-specific keys.

#### Scenario: Non-English locale files contain translated content

- **WHEN** examining any non-English locale file (e.g., `es.json`, `ru.json`, `fr.json`) for any demo-mfe screen
- **THEN** the keys that existed in the pre-MFE version SHALL contain the original translated text (not English)
- **AND** new keys added during MFE conversion (e.g., `bridge_info`, `domain_id`, `instance_id`, `current_theme`, `current_language`) SHALL use English fallback text

#### Scenario: Translation loading produces visible language changes

- **WHEN** the user switches language in the Studio Language selector
- **THEN** the active screen's text content SHALL update to the selected language
- **AND** the bridge communication mechanism (shared property subscription) SHALL propagate the language change to the MFE

### Requirement: Blank MFE useScreenTranslations — Correct Hook Pattern

The blank MFE `useScreenTranslations` hook SHALL follow the same implementation pattern as the demo-mfe version, using `useRef` for internal language tracking to prevent re-render loops.

#### Scenario: Hook uses useRef for language tracking

- **WHEN** examining `_blank-mfe/src/shared/useScreenTranslations.ts`
- **THEN** the current language SHALL be tracked via `useRef` (not `useState`)
- **AND** the effect dependency array SHALL contain only `[bridge, loadTranslations]` (not `currentLanguage`)

#### Scenario: languageModules hoisted to module level

- **WHEN** examining any screen component that uses `useScreenTranslations`
- **THEN** the `import.meta.glob('./i18n/*.json')` call SHALL be hoisted to module level (outside the component function)
- **AND** a comment `// Stable reference for translation modules (hoisted to module level to prevent re-render loops)` SHALL be present

### Requirement: Menu Filtering by Active GTS Package

The sidebar menu SHALL display only the screen extensions belonging to the currently active GTS package, not all registered screen extensions across all packages. This restores the pre-MFE behavior where only the current screenset's screens appeared in the menu.

#### Scenario: Menu shows only active package screens

- **WHEN** the active GTS package is `hai3.demo`
- **THEN** the sidebar menu SHALL show only demo-mfe screen extensions (Hello World, Profile, Current Theme, UIKit Elements)
- **AND** the blank-mfe screen extension (Blank Home) SHALL NOT appear in the menu

#### Scenario: Package switch updates menu

- **WHEN** the user switches the GTS Package selector from `hai3.demo` to `hai3.blank`
- **THEN** the sidebar menu SHALL update to show only blank-mfe screen extensions (Blank Home)
- **AND** the demo-mfe screen extensions SHALL no longer appear in the menu
