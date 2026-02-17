# Design: Registry and Runtime Architecture

This document covers the ScreensetsRegistry runtime isolation model, action chain mediation, MFE bridges, handler registration, and dynamic registration.

**Related Documents:**
- [Type System](./type-system.md) - Type System Plugin interface, GTS types, contract validation
- [MFE Loading](./mfe-loading.md) - MfeHandler abstract class, handler registry, Module Federation loading
- [MFE API](./mfe-api.md) - MfeEntryLifecycle interface
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain types
- [Schemas](./schemas.md) - ExtensionDomain, Extension, LifecycleStage, LifecycleHook schema definitions
- [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md) - Lifecycle actions and domain semantics

---

## Design Notes

### No Static Methods on Abstract Classes

All abstract classes in the MFE system use instance methods only -- no static methods, no static factory methods. This is a universal constraint and is not restated per-class below.

### Standalone Functions vs Class-Based Capabilities

The established rule is: "NEVER standalone functions, ALWAYS abstract class + concrete class." This applies to **stateful capabilities** -- components that manage coordination, state, or property subscriptions. See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for the complete pattern.

**Exempt from this rule:**
- **Pure validation helpers** (stateless, all dependencies as parameters): `validateContract`, `validateExtensionType`, `validateDomainLifecycleHooks`, `validateExtensionLifecycleHooks`.
- **Small stateful utilities** with minimal surface area: `OperationSerializer` (70 lines, single public method).

### Runtime Bridge Factory (Class-Based)

`RuntimeBridgeFactory` wires internal bridge connections (bridge pairs, property subscriptions, action chain callbacks, child domain forwarding). It is a distinct concern from the handler-level `MfeBridgeFactory` -- see [glossary](./glossary.md) for definitions of both.

```typescript
// packages/screensets/src/mfe/runtime/runtime-bridge-factory.ts
// ABSTRACT class (~20 lines, pure contract)

import type { ParentMfeBridge, ChildMfeBridge } from '../handler/types';
import type { ExtensionDomainState } from './extension-manager';
import type { ActionsChain } from '../types';
import type { ActionHandler } from '../mediator/types';

/**
 * Abstract runtime bridge factory -- contract for internal bridge wiring.
 *
 * Creates bidirectional bridge connections between host and child MFEs,
 * including property subscription wiring, action chain callback injection,
 * and child domain forwarding setup.
 *
 * This is NOT the same as MfeBridgeFactory in handler/types.ts, which is
 * a public abstraction for custom handler bridge implementations.
 *
 * @internal
 */
export abstract class RuntimeBridgeFactory {
  /**
   * Create a bridge connection between host and child MFE.
   *
   * @param domainState - Domain state containing properties and subscribers
   * @param extensionId - ID of the extension
   * @param entryTypeId - Type ID of the MFE entry
   * @param executeActionsChain - Callback for executing actions chains
   * @param registerDomainActionHandler - Callback for registering child domain action handlers
   * @param unregisterDomainActionHandler - Callback for unregistering child domain action handlers
   * @returns Object containing parent and child bridge instances
   */
  abstract createBridge(
    domainState: ExtensionDomainState,
    extensionId: string,
    entryTypeId: string,
    executeActionsChain: (chain: ActionsChain) => Promise<void>,
    registerDomainActionHandler: (domainId: string, handler: ActionHandler) => void,
    unregisterDomainActionHandler: (domainId: string) => void
  ): { parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge };

  /**
   * Dispose a bridge connection and clean up domain subscribers.
   *
   * @param domainState - Domain state containing property subscribers
   * @param parentBridge - Parent bridge to dispose
   */
  abstract disposeBridge(
    domainState: ExtensionDomainState,
    parentBridge: ParentMfeBridge
  ): void;
}
```

`DefaultRuntimeBridgeFactory` (concrete, `@internal`, NOT exported from barrel) extends `RuntimeBridgeFactory`. It creates bridge pairs (`ParentMfeBridgeImpl`/`ChildMfeBridgeImpl`), connects property subscriptions, wires action chain callbacks, and sets up child domain forwarding. Constructed directly by `DefaultScreensetsRegistry` and passed to `DefaultMountManager` via constructor injection. `DefaultMountManager` stores the abstract `RuntimeBridgeFactory` type.

### No Standalone Factory Functions for Stateful Components

Standalone factory functions and static factory methods on abstract classes are both **forbidden**. The only allowed construction patterns are:

