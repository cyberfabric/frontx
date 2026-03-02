## MODIFIED Requirements

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

#### Scenario: MFE store isolation via blob URL evaluation

- **WHEN** the MFE's `createHAI3().build()` is called
- **THEN** the store created SHALL be the MFE's own isolated singleton (because the handler evaluates shared dependency source text via unique Blob URLs per MFE, producing a fresh module evaluation with an independent `storeInstance`)
- **AND** the MFE's store SHALL NOT share state with the host's store
- **AND** `useAppSelector` in MFE components SHALL read from the MFE's store only

#### Scenario: No direct Redux imports in MFE code

- **WHEN** writing MFE package code under `src/mfe_packages/`
- **THEN** the MFE SHALL NOT import from `react-redux` directly
- **AND** the MFE SHALL NOT import from `redux` directly
- **AND** the MFE SHALL NOT import from `@reduxjs/toolkit` directly
- **AND** all store access SHALL go through `@hai3/react` APIs: `HAI3Provider`, `useAppSelector`, `useAppDispatch`, `createHAI3`, `registerSlice`, `createSlice`
