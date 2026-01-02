# sdk-core Specification

## Purpose
TBD - created by archiving change introduce-sdk-architecture. Update Purpose after archive.
## Requirements
### Requirement: Flat SDK Layer

The system SHALL provide 4 flat SDK packages with ZERO @hai3 inter-dependencies, each with a single responsibility.

#### Scenario: SDK packages have no @hai3 dependencies

- **WHEN** checking any SDK package's `package.json` (state, screensets, api, i18n)
- **THEN** no `@hai3/*` packages appear in dependencies or peerDependencies
- **AND** the package can be used standalone without other HAI3 packages

#### Scenario: @hai3/state package

- **WHEN** importing from `@hai3/state`
- **THEN** `EventBus`, `eventBus`, `EventPayloadMap`, `EventHandler`, `Subscription` are available (event system)
- **AND** `createStore`, `getStore`, `registerSlice`, `unregisterSlice`, `hasSlice`, `getRegisteredSlices`, `resetStore` are available (store)
- **AND** `createSlice` wrapper is available (returns `{ slice, ...reducerFunctions }` without `.actions` property)
- **AND** `RootState`, `EffectInitializer`, `ReducerPayload`, `AppDispatch` types are available
- **AND** `HAI3Store`, `SliceObject` types are available (for effects and registration)
- **AND** the only external dependency is `@reduxjs/toolkit`
- **AND** it works in Node.js without React (headless/framework-agnostic)
- **AND** confusing Redux internals are hidden (`combineReducers`, `Reducer`, `ThunkDispatch`, `UnknownAction`, `.actions`)
- **AND** `ReducerPayload<T>` is used instead of `PayloadAction<T>` (terminology clarity)

**Why @hai3/state instead of separate events/store packages:**
- Events and store are tightly coupled in the Flux pattern
- Neither makes sense standalone - events without handlers, store without events
- The complete dataflow pattern is the atomic unit of value

### Requirement: @hai3/state Public Interface

The system SHALL preserve the existing `@hai3/uicore` state management API, extracting it to a standalone SDK package. The only change is renaming `PayloadAction` to `ReducerPayload` to avoid terminology confusion with HAI3 Actions.

#### Scenario: Event System Interface

- **WHEN** using the event system
- **THEN** the following types/exports are available:

```typescript
// Singleton event bus
export const eventBus: EventBus;

// Type-safe event bus interface
export interface EventBus {
  emit<K extends keyof EventPayloadMap>(event: K, payload: EventPayloadMap[K]): void;
  on<K extends keyof EventPayloadMap>(event: K, handler: (payload: EventPayloadMap[K]) => void): Subscription;
  once<K extends keyof EventPayloadMap>(event: K, handler: (payload: EventPayloadMap[K]) => void): Subscription;
  clear(event: string): void;
  clearAll(): void;
}

// Extensible via module augmentation
export interface EventPayloadMap {
  // Extended by consumers
}

export interface Subscription {
  unsubscribe: () => void;
}
```

#### Scenario: Store Interface

- **WHEN** using the store system
- **THEN** the following types/exports are available:

```typescript
// Store creation and access
export function createStore(initialReducers?: Record<string, unknown>): HAI3Store;
export function getStore(): HAI3Store;

// Dynamic slice registration
export function registerSlice<TState>(
  slice: SliceObject<TState>,
  initEffects?: EffectInitializer
): void;
export function unregisterSlice(sliceName: string): void;
export function hasSlice(sliceName: string): boolean;
export function getRegisteredSlices(): string[];

// Store interface - exposes dispatch for effects
export interface HAI3Store<TState = RootState> {
  getState: () => TState;
  dispatch: AppDispatch;
  subscribe: (listener: () => void) => () => void;
  replaceReducer: (nextReducer: Reducer<TState>) => void;
}

// Extensible via module augmentation
export interface RootState {
  [key: string]: unknown;
}
```

- **AND** `HAI3Store` exposes `dispatch` for effects to use
- **BECAUSE** effects need to dispatch slice actions to update state

#### Scenario: Effect System Interface

- **WHEN** defining effects for a slice
- **THEN** effects receive `dispatch` function:

```typescript
// Effect initializer - receives dispatch function
export type EffectInitializer = (dispatch: AppDispatch) => void;

// Optional: Effect initializer that returns cleanup function
export type EffectInitializerWithCleanup = (dispatch: AppDispatch) => EffectCleanup;

// Cleanup function
export type EffectCleanup = () => void;
```

- **AND** effects call `dispatch(sliceAction(payload))` to update state
- **BECAUSE** this is the existing uicore pattern that works well

#### Scenario: Effect usage pattern (PRESERVED from uicore)

- **WHEN** implementing an effect
- **THEN** the pattern is:

```typescript
import { eventBus } from '@hai3/state';
import { setMenuItems } from './menuSlice';

// Effect receives store object for dispatch and getState
export function initMenuEffects(store: HAI3Store): void {
  eventBus.on(MenuEvents.ItemsChanged, ({ items }) => {
    store.dispatch(setMenuItems(items));
  });
}

// Register slice with effects
registerSlice(menuSlice, (dispatch) => initMenuEffects({ dispatch, getState }));
```

- **AND** effects use `store.dispatch(setter(value))` pattern
- **AND** this is the EXISTING uicore pattern, preserved as-is

#### Scenario: Slice Creation Interface

- **WHEN** creating a slice
- **THEN** HAI3's `createSlice` wrapper is available:

```typescript
// HAI3 wrapper around Redux Toolkit's createSlice
// Returns { slice, ...reducerFunctions } - NO .actions property
export function createSlice<TState, TReducers, TName>(
  options: CreateSliceOptions<TState, TReducers, TName>
): { slice: SliceObject<TState> } & CaseReducerActions<TReducers, TName>;

// HAI3 alias for PayloadAction (avoids confusion with HAI3 Actions)
export type ReducerPayload<T> = PayloadAction<T>;
```

- **AND** `ReducerPayload<T>` is the HAI3-specific alias for Redux's `PayloadAction<T>`
- **AND** the wrapper hides RTK's `.actions` property completely
- **BECAUSE** "PayloadAction" and ".actions" would confuse users with HAI3 Actions (event emitters)

#### Scenario: Slice definition pattern (HAI3 createSlice wrapper)

- **WHEN** defining a slice
- **THEN** the pattern is:

```typescript
import { createSlice, registerSlice, type ReducerPayload } from '@hai3/state';

// createSlice returns { slice, setMenuCollapsed, setMenuItems }
// NO .actions property - Redux is hidden
const { slice, setMenuCollapsed, setMenuItems } = createSlice({
  name: 'uicore/menu',
  initialState: { collapsed: false, items: [] },
  reducers: {
    setMenuCollapsed: (state, payload: ReducerPayload<boolean>) => {
      state.collapsed = payload.payload;
    },
    setMenuItems: (state, payload: ReducerPayload<MenuItem[]>) => {
      state.items = payload.payload;
    },
  },
});

// Register slice with effects
registerSlice(slice, initMenuEffects);

// Export reducer functions for effects
export { setMenuCollapsed, setMenuItems };
```

