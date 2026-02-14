# Design: Extension Lifecycle Actions

This document defines the three extension lifecycle action types (`load_ext`, `mount_ext`, `unmount_ext`) that serve as the consumer-facing API for loading, mounting, and unmounting MFE extensions. These actions are declared on the 4 extension domains and replace direct method calls as the public interface for extension lifecycle operations.

**Related Documents:**
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain types, mediation
- [MFE Domain](./mfe-domain.md) - ExtensionDomain and Extension types
- [MFE Lifecycle](./mfe-lifecycle.md) - Lifecycle stages and hooks
- [MFE API](./mfe-api.md) - MfeEntryLifecycle and bridge interfaces
- [Registry Runtime](./registry-runtime.md) - ScreensetsRegistry methods
- [MFE Errors](./mfe-errors.md) - Error class hierarchy

---

## Context

The MFE system's extension lifecycle operations (load, mount, unmount) are internal to `MountManager`. The consumer-facing API is **actions chains**, making extension lifecycle operations fully declarative and mediated. The `ScreensetsRegistry` abstract class does NOT expose load/mount/unmount methods -- the `ExtensionLifecycleActionHandler` accesses these operations via focused callbacks that go through `OperationSerializer` -> `MountManager`.

**Motivation:**
- Actions chains are the established communication mechanism in HAI3
- Declarative lifecycle operations enable lifecycle hooks, fallback chains, and timeout handling
- Domain-specific semantics (e.g., screen swap, popup dismiss) are encapsulated in domain action handlers
- The `ActionsChainsMediator` validates action support against the domain's `actions` array before delivery

---

## Extension Domains vs Configuration Domains

The framework defines 7 layout domains total. Only 4 are **extension domains** (where MFE entries mount and render). The remaining 3 are **configuration domains** (static layout areas, not MFE mount targets):

| Domain | Type | Purpose |
|--------|------|---------|
| **screen** | Extension | Main content area |
| **sidebar** | Extension | Collapsible side panel |
| **popup** | Extension | Modal dialogs |
| **overlay** | Extension | Full-screen overlays |
| header | Configuration | Top navigation bar (not an MFE mount target) |
| footer | Configuration | Bottom bar (not an MFE mount target) |
| menu | Configuration | Side navigation (not an MFE mount target) |

Extension lifecycle actions are relevant only to extension domains.

---

## The Three Extension Lifecycle Actions

### Action Type Definitions

All three actions use the existing `gts.hai3.mfes.comm.action.v1~` schema as their base type. The instance IDs use the `ext` namespace:

| Action | Instance ID | Purpose |
|--------|-------------|---------|
| `load_ext` | `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1` | Preload an extension's bundle (fetch JS, no DOM rendering) |
| `mount_ext` | `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1` | Mount an extension into a domain (render to DOM) |
| `unmount_ext` | `gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1` | Unmount an extension from a domain (remove from DOM) |

### Constants

```typescript
// packages/screensets/src/mfe/constants/index.ts

/** Load extension action -- preload bundle without mounting */
export const HAI3_ACTION_LOAD_EXT = 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1';

/** Mount extension action -- render extension to DOM */
export const HAI3_ACTION_MOUNT_EXT = 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1';

/** Unmount extension action -- remove extension from DOM */
export const HAI3_ACTION_UNMOUNT_EXT = 'gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1';
```

### Action Payloads

```typescript
/**
 * Payload for load_ext action.
 */
interface LoadExtPayload {
  /** The extension ID to load */
  extensionId: string;
}

/**
 * Payload for mount_ext action.
 * The container element is provided by the domain's ContainerProvider,
 * registered at domain registration time.
 */
interface MountExtPayload {
  /** The extension ID to mount */
  extensionId: string;
}

/**
 * Payload for unmount_ext action.
 */
interface UnmountExtPayload {
  /** The extension ID to unmount */
  extensionId: string;
}
```

### GTS Instance JSON Files

```json
// packages/screensets/src/mfe/gts/hai3.mfes/instances/ext/load_ext.v1.json
{
  "id": "gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1",
  "type": "gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1",
  "target": ""
}
```

```json
// packages/screensets/src/mfe/gts/hai3.mfes/instances/ext/mount_ext.v1.json
{
  "id": "gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1",
  "type": "gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1",
  "target": ""
}
```