1. **Singleton constant** -- no configuration needed (e.g., `gtsPlugin`)
2. **Factory-with-cache** -- configurable singleton (e.g., `ScreensetsRegistry` via `screensetsRegistryFactory`)
3. **Direct construction in internal wiring code** -- multi-instance (e.g., `MfeStateContainer` by `DefaultMountManager`)

See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for code examples, violation patterns, and rationale.

### Cross-Runtime Action Chain Routing

When a child MFE defines its own domains in a child `ScreensetsRegistry`, the parent's `ActionsChainsMediator` has no visibility into those registrations. The `ChildDomainForwardingHandler` (an `@internal` class implementing `ActionHandler`) bridges this gap: it is registered in the parent's mediator for each child domain ID and forwards actions via `parentBridgeImpl.sendActionsChain()` through the existing bridge transport. No new transport mechanism or mediator changes are needed -- the forwarding handler is a standard `ActionHandler` that the mediator resolves like any other domain handler. See [MFE API - Cross-Runtime Action Chain Routing](./mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition) for the complete design.

### ScreensetsRegistry as Facade

`ScreensetsRegistry` is a facade (~20 public methods) that delegates internally to specialized collaborators. See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for the complete abstract class definition, collaborator table, and construction pattern.

### Concurrency and Operation Serialization

**Context**: The async `registerExtension()`, `unregisterExtension()` methods on the registry, and internal load/mount/unmount operations (triggered via actions chains), require serialization to prevent undefined behavior from concurrent calls on the same entity.

**Rule**: All async registration and lifecycle operations are **serialized per entity ID**. Specifically:

- **Per-extension serialization**: Concurrent calls to `registerExtension`, `unregisterExtension`, and internal load/mount/unmount operations (via `ExtensionLifecycleActionHandler` callbacks through `OperationSerializer`) for the same extension ID are queued and executed sequentially. A second call waits for the first to complete before starting.
- **Per-domain serialization**: `registerDomain` is synchronous. Concurrent calls to `unregisterDomain` for the same domain ID are queued and executed sequentially.
- **Cross-entity independence**: Operations on different entity IDs may execute concurrently (e.g., registering extension A while mounting extension B).
- **Mount during register**: Triggering a mount (via `mount_ext` action) for an extension while `registerExtension(extId)` is in progress will queue behind the registration (both go through the same per-extension serializer). The mount proceeds only after registration completes successfully. If registration fails, the queued mount receives the registration error.
- **Duplicate concurrent registration**: Calling `registerExtension(extId)` twice concurrently for the same ID will serialize -- the second call will detect the already-registered state and either no-op or throw, depending on the idempotency policy.
- **Domain unregister during extension registration**: Calling `unregisterDomain(domainId)` while `registerExtension(extId)` (which targets that domain) is in progress will not interfere -- the extension registration holds a reference to the domain state. However, the extension will be cascade-unregistered by the domain unregistration once it completes.

**Implementation**: Use a per-entity-ID promise chain or mutex pattern. This avoids global locks while preventing race conditions on individual entities.

---

## Decisions

### Decision 13: Framework-Agnostic Instance-Level Isolation (Default Behavior)

