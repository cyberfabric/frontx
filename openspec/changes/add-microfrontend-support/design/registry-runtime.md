# Design: Registry and Runtime Architecture

This document covers the ScreensetsRegistry runtime isolation model, action chain mediation, MFE bridges, handler registration, and dynamic registration.

**Related Documents:**
- [Type System](./type-system.md) - Type System Plugin interface, GTS types, contract validation
- [MFE Loading](./mfe-loading.md) - MfeHandler abstract class, handler registry, Module Federation loading
- [MFE API](./mfe-api.md) - MfeEntryLifecycle interface
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain types
- [MFE Domain](./mfe-domain.md) - ExtensionDomain and Extension types
- [MFE Lifecycle](./mfe-lifecycle.md) - Lifecycle stages and hooks

---

## Design Notes

### Standalone Functions vs Class-Based Capabilities

The established rule is: "NEVER standalone functions, ALWAYS abstract class + concrete class." This applies to **stateful capabilities** -- components that manage coordination, state, or property subscriptions. See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for the complete pattern.

**Exempt from this rule:**
- **Pure validation helpers** (stateless, all dependencies as parameters): `validateContract`, `validateExtensionType`, `validateDomainLifecycleHooks`, `validateExtensionLifecycleHooks`.
- **Small stateful utilities** with minimal surface area: `OperationSerializer` (70 lines, single public method).

### Runtime Bridge Factory (Class-Based)

The `bridge-factory.ts` module provides the internal bridge wiring logic that connects host and child MFEs. This is a **distinct concern** from the handler's `MfeBridgeFactory` (in `handler/types.ts`), which is a public abstraction for custom bridge implementations by MFE handlers.

**Two bridge factory concepts:**

| Factory | Responsibility | Location | Visibility |
|---|---|---|---|
| `MfeBridgeFactory` (handler) | Creates `ChildMfeBridge` instances for custom handler implementations | `handler/types.ts` | Public abstract class |
| `RuntimeBridgeFactory` (runtime) | Wires internal bridge connections: creates `ParentMfeBridgeImpl`/`ChildMfeBridgeImpl` pair, connects property subscriptions, wires action chain callbacks, sets up child domain forwarding | `runtime/runtime-bridge-factory.ts` (abstract) / `runtime/default-runtime-bridge-factory.ts` (concrete) | `@internal`, NOT exported from barrel |

The runtime bridge factory follows the same abstract + concrete pattern as all other collaborators:

```typescript
// packages/screensets/src/mfe/runtime/runtime-bridge-factory.ts
// ABSTRACT class (~20 lines, pure contract)

import type { ParentMfeBridge, ChildMfeBridge } from '../handler/types';
import type { ExtensionDomainState } from './extension-manager';
import type { ActionsChain } from '../types';
import type { ChainResult, ChainExecutionOptions, ActionHandler } from '../mediator/types';

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
    executeActionsChain: (chain: ActionsChain, options?: ChainExecutionOptions) => Promise<ChainResult>,
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

```typescript
// packages/screensets/src/mfe/runtime/default-runtime-bridge-factory.ts
// CONCRETE class, NOT exported from barrel

import { RuntimeBridgeFactory } from './runtime-bridge-factory';
// ... all concrete imports (ChildMfeBridgeImpl, ParentMfeBridgeImpl, ChildDomainForwardingHandler, etc.)

/**
 * Default runtime bridge factory implementation.
 *
 * Handles all internal bridge wiring: creates bridge pairs, connects
 * property subscriptions, wires action chain callbacks, and sets up
 * child domain forwarding.
 *
 * @internal
 */
class DefaultRuntimeBridgeFactory extends RuntimeBridgeFactory {
  createBridge(/* same params */): { parentBridge: ParentMfeBridge; childBridge: ChildMfeBridge } {
    // Same implementation as current createBridge() standalone function
  }