```json
// packages/screensets/src/mfe/gts/hai3.mfes/instances/ext/unmount_ext.v1.json
{
  "id": "gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1",
  "type": "gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1",
  "target": ""
}
```

---

## Domain Action Support Matrix

Each extension domain declares which lifecycle actions it supports in its `actions` array:

| Domain | `load_ext` | `mount_ext` | `unmount_ext` | Rationale |
|--------|-----------|-------------|---------------|-----------|
| **screen** | Yes | Yes (swap semantics) | **No** | Screen always has content: the active screen, a loader, or an error fallback. Swap semantics handle transitions. |
| **sidebar** | Yes | Yes | Yes | Sidebar can be empty (collapsed/hidden). Panel can be shown or removed. |
| **popup** | Yes | Yes | Yes | Popup defaults to closed. Modal can be opened or dismissed. |
| **overlay** | Yes | Yes | Yes | Overlay defaults to hidden. Full-screen overlay can be shown or dismissed. |

### Screen Domain: Swap Semantics

**Invariant: single mounted extension per domain.** Each extension domain supports at most one mounted extension at any given time. `getMountedExtension(domainId)` returns the single currently mounted extension ID or `undefined`.

The screen domain's `mount_ext` action has **swap semantics**: the `ExtensionLifecycleActionHandler` internally unmounts the previous screen extension and mounts the new one in a single atomic operation. There is no intermediate "empty screen" state.

```
Screen mount_ext Flow:
  1. Action received: mount_ext { extensionId: "new-screen" }
  2. Handler checks: is there a currently mounted screen?
     YES: unmount current screen (internal, not via unmount_ext action)
     NO:  proceed (initial mount or after error)
  3. Mount new screen extension
  4. Result: seamless transition from old screen to new screen

Initial App Load:
  - Framework-level loader is displayed as default content
  - First mount_ext replaces the loader with actual screen content
```

The screen domain does NOT support `unmount_ext` because:
- A screen should never be left empty -- there is always content (active screen, loader, or error fallback)
- Screen transitions are always swap operations (mount new replaces old)
- Attempting `unmount_ext` on the screen domain triggers `UnsupportedDomainActionError`

### Domain Action Declarations

```typescript
// Screen domain -- load_ext + mount_ext only (no unmount_ext)
const screenDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1',
  // ...
  actions: [
    HAI3_ACTION_LOAD_EXT,
    HAI3_ACTION_MOUNT_EXT,
    // No HAI3_ACTION_UNMOUNT_EXT -- screen always has content
  ],
  // ...
};

// Sidebar domain -- all three actions
const sidebarDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1',
  // ...
  actions: [
    HAI3_ACTION_LOAD_EXT,
    HAI3_ACTION_MOUNT_EXT,
    HAI3_ACTION_UNMOUNT_EXT,
  ],
  // ...
};

// Popup domain -- all three actions
const popupDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.popup.v1',
  // ...
  actions: [
    HAI3_ACTION_LOAD_EXT,
    HAI3_ACTION_MOUNT_EXT,
    HAI3_ACTION_UNMOUNT_EXT,
  ],
  // ...
};

// Overlay domain -- all three actions
const overlayDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.overlay.v1',
  // ...
  actions: [
    HAI3_ACTION_LOAD_EXT,
    HAI3_ACTION_MOUNT_EXT,
    HAI3_ACTION_UNMOUNT_EXT,
  ],
  // ...
};
```

---

## Action Handlers as the Consumer-Facing API

### Removal of Direct Methods from ScreensetsRegistry

The `ScreensetsRegistry` abstract class does NOT declare `loadExtension()`, `mountExtension()`, or `unmountExtension()`. Loading and mounting are `MountManager`'s responsibility. The `ExtensionLifecycleActionHandler` accesses these operations via focused callbacks that go through `OperationSerializer` -> `MountManager`.

The consumer-facing API for extension lifecycle operations is exclusively through actions chains via `registry.executeActionsChain()`.

The `getMountedExtension(domainId)` method remains on the abstract `ScreensetsRegistry` -- it is a query method for checking which extension is currently mounted.