See [Runtime Isolation in overview.md](./overview.md#runtime-isolation-default-behavior) for the complete isolation model, architecture diagrams, and recommendations.

`ScreensetsRegistry` uses the abstract class + concrete implementation + factory-with-cache pattern. See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for the complete abstract class definition, `DefaultScreensetsRegistry` concrete class, `ScreensetsRegistryFactory`, and file layout.

### Decision 15: Error Class Hierarchy

The MFE system defines a hierarchy of error classes for specific failure scenarios. See [mfe-errors.md](./mfe-errors.md) for the complete error class definitions.

### Decision 16: Shadow DOM Utilities

Shadow DOM utilities are provided by `@hai3/screensets` for style isolation. The public barrel exports `createShadowRoot` and `injectCssVariables`. Other shadow DOM helpers (`injectStylesheet`, `ShadowRootOptions`) are internal.

**Automatic CSS isolation** (Phase 43): `createShadowRoot()` automatically injects a `<style id="__hai3-shadow-isolation__">` element containing `:host { all: initial; display: block; }` into every shadow root it creates. This guarantees full CSS isolation at the platform level -- no CSS (including custom properties) leaks from host to MFE. The behavior is idempotent: if a style element with that ID already exists in the shadow root, it is reused rather than duplicated. This applies to both newly created shadow roots (via `attachShadow()`) and pre-existing shadow roots passed to `createShadowRoot()`.

**Default handler behavior**: With `MfeHandlerMF`, `DefaultMountManager` creates the Shadow DOM boundary automatically during mount. The MFE's `mount(container, bridge)` receives the shadow root, NOT the host element. See [Principles - Shadow DOM Style Isolation](./principles.md#shadow-dom-style-isolation-default-handler) for the complete CSS isolation model (CSS variable behavior, style initialization, custom handler options).

**Mount pipeline implementation** (Phase 42 fix): `DefaultMountManager.mountExtension()` performs the following steps:
1. Container `Element` obtained from `ContainerProvider`
2. Narrow to `HTMLElement`: `const hostElement = container as HTMLElement`
3. Create shadow root: `const shadowRoot = createShadowRoot(hostElement)` (from `../shadow`)
4. Store shadow root: `extensionState.shadowRoot = shadowRoot`
5. Pass shadow root to lifecycle: `lifecycle.mount(shadowRoot, childBridge)`
6. On unmount: `lifecycle.unmount(extensionState.shadowRoot ?? container)`

**`MfeEntryLifecycle` type signature** (Phase 42 fix): The `mount()` and `unmount()` methods accept `Element | ShadowRoot` as the container parameter. `ShadowRoot` extends `DocumentFragment` (not `Element`), but React's `createRoot()` accepts `Element | DocumentFragment`, so MFE lifecycle implementations work without narrowing. With the default handler, `container` is always a `ShadowRoot`; with custom handlers, it may be a plain `Element`.

**Note on `HTMLElement` narrowing**: `createShadowRoot()` requires `HTMLElement` because `attachShadow()` is defined on `HTMLElement`, not the more general `Element`. The narrowing happens inside `DefaultMountManager`, NOT in MFE lifecycle code. MFEs typically do not need to call `createShadowRoot()` themselves.

### Decision 17: Dynamic Registration Model

**What**: Extensions and MFEs can be registered at ANY time during the application lifecycle.

**Why**:
- Extensions are NOT known at app initialization time
- Enables runtime configuration, feature flags, and permission-based extensibility

**Boundary**: The MFE system's scope is **registration and lifecycle**, NOT fetching. How entities are obtained from backends is outside the MFE system scope. Entities become the MFE system's concern only AFTER they are registered.

#### ScreensetsRegistry Dynamic API

The `ScreensetsRegistry` is an abstract class. The dynamic API is defined as abstract method signatures. See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for the complete abstract class definition.

**System Boundary:** Entity fetching is outside MFE system scope. See [System Boundary](./overview.md#system-boundary) for details.

<a name="load-vs-mount"></a>
**Load vs Mount:** Loading fetches the JavaScript bundle; mounting renders to DOM. An extension can be loaded but not mounted (preloading scenario). The mount operation auto-loads if not already loaded. The unmount operation does NOT unload the bundle (stays cached for remounting). See [mfe-ext-lifecycle-actions.md](./mfe-ext-lifecycle-actions.md) for the consumer-facing API via actions chains.

**Manifest Handling:** MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf) for details.

#### Usage Examples

```typescript
// Dynamic registration after user action
settingsButton.onClick = async () => {
  const extensionId = 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics.widgets.chart.v1';
  const domainId = 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1';

  // Extension using derived type that includes domain-specific fields
  // Note: Instance IDs do NOT end with ~ (only schema IDs do)
  await runtime.registerExtension({
    id: extensionId,
    domain: domainId,
    entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    // Domain-specific fields from derived Extension type (no uiMeta wrapper)
    title: 'Analytics',
    size: 'medium',
  });

  // Mount via actions chain (NOT via direct registry method)
  // Container is provided by the domain's ContainerProvider (registered with the domain)
  await runtime.executeActionsChain({
    action: {
      type: HAI3_ACTION_MOUNT_EXT,
      target: domainId,
      payload: { extensionId },
    },
  });
};

// Registration after backend API response (application handles fetching)
async function onUserLogin(user: User) {
  // Application code fetches entities - this is OUTSIDE MFE system scope
  const response = await fetch('/api/extensions', {
    headers: { 'Authorization': `Bearer ${user.token}` }
  });
  const { domains, extensions } = await response.json();

  // MFE system only handles registration of already-fetched entities
  // Each domain requires a ContainerProvider (see mfe-ext-lifecycle-actions.md)
  for (const domain of domains) {
    runtime.registerDomain(domain, containerProviderForDomain(domain.id));
  }
  for (const extension of extensions) {
    await runtime.registerExtension(extension);
  }
}

// Domain-level shared property updates
runtime.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, 'dark');
runtime.updateDomainProperties(domainId, new Map([
  [HAI3_SHARED_PROPERTY_THEME, 'dark'],
  [HAI3_SHARED_PROPERTY_LANGUAGE, 'de'],
]));
```

---

### Decision 18: Abstract Class Layers with Singleton Construction

**What**: Every major stateful component MUST have an abstract class defining the public contract and a concrete implementation. Single-instance components with no configuration are exposed as singleton constants; single-instance components that require configuration use the factory-with-cache pattern; multi-instance components are constructed directly by internal wiring code. External consumers ALWAYS depend on abstract types, never concrete classes. Standalone factory functions are forbidden.

**Why**:
- **Dependency Inversion Principle (DIP)**: Consumers depend on stable abstractions, not volatile implementations
- **Testability**: Tests can substitute mock implementations of the abstract class without knowing the concrete class
- **Encapsulation**: Internal methods (e.g., `getDomainState()`, `triggerLifecycleStageInternal()`) live on concrete classes only and are invisible to public consumers. No public API exists for testing purposes.
- **Circular import prevention**: Modules that reference `ScreensetsRegistry` import only the abstract class, breaking circular dependency chains that occur when importing the concrete class with all its collaborator imports
- **Consistency**: Aligns `ScreensetsRegistry` with the existing pattern used by `RuntimeCoordinator`/`WeakMapRuntimeCoordinator`, `ActionsChainsMediator`/`DefaultActionsChainsMediator`, `MfeHandler`/`MfeHandlerMF`, `ExtensionManager`/`DefaultExtensionManager`, etc.

#### Architectural Principle

```
ABSTRACT (public API)                    CONCRETE (hidden implementation)
========================                 ================================
ScreensetsRegistry                  -->  DefaultScreensetsRegistry
ExtensionManager                    -->  DefaultExtensionManager
LifecycleManager                    -->  DefaultLifecycleManager
MountManager                        -->  DefaultMountManager
RuntimeCoordinator                  -->  WeakMapRuntimeCoordinator
ActionsChainsMediator               -->  DefaultActionsChainsMediator
MfeHandler                          -->  MfeHandlerMF
MfeBridgeFactory                     -->  MfeBridgeFactoryDefault
RuntimeBridgeFactory (@internal)     -->  DefaultRuntimeBridgeFactory
TypeSystemPlugin                    -->  GtsPlugin
MfeStateContainer<TState>           -->  DefaultMfeStateContainer<TState>

CONSTRUCTION (only place that knows concrete)
==============================================
screensetsRegistryFactory.build(config) (factory-with-cache)  -->  ScreensetsRegistry (one instance, deferred to application wiring)
new DefaultRuntimeBridgeFactory()                             -->  RuntimeBridgeFactory (internal wiring only, by DefaultScreensetsRegistry)
new DefaultMfeStateContainer(config)                          -->  MfeStateContainer<TState> (internal wiring only, by DefaultMountManager)
gtsPlugin (singleton constant)                                -->  TypeSystemPlugin (one instance, no factory)
```

**Rule**: Only singleton constant initializers (in barrel/initialization files), factory-with-cache implementations, and internal wiring constructors reference concrete classes. All other code types against the abstract class. Standalone factory functions are forbidden.

#### ScreensetsRegistry Abstract Class

```typescript
// packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts
// ~75 lines -- pure abstract class with public method signatures only
// Load/mount/unmount are internal to MountManager -- see "Load vs Mount" above.

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type { ExtensionDomain, Extension, ActionsChain } from '../types';
import type { ContainerProvider } from './container-provider';
import type { CustomActionHandler } from './extension-lifecycle-action-handler';

/**
 * Abstract ScreensetsRegistry - public contract for the MFE runtime facade.
 *
 * This is the ONLY type external consumers should depend on.
 * Obtain via screensetsRegistryFactory.build(config).
 */
export abstract class ScreensetsRegistry {
  abstract readonly typeSystem: TypeSystemPlugin;

  // --- Registration ---
  abstract registerDomain(domain: ExtensionDomain, containerProvider: ContainerProvider, onInitError?: (error: Error) => void, customActionHandler?: CustomActionHandler): void;
  abstract unregisterDomain(domainId: string): Promise<void>;
  abstract registerExtension(extension: Extension): Promise<void>;
  abstract unregisterExtension(extensionId: string): Promise<void>;

  // --- Domain Properties ---
  abstract updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void;
  abstract getDomainProperty(domainId: string, propertyTypeId: string): unknown;
  abstract updateDomainProperties(domainId: string, properties: Map<string, unknown>): void;

  // --- Action Chains ---
  abstract executeActionsChain(chain: ActionsChain): Promise<void>;

  // --- Lifecycle Triggering ---
  abstract triggerLifecycleStage(extensionId: string, stageId: string): Promise<void>;
  abstract triggerDomainLifecycleStage(domainId: string, stageId: string): Promise<void>;
  abstract triggerDomainOwnLifecycleStage(domainId: string, stageId: string): Promise<void>;

  // --- Query ---
  abstract getExtension(extensionId: string): Extension | undefined;
  abstract getDomain(domainId: string): ExtensionDomain | undefined;
  abstract getExtensionsForDomain(domainId: string): Extension[];

  /**
   * Returns the extension ID currently mounted in the given domain, or undefined if
   * no extension is mounted. Used by ExtensionLifecycleActionHandler for swap
   * semantics (screen domain unmounts the current extension before mounting a new one).
   *
   * Each domain supports at most one mounted extension at a time.
   */
  abstract getMountedExtension(domainId: string): string | undefined;

  /**
   * Returns the ParentMfeBridge for the given extension, or null if the extension
   * is not mounted or does not exist. This is a query method (same category as
   * getMountedExtension) -- it reads from ExtensionState.bridge, which is set
   * by MountManager.mountExtension() during mount and cleared during unmount.
   *
   * Usage pattern: mount via executeActionsChain(), then query the bridge:
   *
   *   await registry.executeActionsChain({ action: { type: HAI3_ACTION_MOUNT_EXT, ... } });
   *   const bridge = registry.getParentBridge(extensionId);
   *
   * See mfe-ext-lifecycle-actions.md - ParentMfeBridge Return Value Gap.
   */
  abstract getParentBridge(extensionId: string): ParentMfeBridge | null;

  // --- Lifecycle ---
  abstract dispose(): void;
}

// Load/mount/unmount are internal to MountManager -- see "Load vs Mount" above.
```

#### Factory-with-Cache Pattern

The `screensetsRegistryFactory` factory-with-cache pattern is the current construction mechanism for `ScreensetsRegistry`. The factory provides a `build(config)` method to obtain the `ScreensetsRegistry` instance.

**Why factory-with-cache instead of singleton constant**: The `ScreensetsRegistry` requires a `TypeSystemPlugin` at construction time (via `ScreensetsRegistryConfig.typeSystem`). A singleton constant would hardcode `gtsPlugin` at module initialization time, defeating the pluggability of `TypeSystemPlugin`. The factory-with-cache pattern defers this binding to application wiring time, allowing consumers to provide any `TypeSystemPlugin` implementation.

```typescript
// packages/screensets/src/mfe/runtime/ScreensetsRegistryFactory.ts
/**
 * Abstract factory for creating the ScreensetsRegistry singleton.
 * The build() method accepts configuration and returns the registry instance.
 * After the first build(), subsequent calls return the cached instance.
 */
export abstract class ScreensetsRegistryFactory {
  abstract build(config: ScreensetsRegistryConfig): ScreensetsRegistry;
}
```

`DefaultScreensetsRegistryFactory` (concrete, NOT exported from barrel) extends `ScreensetsRegistryFactory`. It caches the first instance created via `build(config)` and returns the cached instance on subsequent calls, throwing if the config differs.

```typescript
// In packages/screensets/src/mfe/runtime/index.ts (barrel/initialization file)

import { DefaultScreensetsRegistryFactory } from './DefaultScreensetsRegistryFactory';

export { ScreensetsRegistry } from './ScreensetsRegistry';  // abstract class (pure contract)
export { ScreensetsRegistryFactory } from './ScreensetsRegistryFactory';  // abstract factory (pure contract)

// Singleton factory constant -- the ONLY way to obtain a ScreensetsRegistry instance
export const screensetsRegistryFactory: ScreensetsRegistryFactory = new DefaultScreensetsRegistryFactory();
```

```typescript
// Consumer usage (in framework plugin or application wiring code)
import { screensetsRegistryFactory } from '@hai3/screensets';
import { gtsPlugin } from '@hai3/screensets/plugins/gts';

// GTS binding happens at application wiring level, not module level
const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
```

#### DefaultScreensetsRegistry (Concrete, NOT Exported)

```typescript
// packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts
// ~600 lines -- full implementation, NOT exported from public barrel
// Load/mount/unmount are internal to MountManager -- see "Load vs Mount" above.

import { ScreensetsRegistry } from './ScreensetsRegistry';
// ... all collaborator imports ...

class DefaultScreensetsRegistry extends ScreensetsRegistry {
  // ... full implementation of all abstract methods ...

  // Internal collaborators are ALWAYS constructed in the constructor.
  // coordinator and mediator are never injected via config.
  constructor(config: ScreensetsRegistryConfig) {
    super();
    this.typeSystem = config.typeSystem;
    this.coordinator = new WeakMapRuntimeCoordinator();
    this.mediator = new DefaultActionsChainsMediator({ /* ... */ });
    // ... remaining collaborator construction ...
  }
}
```

**No test-only public APIs**: `DefaultScreensetsRegistry` does NOT expose any public methods or accessors that exist solely for test consumption. Tests must exercise the public API defined on the abstract `ScreensetsRegistry` class. Internal state is verified through observable behavior (e.g., registering an extension and then querying it via `getExtension()`), not by inspecting private collaborator maps.

#### Collaborator File Splits

Each collaborator is split into an abstract file (pure contract) and a concrete file (implementation). Only `DefaultScreensetsRegistry` imports concrete collaborator classes. `OperationSerializer` is not split (too small).

#### Callback Injection for Mediator's getDomainState Dependency

`DefaultActionsChainsMediator` needs `getDomainState(domainId)` for action support validation and timeout resolution. Since this is a concrete-only method, the mediator receives it via **callback injection** in its constructor config. This follows the same pattern used by all collaborators and eliminates the mediator's dependency on the `ScreensetsRegistry` type entirely.

#### L2 `executeActionsChain` Wrapper for Store Dispatch (Phase 43)

`ScreensetsRegistryConfig` contains only `typeSystem` and `mfeHandlers`. L1 (`@hai3/screensets`) has ZERO knowledge of the framework store or React hooks. Store dispatch for mount/unmount state changes is handled entirely at L2 (`@hai3/framework`) by wrapping the registry's public `executeActionsChain` method after construction.

```typescript
// In ScreensetsRegistryConfig (config.ts) -- no store-related fields
export interface ScreensetsRegistryConfig {
  typeSystem: TypeSystemPlugin;
  mfeHandlers?: MfeHandler[];
}
```

**Mechanism**: After `screensetsRegistryFactory.build()` returns the registry instance, the L2 microfrontends plugin wraps `executeActionsChain` to intercept successful mount/unmount completions and dispatch to the store:

```typescript
// In microfrontends plugin (L2)
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

**Layer boundary rationale**: The wrapper pattern keeps L1 entirely free of store concerns. The wrapper only dispatches on SUCCESSFUL completion -- if `originalExecuteActionsChain` throws, the `await` naturally propagates the error before the dispatch code runs. The store dispatch is a notification signal -- the authoritative mount state remains in the registry's internal `ExtensionState`. The React hooks read from the registry (`getMountedExtension`, `getRegisteredPackages`) and use the store subscription solely as a "something changed" trigger.

**Swap semantics**: When a domain receives a `mount_ext` action for extension B while extension A is mounted, the L1 `ExtensionLifecycleActionHandler` auto-unmounts A then mounts B within a single `executeActionsChain` call. The wrapper sees only `HAI3_ACTION_MOUNT_EXT`. Dispatching `setExtensionMounted({ domainId, extensionId: B })` overwrites the previous value, which is correct for swap semantics.

#### Concrete-Only Internal Methods

Internal-only methods live on concrete classes, not abstract classes. `DefaultScreensetsRegistry` types collaborator fields as concrete types when it needs access to concrete-only methods (e.g., `DefaultExtensionManager` for `getDomainState()`, `DefaultLifecycleManager` for `triggerLifecycleStageInternal()`). All collaborators are constructed internally by `DefaultScreensetsRegistry` in its constructor.

#### File Layout

```
packages/screensets/src/mfe/runtime/
  ScreensetsRegistry.ts              # ABSTRACT class (pure contract)
  ScreensetsRegistryFactory.ts       # ABSTRACT factory class (pure contract)
  DefaultScreensetsRegistry.ts       # CONCRETE class (NOT exported from barrel)
  DefaultScreensetsRegistryFactory.ts # CONCRETE factory (NOT exported from barrel)
  index.ts                           # Barrel: exports abstract classes + screensetsRegistryFactory singleton
  config.ts                          # ScreensetsRegistryConfig interface
  extension-manager.ts               # ABSTRACT class + types
  default-extension-manager.ts       # CONCRETE class
  lifecycle-manager.ts               # ABSTRACT class + callback types
  default-lifecycle-manager.ts       # CONCRETE class
  mount-manager.ts                   # ABSTRACT class + callback types
  default-mount-manager.ts           # CONCRETE class
  container-provider.ts              # ABSTRACT class (pure contract, exported from barrel)
  runtime-bridge-factory.ts          # ABSTRACT class (pure contract, @internal)
  default-runtime-bridge-factory.ts  # CONCRETE class (@internal, NOT exported from barrel)
  operation-serializer.ts            # CONCRETE only (too small to split)

packages/screensets/src/mfe/state/
  index.ts                           # MfeStateContainer (abstract) + DefaultMfeStateContainer (concrete)
```

#### Export Policy

The `@hai3/screensets` public barrel exports the following categories. The full symbol list is in the barrel files (`packages/screensets/src/index.ts` and `packages/screensets/src/mfe/index.ts`).

- **Abstract classes** (pure contracts, consumers extend): `ScreensetsRegistry`, `ScreensetsRegistryFactory`, `ContainerProvider`, `MfeHandler`, `MfeBridgeFactory`
- **Singleton instances**: `screensetsRegistryFactory` (the ONLY way to obtain a `ScreensetsRegistry`)
- **Interfaces**: `ScreensetsRegistryConfig`, `TypeSystemPlugin`, `MfeEntryLifecycle`, `ChildMfeBridge`, `ParentMfeBridge`
- **GTS type interfaces**: `MfeEntry`, `MfeEntryMF`, `ExtensionDomain`, `Extension`, `ScreenExtension`, `ExtensionPresentation`, `SharedProperty`, `Action`, `ActionsChain`, `LifecycleStage`, `LifecycleHook`
- **Constants**: action constants (`HAI3_ACTION_LOAD_EXT`, etc.), shared property constants (`HAI3_SHARED_PROPERTY_THEME`, etc.)
- **Utilities**: Shadow DOM utilities, validation types

The `@hai3/screensets/plugins/gts` subpath provides `gtsPlugin` (singleton) and `GtsPlugin` (`@internal`). These are NOT re-exported from the main barrel to avoid pulling in `@globaltypesystem/gts-ts`.

All other symbols (concrete classes, internal abstract classes, error classes, validation helpers, Module Federation internals, constant collections) are internal and NOT exported from the main barrel. The `handler/` sub-barrel re-exports concrete handler types (`MfeHandlerMF`, `MfeBridgeFactoryDefault`) for test files and internal wiring.

#### React Layer Export Policy

`@hai3/react` (L3) re-exports ALL public symbols from `@hai3/framework` (L2), including all MFE symbols: plugin factories (`microfrontends`, `mock`), action functions (`loadExtension`, `mountExtension`, `unmountExtension`), selectors (`selectExtensionState`, `selectRegisteredExtensions`, `selectExtensionError`), domain constants (`HAI3_POPUP_DOMAIN`, `HAI3_SIDEBAR_DOMAIN`, `HAI3_SCREEN_DOMAIN`, `HAI3_OVERLAY_DOMAIN`), action constants (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`), all MFE types, abstract classes, factory instances, and utilities. This ensures L4 application code imports everything from a single package.

