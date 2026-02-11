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
interface MfeEntryLifecycle {
  mount(container: HTMLElement, bridge: ChildMfeBridge): void;
  unmount(container: HTMLElement): void;
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
3. **Error is surfaced**: The error is passed to `onError` callback if configured in `ScreensetsRegistryConfig`, allowing the parent application to handle it appropriately (e.g., show a notification, report to monitoring)

**Rationale**: A failing `unmount()` should not leave the system in an inconsistent state. The MFE may have internal issues, but the parent must maintain control of the extension lifecycle. Cleanup is best-effort - any resources the MFE failed to release are its own responsibility.

---

## MFE Bridge Interfaces

The MFE Bridge provides a bidirectional communication channel between parent and MFE instance (child). With HAI3's default handler (`MfeHandlerMF`), each MFE **instance** receives its own bridge instance - this supports instance-level isolation. Even multiple instances of the same MFE entry get separate, independent bridges. Custom handlers can implement different bridge sharing strategies for internal MFEs. The bridge is created by the parent when mounting an extension and passed to the MFE component via props.

### ChildMfeBridge Interface

The `ChildMfeBridge` is the interface exposed to MFE/child code. It allows the child to communicate with its parent domain.

```typescript
// packages/screensets/src/mfe/handler/types.ts

interface ChildMfeBridge {
  readonly domainId: string;
  readonly entryTypeId: string;
  readonly instanceId: string;

  /**
   * Execute an actions chain via the registry.
   * This is a capability pass-through -- the bridge delegates directly to
   * the registry's executeActionsChain(). This is the ONLY public API for
   * child MFEs to trigger actions chains.
   */
  executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /** Subscribe to a shared property from the domain */
  subscribeToProperty(
    propertyTypeId: string,
    callback: (value: SharedProperty) => void
  ): () => void;

  /** Get current value of a shared property */
  getProperty(propertyTypeId: string): SharedProperty | undefined;

  /** Subscribe to all shared properties at once */
  subscribeToAllProperties(
    callback: (propertyTypeId: string, value: SharedProperty) => void
  ): () => void;
}
```

**Concrete-only internal methods on `ChildMfeBridgeImpl`:**

| Method | Purpose | Callers |
|---|---|---|
| `handleParentActionsChain(chain, options)` | Internal: called by `ParentMfeBridgeImpl` to forward chains to the child's registered handler (hierarchical composition transport) | `ParentMfeBridgeImpl` |
| `onActionsChain(handler)` | Internal: registers a handler for parent-to-child action chain delivery. Used by child MFEs that define their own domains (hierarchical composition). Concrete-only -- not on the public interface. | Child MFE internal wiring |
| `sendActionsChain(chain, options)` | Internal: forwards child-to-parent action chains via the parent bridge. Concrete-only -- not on the public interface. | Internal bridge transport |

### ParentMfeBridge Interface

The `ParentMfeBridge` is the **public** interface used by the parent to manage child MFE communication. It provides only identification and disposal -- the parent uses `registry.executeActionsChain()` directly for action chain execution, NOT a method on the bridge.

Internal wiring methods (`onChildAction`, `receivePropertyUpdate`, `sendActionsChain`) live on the concrete `ParentMfeBridgeImpl` class only and are NOT part of the public interface. This follows the same Group C encapsulation pattern applied to `getPropertySubscribers` and `registerPropertySubscriber` in [Decision 18](./registry-runtime.md#group-c-parentmfebridge-interface----4-methods-removed-from-public-type).

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
| `sendActionsChain(chain, options)` | Internal: forwards actions chains from parent to child via `childBridge.handleParentActionsChain()`. Used for hierarchical composition transport. Concrete-only -- not on the public interface. | Internal bridge transport |
| `onChildAction(callback)` | Wiring method: connects child-to-parent action chain flow via the mediator | `bridge-factory.ts` |
| `receivePropertyUpdate(propertyTypeId, value)` | Wiring method: pushes domain property updates to the child bridge | `bridge-factory.ts` subscribers |
| `handleChildAction(chain, options)` | Internal: called by `ChildMfeBridgeImpl.sendActionsChain()` to forward chains to parent | `ChildMfeBridgeImpl` |
| `registerPropertySubscriber(propertyTypeId, subscriber)` | Internal: tracks property subscribers for cleanup | `bridge-factory.ts` |
| `getPropertySubscribers()` | Internal: returns subscribers map for disposal cleanup | `bridge-factory.ts` |

### Bridge Creation Flow

```typescript
// When mounting an extension
const bridge = await runtime.mountExtension(extensionId, container);

// When unmounting
await runtime.unmountExtension(extensionId);
```

### Action Chain Execution Model

The **public API** for executing actions chains is `registry.executeActionsChain(chain, options)` -- this is the ONLY entry point available to any runtime (host or child). Child MFEs access this capability via `childBridge.executeActionsChain()`, which is a convenience pass-through that delegates directly to the registry.

**Child MFE executes a chain:** The child calls `childBridge.executeActionsChain(chain)`, which delegates to the registry's `executeActionsChain()` via an injected callback. The bridge does NOT route or "send" -- it provides access to the registry's execution capability.

**Hierarchical composition (private transport):** For MFEs that define their own domains, bridge-to-bridge transport between mediator instances exists but is **entirely private** (concrete-only on `ParentMfeBridgeImpl` and `ChildMfeBridgeImpl`). The parent's mediator can invoke `parentBridgeImpl.sendActionsChain()` (concrete-only) to forward a chain into the child's domain hierarchy via `childBridgeImpl.handleParentActionsChain()`, which calls the handler registered via `childBridgeImpl.onActionsChain()` (also concrete-only). This transport mechanism is internal wiring -- it is NOT exposed on any public interface.

```
Public API -- How child MFEs execute chains:

  Child MFE code
       |
       | childBridge.executeActionsChain(chain, options)
       v
  ChildMfeBridgeImpl
       |
       | this.executeActionsChainCallback(chain, options)
       v
  registry.executeActionsChain(chain, options)
  (injected callback from createBridge)
```

```
Private Transport -- Hierarchical composition (concrete-only):

  Parent Registry / Mediator
       |
       | parentBridgeImpl.sendActionsChain(chain, options)  [concrete-only]
       v
  ParentMfeBridgeImpl
       |
       | this.childBridge.handleParentActionsChain(chain, options)  [concrete-only]
       v
  ChildMfeBridgeImpl
       |
       | this.actionsChainHandler(chain, options)
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
  childRegistry.registerDomain(myDomain);

  // Child MFE executes chains via the public API:
  bridge.executeActionsChain(someChain);
}
```

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

export function mount(container: HTMLElement, bridge: ChildMfeBridge): void {
  root = createRoot(container);
  root.render(<App bridge={bridge} />);
}

export function unmount(container: HTMLElement): void {
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

export function mount(container: HTMLElement, bridge: ChildMfeBridge): void {
  app = createApp(App, { bridge });
  app.mount(container);
}

export function unmount(container: HTMLElement): void {
  app?.unmount();
  app = null;
}
```

**Svelte MFE:**
```typescript
import { ChildMfeBridge } from '@hai3/screensets';
import App from './App.svelte';

let component: App | null = null;

export function mount(container: HTMLElement, bridge: ChildMfeBridge): void {
  component = new App({ target: container, props: { bridge } });
}

export function unmount(container: HTMLElement): void {
  component?.$destroy();
  component = null;
}
```

**Vanilla JS MFE:**
```typescript
import { ChildMfeBridge } from '@hai3/screensets';

export function mount(container: HTMLElement, bridge: ChildMfeBridge): void {
  container.innerHTML = '<div class="my-widget">Loading...</div>';
  bridge.subscribeToProperty(
    'gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1',
    (property) => {
      const theme = property.value;
      container.style.background = theme === 'dark' ? '#333' : '#fff';
    }
  );
}

export function unmount(container: HTMLElement): void {
  container.innerHTML = '';
}
```