The `getParentBridge(extensionId)` method is on the abstract `ScreensetsRegistry` -- it returns the bridge after a mount completes. See [ParentMfeBridge Return Value Gap](#parentmfebridge-return-value-gap) below.

```
Consumer-facing API (actions chains only):
  Consumer code --> registry.executeActionsChain({
                      action: { type: HAI3_ACTION_MOUNT_EXT, target: domainId, payload: { extensionId } }
                    })
                      |
                      v
  ActionsChainsMediator --> validates action support against domain
                      |
                      v
  ExtensionLifecycleActionHandler
    1. container = this.containerProvider.getContainer(extensionId)
    2. this.callbacks.mountExtension(extensionId, container)
                      |
                      v
  OperationSerializer --> MountManager.mountExtension(id, container)
```

### Domain Action Handler Implementation

Each domain registers an `ActionHandler` with the mediator that routes lifecycle actions to the appropriate registry methods. The handler encapsulates domain-specific semantics (e.g., screen swap).

**`DomainSemantics` type**: Defined in the same file as `ExtensionLifecycleActionHandler`.

```typescript
/**
 * Determines how the domain handles mount_ext actions.
 *
 * - 'swap': The domain unmounts the currently mounted extension before mounting the new one.
 *   Used by the screen domain (always has content, transitions are seamless).
 * - 'toggle': The domain mounts/unmounts extensions independently (no automatic unmounting).
 *   Used by sidebar, popup, and overlay domains.
 *
 * DomainSemantics is derived from the domain's `actions` array at handler construction time:
 * - If the domain's `actions` array does NOT include `HAI3_ACTION_UNMOUNT_EXT` -> 'swap'
 * - If the domain's `actions` array includes `HAI3_ACTION_UNMOUNT_EXT` -> 'toggle'
 */
type DomainSemantics = 'swap' | 'toggle';
```

**Single extension per domain invariant**: Each domain supports **at most one mounted extension at a time**. When a 'swap' domain receives `mount_ext`, the handler unmounts the existing extension before mounting the new one. When a 'toggle' domain receives `mount_ext`, the consumer is responsible for unmounting the previous extension first (if applicable).

```typescript
/**
 * Callbacks required by ExtensionLifecycleActionHandler.
 *
 * These callbacks are wired by DefaultScreensetsRegistry.registerDomain() to go
 * through OperationSerializer -> MountManager. The handler does NOT hold a
 * reference to ScreensetsRegistry -- it receives only the focused callbacks it
 * needs. This follows the same callback injection pattern used by all other
 * collaborators (ExtensionManager, LifecycleManager, DefaultMountManager).
 */
interface ExtensionLifecycleCallbacks {
  /** Load an extension's bundle (OperationSerializer -> MountManager.loadExtension) */
  loadExtension: (extensionId: string) => Promise<void>;
  /** Mount an extension into the given container (OperationSerializer -> MountManager.mountExtension) */
  mountExtension: (extensionId: string, container: Element) => Promise<ParentMfeBridge>;
  /** Unmount an extension (OperationSerializer -> MountManager.unmountExtension) */
  unmountExtension: (extensionId: string) => Promise<void>;
  /** Query the currently mounted extension in a domain (ExtensionManager) */
  getMountedExtension: (domainId: string) => string | undefined;
}

/**
 * Action handler for extension lifecycle actions within a domain.
 * Registered with the ActionsChainsMediator as the domain's action handler.
 *
 * Intercepts the three extension lifecycle actions and delegates to focused callbacks.
 * Non-lifecycle domain actions pass through as no-ops.
 *
 * @internal
 */
class ExtensionLifecycleActionHandler implements ActionHandler {
  constructor(
    private readonly domainId: string,
    private readonly callbacks: ExtensionLifecycleCallbacks,
    private readonly domainSemantics: DomainSemantics,
    private readonly containerProvider: ContainerProvider
  ) {}

  async handleAction(
    actionTypeId: string,
    payload: Record<string, unknown> | undefined
  ): Promise<void> {
    switch (actionTypeId) {
      case HAI3_ACTION_LOAD_EXT: {
        this.requirePayload(actionTypeId, payload);
        await this.callbacks.loadExtension((payload as unknown as LoadExtPayload).extensionId);
        break;
      }

      case HAI3_ACTION_MOUNT_EXT: {
        this.requirePayload(actionTypeId, payload);
        const mountPayload = payload as unknown as MountExtPayload;
        if (this.domainSemantics === 'swap') {
          await this.handleScreenSwap(mountPayload);
        } else {
          const container = this.containerProvider.getContainer(mountPayload.extensionId);
          await this.callbacks.mountExtension(mountPayload.extensionId, container);
        }
        break;
      }

      case HAI3_ACTION_UNMOUNT_EXT: {
        this.requirePayload(actionTypeId, payload);
        const extensionId = (payload as unknown as UnmountExtPayload).extensionId;
        await this.callbacks.unmountExtension(extensionId);
        this.containerProvider.releaseContainer(extensionId);
        break;
      }

      default:
        break;
    }
  }

  private requirePayload(
    actionTypeId: string,
    payload: Record<string, unknown> | undefined
  ): asserts payload is Record<string, unknown> {
    if (!payload) {
      throw new MfeError(
        `Extension lifecycle action '${actionTypeId}' requires a payload`,
        'LIFECYCLE_ACTION_MISSING_PAYLOAD'
      );
    }
  }

  private async handleScreenSwap(payload: MountExtPayload): Promise<void> {
    const { extensionId: newExtensionId } = payload;
    const currentExtId = this.callbacks.getMountedExtension(this.domainId);
    if (currentExtId && currentExtId !== newExtensionId) {
      await this.callbacks.unmountExtension(currentExtId);
      this.containerProvider.releaseContainer(currentExtId);
    }
    const container = this.containerProvider.getContainer(newExtensionId);
    await this.callbacks.mountExtension(newExtensionId, container);
  }
}
```

#### Callback Wiring

`DefaultScreensetsRegistry.registerDomain()` creates an `ExtensionLifecycleActionHandler` and wires its callbacks through `OperationSerializer` to `MountManager`. The handler is registered with the `ActionsChainsMediator` as the domain's `ActionHandler`. This follows the same callback injection pattern used by all collaborators.

---

## Usage Examples

### Mounting an Extension via Actions Chain

```typescript
import { HAI3_ACTION_MOUNT_EXT, HAI3_POPUP_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.settings.v1',
    },
  },
});
```

### Screen Navigation (Swap Semantics)

```typescript
import { HAI3_ACTION_MOUNT_EXT, HAI3_SCREEN_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_SCREEN_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.app.ext.dashboard.v1',
    },
  },
});
```

### Preloading an Extension

```typescript
import { HAI3_ACTION_LOAD_EXT, HAI3_SIDEBAR_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_LOAD_EXT,
    target: HAI3_SIDEBAR_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.app.ext.help_panel.v1',
    },
  },
});
```

### Dismissing a Popup

```typescript
import { HAI3_ACTION_UNMOUNT_EXT, HAI3_POPUP_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_UNMOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.settings.v1',
    },
  },
});
```

### Lifecycle Hook Using mount_ext

```typescript
const myExtension: Extension = {
  id: '...',
  domain: HAI3_SIDEBAR_DOMAIN,
  entry: '...',
  lifecycle: [
    {
      stage: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
      actions_chain: {
        action: {
          type: HAI3_ACTION_LOAD_EXT,
          target: HAI3_SIDEBAR_DOMAIN,
          payload: { extensionId: '...' },
        },
      },
    },
  ],
};
```

### Error Case: unmount_ext on Screen Domain

```typescript
import { HAI3_ACTION_UNMOUNT_EXT, HAI3_SCREEN_DOMAIN } from '@hai3/framework';

try {
  await registry.executeActionsChain({
    action: {
      type: HAI3_ACTION_UNMOUNT_EXT,
      target: HAI3_SCREEN_DOMAIN,
      payload: { extensionId: '...' },
    },
  });
} catch (error) {
  // UnsupportedDomainActionError: Domain 'screen' does not support action 'unmount_ext'
}
```

---

## ParentMfeBridge Return Value Gap

### Problem

The `executeActionsChain()` API returns `Promise<void>`, which does not include the bridge. Internal consumers need the bridge reference after mounting.

### Solution

The bridge is stored in `ExtensionState.bridge` by `DefaultMountManager.mountExtension()` during the actions chain execution. A query method on the abstract `ScreensetsRegistry` provides access:

```typescript
// On abstract ScreensetsRegistry:
abstract getParentBridge(extensionId: string): ParentMfeBridge | null;
```

**Implementation on `DefaultScreensetsRegistry`:**

```typescript
getParentBridge(extensionId: string): ParentMfeBridge | null {
  return this.extensionManager.getExtensionState(extensionId)?.bridge ?? null;
}
```

### Why a query method

A dedicated query method keeps concerns separate: actions chains execute lifecycle operations, query methods read resulting state. The bridge is stored as a side effect of mount and can be read after the `executeActionsChain()` promise resolves.

---

## Container Provider Abstraction

### Problem

The `mount_ext` action payload should not contain DOM references. The domain owns its layout and knows WHERE extensions render; callers should only specify WHICH extension to mount.

### Solution: ContainerProvider Abstract Class

A `ContainerProvider` abstract class is registered alongside each domain. The provider supplies DOM containers for extensions.

```typescript
// packages/screensets/src/mfe/runtime/container-provider.ts

/**
 * Abstract container provider -- contract for domain container management.
 *
 * Each extension domain has a ContainerProvider that supplies the DOM
 * container element for mounting extensions.
 *
 * Concrete implementations:
 * - @hai3/react provides RefContainerProvider wrapping a React ref
 * - Custom domains can provide their own implementations
 *
 * Exported from @hai3/screensets for consumer implementations.
 */
export abstract class ContainerProvider {
  /**
   * Get the DOM container element for the given extension.
   * Called by ExtensionLifecycleActionHandler during mount_ext handling.
   *
   * @param extensionId - ID of the extension being mounted
   * @returns The DOM Element to mount into
   * @throws Error if no container is available
   */
  abstract getContainer(extensionId: string): Element;

  /**
   * Release the DOM container for the given extension.
   * Called by ExtensionLifecycleActionHandler during unmount_ext handling
   * and during swap operations.
   *
   * Implementations MAY be no-ops when container lifecycle is managed externally.
   *
   * @param extensionId - ID of the extension being unmounted
   */
  abstract releaseContainer(extensionId: string): void;
}
```

### Registration: registerDomain Signature

```typescript
// On abstract ScreensetsRegistry:
abstract registerDomain(domain: ExtensionDomain, containerProvider: ContainerProvider, onInitError?: (error: Error) => void): void;
```

The `ContainerProvider` is stored alongside the domain state and passed to the `ExtensionLifecycleActionHandler` at construction time.

### MountManager Signature

`DefaultMountManager.mountExtension(id, container)` continues to accept `container` as a parameter. The `ExtensionLifecycleActionHandler` calls `this.containerProvider.getContainer(extensionId)` to obtain the container, then passes it through the callback chain to `MountManager.mountExtension(id, container)`.

### RefContainerProvider (in @hai3/react)

The `RefContainerProvider` and `ExtensionDomainSlot` are React-specific components that belong in `@hai3/react`, not `@hai3/screensets`. `@hai3/screensets` is SDK Layer L1 with zero dependencies -- it must not import React.

```typescript
// packages/react/src/mfe/components/RefContainerProvider.ts

/**
 * Concrete ContainerProvider that wraps a React ref.
 * Created by framework-level code when registering React-rendered domains.
 *
 * @internal
 */
class RefContainerProvider extends ContainerProvider {
  constructor(private readonly containerRef: React.RefObject<HTMLDivElement>) {}

  getContainer(_extensionId: string): Element {
    if (!this.containerRef.current) {
      throw new Error('Container ref is not attached -- component may not be mounted yet');
    }
    return this.containerRef.current;
  }

  releaseContainer(_extensionId: string): void {
    // No-op for React ref -- the ref lifecycle is managed by React.
  }
}
```

### ExtensionDomainSlot (in @hai3/react)

The `ExtensionDomainSlot` React component lives in `@hai3/react`. It dispatches `mount_ext`/`unmount_ext` actions via `executeActionsChain()` but does NOT call `registerDomain()` itself.

```typescript
// In ExtensionDomainSlot (packages/react/src/mfe/components/ExtensionDomainSlot.tsx):
await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: domainId,
    payload: {
      extensionId,
      // No container field -- domain's ContainerProvider supplies it
    },
  },
});
```

### Framework Actions

Lifecycle actions (load, mount, unmount) call `screensetsRegistry.executeActionsChain()` directly from framework actions (fire-and-forget). Effects are retained only for extension registration operations.

```typescript
// packages/framework/src/plugins/microfrontends/actions.ts
import { HAI3_ACTION_MOUNT_EXT } from '@hai3/screensets';
import type { ScreensetsRegistry } from '@hai3/screensets';

let registry: ScreensetsRegistry;

export function mountExtension(extensionId: string): void {
  const extension = registry.getExtension(extensionId);
  if (!extension) {
    throw new Error(`Extension '${extensionId}' is not registered.`);
  }
  registry.executeActionsChain({
    action: {
      type: HAI3_ACTION_MOUNT_EXT,
      target: extension.domain,
      payload: { extensionId },
    },
  });
  // Fire-and-forget: no await, void return.
}
```

**What lives in actions**: `loadExtension`, `mountExtension`, `unmountExtension`. These call `executeActionsChain()` directly.

**What lives in effects**: `registerExtension`, `unregisterExtension`. These are legitimate async operations that need store state tracking.

**Not actions**: Domain registration (`registerDomain`/`unregisterDomain`) is called directly on `ScreensetsRegistry` -- it is synchronous and does not need store state tracking or Flux event/effect/slice round-trip.

**Store slice**: Retains only extension registration state. Load/mount state is tracked internally by the screensets registry via `ExtensionState`.

**ESLint protection**: Effects files cannot call `executeActionsChain()`. Both `**/effects.ts` and `**/*Effects.ts` patterns are covered in `screenset.ts` (L4) and `framework.ts` (L2) ESLint configs.

### Framework registerDomain Signature

```typescript
// packages/framework/src/types.ts
registerDomain: (domain: ExtensionDomain, containerProvider: ContainerProvider, onInitError?: (error: Error) => void) => void;
```

### ContainerProvider Ownership Model

**Key principle**: `ExtensionDomainSlot` (in `@hai3/react`) does NOT call `registerDomain()`. Domains are registered by framework-level code. `ExtensionDomainSlot` only dispatches `mount_ext`/`unmount_ext` actions.

**Registration flow by domain type**:

| Domain Type | Who Registers | Who Creates ContainerProvider | When |
|-------------|--------------|-------------------------------|------|
| HAI3 built-in layout domains | Framework microfrontends plugin / application initialization | Framework-level code creates `RefContainerProvider` (from `@hai3/react`) wrapping the React ref from `ExtensionDomainSlot` via a two-step pattern. | During app initialization or plugin setup |
| Custom/MFE-defined domains | MFE initialization code or application code | The registering code creates an appropriate `ContainerProvider` | At runtime, when the domain is needed |

**Two-step registration pattern for React-rendered domains**:

1. **Domain registration**: Framework-level code calls `registerDomain(domain, containerProvider, onInitError?)` with a `RefContainerProvider` wrapping a React ref. The ref's `.current` may be `null` at this point.
2. **React mount**: When `ExtensionDomainSlot` mounts, the React ref attaches to the DOM element. `RefContainerProvider.getContainer()` reads `ref.current` lazily at call time, so it returns the correct element once React has mounted.

This works because `getContainer()` is only called during `mount_ext` handling, which happens AFTER the React component has rendered and the ref is attached.

### React Ref Stability and Strict Mode

`RefContainerProvider` wraps a `React.RefObject<HTMLDivElement>`. Since `getContainer()` reads `ref.current` lazily, the same provider instance works across re-renders and Strict Mode remounts.

### Design Decisions

1. **ContainerProvider is an abstract class, not an interface** -- follows HAI3's established pattern.

2. **Registered alongside the domain, not on the domain type** -- `ExtensionDomain` is JSON-serializable. Adding a `ContainerProvider` would break serialization.

3. **`releaseContainer` is called by the handler, not by MountManager** -- keeps acquisition and release at the same level.

4. **MountManager still receives `container: Element`** -- the handler resolves the container from the `ContainerProvider` and passes it through.

5. **Handler owns all ContainerProvider interactions** -- single point of ownership for `getContainer` and `releaseContainer`.

6. **Breaking change** -- `registerDomain(domain)` becomes `registerDomain(domain, containerProvider, onInitError?)`. Acceptable for alpha stage.