### GTS Package Queries

The `ScreensetsRegistry` provides query methods for discovering registered GTS packages from extensions.

#### getRegisteredPackages()

Returns an array of unique GTS package strings that have been discovered from registered extensions. Packages are NOT explicitly registered -- they are automatically tracked when extensions are registered. The GTS package is extracted from each extension's ID using the `extractGtsPackage()` utility.

The returned array is in discovery order (order of first extension registration for each package).

```typescript
const packages = registry.getRegisteredPackages();
// Returns: ['hai3.demo', 'hai3.other', ...]
```

#### getExtensionsForPackage(packageId)

Returns all registered extensions whose GTS package matches the given `packageId`. The GTS package groups extensions by their shared two-segment prefix (e.g., 'hai3.demo').

```typescript
const demoExtensions = registry.getExtensionsForPackage('hai3.demo');
// Returns: [homeExtension, profileExtension, ...]
```

#### extractGtsPackage(entityId)

Utility function exported from `@hai3/screensets` that extracts the GTS package identifier from a GTS entity ID. The function splits the entity ID on `~` to get the instance portion, then takes the first two dot-segments.

```typescript
import { extractGtsPackage } from '@hai3/screensets';

const pkg = extractGtsPackage('gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.home.v1');
// Returns: 'hai3.demo'
```