- **AND** reducer functions are destructured directly from createSlice return value
- **AND** `.actions` property is NOT accessible (hidden by wrapper)
- **AND** `ReducerPayload<T>` replaces Redux's `PayloadAction<T>`

#### Scenario: Redux Internals - Hidden vs Exposed

- **WHEN** checking @hai3/state exports
- **THEN** the following are HIDDEN (not exported):
  - `.actions` property - RTK's actions hidden by createSlice wrapper
  - `combineReducers` - internal to store implementation
  - `Reducer` type - internal type
  - `ThunkDispatch` - not used in HAI3 pattern
  - `UnknownAction` - internal Redux type
  - Redux selector utilities - state access via @hai3/react hooks (useAppSelector)
  - `./types` subpath export - prevents direct type access

- **AND** the following are KEPT (needed by users):
  - `createSlice` - HAI3 wrapper that returns `{ slice, ...reducerFunctions }`
  - `ReducerPayload<T>` - alias for PayloadAction, used in reducer signatures
  - `store.dispatch` - effects use this pattern
  - `store.getState` - effects need state access
  - `EventHandler` - needed for typed event subscriptions

- **BECAUSE** Redux is an internal implementation detail, the word "action" is reserved for HAI3 Actions (event emitters)

### Requirement: HAI3 Flux Terminology

The system SHALL use consistent terminology aligned with industry standards (CQRS/Event Sourcing).

| HAI3 Term | Definition | Example |
|-----------|------------|---------|
| **Action** | Function that emits an event (command/intent) | `selectThread(threadId)` |
| **Event** | Message representing something that happened (past-tense) | `'chat/threads/selected'` |
| **Effect** | Function that subscribes to events and calls reducers | `initThreadsEffects` |
| **Reducer** | Pure function that updates state | `threadsSlice.reducers.setSelected` |
| **Slice** | Collection of reducers + initial state for a domain | `threadsSlice` |

- **AND** the term "action creator" is NOT used in HAI3 public API
- **AND** the term "dispatch" is NOT used in HAI3 public API
- **BECAUSE** these are Redux implementation details

#### Scenario: @hai3/screensets package

- **WHEN** importing from `@hai3/screensets`
- **THEN** screenset contracts are available: `ScreensetDefinition`, `ScreensetCategory`, `MenuItemConfig`, `ScreenLoader`, `MenuScreenItem`
- **AND** `LayoutDomain` enum is available (header, footer, menu, sidebar, screen, popup, overlay)
- **AND** `ScreensetTranslationLoader` type is available (renamed from TranslationLoaderFn)
- **AND** `screensetRegistry` singleton is available (pure storage, no side effects, ~20 lines Map wrapper)
- **AND** branded types `ScreensetId`, `ScreenId` are available
- **AND** the package has ZERO external dependencies (pure TypeScript)
- **AND** it has ZERO @hai3 dependencies
- **AND** it does NOT contain state shapes (HeaderState, MenuState, etc.) - those are in @hai3/framework
- **AND** it does NOT contain Redux slices - those are in @hai3/framework

**Why renamed from @hai3/layout:**
- The package is 90% about screenset contracts, not layout state
- Screensets are HAI3's first-class citizen (vertical slices consisting of screens, menus, popups, etc.)
- Layout domain state management is in @hai3/framework (which owns layout slices)
- This enables future micro-frontend architecture where screensets can be injected into non-HAI3 apps

> **Note:** @hai3/uicore is deprecated. All layout slices are in @hai3/framework. Components access state via `useAppSelector` hook from @hai3/react.

#### Scenario: @hai3/api package

- **WHEN** importing from `@hai3/api`
- **THEN** `BaseApiService`, `RestProtocol`, `SseProtocol`, `MockPlugin`, `apiRegistry` are available
- **AND** the only external dependency is `axios`
- **AND** it has ZERO @hai3 dependencies

#### Scenario: @hai3/i18n package

- **WHEN** importing from `@hai3/i18n`
- **THEN** `I18nRegistry`, `Language`, `TranslationLoader` are available
- **AND** the package has ZERO external dependencies
- **AND** it has ZERO @hai3 dependencies

### Requirement: @hai3/api package

The system SHALL provide API communication infrastructure with a class-based plugin system for extensibility.

- **WHEN** importing from `@hai3/api`
- **THEN** `BaseApiService`, `RestProtocol`, `SseProtocol`, `MockPlugin`, `apiRegistry` are available
- **AND** `ApiPluginBase`, `ApiPlugin`, `PluginClass`, `ApiRequestContext`, `ApiResponseContext` types are available
- **AND** `ShortCircuitResponse`, `isShortCircuit` are available
- **AND** the only external dependency is `axios`
- **AND** it has ZERO @hai3 dependencies

#### Scenario: ApiPluginBase is an abstract base class (non-generic)

- **WHEN** storing plugins in arrays or maps
- **THEN** use `ApiPluginBase` as the storage type
- **AND** it defines optional lifecycle methods `onRequest`, `onResponse`, `onError`, `destroy`
- **AND** it is non-generic (no type parameters)
- **AND** all plugins ultimately extend this class

#### Scenario: ApiPlugin is an abstract class with typed config

- **WHEN** creating a custom API plugin
- **THEN** the plugin class extends `ApiPlugin<TConfig>`
- **AND** `TConfig` is the configuration type (use `void` for no config)
- **AND** configuration is accessible via `this.config` (protected readonly)
- **AND** `ApiPlugin<TConfig>` extends `ApiPluginBase`
- **AND** no string name property is required (identification by class)

#### Scenario: Plugin without configuration

- **WHEN** creating a plugin that needs no configuration
- **THEN** extend `ApiPlugin<void>`
- **AND** call `super(void 0)` in constructor
- **AND** example:
```typescript
class LoggingPlugin extends ApiPlugin<void> {
  constructor() {
    super(void 0);
  }
  onRequest(ctx: ApiRequestContext) {
    console.log(`[${ctx.method}] ${ctx.url}`);
    return ctx;
  }
}
```

#### Scenario: Plugin with configuration (DI)

- **WHEN** creating a plugin that needs configuration
- **THEN** extend `ApiPlugin<TConfig>` with a specific config type
- **AND** access configuration via `this.config`
- **AND** example:
```typescript
class AuthPlugin extends ApiPlugin<{ getToken: () => string | null }> {
  onRequest(ctx: ApiRequestContext) {
    const token = this.config.getToken();
    if (!token) return ctx;
    return {
      ...ctx,
      headers: { ...ctx.headers, Authorization: `Bearer ${token}` }
    };
  }
}
```

#### Scenario: Plugin execution follows FIFO order

- **WHEN** multiple plugins are registered
- **THEN** plugins execute in registration order (FIFO) within their scope
- **AND** global plugins execute before service plugins (phase separation)
- **AND** response processing follows reverse order (onion model)

#### Scenario: Short-circuit skips HTTP request