  disposeBridge(/* same params */): void {
    // Same implementation as current disposeBridge() standalone function
  }
}
```

**Construction**: `DefaultRuntimeBridgeFactory` is constructed directly by `DefaultScreensetsRegistry` (internal wiring code) and passed to `DefaultMountManager` via constructor injection. `DefaultMountManager` stores the abstract `RuntimeBridgeFactory` type (not the concrete class) and calls `this.bridgeFactory.createBridge(...)` and `this.bridgeFactory.disposeBridge(...)` instead of dynamically importing the standalone functions.

**Why constructor injection instead of dynamic import**: The current code does `const bridgeFactory = await import('./bridge-factory')` inside `mountExtension()` and `unmountExtension()`. This was originally done to "avoid unused code warnings." With a class injected via the constructor, there is no unused code issue -- the class is a proper dependency of `DefaultMountManager`. Constructor injection also makes the dependency explicit and testable (tests can inject a mock `RuntimeBridgeFactory`).

### No Standalone Factory Functions for Stateful Components

Standalone factory functions and static factory methods on abstract classes are both **forbidden**. The only allowed construction patterns are:

1. **Singleton constant** -- no configuration needed (e.g., `gtsPlugin`)
2. **Factory-with-cache** -- configurable singleton (e.g., `ScreensetsRegistry` via `screensetsRegistryFactory`)
3. **Direct construction in internal wiring code** -- multi-instance (e.g., `MfeStateContainer` by `DefaultMountManager`)

See [Decision 18](#decision-18-abstract-class-layers-with-singleton-construction) for code examples, violation patterns, and rationale.

### No Event System -- Lifecycle Stages with Actions Chains Only

The MFE runtime intentionally has **no pub-sub event system** (no `EventEmitter`, no `on`/`off` callbacks). Lifecycle stages with actions chains are the **only** mechanism for reacting to runtime transitions (registration, activation, deactivation, destruction).

**Why**: An event system would duplicate lifecycle stages 1:1. Every "event" (`domainRegistered`, `extensionMounted`, etc.) maps directly to a lifecycle stage transition (`init`, `activated`, etc.) on the corresponding entity. Having two parallel systems for the same moments in time creates confusion about which to use, forces maintenance of two notification paths, and violates the single-responsibility principle.

**How entities react to lifecycle transitions**: Entities declare `lifecycle` hooks that bind lifecycle stages to actions chains. When a stage transition occurs, the `LifecycleManager` triggers the corresponding actions chain through the `ActionsChainsMediator`. This is the same mechanism used for all other inter-entity communication and is already fully specified in [mfe-lifecycle.md](./mfe-lifecycle.md).

**What about `extensionLoaded`?** Loading is an internal implementation detail (fetching a JavaScript bundle), not a lifecycle stage. There is no need to observe it externally. If an extension needs to react to being loaded, it does so in its `MfeEntryLifecycle.mount()` callback (which is called after loading completes).

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

Shadow DOM utilities are provided by `@hai3/screensets` for style isolation.

```typescript
// packages/screensets/src/mfe/shadow/index.ts

interface ShadowRootOptions {
  mode?: 'open' | 'closed';
  delegatesFocus?: boolean;
}