**Algorithm:**
1. Split the entity ID on `~` to get tilde-delimited segments
2. Take the last segment (the instance-specific portion)
3. Split that segment on `.` to get dot-segments
4. Return the first two dot-segments joined by `.`

**Validation:**
- Entity ID must contain at least one `~` delimiter
- Entity ID must not be a schema type ID (ending with `~`)
- Instance portion must have at least 2 dot-segments

**Package Discovery Mechanism:**

Packages are tracked implicitly during `registerExtension()` / `unregisterExtension()` operations:

1. When an extension is registered, `extractGtsPackage()` is called on the extension ID
2. The package is added to an internal `Map<string, Set<string>>` (package -> extension IDs)
3. When an extension is unregistered, it is removed from the package's extension set
4. When a package's extension set becomes empty, the package is removed from the map

No explicit package registration is needed. The system discovers packages automatically from extension IDs.

#### Layer Enforcement via Dependency Cruiser

Layer boundaries are enforced by dependency-cruiser rules:
- **`framework-no-react`**: Framework (L2) cannot import React (L3).
- **`react-no-sdk`**: React (L3) cannot import SDK packages (L1) directly; must use `@hai3/framework` re-exports.
- **MFE packages (L4)**: `src/mfe_packages/` is NOT excluded from dependency-cruiser. Layer enforcement catches violations (e.g., importing from `@hai3/screensets` instead of `@hai3/react`).

