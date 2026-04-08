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
  - [2.10 Publishing Pipeline ⏳ MEDIUM](#210-publishing-pipeline--medium)
  - [2.11 UI Libraries Choice ⏳ HIGH](#211-ui-libraries-choice--high)
  - [2.12 Request Lifecycle & Query Integration ⏳ HIGH](#212-request-lifecycle--query-integration--high)
  - [2.13 Performance Telemetry ⏳ MEDIUM](#213-performance-telemetry--medium)
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
  - [x] `p2` - `cpt-frontx-constraint-oss-licensing`

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
  - [x] `p1` - `cpt-frontx-fr-broadcast-write-api`
  - [x] `p1` - `cpt-frontx-fr-broadcast-matching`
  - [x] `p1` - `cpt-frontx-fr-broadcast-validate`
  - [x] `p1` - `cpt-frontx-fr-validation-gts`
  - [x] `p1` - `cpt-frontx-fr-validation-reject`

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
  - Bare specifier rewriting for all declared shared deps (`@cyberfabric/*` and third-party like `react`, `react-dom`, `@reduxjs/toolkit`) → per-load blob URLs
  - Cross-runtime source text deduplication via `sharedDepTextCache` keyed by `name@version`
  - Recursive chain loading for transitive dependencies
  - Per-load import map management
  - `@module-federation/vite` build plugin for expose chunk compilation only (MF 2.0 runtime not used; `shared: {}`)
  - `frontx-mf-gts` Vite plugin building standalone ESM shared deps from `rollupOptions.external` via esbuild
  - Deterministic filenames without content hashes
  - Never-revoke policy for blob URLs
  - MFE internal dataflow (useReducer/useState, no host Redux)
  - Per-load blob URL chain construction from enriched `mfe.json` manifest (no `FederationHost` instance)
  - Generation script aggregating pointers to enriched `mfe.json` files into `generated-mfe-manifests.json`

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
  - `MfeHandlerMF.load()` / `.mount()` / `.unmount()`
  - `sharedDepTextCache` (keyed by `name@version`) and `sourceTextCache` (keyed by absolute URL)
  - Bare specifier rewriting within the handler
  - `@module-federation/vite` plugin configuration (expose chunks only)
  - `frontx-mf-gts` Vite plugin configuration (standalone ESM builder + `mfe.json` enricher)

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
  - `queryCache()` plugin for host-owned shared `QueryClient` lifecycle, mock mode cache integration, and Flux cache invalidation; `queryCacheShared()` plugin so separately mounted child roots (including MFE apps) join the same host client without a second `QueryClient`
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
  - `microfrontends()` / `themes()` / `i18n()` / `effects()` / `mock()` / `queryCache()` / `queryCacheShared()` plugins
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
  - Resolves the shared `QueryClient` from the app when built with `queryCache()` or `queryCacheShared()` (host vs child join path); does not instantiate its own TanStack client
  - Typed hooks: `useHAI3()`, `useAppSelector()`, `useAppDispatch()`, `useTranslation()`, `useScreenTranslations()`, `useFormatters()`, `useTheme()`, `useMfeBridge()`, `useSharedProperty()`, `useHostAction()`, and related MFE hooks
  - `ExtensionDomainSlot` host renderer with RefContainerProvider-backed container coordination
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
  - `<HAI3Provider>` (with optional internal query provider when `queryCache()` / `queryCacheShared()` registered)
  - `<ExtensionDomainSlot>`
  - `<RefContainerProvider>`
  - `<Screen>`
  - `useHAI3()` / `useAppSelector()` / `useAppDispatch()` / `useTranslation()` / `useScreenTranslations()` / `useFormatters()` / `useTheme()` / `useMfeBridge()` / `useSharedProperty()` / `useHostAction()` — plus descriptor-driven `useApiQuery()` / `useApiSuspenseQuery()` / `useApiInfiniteQuery()` / `useApiSuspenseInfiniteQuery()` / `useApiMutation()` / `useApiStream()` / `useQueryCache()` (see [2.12](#212-request-lifecycle--query-integration--high))

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

### 2.10 [Publishing Pipeline](feature-publishing-pipeline/) ⏳ MEDIUM

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

### 2.11 [UI Libraries Choice](feature-ui-libraries-choice/) ⏳ HIGH

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

### 2.12 [Request Lifecycle & Query Integration](feature-request-lifecycle/) ⏳ HIGH

- [x] `p2` - **ID**: `cpt-frontx-feature-request-lifecycle`

- **Purpose**: Adds `AbortSignal`-based request cancellation to `RestProtocol` at L1, explicit declarative endpoint/stream contracts for library-agnostic caching at L1, a `queryCache()` / `queryCacheShared()` framework plugin pair at L2 (host owns the shared `QueryClient`; child roots join it), and descriptor-consuming hooks at L3 for declarative data fetching and mutations with automatic caching, deduplication, optimistic updates, and cache invalidation.

- **Depends On**: `cpt-frontx-feature-api-communication`, `cpt-frontx-feature-react-bindings`, `cpt-frontx-feature-framework-composition`

- **Scope**:
  - `AbortSignal` threading through `RestProtocol` and plugin chain
  - `RestRequestOptions` pattern for HTTP method extensibility
  - `CanceledError` detection and plugin chain bypass
  - `EndpointDescriptor<TData>`, `MutationDescriptor<TData, TVariables>`, and `StreamDescriptor<TEvent>` types at L1 (`@cyberfabric/api`)
  - `RestEndpointProtocol.query(path)`, `queryWith(pathFn)`, `mutation(method, path)`, and `SseStreamProtocol.stream(path)` — cache keys derived from `[baseURL, 'GET', path]` for static reads, `[baseURL, 'GET', resolvedPath, params]` for parameterized reads, `[baseURL, method, path]` for writes, and `[baseURL, 'SSE', path]` for streams
  - `queryCache()` framework plugin at L2 — creates and owns the host shared `QueryClient`, handles `MockEvents.Toggle` cache clear, handles `cache/invalidate` / `cache/set` / `cache/remove` events from Flux effects, keeps the L1 `sharedFetchCache` in sync, and attaches the client to the app instance for internal React consumption
  - `queryCacheShared()` framework plugin at L2 — required for separately mounted child roots (including MFE apps): joins the existing host `QueryClient` from `queryCache()` without creating a second client; may register before the host runtime and attach when the host initializes
  - `HAI3Provider` resolves the shared `QueryClient` from the app instance for both `queryCache()` and `queryCacheShared()` compositions (not creating its own)
  - Restricted `QueryCache` interface (`get`, `getState`, `set` with updater, `cancel`, `invalidate`, `invalidateMany`, `remove`) accepts `EndpointDescriptor | QueryKey` — exposed via `useQueryCache()` and injected into mutation callbacks
  - `useApiQuery(descriptor)` hook for declarative single-page reads — returns `ApiQueryResult<TData>` (HAI3-owned type)
  - `useApiSuspenseQuery(descriptor)` hook for Suspense-driven single-page reads — returns `ApiSuspenseQueryResult<TData>` (HAI3-owned type)
  - `useApiInfiniteQuery({ initialPage, getNextPage, getPreviousPage? })` hook for descriptor-driven paginated reads — returns `ApiInfiniteQueryResult<TPage>` (HAI3-owned type)
  - `useApiSuspenseInfiniteQuery({ initialPage, getNextPage, getPreviousPage? })` hook for Suspense-driven paginated reads — returns `ApiSuspenseInfiniteQueryResult<TPage>` (HAI3-owned type)
  - `useApiMutation({ endpoint, ... })` hook for declarative writes — returns `ApiMutationResult<TData>` (HAI3-owned type)
  - `useApiStream(descriptor, options?)` hook for declarative SSE streaming — returns `ApiStreamResult<TEvent>` (HAI3-owned type) with `'latest'`/`'accumulate'` modes and automatic connect/disconnect lifecycle
  - Event-based cache updates for L2 Flux effects (`cache/invalidate`, `cache/set`, and `cache/remove` handled by the host `queryCache()` plugin; joined child apps reuse the same client)
  - Flux escape hatch for cross-feature orchestration

- **Out of scope**:
  - SSE-to-cache integration for query invalidation (known gap — event-based `cache/update` pattern deferred; `useApiStream` provides reactive state but does not write to `QueryCache` automatically)
  - SSE cancellation (handled by `SseProtocol.disconnect()` and `useApiStream` unmount cleanup)
  - Custom cache storage backends (TanStack Query uses in-memory cache)
  - Server-side rendering / hydration support
  - GraphQL protocol support (descriptors are protocol-agnostic by design but only REST is implemented)

- **Requirements Covered**:

  - `cpt-frontx-fr-sdk-api-package`
  - `cpt-frontx-fr-sdk-react-layer`
  - `cpt-frontx-fr-api-endpoint-descriptors`
  - `cpt-frontx-fr-sse-stream-descriptors`
  - `cpt-frontx-fr-framework-query-cache-plugin`

- **Design Principles Covered**:

  - `cpt-frontx-principle-layer-isolation` (descriptors at L1, `queryCache()` / `queryCacheShared()` plugins at L2, hooks at L3)

- **Design Constraints Covered**:

  - `cpt-frontx-constraint-no-react-below-l3`
  - `cpt-frontx-constraint-zero-cross-deps-at-l1`

- **Domain Model Entities**:
  - (No new domain entities — extends existing API and React layers)

- **Design Components**:

  - `cpt-frontx-component-api`
  - `cpt-frontx-component-react`

- **API**:
  - `RestProtocol.get(url, { signal })` / `.post()` / `.put()` / `.patch()` / `.delete()`
  - `RestEndpointProtocol.query<TData>(path, options?)` → `EndpointDescriptor<TData>` (always GET)
  - `RestEndpointProtocol.queryWith<TData, TParams>(pathFn, options?)` → `ParameterizedEndpointDescriptor<TData, TParams>` (always GET)
  - `RestEndpointProtocol.mutation<TData, TVariables>(method, path)` → `MutationDescriptor<TData, TVariables>`
  - `SseStreamProtocol.stream<TEvent>(path, options?)` → `StreamDescriptor<TEvent>` — routes through `SseProtocol` plugin chain
  - `queryCache(config?)` framework plugin — creates and owns the host shared `QueryClient`
  - `queryCacheShared()` framework plugin — joins the host `QueryClient` for child roots (no second client; host `queryCache()` runtime must exist or attach when it appears)
  - `useApiQuery(descriptor)` → `ApiQueryResult<TData>` — caching, dedup, cancel on unmount
  - `useApiSuspenseQuery(descriptor)` → `ApiSuspenseQueryResult<TData>` — Suspense-driven reads with descriptor-based cancellation and refetch
  - `useApiInfiniteQuery({ initialPage, getNextPage, getPreviousPage? })` → `ApiInfiniteQueryResult<TPage>` — paginated reads, adjacent-page descriptor resolution, cancel on unmount
  - `useApiSuspenseInfiniteQuery({ initialPage, getNextPage, getPreviousPage? })` → `ApiSuspenseInfiniteQueryResult<TPage>` — Suspense-driven paginated reads with descriptor-based adjacent-page resolution
  - `useApiMutation({ endpoint, onMutate, onSuccess, onError, onSettled })` → `ApiMutationResult<TData>` — callbacks receive `{ queryCache }`
  - `useApiStream(descriptor, options?)` → `ApiStreamResult<TEvent>` — connect on mount, disconnect on unmount, `'latest'`/`'accumulate'` modes
  - `QueryCache` interface: `get`, `getState`, `set` (value or updater), `cancel`, `invalidate`, `invalidateMany`, `remove` — accepts `EndpointDescriptor | QueryKey`
  - Cache keys derived automatically: `[baseURL, 'GET', path]` for static reads, `[baseURL, 'GET', resolvedPath, params]` for parameterized reads, `[baseURL, method, path]` for writes, `[baseURL, 'SSE', path]` for streams — no manual key factories

- **Sequences**:
  - None

- **Data**:
  - N/A (client-side library)

- **ADRs**:

  - `cpt-frontx-adr-tanstack-query-data-management`

### 2.13 [Performance Telemetry](feature-perf-telemetry/) ⏳ MEDIUM

- [x] `p2` - **ID**: `cpt-frontx-feature-perf-telemetry`

- **Purpose**: Provides action-first frontend performance telemetry via OpenTelemetry Browser SDK. Every span belongs to a named action (explicit or ambient fallback), enabling per-action performance breakdown in Datadog APM. Includes a Studio dev panel for local visibility.

- **Depends On**: None (L1 SDK, zero @cyberfabric dependencies)

- **Scope**:
  - `@cyberfabric/perf-telemetry` L1 SDK package (action-scope, otel-init, hooks, TelemetryProvider, telemetry-store)
  - Framework `telemetry()` plugin (opt-in via full preset config)
  - Studio `PerfTelemetryPanel` section (dev-mode, renders when package installed)
  - Cross-runtime `sharedTelemetryRegistry` on `globalThis` so MFE child runtimes converge on a single host-owned `telemetryStore`
  - Docker OTel Collector -> Datadog export infrastructure
  - AI guidelines: `.ai/targets/PERF_TELEMETRY.md`, `.ai/references/telemetry/*`

- **Out of scope**:
  - Backend/server-side telemetry
  - Custom Datadog dashboard creation
  - Production collector infrastructure (only local dev collector provided)

- **Requirements Covered**:

  - [x] `p1` - `cpt-frontx-fr-perf-action-first-correlation`
  - [x] `p1` - `cpt-frontx-fr-perf-route-instrumentation`
  - [x] `p1` - `cpt-frontx-fr-perf-action-instrumentation`
  - [x] `p1` - `cpt-frontx-fr-perf-api-instrumentation`
  - [x] `p1` - `cpt-frontx-fr-perf-web-vitals`
  - [x] `p2` - `cpt-frontx-fr-perf-studio-panel`
  - [x] `p1` - `cpt-frontx-fr-perf-fail-open`
  - [ ] `p1` - `cpt-frontx-fr-perf-cross-runtime-registry`

- **Design Principles Covered**:
  - Action-first correlation (no orphan spans)
  - Fail-open (telemetry errors never crash UX)
  - Cross-runtime convergence via `globalThis` registry (matches `sharedFetchCache` precedent)

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-frontx-constraint-typescript-strict-mode`
  - [x] `p1` - `cpt-frontx-constraint-zero-cross-deps-at-l1` (L1 SDK)

- **Domain Model Entities**:
  - ActionScope, RouteUiScope, StoredSpan, TelemetryRuntimeConfig, SharedTelemetryRegistry

- **Design Components**:

  - [x] `p1` - `cpt-frontx-component-perf-telemetry`
  - [x] `p2` - `cpt-frontx-component-studio-perf-panel`

- **API**:
  - `useRoutePerf(routeId, navigationStartMs)`
  - `useDoneRendering(signalName, { dataReady })`
  - `useTelemetryAction(actionName, { routeId })`
  - `useWebVitals(routeId)`
  - `instrumentedFetch(url, meta, init)`
  - `TelemetryProvider` React context
  - `telemetryStore.subscribe()` for dev panel
  - `sharedTelemetryRegistry.acquire(runtimeId)` / `release(runtimeId)` for cross-runtime span aggregation

- **Sequences**:
  - Action lifecycle: create span -> register scope -> execute work -> end scope -> export
  - Ambient resolution: search active -> search recent -> create ambient
  - Cross-runtime join: child `initOtel` -> resolve `globalThis[Symbol.for('frontx:telemetry-registry')]` -> retain shared store -> append spans -> release on `shutdownOtel`

- **Data**:
  - In-memory span buffer (max 500, TelemetryStoreProcessor)
  - localStorage: `frontx:studio:perfTelemetry` (panel toggle)
  - `globalThis[Symbol.for('frontx:telemetry-registry')]`: versioned `SharedTelemetryRegistry`

---

## 3. Feature Dependencies

```text
cpt-frontx-feature-state-management          (L1, no deps)
cpt-frontx-feature-screenset-registry        (L1, no deps)
cpt-frontx-feature-api-communication         (L1, no deps)
cpt-frontx-feature-i18n-infrastructure       (L1, no deps)
cpt-frontx-feature-perf-telemetry            (L1 SDK, no deps)
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
    │       requires: framework-composition
    │
    └─→ cpt-frontx-feature-request-lifecycle
            requires: api-communication, react-bindings,
                      framework-composition
```

**Dependency Rationale**:

- `cpt-frontx-feature-mfe-isolation` requires `cpt-frontx-feature-screenset-registry`: blob URL loader operates on screen-set registry entries and MFE contracts
- `cpt-frontx-feature-framework-composition` requires all four L1 features: framework composes all SDK packages via plugin system
- `cpt-frontx-feature-react-bindings` requires `cpt-frontx-feature-framework-composition`: React layer consumes the built framework output
- `cpt-frontx-feature-request-lifecycle` requires `cpt-frontx-feature-api-communication` (AbortSignal and descriptors at L1), `cpt-frontx-feature-framework-composition` (`queryCache()` / `queryCacheShared()` plugins at L2), and `cpt-frontx-feature-react-bindings` (TanStack Query hooks and provider resolution at L3)
- `cpt-frontx-feature-ui-libraries-choice` requires `cpt-frontx-feature-cli-tooling`: CLI commands (`frontx create`, `frontx screenset`) implement the UI kit scaffolding
- All L1 features, standalone features, and publishing-pipeline are independent and can be developed in parallel
