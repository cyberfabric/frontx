# PRD — FrontX Dev Kit

<!-- toc -->

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Background / Problem Statement](#12-background--problem-statement)
  - [1.3 Goals (Business Outcomes)](#13-goals-business-outcomes)
  - [1.4 Glossary](#14-glossary)
- [2. Actors](#2-actors)
  - [2.1 Human Actors](#21-human-actors)
  - [2.2 System Actors](#22-system-actors)
- [3. Operational Concept & Environment](#3-operational-concept--environment)
  - [3.1 Module-Specific Environment Constraints](#31-module-specific-environment-constraints)
- [4. Scope](#4-scope)
  - [4.1 In Scope](#41-in-scope)
  - [4.2 Out of Scope](#42-out-of-scope)
- [5. Functional Requirements](#5-functional-requirements)
  - [5.1 SDK Core](#51-sdk-core)
  - [5.2 App Configuration](#52-app-configuration)
  - [5.3 SSE Streaming](#53-sse-streaming)
  - [5.4 MFE Type System](#54-mfe-type-system)
  - [5.5 MFE Core](#55-mfe-core)
  - [5.6 MFE Blob URL Isolation](#56-mfe-blob-url-isolation)
  - [5.7 MFE Externalize Plugin](#57-mfe-externalize-plugin)
  - [5.8 MFE Internal Dataflow](#58-mfe-internal-dataflow)
  - [5.9 MFE Share Scope Management](#59-mfe-share-scope-management)
  - [5.10 Shared Property Broadcast](#510-shared-property-broadcast)
  - [5.11 Shared Property Validation](#511-shared-property-validation)
  - [5.12 i18n Formatters](#512-i18n-formatters)
  - [5.13 i18n Loading](#513-i18n-loading)
  - [5.14 Studio](#514-studio)
  - [5.15 CLI](#515-cli)
  - [5.16 Publishing](#516-publishing)
  - [5.17 Mock Mode](#517-mock-mode)
  - [5.18 Microfrontend Plugin](#518-microfrontend-plugin)
  - [5.19 Screensets Workflow](#519-screensets-workflow)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 NFR Inclusions](#61-nfr-inclusions)
  - [6.2 NFR Exclusions](#62-nfr-exclusions)
- [7. Public Library Interfaces](#7-public-library-interfaces)
  - [7.1 Public API Surface](#71-public-api-surface)
  - [7.2 External Integration Contracts](#72-external-integration-contracts)
- [8. Use Cases](#8-use-cases)
- [9. Acceptance Criteria](#9-acceptance-criteria)
- [10. Dependencies](#10-dependencies)
- [11. Assumptions](#11-assumptions)
- [12. Risks](#12-risks)

<!-- /toc -->

## 1. Overview

### 1.1 Purpose

FrontX is an AI-optimized UI development kit that accelerates the creation of production-ready interfaces from concept to deployment. It bridges the gap between rapid prototyping (Drafts → Mockups) and scalable production systems through a layered architecture that decouples domain logic, UI components, and business functionality. Built on React 19 with TypeScript, Vite, and Redux Toolkit, FrontX provides a plugin-based framework enabling developers to extend functionality without modifying core code.

The dev kit targets teams building internal tools, dashboards, AI-powered applications, and embedded UI systems. It standardizes patterns for state management, API integration, localization, component reuse, and extensibility while maintaining full control over UI rendering through a customizable UI kit built on shadcn/ui.

### 1.2 Background / Problem Statement

Modern UI frameworks optimize for component reuse and visual design, but fail at enforcing architectural discipline across multiple teams and long-lived projects. Developers face recurring challenges:

- **State Management Chaos**: Mixed patterns (direct dispatch, imperative logic in components, async middleware) create unpredictable state flow and hard-to-trace bugs.
- **API Integration Scattered**: Services coupled to specific protocols (REST vs streaming), mocking logic mixed with business logic, no support for dynamic protocol switching.
- **Localization Friction**: Translation files either monolithic (loaded all-at-once wasting bandwidth) or completely decentralized (inconsistent patterns).
- **Screensets Siloed**: Individual teams own "screens" but lack a standard way to extend the app without modifying core code; integration of third-party features requires custom wiring.
- **Monorepo Bloat**: Framework code, UI components, app templates, and build tools entangled in single packages, forcing unnecessary dependencies.
- **No Clear Upgrade Path**: Breaking changes to core packages ripple across all screens; adding new features requires updating multiple layers.

FrontX solves these by enforcing a proven architectural model with four isolated layers: flat SDK packages (zero inter-dependencies), composable framework plugins, React adapters, and user-owned layout templates. The framework enforces event-driven Flux patterns and zero cross-layer dependencies, ensuring applications remain maintainable as they scale from single screens to complex multi-feature applications with microfrontend deployments.

### 1.3 Goals (Business Outcomes)

| Goal | Baseline | Target | Timeframe |
|------|----------|--------|-----------|
| Time to Production | 4-6 weeks (custom architecture + component library integration) | 1-2 weeks (scaffold + plugin composition) | 2026 Q3 |
| Team Onboarding | 3-5 days (learn monolithic patterns + project-specific rules) | 6-8 hours (four-layer model + plugin API) | 2026 Q2 |
| Bundle Size | 680KB (all features bundled, even unused) | <250KB dev, <180KB prod (tree-shaken per-feature) | 2026 Q3 |
| Per-Screen Load Time | 1.2s (all screens pre-bundled, lazy-load only images) | <400ms (screens + translations lazy-loaded on-demand) | 2026 Q2 |
| Screenset Onboarding | 8-10 hours (study uicore, copy demo, adapt) | 45 min (scaffold + modify single file) | 2026 Q2 |

### 1.4 Glossary

| Term | Definition |
|------|------------|
| Action | Function that emits events on the EventBus. Never calls `getState()`, never async — async work moved to services/effects. |
| Effect Initializer | Function that subscribes to events and dispatches reducers to update Redux state. Called once per slice registration, returns optional cleanup. |
| Reducer | Pure function that updates Redux state based on a ReducerPayload. Exported as standalone functions, NOT via `.actions` property. |
| Screenset | Vertical slice: group of related screens + translations + API services + state, self-contained and deployable independently. |
| Extension / MFE Entry | Loaded microfrontend (via Module Federation) bound to an extension domain; exposes actions and properties for host app communication. |
| Extension Domain | Contract definition for a category of extensions: shared properties, actions host can send, actions extensions can send, lifecycle. |
| Plugin | Framework-level feature (screensets, themes, i18n, routing, effects, microfrontends, layout) composed via `.use()` on `createHAI3` builder. |
| Shared Property | Observable value broadcast to all extensions (e.g., theme, language). Propagated by owning plugin. |
| Studio | Standalone dev tools overlay (theme selector, language picker, API mode toggle, floating panel). Only loaded in `import.meta.env.DEV`. |
| UI Kit | Component library: per-project choice at creation (local components, shadcn, or third-party). |
| Registry | Self-registering singleton (ScreensetsRegistry, ThemeRegistry, I18nRegistry, ApiRegistry). Updated dynamically at runtime. |
| GTS | Global Type System — schema-based validation for MFE shared properties and action chains. |
| CDSL | Cypilot Domain-Specific Language for describing flows, algorithms, and states in FEATURE specs. |
| Shell | The host application code that defines a screenset's layout structure and shell-level features. Owned by the screenset — freely modifiable without constraints. |
| Package Pool | The shared collection of all MFE packages in a project. Screensets reference packages from this pool. Multiple screensets can share the same package. |
| Stage | The SDLC phase of a screenset: `draft` (PM prototyping), `mockup` (UX design refinement), or `production` (deployed code). |
| Promotion | Advancing a screenset from one stage to the next (draft → mockup → production). |

## 2. Actors

> **Note**: Stakeholder needs are managed at project/task level by steering committee. Document **actors** (users, systems) that interact with this module.

### 2.1 Human Actors

#### Application Developer

**ID**: `cpt-frontx-actor-developer`

**Role**: Frontend/fullstack engineer who writes screensets (screen components, actions, effects, slices), integrates API services, adds translations, and extends plugins via composition.
**Needs**: Clear SDK APIs, consistent patterns, type-safe hooks, fast scaffolding via CLI, reliable build tooling.

#### Screenset Author

**ID**: `cpt-frontx-actor-screenset-author`

**Role**: Creates self-contained vertical slices with screens, translations, API services, and state. Registers translations via localization config and implements custom API services.
**Needs**: Self-contained packaging, namespace isolation, lazy-loading support, MFE extension points.

#### Studio User

**ID**: `cpt-frontx-actor-studio-user`

**Role**: Developer using the floating dev panel to toggle themes, screensets, languages, and mock API mode during development.
**Needs**: Quick access (keyboard shortcut), persistent settings, zero production footprint.

#### End User

**ID**: `cpt-frontx-actor-end-user`

**Role**: Uses the built application — interacts with screens, navigates, switches themes/languages, triggers API calls, receives real-time updates.
**Needs**: Responsive load times (<400ms per screen), accessible UI, locale-aware formatting.

### 2.2 System Actors

#### Host Application

**ID**: `cpt-frontx-actor-host-app`

**Role**: Initializes FrontX via `createHAI3().use(...).build()`, registers screensets, provides `HAI3Provider` to React tree, emits configuration events (tenant, language, theme).

#### Build System

**ID**: `cpt-frontx-actor-build-system`

**Role**: Compiles TypeScript via Vite + tsup, tree-shakes dev-only code, bundles monorepo packages, generates Module Federation manifests, runs ESLint/dependency-cruiser/knip checks, publishes packages.

#### Browser Runtime

**ID**: `cpt-frontx-actor-runtime`

**Role**: Evaluates JavaScript modules and lazy-loaded screens, maintains Redux store and EventBus subscriptions, renders React components, handles API calls, persists state to localStorage.

#### Framework Plugin

**ID**: `cpt-frontx-actor-framework-plugin`

**Role**: Implements plugin interface via `.use(featureName(config))`. Provides slices, effects, actions, registries. Subscribes to event bus for cross-plugin communication.

#### API Protocol

**ID**: `cpt-frontx-actor-api-protocol`

**Role**: Implements `ApiProtocol` interface with `initialize()`, `cleanup()`, and custom methods. Registered in `BaseApiService` by constructor name. Supports plugin chains.

#### Microfrontend Runtime

**ID**: `cpt-frontx-actor-microfrontend`

**Role**: Module Federation container that exposes screens/components loaded by host app at runtime. Receives actions from host, broadcasts shared properties. Each instance is blob-URL-isolated.

#### CI/CD Pipeline

**ID**: `cpt-frontx-actor-ci-cd`

**Role**: Validates (TypeScript strict, ESLint, dependency-cruiser, knip), tests, builds packages in layer order, publishes to npm. Enforces architecture rules.

#### GTS Plugin

**ID**: `cpt-frontx-actor-gts-plugin`

**Role**: Validates MFE shared properties and action chains against GTS schemas. Supports derived schemas for theme/language enums.

#### CLI Tool

**ID**: `cpt-frontx-actor-cli`

**Role**: Scaffolds new projects (`frontx create`), generates layout and screenset code (`frontx scaffold`), runs migrations (`frontx migrate`), syncs AI tool configs (`frontx ai sync`). Orchestrates screenset lifecycle operations: copy, promote, delete, list, activate.

#### Product Manager

**ID**: `cpt-frontx-actor-product-manager`

**Role**: Creates new draft screensets (from blank templates or by duplicating existing screensets), uses AI tools to generate feature prototypes in shell code and MFE packages, creates multiple variant drafts for comparison, selects the best approach, and commits the chosen draft to the project.

#### UX Designer

**ID**: `cpt-frontx-actor-ux-designer`

**Role**: Promotes PM drafts to mockup stage, creates styling and layout variants for feedback collection, refines visual design and interaction details, selects the final approach, and commits the chosen mockup.

#### AI Agent

**ID**: `cpt-frontx-actor-ai-agent`

**Role**: Generates and modifies shell code and MFE packages within screensets under PM or designer direction. Operates through IDE-integrated AI assistants, using CLI commands and FrontX-provided skills and workflows for screenset-aware operations.

#### Dev Server

**ID**: `cpt-frontx-actor-dev-server`

**Role**: Serves the active screenset's shell and MFE packages during local development. Handles entry point resolution for the active screenset.

## 3. Operational Concept & Environment

### 3.1 Module-Specific Environment Constraints

FrontX is an npm workspace monorepo (`frontx-monorepo`) structured as:

```
packages/           -- Published @cyberfabric/* packages
  state/            -- L1 SDK: EventBus, Store, createSlice
  screensets/       -- L1 SDK: MFE contracts, registry, Shadow DOM
  api/              -- L1 SDK: REST/SSE protocols, plugin system
  i18n/             -- L1 SDK: 36-language i18n, formatters
  framework/        -- L2: Plugin architecture, layout slices
  react/            -- L3: HAI3Provider, hooks, MFE components
  studio/           -- Dev: Floating overlay with controls
  cli/              -- Tool: Scaffolding CLI
  docs/             -- VitePress documentation site
internal/           -- Non-published internal tooling
src/                -- Demo host application + MFE packages
```

**Build orchestration**: Sequential layer build — SDK (parallel) → framework → react → studio → cli.

**Development**: `npm run dev` generates MFE manifests and color tokens, then starts Vite dev server.

**Architecture checks**: `npm run arch:check`, `arch:deps`, `arch:unused` validate layer boundaries and unused exports.

## 4. Scope

### 4.1 In Scope

- State management — EventBus pub/sub, Redux-backed store with dynamic slice registration, effect system
- MFE runtime — ScreensetsRegistry, extension lifecycle, actions chain mediation, domain management, GTS validation
- API communication — REST and SSE protocols, plugin chain, mock mode, retry with exponential backoff
- Internationalization — 36 languages, RTL support, namespace-based translations, lazy loading, locale-aware formatters
- Plugin architecture — Composable plugins, presets (full, minimal, headless)
- Layout state — 7 domain slices (header, footer, menu, sidebar, screen, popup, overlay), tenant, mock
- React integration — HAI3Provider, typed hooks, MFE hooks
- UI component library — shadcn/ui + Radix UI primitives, variant system, theming
- Developer studio — Runtime overlay with MFE package selector, theme/language/API mode toggles
- CLI tooling — Project scaffolding, screenset generation, migration runners, AI tool sync
- MFE isolation — Blob URL per-runtime isolation, Shadow DOM CSS isolation
- Architecture enforcement — Dependency-cruiser rules, Knip unused export detection
- Screensets workflow — Three-stage SDLC pipeline (draft → mockup → production), screenset copy/promote/delete, Studio screenset selector, shell-as-owned-code, shared MFE package pool with copy-on-write, multi-product screenset support

### 4.2 Out of Scope

- Server-side rendering (SSR) — Client-side SPA architecture only
- Backend/BFF — API layer provides client-side protocols only
- Authentication implementation — Framework provides templates but no auth logic
- Production MFE registry/discovery — No backend catalog; extensions registered at runtime via code
- Cross-MFE shared state — Explicitly rejected; each MFE has isolated store
- Layout rendering components — Generated by CLI into user's project, not in any @cyberfabric package
- WebSocket protocol — Only REST and SSE implemented
- Database schemas — N/A (client-side library)
- Runtime screenset switching in deployed applications
- Remote or cloud-based screenset management (all operations are local filesystem + git)
- Screenset access control or permissions (handled by git branch permissions)
- Collaborative real-time editing of screensets (each PM works independently, collaboration via git)

## 5. Functional Requirements

> **Testing strategy**: All requirements verified via automated tests (unit, integration, e2e) targeting 90%+ code coverage unless otherwise specified. Document verification method only for non-test approaches.

### 5.1 SDK Core

#### Flat SDK Packages

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-flat-packages`

The system MUST provide 4 flat SDK packages (`@cyberfabric/state`, `@cyberfabric/screensets`, `@cyberfabric/api`, `@cyberfabric/i18n`) with ZERO `@cyberfabric/*` inter-dependencies.

**Rationale**: Enables independent consumption and parallel builds. Each package has only external peer dependencies.
**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-build-system`

#### State Package Interface

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-state-interface`

`@cyberfabric/state` MUST export EventBus (singleton + interface), `createStore`, `getStore`, `registerSlice`, `unregisterSlice`, `hasSlice`, `getRegisteredSlices`, `resetStore`, `createSlice`, and types `ReducerPayload`, `EventPayloadMap`, `RootState`, `AppDispatch`, `EffectInitializer`, `FrontXStore`, `SliceObject`, `EventHandler`, `Subscription`.

**Rationale**: Complete state management foundation for event-driven Flux architecture.
**Actors**: `cpt-frontx-actor-developer`

#### FrontX Flux Terminology

- [x] `p2` - **ID**: `cpt-frontx-fr-sdk-flux-terminology`

The system MUST use consistent FrontX Flux terminology: Action (emits events), Event (past-tense message), Effect (subscribes + calls reducers), Reducer (pure state update), Slice (reducers + initial state). The terms "action creator" and "dispatch" MUST NOT appear in public API.

**Rationale**: Avoids confusion with Redux terminology; enforces FrontX event-driven patterns.
**Actors**: `cpt-frontx-actor-developer`

#### Screensets Package

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-screensets-package`

`@cyberfabric/screensets` MUST export `LayoutDomain` enum, MFE type system (`MfeEntry`, `MfeEntryMF`, `Extension`, `ScreenExtension`, `ExtensionDomain`, `SharedProperty`, `Action`, `ActionsChain`), `ScreensetsRegistry`, `MfeHandler`, `MfeBridgeFactory`, and action/property constants. It MUST have ZERO `@cyberfabric/*` dependencies.

**Rationale**: MFE contracts must be consumable without pulling in framework or React.
**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-microfrontend`

#### API Package

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-api-package`

`@cyberfabric/api` MUST export `BaseApiService`, `RestProtocol`, `SseProtocol`, `RestMockPlugin`, `SseMockPlugin`, `MockEventSource`, `ApiPluginBase`, `ApiPlugin`, `ApiProtocol`, `apiRegistry`, and type guards `isShortCircuit`/`isRestShortCircuit`/`isSseShortCircuit`. It MUST have only `axios` as peer dependency.

**Rationale**: Protocol-agnostic API layer with pluggable mock mode.
**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-api-protocol`

#### i18n Package

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-i18n-package`

`@cyberfabric/i18n` MUST export `I18nRegistry`, `Language` enum (36 languages), `TranslationLoader`, `SUPPORTED_LANGUAGES`, `getLanguageMetadata`, `getRTLLanguages`, formatters (`formatDate`, `formatTime`, `formatDateTime`, `formatRelative`, `formatNumber`, `formatPercent`, `formatCompact`, `formatCurrency`, `compareStrings`, `createCollator`), and `TextDirection`/`LanguageDisplayMode` types. It MUST have ZERO dependencies.

**Rationale**: Full i18n foundation with zero-dependency constraint for maximum portability.
**Actors**: `cpt-frontx-actor-developer`

#### Framework Layer

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-framework-layer`

`@cyberfabric/framework` MUST depend only on SDK packages (state, screensets, api, i18n), MUST NOT depend on React, and MUST provide layout domain state types, registries, effect coordination, `createHAI3()` builder, and `createHAI3App()` convenience function.

**Rationale**: Framework wires SDK capabilities into composable plugins without React coupling.
**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

#### Action Pattern

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-action-pattern`

Actions MUST be handwritten pure functions that emit events via `eventBus.emit()`. Actions MUST NOT dispatch directly to Redux. No `createAction` helper MUST be exported from SDK packages. Components MUST NOT use `eventBus` directly.

**Rationale**: Enforces event-driven architecture; prevents direct Redux coupling.
**Actors**: `cpt-frontx-actor-developer`

#### Plugin Architecture

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-plugin-arch`

`@cyberfabric/framework` MUST provide a plugin-based architecture via `createHAI3()` builder with `.use()` and `.build()`. Plugins MUST declare name, optional dependencies, and optional provides. Presets MUST include `full()`, `minimal()`, `headless()`.

**Rationale**: Composable feature set; applications only pay for what they use.
**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

#### React Adapter Layer

- [x] `p2` - **ID**: `cpt-frontx-fr-sdk-react-layer`

`@cyberfabric/react` MUST depend only on `@cyberfabric/framework`, MUST provide `HAI3Provider` and hooks (`useAppDispatch`, `useAppSelector`, `useTranslation`, `useNavigation`, `useTheme`, `useFormatters`), and MUST NOT contain layout components or UI kit dependencies.

**Rationale**: Thin React binding; keeps React-specific code isolated from framework logic.
**Actors**: `cpt-frontx-actor-developer`

#### Layer Dependency Rules

- [x] `p1` - **ID**: `cpt-frontx-fr-sdk-layer-deps`

SDK packages (L1) MUST have ZERO `@cyberfabric/*` deps. Framework (L2) MUST depend only on SDK. React (L3) MUST depend only on Framework. User code MAY import from any layer.

**Rationale**: Enforces clean dependency graph; prevents circular coupling.
**Actors**: `cpt-frontx-actor-build-system`

#### Type-Safe Module Augmentation

- [x] `p2` - **ID**: `cpt-frontx-fr-sdk-module-augmentation`

The system MUST use TypeScript module augmentation for `EventPayloadMap` and `RootState` extensibility. Custom events MUST be type-safe in `eventBus.emit()` and `eventBus.on()`.

**Rationale**: Type safety for cross-package event communication without coupling.
**Actors**: `cpt-frontx-actor-developer`

### 5.2 App Configuration

#### Tenant Type and Events

- [x] `p1` - **ID**: `cpt-frontx-fr-appconfig-tenant`

The system MUST define a `Tenant` type with `{ id: string }`. Tenant state MUST be typed as `Tenant | null`. The system MUST provide tenant change events (`app/tenant/changed`, `app/tenant/cleared`) via event bus, with corresponding action functions (`changeTenant`, `clearTenantAction`, `setTenantLoadingState`).

**Rationale**: Tenant context is the foundation for multi-tenant applications.
**Actors**: `cpt-frontx-actor-host-app`

#### Event-Driven Configuration

- [x] `p1` - **ID**: `cpt-frontx-fr-appconfig-event-api`

The system MUST support event-driven configuration for tenant, language, theme, and navigation. Configuration changes MUST propagate through the event bus, not through direct state mutation.

**Rationale**: Event-driven patterns ensure all listeners (including MFE plugins) receive configuration changes.
**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

#### Router Configuration

- [x] `p1` - **ID**: `cpt-frontx-fr-appconfig-router-config`

The system MUST provide router mode configuration via `FrontXConfig.routerMode` supporting `'browser'` (default), `'hash'`, and `'memory'` types.

**Rationale**: Different deployment environments require different routing strategies.
**Actors**: `cpt-frontx-actor-host-app`

#### Layout Visibility

- [x] `p2` - **ID**: `cpt-frontx-fr-appconfig-layout-visibility`

The system MUST provide layout visibility control for footer, menu, and sidebar via imperative action functions (`setFooterVisible`, `setMenuVisible`, `setSidebarVisible`). Unspecified parts MUST default to visible (footer, menu) or hidden (sidebar).

**Rationale**: Applications need to control which layout regions are visible.
**Actors**: `cpt-frontx-actor-host-app`

### 5.3 SSE Streaming

#### SSE Protocol

- [x] `p1` - **ID**: `cpt-frontx-fr-sse-protocol`

The system MUST provide an `SseProtocol` class that wraps browser `EventSource` API with async `connect()`, `disconnect()`, `cleanup()`, and plugin chain support via `getPluginsInOrder()`.

**Rationale**: Server-Sent Events enable real-time data streaming (chat, notifications).
**Actors**: `cpt-frontx-actor-api-protocol`, `cpt-frontx-actor-developer`

#### Plugin-Based Mock Mode

- [x] `p2` - **ID**: `cpt-frontx-fr-sse-mock-mode`

SSE protocol MUST use plugin composition for mock streaming via `SseMockPlugin`. Mock MUST NOT create real `EventSource` instances. Mock returns `MockEventSource` via plugin short-circuit pattern.

**Rationale**: Development and testing without backend dependencies.
**Actors**: `cpt-frontx-actor-developer`

#### Protocol Registry

- [x] `p1` - **ID**: `cpt-frontx-fr-sse-protocol-registry`

`BaseApiService` MUST use protocol registry pattern. Protocols MUST be registered by constructor name, accessible via type-safe `protocol<T>()` method. `cleanup()` MUST destroy all protocols and plugins.

**Rationale**: Extensible protocol architecture; services can use REST, SSE, or custom protocols.
**Actors**: `cpt-frontx-actor-api-protocol`

#### Type-Safe SSE Events

- [x] `p2` - **ID**: `cpt-frontx-fr-sse-type-safe-events`

SSE-related events MUST be type-safe via `EventPayloadMap` module augmentation.

**Rationale**: Compile-time safety for event-driven SSE integration.
**Actors**: `cpt-frontx-actor-developer`

### 5.4 MFE Type System

#### MFE Entry Types

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-entry-types`

The system MUST define `MfeEntry` (base with id, requiredProperties, actions, domainActions), `MfeEntryMF` (extends with manifest, exposedModule), `Extension` (id, domain, entry), `ScreenExtension` (extends with presentation: label, route, optional icon/order). All types MUST have an `id: string` field.

**Rationale**: Type contracts for MFE communication between host and extensions.
**Actors**: `cpt-frontx-actor-microfrontend`, `cpt-frontx-actor-developer`

#### Extension Domain

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-ext-domain`

`ExtensionDomain` MUST have id, sharedProperties, actions, extensionsActions, defaultActionTimeout (required number), lifecycleStages (required), extensionsLifecycleStages (required). It MAY have extensionsTypeId.

**Rationale**: Defines the communication contract between host app and MFE extensions.
**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-microfrontend`

#### Shared Property Type

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-shared-property`

`SharedProperty` MUST have `id: string` and `value: unknown`. Shared property constants MUST be GTS type IDs.

**Rationale**: Type-safe shared property broadcasting with schema validation.
**Actors**: `cpt-frontx-actor-microfrontend`

#### Action and Actions Chain Types

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-action-types`

`Action` MUST have type (string), target (string), optional payload and timeout. `ActionsChain` MUST contain action, optional next and fallback (recursive). Neither MUST have an id field.

**Rationale**: Chain-based action execution with fallback support for resilient MFE communication.
**Actors**: `cpt-frontx-actor-microfrontend`

### 5.5 MFE Core

#### Dynamic Registration

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-dynamic-registration`

The system MUST support dynamic registration of MFE extensions and domains at runtime; there MUST NOT be static configuration.

**Rationale**: Extensions are loaded on-demand; the set of available extensions is not known at build time.
**Actors**: `cpt-frontx-actor-host-app`

#### Theme Propagation via Plugin

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-theme-propagation`

The `themes()` plugin MUST call `screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, themeId)` in its `theme/changed` event handler, wrapped in try/catch.

**Rationale**: Theme changes must propagate to all MFE extensions. Owned by themes plugin, not microfrontends.
**Actors**: `cpt-frontx-actor-framework-plugin`

#### Language Propagation via Plugin

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-i18n-propagation`

The `i18n()` plugin MUST call `screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, language)` in its `i18n/language/changed` event handler, wrapped in try/catch.

**Rationale**: Language changes must propagate to all MFE extensions. Owned by i18n plugin, not microfrontends.
**Actors**: `cpt-frontx-actor-framework-plugin`

### 5.6 MFE Blob URL Isolation

#### Fresh Module Evaluation

- [x] `p1` - **ID**: `cpt-frontx-fr-blob-fresh-eval`

`MfeHandlerMF` MUST use Blob URLs to produce a fresh ES module evaluation per MFE load. `Object.is(mfeA_React, mfeB_React)` MUST be `false`.

**Rationale**: Prevents cross-MFE state leakage (React fiber trees, hooks, Redux stores).
**Actors**: `cpt-frontx-actor-microfrontend`

#### No Blob URL Revocation

- [x] `p2` - **ID**: `cpt-frontx-fr-blob-no-revoke`

The handler MUST NOT call `URL.revokeObjectURL()` after `import()` resolves; blob URLs MUST remain valid for the page lifetime.

**Rationale**: Modules with top-level `await` continue evaluating after `import()` resolves.
**Actors**: `cpt-frontx-actor-microfrontend`

#### Source Text Cache

- [x] `p1` - **ID**: `cpt-frontx-fr-blob-source-cache`

`MfeHandlerMF` MUST maintain an in-memory cache of fetched source text strings, keyed by absolute chunk URL. At most ONE network fetch MUST occur per chunk URL across all MFE loads.

**Rationale**: Prevents redundant network requests when multiple MFEs share the same dependency version.
**Actors**: `cpt-frontx-actor-microfrontend`

#### Import Rewriting

- [x] `p1` - **ID**: `cpt-frontx-fr-blob-import-rewriting`

`MfeHandlerMF` MUST rewrite ALL relative imports to absolute URLs using the remoteEntry base URL.

**Rationale**: Blob-evaluated modules cannot resolve relative imports.
**Actors**: `cpt-frontx-actor-microfrontend`

#### Recursive Blob Chain

- [x] `p1` - **ID**: `cpt-frontx-fr-blob-recursive-chain`

`MfeHandlerMF` MUST use `createBlobUrlChain` to recursively create blob URLs for a chunk and all its static dependencies, building a chain of isolated modules.

**Rationale**: Ensures the entire dependency tree gets fresh per-load evaluations.
**Actors**: `cpt-frontx-actor-microfrontend`

#### Per-Load Blob Map

- [x] `p2` - **ID**: `cpt-frontx-fr-blob-per-load-map`

The `blobUrlMap` MUST be scoped to a single load; different MFE loads MUST have independent `blobUrlMap` instances.

**Rationale**: Prevents cross-load blob URL reuse which would break isolation.
**Actors**: `cpt-frontx-actor-microfrontend`

### 5.7 MFE Externalize Plugin

#### Transform All Imports

- [x] `p1` - **ID**: `cpt-frontx-fr-externalize-transform`

A custom Vite plugin (`hai3-mfe-externalize`) MUST transform ALL `import` statements for shared dependencies into `importShared()` calls across the entire MFE bundle, not just expose entry files.

**Rationale**: Federation plugin only transforms expose entries; code-split chunks need the same treatment.
**Actors**: `cpt-frontx-actor-build-system`

#### Deterministic Filenames

- [x] `p1` - **ID**: `cpt-frontx-fr-externalize-filenames`

The plugin MUST configure shared dependency chunks to use deterministic filenames without content hashes.

**Rationale**: Stable `chunkPath` values in MFE manifests across rebuilds.
**Actors**: `cpt-frontx-actor-build-system`

#### Build-Only Operation

- [x] `p2` - **ID**: `cpt-frontx-fr-externalize-build-only`

The plugin MUST operate at build time only (`vite build`); it MUST NOT transform imports during `vite dev`.

**Rationale**: Dev server should not be affected by MFE externalization.
**Actors**: `cpt-frontx-actor-build-system`

### 5.8 MFE Internal Dataflow

#### Isolated MFE App

- [x] `p1` - **ID**: `cpt-frontx-fr-dataflow-internal-app`

Each MFE package MUST create a minimal HAI3App via `createHAI3().use(effects()).use(mock()).build()` and use `HAI3Provider` to provide store context.

**Rationale**: MFEs need isolated Redux store via FrontX framework, not direct Redux access.
**Actors**: `cpt-frontx-actor-microfrontend`

#### No Direct Redux Imports

- [x] `p1` - **ID**: `cpt-frontx-fr-dataflow-no-redux`

MFE packages MUST NOT import from `react-redux`, `redux`, or `@reduxjs/toolkit` directly. All store access MUST go through `@cyberfabric/react` APIs.

**Rationale**: Direct Redux imports bypass blob URL isolation and break store independence.
**Actors**: `cpt-frontx-actor-microfrontend`

### 5.9 MFE Share Scope Management

#### Share Scope Construction

- [x] `p1` - **ID**: `cpt-frontx-fr-sharescope-construction`

`MfeHandlerMF` MUST construct a `shareScope` from `manifest.sharedDependencies` and write it to `globalThis.__federation_shared__` via `writeShareScope()`. For dependencies with `chunkPath`, the handler MUST create blob-URL-based `get()` closures.

**Rationale**: The shareScope bridges the federation runtime's `importShared()` and blob URL isolation.
**Actors**: `cpt-frontx-actor-microfrontend`

#### Concurrent Load Safety

- [x] `p2` - **ID**: `cpt-frontx-fr-sharescope-concurrent`

When multiple MFEs are loaded concurrently, each load's `get()` closures MUST capture their own `LoadBlobState` instance. At most ONE network fetch MUST occur per chunk URL.

**Rationale**: Concurrent loads must not interfere with each other.
**Actors**: `cpt-frontx-actor-microfrontend`

### 5.10 Shared Property Broadcast

#### Write API

- [x] `p1` - **ID**: `cpt-frontx-fr-broadcast-write-api`

`ScreensetsRegistry` MUST provide `updateSharedProperty(propertyId, value)` as the sole write method. `updateDomainProperty()` and `updateDomainProperties()` MUST NOT exist.

**Rationale**: Shared properties have global semantics — one value across all declaring domains.
**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

#### Domain-Targeted Propagation

- [x] `p1` - **ID**: `cpt-frontx-fr-broadcast-matching`

When `updateSharedProperty(propertyId, value)` is called, the system MUST validate the value, store it, and propagate to all domains whose `sharedProperties` array includes `propertyId`. Domains that do NOT include the property MUST NOT receive the update.

**Rationale**: Targeted broadcast; only interested domains receive updates.
**Actors**: `cpt-frontx-actor-host-app`

#### Validate Before Propagate

- [x] `p1` - **ID**: `cpt-frontx-fr-broadcast-validate`

GTS validation MUST occur before propagation. If validation fails, the property value MUST NOT be stored or propagated to any domain.

**Rationale**: Invalid values must never reach MFE domains.
**Actors**: `cpt-frontx-actor-gts-plugin`

### 5.11 Shared Property Validation

#### GTS Validation Pattern

- [x] `p1` - **ID**: `cpt-frontx-fr-validation-gts`

The system MUST validate shared property values using `typeSystem.register({ id: ephemeralId, value })` followed by `typeSystem.validateInstance(ephemeralId)`, where `ephemeralId = "${propertyTypeId}hai3.mfes.comm.runtime.v1"`.

**Rationale**: Reuses existing GTS register+validate pattern.
**Actors**: `cpt-frontx-actor-gts-plugin`

#### Reject Invalid Values

- [x] `p1` - **ID**: `cpt-frontx-fr-validation-reject`

When validation fails, `updateSharedProperty()` MUST throw an error containing validation failure details. The property value MUST NOT be stored or propagated.

**Rationale**: Invalid values must be rejected with clear diagnostics.
**Actors**: `cpt-frontx-actor-gts-plugin`

### 5.12 i18n Formatters

#### Locale-Aware Formatters

- [x] `p1` - **ID**: `cpt-frontx-fr-i18n-formatters`

The system MUST provide locale-aware formatters: `formatDate`, `formatTime`, `formatDateTime`, `formatRelative` (using `Intl.DateTimeFormat`/`Intl.RelativeTimeFormat`), `formatNumber`, `formatPercent`, `formatCompact` (using `Intl.NumberFormat`), `formatCurrency` (using `Intl.NumberFormat` style currency), and `compareStrings`/`createCollator` (using `Intl.Collator`). All MUST use `i18nRegistry.getLanguage()` as locale source, falling back to English.

**Rationale**: Locale-specific formatting is essential for international applications.
**Actors**: `cpt-frontx-actor-developer`

#### Formatter Exports

- [x] `p1` - **ID**: `cpt-frontx-fr-i18n-formatter-exports`

All formatters MUST be exported from `@cyberfabric/i18n`, re-exported from `@cyberfabric/framework`, and accessible via `useFormatters()` hook from `@cyberfabric/react`.

**Rationale**: Single import surface across all layers.
**Actors**: `cpt-frontx-actor-developer`

#### Graceful Invalid Input

- [x] `p2` - **ID**: `cpt-frontx-fr-i18n-graceful-invalid`

All formatters MUST return `''` for null, undefined, or invalid inputs and MUST NOT throw.

**Rationale**: Prevents runtime crashes from formatting operations.
**Actors**: `cpt-frontx-actor-runtime`

### 5.13 i18n Loading

#### Hybrid Namespace Support

- [x] `p1` - **ID**: `cpt-frontx-fr-i18n-hybrid-namespace`

The system MUST support two-tier translation namespaces: `screenset.<id>` for shared content and `screen.<screensetId>.<screenId>` for screen-specific content.

**Rationale**: Enables colocated, lazy-loaded screen translations while sharing common keys.
**Actors**: `cpt-frontx-actor-screenset-author`

#### Lazy Screen Translations

- [x] `p1` - **ID**: `cpt-frontx-fr-i18n-lazy-chunks`

Screen translations MUST load on-demand when the screen is lazy-loaded, NOT upfront with the application. Loaded translations MUST be cached.

**Rationale**: Reduces initial bundle and network cost.
**Actors**: `cpt-frontx-actor-runtime`

### 5.14 Studio

#### Floating Panel

- [x] `p1` - **ID**: `cpt-frontx-fr-studio-panel`

The system MUST provide a `StudioPanel` component rendering as a floating overlay with fixed positioning, glassmorphic styling, visible only in dev mode. Users MUST be able to drag, resize, and collapse the panel. All positions and state MUST persist to localStorage.

**Rationale**: Dev-only inspection and configuration tool.
**Actors**: `cpt-frontx-actor-studio-user`

#### Studio Controls

- [x] `p1` - **ID**: `cpt-frontx-fr-studio-controls`

StudioPanel MUST provide: theme selector dropdown, MFE package selector, language selector with native script display, and mock/real API toggle.

**Rationale**: Runtime configuration switching during development.
**Actors**: `cpt-frontx-actor-studio-user`

#### Settings Persistence

- [x] `p1` - **ID**: `cpt-frontx-fr-studio-persistence`

The system MUST persist theme, language, mock API state, and GTS package selection to localStorage on change. On Studio mount, MUST restore all persisted settings. ALL persistence logic MUST live in `@cyberfabric/studio` only.

**Rationale**: Session continuity across page reloads.
**Actors**: `cpt-frontx-actor-studio-user`

#### Viewport Positioning

- [x] `p1` - **ID**: `cpt-frontx-fr-studio-viewport`

The system MUST clamp Studio button and panel positions to the current viewport on load and window resize, maintaining a 20px margin from edges.

**Rationale**: Prevents off-screen elements after display changes.
**Actors**: `cpt-frontx-actor-studio-user`

#### Package Independence

- [x] `p1` - **ID**: `cpt-frontx-fr-studio-independence`

`@cyberfabric/studio` MUST be a standalone workspace package, `"sideEffects": false`, tree-shakeable, excluded from production builds via `import.meta.env.DEV` conditional.

**Rationale**: Zero production footprint.
**Actors**: `cpt-frontx-actor-build-system`

### 5.15 CLI

#### Package Structure

- [x] `p1` - **ID**: `cpt-frontx-fr-cli-package`

The CLI MUST be implemented as workspace package `@cyberfabric/cli` with binary `frontx`, supporting ESM (Node.js 18+) and programmatic API.

**Rationale**: Standard npm CLI distribution.
**Actors**: `cpt-frontx-actor-cli`

#### Core Commands

- [x] `p1` - **ID**: `cpt-frontx-fr-cli-commands`

The CLI MUST provide: `frontx create <project>` (scaffold new project), `frontx update` (update packages/templates), `frontx scaffold layout` (generate layout), `frontx scaffold screenset <name>` (generate screenset), `frontx validate components` (validate structure), `frontx ai sync` (sync AI tool configs), `frontx migrate [version]` (run code migrations).

**Rationale**: Complete developer workflow from project creation through maintenance.
**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-cli`

#### Template System

- [x] `p1` - **ID**: `cpt-frontx-fr-cli-templates`

The CLI MUST use a template system with `copy-templates.ts` build script, manifest.json, and screenset templates. Templates MUST be user-owned (not locked in node_modules).

**Rationale**: Consistent scaffolding with full user control over generated code.
**Actors**: `cpt-frontx-actor-cli`

#### AI Skills Assembly

- [x] `p1` - **ID**: `cpt-frontx-fr-cli-skills`

The CLI build MUST generate IDE guidance files and command adapters for supported tools: `CLAUDE.md`, `.cursor/rules/`, `.windsurf/rules/`, `.claude/commands/`, `.cursor/commands/`, `.windsurf/workflows/`, and `.github/copilot-commands/`.

**Rationale**: Distributes AI assistant integrations with every scaffolded project.
**Actors**: `cpt-frontx-actor-cli`

#### E2E Scaffold Verification

- [x] `p1` - **ID**: `cpt-frontx-fr-cli-e2e-verification`

The repository MUST run a dedicated required GitHub Actions PR workflow (`cli-pr-e2e`) that verifies the freshly scaffolded default app is installable, buildable, and type-check clean on Node 24.14.x. A separate non-required nightly workflow MUST cover broader CLI scenarios (custom UIKit, layer scaffolds, migrate commands, invalid-name rejection, ai sync idempotency). Both workflows MUST persist step-level logs as CI artifacts.

**Rationale**: The generated project is the primary CLI deliverable; a green CLI package build alone does not prove the scaffold path works end-to-end.
**Actors**: `cpt-frontx-actor-build-system`, `cpt-frontx-actor-cli`

### 5.16 Publishing

#### NPM Metadata

- [x] `p1` - **ID**: `cpt-frontx-fr-pub-metadata`

All `@cyberfabric/*` packages MUST include complete NPM metadata: author, license (Apache-2.0), repository, bugs, homepage, keywords, engines (>=18), sideEffects, publishConfig, files, exports.

**Rationale**: NPM publishing readiness and discoverability.
**Actors**: `cpt-frontx-actor-build-system`

#### Aligned Versions

- [x] `p1` - **ID**: `cpt-frontx-fr-pub-versions`

All `@cyberfabric/*` packages MUST use aligned versions (same version number).

**Rationale**: Dependency coherence across the monorepo.
**Actors**: `cpt-frontx-actor-build-system`

#### ESM-First Module Format

- [x] `p1` - **ID**: `cpt-frontx-fr-pub-esm`

All packages MUST use ESM-first module format with `"type": "module"`, dual exports (ESM + CJS), and TypeScript declarations.

**Rationale**: Modern module compatibility with fallback for CJS consumers.
**Actors**: `cpt-frontx-actor-build-system`

#### Automated CI Publishing

- [x] `p1` - **ID**: `cpt-frontx-fr-pub-ci`

When a PR merged to `main` contains version changes, CI MUST automatically publish affected packages to NPM in layer dependency order. The workflow MUST verify version does NOT already exist on NPM before publishing. If any publish fails, the workflow MUST stop immediately.

**Rationale**: Automated release pipeline with safety checks.
**Actors**: `cpt-frontx-actor-ci-cd`

### 5.17 Mock Mode

#### Mock Mode Toggle

- [x] `p2` - **ID**: `cpt-frontx-fr-mock-toggle`

The system MUST provide a `toggleMockMode` action via `mock()` plugin that activates/deactivates all registered mock plugins across all API services. Studio's API mode toggle MUST use this action.

**Rationale**: Centralized mock mode control enables developers and studio users to switch between real and mock API responses without restarting the application.
**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-studio-user`

### 5.18 Microfrontend Plugin

#### MFE Lifecycle Plugin

- [x] `p1` - **ID**: `cpt-frontx-fr-mfe-plugin`

The system MUST provide a `microfrontends()` framework plugin with actions (`loadExtension`, `mountExtension`, `unmountExtension`, `registerExtension`, `unregisterExtension`) and domain constants (`HAI3_SCREEN_DOMAIN`, `FrontX_SIDEBAR_DOMAIN`, `FrontX_POPUP_DOMAIN`, `FrontX_OVERLAY_DOMAIN`). The plugin MUST orchestrate MFE loading via blob URL isolation, propagate theme and i18n changes to mounted extensions, and bridge shared properties between host and MFE.

**Rationale**: Core orchestration plugin that integrates MFE lifecycle management, theme/i18n propagation, and shared property bridging into the framework's plugin chain.
**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-framework-plugin`

### 5.19 Screensets Workflow

#### Screenset Definition

- [ ] `p1` - **ID**: `cpt-frontx-fr-screenset-definition`

The system MUST define a screenset as a complete UI console comprising: a host application shell (owned code) and a set of MFE package references. Each screenset MUST have a stage (`draft`, `mockup`, `production`) and descriptive metadata. Each screenset MUST be an independent, self-contained unit that can be created, copied, modified, promoted, and deleted without affecting other screensets.

**Rationale**: The screenset is the atomic unit of the three-stage SDLC pipeline. Without a clear definition, tooling cannot manage the lifecycle.
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-product-manager`

#### Shell Ownership and Customizability

- [ ] `p1` - **ID**: `cpt-frontx-fr-shell-ownership`

Each screenset's shell MUST be owned imperative code — freely modifiable by PMs, designers, developers, and AI agents without restrictions from a configuration schema or abstraction layer. Shell code MUST be copied on screenset creation, and modifications to one screenset's shell MUST NOT affect any other screenset. The system MUST NOT constrain what a screenset's shell can contain or how it renders its host layout.

**Rationale**: PMs need unrestricted flexibility to customize the host application (add search bars, multi-level navigation, tenant hierarchy navigation, etc.) using AI tools. A configuration-based approach would limit this to predefined parameters.
**Actors**: `cpt-frontx-actor-product-manager`, `cpt-frontx-actor-ai-agent`, `cpt-frontx-actor-ux-designer`

#### Shared MFE Packages

- [ ] `p1` - **ID**: `cpt-frontx-fr-shared-packages`

MFE packages MUST be shareable across screensets. Multiple screensets — including screensets for different products — MUST be able to reference the same MFE package. A single MFE package MUST be able to provide functionality to multiple screensets simultaneously.

**Rationale**: Companies running multiple frontend products (e.g., partner back-office + customer console) need to share common MFE packages (e.g., usage dashboard) across products without duplication.
**Actors**: `cpt-frontx-actor-product-manager`, `cpt-frontx-actor-developer`

#### Package Modification Isolation

- [ ] `p1` - **ID**: `cpt-frontx-fr-package-isolation`

When a screenset needs to modify a shared MFE package, the modification MUST NOT affect other screensets that reference the same package. The system MUST ensure that each screenset can independently evolve its packages while unmodified packages remain shared.

**Rationale**: PMs create many draft variants simultaneously. A modification in one draft must not break production or another PM's draft.
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-product-manager`

#### Screenset Creation

- [ ] `p1` - **ID**: `cpt-frontx-fr-screenset-creation`

The system MUST allow creating new screensets by duplicating any existing screenset or from a template. The project scaffolding command MUST create an initial production screenset. All screenset operations MUST be available as standalone CLI commands that work without AI tooling.

**Rationale**: Fast creation is the foundation of the prototyping workflow. CLI is the foundation — AI agents and Studio are layers on top that use CLI operations.
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-product-manager`

#### Screenset Stages

- [ ] `p1` - **ID**: `cpt-frontx-fr-stage-transitions`

Each screenset MUST have a stage (`draft`, `mockup`, `production`) that can be changed freely. The recommended SDLC flow is draft → mockup → production, but the system MUST allow any stage transition. Stages are categories that signal intent (prototyping, design refinement, production-ready) — they do not enforce technical constraints or deployment behavior.

**Rationale**: The three stages provide a shared vocabulary for the SDLC pipeline. PMs prototype in drafts, designers refine in mockups, developers harden in production. Teams may iterate between stages as needed (e.g., designer passes a mockup back to PM for rework).
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-ux-designer`, `cpt-frontx-actor-developer`

#### Screenset Deletion and Cleanup

- [ ] `p1` - **ID**: `cpt-frontx-fr-screenset-deletion`

The system MUST allow deleting screensets. The system SHOULD detect and offer cleanup of resources that become orphaned after deletion (e.g., MFE packages no longer referenced by any screenset).

**Rationale**: PMs create many draft variants and need to clean up rejected ones without leaving orphaned resources.
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-product-manager`

#### Screenset Discovery and Listing

- [ ] `p1` - **ID**: `cpt-frontx-fr-screenset-listing`

The system MUST allow listing all screensets in a project with their name, stage, author, and package count. The listing MUST support grouping or sorting by stage.

**Rationale**: Developers and PMs need visibility into all screensets to understand the current state of the SDLC pipeline.
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-product-manager`, `cpt-frontx-actor-developer`

#### Active Screenset Selection

- [ ] `p1` - **ID**: `cpt-frontx-fr-screenset-activation`

The system MUST allow selecting which screenset is active for the dev server. The dev server MUST serve only the active screenset's shell and referenced MFE packages. Non-active screensets MUST NOT affect dev server performance. The active screenset selection MUST persist across dev server restarts. If no screenset is explicitly activated, the system MUST default to a production screenset.

**Rationale**: The dev server serves one screenset at a time. PMs switch between screensets for comparison. Persistence avoids re-activation after every restart.
**Actors**: `cpt-frontx-actor-cli`, `cpt-frontx-actor-dev-server`

#### Studio Screenset Selector

- [ ] `p1` - **ID**: `cpt-frontx-fr-studio-screenset-selector`

Studio MUST provide a screenset selector as the top-level navigation control. The selector MUST display all screensets grouped by stage (production, mockup, draft). Selecting a screenset MUST switch the active screenset for preview. Studio MUST display the active screenset's metadata (name, stage, author).

**Rationale**: The screenset selector is the PM's primary tool for comparing variants during local development. The screenset is the top-level organizational unit.
**Actors**: `cpt-frontx-actor-studio-user`, `cpt-frontx-actor-product-manager`, `cpt-frontx-actor-ux-designer`

#### AI Agent Integration

- [ ] `p1` - **ID**: `cpt-frontx-fr-ai-agent-integration`

The system MUST provide FrontX-specific AI skills and workflows that enable AI agents to create screensets, modify shell code, and manage MFE packages within screensets. Each screenset MUST include machine-readable context (guidelines, structure descriptions) that AI agents can consume to understand the screenset's structure and conventions.

**Rationale**: AI tooling is the primary mechanism for PMs and designers to modify shell code. Without dedicated skills and context, AI agents would lack the domain knowledge to operate on screensets effectively.
**Actors**: `cpt-frontx-actor-ai-agent`, `cpt-frontx-actor-product-manager`

#### Production Build Isolation

- [ ] `p1` - **ID**: `cpt-frontx-fr-screenset-build-isolation`

The production build MUST include only the production screenset(s) and their referenced MFE packages. Draft and mockup screensets MUST NOT appear in production build artifacts or affect production build performance.

**Rationale**: Draft and mockup screensets are development artifacts. They must not slow down or bloat production deployments.
**Actors**: `cpt-frontx-actor-build-system`, `cpt-frontx-actor-developer`

#### Multi-Product Support

- [ ] `p1` - **ID**: `cpt-frontx-fr-multi-product`

A single FrontX project MUST support multiple independent production screensets representing different products (e.g., partner back-office and customer console). Each production screenset MUST be independently deployable. Each production screenset MUST be able to have its own draft and mockup variants progressing through the SDLC pipeline independently.

**Rationale**: Companies often build multiple frontend products from a single codebase, sharing infrastructure and MFE packages while maintaining independent release cycles.
**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-product-manager`

## 6. Non-Functional Requirements

### 6.1 NFR Inclusions

#### Lazy Loading Performance

- [x] `p1` - **ID**: `cpt-frontx-nfr-perf-lazy-loading`

All screen extensions MUST be lazy-loaded via dynamic `import()`. MFE bundles MUST be fetched on-demand when `HAI3_ACTION_LOAD_EXT` is executed.

**Threshold**: Screen load time < 400ms on 4G connection.
**Rationale**: Initial bundle must not include all screens; on-demand loading reduces time-to-interactive.

#### Tree-Shakeability

- [x] `p1` - **ID**: `cpt-frontx-nfr-perf-treeshake`

All published packages MUST be tree-shakeable. `sideEffects` field MUST be declared in `package.json`. Studio MUST be tree-shaken in production via `import.meta.env.DEV` conditional.

**Threshold**: Production bundle < 180KB for a minimal app (framework + one screenset).
**Rationale**: Unused code must not be included in production bundles.

#### Blob URL Overhead

- [x] `p2` - **ID**: `cpt-frontx-nfr-perf-blob-overhead`

Blob URL creation for MFE isolation MUST add no more than ~1-5ms per shared dependency per MFE load. Source text MUST be cached in-memory after first fetch.

**Threshold**: < 5ms per dependency; < 50ms total for typical MFE with 10 shared deps.
**Rationale**: Isolation overhead must be imperceptible to users.

#### Action Chain Timeout

- [x] `p2` - **ID**: `cpt-frontx-nfr-perf-action-timeout`

All MFE action chain executions MUST have a timeout. Default chain timeout MUST be 120,000ms.

**Threshold**: Chain completes within 2 minutes or fails with timeout error.
**Rationale**: Prevents indefinitely hanging MFE operations.

#### MFE Error Handling

- [x] `p1` - **ID**: `cpt-frontx-nfr-rel-error-handling`

All async MFE operations MUST use try/catch with typed error classes. MFE loading MUST support configurable retry with exponential backoff (default: 2 retries, 1000ms initial delay).

**Threshold**: Max 3 attempts before failure; exponential delay prevents thundering herd.
**Rationale**: Resilient MFE loading; transient failures should not crash the application.

#### API Retry Safety

- [x] `p2` - **ID**: `cpt-frontx-nfr-rel-api-retry`

API plugin retry MUST enforce `maxRetryDepth` (default: 10) to prevent infinite retry loops.

**Threshold**: Maximum 10 retry attempts per request.
**Rationale**: Prevents infinite retry loops from cascading failures.

#### MFE Operation Serialization

- [x] `p1` - **ID**: `cpt-frontx-nfr-rel-serialization`

Concurrent MFE lifecycle operations on the same domain MUST be serialized to prevent state corruption.

**Threshold**: No concurrent load/mount/unmount operations on the same domain.
**Rationale**: Prevents race conditions in extension lifecycle management.

#### Shadow DOM CSS Isolation

- [x] `p1` - **ID**: `cpt-frontx-nfr-sec-shadow-dom`

Each MFE extension MUST render inside a Shadow DOM with `all: initial` host reset for CSS isolation. Shadow roots MUST default to `mode: 'open'`.

**Threshold**: Zero CSS leakage between MFE extensions and host.
**Rationale**: Style isolation prevents visual corruption across boundaries.

#### CSP Blob URL Requirement

- [x] `p1` - **ID**: `cpt-frontx-nfr-sec-csp-blob`

Content Security Policy MUST include `blob:` in `script-src` directive. MFE loading MUST fail explicitly if blob URLs are blocked by CSP.

**Threshold**: Clear error message on CSP violation.
**Rationale**: Deployment environments must be aware of CSP requirements.

#### GTS Type Validation

- [x] `p1` - **ID**: `cpt-frontx-nfr-sec-type-validation`

All MFE action chains MUST pass GTS type system validation before execution.

**Threshold**: Invalid actions rejected with validation error details.
**Rationale**: Prevents malformed data from reaching MFE extensions.

#### Node.js Compatibility

- [x] `p1` - **ID**: `cpt-frontx-nfr-compat-node`

Development environment MUST require Node.js >= 22.0.0, npm >= 10.0.0. Published packages MUST support Node.js >= 18.0.0.

**Threshold**: All packages pass CI on Node 18 and Node 22.
**Rationale**: LTS compatibility for consumers; latest for development.

#### TypeScript Strict Mode

- [x] `p1` - **ID**: `cpt-frontx-nfr-compat-typescript`

TypeScript strict mode MUST be enabled with ALL strict sub-flags. No `any`, no `as unknown as` casts in published code.

**Threshold**: Zero TypeScript strict violations in CI.
**Rationale**: Maximum type safety across the codebase.

#### ESM-First Module Format

- [x] `p1` - **ID**: `cpt-frontx-nfr-compat-esm`

All packages MUST use ESM-first with dual CJS output. `"type": "module"` in all `package.json` files.

**Threshold**: Both `import` and `require` paths resolve correctly.
**Rationale**: Modern module ecosystem compatibility.

#### React 19 Compatibility

- [x] `p1` - **ID**: `cpt-frontx-nfr-compat-react`

React >= 19.2.4, React DOM >= 19.2.4. React Redux >= 8.0.0.

**Threshold**: All hooks and components work with React 19 concurrent features.
**Rationale**: Latest React with ref-as-prop pattern.

#### Zero Cross-Deps at L1

- [x] `p1` - **ID**: `cpt-frontx-nfr-maint-zero-crossdeps`

SDK Layer (L1) packages MUST have ZERO `@cyberfabric/*` dependencies and ZERO React dependencies. Enforced by dependency-cruiser rules.

**Threshold**: `npm run arch:deps:sdk` passes with zero violations.
**Rationale**: SDK packages must be independently consumable.

#### Event-Driven Communication Only

- [x] `p1` - **ID**: `cpt-frontx-nfr-maint-event-driven`

All cross-domain communication MUST use the event bus. No direct slice dispatch from components. No manual state sync or prop drilling.

**Threshold**: Zero direct `dispatch` calls in component files; zero cross-package event bus imports in components.
**Rationale**: Consistent event-driven architecture throughout.

#### Architecture Enforcement

- [x] `p2` - **ID**: `cpt-frontx-nfr-maint-arch-enforcement`

Architecture MUST be verifiable via `npm run arch:check`, `arch:deps`, and `arch:unused`. Dependency-cruiser and Knip MUST enforce layer boundaries and detect unused exports.

**Threshold**: All architecture checks pass in CI.
**Rationale**: Prevents architectural drift over time.

#### Screenset Operations Performance

- [ ] `p1` - **ID**: `cpt-frontx-nfr-screenset-ops-perf`

Screenset creation (copy or from template) MUST complete in under 2 seconds for a screenset containing up to 50 shell files and 20 package references. Screenset stage changes MUST complete in under 2 seconds, excluding any interactive prompts.

**Threshold**: < 2 seconds per operation on local SSD storage.
**Rationale**: Fast creation and promotion are critical for the prototyping workflow. These operations must feel instant to PMs.

#### Screenset Scalability

- [ ] `p2` - **ID**: `cpt-frontx-nfr-screenset-scalability`

The system MUST support 20+ concurrent screensets in a single project with minimal degradation to dev server startup time, page reload time, or git operations.

**Threshold**: Dev server startup within 10% of single-screenset baseline; git status < 1 second; page reload < 3 seconds.
**Rationale**: PMs creating many variants and multiple PMs working in parallel can produce a large number of concurrent screensets.

#### Zero Production Build Overhead from Screensets

- [ ] `p1` - **ID**: `cpt-frontx-nfr-screenset-build-isolation`

Non-production screensets MUST NOT be included in the production build's module graph. Production build time MUST have 0% overhead compared to a project with a single screenset.

**Threshold**: Production build time within 1% of single-screenset baseline.
**Rationale**: Draft and mockup screensets are development artifacts that must not slow down or bloat production deployments.

### 6.2 NFR Exclusions

- **Accessibility** (UX-PRD-002): Not applicable at framework level — accessibility is the responsibility of application/screenset UI components and application-level code. Local UI may use Radix UI primitives for accessibility foundations.
- **Safety** (SAFE-PRD-001/002): Not applicable — FrontX is a client-side UI framework with no physical interaction, medical, or vehicle control capabilities.
- **Regulatory Compliance** (COMPL-PRD-001/002/003): Not applicable — FrontX does not process PII, financial data, or healthcare data. Applications built with FrontX may have compliance requirements, but those are application-level concerns.
- **Internationalization** (UX-PRD-003): Addressed as functional requirement `cpt-frontx-fr-sdk-i18n-package` — FrontX provides the i18n infrastructure; application-level translation content is out of scope.
- **Offline Capability** (UX-PRD-004): Not applicable — FrontX is designed for always-connected SPA environments.
- **Availability/Recovery** (REL-PRD-001/002): Not applicable — FrontX is a client-side library, not a hosted service. Availability and recovery are deployment-level concerns.

## 7. Public Library Interfaces

### 7.1 Public API Surface

#### @cyberfabric/state

- [x] `p1` - **ID**: `cpt-frontx-interface-state`

**Type**: TypeScript ES module
**Stability**: stable
**Description**: Event-driven state management with EventBus pub/sub, Redux-backed store, dynamic slice registration, and type-safe module augmentation.
**Breaking Change Policy**: Major version bump required.

#### @cyberfabric/screensets

- [x] `p1` - **ID**: `cpt-frontx-interface-screensets`

**Type**: TypeScript ES module
**Stability**: stable
**Description**: MFE type system, ScreensetsRegistry, MfeHandler, MfeBridge, Shadow DOM utilities, GTS validation plugin, action/property constants.
**Breaking Change Policy**: Major version bump required.

#### @cyberfabric/api

- [x] `p1` - **ID**: `cpt-frontx-interface-api`

**Type**: TypeScript ES module
**Stability**: stable
**Description**: Protocol-agnostic API layer with REST and SSE protocols, plugin chain, mock mode, type guards.
**Breaking Change Policy**: Major version bump required.

#### @cyberfabric/i18n

- [x] `p1` - **ID**: `cpt-frontx-interface-i18n`

**Type**: TypeScript ES module
**Stability**: stable
**Description**: 36-language i18n registry, locale-aware formatters (date, number, currency, collation), RTL support, language metadata.
**Breaking Change Policy**: Major version bump required.

#### @cyberfabric/framework

- [x] `p1` - **ID**: `cpt-frontx-interface-framework`

**Type**: TypeScript ES module
**Stability**: stable
**Description**: Plugin architecture with `createHAI3()` builder, presets, layout domain slices, effect coordination, re-exports all L1 APIs.
**Breaking Change Policy**: Major version bump required.

#### @cyberfabric/react

- [x] `p1` - **ID**: `cpt-frontx-interface-react`

**Type**: TypeScript ES module (React 19+)
**Stability**: stable
**Description**: HAI3Provider, typed hooks, MFE hooks, ExtensionDomainSlot, RefContainerProvider, re-exports all L2 APIs.
**Breaking Change Policy**: Major version bump required.

#### @cyberfabric/studio

- [x] `p2` - **ID**: `cpt-frontx-interface-studio`

**Type**: TypeScript ES module (React 19+)
**Stability**: experimental
**Description**: Dev-only floating overlay with MFE package selector, theme/language/mock controls, persistence, viewport clamping.
**Breaking Change Policy**: Minor version may include breaking changes during experimental phase.

#### @cyberfabric/cli

- [x] `p1` - **ID**: `cpt-frontx-interface-cli`

**Type**: Node.js CLI binary + programmatic API
**Stability**: stable
**Description**: Project scaffolding, code generation, migration runners, AI tool configuration sync.
**Breaking Change Policy**: Major version bump required.

### 7.2 External Integration Contracts

#### MFE Manifest Contract

- [x] `p1` - **ID**: `cpt-frontx-contract-mfe-manifest`

**Direction**: required from MFE packages
**Protocol/Format**: JSON (mfe.json)
**Compatibility**: Manifest schema must match `MfManifest` type from `@cyberfabric/screensets`.
**Description**: Each MFE package provides a manifest declaring remoteEntry, exposedModules, sharedDependencies with optional chunkPath.

#### Module Federation Runtime

- [x] `p2` - **ID**: `cpt-frontx-contract-federation-runtime`

**Direction**: required from build system
**Protocol/Format**: `@originjs/vite-plugin-federation` runtime
**Compatibility**: Compatible with vite-plugin-federation v1.4.x.
**Description**: Federation runtime's `importShared()` resolves from `globalThis.__federation_shared__`.

## 8. Use Cases

#### MFE Extension Loading

- [x] `p1` - **ID**: `cpt-frontx-usecase-mfe-load`

**Actor**: `cpt-frontx-actor-host-app`

**Preconditions**:
- FrontX app initialized with `microfrontends()` plugin
- Extension domain registered with shared properties and actions

**Main Flow**:
1. Host dispatches `loadExtension` action with MFE manifest URL
2. MfeHandlerMF fetches manifest and shared dependency source text
3. Handler constructs blob URL share scope and evaluates exposed module
4. Handler returns lifecycle module (mount/unmount)
5. Host dispatches `mountExtension` to render in Shadow DOM slot

**Postconditions**:
- Extension rendered in Shadow DOM with CSS isolation
- Shared properties (theme, language) propagated
- Action chain communication available

**Alternative Flows**:
- **Manifest fetch fails**: MfeLoadError thrown; host can retry with exponential backoff
- **GTS validation fails**: Extension not mounted; error logged with validation details

#### Screenset Scaffolding

- [x] `p2` - **ID**: `cpt-frontx-usecase-scaffold`

**Actor**: `cpt-frontx-actor-developer`

**Preconditions**:
- FrontX project exists with `@cyberfabric/cli` installed

**Main Flow**:
1. Developer runs `frontx scaffold screenset my-feature`
2. CLI copies screenset template to `src/screensets/my-feature/`
3. Template includes: screens, translations, API service stubs, actions, effects
4. Developer modifies generated code to implement business logic

**Postconditions**:
- Self-contained screenset folder with working demo screens
- Translation namespaces derived from screenset/screen IDs
- API service stubs ready for implementation

**Alternative Flows**:
- **Directory exists**: CLI prompts for `--force` flag to overwrite

#### PM Creates Feature Prototypes

- [ ] `p1` - **ID**: `cpt-frontx-usecase-pm-prototyping`

**Actor**: `cpt-frontx-actor-product-manager`

**Preconditions**: A production screenset exists in the project. PM has the project cloned and running locally.

**Main Flow**:
1. PM creates a new draft screenset by duplicating the production screenset
2. PM activates the draft screenset for local development
3. PM uses AI tools in IDE to modify the shell (e.g., add search bar to header)
4. PM creates a second draft with a different approach
5. PM uses Studio screenset selector to switch between both drafts, comparing UX
6. PM decides on the preferred variant, deletes the rejected one
7. PM commits the chosen draft to git

**Postconditions**: One draft screenset exists in the repo alongside the production screenset.

**Alternative Flows**:
- **AI modifies a shared MFE package**: The system ensures the modification is isolated to this screenset without affecting other screensets (per `cpt-frontx-fr-package-isolation`)
- **PM wants more variants**: PM creates additional copies, each independently modifiable

#### Designer Creates Styling Variants

- [ ] `p2` - **ID**: `cpt-frontx-usecase-designer-styling`

**Actor**: `cpt-frontx-actor-ux-designer`

**Preconditions**: A draft screenset exists in the repo, approved by PM for design refinement.

**Main Flow**:
1. Designer promotes the PM's draft to mockup stage
2. Designer duplicates the mockup to create a styling variant
3. Designer modifies themes, colors, spacing in the variant's shell
4. Designer uses Studio to compare the mockup variants
5. Designer collects stakeholder feedback, selects the preferred variant
6. Designer deletes rejected variants, commits the chosen mockup

**Postconditions**: One mockup screenset exists, ready for developer promotion.

**Alternative Flows**:
- **Stakeholders request changes**: Designer modifies the chosen mockup and re-collects feedback without creating new variants

#### Developer Promotes to Production

- [ ] `p1` - **ID**: `cpt-frontx-usecase-dev-production`

**Actor**: `cpt-frontx-actor-developer`

**Preconditions**: A mockup screenset exists in the repo, approved by stakeholders.

**Main Flow (whole screenset promotion)**:
1. Developer changes the approved mockup's stage to production
2. Developer hardens shell code: adds error handling, integrates real APIs, ensures test coverage
3. Developer verifies production build includes only the production screenset
4. Developer removes or demotes the previous production screenset
5. Developer commits and deploys

**Postconditions**: The promoted screenset is the new production screenset.

**Alternative Flows**:
- **Incremental merge**: Instead of promoting the entire mockup, developer copies specific new features (MFE packages/extensions) from the mockup into the existing production screenset, then hardens them in place. The mockup screenset is deleted after features are extracted.
- **Designer passes mockup back to PM**: Designer changes the mockup's stage back to draft for further PM rework before re-promoting to mockup

#### Cross-Product Package Sharing

- [ ] `p2` - **ID**: `cpt-frontx-usecase-cross-product-sharing`

**Actor**: `cpt-frontx-actor-developer`

**Preconditions**: Two production screensets exist (e.g., `partner-backoffice` and `customer-console`). A shared MFE package `usage-dashboard` exists in the pool.

**Main Flow**:
1. Developer adds `usage-dashboard` to both screensets' package references
2. The `usage-dashboard` package defines extensions for both screensets' domains
3. Both screensets load and display the usage dashboard from the shared package
4. A bug fix to `usage-dashboard` automatically applies to both screensets

**Postconditions**: Both products share the same MFE package without duplication.

**Alternative Flows**:
- **One product needs a customized version**: Developer creates an isolated copy of the package for that product's screenset (per `cpt-frontx-fr-package-isolation`)

## 9. Acceptance Criteria

- [x] All published workspace packages build successfully in layer dependency order
- [x] `npm run arch:check` passes with zero violations (dependency-cruiser)
- [x] `npm run arch:unused` passes with zero violations (Knip)
- [x] SDK packages (state, screensets, api, i18n) have zero `@cyberfabric/*` dependencies
- [x] MFE blob URL isolation produces independent module evaluations per load
- [x] Shared property updates propagate only to domains that declare the property
- [x] GTS validation rejects invalid shared property values before propagation
- [x] All formatters return `''` for invalid inputs without throwing
- [x] Studio panel is excluded from production builds via tree-shaking
- [x] CLI scaffolds functional project with `frontx create` + `frontx scaffold layout`
- [ ] A screenset can be created (from template or by duplicating any existing screenset) in under 2 seconds
- [ ] The copied screenset's shell code is independently modifiable without affecting the source
- [ ] Studio displays all local screensets grouped by stage and allows switching between them
- [ ] Screenset stage can be changed freely between draft, mockup, and production
- [ ] The production build includes only the production screenset's code and referenced packages
- [ ] Two screensets can reference the same shared MFE package simultaneously
- [ ] Modifying a shared package from one screenset does not affect other screensets referencing the same package
- [ ] Screensets can be deleted and orphaned resources are detected
- [ ] All screensets in a project can be listed with stage, author, and package count
- [ ] Active screenset selection persists across dev server restarts
- [ ] All screenset operations work as standalone CLI commands without AI tooling
- [ ] Multiple production screensets for different products can be built independently

## 10. Dependencies

| Dependency | Description | Criticality |
|------------|-------------|-------------|
| `@reduxjs/toolkit` >=2.0.0 | Store, slices, Redux internals for @cyberfabric/state | p1 |
| `axios` >=1.0.0 | HTTP REST client for @cyberfabric/api | p1 |
| `react` ^19.2.4 | UI rendering for @cyberfabric/react, studio | p1 |
| `react-dom` ^19.2.4 | DOM rendering | p1 |
| `react-redux` >=8.0.0 | React-Redux bindings for @cyberfabric/react | p1 |
| `@globaltypesystem/gts-ts` ^0.3.0 | GTS type validation for @cyberfabric/screensets | p1 |
| `vite` 6.4.1 | Build tooling and dev server | p1 |
| `@originjs/vite-plugin-federation` ^1.4.1 | Module Federation for MFEs | p1 |
| `tsup` ^8.0.0 | Package bundling (ESM/CJS dual output) | p2 |
| `tailwindcss` ^3.4.1 | Utility CSS for local UI | p2 |
| `commander` ^12.1.0 | CLI argument parsing for @cyberfabric/cli | p2 |
| Radix UI primitives (20+ packages) | Accessible UI for local UI | p2 |
| `recharts` | Chart visualization for local UI | p3 |
| `sonner` | Toast notifications for local UI | p3 |

## 11. Assumptions

- Applications are client-side SPAs served from a static host or CDN; no SSR infrastructure assumed
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge) with ES2020 target; no IE11 or legacy polyfills
- Development requires npm >= 10.0.0 with workspace support
- Development environment requires Node.js 22+; published packages support Node.js 18+ at runtime
- MFE remote entries are fetchable via `fetch()`, requiring same-origin hosting or proper CORS headers
- Deployment environments allow `blob:` in CSP `script-src` for MFE isolation
- Both host app and MFE packages use Vite with `@originjs/vite-plugin-federation`
- Host application uses React 19; MFEs may use any framework implementing the lifecycle interface
- Package version 0.4.0-alpha.0 — backward-incompatible changes are expected
- Lodash is required for non-trivial object and array operations (per project guidelines)
- AI tooling (Cursor, Windsurf, Claude Code, Copilot) is the primary mechanism for modifying shell code in draft screensets — PMs and designers are not expected to write code manually
- Git is the collaboration mechanism — multiple PMs working on different features use git branches containing their respective draft screensets
- The dev server serves one screenset at a time — side-by-side comparison happens by switching in Studio (sequential), not by running two screensets simultaneously
- Forked packages created during prototyping are short-lived — they are either merged back to the shared pool during production promotion or deleted with rejected screensets

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Blob URL memory accumulation in long sessions | Memory leak from non-revoked blob URLs | Browser cleans up on page unload; typical SPA lifecycle is bounded |
| Module Federation plugin limitations | `@originjs/vite-plugin-federation` updates may break handler | Custom externalize plugin and source text rewriting bypass federation runtime limitations |
| CSP policy conflicts with blob: URLs | Enterprise deployments may reject blob URLs | Document CSP requirement; provide MfeHandler extension point for alternatives |
| Race conditions in concurrent MFE operations | State corruption from interleaved lifecycle operations | Domain-level operation serialization; per-load LoadBlobState isolation |
| Memory leaks from unreleased event subscriptions | EventSource, EventBus, axios connections not cleaned up | cleanup() methods on protocols, destroy() on plugins, unsubscribe() on subscriptions |
| Large change surface for breaking changes | Alpha status means API changes are expected | CLI migration runners automate codemod transformations |
| Infinite retry loops | API/MFE retry could loop indefinitely | maxRetryDepth (default: 10) in RestProtocol; retries config (default: 2) in MfeHandlerMF |
| Single Module Federation implementation lock-in | Only vite-plugin-federation supported | MfeHandler is abstract; custom handlers pluggable via microfrontends config |
| Shell code divergence across screensets | Screensets accumulate incompatible shell patterns, making framework upgrades and shared maintenance difficult | Provide tooling that shows how a screenset's shell differs from its source; document recommended shell update practices |
| Orphaned resources after screenset deletion | Project accumulates unused MFE packages no longer referenced by any screenset | CLI detects and offers cleanup of orphaned resources during deletion |
| AI agents make invalid screenset modifications | Malformed configuration or broken package references from AI edits | Validate screenset configuration on dev server startup; provide machine-readable context to guide AI agents |
| Package isolation mechanism introduces subtle bugs | Modified packages may lose correct bindings to other screensets' domains | Comprehensive validation of isolated packages after modification |
| Shared package updates break dependent screensets | Bug fix in a shared package changes behavior that a screenset relied on | Package modification isolation ensures screensets that customized a package are not affected; shared packages should have stable interfaces |
| Framework upgrades require per-screenset shell updates | Since each screenset owns its shell code, a framework upgrade must be applied to every screenset independently | Provide shell diffing/update tooling; document recommended upgrade practices |
