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

The established rule is: "NEVER standalone functions, ALWAYS abstract class + concrete class." This rule applies to **stateful capabilities** -- components that manage coordination, state, or property subscriptions using internal storage (e.g., WeakMap coordination, bridge factories, handler registries). These require the abstract class + concrete class pattern for Dependency Inversion, testability, and encapsulation of mutable state. See [Decision 18](#decision-18-abstract-class-layers-with-factory-construction) for the complete pattern including `ScreensetsRegistry` itself.

**Pure validation helpers** are exempt from this rule. The following functions are legitimately standalone because they are stateless -- they take inputs, return results, and have no side effects or internal state:

- `validateContract(entry, domain)` -- checks entry/domain contract compatibility (in `type-system.md`, used by `ScreensetsRegistry`)
- `validateExtensionType(plugin, extension, domain)` -- checks extension type hierarchy against domain's `extensionsTypeId` (in `type-system.md`)
- `validateDomainLifecycleHooks(domain)` -- checks domain lifecycle hooks reference supported stages (in `mfe-lifecycle.md`)
- `validateExtensionLifecycleHooks(extension, domain)` -- checks extension lifecycle hooks reference domain-supported stages (in `mfe-lifecycle.md`)

These functions receive all dependencies as parameters and produce a `ContractValidationResult`. Wrapping them in a class would add indirection without benefit since there is no state to encapsulate and no abstraction to invert.

**Small stateful utilities** are also exempt when their surface area is minimal. `OperationSerializer` (70 lines, single public method) manages a per-entity-ID promise chain but does not warrant an abstract class split due to its small size and single responsibility.

### ScreensetsRegistry as Facade

`ScreensetsRegistry` has a large public API surface (~28 methods spanning registration, loading, mounting, property management, action chain execution, lifecycle triggering, and events). This is intentional: it serves as a **facade** that provides a single entry point for the MFE runtime while internally delegating to specialized collaborators:

| Responsibility | Internal Collaborator | Design Document |
|---|---|---|
| Extension/domain registration | `ExtensionManager` (abstract) / `DefaultExtensionManager` (concrete) | This document |
| Lifecycle stage triggering | `LifecycleManager` (abstract) / `DefaultLifecycleManager` (concrete) | [mfe-lifecycle.md](./mfe-lifecycle.md) |
| MFE loading and mounting | `MountManager` (abstract) / `DefaultMountManager` (concrete) | This document |
| Event subscription/emission | `EventEmitter` (abstract) / `DefaultEventEmitter` (concrete) | This document |
| Operation serialization | `OperationSerializer` (concrete, small utility) | This document |
| Action chain execution | `ActionsChainsMediator` (abstract) / `DefaultActionsChainsMediator` (concrete) | [mfe-actions.md](./mfe-actions.md) |
| WeakMap runtime coordination | `RuntimeCoordinator` (abstract) / `WeakMapRuntimeCoordinator` (concrete) | This document |
| MFE bundle loading | `MfeHandler` polymorphism (`MfeHandlerMF`, custom handlers) | [mfe-loading.md](./mfe-loading.md) |
| Bridge creation | `MfeBridgeFactory` polymorphism (`MfeBridgeFactoryDefault`, custom factories) | [mfe-loading.md](./mfe-loading.md) |
| Type validation | `TypeSystemPlugin` (injected) | [type-system.md](./type-system.md) |

The public API is cohesive (all methods relate to MFE runtime management), and the internal delegation keeps each collaborator focused on a single responsibility. Consumer code interacts only with the **abstract** `ScreensetsRegistry`; both the concrete `DefaultScreensetsRegistry` and all collaborators are implementation details hidden behind the factory.

**Abstract class layer**: `ScreensetsRegistry` is an abstract class (~80 lines) defining the public method signatures. `DefaultScreensetsRegistry` is the concrete implementation (~670 lines) that wires all collaborators together. Consumers obtain an instance exclusively through `createScreensetsRegistry()`, which returns the abstract type. See [Decision 18](#decision-18-abstract-class-layers-with-factory-construction) for the complete design.

### Concurrency and Operation Serialization

**Context**: The async `registerExtension()`, `unregisterExtension()`, `mountExtension()`, and `unmountExtension()` methods require serialization to prevent undefined behavior from concurrent calls on the same entity.

**Rule**: All async registration and lifecycle operations on ScreensetsRegistry are **serialized per entity ID**. Specifically:

- **Per-extension serialization**: Concurrent calls to `registerExtension`, `unregisterExtension`, `loadExtension`, `mountExtension`, or `unmountExtension` for the same extension ID are queued and executed sequentially. A second call waits for the first to complete before starting.
- **Per-domain serialization**: `registerDomain` is synchronous. Concurrent calls to `unregisterDomain` for the same domain ID are queued and executed sequentially.
- **Cross-entity independence**: Operations on different entity IDs may execute concurrently (e.g., registering extension A while mounting extension B).
- **Mount during register**: Calling `mountExtension(extId)` while `registerExtension(extId)` is in progress will queue behind the registration. The mount proceeds only after registration completes successfully. If registration fails, the queued mount receives the registration error.
- **Duplicate concurrent registration**: Calling `registerExtension(extId)` twice concurrently for the same ID will serialize -- the second call will detect the already-registered state and either no-op or throw, depending on the idempotency policy.
- **Domain unregister during extension registration**: Calling `unregisterDomain(domainId)` while `registerExtension(extId)` (which targets that domain) is in progress will not interfere -- the extension registration holds a reference to the domain state. However, the extension will be cascade-unregistered by the domain unregistration once it completes.

**Implementation**: Use a per-entity-ID promise chain or mutex pattern. This avoids global locks while preventing race conditions on individual entities.

---

## Decisions

### Decision 13: Framework-Agnostic Instance-Level Isolation (Default Behavior)

See [Runtime Isolation in overview.md](./overview.md#runtime-isolation-default-behavior) for the complete isolation model, architecture diagrams, and recommendations.

`ScreensetsRegistry` uses the abstract class + concrete implementation + factory pattern. See [Decision 18](#decision-18-abstract-class-layers-with-factory-construction) for the complete abstract class definition, `DefaultScreensetsRegistry` concrete class, factory function, and file layout.

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

### Decision 17: Dynamic Registration Model

**What**: Extensions and MFEs can be registered at ANY time during the application lifecycle.

**Why**:
- Extensions are NOT known at app initialization time
- Enables runtime configuration, feature flags, and permission-based extensibility

**Boundary**: The MFE system's scope is **registration and lifecycle**, NOT fetching. How entities are obtained from backends is outside the MFE system scope. Entities become the MFE system's concern only AFTER they are registered.

#### ScreensetsRegistry Dynamic API

The `ScreensetsRegistry` is an abstract class. The dynamic API is defined as abstract method signatures. See [Decision 18](#decision-18-abstract-class-layers-with-factory-construction) for the complete abstract class definition.

**System Boundary:** Entity fetching is outside MFE system scope. See [System Boundary](./overview.md#system-boundary) for details.

<a name="load-vs-mount"></a>
**Load vs Mount:** Loading fetches the JavaScript bundle; mounting renders to DOM. An extension can be loaded but not mounted (preloading scenario). `mountExtension()` auto-loads if not already loaded. `unmountExtension()` does NOT unload the bundle (stays cached for remounting).

**Manifest Handling:** MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](./mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf) for details.

#### Usage Examples

```typescript
// Dynamic registration after user action
settingsButton.onClick = async () => {
  // Extension using derived type that includes domain-specific fields
  // Note: Instance IDs do NOT end with ~ (only schema IDs do)
  await runtime.registerExtension({
    id: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics_widget.v1',
    domain: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
    entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
    // Domain-specific fields from derived Extension type (no uiMeta wrapper)
    title: 'Analytics',
    size: 'medium',
  });

  const container = document.getElementById('widget-slot-1');
  const bridge = await runtime.mountExtension(extensionId, container);
};

// Registration after backend API response (application handles fetching)
async function onUserLogin(user: User) {
  // Application code fetches entities - this is OUTSIDE MFE system scope
  const response = await fetch('/api/extensions', {
    headers: { 'Authorization': `Bearer ${user.token}` }
  });
  const { domains, extensions } = await response.json();

  // MFE system only handles registration of already-fetched entities
  for (const domain of domains) {
    await runtime.registerDomain(domain);
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

### Decision 18: Abstract Class Layers with Factory Construction

**What**: Every major stateful component MUST have an abstract class defining the public contract and a concrete implementation hidden behind a factory function. External consumers ALWAYS depend on abstract types, never concrete classes.

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
EventEmitter                        -->  DefaultEventEmitter
RuntimeCoordinator                  -->  WeakMapRuntimeCoordinator
ActionsChainsMediator               -->  DefaultActionsChainsMediator
MfeHandler                          -->  MfeHandlerMF
MfeBridgeFactory                    -->  MfeBridgeFactoryDefault

FACTORY (only place that knows concrete)
========================================
createScreensetsRegistry(config)    -->  returns ScreensetsRegistry (abstract type)
```

**Rule**: Only factories and constructors (wiring code) reference concrete classes. All other code types against the abstract class.

#### ScreensetsRegistry Abstract Class

```typescript
// packages/screensets/src/mfe/runtime/ScreensetsRegistry.ts
// ~80 lines -- abstract class with public method signatures

import type { TypeSystemPlugin } from '../plugins/types';
import type { MfeHandler, ParentMfeBridge } from '../handler/types';
import type { ExtensionDomain, Extension, ActionsChain } from '../types';
import type { ChainResult, ChainExecutionOptions, ActionHandler } from '../mediator';

/**
 * Abstract ScreensetsRegistry - public contract for the MFE runtime facade.
 *
 * This is the ONLY type external consumers should depend on.
 * Create instances via createScreensetsRegistry() factory.
 */
export abstract class ScreensetsRegistry {
  abstract readonly typeSystem: TypeSystemPlugin;

  // --- Registration ---
  abstract registerDomain(domain: ExtensionDomain): void;
  abstract unregisterDomain(domainId: string): Promise<void>;
  abstract registerExtension(extension: Extension): Promise<void>;
  abstract unregisterExtension(extensionId: string): Promise<void>;

  // --- Loading ---
  abstract loadExtension(extensionId: string): Promise<void>;
  abstract preloadExtension(extensionId: string): Promise<void>;

  // --- Mounting ---
  abstract mountExtension(extensionId: string, container: Element): Promise<ParentMfeBridge>;
  abstract unmountExtension(extensionId: string): Promise<void>;

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

  // --- Action Handlers (mediator-facing) ---
  abstract registerExtensionActionHandler(extensionId: string, domainId: string, entryId: string, handler: ActionHandler): void;
  abstract unregisterExtensionActionHandler(extensionId: string): void;
  abstract registerDomainActionHandler(domainId: string, handler: ActionHandler): void;
  abstract unregisterDomainActionHandler(domainId: string): void;

  // --- Events ---
  abstract on(event: string, callback: (data: Record<string, unknown>) => void): void;
  abstract off(event: string, callback: (data: Record<string, unknown>) => void): void;

  // --- Handlers ---
  abstract registerHandler(handler: MfeHandler): void;

  // --- Lifecycle ---
  abstract dispose(): void;
}
```

#### Factory Function

```typescript
// packages/screensets/src/mfe/runtime/create-screensets-registry.ts
// This is the ONLY file that imports DefaultScreensetsRegistry

import type { ScreensetsRegistryConfig } from './config';
import { ScreensetsRegistry } from './ScreensetsRegistry';
import { DefaultScreensetsRegistry } from './DefaultScreensetsRegistry';

/**
 * Create a ScreensetsRegistry instance.
 * Returns the abstract ScreensetsRegistry type -- consumers never see the concrete class.
 */
export function createScreensetsRegistry(
  config: ScreensetsRegistryConfig
): ScreensetsRegistry {
  return new DefaultScreensetsRegistry(config);
}
```

#### DefaultScreensetsRegistry (Concrete, NOT Exported)

```typescript
// packages/screensets/src/mfe/runtime/DefaultScreensetsRegistry.ts
// ~670 lines -- full implementation, NOT exported from public barrel

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
| `event-emitter.ts` (130 lines) | -- | -- | No (too small) |
| `operation-serializer.ts` (70 lines) | -- | -- | No (too small) |

**Import rule after split**: Only the `DefaultScreensetsRegistry` constructor imports concrete collaborator classes. All other code imports only abstract classes.

#### Callback Injection for Mediator's getDomainState Dependency

`DefaultActionsChainsMediator` needs `getDomainState(domainId)` for two purposes:

1. **Action support validation** (line ~173 in implementation): check that the target domain supports the action type before delivery.
2. **Timeout resolution** (line ~367 in implementation): resolve `domain.defaultActionTimeout` for actions that do not specify an explicit timeout.

Since `getDomainState()` is concrete-only (`@internal` on `DefaultScreensetsRegistry`) and must NOT appear on the abstract `ScreensetsRegistry`, the mediator receives this capability via **callback injection** in its constructor config -- consistent with how `DefaultExtensionManager` receives `emit`, `triggerLifecycle`, `log`, etc. and how `DefaultMountManager` receives `triggerLifecycle`, `executeActionsChain`, `log`, `errorHandler`, etc.

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

#### DIP Consumer Reference Updates

All modules that currently reference the concrete `ScreensetsRegistry` class are updated to import the abstract class. Because the abstract class replaces the concrete class at the same file path (`ScreensetsRegistry.ts`), most import statements do not change. The exceptions are noted below.

| File | Note |
|---|---|
| `coordination/types.ts` | No import change needed |
| `mount-manager.ts` | No import change needed; now types against abstract class, which breaks the circular import on the concrete class |
| `mediator/actions-chains-mediator.ts` | **Import removed**: `DefaultActionsChainsMediator` no longer imports `ScreensetsRegistry` at all. It receives `getDomainState` as a callback in its constructor config instead of holding a full registry reference. |
| `components/ExtensionDomainSlot.tsx` | No import change needed |
| `framework/effects.ts` | No import change needed |
| `framework/types.ts` | No import change needed; `MfeScreensetsRegistry` alias now maps to abstract class |
| `runtime/bridge-factory.ts` | **Import path changes**: `import { ExtensionDomainState } from './extension-manager'` (type moves to the abstract file after the collaborator split) |

#### File Layout After Refactoring

```
packages/screensets/src/mfe/runtime/
  ScreensetsRegistry.ts              # ABSTRACT class (~80 lines)
  DefaultScreensetsRegistry.ts       # CONCRETE class (~670 lines, NOT exported)
  create-screensets-registry.ts      # Factory function (only file that imports concrete)
  config.ts                          # ScreensetsRegistryConfig interface (unchanged)
  extension-manager.ts               # ABSTRACT class + types (~185 lines)
  default-extension-manager.ts       # CONCRETE class (~460 lines)
  lifecycle-manager.ts               # ABSTRACT class + callback types (~100 lines)
  default-lifecycle-manager.ts       # CONCRETE class (~170 lines)
  mount-manager.ts                   # ABSTRACT class + callback types (~97 lines)
  default-mount-manager.ts           # CONCRETE class (~320 lines)
  event-emitter.ts                   # ABSTRACT + CONCRETE together (130 lines, too small to split)
  operation-serializer.ts            # CONCRETE only (70 lines, too small to split)
```

#### Export Policy

The `@hai3/screensets` public barrel exports:
- `ScreensetsRegistry` (abstract class)
- `createScreensetsRegistry` (factory function)
- `ScreensetsRegistryConfig` (interface)

The barrel does NOT export:
- `DefaultScreensetsRegistry` (concrete class)
- `DefaultExtensionManager`, `DefaultLifecycleManager`, `DefaultMountManager` (concrete collaborators)

Test files that need access to concrete internals import directly from the concrete file paths using relative imports, bypassing the public barrel.
