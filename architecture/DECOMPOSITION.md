# Decomposition: FrontX Dev Kit

<!-- toc -->

- [1. Overview](#1-overview)
- [2. Entries](#2-entries)
  - [2.1 State Management ⏳ HIGH](#21-state-management--high)
  - [2.2 Screenset Registry & Contracts ⏳ HIGH](#22-screenset-registry--contracts--high)
  - [2.3 MFE Blob URL Isolation ⏳ HIGH](#23-mfe-blob-url-isolation--high)
  - [2.4 API Communication ⏳ HIGH](#24-api-communication--high)
  - [2.5 Internationalization Infrastructure ⏳ HIGH](#25-internationalization-infrastructure--high)
  - [2.6 Framework Composition ⏳ HIGH](#26-framework-composition--high)
  - [2.7 React Bindings ⏳ HIGH](#27-react-bindings--high)
  - [2.8 Studio DevTools ⏳ MEDIUM](#28-studio-devtools--medium)
  - [2.9 CLI Tooling ⏳ MEDIUM](#29-cli-tooling--medium)
  - [2.10 CLI Scaffolding Quality ⏳ LOW](#210-cli-scaffolding-quality--low)
  - [2.11 Publishing Pipeline ⏳ MEDIUM](#211-publishing-pipeline--medium)
  - [2.12 UI Libraries Choice ⏳ HIGH](#212-ui-libraries-choice--high)
- [3. Feature Dependencies](#3-feature-dependencies)

<!-- /toc -->

## 1. Overview

The DESIGN is decomposed into 11 features aligned with package/module boundaries in the monorepo. Each feature maps to a cohesive set of source files that can be implemented, tested, and reviewed independently.

**Decomposition strategy**: One feature per logical package or cross-cutting capability. L1 SDK packages each get their own feature (state, screensets, api, i18n). L2/L3 packages get their own features. MFE isolation is separated from screenset registry because it spans multiple packages and has distinct FRs. Standalone packages (studio, cli) are individual features, and UI strategy is captured as a separate CLI-driven feature. Publishing/CI is a separate infrastructure feature.

**Dependency direction**: Features follow the same layer dependency as the architecture — SDK features have no inter-dependencies, framework depends on SDK features, react depends on framework, standalone features are independent.

## 2. Entries

**Overall implementation status:**

- [x] `p1` - **ID**: `cpt-frontx-status-overall`

### 2.1 [State Management](feature-state-management/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-state-management`

- **Purpose**: Provides the foundational state management and event infrastructure for the entire FrontX system. Implements the typed EventBus, Redux Toolkit store with dynamic slice registration, action factory, and effect system that enforce the Action → Event → Effect → Reducer data flow pattern.

- **Depends On**: None

- **Scope**:
  - EventBus pub/sub messaging with typed events
  - Store factory with dynamic slice registration
  - `createAction()` factory producing typed action creators
  - Effect system for event-driven side effects
  - Flux terminology enforcement (Action → Event → Effect → Reducer)
  - Module augmentation support for type-safe slice extensions

- **Out of scope**:
  - React hooks for state access (see `cpt-frontx-feature-react-bindings`)
  - Domain-specific slices (registered by each plugin)
  - Persistence or DevTools middleware

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-sdk-state-interface`
  - [x] `p2` - `cpt-frontx-fr-sdk-flux-terminology`
  - [x] `p1` - `cpt-frontx-fr-sdk-action-pattern`
  - [x] `p2` - `cpt-frontx-fr-sdk-module-augmentation`
  - [x] `p1` - `cpt-frontx-nfr-rel-serialization`
  - [x] `p2` - `cpt-frontx-nfr-perf-action-timeout`
  - [x] `p1` - `cpt-frontx-nfr-maint-event-driven`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-event-driven-architecture`
  - [x] `p1` - `cpt-frontx-principle-action-event-effect-reducer-flux`

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-no-react-below-l3`
  - [x] `p1` - `cpt-frontx-constraint-zero-cross-deps-at-l1`
  - [x] `p1` - `cpt-frontx-constraint-typescript-strict-mode`
  - [x] `p1` - `cpt-frontx-constraint-esm-first-module-format`

- **Domain Model Entities**:
  - State (Store)
  - Event
  - Action
  - Effect

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-state`

- **API**:
  - `eventBus.publish()` / `eventBus.subscribe()`
  - `createAction()`
  - `createSlice()` / `registerSlice()`
  - `registerEffect()`

- **Sequences**:

  - `cpt-frontx-seq-screenset-data-flow`

- **Data**:
  - N/A (client-side library)

### 2.2 [Screenset Registry & Contracts](feature-screenset-registry/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-screenset-registry`

- **Purpose**: Defines the contract between host application and microfrontend extensions. Manages the screen-set registry, MFE type contracts (entry types, domain declarations, shared property schemas, action types), and auto-discovery via Vite glob imports.

- **Depends On**: None

- **Scope**:
  - `screensetsRegistryFactory` for registering/querying screen-sets
  - MFE entry type definitions (component, screen, extension)
  - Extension domain declarations and shared property schemas
  - MFE action type definitions
  - Handler injection for MFE loading
  - Screenset self-containment conventions (slice name = state key = screenset ID)

- **Out of scope**:
  - Blob URL isolation (see `cpt-frontx-feature-mfe-isolation`)
  - React rendering of MFEs (see `cpt-frontx-feature-react-bindings`)
  - Theme/i18n propagation (see `cpt-frontx-feature-framework-composition`)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-sdk-screensets-package`
  - [x] `p1` - `cpt-frontx-fr-mfe-entry-types`
  - [x] `p1` - `cpt-frontx-fr-mfe-ext-domain`
  - [x] `p1` - `cpt-frontx-fr-mfe-shared-property`
  - [x] `p1` - `cpt-frontx-fr-mfe-action-types`
  - [x] `p1` - `cpt-frontx-fr-mfe-dynamic-registration`

- **Design Principles Covered**:

  - [x] `p2` - `cpt-frontx-principle-self-registering-registries`

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-no-react-below-l3`
  - [x] `p1` - `cpt-frontx-constraint-zero-cross-deps-at-l1`
  - [x] `p2` - `cpt-frontx-constraint-no-barrel-exports-for-registries`

- **Domain Model Entities**:
  - ScreenSet
  - Screen
  - Microfrontend
  - SharedProperty

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-screensets`

- **API**:
  - `screensetsRegistryFactory.build()`
  - `screensetsRegistry.register()` / `.get()` / `.getAll()`
  - `updateSharedProperty()`

- **Sequences**:
  - None (registry is data infrastructure; sequences use it but are owned by other features)

- **Data**:
  - N/A (client-side library)

### 2.3 [MFE Blob URL Isolation](feature-mfe-isolation/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-mfe-isolation`

- **Purpose**: Implements per-MFE JavaScript isolation through blob URL evaluation. Each MFE bundle is fetched, its import specifiers rewritten to blob URLs, and evaluated in a fresh module scope. This ensures each MFE has its own module-level state (EventBus, store) independent of the host and other MFEs.

- **Depends On**: `cpt-frontx-feature-screenset-registry`

- **Scope**:
  - Blob URL creation from fetched source text
  - Import specifier rewriting (bare `@cyberfabric/*` → blob URLs)
  - Source text caching after first fetch
  - Recursive chain loading for transitive dependencies
  - Per-load import map management
  - `hai3-mfe-externalize` Vite plugin for MFE builds
  - Deterministic filenames without content hashes
  - Never-revoke policy for blob URLs
  - MFE internal dataflow (useReducer/useState, no host Redux)
  - Share scope construction from manifest

- **Out of scope**:
  - CSS isolation via Shadow DOM (see `cpt-frontx-feature-react-bindings`)
  - MFE lifecycle orchestration (see `cpt-frontx-feature-framework-composition`)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-blob-fresh-eval`
  - [x] `p2` - `cpt-frontx-fr-blob-no-revoke`
  - [x] `p1` - `cpt-frontx-fr-blob-source-cache`
  - [x] `p1` - `cpt-frontx-fr-blob-import-rewriting`
  - [x] `p1` - `cpt-frontx-fr-blob-recursive-chain`
  - [x] `p2` - `cpt-frontx-fr-blob-per-load-map`
  - [x] `p1` - `cpt-frontx-fr-externalize-transform`
  - [x] `p1` - `cpt-frontx-fr-externalize-filenames`
  - [x] `p2` - `cpt-frontx-fr-externalize-build-only`
  - [x] `p1` - `cpt-frontx-fr-dataflow-internal-app`
  - [x] `p1` - `cpt-frontx-fr-dataflow-no-redux`
  - [x] `p1` - `cpt-frontx-fr-sharescope-construction`
  - [x] `p2` - `cpt-frontx-fr-sharescope-concurrent`
  - [x] `p2` - `cpt-frontx-nfr-perf-blob-overhead`
  - [x] `p1` - `cpt-frontx-nfr-sec-csp-blob`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-mfe-isolation`

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-zero-cross-deps-at-l1`

- **Domain Model Entities**:
  - Microfrontend

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-screensets` (blob loader subsystem)

- **API**:
  - `blobLoader.load()`
  - `sourceCache.get()` / `.set()`
  - `importRewriter.rewrite()`
  - `hai3-mfe-externalize` Vite plugin config

- **Sequences**:

  - `cpt-frontx-seq-mfe-loading`

- **Data**:
  - N/A (client-side library)

### 2.4 [API Communication](feature-api-communication/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-api-communication`

- **Purpose**: Provides a unified API service layer abstracting REST and SSE protocols behind consistent interfaces. Includes global and instance-level plugin systems for cross-cutting concerns, mock mode control via symbol-based plugin identification, and protocol-specific configuration.

- **Depends On**: None

- **Scope**:
  - `createApiService()` factory for typed service instances
  - REST protocol adapter (Axios-based)
  - SSE protocol adapter (EventSource-based)
  - Protocol registry with class-keyed Map storage
  - Global plugin registry on `apiRegistry` with OCP-compliant API
  - Instance-level plugins for local overrides
  - `RestMockPlugin` and `SseMockPlugin` for mock responses
  - `MOCK_PLUGIN` symbol and `isMockPlugin()` type guard
  - `toggleMockMode` action for centralized mock control
  - Plugin retry support with error context and safety-limited depth
  - Type-safe SSE events via generics

- **Out of scope**:
  - Business-domain API endpoint definitions (owned by domain plugins)
  - Authentication token management (configured via interceptors by consumers)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-sdk-api-package`
  - [x] `p1` - `cpt-frontx-fr-sse-protocol`
  - [x] `p2` - `cpt-frontx-fr-sse-mock-mode`
  - [x] `p1` - `cpt-frontx-fr-sse-protocol-registry`
  - [x] `p2` - `cpt-frontx-fr-sse-type-safe-events`
  - [x] `p2` - `cpt-frontx-fr-mock-toggle`
  - [x] `p2` - `cpt-frontx-nfr-rel-api-retry`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-event-driven-architecture` (mock toggle via events)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-no-react-below-l3`
  - [x] `p1` - `cpt-frontx-constraint-zero-cross-deps-at-l1`
  - [x] `p2` - `cpt-frontx-constraint-no-package-internals-imports`

- **Domain Model Entities**:
  - Event (SSE events)

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-api`

- **API**:
  - `createApiService()`
  - `apiRegistry.registerPlugin()` / `.getPlugins()`
  - `SseProtocol.connect()` / `.disconnect()`
  - `toggleMockMode` action

- **Sequences**:
  - None (API is infrastructure; used by sequences but doesn't own one)

- **Data**:
  - N/A (client-side library)

### 2.5 [Internationalization Infrastructure](feature-i18n-infrastructure/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-i18n-infrastructure`

- **Purpose**: Provides internationalization infrastructure supporting 36 languages with locale-aware formatting, hybrid namespace model for menu/screen-level translations, and lazy chunk loading.

- **Depends On**: None

- **Scope**:
  - 36 built-in language configurations with locale metadata
  - Date, number, currency, relative-time formatter exports (individually tree-shakeable)
  - Hybrid namespace model (global keys + screenset-scoped keys)
  - Lazy chunk loading per namespace
  - `I18nRegistry.createLoader()` static method for Vite-compatible imports
  - Graceful fallback for invalid format inputs
  - Strict content separation enforcement (screenset files = menu titles only)

- **Out of scope**:
  - React `useTranslation()` hook (see `cpt-frontx-feature-react-bindings`)
  - Translation content (provided by consuming applications)
  - Language propagation to MFEs (see `cpt-frontx-feature-framework-composition`)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-sdk-i18n-package`
  - [x] `p1` - `cpt-frontx-fr-i18n-formatters`
  - [x] `p1` - `cpt-frontx-fr-i18n-formatter-exports`
  - [x] `p2` - `cpt-frontx-fr-i18n-graceful-invalid`
  - [x] `p1` - `cpt-frontx-fr-i18n-hybrid-namespace`
  - [x] `p1` - `cpt-frontx-fr-i18n-lazy-chunks`

- **Design Principles Covered**:

  - [x] `p2` - `cpt-frontx-principle-self-registering-registries` (i18n namespace registration)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-no-react-below-l3`
  - [x] `p1` - `cpt-frontx-constraint-zero-cross-deps-at-l1`

- **Domain Model Entities**:
  - (i18n infrastructure — no explicit domain entity in DESIGN)

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-i18n`

- **API**:
  - `I18nRegistry.createLoader()`
  - `formatDate()` / `formatNumber()` / `formatCurrency()` / `formatRelativeTime()`
  - Namespace registration API

- **Sequences**:
  - None

- **Data**:
  - N/A (client-side library)

### 2.6 [Framework Composition](feature-framework-composition/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-framework-composition`

- **Purpose**: Composes L1 SDK packages into a cohesive application framework through the plugin architecture. Provides the builder API, plugin system, layout orchestration, configuration management, microfrontends lifecycle plugin, shared property bridge with GTS validation, and theme/i18n propagation to MFEs.

- **Depends On**: `cpt-frontx-feature-state-management`, `cpt-frontx-feature-screenset-registry`, `cpt-frontx-feature-api-communication`, `cpt-frontx-feature-i18n-infrastructure`

- **Scope**:
  - `createHAI3()` builder with `.use(plugin).build()` chaining
  - `HAI3Plugin` interface and `HAI3PluginContext`
  - Layout slices (menu, header, footer, sidebars, overlay, popups)
  - `AppConfig` with tenant settings, router config, layout visibility
  - `app/*` event API for configuration propagation
  - `microfrontends()` plugin with MFE lifecycle actions
  - Domain constants (`HAI3_SCREEN_DOMAIN`, `HAI3_SIDEBAR_DOMAIN`, `HAI3_POPUP_DOMAIN`, `HAI3_OVERLAY_DOMAIN`)
  - Theme propagation to MFEs via `themes()` plugin
  - Language propagation to MFEs via `i18n()` plugin
  - `updateSharedProperty()` global broadcast
  - GTS validation of shared property values
  - `setSharedProperty()` / `getSharedProperty()` bridge
  - SDK re-exports for consumer convenience

- **Out of scope**:
  - React provider/hooks (see `cpt-frontx-feature-react-bindings`)
  - Blob URL isolation mechanics (see `cpt-frontx-feature-mfe-isolation`)
  - App-owned UI component implementations (see `cpt-frontx-feature-ui-libraries-choice`)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-sdk-framework-layer`
  - [x] `p1` - `cpt-frontx-fr-sdk-plugin-arch`
  - [x] `p1` - `cpt-frontx-fr-sdk-layer-deps`
  - [x] `p1` - `cpt-frontx-fr-appconfig-tenant`
  - [x] `p1` - `cpt-frontx-fr-appconfig-event-api`
  - [x] `p1` - `cpt-frontx-fr-appconfig-router-config`
  - [x] `p2` - `cpt-frontx-fr-appconfig-layout-visibility`
  - [x] `p1` - `cpt-frontx-fr-mfe-theme-propagation`
  - [x] `p1` - `cpt-frontx-fr-mfe-i18n-propagation`
  - [x] `p1` - `cpt-frontx-fr-broadcast-write-api`
  - [x] `p1` - `cpt-frontx-fr-broadcast-matching`
  - [x] `p1` - `cpt-frontx-fr-broadcast-validate`
  - [x] `p1` - `cpt-frontx-fr-validation-gts`
  - [x] `p1` - `cpt-frontx-fr-validation-reject`
  - [x] `p1` - `cpt-frontx-fr-mfe-plugin`
  - [x] `p1` - `cpt-frontx-nfr-rel-error-handling`
  - [x] `p1` - `cpt-frontx-nfr-sec-type-validation`
  - [x] `p1` - `cpt-frontx-nfr-maint-zero-crossdeps`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-plugin-first-composition`
  - [x] `p1` - `cpt-frontx-principle-layer-isolation`

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-no-react-below-l3`

- **Domain Model Entities**:
  - Plugin
  - SharedProperty
  - ScreenSet (via registry integration)

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-framework`

- **API**:
  - `createHAI3()` / `.use()` / `.build()`
  - `microfrontends()` / `themes()` / `i18n()` / `effects()` / `mock()` plugins
  - `setSharedProperty()` / `getSharedProperty()`
  - `AppConfig` type

- **Sequences**:

  - `cpt-frontx-seq-app-bootstrap`
  - `cpt-frontx-seq-shared-property-broadcast`

- **Data**:
  - N/A (client-side library)

### 2.7 [React Bindings](feature-react-bindings/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-react-bindings`

- **Purpose**: Bridges the framework layer to React 19, providing the root provider, typed hooks, MFE rendering with Shadow DOM CSS isolation, and error boundaries. This is the primary API surface that application developers interact with.

- **Depends On**: `cpt-frontx-feature-framework-composition`

- **Scope**:
  - `HAI3Provider` root component (Redux store, i18n, theme, framework context)
  - Typed hooks: `useSelector()`, `useDispatch()`, `useTranslation()`, `useSharedProperty()`, `useAction()`
  - `MfeContainer` component with Shadow DOM wrapping
  - Per-MFE React error boundaries
  - Initialization sequence orchestration
  - Screen component with React.lazy() wrapping and Suspense fallback

- **Out of scope**:
  - App-owned UI component implementations (see `cpt-frontx-feature-ui-libraries-choice`)
  - Framework plugin logic (see `cpt-frontx-feature-framework-composition`)

- **Requirements Covered**:

  - [x] `p2` - `cpt-frontx-fr-sdk-react-layer`
  - [x] `p1` - `cpt-frontx-nfr-sec-shadow-dom`
  - [x] `p1` - `cpt-frontx-nfr-compat-react`
  - [x] `p1` - `cpt-frontx-nfr-perf-lazy-loading`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-layer-isolation` (React confined to L3)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-no-react-below-l3` (this feature IS the React boundary)

- **Domain Model Entities**:
  - Screen
  - Component

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-react`

- **API**:
  - `<HAI3Provider>`
  - `<MfeContainer>`
  - `<Screen>`
  - `useSelector()` / `useDispatch()` / `useTranslation()` / `useSharedProperty()` / `useAction()`

- **Sequences**:

  - [x] `p1` - `cpt-frontx-seq-app-bootstrap` (initialization sequence)

- **Data**:
  - N/A (client-side library)

### 2.8 [Studio DevTools](feature-studio-devtools/) ⏳ MEDIUM

- [x] `p2` - **ID**: `cpt-frontx-feature-studio-devtools`

- **Purpose**: Provides a development-time overlay for inspecting and tweaking theme, i18n, viewport, and state. Conditionally loaded via `import.meta.env.DEV` for zero production bundle impact. Persists panel state to localStorage.

- **Depends On**: None

- **Scope**:
  - Toggleable floating glassmorphic overlay panel
  - Theme switching, language selection, API mock mode toggle controls
  - Viewport simulation at configurable breakpoints
  - Panel state persistence (open/closed, position, preferences) via localStorage
  - Build independence (excluded from production via tree-shaking)
  - Event-driven persistence (subscribes to framework events)

- **Out of scope**:
  - Framework state modification (dispatches through standard event flow)
  - Production usage

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-studio-panel`
  - [x] `p1` - `cpt-frontx-fr-studio-controls`
  - [x] `p1` - `cpt-frontx-fr-studio-persistence`
  - [x] `p1` - `cpt-frontx-fr-studio-viewport`
  - [x] `p1` - `cpt-frontx-fr-studio-independence`

- **Design Principles Covered**:
  - (Studio is standalone; operates through event-driven patterns)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-typescript-strict-mode`

- **Domain Model Entities**:
  - (No domain entities uniquely owned by Studio)

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-studio`

- **API**:
  - `import('@cyberfabric/studio')` (dev-only dynamic import)
  - Studio panel toggle

- **Sequences**:
  - None

- **Data**:
  - N/A (client-side library)

### 2.9 [CLI Tooling](feature-cli-tooling/) ⏳ MEDIUM

- [x] `p2` - **ID**: `cpt-frontx-feature-cli-tooling`

- **Purpose**: Reduces boilerplate and enforces conventions through interactive scaffolding commands. Generates screen-sets, MFE packages, and components from real project files used as templates. Supports both interactive (human) and programmatic (AI agent) execution modes.

- **Depends On**: None

- **Scope**:
  - `frontx` binary entry point via Commander.js
  - Commands: `create`, `generate`, `dev`, `update`, `validate`
  - Template-based code generation from real project files
  - Plugin-based command registry with `CommandDefinition` interface
  - Dual-mode execution (interactive + programmatic)
  - AI skill definitions for Claude Code integration
  - Layer-aware command variants with cascade fallback
  - E2E scaffold verification: required PR gate and nightly coverage via scripted harness

- **Out of scope**:
  - Runtime framework functionality (CLI generates code that imports it)
  - Build or deployment execution (delegates to Vite and npm)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-cli-package`
  - [x] `p1` - `cpt-frontx-fr-cli-commands`
  - [x] `p1` - `cpt-frontx-fr-cli-templates`
  - [x] `p1` - `cpt-frontx-fr-cli-skills`
  - [x] `p1` - `cpt-frontx-fr-cli-e2e-verification`

- **Design Principles Covered**:
  - (CLI is tooling; doesn't uniquely own architecture principles)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-esm-first-module-format`

- **Domain Model Entities**:
  - (No domain entities uniquely owned by CLI)

- **Design Components**:

  - [x] `p2` - `cpt-frontx-component-cli`

- **API**:
  - `frontx create [project-name]`
  - `frontx generate screenset|mfe|component [name]`
  - `frontx update`
  - `frontx validate`
  - `frontx dev`

- **Sequences**:
  - None

- **Data**:
  - N/A (client-side library)

### 2.10 [CLI Scaffolding Quality](feature-cli-scaffolding-quality/) ⏳ LOW

- [x] `p1` - **ID**: `cpt-frontx-feature-cli-scaffolding-quality`

- **Purpose**: Ensures CLI-generated projects are immediately usable out of the box — passing architecture validation, including CI workflow, and having consistent version configuration.

- **Depends On**: `cpt-frontx-feature-cli-tooling`

- **Scope**:
  - CI workflow template generation (`.github/workflows/ci.yml`)
  - Architecture check fixes for freshly generated projects
  - Package manager consistency in CI configuration
  - Node version sourced from `.nvmrc` in generated CI

- **Out of scope**:
  - Changes to CLI core scaffolding logic (covered by `cpt-frontx-feature-cli-tooling`)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-cli-templates`
  - [x] `p1` - `cpt-frontx-fr-cli-e2e-verification`

- **Design Components**:

  - [x] `p2` - `cpt-frontx-component-cli`

### 2.11 [Publishing Pipeline](feature-publishing-pipeline/) ⏳ MEDIUM

- [x] `p2` - **ID**: `cpt-frontx-feature-publishing-pipeline`

- **Purpose**: Automates NPM package publishing with correct layer-order dependency resolution, version detection via git diff, and idempotent CI workflow. Ensures all packages have correct metadata, ESM output, and consistent versioning.

- **Depends On**: None

- **Scope**:
  - GitHub Actions workflow triggered on PR merge to main
  - Version change detection via git diff
  - Layer-ordered sequential publishing (SDK → Framework → React → Studio → CLI)
  - NPM registry pre-check for idempotency
  - Retry with exponential backoff
  - `package.json` metadata: `engines`, `exports`, `type`, `sideEffects`
  - Consistent versioning across packages

- **Out of scope**:
  - Package build logic (each package owns its tsup config)
  - NPM registry infrastructure

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-sdk-flat-packages`
  - [x] `p1` - `cpt-frontx-fr-pub-metadata`
  - [x] `p1` - `cpt-frontx-fr-pub-versions`
  - [x] `p1` - `cpt-frontx-fr-pub-esm`
  - [x] `p1` - `cpt-frontx-fr-pub-ci`
  - [x] `p1` - `cpt-frontx-nfr-compat-node`
  - [x] `p1` - `cpt-frontx-nfr-compat-typescript`
  - [x] `p1` - `cpt-frontx-nfr-compat-esm`
  - [x] `p1` - `cpt-frontx-nfr-perf-treeshake`
  - [x] `p2` - `cpt-frontx-nfr-maint-arch-enforcement`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-layer-isolation` (build order enforces layer deps)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-esm-first-module-format`
  - [x] `p1` - `cpt-frontx-constraint-typescript-strict-mode`
  - [x] `p2` - `cpt-frontx-constraint-no-package-internals-imports`

- **Domain Model Entities**:
  - (No domain entities — infrastructure concern)

- **Design Components**:
  - (Cross-cutting — affects all package build outputs)

- **API**:
  - `.github/workflows/publish.yml`
  - `npm run build:packages`

- **Sequences**:
  - None

- **Data**:
  - N/A (client-side library)

### 2.12 [UI Libraries Choice](feature-ui-libraries-choice/) ⏳ HIGH

- [x] `p1` - **ID**: `cpt-frontx-feature-ui-libraries-choice`

- **Purpose**: Provides a per-project UI strategy chosen at creation time. When running `frontx create`, the developer selects a UI approach for the project: copy-owned shadcn/ui components, a third-party library (MUI, Ant Design, etc.), or fully custom components. The CLI reads `frontx.config.json` to determine the active UI kit and scaffolds accordingly.

- **Depends On**: `cpt-frontx-feature-cli-tooling`

- **Scope**:
  - `frontx.config.json` `uikit` field supporting `"shadcn"`, `"none"`, or a third-party package name
  - CLI `frontx create` scaffolding per UI kit type (shadcn components, bridge file, or empty uikit)
  - CLI `frontx screenset` generation respecting the project's configured UI kit
  - UIKit bridge generation for third-party libraries
  - CSS variable theme propagation for all UI kit types
  - AI guidelines updated (UIKIT.md, SCREENSETS.md)

- **Out of scope**:
  - MFE isolation mechanics (see `cpt-frontx-feature-mfe-isolation`)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-cli-commands`
  - [x] `p1` - `cpt-frontx-fr-cli-templates`
  - [x] `p1` - `cpt-frontx-nfr-maint-zero-crossdeps`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-frontx-principle-mfe-isolation`
  - [x] `p2` - `cpt-frontx-principle-self-registering-registries`

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-typescript-strict-mode`

- **Domain Model Entities**:
  - Component

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-cli`

- **API**:
  - `frontx create` (UI kit selection prompt)
  - `frontx screenset` (UI kit-aware generation)
  - `frontx.config.json` `uikit` field

- **Sequences**:
  - None

- **Data**:
  - N/A (client-side library)

---

## 3. Feature Dependencies

```text
cpt-frontx-feature-state-management          (L1, no deps)
cpt-frontx-feature-screenset-registry        (L1, no deps)
cpt-frontx-feature-api-communication         (L1, no deps)
cpt-frontx-feature-i18n-infrastructure       (L1, no deps)
cpt-frontx-feature-studio-devtools           (standalone, no deps)
cpt-frontx-feature-cli-tooling               (standalone, no deps)
cpt-frontx-feature-publishing-pipeline       (infrastructure, no deps)
cpt-frontx-feature-ui-libraries-choice       (standalone, requires: cli-tooling)
    │
    ├─→ cpt-frontx-feature-mfe-isolation
    │       requires: screenset-registry
    │
    ├─→ cpt-frontx-feature-framework-composition
    │       requires: state-management, screenset-registry,
    │                 api-communication, i18n-infrastructure
    │
    └─→ cpt-frontx-feature-react-bindings
            requires: framework-composition
```

**Dependency Rationale**:

- `cpt-frontx-feature-mfe-isolation` requires `cpt-frontx-feature-screenset-registry`: blob URL loader operates on screen-set registry entries and MFE contracts
- `cpt-frontx-feature-framework-composition` requires all four L1 features: framework composes all SDK packages via plugin system
- `cpt-frontx-feature-react-bindings` requires `cpt-frontx-feature-framework-composition`: React layer consumes the built framework output
- `cpt-frontx-feature-ui-libraries-choice` requires `cpt-frontx-feature-cli-tooling`: CLI commands (`frontx create`, `frontx screenset`) implement the UI kit scaffolding
- All L1 features, standalone features, and publishing-pipeline are independent and can be developed in parallel