- **WHEN** a plugin's `onRequest` returns `{ shortCircuit: ApiResponseContext }`
- **THEN** the HTTP request is NOT made
- **AND** subsequent plugins' `onRequest` methods are NOT called
- **AND** `onResponse` methods ARE called with the short-circuited response
- **AND** response flows through plugins in reverse order

### Requirement: Framework Layer

The system SHALL provide a `@hai3/framework` package that wires SDK packages together, provides layout state management, and works without React dependencies.

#### Scenario: Framework depends only on SDK packages

- **WHEN** checking `@hai3/framework` package.json
- **THEN** only SDK packages appear as @hai3 dependencies: state, screensets, api, i18n
- **AND** NO React or react-dom dependency exists
- **AND** NO @hai3/uikit-contracts dependency exists

#### Scenario: Framework provides layout domain state

- **WHEN** importing from `@hai3/framework`
- **THEN** layout domain state types are available: `HeaderState`, `FooterState`, `MenuState`, `SidebarState`, `ScreenState`, `PopupState`, `OverlayState`
- **AND** layout domain Redux slices are available (defined in @hai3/framework)
- **BECAUSE** @hai3/framework owns layout state management

> **State Access:** Components use `useAppSelector` hook from @hai3/react to access state. The term "selector" is avoided as it's Redux-specific terminology.

#### Scenario: Framework provides registries

- **WHEN** importing from `@hai3/framework`
- **THEN** `themeRegistry`, `routeRegistry` are available (framework-owned)
- **AND** screensetRegistry from `@hai3/screensets` is re-exported with i18n wiring
- **AND** registries use event bus for notifications
- **AND** registries are type-safe with module augmentation

#### Scenario: Framework provides effect coordination

- **WHEN** importing from `@hai3/framework`
- **THEN** effect handlers are available for wiring events to state changes
- **AND** `createHAI3App()` function initializes all wiring

#### Scenario: Framework works without React

- **WHEN** using `@hai3/framework` in a Node.js script
- **THEN** all registries and wiring work correctly
- **AND** no React-specific errors occur

### Requirement: Action Pattern

The system SHALL enforce that actions are **handwritten pure functions** that emit events. Actions are the ONLY entry point for event emission, maintaining strict knowledge separation.

**Core Principle: Knowledge Separation**
- Components call action functions (know nothing about events)
- Actions emit events (know nothing about effects or slices)
- Effects subscribe to events and update state
- This separation prevents tight coupling and enables testability

#### Scenario: Action type definition

- **WHEN** defining an action
- **THEN** it MUST be a handwritten pure function that returns void
- **AND** it MUST emit events via `eventBus.emit()` from `@hai3/state`
- **AND** it MUST NOT dispatch directly to Redux store
- **AND** it MAY contain validation logic before emitting

#### Scenario: No createAction helper in SDK

- **WHEN** checking SDK package exports (`@hai3/state`, `@hai3/screensets`, etc.)
- **THEN** NO `createAction` helper function is exported
- **AND** actions are defined as handwritten functions in screensets
- **BECAUSE** a factory pattern would:
  - Encourage components to create inline actions (violating knowledge separation)
  - Hide the fact that actions contain business logic
  - Make it too easy to bypass the action layer

#### Scenario: User-defined action instances

- **WHEN** a screenset needs domain-specific actions
- **THEN** actions are defined in user's screenset code (e.g., `src/screensets/chat/actions/`)
- **AND** actions import `eventBus` from `@hai3/state`
- **AND** actions are handwritten functions with proper TypeScript typing
- **AND** actions emit screenset-specific events

```typescript
// Example: src/screensets/chat/actions/threads.ts
import { eventBus } from '@hai3/state';

export function selectThread(threadId: string): void {
  if (!threadId) {
    console.warn('selectThread called with empty threadId');
    return;
  }
  eventBus.emit('chat/threads/selected', { threadId });
}
```

#### Scenario: Framework provides core action instances internally

- **WHEN** using `createHAI3App()` (full preset)
- **THEN** core actions are provided via the plugin system:
  - navigation actions: `navigateToScreen`, `navigateToScreenset` (from navigation plugin)
  - theme actions: `changeTheme` (from themes plugin)
  - language actions: `setLanguage` (from i18n plugin)
- **AND** these actions are defined internally in `@hai3/framework` (not in SDK)
- **AND** user code calls them via `app.actions.*`

#### Scenario: Action availability depends on plugins

- **WHEN** using `createHAI3().use(presets.headless()).build()`
- **THEN** navigation/theme/language actions are NOT available
- **AND** only screensets plugin capabilities are present
- **BECAUSE** headless preset only includes screensets plugin

#### Scenario: Component knowledge isolation

- **WHEN** a component needs to trigger an action
- **THEN** it imports the action function (NOT eventBus)
- **AND** it calls the action function directly
- **AND** it has NO knowledge of the underlying event system

```typescript
// ✅ CORRECT: Component calls action function
import { selectThread } from '../../actions/threads';
onClick={() => selectThread(thread.id)}

// ❌ FORBIDDEN: Component uses eventBus directly
import { eventBus } from '@hai3/state';
onClick={() => eventBus.emit('chat/threads/selected', { threadId: thread.id })}
```

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

### Requirement: No uikit-contracts Dependency

The system SHALL NOT require `@hai3/uikit-contracts` in any layer.

#### Scenario: SDK packages don't depend on uikit-contracts

- **WHEN** checking any SDK package's dependencies
- **THEN** `@hai3/uikit-contracts` does NOT appear

#### Scenario: Framework doesn't depend on uikit-contracts

- **WHEN** checking `@hai3/framework` dependencies
- **THEN** `@hai3/uikit-contracts` does NOT appear

#### Scenario: React doesn't depend on uikit-contracts

- **WHEN** checking `@hai3/react` dependencies
- **THEN** `@hai3/uikit-contracts` does NOT appear

#### Scenario: CLI templates use user's UI kit directly

- **WHEN** layout is scaffolded
- **THEN** generated components import from user's UI kit (shadcn, MUI, etc.)
- **AND** no abstraction layer via contracts is needed

### Requirement: Type-Safe Module Augmentation

The system SHALL use TypeScript module augmentation for extensibility across packages.

#### Scenario: EventPayloadMap augmentation

- **WHEN** a screenset defines custom events
- **THEN** it augments `EventPayloadMap` from `@hai3/state`
- **AND** custom events are type-safe in `eventBus.emit()` and `eventBus.on()`

#### Scenario: RootState augmentation

- **WHEN** a screenset registers a slice
- **THEN** it augments `RootState` from `@hai3/state`
- **AND** slice state is available in `useAppSelector()` with full typing

#### Scenario: Type safety across layers

- **WHEN** types are augmented in one layer
- **THEN** they are visible in all dependent layers
- **AND** TypeScript provides full IntelliSense

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

### Requirement: Build Order

The system SHALL build packages in layer order with SDK packages parallelizable.

#### Scenario: SDK packages build in parallel

- **WHEN** running `npm run build:packages`
- **THEN** SDK packages (state, screensets, api, i18n) can build in parallel
- **AND** they have no build-time dependencies on each other

#### Scenario: Framework builds after SDK

