# Design: MFE API

This document covers the MFE Bridge interfaces, MfeEntryLifecycle interface, and framework-specific implementation examples.

---

## Context

The MFE API defines the runtime contract between parent and MFE instance. It consists of:
- **MfeEntryLifecycle**: The interface every MFE must export (mount/unmount methods)
- **ChildMfeBridge**: The communication channel passed to each MFE **instance** (child) for parent interaction
- **ParentMfeBridge**: Extended bridge interface used by the parent to manage MFE instance (child) communication

These interfaces are framework-agnostic - MFEs can use React, Vue, Angular, Svelte, or vanilla JS while implementing the same lifecycle contract. Each MFE **instance** receives its own ChildMfeBridge instance (even multiple instances of the same MFE entry get separate bridges). The ChildMfeBridge allows MFE instances to send [actions chains](./mfe-actions.md) (targeting the domain) and subscribe to [shared properties](./mfe-shared-property.md).

## Definition

**MfeEntryLifecycle**: A runtime interface (not a GTS type) that defines `mount()` and `unmount()` methods every MFE must implement to integrate with the parent.

**ChildMfeBridge**: A read-only interface exposed to MFE components (child) for sending actions chains (targeting the domain) and subscribing to [shared properties](./mfe-shared-property.md).

**ParentMfeBridge**: An extended bridge interface used by the parent to send [actions chains](./mfe-actions.md) to MFEs (children) and manage the communication lifecycle.

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
// packages/screensets/src/mfe/bridge/types.ts

interface ChildMfeBridge {
  readonly entryTypeId: string;
  readonly domainId: string;

  /** Send an actions chain to the parent domain */
  sendActionsChain(chain: ActionsChain): Promise<ChainResult>;

  /** Subscribe to a shared property from the domain */
  subscribeToProperty(
    propertyTypeId: string,
    callback: (value: unknown) => void
  ): () => void;

  /** Get current value of a shared property */
  getProperty(propertyTypeId: string): unknown;

  /** Subscribe to all shared properties at once */
  subscribeToAllProperties(
    callback: (properties: Map<string, unknown>) => void
  ): () => void;
}
```

### ParentMfeBridge Interface

The `ParentMfeBridge` is the interface used by the parent to manage child MFE communication. It extends `ChildMfeBridge` with additional methods for the parent to send actions to children and manage the connection lifecycle.

```typescript
/**
 * Extended bridge interface used by the parent to manage MFE (child) communication.
 * Shared property updates are managed at the DOMAIN level via registry.updateDomainProperty().
 */
interface ParentMfeBridge extends ChildMfeBridge {
  readonly instanceId: string;

  /** Send an actions chain to the MFE (child) */
  sendActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /** Register handler for actions coming from the MFE (child) */
  onChildAction(
    handler: (actionTypeId: string, payload: unknown) => Promise<void>
  ): void;

  /** Clean up the bridge connection */
  dispose(): void;
}
```

### Bridge Creation Flow

```typescript
// When mounting an extension
const bridge = await runtime.mountExtension(extensionId, container);

// When unmounting
await runtime.unmountExtension(extensionId);
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
  'gts.hai3.screensets.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.theme.v1',
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
    'gts.hai3.screensets.ext.shared_property.v1~hai3.screensets.props.theme.v1',
    (theme) => {
      container.style.background = theme === 'dark' ? '#333' : '#fff';
    }
  );
}

export function unmount(container: HTMLElement): void {
  container.innerHTML = '';
}
```