Package-level configs (`internal/depcruise-config/react.cjs`, `sdk.cjs`) use `state|screensets|api|i18n` to reference the L1 SDK packages.

#### MFE Package Layer Rules

MFE packages under `src/mfe_packages/` are app-level (L4) code:
- They can ONLY import from `@hai3/react` (L3)
- Never from `@hai3/screensets` (L1) or `@hai3/framework` (L2) directly
- Since `@hai3/react` re-exports all public symbols from lower layers, MFEs have full API access while respecting layer boundaries
- ESLint layer rules under `src/` enforce this automatically
- No tooling exclusions are permitted for `src/mfe_packages/` in ESLint, dependency-cruiser, knip, or tsconfig

#### MfeStateContainer

`MfeStateContainer` manages isolated per-MFE state. It requires MULTIPLE instances (one per MFE), so it CANNOT be a singleton. Instances are created directly by internal wiring code (`DefaultMountManager`) that already knows about the concrete type. There is no public construction path.

`MfeStateContainer` (abstract) and `DefaultMfeStateContainer` (concrete) both live in `packages/screensets/src/mfe/state/index.ts`. The abstract class defines `getState()`, `setState(updater)`, `subscribe(listener)`, `dispose()`, and `disposed` getter. The concrete class manages state, listeners, and disposal lifecycle.