- **WHEN** running `npm run build:packages`
- **THEN** framework builds after ALL SDK packages complete
- **AND** framework depends on SDK package type definitions

#### Scenario: React builds after framework

- **WHEN** running `npm run build:packages`
- **THEN** react builds after framework completes
- **AND** react depends on framework type definitions

### Requirement: Backward Compatibility

The system SHALL maintain backward compatibility for existing `@hai3/uicore` users.

#### Scenario: uicore re-exports work

- **WHEN** importing from `@hai3/uicore`
- **THEN** all previously available exports are still available
- **AND** they are re-exported from framework and react packages

#### Scenario: Deprecation warning

- **WHEN** importing from `@hai3/uicore`
- **THEN** a deprecation warning is logged (in development)
- **AND** documentation suggests migration to framework/react

#### Scenario: Existing apps still work

- **WHEN** an existing app uses `@hai3/uicore`
- **THEN** it continues to work without code changes
- **AND** Layout component is still available (re-exported from scaffolded location or legacy)

### Requirement: SOLID Compliance

The system SHALL comply with all SOLID principles.

#### Scenario: Single Responsibility

- **WHEN** reviewing any package
- **THEN** it has ONE primary reason to change
- **AND** responsibilities do not overlap between packages

#### Scenario: Open/Closed

- **WHEN** adding new functionality
- **THEN** it is done via module augmentation or registry registration
- **AND** core package code does not require modification

#### Scenario: Interface Segregation

- **WHEN** a user needs the Flux dataflow pattern (events + store)
- **THEN** they import only `@hai3/state`
- **AND** they do not receive axios or React as dependencies

#### Scenario: Dependency Inversion

- **WHEN** reviewing package dependencies
- **THEN** high-level packages depend on abstractions (interfaces, types)
- **AND** no package depends on concrete uikit implementation

### Requirement: Plugin Architecture

The system SHALL provide a plugin-based architecture in `@hai3/framework` that allows users to compose only the features they need.

#### Scenario: Plugin interface contract

- **WHEN** creating a new plugin
- **THEN** it implements the `HAI3Plugin` interface
- **AND** it declares a unique `name` property
- **AND** it optionally declares `dependencies` on other plugins
- **AND** it optionally provides `registries`, `slices`, `effects`, and/or `actions`

#### Scenario: createHAI3 builder pattern

- **WHEN** importing from `@hai3/framework`
- **THEN** `createHAI3()` function is available
- **AND** it returns a builder with `.use(plugin)` method
- **AND** it returns a builder with `.build()` method that creates the app

#### Scenario: Plugin composition

- **WHEN** using `createHAI3().use(plugin1).use(plugin2).build()`
- **THEN** only the specified plugins are initialized
- **AND** only dependencies of those plugins are included
- **AND** unused plugins are not bundled (tree-shaking)

#### Scenario: Presets for common configurations

- **WHEN** importing from `@hai3/framework`
- **THEN** `presets.full()` is available (all plugins)
- **AND** `presets.minimal()` is available (screensets + themes)
- **AND** `presets.headless()` is available (screensets only)

#### Scenario: Full preset is default

- **WHEN** using `createHAI3App()` convenience function
- **THEN** it is equivalent to `createHAI3().use(presets.full()).build()`
- **AND** all plugins are included for full HAI3 experience

#### Scenario: Headless preset for external integration

- **WHEN** an external platform wants only screenset orchestration
- **THEN** they use `createHAI3().use(presets.headless()).build()`
- **AND** only `screensets` plugin is included
- **AND** layout domains (header, footer, menu, etc.) are NOT included
- **AND** they can render HAI3 screens in their own layout

#### Scenario: Individual plugin imports

- **WHEN** importing individual plugins
- **THEN** `screensets`, `themes`, `layout`, `routing`, `effects`, `navigation`, `i18n` are available
- **AND** each can be used independently via `.use(plugin())`

#### Scenario: Plugin dependency auto-resolution

- **WHEN** a plugin declares dependencies on other plugins
- **AND** the dependencies are not explicitly added
- **AND** no conflicting plugin with custom config exists
- **THEN** the system auto-adds missing dependencies with DEFAULT config

#### Scenario: Plugin dependency conflict warning

- **WHEN** a plugin declares dependencies on other plugins
- **AND** the dependency already exists with CUSTOM config
- **THEN** the system logs a warning about the existing configuration
- **AND** does NOT add a duplicate plugin

#### Scenario: Screensets-only integration

- **WHEN** using `createHAI3().use(screensets()).build()`
- **THEN** `app.screensetRegistry` is available
- **AND** `app.store` is available (for screen state)
- **AND** layout domains are NOT registered
- **AND** the company can use their own menu/header/routing

#### Scenario: Plugin provides registries

- **WHEN** a plugin provides registries (e.g., `screensetRegistry`)
- **THEN** they are accessible on the built app instance
- **AND** they are typed correctly via TypeScript

#### Scenario: Plugin lifecycle hooks

- **WHEN** a plugin defines `onInit` lifecycle hook
- **THEN** it is called after all plugins are registered
- **AND** it receives the app instance
- **WHEN** a plugin defines `onDestroy` lifecycle hook
- **THEN** it is called when the app is destroyed

### Requirement: UI Kit Support

The system SHALL keep @hai3/uikit as a standalone npm package, used as the default UI kit option at CLI level.

#### Scenario: @hai3/uikit remains a package

- **WHEN** checking `@hai3/uikit` in packages/
- **THEN** it exists as a standalone npm package
- **AND** it is NOT deprecated
- **AND** it is NOT converted to CLI template

#### Scenario: @hai3/uikit is CLI default

- **WHEN** running `hai3 create my-app`
- **THEN** `@hai3/uikit` is added to project dependencies
- **AND** layout templates import from `@hai3/uikit`

- **WHEN** running `hai3 scaffold layout`
- **THEN** generated code imports from `@hai3/uikit`
- **AND** CLI adds `@hai3/uikit` to package.json if not present

#### Scenario: @hai3/uikit is not part of SDK layers

- **WHEN** checking `@hai3/uikit` package.json
- **THEN** it has NO @hai3 SDK package dependencies (events, store, layout, api, i18n)
- **AND** it has NO @hai3/framework dependency
- **AND** it has NO @hai3/react dependency
- **AND** it is a standalone package that can be used independently

#### Scenario: @hai3/uikit can build in parallel with SDK

- **WHEN** running `npm run build:packages`
- **THEN** @hai3/uikit can build in parallel with SDK packages
- **AND** it does NOT wait for SDK, framework, or react packages

#### Scenario: Architecture supports UI kit options

- **WHEN** reviewing CLI scaffold architecture
- **THEN** `--ui-kit=custom` is available NOW (no bundled UI kit)
- **AND** `--ui-kit=<shadcn|mui>` options are planned for future
- **AND** layout templates are structured to support multiple UI kit variants
- **AND** @hai3/uikit is the default option

### Requirement: Separate AI Infrastructure

The system SHALL provide two distinct command namespaces: `hai3dev-*` for HAI3 framework development and `hai3-*` for user project development.

