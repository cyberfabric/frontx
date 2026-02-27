## ADDED Requirements

### Requirement: AI Guidelines — MFE Screensets Scope

The `.ai/targets/SCREENSETS.md` guideline SHALL cover MFE packages at `src/mfe_packages/**` as the primary screenset location, and `.ai/GUIDELINES.md` routing table SHALL direct MFE code to `SCREENSETS.md`.

#### Scenario: GUIDELINES.md routing table includes MFE packages

- **WHEN** an AI agent resolves routing for code under `src/mfe_packages/`
- **THEN** `.ai/GUIDELINES.md` SHALL have a route entry: `src/mfe_packages` → `.ai/targets/SCREENSETS.md`
- **AND** the existing `src/screensets` route SHALL be annotated as legacy (no screensets exist there anymore)

#### Scenario: SCREENSETS.md scope covers MFE packages

- **WHEN** the SCREENSETS.md guideline defines its scope
- **THEN** the primary scope SHALL be `src/mfe_packages/**`
- **AND** the legacy scope `src/screensets/**` SHALL be noted as deprecated
- **AND** rules SHALL apply to all code within MFE packages

### Requirement: AI Guidelines — MFE State Management Rules

The `.ai/targets/SCREENSETS.md` guideline SHALL describe MFE-local state management using `createHAI3().use(effects()).use(mock()).build()` + `HAI3Provider` from `@hai3/react`, with the same flux/events cycle rules as host-level code.

#### Scenario: SCREENSETS.md describes MFE store setup

- **WHEN** an AI agent reads SCREENSETS.md for MFE state management guidance
- **THEN** the guideline SHALL describe creating a minimal HAI3App via `createHAI3().use(effects()).use(mock()).build()`
- **AND** SHALL describe wrapping the React tree in `<HAI3Provider app={mfeApp}>`
- **AND** SHALL describe using `registerSlice()` and `createSlice()` for slice registration
- **AND** SHALL explicitly state that direct `react-redux`, `redux`, or `@reduxjs/toolkit` imports are forbidden
- **AND** SHALL describe the `init.ts` shared module pattern for idempotent bootstrap

#### Scenario: SCREENSETS.md describes MFE flux cycle

- **WHEN** an AI agent reads SCREENSETS.md for MFE dataflow guidance
- **THEN** the guideline SHALL describe the canonical flux cycle: Action → Event → Effect → Store
- **AND** SHALL describe MFE event naming convention: `mfe/<domain>/<eventName>`
- **AND** SHALL describe module augmentation for `EventPayloadMap` and `RootState`
- **AND** SHALL note that the cycle is identical to host-level flux, using the MFE's isolated singletons

### Requirement: AI Guidelines — MFE API Service Rules

The `.ai/targets/SCREENSETS.md` guideline SHALL describe MFE-local API services under `src/mfe_packages/*/src/api/`, using the MFE's own `apiRegistry` instance.

#### Scenario: SCREENSETS.md describes MFE-local API services

- **WHEN** an AI agent reads SCREENSETS.md for MFE API service guidance
- **THEN** the guideline SHALL describe defining API services inside the MFE package (e.g., `demo-mfe/src/api/AccountsApiService.ts`)
- **AND** SHALL describe registering with the MFE's own `apiRegistry` singleton (imported from `@hai3/react`)
- **AND** SHALL note that duplicate services across host and MFE are intentional (Independent Data Fetching principle)
- **AND** SHALL describe mock plugin registration via `this.registerPlugin()` in the service constructor

### Requirement: AI Guidelines — MFE Localization Rules

The `.ai/targets/SCREENSETS.md` guideline SHALL describe MFE i18n using bridge-based language property and local `import.meta.glob` pattern, not `I18nRegistry.createLoader`.

#### Scenario: SCREENSETS.md describes MFE i18n pattern

- **WHEN** an AI agent reads SCREENSETS.md for MFE localization guidance
- **THEN** the guideline SHALL describe subscribing to the language domain property via `bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_LANGUAGE, callback)`
- **AND** SHALL describe loading translations from MFE-local files using `import.meta.glob` pattern
- **AND** SHALL NOT reference `I18nRegistry.createLoader` (host-level API, not available in MFEs)
- **AND** SHALL NOT reference the host-level `useScreenTranslations` hook (which depends on `I18nRegistry`). MFE-local re-implementations of `useScreenTranslations` that use `import.meta.glob` and bridge-based language subscription are permitted as local utilities — these are distinct from the host-level hook and do not depend on `I18nRegistry`.

### Requirement: AI Guidelines — MFE Lifecycle and Architecture Rules

The `.ai/targets/SCREENSETS.md` guideline SHALL describe MFE-specific architecture patterns: lifecycle files, `ThemeAwareReactLifecycle`, `init.ts`, and removed APIs.

#### Scenario: SCREENSETS.md describes MFE lifecycle files

- **WHEN** an AI agent reads SCREENSETS.md for MFE architecture guidance
- **THEN** the guideline SHALL describe MFE entry points as lifecycle files exporting `MfeEntryLifecycle` (`mount`/`unmount`)
- **AND** SHALL describe `ThemeAwareReactLifecycle` as the abstract base class for React-based MFE entries
- **AND** SHALL describe the `init.ts` shared module pattern
- **AND** SHALL NOT reference `screensetRegistry`, `useNavigation`, or `navigateToScreen` (removed APIs)

### Requirement: AI Guidelines — MFE Event Isolation

The `.ai/targets/EVENTS.md` guideline SHALL describe MFE runtime isolation and cross-runtime communication boundaries.

#### Scenario: EVENTS.md describes MFE runtime isolation

- **WHEN** an AI agent reads EVENTS.md for event architecture guidance
- **THEN** the guideline SHALL have a section: "MFE Runtime Isolation"
- **AND** SHALL state that each MFE has its own `eventBus` instance (bundled copy of `@hai3/state`)
- **AND** SHALL state that MFE-internal events never cross runtime boundaries
- **AND** SHALL state that the `mfe/` event prefix convention distinguishes MFE events from host `app/` events

#### Scenario: EVENTS.md describes cross-runtime communication rules

- **WHEN** an AI agent reads EVENTS.md for cross-runtime communication guidance
- **THEN** the guideline SHALL have a section: "Cross-Runtime Communication"
- **AND** SHALL state that communication between host and MFE is ONLY via shared properties and actions chains
- **AND** SHALL state that data proxying is forbidden (MFEs SHALL NOT fetch data and forward it to the host)
- **AND** SHALL state that cross-runtime event emission is impossible (separate eventBus instances)

#### Scenario: EVENTS.md includes MFE event naming convention

- **WHEN** an AI agent reads EVENTS.md for event naming guidance
- **THEN** the guideline SHALL include the `mfe/<domain>/<eventName>` convention alongside the existing host convention
- **AND** SHALL note that the `mfe/` prefix is purely a naming convention (not a routing mechanism)