`DefaultMountManager` constructs instances directly via `new DefaultMfeStateContainer({ initialState })` (imported from `'../state'`).

There is no standalone `createMfeStateContainer()` function and no `MfeStateContainer.create()` static method. `DefaultMountManager` constructs instances directly.

**Export policy**: `MfeStateContainer`, `MfeStateContainerConfig`, and `DefaultMfeStateContainer` are all internal. None are exported from the `@hai3/screensets` public barrel. Consumers never create or interact with state containers directly -- they are an internal implementation detail of `DefaultMountManager`.

#### GtsPlugin Singleton

`GtsPlugin` is a **singleton** -- there is one GTS type system per application. The class is exported as `@internal` for test isolation only; production code uses the `gtsPlugin` singleton constant.

```typescript
// packages/screensets/src/mfe/plugins/gts/index.ts

/**
 * Concrete GTS plugin class implementing TypeSystemPlugin.
 * Exported as @internal for test isolation only; use gtsPlugin constant.
 */
class GtsPlugin implements TypeSystemPlugin {
  readonly name = 'gts';
  readonly version = '1.0.0';
  private readonly gtsStore: GtsStore;

  constructor() { /* ... registers first-class schemas ... */ }
  // ... implements all TypeSystemPlugin methods ...
}

/**
 * Singleton GTS plugin instance - the ONLY public export for GtsPlugin.
 * There is no factory function and no create() method.
 * GtsPlugin is a singleton: one GTS type system per application.
 */
export const gtsPlugin: TypeSystemPlugin = new GtsPlugin();
```

**Export policy**: `gtsPlugin` (singleton constant typed as `TypeSystemPlugin`) and `GtsPlugin` (concrete class, `@internal` for test files that need fresh instances) are exported from the `@hai3/screensets/plugins/gts` subpath export. They are NOT re-exported from the main `@hai3/screensets` barrel to avoid pulling in `@globaltypesystem/gts-ts` for consumers who do not need it. Production code uses the `gtsPlugin` singleton. There is no `createGtsPlugin()` function.