> **⚠️ ARCHITECTURAL GAP:** See [proposal.md Issue 3](../../proposal.md#issue-3-static-ai-commands-for-plugin-based-framework). The framework is plugin-based but AI commands/guidelines are static. Users who select specific plugins still get ALL guidelines. Phase 13.3 in tasks.md addresses this.

#### Scenario: Monorepo commands are internal only

- **WHEN** checking HAI3 monorepo `.claude/commands/`
- **THEN** `hai3dev-publish.md`, `hai3dev-release.md`, `hai3dev-update-guidelines.md`, `hai3dev-test-packages.md` exist
- **AND** these commands are NEVER included in user project templates
- **AND** these commands are excluded from `hai3 ai sync` generation

#### Scenario: User commands include technical and business-friendly aliases

- **WHEN** checking user project `.claude/commands/`
- **THEN** technical commands exist: `/hai3-new-screenset`, `/hai3-new-screen`, `/hai3-validate`, `/hai3-fix-violation`
- **AND** business-friendly aliases exist: `/hai3-add-feature`, `/hai3-add-page`, `/hai3-check`, `/hai3-fix`
- **AND** technical commands use HAI3 terminology (screenset is fundamental concept)
- **AND** business aliases provide simpler language for non-technical users

### Requirement: CLI-Backed Commands

The system SHALL ensure all AI commands delegate to HAI3 CLI for consistency and validation.

#### Scenario: Commands call CLI

- **WHEN** `/hai3-add-feature` is executed by AI
- **THEN** it runs `hai3 add feature <name> --category=<category>`
- **AND** CLI handles all scaffolding logic
- **AND** CLI handles all validation

#### Scenario: CLI has business-friendly aliases

- **WHEN** running `hai3 add feature billing`
- **THEN** it is equivalent to `hai3 screenset create billing`
- **WHEN** running `hai3 add page settings`
- **THEN** it is equivalent to `hai3 screen add settings`
- **WHEN** running `hai3 check`
- **THEN** it is equivalent to `hai3 validate`

#### Scenario: CLI runs protections automatically

- **WHEN** any `hai3 add *` command completes scaffolding
- **THEN** CLI automatically runs `npm run lint`
- **AND** CLI automatically runs `npm run type-check`
- **AND** CLI automatically runs `npm run arch:check`
- **AND** if any validation fails, CLI shows error and suggests `hai3 fix`
- **AND** if all validations pass, CLI shows success and next steps

#### Scenario: Commands are under 500 words

- **WHEN** measuring any user command in `.claude/commands/`
- **THEN** word count is less than 500
- **AND** command includes "What This Does" section
- **AND** command includes "If Something Goes Wrong" section

### Requirement: Configuration-Aware Command Generation

The system SHALL generate commands based on installed HAI3 packages.

#### Scenario: SDK-only project commands

- **WHEN** project has only `@hai3/api` in dependencies
- **THEN** `hai3 ai sync` generates only `/hai3-add-service`
- **AND** no feature, page, or component commands are generated

#### Scenario: Framework project commands

- **WHEN** project has `@hai3/framework` in dependencies
- **THEN** `hai3 ai sync` generates `/hai3-add-service`, `/hai3-add-feature`, `/hai3-add-action`, `/hai3-check`, `/hai3-fix`
- **AND** no page or component commands are generated

#### Scenario: React project commands

- **WHEN** project has `@hai3/react` in dependencies
- **THEN** `hai3 ai sync` generates all commands including `/hai3-add-page`, `/hai3-add-component`

#### Scenario: Package changes trigger regeneration

- **WHEN** running `hai3 update` and packages change
- **THEN** `hai3 ai sync` is run automatically
- **AND** commands are regenerated based on new package configuration

### Requirement: Multi-Tool Support

The system SHALL support Claude, GitHub Copilot, Cursor, and Windsurf with single source of truth.

#### Scenario: Single source generates all files

- **WHEN** running `hai3 ai sync`
- **THEN** `CLAUDE.md` is generated for Claude Code
- **AND** `.github/copilot-instructions.md` is generated for GitHub Copilot
- **AND** `.cursor/rules/hai3.md` is generated for Cursor
- **AND** `.windsurf/rules/hai3.md` is generated for Windsurf

#### Scenario: Only Claude gets commands

- **WHEN** running `hai3 ai sync`
- **THEN** `.claude/commands/` directory is generated with commands
- **AND** other tools get rules/instructions only (no commands)

#### Scenario: Rules are identical across tools

- **WHEN** comparing rule content across generated files
- **THEN** core rules are identical in all 4 files
- **AND** only formatting differs per tool requirements

### Requirement: Automated Prompt Validation

The system SHALL provide automated testing for AI commands and rules without human involvement using Promptfoo.

#### Scenario: Promptfoo test suite exists

- **WHEN** checking `.ai/tests/` directory
- **THEN** `promptfoo.yaml` configuration file exists
- **AND** test files exist for each AI command
- **AND** reusable assertions exist in `assertions/hai3-patterns.yaml`

#### Scenario: Event-driven pattern detection

- **WHEN** running prompt tests with code containing `store.dispatch(setTheme('dark'))`
- **THEN** the AI command output identifies it as a violation
- **AND** suggests using `eventBus.emit()` or action creators instead
- **AND** the test passes via LLM-as-a-judge assertion

#### Scenario: Import violation detection

- **WHEN** running prompt tests with code containing `import { internal } from '@hai3/uicore/src/internal'`
- **THEN** the AI command output identifies it as a violation
- **AND** suggests using public exports only
- **AND** the test passes via contains/regex assertion

#### Scenario: CI/CD integration

- **WHEN** a pull request modifies `.ai/rules/` or `.ai/commands/`
- **THEN** GitHub Actions runs `npm run test:prompts`
- **AND** the PR is blocked if tests fail
- **AND** prompt effectiveness metrics are reported

#### Scenario: Test coverage tracking

- **WHEN** running `npm run test:prompts`
- **THEN** a coverage report is generated
- **AND** the report shows which rules have tests
- **AND** the report shows which commands have tests
- **AND** minimum 80% coverage is required for CI to pass

#### Scenario: Consistency validation

- **WHEN** running the same prompt test 3 times
- **THEN** variance in outputs is measured
- **AND** high variance (>30%) flags the prompt for review
- **AND** metrics are tracked over time

#### Scenario: Token efficiency tracking

- **WHEN** analyzing a command prompt
- **THEN** word count is measured
- **AND** commands exceeding 500 words are flagged
- **AND** efficiency score (value/tokens) is calculated

### Requirement: Layered Protection Architecture

The system SHALL provide layered ESLint and dependency-cruiser configurations following industry best practices (Turborepo, Nx, TanStack patterns).

> **⚠️ NEEDS RE-ASSESSMENT:** See [proposal.md Issue 2](../../proposal.md#issue-2-eslintdepcruise-decomposition-misunderstanding). The per-package config scenarios (below) conflate monorepo-level (SDK source code) protection with user-level (shipped to users) protection. Phase 13.2 in tasks.md addresses this. The internal config packages and hierarchy are correct; the per-package scenarios may need revision.

#### Scenario: Internal config packages exist

- **WHEN** checking `packages/` directory
- **THEN** `@hai3/eslint-config` internal package exists (private: true)
- **AND** `@hai3/depcruise-config` internal package exists (private: true)
- **AND** both packages are NOT published to npm

#### Scenario: ESLint config hierarchy

- **WHEN** checking `packages/eslint-config/`
- **THEN** `base.js` exists with universal rules (L0)
- **AND** `sdk.js` exists extending base with SDK rules (L1)
- **AND** `framework.js` exists extending base with framework rules (L2)
- **AND** `react.js` exists extending base with react rules (L3)
- **AND** `screenset.js` exists extending base with user code rules (L4)

#### Scenario: Dependency cruiser config hierarchy

- **WHEN** checking `packages/depcruise-config/`
- **THEN** `base.cjs` exists with universal rules (L0)
- **AND** `sdk.cjs` exists extending base with SDK rules (L1)
- **AND** `framework.cjs` exists extending base with framework rules (L2)
- **AND** `react.cjs` exists extending base with react rules (L3)
- **AND** `screenset.cjs` exists extending base with user code rules (L4)

#### Scenario: Per-package ESLint configs

- **WHEN** checking SDK package directories (events, store, layout, api, i18n)
- **THEN** each has `eslint.config.js` extending `sdk.js`
- **WHEN** checking `packages/framework/`
- **THEN** it has `eslint.config.js` extending `framework.js`
- **WHEN** checking `packages/react/`
- **THEN** it has `eslint.config.js` extending `react.js`

#### Scenario: Per-package dependency cruiser configs

- **WHEN** checking SDK package directories
- **THEN** each has `.dependency-cruiser.cjs` extending `sdk.cjs`
- **WHEN** checking `packages/framework/`
- **THEN** it has `.dependency-cruiser.cjs` extending `framework.cjs`
- **WHEN** checking `packages/react/`
- **THEN** it has `.dependency-cruiser.cjs` extending `react.cjs`

#### Scenario: Layer inheritance works correctly

- **WHEN** SDK package violates base rule (e.g., uses `any` type)
- **THEN** ESLint error is triggered (base rules apply to SDK)
- **WHEN** SDK package imports from @hai3/*
- **THEN** ESLint error is triggered (SDK layer rule)
- **WHEN** framework package imports React
- **THEN** ESLint error is triggered (framework layer rule)

#### Scenario: User project configs extend screenset layer

- **WHEN** checking `presets/standalone/configs/eslint.config.js`
- **THEN** it extends `screenset.js` configuration
- **AND** ALL existing flux architecture rules are preserved
- **AND** ALL existing screenset isolation rules are preserved

#### Scenario: Existing protections are never removed

- **WHEN** comparing pre-migration and post-migration protection counts
- **THEN** ESLint rule count is equal or greater
- **AND** dependency-cruiser rule count is equal or greater
- **AND** pre-commit hook count is equal or greater
- **AND** NO existing rule is removed (only enhanced)

### Requirement: Consolidated Templates Structure

The system SHALL organize CLI template sources in a single `templates/` directory with manifest-driven assembly.

#### Scenario: Templates directory structure

- **WHEN** checking the repository structure
- **THEN** `templates/` directory exists at repo root
- **AND** `templates/standalone/` contains project scaffold files (configs, eslint-plugin, scripts)
- **AND** `templates/layout/` contains layout variants
- **AND** `templates/ai-overrides/` contains simplified AI docs for standalone projects
- **AND** `templates/manifest.yaml` documents the assembly configuration

#### Scenario: Layout variants share base

- **WHEN** checking `templates/layout/`
- **THEN** `_base/` directory contains shared layout files (Layout.tsx, Screen.tsx, Popup.tsx, Overlay.tsx)
- **AND** variant directories (`hai3-uikit/`, `custom/`) contain only variant-specific files (Header.tsx, Footer.tsx, Menu.tsx, Sidebar.tsx)
- **AND** duplication between variants is eliminated (~60% reduction)

#### Scenario: Manifest-driven assembly

- **WHEN** `npm run build:packages:cli` runs
- **THEN** `copy-templates.ts` reads `templates/manifest.yaml`
- **AND** template sources are documented in manifest
- **AND** assembly rules are declarative (not hardcoded in script)

#### Scenario: Dual-purpose src/ preserved

- **WHEN** checking HAI3 dev workflow
- **THEN** `src/themes/`, `src/uikit/`, `src/icons/`, `src/screensets/` remain unchanged
- **AND** these files serve dual purposes: monorepo development AND template sources
- **AND** `npm run dev` continues to work for HAI3 development

#### Scenario: Old directories removed

- **WHEN** checking the repository after migration
- **THEN** `presets/standalone/` no longer exists (moved to `templates/standalone/`)
- **AND** `packages/cli/templates-source/` no longer exists (moved to `templates/layout/`)
- **AND** `.ai/standalone-overrides/` no longer exists (moved to `templates/ai-overrides/`)

### Requirement: Class-Based Service Registration

The system SHALL provide class-based service registration using class constructor references instead of string domains.

#### Scenario: Register service by class reference

- **WHEN** calling `apiRegistry.register(ServiceClass)`
- **THEN** an instance of the service class is created
- **AND** the instance is stored with the class as the key
- **AND** `_setGlobalPluginsProvider()` is called on the instance
- **AND** the service is available via `getService(ServiceClass)`

#### Scenario: Get service by class reference

- **WHEN** calling `apiRegistry.getService(ServiceClass)`
- **THEN** the service instance is returned
- **AND** the return type is correctly inferred as `ServiceClass`
- **AND** no type assertion is needed
- **AND** error is thrown if service not registered

#### Scenario: Check if service is registered by class

- **WHEN** calling `apiRegistry.has(ServiceClass)`
- **THEN** returns `true` if service class is registered
- **AND** returns `false` otherwise

#### Scenario: Register mocks by class reference

- **WHEN** calling `apiRegistry.registerMocks(ServiceClass, mockMap)`
- **THEN** mocks are registered for the specified service class
- **AND** service class must be registered first

#### Scenario: REMOVED - getDomains() method

- **WHEN** the new class-based API is in use
- **THEN** `getDomains()` method is NOT available
- **AND** there is no equivalent method (iterate services by class if needed)

### Requirement: Global API Plugin Registration (Namespaced API)

The system SHALL provide global plugin registration on `apiRegistry.plugins` namespace that applies plugins to ALL API services, both existing and future.

#### Scenario: Register global plugins with plugins.add()

- **WHEN** calling `apiRegistry.plugins.add(plugin1, plugin2, plugin3)`
- **THEN** all plugins are stored in the global plugins registry
- **AND** plugins are appended in registration order (FIFO)
- **AND** plugins are immediately applied to all existing service instances
- **AND** plugins will be automatically applied to any future service instances
- **AND** error is thrown if any plugin of same class is already registered (no duplicates)

#### Scenario: Position before another plugin by class

- **WHEN** calling `apiRegistry.plugins.addBefore(plugin, TargetPlugin)`
- **THEN** the plugin is inserted before the specified plugin class in execution order
- **AND** an error is thrown if the referenced plugin class is not registered
- **AND** an error is thrown if the positioning creates a circular dependency

#### Scenario: Position after another plugin by class

- **WHEN** calling `apiRegistry.plugins.addAfter(plugin, TargetPlugin)`
- **THEN** the plugin is inserted after the specified plugin class in execution order
- **AND** an error is thrown if the referenced plugin class is not registered
- **AND** an error is thrown if the positioning creates a circular dependency

#### Scenario: Remove global plugin by class

- **WHEN** calling `apiRegistry.plugins.remove(PluginClass)`
- **THEN** the plugin instance of that class is removed from the global plugins registry
- **AND** the plugin's `destroy()` method is called if available
- **AND** the plugin no longer executes for any service
- **AND** error is thrown if plugin not registered

#### Scenario: Check if plugin is registered

- **WHEN** calling `apiRegistry.plugins.has(PluginClass)`
- **THEN** returns `true` if a plugin of that class is registered
- **AND** returns `false` otherwise
- **AND** check is type-safe (compile-time validation)

#### Scenario: Get global plugins

- **WHEN** calling `apiRegistry.plugins.getAll()`
- **THEN** a readonly array of all global plugin instances is returned
- **AND** plugins are in execution order (respecting FIFO and before/after constraints)

#### Scenario: Get plugin by class reference

- **WHEN** calling `apiRegistry.plugins.getPlugin(PluginClass)`
- **THEN** the plugin instance of that class is returned
- **AND** the return type is correctly inferred
- **AND** returns `undefined` if not found

#### Scenario: Global plugins apply to new services

- **WHEN** a new service is registered via `apiRegistry.register()` after global plugins exist
- **THEN** all global plugins are automatically applied to the new service instance
- **AND** the order of registration (service vs plugin) does not affect behavior

#### Scenario: Registry reset clears global plugins

- **WHEN** calling `apiRegistry.reset()`
- **THEN** all global plugins are removed
- **AND** `destroy()` is called on each global plugin
- **AND** the global plugins array is cleared

### Requirement: Service-Level Plugin Management (Namespaced API)

The system SHALL allow individual services to register service-specific plugins and exclude global plugins by class via `service.plugins` namespace.

#### Scenario: Register service-specific plugins with plugins.add()

- **WHEN** calling `service.plugins.add(plugin1, plugin2)`
- **THEN** the plugins are registered for this service only
- **AND** service plugins execute after global plugins
- **AND** service plugins execute in registration order (FIFO)
- **AND** duplicates of same class ARE allowed (different configs)

#### Scenario: Exclude global plugins by class

- **WHEN** calling `service.plugins.exclude(AuthPlugin, MetricsPlugin)`
- **THEN** the specified plugin classes are added to the service's exclusion list
- **AND** subsequent requests will NOT execute excluded plugins
- **AND** the global registry is NOT modified (other services still receive the plugins)
- **AND** exclusion is type-safe (compile-time validation)

#### Scenario: Get excluded plugin classes

- **WHEN** calling `service.plugins.getExcluded()`
- **THEN** a readonly array of excluded plugin classes is returned

#### Scenario: Get service plugins

- **WHEN** calling `service.plugins.getAll()`
- **THEN** a readonly array of service-specific plugins is returned
- **AND** does NOT include global plugins

#### Scenario: Get plugin by class reference (service-level)

- **WHEN** calling `service.plugins.getPlugin(PluginClass)`
- **THEN** the plugin instance of that class is returned
- **AND** searches service plugins first, then global plugins
- **AND** the return type is correctly inferred
- **AND** returns `undefined` if not found

#### Scenario: Plugin merging respects exclusions by class

- **WHEN** `BaseApiService` executes a request
- **THEN** global plugins are filtered using `instanceof` to remove excluded classes
- **AND** remaining global plugins execute first (in FIFO order)
- **AND** service plugins execute after (in FIFO order)

#### Scenario: Reverse order for response processing

- **WHEN** response is received from HTTP request (or short-circuit)
- **THEN** `onResponse` methods are called in reverse order
- **AND** last registered plugin's `onResponse` runs first
- **AND** this implements the onion model

### Requirement: Internal Global Plugins Injection

The system SHALL provide internal mechanism for services to receive global plugins from the registry.

#### Scenario: _setGlobalPluginsProvider() internal method

- **WHEN** a service is registered via `apiRegistry.register(ServiceClass)`
- **THEN** `service._setGlobalPluginsProvider(provider)` is called
- **AND** the provider is a function returning readonly array of global plugins
- **AND** this method is internal (underscore convention)
- **AND** derived service classes do NOT need to know about this method

#### Scenario: Service accesses global plugins via provider

- **WHEN** a service needs to execute plugin chain
- **THEN** it calls the global plugins provider to get current plugins
- **AND** this ensures services see newly added global plugins
- **AND** this allows for dynamic global plugin registration

### Requirement: Plugin Lifecycle Method Contracts

The system SHALL enforce specific contracts for each plugin lifecycle method.

#### Scenario: onRequest lifecycle method contract

- **WHEN** a plugin defines `onRequest` method
- **THEN** it receives `ApiRequestContext` with method, url, headers, body (pure request data)
- **AND** it returns `ApiRequestContext` (modified or unchanged) for normal flow
- **AND** it returns `{ shortCircuit: ApiResponseContext }` to skip HTTP request
- **AND** it may return a Promise for async operations

#### Scenario: onResponse lifecycle method contract

- **WHEN** a plugin defines `onResponse` method
- **THEN** it receives `ApiResponseContext` and original `ApiRequestContext`
- **AND** it returns `ApiResponseContext` (modified or unchanged)
- **AND** it may return a Promise for async operations

#### Scenario: onError lifecycle method contract

- **WHEN** a plugin defines `onError` method
- **THEN** it receives `Error` and original `ApiRequestContext`
- **AND** it returns `Error` (modified or unchanged) to continue error flow
- **AND** it returns `ApiResponseContext` to recover from error
- **AND** it may return a Promise for async operations

#### Scenario: destroy lifecycle method contract

- **WHEN** a plugin defines `destroy` method
- **THEN** it is called when plugin is unregistered (via `remove`)
- **AND** it is called when registry is reset (via `reset`)
- **AND** it is synchronous (no Promise return)
- **AND** it should clean up resources (close connections, clear timers, etc.)

### Requirement: ApiRegistry Interface Extension (Class-Based)

The system SHALL provide class-based service management and namespaced plugin management.

#### Scenario: ApiRegistry interface includes class-based service methods

- **WHEN** checking the `ApiRegistry` interface in types.ts
- **THEN** `register<T extends BaseApiService>(serviceClass: new () => T): void` is defined
- **AND** `getService<T extends BaseApiService>(serviceClass: new () => T): T` is defined
- **AND** `registerMocks<T extends BaseApiService>(serviceClass: new () => T, mockMap: MockMap): void` is defined
- **AND** `has<T extends BaseApiService>(serviceClass: new () => T): boolean` is defined
- **AND** `getDomains()` is NOT defined (removed)

#### Scenario: ApiRegistry interface includes plugins namespace

- **WHEN** checking the `ApiRegistry` interface in types.ts
- **THEN** `readonly plugins: { ... }` namespace object is defined
- **AND** it contains all plugin management methods

#### Scenario: ApiRegistry.plugins includes add() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `add(...plugins: ApiPluginBase[]): void` method is defined
- **AND** it registers multiple plugins in FIFO order
- **AND** it throws on duplicate plugin class

#### Scenario: ApiRegistry.plugins includes addBefore() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `addBefore<T extends ApiPluginBase>(plugin: ApiPluginBase, before: PluginClass<T>): void` method is defined
- **AND** it inserts plugin before the target class
- **AND** it throws if target class not registered
- **AND** it throws on circular dependency

#### Scenario: ApiRegistry.plugins includes addAfter() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `addAfter<T extends ApiPluginBase>(plugin: ApiPluginBase, after: PluginClass<T>): void` method is defined
- **AND** it inserts plugin after the target class
- **AND** it throws if target class not registered
- **AND** it throws on circular dependency

#### Scenario: ApiRegistry.plugins includes remove() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `remove<T extends ApiPluginBase>(pluginClass: PluginClass<T>): void` method is defined
- **AND** it removes plugin by class reference (type-safe)
- **AND** it calls destroy() if defined
- **AND** it throws if plugin not registered

#### Scenario: ApiRegistry.plugins includes has() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `has<T extends ApiPluginBase>(pluginClass: PluginClass<T>): boolean` method is defined
- **AND** it checks registration by class reference (type-safe)

#### Scenario: ApiRegistry.plugins includes getAll() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `getAll(): readonly ApiPluginBase[]` method is defined
- **AND** it returns plugins in execution order

#### Scenario: ApiRegistry.plugins includes getPlugin() method

- **WHEN** checking the `ApiRegistry.plugins` interface
- **THEN** `getPlugin<T extends ApiPluginBase>(pluginClass: new (...args: never[]) => T): T | undefined` method is defined
- **AND** it returns the plugin instance or undefined

### Requirement: Type Definitions

The system SHALL provide comprehensive type definitions for the class-based plugin system.

#### Scenario: ApiPluginBase abstract class (non-generic)

- **WHEN** using `ApiPluginBase` abstract class
- **THEN** it defines optional `onRequest` method signature
- **AND** it defines optional `onResponse` method signature
- **AND** it defines optional `onError` method signature
- **AND** it defines optional `destroy` method signature
- **AND** it is non-generic (used for storage)

#### Scenario: ApiPlugin abstract class with parameter property

- **WHEN** using `ApiPlugin<TConfig>` abstract class
- **THEN** it extends `ApiPluginBase`
- **AND** it uses TypeScript parameter property: `constructor(protected readonly config: TConfig) {}`
- **AND** `TConfig` defaults to `void`

#### Scenario: PluginClass type for class references

- **WHEN** using `PluginClass<T>` type
- **THEN** it represents a class constructor for plugins
- **AND** it enables type-safe plugin identification
- **AND** definition: `type PluginClass<T extends ApiPluginBase = ApiPluginBase> = abstract new (...args: any[]) => T`

#### Scenario: ApiRequestContext type (pure request data)

- **WHEN** using `ApiRequestContext` type
- **THEN** it has readonly `method: string` property
- **AND** it has readonly `url: string` property
- **AND** it has readonly `headers: Record<string, string>` property
- **AND** it has readonly optional `body?: unknown` property
- **AND** it does NOT have `serviceName` (pure request data only)

#### Scenario: ApiResponseContext type

- **WHEN** using `ApiResponseContext` type
- **THEN** it has readonly `status: number` property
- **AND** it has readonly `headers: Record<string, string>` property
- **AND** it has readonly `data: unknown` property

#### Scenario: ShortCircuitResponse type

- **WHEN** using `ShortCircuitResponse` type
- **THEN** it has readonly `shortCircuit: ApiResponseContext` property
- **AND** returning this from `onRequest` skips HTTP request

#### Scenario: isShortCircuit type guard

- **WHEN** calling `isShortCircuit(result)` with a `ShortCircuitResponse`
- **THEN** it returns `true`
- **AND** TypeScript narrows `result` to `ShortCircuitResponse` type
- **WHEN** calling `isShortCircuit(result)` with an `ApiRequestContext`
- **THEN** it returns `false`
- **AND** TypeScript narrows `result` to `ApiRequestContext` type
- **WHEN** calling `isShortCircuit(undefined)`
- **THEN** it returns `false`

### Requirement: OCP-Compliant Dependency Injection

The system SHALL support OCP-compliant plugin configuration where plugins receive service-specific behavior via constructor config, not by accessing context.

#### Scenario: Plugin receives behavior via config (pure DI)

- **WHEN** a plugin needs service-specific behavior
- **THEN** the behavior is injected via constructor config
- **AND** the plugin does NOT access any service identification from context
- **AND** use service-level plugins for per-service configuration
- **AND** example:
```typescript
// Pure DI approach - no service identification needed in context
class RateLimitPlugin extends ApiPlugin<{ limit: number }> {
  onRequest(ctx: ApiRequestContext) {
    // Apply rate limiting with injected limit
    return ctx;
  }
}

// Different limits per service via service-level plugins (duplicates allowed)
userService.plugins.add(new RateLimitPlugin({ limit: 100 }));
adminService.plugins.add(new RateLimitPlugin({ limit: 1000 }));
```

#### Scenario: URL-based configuration for global plugins

- **WHEN** a global plugin needs to vary behavior
- **THEN** use URL-based configuration instead of service identification
- **AND** example:
```typescript
class UrlRateLimitPlugin extends ApiPlugin<{ getLimitForUrl: (url: string) => number }> {
  onRequest(ctx: ApiRequestContext) {
    const limit = this.config.getLimitForUrl(ctx.url);
    return ctx;
  }
}

apiRegistry.plugins.add(new UrlRateLimitPlugin({
  getLimitForUrl: (url) => url.includes('/admin') ? 1000 : 100
}));
```

#### Scenario: Pure request data in context

- **WHEN** plugin receives `ApiRequestContext`
- **THEN** only pure request data is available (method, url, headers, body)
- **AND** `ctx.serviceName` is NOT available
- **AND** service-specific behavior comes from config or service-level plugins

### Requirement: Tree-Shaking Compliance

The system SHALL ensure plugin classes are tree-shakeable.

#### Scenario: No static properties on plugin classes

- **WHEN** defining plugin classes
- **THEN** no `static` properties are allowed
- **AND** no module-level instantiation is allowed
- **AND** bundlers can tree-shake unused plugins

#### Scenario: Package configuration for tree-shaking

- **WHEN** building the @hai3/api package
- **THEN** package.json has `"sideEffects": false`
- **AND** tsconfig.json has `"module": "ESNext"`
