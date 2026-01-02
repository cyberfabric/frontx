## MODIFIED Requirements

### Requirement: React Adapter Layer

The system SHALL provide a `@hai3/react` package with React bindings but NO layout rendering components and NO UI kit dependencies.

#### Scenario: React depends only on framework

- **WHEN** checking `@hai3/react` package.json
- **THEN** only `@hai3/framework` appears as @hai3 dependency
- **AND** NO direct SDK package imports (flux, layout, api)
- **AND** NO @hai3/uikit-contracts dependency exists
- **AND** NO @hai3/uikit dependency exists

#### Scenario: React provides HAI3Provider

- **WHEN** importing from `@hai3/react`
- **THEN** `HAI3Provider` component is available
- **AND** it wraps the app with Redux Provider and initializes effects

#### Scenario: React provides hooks

- **WHEN** importing from `@hai3/react`
- **THEN** hooks are available: `useAppDispatch`, `useAppSelector`, `useTranslation`, `useScreenTranslations`, `useNavigation`, `useTheme`
- **AND** hooks are fully typed with TypeScript

#### Scenario: React provides AppRouter

- **WHEN** importing from `@hai3/react`
- **THEN** `AppRouter` component is available for routing
- **AND** it integrates with framework's routeRegistry

#### Scenario: React has NO layout components

- **WHEN** checking `@hai3/react` exports
- **THEN** NO Layout, Header, Footer, Menu, Sidebar, Screen, Popup, Overlay components exist
- **AND** NO TextLoader component exists (moved to CLI templates)
- **AND** layout rendering is provided via CLI scaffolding in L4 (user's project)

#### Scenario: React has NO uikitRegistry

- **WHEN** checking `@hai3/react` exports
- **THEN** NO `uikitRegistry` export exists
- **AND** NO `UiKitComponent` enum is exported
- **AND** NO `UiKitIcon` enum is exported
- **AND** NO `UiKitComponentMap` or `ComponentName` types are exported
- **BECAUSE** UI component registration is handled in L4 (user's project), not SDK layer

### Requirement: CLI-Generated Layout

The system SHALL provide CLI commands to scaffold layout components AND utility components into the user's project.

#### Scenario: Scaffold includes TextLoader component

- **WHEN** running `hai3 create my-app` or `hai3 scaffold layout`
- **THEN** `src/app/components/TextLoader.tsx` is generated
- **AND** it imports `useTranslation` from `@hai3/react`
- **AND** it imports `Skeleton` directly from `@hai3/uikit`
- **AND** it includes the `TextLoaderProps` interface
- **BECAUSE** TextLoader is a presentation component that belongs in L4, not L3

#### Scenario: TextLoader prevents flash of untranslated content

- **WHEN** using `<TextLoader>` in user's project
- **THEN** it shows fallback or Skeleton while language is not set
- **AND** it renders children once language is available
- **AND** behavior is identical to previous @hai3/react TextLoader

### Requirement: Layer Dependency Rules

The system SHALL enforce strict layer dependencies via ESLint and dependency-cruiser.

**IMPORTANT**: Layer rules apply to **PACKAGE dependencies** (what a package lists in package.json), NOT to **user/generated code**. User code and CLI-generated layout code CAN import from any @hai3 package.

#### Scenario: SDK layer isolation

- **WHEN** running `npm run arch:deps`
- **THEN** any @hai3 import within SDK packages fails validation
- **AND** any React import within SDK packages fails validation

#### Scenario: Framework layer constraints

- **WHEN** running `npm run arch:deps`
- **THEN** framework can only import from SDK layer
- **AND** framework cannot import React
- **AND** framework cannot import uikit-contracts
- **AND** framework cannot import uikit

#### Scenario: React layer constraints

- **WHEN** running `npm run arch:deps`
- **THEN** react can only import from framework
- **AND** react cannot directly import SDK packages
- **AND** react cannot import uikit-contracts
- **AND** react cannot import uikit

#### Scenario: User code can import any package

- **WHEN** user code (screensets, generated layout, app components) imports from @hai3 packages
- **THEN** it CAN import from any layer: `@hai3/state`, `@hai3/screensets`, `@hai3/framework`, `@hai3/react`, `@hai3/uikit`
- **AND** layer rules do NOT apply to user's src/ directory
- **AND** this allows generated layout to import types from `@hai3/screensets` and slices from `@hai3/framework`
- **AND** this allows TextLoader to import `useTranslation` from `@hai3/react` and `Skeleton` from `@hai3/uikit`