function createShadowRoot(element: HTMLElement, options: ShadowRootOptions = {}): ShadowRoot;
function injectCssVariables(shadowRoot: ShadowRoot, variables: Record<string, string>): void;
function injectStylesheet(shadowRoot: ShadowRoot, css: string, id?: string): void;
```

**Note on `HTMLElement` narrowing**: `createShadowRoot()` requires `HTMLElement` because `attachShadow()` is defined on `HTMLElement`, not the more general `Element`. Since `MfeEntryLifecycle.mount()` receives `container: Element`, MFE implementations that use shadow DOM must narrow via `container as HTMLElement` when calling `createShadowRoot()`.

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
**Load vs Mount:** Loading fetches the JavaScript bundle; mounting renders to DOM. An extension can be loaded but not mounted (preloading scenario). The mount operation (triggered via `HAI3_ACTION_MOUNT_EXT` action) auto-loads if not already loaded. The unmount operation (triggered via `HAI3_ACTION_UNMOUNT_EXT` action) does NOT unload the bundle (stays cached for remounting). These operations are NOT exposed as methods on the abstract `ScreensetsRegistry` -- they are internal to `MountManager` and accessed via focused callbacks in `ExtensionLifecycleActionHandler`.

**Manifest Handling:** MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf) for details.

#### Usage Examples

```typescript
// Dynamic registration after user action
settingsButton.onClick = async () => {
  const extensionId = 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics_widget.v1';
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
runtime.updateDomainProperty(domainId, themePropertyId, 'dark');
runtime.updateDomainProperties(domainId, new Map([
  [themePropertyId, 'dark'],
  [userContextPropertyId, { userId: '123' }],
]));
```

---

### Decision 18: Abstract Class Layers with Singleton Construction

**What**: Every major stateful component MUST have an abstract class defining the public contract (a pure abstract class with NO static methods) and a concrete implementation. Single-instance components with no configuration are exposed as singleton constants; single-instance components that require configuration use the factory-with-cache pattern; multi-instance components are constructed directly by internal wiring code. External consumers ALWAYS depend on abstract types, never concrete classes. Standalone factory functions and static factory methods on abstract classes are both forbidden.

**Why**:
- **Dependency Inversion Principle (DIP)**: Consumers depend on stable abstractions, not volatile implementations
- **Testability**: Tests can substitute mock implementations of the abstract class without knowing the concrete class
- **Encapsulation**: Test-only accessors (`get domains()`, `get extensions()`, `triggerLifecycleStageInternal`, `getDomainState()`) live on the concrete class only and are invisible to public consumers
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
MfeBridgeFactory                    -->  MfeBridgeFactoryDefault
RuntimeBridgeFactory                -->  DefaultRuntimeBridgeFactory
TypeSystemPlugin                    -->  GtsPlugin
MfeStateContainer<TState>           -->  DefaultMfeStateContainer<TState>

CONSTRUCTION (only place that knows concrete)
==============================================
screensetsRegistryFactory.build(config) (factory-with-cache)  -->  ScreensetsRegistry (one instance, deferred to application wiring)
new DefaultRuntimeBridgeFactory()                             -->  RuntimeBridgeFactory (internal wiring only, by DefaultScreensetsRegistry)
new DefaultMfeStateContainer(config)                          -->  MfeStateContainer<TState> (internal wiring only, by DefaultMountManager)
gtsPlugin (singleton constant)                                -->  TypeSystemPlugin (one instance, no factory)
```

**Rule**: Only singleton constant initializers (in barrel/initialization files), factory-with-cache implementations, and internal wiring constructors reference concrete classes. Abstract classes are pure contracts with NO static methods. All other code types against the abstract class. Standalone factory functions and static factory methods on abstract classes are both forbidden.

#### ScreensetsRegistry Abstract Class

```typescript
// packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts
// ~75 lines -- pure abstract class with public method signatures only, NO static methods
// NOTE: loadExtension, mountExtension, unmountExtension, preloadExtension are NOT here.
// These operations are internal to MountManager, accessed via callbacks in
// ExtensionLifecycleActionHandler. See mfe-ext-lifecycle-actions.md.
// getParentBridge IS here -- it is a query method, not a lifecycle operation.

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type { ExtensionDomain, Extension, ActionsChain } from '../types';
import type { ChainResult, ChainExecutionOptions, ActionHandler } from '../mediator';
import type { ContainerProvider } from './container-provider';

/**
 * Abstract ScreensetsRegistry - public contract for the MFE runtime facade.
 *
 * This is the ONLY type external consumers should depend on.
 * Obtain via screensetsRegistryFactory.build(config).
 * This class has NO static methods and NO knowledge of DefaultScreensetsRegistry.
 */
export abstract class ScreensetsRegistry {
  abstract readonly typeSystem: TypeSystemPlugin;

  // --- Registration ---
  abstract registerDomain(domain: ExtensionDomain, containerProvider: ContainerProvider): void;
  abstract unregisterDomain(domainId: string): Promise<void>;
  abstract registerExtension(extension: Extension): Promise<void>;
  abstract unregisterExtension(extensionId: string): Promise<void>;

  // --- Domain Properties ---
  abstract updateDomainProperty(domainId: string, propertyTypeId: string, value: unknown): void;
  abstract getDomainProperty(domainId: string, propertyTypeId: string): unknown;
  abstract updateDomainProperties(domainId: string, properties: Map<string, unknown>): void;

  // --- Action Chains ---
  abstract executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

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

  // --- Action Handlers (mediator-facing) ---
  abstract registerExtensionActionHandler(extensionId: string, domainId: string, entryId: string, handler: ActionHandler): void;
  abstract unregisterExtensionActionHandler(extensionId: string): void;
  abstract registerDomainActionHandler(domainId: string, handler: ActionHandler): void;
  abstract unregisterDomainActionHandler(domainId: string): void;

  // --- Handlers ---
  abstract registerHandler(handler: MfeHandler): void;

  // --- Lifecycle ---
  abstract dispose(): void;
}

// NOTE: loadExtension(), mountExtension(), unmountExtension(), and preloadExtension()
// are NOT on the abstract ScreensetsRegistry. These operations are performed exclusively
// via actions chains (executeActionsChain with HAI3_ACTION_LOAD_EXT, HAI3_ACTION_MOUNT_EXT,
// HAI3_ACTION_UNMOUNT_EXT). The ExtensionLifecycleActionHandler receives focused callbacks
// that go through OperationSerializer -> MountManager, bypassing the registry entirely.
// See mfe-ext-lifecycle-actions.md for the complete design.
//
// getParentBridge(extensionId) IS on the abstract class -- it is a query method that
// returns the bridge stored in ExtensionState.bridge after a mount completes. This closes
// the return value gap left by removing mountExtension() (which returned ParentMfeBridge).
// See mfe-ext-lifecycle-actions.md - ParentMfeBridge Return Value Gap.
```

#### Factory-with-Cache Pattern

The `screensetsRegistryFactory` factory-with-cache pattern is the current construction mechanism for `ScreensetsRegistry`. The factory provides a `build(config)` method to obtain the `ScreensetsRegistry` instance. The abstract `ScreensetsRegistry` class is a pure contract with NO static methods. The abstract `ScreensetsRegistryFactory` class is also a pure contract with NO static methods.

**Why factory-with-cache instead of singleton constant**: The `ScreensetsRegistry` requires a `TypeSystemPlugin` at construction time (via `ScreensetsRegistryConfig.typeSystem`). A singleton constant would hardcode `gtsPlugin` at module initialization time, defeating the pluggability of `TypeSystemPlugin`. The factory-with-cache pattern defers this binding to application wiring time, allowing consumers to provide any `TypeSystemPlugin` implementation.

```typescript
// packages/screensets/src/mfe/runtime/ScreensetsRegistryFactory.ts
// Pure contract, NO static methods

/**
 * Abstract factory for creating the ScreensetsRegistry singleton.
 * The build() method accepts configuration and returns the registry instance.
 * After the first build(), subsequent calls return the cached instance.
 */
export abstract class ScreensetsRegistryFactory {
  abstract build(config: ScreensetsRegistryConfig): ScreensetsRegistry;
}
```

```typescript
// packages/screensets/src/mfe/runtime/DefaultScreensetsRegistryFactory.ts
// Concrete factory, NOT exported from barrel

import { ScreensetsRegistryFactory } from './ScreensetsRegistryFactory';
import { DefaultScreensetsRegistry } from './DefaultScreensetsRegistry';

class DefaultScreensetsRegistryFactory extends ScreensetsRegistryFactory {
  private instance: ScreensetsRegistry | null = null;
  private cachedConfig: ScreensetsRegistryConfig | null = null;

  build(config: ScreensetsRegistryConfig): ScreensetsRegistry {
    if (this.instance) {
      if (config.typeSystem !== this.cachedConfig!.typeSystem) {
        throw new Error('ScreensetsRegistry already built with a different configuration');
      }
      return this.instance;
    }
    this.cachedConfig = config;
    this.instance = new DefaultScreensetsRegistry(config);
    return this.instance;
  }
}
```

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
// NOTE: loadExtension, mountExtension, unmountExtension, preloadExtension are NOT
// implemented here. These operations are internal to MountManager. The
// ExtensionLifecycleActionHandler receives focused callbacks wired in registerDomain()
// that go through OperationSerializer -> MountManager.
// getParentBridge IS implemented here -- delegates to extensionManager.getExtensionState().

import { ScreensetsRegistry } from './ScreensetsRegistry';
// ... all collaborator imports ...

class DefaultScreensetsRegistry extends ScreensetsRegistry {
  // ... full implementation of all abstract methods ...

  // @internal -- test shims live ONLY on the concrete class
  get domains(): Map<string, ExtensionDomainState> { return this.extensionManager.getDomainsMap(); }
  get extensions(): Map<string, ExtensionState> { return this.extensionManager.getExtensionsMap(); }

  async triggerLifecycleStageInternal(
    entity: Extension | ExtensionDomain,
    stageId: string
  ): Promise<void> {
    return this.lifecycleManager.triggerLifecycleStageInternal(entity, stageId);
  }

  // @internal -- concrete-only query method (NOT on abstract class)
  getDomainState(domainId: string): ExtensionDomainState | undefined {
    return this.extensionManager.getDomainState(domainId);
  }

  // @internal -- concrete-only accessors for collaborator instances (NOT on abstract class)
  getExtensionManager(): ExtensionManager { return this.extensionManager; }
  getLifecycleManager(): LifecycleManager { return this.lifecycleManager; }
}
```

#### Collaborator File Splits

Collaborators that currently co-locate abstract + concrete in a single file are split into separate files. The abstract file contains the abstract class and related type definitions. The concrete file contains the implementation class.

| Current File | Abstract File | Concrete File | Split? |
|---|---|---|---|
| `extension-manager.ts` (643 lines) | `extension-manager.ts` (~185 lines: abstract class + ExtensionDomainState + ExtensionState types) | `default-extension-manager.ts` (~460 lines) | Yes |
| `lifecycle-manager.ts` (270 lines) | `lifecycle-manager.ts` (~100 lines: abstract class + callback types) | `default-lifecycle-manager.ts` (~170 lines) | Yes |
| `mount-manager.ts` (414 lines) | `mount-manager.ts` (~97 lines: abstract class + callback types) | `default-mount-manager.ts` (~320 lines) | Yes |
| `operation-serializer.ts` (70 lines) | -- | -- | No (too small) |

**Import rule after split**: Only the `DefaultScreensetsRegistry` constructor imports concrete collaborator classes. All other code imports only abstract classes.

#### Callback Injection for Mediator's getDomainState Dependency

`DefaultActionsChainsMediator` needs `getDomainState(domainId)` for two purposes:

1. **Action support validation** (line ~173 in implementation): check that the target domain supports the action type before delivery.
2. **Timeout resolution** (line ~367 in implementation): resolve `domain.defaultActionTimeout` for actions that do not specify an explicit timeout.

Since `getDomainState()` is concrete-only (`@internal` on `DefaultScreensetsRegistry`) and must NOT appear on the abstract `ScreensetsRegistry`, the mediator receives this capability via **callback injection** in its constructor config -- consistent with how `DefaultExtensionManager` receives `triggerLifecycle`, `log`, etc. and how `DefaultMountManager` receives `triggerLifecycle`, `executeActionsChain`, `log`, `errorHandler`, etc.

**Before (broken -- calls concrete-only method via abstract type):**
```typescript
constructor(typeSystem: TypeSystemPlugin, registry: ScreensetsRegistry) {
  this.registry = registry;
}
// later: this.registry.getDomainState(targetId)  // COMPILE ERROR: not on abstract class
```

**After (callback injection -- no dependency on ScreensetsRegistry type at all):**
```typescript
constructor(config: {
  typeSystem: TypeSystemPlugin;
  getDomainState: (domainId: string) => ExtensionDomainState | undefined;
}) {
  this.typeSystem = config.typeSystem;
  this.getDomainState = config.getDomainState;
}
// later: this.getDomainState(targetId)  // OK: uses injected callback
```

The `DefaultScreensetsRegistry` constructor wires this callback when creating the mediator:

```typescript
this.mediator = new DefaultActionsChainsMediator({
  typeSystem: this.typeSystem,
  getDomainState: (domainId: string) => this.extensionManager.getDomainState(domainId),
});
```

This eliminates the mediator's dependency on the full `ScreensetsRegistry` type entirely. The mediator only knows about `TypeSystemPlugin` and the narrow callback it actually needs.

#### Concrete-Only Test Accessors on ExtensionManager

The abstract `ExtensionManager` class currently declares `getDomainsMap()` and `getExtensionsMap()` as abstract methods with `@internal` annotations. These are test-only accessors that expose raw internal maps for test compatibility. They must be moved to the concrete `DefaultExtensionManager` class only, matching the same principle applied to `getDomainState()` on `ScreensetsRegistry`:

- **Before**: `abstract getDomainsMap()` and `abstract getExtensionsMap()` on abstract `ExtensionManager`
- **After**: `getDomainsMap()` and `getExtensionsMap()` on concrete `DefaultExtensionManager` only

The `DefaultScreensetsRegistry` concrete class already accesses these via `this.extensionManager.getDomainsMap()` and `this.extensionManager.getExtensionsMap()` in its own `@internal` `get domains()` and `get extensions()` accessors. Since `DefaultScreensetsRegistry` owns a concrete `DefaultExtensionManager` instance (not the abstract type), these calls remain valid after the move. No callback injection is needed here -- the accessor is called only from concrete-to-concrete wiring code.

#### Concrete-Only Internal Methods on Collaborator Abstract Classes

Internal-only methods live on concrete classes, not abstract:

| Group | Component | Methods on Concrete Only | Result |
|---|---|---|---|
| A | ExtensionManager | 5 methods (`getDomainState`, `getExtensionState`, `getExtensionStatesForDomain`, `resolveEntry`, `clear`) | Abstract keeps only registration + property methods |
| B | LifecycleManager | 1 method (`triggerLifecycleStageInternal`) | Abstract keeps only public trigger methods |
| C | Bridge interfaces | 7 methods removed from public `ParentMfeBridge`/`ChildMfeBridge`; `executeActionsChain` added to `ChildMfeBridge` | Public interfaces trimmed to consumer-facing API only |

**Principle**: Internal collaborators (`@internal`, not barrel-exported) can safely type fields as concrete types for concrete-to-concrete wiring. `DefaultScreensetsRegistry` types `extensionManager` as `DefaultExtensionManager` and `lifecycleManager` as `DefaultLifecycleManager` to access concrete-only methods.

##### Summary: DefaultScreensetsRegistry Collaborator Field Types

After all encapsulation fixes, `DefaultScreensetsRegistry` types its internal collaborator fields as follows:

| Field | Type | Reason |
|---|---|---|
| `extensionManager` | `DefaultExtensionManager` (concrete) | Needs `getDomainState()`, `getExtensionState()`, `getExtensionStatesForDomain()`, `clear()`, `getDomainsMap()`, `getExtensionsMap()` |
| `lifecycleManager` | `DefaultLifecycleManager` (concrete) | Needs `triggerLifecycleStageInternal()` |
| `mountManager` | `MountManager` (abstract) | No concrete-only methods needed |
| `bridgeFactory` | `RuntimeBridgeFactory` (abstract) | No concrete-only methods needed; passed to `DefaultMountManager` via constructor injection |
| `mediator` | `ActionsChainsMediator` (abstract) | No concrete-only methods needed (uses callback injection) |
| `coordinator` | `RuntimeCoordinator` (abstract) | No concrete-only methods needed |
| `serializer` | `OperationSerializer` (concrete, no abstract) | Small utility, no abstract class |

This is acceptable because `DefaultScreensetsRegistry` is `@internal` wiring code that creates all collaborator instances in its constructor. It is never exposed to external consumers. External consumers only see the abstract `ScreensetsRegistry` via `screensetsRegistryFactory.build(config)`.

#### DIP Consumer Reference Updates

All modules that currently reference the concrete `ScreensetsRegistry` class are updated to import the abstract class. Because the abstract class replaces the concrete class at the same file path (`ScreensetsRegistry.ts`), most import statements do not change. The exceptions are noted below.

| File | Note |
|---|---|
| `coordination/types.ts` | No import change needed |
| `mount-manager.ts` | No import change needed; now types against abstract class, which breaks the circular import on the concrete class |
| `mediator/actions-chains-mediator.ts` | **Import removed**: `DefaultActionsChainsMediator` no longer imports `ScreensetsRegistry` at all. It receives `getDomainState` as a callback in its constructor config instead of holding a full registry reference. |
| `@hai3/react` `ExtensionDomainSlot.tsx` | No import change needed (lives in `@hai3/react`, not `@hai3/screensets`) |
| `framework/effects.ts` | No import change needed |
| `framework/types.ts` | No import change needed; `MfeScreensetsRegistry` alias now maps to abstract class |
| `runtime/default-runtime-bridge-factory.ts` | Replaces `runtime/bridge-factory.ts`. Imports `ExtensionDomainState` from `./extension-manager` (abstract file). Imports concrete bridge classes (`ChildMfeBridgeImpl`, `ParentMfeBridgeImpl`, `ChildDomainForwardingHandler`) from `../bridge/`. |

#### File Layout After Refactoring

```
packages/screensets/src/mfe/runtime/
  ScreensetsRegistry.ts              # ABSTRACT class (~85 lines, pure contract, NO static methods, includes getParentBridge)
  ScreensetsRegistryFactory.ts       # ABSTRACT factory class (~10 lines, pure contract, NO static methods)
  DefaultScreensetsRegistry.ts       # CONCRETE class (~650 lines, NOT exported from barrel)
  DefaultScreensetsRegistryFactory.ts # CONCRETE factory (~20 lines, NOT exported from barrel)
  index.ts                           # Barrel: exports abstract classes + screensetsRegistryFactory singleton
  config.ts                          # ScreensetsRegistryConfig interface (unchanged)
  extension-manager.ts               # ABSTRACT class + types (~185 lines)
  default-extension-manager.ts       # CONCRETE class (~460 lines)
  lifecycle-manager.ts               # ABSTRACT class + callback types (~100 lines)
  default-lifecycle-manager.ts       # CONCRETE class (~170 lines)
  mount-manager.ts                   # ABSTRACT class + callback types (~97 lines)
  default-mount-manager.ts           # CONCRETE class (~320 lines)
  container-provider.ts              # ABSTRACT class (~15 lines, pure contract, exported from barrel)
  runtime-bridge-factory.ts          # ABSTRACT class (~20 lines, pure contract, @internal)
  default-runtime-bridge-factory.ts  # CONCRETE class (~120 lines, @internal, NOT exported from barrel)
  operation-serializer.ts            # CONCRETE only (70 lines, too small to split)
```

**Note on bridge-factory.ts**: The original `bridge-factory.ts` file (containing standalone `createBridge()` and `disposeBridge()` functions) is deleted and replaced by `runtime-bridge-factory.ts` (abstract) and `default-runtime-bridge-factory.ts` (concrete). See [Runtime Bridge Factory](#runtime-bridge-factory-class-based) design note.

The abstract `ScreensetsRegistry` class has NO static methods and NO knowledge of `DefaultScreensetsRegistry`. The abstract `ScreensetsRegistryFactory` class has NO static methods and NO knowledge of `DefaultScreensetsRegistryFactory`.

#### Export Policy

The `@hai3/screensets` public barrel exports:
- `ScreensetsRegistry` (abstract class, pure contract -- NO static methods)
- `ScreensetsRegistryFactory` (abstract class, pure contract -- NO static methods)
- `screensetsRegistryFactory` (singleton `ScreensetsRegistryFactory` instance -- the ONLY way to obtain a `ScreensetsRegistry`)
- `ScreensetsRegistryConfig` (interface)
- `ContainerProvider` (abstract class, pure contract -- consumers extend this for custom domain container management)
- `MfeStateContainer` (abstract class, pure contract -- NO static methods)
- `MfeStateContainerConfig` (interface)
- `TypeSystemPlugin` (interface)

The `@hai3/screensets/plugins/gts` subpath export provides:
- `gtsPlugin` (singleton `TypeSystemPlugin` instance)
- `GtsPlugin` (concrete class, `@internal` for test files that need fresh instances; production code uses the `gtsPlugin` singleton)

These are NOT re-exported from the main `@hai3/screensets` barrel to avoid pulling in `@globaltypesystem/gts-ts` for consumers who do not need it.

All other concrete classes, internal collaborators, and factory functions are internal implementation details and are NOT exported. Test files that need access to concrete internals import directly from the concrete file paths using relative imports, bypassing the public barrel.

#### MfeStateContainer

`MfeStateContainer` manages isolated per-MFE state. It requires MULTIPLE instances (one per MFE), so it CANNOT be a singleton. The abstract class is a pure contract with NO static methods and NO knowledge of `DefaultMfeStateContainer`. Instances are created directly by internal wiring code (`DefaultMountManager`) that already knows about the concrete type. There is no public construction path.

```typescript
// packages/screensets/src/mfe/state/mfe-state-container.ts

interface MfeStateContainerConfig<TState> {
  initialState: TState;
}

/**
 * Abstract class defining the MFE state container contract.
 * Exported from @hai3/screensets for DIP -- consumers type against this.
 * This class has NO static methods and NO knowledge of DefaultMfeStateContainer.
 * Instances are created internally by DefaultMountManager.
 */
abstract class MfeStateContainer<TState> {
  abstract getState(): TState;
  abstract setState(updater: (state: TState) => TState): void;
  abstract subscribe(listener: (state: TState) => void): () => void;
  abstract dispose(): void;
  abstract get disposed(): boolean;
}
```

```typescript
// packages/screensets/src/mfe/state/default-mfe-state-container.ts
// NOT exported from public barrel

class DefaultMfeStateContainer<TState> extends MfeStateContainer<TState> {
  private currentState: TState;
  private listeners: Set<(state: TState) => void>;
  private isDisposed: boolean;

  constructor(config: MfeStateContainerConfig<TState>) {
    super();
    this.currentState = config.initialState;
    this.listeners = new Set();
    this.isDisposed = false;
  }

  // ... implements all abstract methods using private fields
}
```

```typescript
// In DefaultMountManager -- internal wiring code that creates MfeStateContainer instances
// This is the ONLY code that knows about DefaultMfeStateContainer.
import { DefaultMfeStateContainer } from '../state/default-mfe-state-container';

// Inside mountExtension():
const stateContainer = new DefaultMfeStateContainer({ initialState });
```

There is no standalone `createMfeStateContainer()` function and no `MfeStateContainer.create()` static method. `DefaultMountManager` constructs instances directly.

**Export policy**: `MfeStateContainer` (abstract class, pure contract -- NO static methods) and `MfeStateContainerConfig` (interface) are exported from `@hai3/screensets`. `DefaultMfeStateContainer` and any standalone factory function are NOT exported.

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
