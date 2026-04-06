# Technical Design — FrontX Dev Kit

<!-- artifact-version: 1.1 -->

<!-- toc -->

- [1. Architecture Overview](#1-architecture-overview)
  - [1.1 Architectural Vision](#11-architectural-vision)
  - [1.2 Architecture Drivers](#12-architecture-drivers)
  - [1.3 Architecture Layers](#13-architecture-layers)
- [2. Principles & Constraints](#2-principles--constraints)
  - [2.1 Design Principles](#21-design-principles)
  - [2.2 Constraints](#22-constraints)
- [3. Technical Architecture](#3-technical-architecture)
  - [3.1 Domain Model](#31-domain-model)
  - [3.2 Component Model](#32-component-model)
  - [3.3 API Contracts](#33-api-contracts)
  - [3.4 Internal Dependencies](#34-internal-dependencies)
  - [3.5 External Dependencies](#35-external-dependencies)
  - [3.6 Interactions & Sequences](#36-interactions--sequences)
  - [3.7 Database schemas & tables](#37-database-schemas--tables)
- [3.8 Publishing Pipeline Architecture](#38-publishing-pipeline-architecture)
- [4. Additional context](#4-additional-context)
- [5. Traceability](#5-traceability)

<!-- /toc -->

## 1. Architecture Overview

### 1.1 Architectural Vision

FrontX is a four-layer monorepo architecture that separates concerns vertically by abstraction level and horizontally by domain. The lowest layer (L1 SDK) provides framework-agnostic primitives for state, API communication, localization, and screen-set contracts. The middle layer (L2 Framework) composes these primitives through a plugin system. The upper layer (L3 React) binds the framework to React 19. Standalone packages (`@cyberfabric/studio`, `@cyberfabric/cli`) operate outside the layer hierarchy with minimal coupling, while UI implementation remains app-owned.

This layering enforces a strict dependency direction: higher layers depend on lower layers, never the reverse. L1 packages have zero cross-dependencies, meaning any SDK package can be used in isolation — in a Node.js CLI, a web worker, or a non-React rendering engine. The plugin architecture at L2 means the framework never needs modification to add capabilities; all extensions compose through `createHAI3().use(plugin).build()`.

The architecture is event-driven throughout. Components communicate exclusively through a typed event bus. The data flow follows a fixed sequence — Action → Event → Effect → Reducer → Store — enforced by convention and tooling. This eliminates ad-hoc state mutations, makes the system traceable, and enables microfrontend isolation where each MFE has its own internal data flow that connects to the host only through declared shared properties and events.

### 1.2 Architecture Drivers

Requirements that significantly influence architecture decisions.

**ADRs**:
`cpt-frontx-adr-four-layer-sdk-architecture`,
`cpt-frontx-adr-event-driven-flux-dataflow`,
`cpt-frontx-adr-plugin-based-framework-composition`,
`cpt-frontx-adr-blob-url-mfe-isolation`,
`cpt-frontx-adr-esm-first-module-format`,
`cpt-frontx-adr-screenset-vertical-slice-isolation`,
`cpt-frontx-adr-mandatory-screen-lazy-loading`,
`cpt-frontx-adr-hybrid-namespace-localization`,
`cpt-frontx-adr-standalone-studio-dev-conditional`,
`cpt-frontx-adr-protocol-separated-api-architecture`,
`cpt-frontx-adr-react-19-ref-as-prop`,
`cpt-frontx-adr-automated-layer-ordered-publishing`,
`cpt-frontx-adr-symbol-based-mock-plugin-identification`,
`cpt-frontx-adr-global-shared-property-broadcast`,
`cpt-frontx-adr-cli-template-based-code-generation`,
`cpt-frontx-adr-two-tier-cli-e2e-verification`,
`cpt-frontx-adr-channel-aware-version-locking`

#### Functional Drivers

| Requirement | Design Response |
|-------------|------------------|
| `cpt-frontx-fr-sdk-flat-packages` | Four separate L1 packages with independent `package.json`; npm workspaces for monorepo orchestration |
| `cpt-frontx-fr-sdk-layer-deps` | Strict layer dependency graph enforced by `dependency-cruiser` rules: L3→L2→L1 only |
| `cpt-frontx-fr-sdk-plugin-arch` | `createHAI3()` builder at L2 with `use()` chaining; each plugin receives `HAI3PluginContext` |
| `cpt-frontx-fr-sdk-action-pattern` | All mutations flow through `createAction()` → eventBus dispatch → effect handler → Redux reducer |
| `cpt-frontx-fr-mfe-dynamic-registration` | Runtime MFE registration via `screensetsRegistryFactory.build()` with handler injection |
| `cpt-frontx-fr-blob-fresh-eval` | Blob URL isolation: each MFE bundle fetched, rewritten, and evaluated in a fresh blob context |
| `cpt-frontx-fr-blob-import-rewriting` | Import specifiers in MFE bundles rewritten to blob URLs via `importRewriter` before evaluation |
| `cpt-frontx-fr-dataflow-no-redux` | MFEs use internal `useReducer`/`useState`; no access to host Redux store |
| `cpt-frontx-fr-broadcast-write-api` | Shared properties bridge host↔MFE via `setSharedProperty()`/`useSharedProperty()` |
| `cpt-frontx-fr-appconfig-event-api` | Application-level config changes propagated via `app/*` events, not direct store mutations |
| `cpt-frontx-fr-sse-protocol` | `@cyberfabric/api` abstracts REST and SSE behind `createApiService()` with protocol-specific adapters |
| `cpt-frontx-fr-i18n-lazy-chunks` | Namespace-based lazy loading: translation chunks loaded on demand per screen-set |
| `cpt-frontx-fr-externalize-transform` | Vite plugin externalizes `@cyberfabric/*` imports in MFE builds; host provides shared scope at runtime |
| `cpt-frontx-fr-mfe-plugin` | `microfrontends()` plugin integrates MFE lifecycle, theme propagation, i18n, and shared property bridging into framework |
| `cpt-frontx-fr-mock-toggle` | `mock()` plugin with `toggleMockMode` action enabling runtime switch between real and mock API responses |
| `cpt-frontx-fr-sdk-state-interface` | `@cyberfabric/state` exports EventBus, `createStore`, slice management APIs, and all associated types |
| `cpt-frontx-fr-sdk-flux-terminology` | FrontX Flux terms (Action, Event, Effect, Reducer, Slice) used consistently; Redux terms excluded from public API |
| `cpt-frontx-fr-sdk-screensets-package` | `@cyberfabric/screensets` exports full MFE type system, registry, handler, bridge, and constants with zero `@cyberfabric/*` deps |
| `cpt-frontx-fr-sdk-api-package` | `@cyberfabric/api` exports `BaseApiService`, REST/SSE protocols, mock plugins, `apiRegistry`, and type guards; only `axios` as peer dep |
| `cpt-frontx-fr-sdk-i18n-package` | `@cyberfabric/i18n` exports I18nRegistry, Language enum, formatters, and metadata utilities with zero dependencies |
| `cpt-frontx-fr-sdk-framework-layer` | `@cyberfabric/framework` wires SDK capabilities; depends only on SDK packages, provides `createHAI3()` and `createHAI3App()` |
| `cpt-frontx-fr-sdk-react-layer` | `@cyberfabric/react` depends only on `@cyberfabric/framework`; provides `HAI3Provider` and typed hooks; no layout components |
| `cpt-frontx-fr-sdk-module-augmentation` | TypeScript module augmentation for `EventPayloadMap` and `RootState` extensibility; custom events type-safe |
| `cpt-frontx-fr-appconfig-tenant` | `Tenant` type with `{ id: string }`; tenant change events via event bus (`app/tenant/changed`, `app/tenant/cleared`) |
| `cpt-frontx-fr-appconfig-router-config` | `HAI3Config.routerMode` supporting `'browser'`, `'hash'`, `'memory'` routing strategies |
| `cpt-frontx-fr-appconfig-layout-visibility` | Imperative actions (`setFooterVisible`, `setMenuVisible`, `setSidebarVisible`) control layout region visibility |
| `cpt-frontx-fr-sse-mock-mode` | `SseMockPlugin` short-circuits `EventSource` creation; returns `MockEventSource` for dev/test environments |
| `cpt-frontx-fr-sse-protocol-registry` | `BaseApiService` uses protocol registry; protocols registered by constructor name via type-safe `protocol<T>()` |
| `cpt-frontx-fr-sse-type-safe-events` | SSE events typed via `EventPayloadMap` module augmentation for compile-time safety |
| `cpt-frontx-fr-mfe-entry-types` | `MfeEntry`, `MfeEntryMF`, `Extension`, `ScreenExtension` types define MFE communication contracts |
| `cpt-frontx-fr-mfe-ext-domain` | `ExtensionDomain` type defines id, sharedProperties, actions, lifecycleStages, and timeout contract |
| `cpt-frontx-fr-mfe-shared-property` | `SharedProperty` type with `id: string` and `value: unknown`; constants are GTS type IDs |
| `cpt-frontx-fr-mfe-action-types` | `Action` and `ActionsChain` types enable chain-based MFE action execution with fallback support; action `type` values are GTS schema type IDs (trailing `~`); extension references in payloads use `subject` field |
| `cpt-frontx-fr-mfe-theme-propagation` | `themes()` plugin propagates theme changes to all MFE extensions via `screensetsRegistry.updateSharedProperty()` |
| `cpt-frontx-fr-mfe-i18n-propagation` | `i18n()` plugin propagates language changes to all MFE extensions via `screensetsRegistry.updateSharedProperty()` |
| `cpt-frontx-fr-blob-no-revoke` | Blob URLs kept alive for page lifetime; `URL.revokeObjectURL()` never called after `import()` resolves |
| `cpt-frontx-fr-blob-source-cache` | In-memory cache of fetched source text keyed by chunk URL; at most one network fetch per chunk across all loads |
| `cpt-frontx-fr-blob-recursive-chain` | `createBlobUrlChain` recursively creates blob URLs for chunk and all static dependencies |
| `cpt-frontx-fr-blob-per-load-map` | `blobUrlMap` scoped per MFE load; different loads have independent instances preventing cross-load reuse |
| `cpt-frontx-fr-externalize-filenames` | Shared dependency chunks use deterministic filenames without content hashes for stable MFE manifests |
| `cpt-frontx-fr-externalize-build-only` | `hai3-mfe-externalize` plugin operates at `vite build` only; does not transform imports during `vite dev` |
| `cpt-frontx-fr-dataflow-internal-app` | Each MFE creates isolated `HAI3App` via `createHAI3().use(effects()).use(mock()).build()` with `HAI3Provider` |
| `cpt-frontx-fr-sharescope-construction` | `MfeHandlerMF` constructs `shareScope` from manifest, writes to `globalThis.__federation_shared__` |
| `cpt-frontx-fr-sharescope-concurrent` | Concurrent MFE loads have independent `LoadBlobState`; at most one network fetch per chunk URL |
| `cpt-frontx-fr-broadcast-matching` | `updateSharedProperty()` propagates only to domains declaring the property in their `sharedProperties` array |
| `cpt-frontx-fr-broadcast-validate` | GTS validation occurs before propagation; invalid values never stored or broadcast to any domain |
| `cpt-frontx-fr-validation-gts` | `typeSystem.register()` + `typeSystem.validateInstance()` pattern validates shared property values |
| `cpt-frontx-fr-validation-reject` | `updateSharedProperty()` throws with validation details on failure; value not stored or propagated |
| `cpt-frontx-fr-i18n-formatters` | Locale-aware formatters (`formatDate`, `formatNumber`, `formatCurrency`, etc.) using `Intl.*` APIs |
| `cpt-frontx-fr-i18n-formatter-exports` | Formatters exported from `@cyberfabric/i18n`, re-exported from `@cyberfabric/framework`, accessible via `useFormatters()` |
| `cpt-frontx-fr-i18n-graceful-invalid` | All formatters return `''` for null, undefined, or invalid inputs; never throw |
| `cpt-frontx-fr-i18n-hybrid-namespace` | Two-tier namespaces: `screenset.<id>` for shared content, `screen.<setId>.<screenId>` for screen-specific |
| `cpt-frontx-fr-studio-panel` | `StudioPanel` floating overlay: draggable, resizable, collapsible; visible only in dev mode; state in localStorage |
| `cpt-frontx-fr-studio-controls` | StudioPanel provides: theme selector, MFE package selector, language selector, mock/real API toggle |
| `cpt-frontx-fr-studio-persistence` | Theme, language, mock API state, GTS package persisted to localStorage; restored on Studio mount |
| `cpt-frontx-fr-studio-viewport` | Studio button and panel clamped to viewport (20px margin) on load and window resize |
| `cpt-frontx-fr-studio-independence` | `@cyberfabric/studio` standalone package; `"sideEffects": false`; excluded from production via `import.meta.env.DEV` |
| `cpt-frontx-fr-cli-package` | `@cyberfabric/cli` workspace package with binary `frontx`; ESM (Node 18+) and programmatic API |
| `cpt-frontx-fr-cli-commands` | CLI commands: create, update, scaffold layout/screenset, validate components, ai sync, migrate |
| `cpt-frontx-fr-cli-templates` | Template system with `copy-templates.ts` build script, `manifest.json`; templates are user-owned |
| `cpt-frontx-fr-cli-skills` | CLI build generates IDE guidance files and command adapters for Claude, Cursor, Windsurf, and GitHub Copilot |
| `cpt-frontx-fr-cli-e2e-verification` | Two-tier CI verification: required PR workflow (`cli-pr-e2e`) validates critical scaffold path; nightly workflow covers broader scenarios; shared scripted harness with artifact upload |
| `cpt-frontx-fr-pub-metadata` | All `@cyberfabric/*` packages include complete NPM metadata: author, license, repository, engines, exports |
| `cpt-frontx-fr-pub-versions` | All `@cyberfabric/*` packages use aligned (same) version numbers |
| `cpt-frontx-fr-pub-esm` | ESM-first module format: `"type": "module"`, dual exports (ESM + CJS), TypeScript declarations |
| `cpt-frontx-fr-pub-ci` | CI auto-publishes affected packages to NPM in layer order on version change merge; stops on first failure |

#### NFR Allocation

| NFR ID | NFR Summary | Allocated To | Design Response | Verification Approach |
|--------|-------------|--------------|-----------------|----------------------|
| `cpt-frontx-nfr-perf-lazy-loading` | Screensets and MFE code loaded on demand | `cpt-frontx-component-screensets`, `cpt-frontx-component-framework` | Dynamic `import()` per screen-set; MFE bundles fetched at registration time | Bundle analysis; network waterfall in DevTools |
| `cpt-frontx-nfr-perf-treeshake` | Unused SDK exports eliminated at build | `cpt-frontx-component-state`, all L1 packages | ESM-only output via tsup; no side-effect barrel files | `knip` unused-export detection in CI |
| `cpt-frontx-nfr-perf-blob-overhead` | Blob URL creation < 50ms for typical MFE | `cpt-frontx-component-screensets` | Source text cached after first fetch; import rewriting operates on string, not AST | Performance benchmark in test suite |
| `cpt-frontx-nfr-perf-action-timeout` | Actions complete or timeout within defined bounds | `cpt-frontx-component-state` | Effect handlers responsible for timeout; framework does not enforce global timeout | Unit tests with async action scenarios |
| `cpt-frontx-nfr-rel-error-handling` | Plugin/MFE errors do not crash host | `cpt-frontx-component-framework`, `cpt-frontx-component-react` | React error boundaries per MFE; plugin `init()` failures logged, not thrown | Integration tests with failing plugins |
| `cpt-frontx-nfr-rel-api-retry` | API calls support retry with backoff | `cpt-frontx-component-api` | Axios interceptor layer; retry configuration per service instance | Unit tests with mock server |
| `cpt-frontx-nfr-rel-serialization` | State serializable for persistence/debugging | `cpt-frontx-component-state` | Redux Toolkit enforces serializable state by default; custom middleware logs violations | Redux DevTools inspection |
| `cpt-frontx-nfr-sec-shadow-dom` | MFE CSS isolated from host | `cpt-frontx-component-react` | Shadow DOM wrapper for MFE render containers | Visual regression tests |
| `cpt-frontx-nfr-sec-csp-blob` | Blob URLs compatible with CSP policies | `cpt-frontx-component-screensets` | `blob:` scheme added to `script-src`; no `eval()` or `new Function()` used | CSP violation reporting in staging |
| `cpt-frontx-nfr-sec-type-validation` | Shared properties and actions validated at boundary | `cpt-frontx-component-framework` | GTS plugin validates shared property values against declared schemas; actions validated as anonymous instances (no `id`, schema resolved from `type` field) | Unit tests with invalid payloads and malformed actions |
| `cpt-frontx-nfr-compat-node` | Packages installable on Node ≥ 18 | All packages | `engines` field in each `package.json`; CI matrix tests Node 18/20/22 | CI build matrix |
| `cpt-frontx-nfr-compat-typescript` | TypeScript ≥ 5.5 | All packages | `tsconfig.json` targets ES2022; strict mode enabled | CI type-check step |
| `cpt-frontx-nfr-compat-esm` | ESM-first output | All packages | tsup configured with `format: ['esm']`; `"type": "module"` in `package.json` | Import resolution tests |
| `cpt-frontx-nfr-compat-react` | Compatible with React 19 | `cpt-frontx-component-react` | React 19 as peer dependency; `ref` as prop (no `forwardRef`) | CI tests against React 19 |
| `cpt-frontx-nfr-maint-zero-crossdeps` | L1 packages have zero cross-dependencies | All L1 packages | Each L1 `package.json` lists no `@cyberfabric/*` dependencies; `dependency-cruiser` rule blocks violations | CI dependency-cruiser check |
| `cpt-frontx-nfr-maint-event-driven` | Cross-domain communication via events only | `cpt-frontx-component-state`, `cpt-frontx-component-framework` | `eventBus` is the sole cross-domain channel; no direct store imports across domains | Architecture lint rules |
| `cpt-frontx-nfr-maint-arch-enforcement` | Layer violations detected automatically | Build system | `dependency-cruiser` config with forbidden dependency rules; `knip` for unused exports | CI gate on lint failure |

### 1.3 Architecture Layers

- [x] `p1` - **ID**: `cpt-frontx-tech-layer-architecture`

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
│          (Host app using @cyberfabric/* packages)           │
├─────────────────────────────────────────────────────┤
│ L3  @cyberfabric/react                                      │
│     HAI3Provider · hooks · MFE components            │
├─────────────────────────────────────────────────────┤
│ L2  @cyberfabric/framework                                  │
│     createHAI3() · plugins · layout slices           │
├────────┬────────┬──────────┬────────────────────────┤
│ L1     │ L1     │ L1       │ L1                      │
│ state  │ screen │ api      │ i18n                    │
│        │ sets   │          │                         │
├────────┴────────┴──────────┴────────────────────────┤
│ Standalone: @cyberfabric/studio · @cyberfabric/cli                            │
└─────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Technology |
|-------|---------------|------------|
| L1 SDK | Framework-agnostic primitives: state management, screen-set contracts, API protocols, i18n infrastructure | TypeScript, Redux Toolkit, Axios, i18next |
| L2 Framework | Plugin composition, layout orchestration, configuration management, re-exports SDK surface | TypeScript, Redux Toolkit (slices) |
| L3 React | React bindings, provider tree, hooks, MFE rendering components | React 19, Shadow DOM |
| Standalone — Studio | Development overlay for theme/i18n/state inspection | React 19, localStorage |
| Tooling — CLI | Scaffolding, code generation, AI skill integration | Node.js, Commander |

**Build order**: SDK (L1) → Framework (L2) → React (L3) → Studio → CLI (`npm run build:packages`)

## 2. Principles & Constraints

### 2.1 Design Principles

#### Event-Driven Architecture

- [x] `p1` - **ID**: `cpt-frontx-principle-event-driven-architecture`

**ADRs**: `cpt-frontx-adr-event-driven-flux-dataflow`

All cross-domain communication flows through a typed event bus (`eventBus` in `@cyberfabric/state`). No component may directly call methods on or import internal state from another domain. This ensures loose coupling, enables replay/debugging of all system interactions, and allows MFE extensions to participate in host events without tight integration.

The event bus uses a publish/subscribe model with typed event names and payloads. Framework plugins subscribe to events during initialization. Effects listen for specific events and dispatch state changes through reducers.

#### Layer Isolation

- [x] `p1` - **ID**: `cpt-frontx-principle-layer-isolation`

**ADRs**: `cpt-frontx-adr-four-layer-sdk-architecture`

Dependencies flow strictly downward: L3 → L2 → L1. No upward or lateral dependencies are permitted within the layer hierarchy. L1 packages have zero `@cyberfabric/*` dependencies. L2 depends only on L1 packages. L3 depends only on L2 (which re-exports L1 surface). This enables each layer to be tested, built, and versioned independently.

Standalone packages (`@cyberfabric/studio`, `@cyberfabric/cli`) exist outside the layer hierarchy and do not depend on framework or SDK packages, ensuring they can evolve independently. UI components are generated into or authored within application code rather than shipped as a shared workspace package.

#### Plugin-First Composition

- [x] `p1` - **ID**: `cpt-frontx-principle-plugin-first-composition`

**ADRs**: `cpt-frontx-adr-plugin-based-framework-composition`

All framework capabilities are delivered through plugins. The framework core (`createHAI3()`) is a minimal builder that assembles a plugin chain. Each plugin implements the `HAI3Plugin` interface with an `init(context: HAI3PluginContext)` method. Plugins register slices, effects, event listeners, and UI extensions through the context object.

The host application composes its feature set by chaining `.use()` calls: `createHAI3().use(microfrontends()).use(myDomainPlugin()).build()`. No framework source code needs modification to add capabilities.

#### Self-Registering Registries

- [x] `p2` - **ID**: `cpt-frontx-principle-self-registering-registries`

Registries (screensets, themes, API services, routes, i18n namespaces) populate themselves at import time through side-effect registrations. Consumers never edit a central registry file to add entries. Each screen-set, component, or service registers itself in its own module. The registry root file only provides the registry factory/accessor — it never contains an item list.

This eliminates merge conflicts on registry files and enables tree-shaking of unused registrations.

#### Action → Event → Effect → Reducer Flux

- [x] `p1` - **ID**: `cpt-frontx-principle-action-event-effect-reducer-flux`

**ADRs**: `cpt-frontx-adr-event-driven-flux-dataflow`

All state mutations follow a fixed sequence: (1) Component calls `createAction()`, (2) action dispatches an event via `eventBus`, (3) registered effects handle the event (API calls, validation, side effects), (4) effects dispatch Redux actions, (5) reducers produce new state. Components never dispatch Redux actions directly. This ensures every state change is traceable and debuggable.

The terminology follows Redux Toolkit conventions: slices, reducers, selectors, thunks — but wrapped in FrontX's action/event abstraction to enforce the data flow pattern.

#### MFE Isolation

- [x] `p1` - **ID**: `cpt-frontx-principle-mfe-isolation`

**ADRs**: `cpt-frontx-adr-blob-url-mfe-isolation`

Microfrontend extensions execute in an isolated context. JavaScript isolation is achieved through blob URL evaluation: each MFE bundle is fetched, its import specifiers are rewritten to point to blob URLs of shared dependencies, and the rewritten bundle is evaluated in a new module scope. CSS isolation uses Shadow DOM containers. MFEs have no access to the host Redux store; they communicate with the host exclusively through shared properties and the event bus.

### 2.2 Constraints

#### No React Below L3

- [x] `p1` - **ID**: `cpt-frontx-constraint-no-react-below-l3`

**ADRs**: `cpt-frontx-adr-four-layer-sdk-architecture`

L1 SDK and L2 Framework packages SHALL NOT import React or any React-specific APIs. This ensures the SDK and framework are usable in non-React environments (Node.js scripts, web workers, alternative renderers). React appears only in L3 (`@cyberfabric/react`) and standalone packages (`@cyberfabric/studio`).

**Enforcement**: `dependency-cruiser` rules flag any `react` import in `packages/state/`, `packages/screensets/`, `packages/api/`, `packages/i18n/`, or `packages/framework/`.

#### Zero Cross-Dependencies at L1

- [x] `p1` - **ID**: `cpt-frontx-constraint-zero-cross-deps-at-l1`

**ADRs**: `cpt-frontx-adr-four-layer-sdk-architecture`

No L1 SDK package may depend on another L1 SDK package. `@cyberfabric/state` SHALL NOT import from `@cyberfabric/api`, `@cyberfabric/i18n`, or `@cyberfabric/screensets`, and vice versa. This keeps each SDK package independently deployable and prevents coupling between orthogonal concerns.

**Enforcement**: Each L1 `package.json` is verified in CI to contain zero `@cyberfabric/*` entries in `dependencies` or `devDependencies`.

#### No Package Internals Imports

- [x] `p2` - **ID**: `cpt-frontx-constraint-no-package-internals-imports`

Consumers SHALL NOT import from sub-paths of workspace packages (e.g., `@cyberfabric/state/src/eventBus`). All public API is exported through the package entry point. Internal module structure is an implementation detail that may change without notice.

**Enforcement**: ESLint rule + `dependency-cruiser` forbidden path pattern `@cyberfabric/*/src/*`.

#### No Barrel Exports for Registries

- [x] `p2` - **ID**: `cpt-frontx-constraint-no-barrel-exports-for-registries`

Registry root files SHALL NOT re-export individual registry items. Each registered item (screen-set, component, service) self-registers via side-effect import. The registry file provides only the factory, accessor, or type — never the item list. This prevents barrel files from defeating tree-shaking and eliminates merge conflicts on central export lists.

#### TypeScript Strict Mode

- [x] `p1` - **ID**: `cpt-frontx-constraint-typescript-strict-mode`

All packages compile with `"strict": true` in `tsconfig.json`. Use of `any`, `as unknown as`, or `@ts-ignore` is forbidden. Type safety is enforced at compile time across all layers. Module augmentation (`declare module`) is the approved mechanism for extending framework types from plugins.

**Enforcement**: CI type-check step with `tsc --noEmit`; ESLint `@typescript-eslint/no-explicit-any` rule.

#### ESM-First Module Format

- [x] `p1` - **ID**: `cpt-frontx-constraint-esm-first-module-format`

**ADRs**: `cpt-frontx-adr-esm-first-module-format`

All packages output ESM as the primary module format. `package.json` files include `"type": "module"` and `"exports"` field with ESM entry points. CJS is not supported. This ensures compatibility with modern bundlers, enables tree-shaking, and aligns with the platform direction of Node.js and browsers.

**Enforcement**: tsup build configuration with `format: ['esm']`; `package.json` validation in CI.

## 3. Technical Architecture

### 3.1 Domain Model

**Technology**: TypeScript interfaces and types

**Core Entities**:

| Entity | Description | Location |
|--------|-------------|----------|
| ScreenSet | A named collection of screens registered at runtime; the primary unit of UI composition | `packages/screensets/src/types.ts` |
| Screen | A single view within a screen-set; may contain components and MFE slots | `packages/screensets/src/types.ts` |
| Component | A React UI element authored in app-owned UI folders such as `components/ui/` | Per-MFE/screenset or generated app source |
| Microfrontend | An externally-built UI bundle loaded at runtime via blob URL isolation | `packages/screensets/src/mfe/` |
| State (Store) | Redux Toolkit store composed from plugin-registered slices | `packages/state/src/store.ts` |
| Event | A typed message on the event bus; carries a name and payload | `packages/state/src/eventBus.ts` |
| Action | A domain operation that dispatches events; created via `createAction()` | `packages/state/src/actions.ts` |
| Effect | An event handler that performs side effects and dispatches reducers | `packages/state/src/effects.ts` |
| Plugin | A framework extension implementing `HAI3Plugin` interface | `packages/framework/src/plugin.ts` |
| SharedProperty | A typed value bridging host and MFE state; validated at boundaries | `packages/framework/src/sharedProperty.ts` |

**Relationships**:
- ScreenSet → Screen: contains one or more
- Screen → Component: renders zero or more
- Screen → Microfrontend: hosts zero or more as extension slots
- Plugin → State: registers slices and effects during init
- Plugin → Event: subscribes to and publishes events
- Microfrontend → SharedProperty: reads/writes declared shared values
- Action → Event → Effect → State: fixed data flow sequence

### 3.2 Component Model

```
┌───────────────────────────────────────────────────────────┐
│                      Host Application                      │
│                                                           │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ @cyberfabric/  │  │  @cyberfabric/react │  │  app-owned UI        │ │
│  │ studio  │  │  HAI3Provider │  │  components          │ │
│  └─────────┘  │  hooks        │  └──────────────────────┘ │
│               │  MfeContainer │                           │
│               └──────┬───────┘                            │
│                      │ depends on                         │
│               ┌──────▼───────┐                            │
│               │ @cyberfabric/       │                            │
│               │ framework    │                            │
│               │ createHAI3() │                            │
│               │ plugins      │                            │
│               └──┬──┬──┬──┬─┘                            │
│           depends│  │  │  │on                             │
│     ┌────────┬──┘  │  │  └──┬────────┐                   │
│     ▼        ▼     ▼  ▼     ▼        │                   │
│  ┌──────┐ ┌──────┐ ┌────┐ ┌─────┐   │                   │
│  │state │ │screen│ │api │ │i18n │   │                   │
│  │      │ │sets  │ │    │ │     │   │                   │
│  └──────┘ └──────┘ └────┘ └─────┘   │                   │
│    L1       L1       L1     L1       │                   │
│  (no cross-dependencies)      ┌──────▼─┐                 │
│                               │@cyberfabric/  │                 │
│                               │cli     │                 │
│                               └────────┘                 │
└───────────────────────────────────────────────────────────┘
```

#### @cyberfabric/state (L1)

- [x] `p1` - **ID**: `cpt-frontx-component-state`

##### Why this component exists

Provides the foundational state management and event infrastructure that all other packages build upon. Without a shared event bus and store abstraction, each package would implement its own state patterns, leading to fragmented debugging and untraceable data flow.

##### Responsibility scope

- **Event bus**: Typed publish/subscribe messaging (`eventBus.publish()`, `eventBus.subscribe()`) for all cross-domain communication
- **Store factory**: Creates and configures Redux Toolkit store with dynamically registered slices
- **Action factory**: `createAction()` produces typed action creators that dispatch events
- **Effect system**: Registers effect handlers that respond to events and produce state changes
- **Flux terminology**: Enforces Action → Event → Effect → Reducer naming and flow conventions
- **Module augmentation**: Supports `declare module '@cyberfabric/state'` for type-safe slice extensions

##### Responsibility boundaries

- Does NOT provide UI bindings (React hooks, components) — delegated to `cpt-frontx-component-react`
- Does NOT define domain-specific slices — each plugin registers its own slices
- Does NOT depend on any other `@cyberfabric/*` package
- Does NOT implement persistence or devtools — relies on Redux Toolkit's built-in middleware

##### Related components (by ID)

- `cpt-frontx-component-framework` — depends on: framework registers slices and effects via plugin context
- `cpt-frontx-component-react` — depends on: provides hooks (`useSelector`, `useDispatch`) over this store

#### @cyberfabric/screensets (L1)

- [x] `p1` - **ID**: `cpt-frontx-component-screensets`

##### Why this component exists

Defines the contract between the host application and microfrontend extensions. Manages the screen-set registry, MFE lifecycle, and blob URL isolation mechanism. Separating this from `@cyberfabric/state` keeps MFE concerns (loading, isolation, source caching) orthogonal to state management.

##### Responsibility scope

- **Screen-set registry**: `screensetsRegistryFactory` for registering/querying screen-sets with handler injection
- **MFE type contracts**: Entry types (component, screen, extension), domain declarations, shared property schemas, action schema type definitions (GTS schema type IDs with trailing `~`; payloads use `subject` for extension references)
- **Blob URL isolation**: Fetches MFE bundles, rewrites import specifiers to blob URLs, caches source text, manages per-load import maps
- **Import rewriting**: Transforms bare `@cyberfabric/*` specifiers in MFE bundles to blob URL references for runtime resolution
- **Recursive chain loading**: Resolves transitive dependencies by recursively blob-loading imported modules

##### Responsibility boundaries

- Does NOT render MFE content (React mounting) — delegated to `cpt-frontx-component-react`
- Does NOT manage theme or i18n propagation into MFEs — delegated to `cpt-frontx-component-framework`
- Does NOT depend on any other `@cyberfabric/*` package
- Does NOT handle CSS isolation (Shadow DOM) — delegated to rendering layer

##### Related components (by ID)

- `cpt-frontx-component-framework` — depends on: framework's `microfrontends()` plugin orchestrates MFE lifecycle using screensets API
- `cpt-frontx-component-react` — depends on: `MfeContainer` component renders loaded MFE content

#### @cyberfabric/api (L1)

- [x] `p1` - **ID**: `cpt-frontx-component-api`

##### Why this component exists

Provides a unified API service layer that abstracts protocol differences (REST, SSE) behind a consistent interface. Developers create services without coupling to a specific transport; the protocol adapter handles serialization, connection management, and error recovery.

##### Responsibility scope

- **Service factory**: `createApiService()` produces typed API service instances
- **Protocol registry**: Registers protocol adapters (REST via Axios, SSE via EventSource) that can be switched at runtime
- **REST adapter**: Standard HTTP operations with Axios; interceptors for auth, retry, error mapping
- **SSE adapter**: Server-Sent Events connection management with typed event streams
- **Mock mode**: `RestMockPlugin` and `SseMockPlugin` provide mock responses; `toggleMockMode` action switches at runtime
- **Type-safe events**: SSE event types are generic-parameterized for compile-time safety

##### Responsibility boundaries

- Does NOT define business-domain API endpoints — each domain plugin defines its own services
- Does NOT manage authentication tokens — relies on interceptors configured by the consumer
- Does NOT depend on any other `@cyberfabric/*` package
- Axios is a peer dependency, not bundled

##### Related components (by ID)

- `cpt-frontx-component-framework` — depends on: framework plugins use `createApiService()` to register domain APIs
- `cpt-frontx-component-state` — publishes to: API effects dispatch events on the event bus for state updates

#### @cyberfabric/i18n (L1)

- [x] `p1` - **ID**: `cpt-frontx-component-i18n`

##### Why this component exists

Provides internationalization infrastructure with support for 36 languages, locale-aware formatting, and namespace-based lazy loading. Centralizes i18n concerns so that screen-sets, MFEs, and host app share consistent translation patterns without monolithic language bundles.

##### Responsibility scope

- **Language support**: 36 built-in language configurations with locale metadata
- **Formatter exports**: Date, number, currency, relative-time formatters exported individually for tree-shaking
- **Namespace management**: Hybrid namespace model — global keys for shared translations, screen-set-scoped keys for domain-specific content
- **Lazy chunk loading**: Translation files loaded on demand per namespace; reduces initial bundle size
- **Graceful fallback**: Invalid format inputs return fallback strings rather than throwing

##### Responsibility boundaries

- Does NOT provide React hooks for translation — delegated to `cpt-frontx-component-react` (which wraps i18next React bindings)
- Does NOT contain translation content — only infrastructure; content provided by consuming applications
- Does NOT depend on any other `@cyberfabric/*` package

##### Related components (by ID)

- `cpt-frontx-component-framework` — depends on: framework initializes i18n and propagates language changes to MFEs
- `cpt-frontx-component-react` — depends on: provides `useTranslation()` hook wrapping i18n infrastructure

#### @cyberfabric/framework (L2)

- [x] `p1` - **ID**: `cpt-frontx-component-framework`

##### Why this component exists

Composes L1 SDK packages into a cohesive application framework through a plugin architecture. Without this layer, each application would need to manually wire state, API, i18n, and screensets together — a complex, error-prone process that would lead to inconsistent patterns across projects.

##### Responsibility scope

- **Builder API**: `createHAI3()` returns a builder with `.use(plugin)` chaining and `.build()` finalization
- **Plugin system**: `HAI3Plugin` interface with `init(context: HAI3PluginContext)`; context provides access to store, event bus, registries
- **Layout orchestration**: Layout slices (menu, header, footer, sidebars, overlay, popups) managed as Redux state
- **Configuration management**: `AppConfig` with tenant settings, router config, layout visibility, theme — propagated via `app/*` events
- **MFE lifecycle plugin**: `microfrontends()` plugin handles MFE registration, theme propagation, i18n forwarding, shared property bridge
- **Shared property system**: `setSharedProperty()` / `getSharedProperty()` with validation via GTS plugin
- **SDK re-exports**: Re-exports L1 public API so consumers can import from `@cyberfabric/framework` as a convenience

##### Responsibility boundaries

- Does NOT provide React components or hooks — delegated to `cpt-frontx-component-react`
- Does NOT define UI components — delegated to application/screenset local UI
- Does NOT implement blob URL isolation — uses `cpt-frontx-component-screensets` API
- Does NOT bundle L1 packages — re-exports only; each L1 remains independently installable

##### Related components (by ID)

- `cpt-frontx-component-state` — depends on: uses store, event bus, action/effect system
- `cpt-frontx-component-screensets` — depends on: uses registry factory and MFE contracts
- `cpt-frontx-component-api` — depends on: initializes API services and protocol adapters
- `cpt-frontx-component-i18n` — depends on: initializes i18n and manages language lifecycle
- `cpt-frontx-component-react` — depended on by: React layer consumes framework's builder output

#### @cyberfabric/react (L3)

- [x] `p1` - **ID**: `cpt-frontx-component-react`

##### Why this component exists

Bridges the framework layer to React 19, providing the provider tree, hooks, and MFE rendering components that application developers use directly. Separating React bindings into L3 allows the framework and SDK to remain framework-agnostic.

##### Responsibility scope

- **HAI3Provider**: Root provider component that wraps the application with Redux store, i18n context, theme, and framework context
- **Hooks**: `useSelector()`, `useDispatch()`, `useTranslation()`, `useSharedProperty()`, `useAction()` — typed wrappers over framework primitives
- **MFE rendering**: `MfeContainer` component that mounts MFE content inside Shadow DOM for CSS isolation
- **Error boundaries**: Per-MFE error boundaries preventing extension failures from crashing the host
- **Initialization sequence**: Orchestrates `themeRegistry → screensetsRegistryFactory.build() → domain registration → HAI3Provider`

##### Responsibility boundaries

- Does NOT define the store, event bus, or action system — uses `cpt-frontx-component-framework`
- Does NOT define UI component implementations — uses application/screenset local UI
- Does NOT manage MFE loading or blob URL creation — uses `cpt-frontx-component-screensets` via framework

##### Related components (by ID)

- `cpt-frontx-component-framework` — depends on: consumes builder output and plugin registrations
- `cpt-frontx-component-studio` — used by: studio panel renders inside the provider tree


##### Related components (by ID)

- `cpt-frontx-component-react` — used by: application renders UI within HAI3Provider
- `cpt-frontx-component-studio` — uses: studio panel uses local UI primitives for its controls

#### @cyberfabric/studio (Standalone)

- [x] `p1` - **ID**: `cpt-frontx-component-studio`

##### Why this component exists

Provides a development-time overlay for inspecting and tweaking theme, i18n, viewport, and state without leaving the running application. Accelerates the design iteration loop for screen-set authors.

##### Responsibility scope

- **Dev panel**: Toggleable overlay with sections for theme, i18n, state, and viewport inspection
- **Controls**: Theme switching, language selection, viewport size simulation
- **Persistence**: Panel state (open/closed, section visibility, preferences) stored in `localStorage`
- **Viewport simulation**: Responsive preview at configurable breakpoints
- **Build independence**: Excluded from production builds; no impact on production bundle

##### Responsibility boundaries

- Does NOT modify framework state directly — dispatches actions through the standard event flow
- Does NOT affect production builds — tree-shaken out when `process.env.NODE_ENV === 'production'`
- Minimal coupling: reads from store selectors, does not import framework internals

##### Related components (by ID)

- `cpt-frontx-component-react` — used by: renders inside HAI3Provider context

#### @cyberfabric/cli (Tooling)

- [x] `p2` - **ID**: `cpt-frontx-component-cli`

##### Why this component exists

Reduces boilerplate and enforces conventions by generating screen-sets, MFE packages, components, and configuration through interactive scaffolding commands. Integrates AI skills for assisted code generation.

##### Responsibility scope

- **Package**: Standalone npm package with `frontx` binary entry point
- **Commands**: `create` (project), `generate` (screen-set, MFE, component), `dev` (development server)
- **Templates**: EJS-based templates for screen-sets, MFE packages, components — each follows FrontX conventions
- **AI skills**: Embedded skill definitions for Claude Code / AI assistants to scaffold domain code

##### Responsibility boundaries

- Does NOT depend on runtime `@cyberfabric/*` packages — generates code that imports them
- Does NOT run at application runtime — CLI tool only
- Does NOT manage build or deployment — delegates to Vite and npm scripts

##### Related components (by ID)

- All packages — generates for: CLI templates produce code that imports from L1/L2/L3 packages

### 3.3 API Contracts

FrontX is a frontend framework; all API contracts are TypeScript interfaces consumed at build time. There are no REST/GraphQL server endpoints defined by FrontX itself.

- [x] `p1` - **ID**: `cpt-frontx-interface-plugin`
- **Contract**: cpt-frontx-contract-hai3-plugin
- **Technology**: TypeScript interface
- **Location**: `packages/framework/src/plugin.ts`

```typescript
interface HAI3Plugin {
  name: string;
  init(context: HAI3PluginContext): void | Promise<void>;
}

interface HAI3PluginContext {
  store: HAI3Store;
  eventBus: EventBus;
  registerSlice(slice: Slice): void;
  registerEffect(effect: Effect): void;
}
```

- [x] `p1` - **ID**: `cpt-frontx-interface-event-bus`
- **Contract**: cpt-frontx-contract-event-bus
- **Technology**: TypeScript interface
- **Location**: `packages/state/src/eventBus.ts`

```typescript
interface EventBus {
  publish<T>(event: string, payload: T): void;
  subscribe<T>(event: string, handler: (payload: T) => void): Unsubscribe;
}
```

- [x] `p1` - **ID**: `cpt-frontx-interface-screenset-registry`
- **Contract**: cpt-frontx-contract-screenset-registry
- **Technology**: TypeScript interface
- **Location**: `packages/screensets/src/registry.ts`

```typescript
interface ScreensetsRegistry {
  register(screenSet: ScreenSetDefinition): void;
  get(name: string): ScreenSetDefinition | undefined;
  getAll(): ScreenSetDefinition[];
}
```

- [x] `p1` - **ID**: `cpt-frontx-interface-api-service`
- **Contract**: cpt-frontx-contract-api-service
- **Technology**: TypeScript interface
- **Location**: `packages/api/src/service.ts`

```typescript
interface ApiService<T> {
  get(url: string, config?: RequestConfig): Promise<T>;
  post(url: string, data: unknown, config?: RequestConfig): Promise<T>;
  stream(url: string, config?: SseConfig): EventSource;
}
```

- [x] `p1` - **ID**: `cpt-frontx-interface-shared-property`
- **Contract**: cpt-frontx-contract-shared-property
- **Technology**: TypeScript interface
- **Location**: `packages/framework/src/sharedProperty.ts`

```typescript
interface SharedPropertyBridge {
  setSharedProperty(key: string, value: unknown): void;
  getSharedProperty<T>(key: string): T | undefined;
  onSharedPropertyChange<T>(key: string, handler: (value: T) => void): Unsubscribe;
}
```

- [ ] `p1` - **ID**: `cpt-frontx-interface-child-mfe-bridge`
- **Contract**: `cpt-frontx-interface-child-mfe-bridge`
- **Technology**: TypeScript interface
- **Location**: `packages/screensets/src/mfe/handler/types.ts`

```typescript
interface ChildMfeBridge {
  readonly domainId: string;
  readonly instanceId: string;
  executeActionsChain(chain: ActionsChain): Promise<void>;
  subscribeToProperty(propertyTypeId: string, callback: (value: SharedProperty) => void): () => void;
  getProperty(propertyTypeId: string): SharedProperty | undefined;
  registerActionHandler(handler: ActionHandler): void;
}
```

- [ ] `p1` - **ID**: `cpt-frontx-interface-parent-mfe-bridge`
- **Contract**: `cpt-frontx-interface-parent-mfe-bridge`
- **Technology**: TypeScript interface
- **Location**: `packages/screensets/src/mfe/handler/types.ts`

```typescript
interface ParentMfeBridge {
  readonly instanceId: string;
  dispose(): void;
}
```

- [ ] `p1` - **ID**: `cpt-frontx-interface-mfe-json-schemas`
- **Contract**: `cpt-frontx-interface-mfe-json-schemas`
- **Technology**: JSON / TypeScript interface
- **Location**: `mfe.json` (MFE package root), bootstrap loader (`src/app/mfe/bootstrap.ts`)

`mfe.json` carries an optional top-level `schemas` array of inline GTS JSON Schema objects. Each element is a standard JSON Schema with a GTS `$id` (e.g., `gts://gts.hai3.mfes.comm.action.v1~vendor.action.refresh.v1~`). The parent registers all schemas with `typeSystem.registerSchema()` before registering any entries or extensions, ensuring GTS validation is available for all action types declared in `domainActions`.

```json
{
  "manifest": { "..." : "..." },
  "schemas": [
    {
      "$id": "gts://gts.hai3.mfes.comm.action.v1~vendor.action.refresh.v1~",
      "type": "object",
      "properties": { "..." : "..." }
    }
  ],
  "entries": [ { "..." : "..." } ],
  "extensions": [ { "..." : "..." } ]
}
```

**Registration flow** (parent side):
1. Parse `mfe.json`.
2. FOR EACH schema in `mfe.json.schemas` (if present): call `typeSystem.registerSchema(schema)`. Deduplication is automatic — GTS overwrites any existing entry with the same `$id`.
3. Register entries and extensions as normal.

**Public Package Interfaces**

| Interface | Package | Description |
|-----------|---------|-------------|
| `cpt-frontx-interface-state` | `@cyberfabric/state` | Event-driven state management with EventBus, Redux-backed store, dynamic slice registration, and type-safe module augmentation |
| `cpt-frontx-interface-screensets` | `@cyberfabric/screensets` | MFE type system, ScreensetsRegistry, MfeHandler, MfeBridge, Shadow DOM utilities, GTS validation plugin, action/property constants |
| `cpt-frontx-interface-api` | `@cyberfabric/api` | Protocol-agnostic API layer with REST and SSE protocols, plugin chain, mock mode, type guards |
| `cpt-frontx-interface-i18n` | `@cyberfabric/i18n` | 36-language i18n registry, locale-aware formatters, RTL support, language metadata |
| `cpt-frontx-interface-framework` | `@cyberfabric/framework` | Plugin architecture with `createHAI3()` builder, presets, layout domain slices, effect coordination, re-exports all L1 APIs |
| `cpt-frontx-interface-react` | `@cyberfabric/react` | HAI3Provider, typed hooks, MFE hooks, ExtensionDomainSlot, RefContainerProvider, re-exports all L2 APIs |
| `cpt-frontx-interface-studio` | `@cyberfabric/studio` | Dev-only floating overlay with MFE package selector, theme/language/mock controls, persistence, viewport clamping |
| `cpt-frontx-interface-cli` | `@cyberfabric/cli` | Project scaffolding, code generation, migration runners, AI tool configuration sync |

**External Integration Contracts**

| Contract | Description |
|----------|-------------|
| `cpt-frontx-contract-mfe-manifest` | MFE packages provide a manifest (JSON) declaring remoteEntry, exposedModules, and sharedDependencies with optional chunkPath |
| `cpt-frontx-contract-federation-runtime` | Federation runtime's `importShared()` resolves from `globalThis.__federation_shared__` (compatible with vite-plugin-federation v1.4.x) |

### 3.4 Internal Dependencies

| Source Package | Target Package | Interface Used | Purpose |
|----------------|----------------|----------------|----------|
| `@cyberfabric/framework` | `@cyberfabric/state` | Store, EventBus, Action, Effect APIs | State management and event-driven communication |
| `@cyberfabric/framework` | `@cyberfabric/screensets` | ScreensetsRegistry, MFE contracts | MFE registration and lifecycle management |
| `@cyberfabric/framework` | `@cyberfabric/api` | ApiService factory, protocol registry | API service initialization and protocol adapter setup |
| `@cyberfabric/framework` | `@cyberfabric/i18n` | i18n init, namespace loader, formatters | Internationalization setup and language management |
| `@cyberfabric/react` | `@cyberfabric/framework` | Builder output, plugin context, layout slices | Provider tree construction and hook bindings |

**Dependency Rules**:
- No circular dependencies (enforced by `dependency-cruiser`)
- L1 packages have zero `@cyberfabric/*` dependencies
- L2 depends only on L1; L3 depends only on L2
- Standalone packages (`@cyberfabric/studio`, `@cyberfabric/cli`) sit outside the L1/L2/L3 dependency chain
- Cross-package imports use workspace names (`@cyberfabric/…`), never `../packages/*/src/*`

### 3.5 External Dependencies

#### React Ecosystem

| Dependency | Version | Used By | Purpose |
|-----------|---------|---------|---------|
| `react` | ^19.0.0 | `@cyberfabric/react`, `@cyberfabric/studio` | UI rendering, hooks, concurrent features |
| `react-dom` | ^19.0.0 | `@cyberfabric/react` | DOM mounting, Shadow DOM for MFE isolation |

#### State Management

| Dependency | Version | Used By | Purpose |
|-----------|---------|---------|---------|
| `@reduxjs/toolkit` | ^2.x | `@cyberfabric/state`, `@cyberfabric/framework` | Store creation, slice management, middleware |
| `react-redux` | ^9.x | `@cyberfabric/react` | React bindings for Redux store |

#### Build Toolchain

| Dependency | Version | Used By | Purpose |
|-----------|---------|---------|---------|
| `vite` | ^6.x | Build system | Development server, production bundling |
| `tsup` | ^8.x | All packages | TypeScript compilation to ESM |
| `typescript` | ^5.5 | All packages | Type checking, declaration generation |
| `tailwindcss` | ^3.x | Local MFE/screenset | Utility-first CSS |

#### UI Foundation

| Dependency | Version | Used By | Purpose |
|-----------|---------|---------|---------|
| `@radix-ui/*` | various | Local UI | Accessible headless UI primitives |
| `lucide-react` | ^0.x | Local UI | Icon system |
| `recharts` | ^2.x | Local UI | Chart components |
| `i18next` | ^23.x | `@cyberfabric/i18n` | Translation runtime |

#### HTTP & Networking

| Dependency | Version | Used By | Purpose |
|-----------|---------|---------|---------|
| `axios` | ^1.x | `@cyberfabric/api` (peer) | HTTP client for REST protocol adapter |

### 3.6 Interactions & Sequences

#### Application Bootstrap

**ID**: `cpt-frontx-seq-app-bootstrap`

**Use cases**: `cpt-frontx-usecase-mfe-load`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-runtime`

```mermaid
sequenceDiagram
    participant App as Host App
    participant Builder as createHAI3()
    participant Plugin as Plugins
    participant Registry as Registries
    participant Provider as HAI3Provider

    App->>Builder: createHAI3()
    App->>Builder: .use(microfrontends())
    App->>Builder: .use(domainPlugin())
    App->>Builder: .build()
    Builder->>Plugin: plugin.init(context)
    Plugin->>Registry: registerSlice(), registerEffect()
    Plugin->>Registry: screensetsRegistry.register()
    Builder-->>App: { store, config, registries }
    App->>Provider: <HAI3Provider config={...}>
    Provider->>Registry: themeRegistry init
    Provider->>Registry: screensetsRegistryFactory.build()
    Provider-->>App: Application rendered
```

**Description**: The host application creates a framework instance via the builder, chains plugins, and calls `.build()`. Each plugin initializes by registering its slices, effects, and registry entries through the context. The built configuration is passed to `HAI3Provider`, which orchestrates the initialization sequence: theme registry → screen-sets registry (with MFE handlers) → domain registration → render.

#### Screen-Set Data Flow

**ID**: `cpt-frontx-seq-screenset-data-flow`

**Use cases**: `cpt-frontx-usecase-mfe-load`

**Actors**: `cpt-frontx-actor-developer`, `cpt-frontx-actor-runtime`

```mermaid
sequenceDiagram
    participant C as Component
    participant A as Action
    participant EB as EventBus
    participant E as Effect
    participant R as Reducer
    participant S as Store
    participant V as View

    C->>A: createAction(payload)
    A->>EB: publish(eventName, payload)
    EB->>E: notify subscriber
    E->>E: Side effects (API, validation)
    E->>R: dispatch(reducerAction)
    R->>S: new state
    S->>V: useSelector() re-render
```

**Description**: A component triggers an action via `createAction()`. The action publishes a typed event on the event bus. Registered effects handle the event, perform side effects (API calls, validation), and dispatch Redux actions. Reducers produce new state, which triggers re-renders in subscribed components via `useSelector()`.

#### MFE Extension Loading

**ID**: `cpt-frontx-seq-mfe-loading`

**Use cases**: `cpt-frontx-usecase-mfe-load`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-microfrontend`

```mermaid
sequenceDiagram
    participant Host as Host App
    participant FW as Framework
    participant SS as Screensets
    participant Blob as Blob Loader
    participant MFE as MFE Bundle

    Host->>FW: microfrontends() plugin init
    FW->>SS: register MFE handler
    Host->>SS: load MFE by name
    SS->>Blob: fetch(bundleUrl)
    Blob->>Blob: cache source text
    Blob->>Blob: rewrite imports → blob URLs
    Blob->>Blob: recursive chain load deps
    Blob-->>SS: blob URL module
    SS-->>FW: MFE module loaded
    FW->>FW: propagate theme
    FW->>FW: propagate i18n
    FW->>Host: MFE ready
    Host->>Host: MfeContainer renders in Shadow DOM
```

**Description**: The `microfrontends()` plugin registers an MFE handler with the screen-sets registry. When a screen-set requests an MFE, the handler fetches the bundle, caches the source text, rewrites `@cyberfabric/*` import specifiers to blob URLs referencing the host's shared scope, recursively resolves transitive dependencies, and returns the loaded module. The framework propagates theme and i18n settings. The React layer renders the MFE content inside a Shadow DOM container for CSS isolation.

#### Shared Property Broadcast

**ID**: `cpt-frontx-seq-shared-property-broadcast`

**Use cases**: `cpt-frontx-usecase-mfe-load`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-microfrontend`, `cpt-frontx-actor-gts-plugin`

```mermaid
sequenceDiagram
    participant Host as Host Plugin
    participant SP as SharedProperty Bridge
    participant GTS as GTS Validator
    participant MFE as MFE Component

    Host->>SP: setSharedProperty(key, value)
    SP->>GTS: validate(key, value, schema)
    alt valid
        GTS-->>SP: OK
        SP->>SP: store value
        SP->>MFE: notify onChange(key, value)
        MFE->>MFE: useSharedProperty(key) re-render
    else invalid
        GTS-->>SP: reject(reason)
        SP->>SP: log warning, discard value
    end
```

**Description**: When a host plugin sets a shared property, the value passes through GTS validation against the declared schema. Valid values are stored and broadcast to all subscribed MFE components via change notifications. Invalid values are rejected with a logged warning. MFE components read shared properties through `useSharedProperty()` which re-renders on changes.

#### Extension Action Delivery

**ID**: `cpt-frontx-seq-extension-action-delivery`

**Use cases**: `cpt-frontx-usecase-mfe-load`

**Actors**: `cpt-frontx-actor-host-app`, `cpt-frontx-actor-microfrontend`, `cpt-frontx-actor-runtime`

```mermaid
sequenceDiagram
    participant Host as Host / MFE
    participant Bridge as ChildMfeBridge
    participant Mediator as ActionsChainsMediator
    participant Handler as ActionHandler (MFE)

    Host->>Bridge: executeActionsChain(chain targeting extension ID)
    Bridge->>Mediator: executeActionsChain(chain)
    Mediator->>Mediator: resolveHandler(action.target)
    alt extension handler registered
        Mediator->>Handler: handleAction(actionTypeId, payload)
        Handler-->>Mediator: resolve
        Mediator-->>Bridge: chain complete
    else no extension handler
        Mediator->>Mediator: no-op (successful return)
        Mediator-->>Bridge: chain complete
    end
    Bridge-->>Host: Promise resolves
```

**Description**: When a host or MFE calls `executeActionsChain` with an action whose `target` is an extension ID (rather than a domain ID), the mediator resolves the extension's registered `ActionHandler` instead of the domain's `ExtensionLifecycleActionHandler`. The handler is registered during MFE mount via `ChildMfeBridge.registerActionHandler()`, which wires it to `mediator.registerExtensionHandler(extensionId, domainId, entryId, handler)`. On dispose, the handler is unregistered. This allows child MFEs to receive typed actions from the host or peer MFEs without any direct coupling.

### 3.7 Database schemas & tables

Not applicable — FrontX is a frontend framework with no server-side database.

## 3.8 Publishing Pipeline Architecture

**ADR**: `cpt-frontx-adr-automated-layer-ordered-publishing`, `cpt-frontx-adr-channel-aware-version-locking`

#### Gitflow Branching Model

The monorepo follows a gitflow branching strategy:
- `main` — stable releases, published with `latest` dist-tag
- `develop` — integration branch, published with `alpha` dist-tag
- `release/X.Y.Z` — short-lived release candidates, published with `next` dist-tag
- `release/vN` — long-lived maintenance lines for previous major versions, published with `vN` dist-tag
- `feature/*` — feature branches, no publishing
- `hotfix/*` — urgent fixes targeting `main` or `release/vN`

#### Branch-to-Dist-Tag Mapping

| Branch | Dist-Tag | Version Format |
|--------|----------|---------------|
| `develop` | `alpha` | `0.x.y-alpha.N` |
| `release/X.Y.Z` | `next` | `0.x.y-rc.N` |
| `main` | `latest` | `0.x.y` |
| `release/vN` | `vN` | `N.y.z` (maintenance patches) |

#### Version Injection Mechanism

The CLI scaffolds projects with exact dependency versions matching its publication channel. A build-time script (`packages/cli/scripts/generate-versions.ts`) reads all monorepo `packages/*/package.json` files, extracts `name` + `version`, and writes `src/generated/versions.ts` as a TypeScript constants file. CLI generators import these locked versions instead of hardcoded strings. Since develop builds carry alpha versions and main builds carry stable versions, the generated file naturally matches the channel.

#### Layer-Ordered Publishing

Packages are published in strict layer order to maintain registry consistency:
1. **L1 SDK**: `@cyberfabric/state`, `@cyberfabric/screensets`, `@cyberfabric/api`, `@cyberfabric/i18n`
2. **L2 Framework**: `@cyberfabric/framework`
3. **L3 React**: `@cyberfabric/react`
4. **Standalone**: `@cyberfabric/studio`, `@cyberfabric/cli`

This ensures consumers can always resolve lower-layer dependencies before higher-layer packages that depend on them.

#### Independent Versioning

Packages are versioned independently within the `0.x` major. Each package can be bumped and published independently, though coordinated bumps across layers are common for breaking changes.

## 4. Additional context

**Initialization Sequence Detail**: The initialization follows a strict order to ensure registries are populated before consumers access them:

1. `themeRegistry` — theme tokens resolved
2. `screensetsRegistryFactory.build()` — screen-set definitions with MFE handlers wired
3. Domain registration — domain plugins register `ContainerProviders` for their screen-sets
4. Extension registration — MFE extensions registered and loaded
5. `HAI3Provider` mounts — React tree renders with all contexts available

**Module Augmentation Pattern**: Plugins extend framework types without modifying source files:

```typescript
declare module '@cyberfabric/state' {
  interface StoreState {
    myDomain: MyDomainState;
  }
}
```

This provides type-safe access to `store.getState().myDomain` across the entire application while keeping the state package unaware of domain-specific slices.

**Build Orchestration**: The monorepo uses npm workspaces. Build order matters because higher layers import from lower layers' built output: `npm run build:packages` executes SDK → Framework → React → Studio → CLI sequentially.

## 5. Traceability

- **PRD**: [PRD.md](./PRD.md)
- **ADRs**: [ADR/](./ADR/)
- **Features**: [features/](./features/)
