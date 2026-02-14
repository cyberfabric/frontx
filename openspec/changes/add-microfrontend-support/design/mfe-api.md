# Design: MFE API

This document covers the MFE Bridge interfaces, MfeEntryLifecycle interface, and framework-specific implementation examples.

---

## Context

The MFE API defines the runtime contract between parent and MFE instance. It consists of:
- **MfeEntryLifecycle**: The interface every MFE must export (mount/unmount methods)
- **ChildMfeBridge**: The communication channel passed to each MFE **instance** (child) for parent interaction
- **ParentMfeBridge**: Parent-side bridge interface used by the parent to manage MFE instance (child) communication

These interfaces are framework-agnostic - MFEs can use React, Vue, Angular, Svelte, or vanilla JS while implementing the same lifecycle contract. Each MFE **instance** receives its own ChildMfeBridge instance (even multiple instances of the same MFE entry get separate bridges). The ChildMfeBridge allows MFE instances to execute [actions chains](./mfe-actions.md) (via a pass-through to the registry) and subscribe to [shared properties](./mfe-shared-property.md).

## Definition

**MfeEntryLifecycle**: A runtime interface (not a GTS type) that defines `mount()` and `unmount()` methods every MFE must implement to integrate with the parent.

**ChildMfeBridge**: A read-only interface exposed to MFE components (child) for executing actions chains (via a pass-through to the registry's `executeActionsChain()`) and subscribing to [shared properties](./mfe-shared-property.md).

**ParentMfeBridge**: A minimal bridge interface used by the parent to identify the child instance and manage bridge lifecycle (dispose). The parent uses `registry.executeActionsChain()` directly for action chain execution.

---

## MfeEntryLifecycle Interface

```typescript
interface MfeEntryLifecycle<TBridge = ChildMfeBridge> {
  mount(container: Element, bridge: TBridge): void | Promise<void>;
  unmount(container: Element): void | Promise<void>;
}
```

### Unmount Error Handling

When an MFE's `unmount()` function throws an error:

1. **Error is caught and logged**: The system catches the error, logs it with full context (extension ID, entry type ID, error details), and continues the unmount process
2. **Extension is still considered unmounted**: To prevent zombie state, the extension is marked as unmounted regardless of the error. This ensures:
   - The container element is cleaned up
   - The bridge connection is disposed
   - The runtime coordination entry is removed
   - Resources are not leaked

**Rationale**: A failing `unmount()` should not leave the system in an inconsistent state. The MFE may have internal issues, but the parent must maintain control of the extension lifecycle. Cleanup is best-effort - any resources the MFE failed to release are its own responsibility.

**Note**: The `onInitError` callback on `registerDomain()` does NOT handle unmount errors. It handles errors from the fire-and-forget lifecycle `init` stage only. Unmount errors are caught and logged internally.

---

## MFE Bridge Interfaces

The MFE Bridge provides a bidirectional communication channel between parent and MFE instance (child). With HAI3's default handler (`MfeHandlerMF`), each MFE **instance** receives its own bridge instance - this supports instance-level isolation. Even multiple instances of the same MFE entry get separate, independent bridges. Custom handlers can implement different bridge sharing strategies for internal MFEs. The bridge is created by the parent when mounting an extension and passed to the MFE component via props.

### ChildMfeBridge Interface

The `ChildMfeBridge` is the interface exposed to MFE/child code. It allows the child to communicate with its parent domain.

```typescript
// packages/screensets/src/mfe/handler/types.ts

interface ChildMfeBridge {
  readonly domainId: string;
  readonly instanceId: string;

  /**
   * Execute an actions chain via the registry.
   * This is a capability pass-through -- the bridge delegates directly to
   * the registry's executeActionsChain(). This is the ONLY public API for
   * child MFEs to trigger actions chains.
   */
  executeActionsChain(chain: ActionsChain): Promise<void>;

  /** Subscribe to a shared property from the domain */
  subscribeToProperty(
    propertyTypeId: string,
    callback: (value: SharedProperty) => void
  ): () => void;

  /** Get current value of a shared property */
  getProperty(propertyTypeId: string): SharedProperty | undefined;
}
```

**Concrete-only internal methods on `ChildMfeBridgeImpl`:**

| Method | Purpose | Callers |
|---|---|---|
| `handleParentActionsChain(chain)` | Internal: called by `ParentMfeBridgeImpl` to forward chains to the child's registered handler (hierarchical composition transport) | `ParentMfeBridgeImpl` |
| `onActionsChain(handler)` | Internal: registers a handler for parent-to-child action chain delivery. Used by child MFEs that define their own domains (hierarchical composition). Concrete-only -- not on the public interface. | Child MFE internal wiring |
| `sendActionsChain(chain)` | Internal: forwards child-to-parent action chains via the parent bridge. Concrete-only -- not on the public interface. | Internal bridge transport |

### ParentMfeBridge Interface

The `ParentMfeBridge` is the **public** interface used by the parent to manage child MFE communication. It provides only identification and disposal -- the parent uses `registry.executeActionsChain()` directly for action chain execution, NOT a method on the bridge.

Internal wiring methods (`onChildAction`, `receivePropertyUpdate`, `sendActionsChain`) live on the concrete `ParentMfeBridgeImpl` class only and are NOT part of the public interface (see [Decision 18](./registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction) in registry-runtime.md).

```typescript
/**
 * Public bridge interface used by the parent to manage MFE (child) communication.
 * Shared property updates are managed at the DOMAIN level via registry.updateDomainProperty().
 * Action chain execution is done via registry.executeActionsChain(), NOT on this interface.
 *
 * Internal wiring methods (onChildAction, receivePropertyUpdate, sendActionsChain)
 * are on ParentMfeBridgeImpl only -- they are NOT on the public interface.
 */
interface ParentMfeBridge {
  readonly instanceId: string;

  /** Clean up the bridge connection */
  dispose(): void;
}
```

**Concrete-only internal methods on `ParentMfeBridgeImpl`:**

| Method | Purpose | Callers |
|---|---|---|
| `sendActionsChain(chain)` | Internal: forwards actions chains from parent to child via `childBridge.handleParentActionsChain()`. Used for hierarchical composition transport. Concrete-only -- not on the public interface. | Internal bridge transport |
| `onChildAction(callback)` | Wiring method: connects child-to-parent action chain flow via the mediator | `DefaultRuntimeBridgeFactory.createBridge()` |
| `receivePropertyUpdate(propertyTypeId, value)` | Wiring method: pushes domain property updates to the child bridge | `DefaultRuntimeBridgeFactory.createBridge()` subscribers |
| `handleChildAction(chain)` | Internal: called by `ChildMfeBridgeImpl.sendActionsChain()` to forward chains to parent | `ChildMfeBridgeImpl` |
| `registerPropertySubscriber(propertyTypeId, subscriber)` | Internal: tracks property subscribers for cleanup | `DefaultRuntimeBridgeFactory.createBridge()` |
| `getPropertySubscribers()` | Internal: returns subscribers map for disposal cleanup | `DefaultRuntimeBridgeFactory.disposeBridge()` |

### Bridge Creation Flow

```typescript
// When mounting an extension (via actions chain -- the only consumer-facing API)
await runtime.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: domainId,
    payload: { extensionId }, // Domain's ContainerProvider supplies the container
  },
});
// Bridge is created internally by MountManager during mount.
// ParentMfeBridge is stored in ExtensionState for internal use.

// When unmounting (via actions chain)
await runtime.executeActionsChain({
  action: {
    type: HAI3_ACTION_UNMOUNT_EXT,
    target: domainId,
    payload: { extensionId },
  },
});
```

### Action Chain Execution Model

The **public API** for executing actions chains is `registry.executeActionsChain(chain)` -- this is the ONLY entry point available to any runtime (host or child). Child MFEs access this capability via `childBridge.executeActionsChain()`, which is a convenience pass-through that delegates directly to the registry.

**Child MFE executes a chain:** The child calls `childBridge.executeActionsChain(chain)`, which delegates to the registry's `executeActionsChain()` via an injected callback. The bridge does NOT route or "send" -- it provides access to the registry's execution capability.

**Hierarchical composition (private transport):** For MFEs that define their own domains, bridge-to-bridge transport between mediator instances exists but is **entirely private** (concrete-only on `ParentMfeBridgeImpl` and `ChildMfeBridgeImpl`). The parent's mediator can invoke `parentBridgeImpl.sendActionsChain()` (concrete-only) to forward a chain into the child's domain hierarchy via `childBridgeImpl.handleParentActionsChain()`, which calls the handler registered via `childBridgeImpl.onActionsChain()` (also concrete-only). This transport mechanism is internal wiring -- it is NOT exposed on any public interface.

```
Public API -- How child MFEs execute chains:

  Child MFE code
       |
       | childBridge.executeActionsChain(chain)
       v
  ChildMfeBridgeImpl
       |
       | this.executeActionsChainCallback(chain)
       v
  registry.executeActionsChain(chain)
  (injected callback from DefaultRuntimeBridgeFactory.createBridge)
```

```
Private Transport -- Hierarchical composition (concrete-only):

  Parent Registry / Mediator
       |
       | parentBridgeImpl.sendActionsChain(chain)  [concrete-only]
       v
  ParentMfeBridgeImpl
       |
       | this.childBridge.handleParentActionsChain(chain)  [concrete-only]
       v
  ChildMfeBridgeImpl
       |
       | this.actionsChainHandler(chain)
       v
  Child MFE's registered handler
  (e.g., childRegistry.executeActionsChain)
```

```typescript
// In child MFE's mount() -- hierarchical composition (internal wiring):
mount(container, bridge) {
  const childRegistry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });

  // The child MFE uses bridge.executeActionsChain() for its own chain execution.
  // For hierarchical composition, the concrete ChildMfeBridgeImpl.onActionsChain()
  // is wired internally (not called by MFE code directly via public interface).

  // Register child's own domains and extensions...
  // Child MFE provides its own ContainerProvider for each domain it defines
  childRegistry.registerDomain(myDomain, myContainerProvider);

  // Child MFE executes chains via the public API:
  bridge.executeActionsChain(someChain);
}
```

### Cross-Runtime Action Chain Routing (Hierarchical Composition)

When a child MFE defines its own domains via a child `ScreensetsRegistry`, those domains are registered in the **child's** mediator, not the parent's. The parent's mediator has no visibility into child-runtime registrations. This section defines the mechanism for routing actions across runtime boundaries.

**Problem**: An actions chain targeting a domain that lives inside a child runtime cannot be resolved by the parent's `ActionsChainsMediator.resolveHandler()` -- the parent's `extensionHandlers` and `domainHandlers` maps only contain locally registered entities.

**Solution -- ChildDomainForwardingHandler**: When a child MFE registers a domain in its child registry and wants that domain to be reachable from the parent runtime, it registers a **forwarding `ActionHandler`** in the parent's mediator for that domain ID. This forwarding handler wraps the existing private bridge transport (`parentBridgeImpl.sendActionsChain()`) in an `ActionHandler` implementation. No new transport mechanism is needed -- the existing concrete-only bridge methods are sufficient.

#### Architecture

```
Parent Runtime                          Child Runtime
==============                          =============

Parent Mediator                         Child Mediator
  extensionHandlers: {...}                extensionHandlers: {...}
  domainHandlers: {                       domainHandlers: {
    parentDomainId -> parentHandler          childDomainId -> childHandler
    childDomainId  -> forwardingHandler   }
  }
       |
       | resolveHandler(childDomainId)
       | finds forwardingHandler
       |
       v
  ChildDomainForwardingHandler
       |
       | wraps chain in ActionsChain, calls
       | parentBridgeImpl.sendActionsChain(chain)
       v
  ParentMfeBridgeImpl [concrete-only]
       |
       | childBridge.handleParentActionsChain(chain)
       v
  ChildMfeBridgeImpl [concrete-only]
       |
       | actionsChainHandler(chain) = childRegistry.executeActionsChain
       v
  Child Registry's Mediator
       |
       | resolveHandler(childDomainId)
       | finds childHandler locally
       v
  Child Domain Handler
```

#### ChildDomainForwardingHandler

A concrete class implementing `ActionHandler` that forwards actions to a child runtime via the bridge transport. This class is `@internal` and lives alongside the bridge implementations.

```typescript
// packages/screensets/src/mfe/bridge/ChildDomainForwardingHandler.ts

import type { ActionHandler } from '../mediator/types';
import type { ParentMfeBridgeImpl } from './ParentMfeBridge';

/**
 * Forwards actions targeting a child domain through the bridge transport.
 *
 * When a child MFE registers its own domains, the parent runtime needs a way
 * to route actions to those domains. This handler is registered in the parent's
 * mediator for each child domain ID. When the parent's mediator resolves a target
 * that matches a child domain, it invokes this handler, which wraps the action
 * in an ActionsChain and forwards it via the private bridge transport.
 *
 * @internal
 */
class ChildDomainForwardingHandler implements ActionHandler {
  constructor(
    private readonly parentBridgeImpl: ParentMfeBridgeImpl,
    private readonly childDomainId: string
  ) {}

  async handleAction(
    actionTypeId: string,
    payload: Record<string, unknown> | undefined
  ): Promise<void> {
    // Wrap the action in an ActionsChain for bridge transport.
    // The child registry's mediator will unwrap and execute it.
    const chain = {
      action: {
        type: actionTypeId,
        target: this.childDomainId,
        payload,
      },
    };

    // Forward the chain to the child runtime via the bridge transport.
    await this.parentBridgeImpl.sendActionsChain(chain);
  }
}
```

#### Wiring Sequence

The child MFE's `mount()` function wires hierarchical composition via concrete-only methods on `ChildMfeBridgeImpl` (not on the public `ChildMfeBridge` interface):

1. Wire bridge transport: `(bridge as ChildMfeBridgeImpl).onActionsChain(chain => childRegistry.executeActionsChain(chain))`
2. Register child domains in the child registry with a `ContainerProvider`
3. Register forwarding in parent: `(bridge as ChildMfeBridgeImpl).registerChildDomain(domainId)` -- this creates a `ChildDomainForwardingHandler` internally
4. Register extensions in the child registry

On `unmount()`, the child calls `unregisterChildDomain()` and disposes the child registry. `ChildMfeBridgeImpl.cleanup()` guarantees all remaining forwarding handlers are removed during bridge disposal.

**Key constraints**: The parent never knows the child's internal structure. The child never accesses `ParentMfeBridgeImpl` or `ChildDomainForwardingHandler` directly. `DefaultRuntimeBridgeFactory.createBridge()` encapsulates all concrete type wiring via callback injection.

#### Domain ID Uniqueness Across Runtimes

When a child MFE registers a domain via `registerChildDomain(domainId)`, the forwarding handler is registered in the parent's mediator using that domain ID. If the domain ID collides with an existing domain ID in the parent's mediator (either a parent-owned domain or another child's forwarded domain), the existing handler is silently overwritten. **Domain ID uniqueness across runtimes is an application-level responsibility enforced by the GTS type system.** GTS type IDs are globally unique by convention (namespace + version), so collisions indicate a misconfiguration. The framework does not guard against this at runtime -- it is a programming error.

#### Factory Cache and Child Registry Isolation

The `screensetsRegistryFactory` uses a factory-with-cache pattern where `build(config)` caches the instance after the first call. When a child MFE calls `screensetsRegistryFactory.build(config)` to create its own child registry for hierarchical composition, it MUST pass a **distinct** `ScreensetsRegistryConfig` (e.g., a different `TypeSystemPlugin` instance or config object) to ensure the factory creates a new, isolated instance rather than returning the cached parent instance. If the child passes the same config reference, the factory returns the parent's cached instance, which defeats isolation. This is the expected behavior of the factory-with-cache pattern and is not a bug.

### Domain-Level Property Updates

Shared properties are managed at the DOMAIN level, not per-MFE. When the parent updates a domain property, ALL extensions in that domain that subscribe to that property receive the update.

```
+------------------------------------------+
|                PARENT                     |
|                                          |
|  runtime.updateDomainProperty(           |
|    domainId,                             |
|    "theme",                              |
|    "dark"                                |
|  )                                       |
+--------------------+---------------------+
                     |
                     v
+--------------------+---------------------+
|              DOMAIN                      |
|  (stores property value)                 |
|                                          |
|  theme: "dark"                           |
+----+---------------+----------------+----+
     |               |                |
     v               v                v
+----+----+    +-----+----+    +-----+----+
|Extension|    |Extension |    |Extension |
|    A    |    |    B     |    |    C     |
+---------+    +----------+    +----------+
|subscribed|   |subscribed|    |   NOT    |
|to theme  |   |to theme  |    |subscribed|
+---------+    +----------+    +----------+
     |               |                |
     v               v                X
 RECEIVES        RECEIVES         (no update)
 "dark"          "dark"
```

**Key Points:**
- Properties are stored at the domain level
- Only extensions that subscribe to a property receive updates
- Subscription is determined by the entry's `requiredProperties` or `optionalProperties`

```typescript
// Update a shared property for all subscribed extensions in the domain
runtime.updateDomainProperty(
  'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1',
  'dark'
);
```

---

## Framework-Specific MFE Implementation Examples

**React MFE:**
```typescript
import { createRoot, Root } from 'react-dom/client';
import { ChildMfeBridge } from '@hai3/screensets';
import { App } from './App';

let root: Root | null = null;

export function mount(container: Element, bridge: ChildMfeBridge): void {
  root = createRoot(container as HTMLElement);
  root.render(<App bridge={bridge} />);
}

export function unmount(container: Element): void {
  root?.unmount();
  root = null;
}
```

**Vue 3 MFE:**
```typescript
import { createApp, App as VueApp } from 'vue';
import { ChildMfeBridge } from '@hai3/screensets';
import App from './App.vue';

let app: VueApp | null = null;

export function mount(container: Element, bridge: ChildMfeBridge): void {
  app = createApp(App, { bridge });
  app.mount(container);
}

export function unmount(container: Element): void {
  app?.unmount();
  app = null;
}
```

**Svelte MFE:**
```typescript
import { ChildMfeBridge } from '@hai3/screensets';
import App from './App.svelte';

let component: App | null = null;

export function mount(container: Element, bridge: ChildMfeBridge): void {
  component = new App({ target: container, props: { bridge } });
}

export function unmount(container: Element): void {
  component?.$destroy();
  component = null;
}
```

**Vanilla JS MFE:**
```typescript
import { ChildMfeBridge } from '@hai3/screensets';

export function mount(container: Element, bridge: ChildMfeBridge): void {
  const el = container as HTMLElement;
  el.innerHTML = '<div class="my-widget">Loading...</div>';
  bridge.subscribeToProperty(
    'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1',
    (property) => {
      const theme = property.value;
      el.style.background = theme === 'dark' ? '#333' : '#fff';
    }
  );
}

export function unmount(container: Element): void {
  (container as HTMLElement).innerHTML = '';
}
```
