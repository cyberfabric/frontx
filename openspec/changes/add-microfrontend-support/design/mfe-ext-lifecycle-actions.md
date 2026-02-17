# Design: Extension Lifecycle Actions

This document defines the three extension lifecycle action types (`load_ext`, `mount_ext`, `unmount_ext`) that serve as the consumer-facing API for loading, mounting, and unmounting MFE extensions. These actions are declared on the 4 extension domains and replace direct method calls as the public interface for extension lifecycle operations.

**Related Documents:**
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain types, mediation
- [Schemas](./schemas.md) - ExtensionDomain, Extension, LifecycleStage, LifecycleHook schema definitions
- [Type System](./type-system.md) - TypeScript interface definitions, contract validation
- [MFE API](./mfe-api.md) - MfeEntryLifecycle and bridge interfaces
- [Registry Runtime](./registry-runtime.md) - ScreensetsRegistry methods
- [MFE Errors](./mfe-errors.md) - Error class hierarchy

---

## Table of Contents

1. [Context](#context)
2. [Extension Domains vs Configuration Domains](#extension-domains-vs-configuration-domains)
3. [The Three Extension Lifecycle Actions](#the-three-extension-lifecycle-actions) -- action types, constants, payloads, GTS instances
4. [Domain Action Support Matrix](#domain-action-support-matrix) -- which domains support which actions
5. [Screen Domain: Swap Semantics](#screen-domain-swap-semantics)
6. [Domain Action Declarations](#domain-action-declarations) -- domain configuration for all 4 extension domains
7. [Action Handlers as the Consumer-Facing API](#action-handlers-as-the-consumer-facing-api) -- ExtensionLifecycleActionHandler, domain semantics
8. [Usage Examples](#usage-examples) -- mounting, navigation, preloading, popups, lifecycle hooks, error cases
9. [ParentMfeBridge Return Value Gap](#parentmfebridge-return-value-gap)
10. [Container Provider Abstraction](#container-provider-abstraction) -- ContainerProvider, RefContainerProvider, ExtensionDomainSlot
11. [Framework Actions](#framework-actions) -- Flux integration layer
12. [ContainerProvider Ownership Model](#containerprovider-ownership-model)
13. [React Ref Stability and Strict Mode](#react-ref-stability-and-strict-mode)
14. [Design Decisions](#design-decisions)

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

The framework defines 7 layout domains total. Only 4 are **extension domains** (where MFE entries mount and render). The remaining 3 are **configuration domains** (static layout areas managed by store slices, not MFE mount targets). Configuration domains are a conceptual categorization, NOT GTS `ExtensionDomain` instances, and are NOT registered with `ScreensetsRegistry`.

| Domain | Type | Purpose |
|--------|------|---------|
| **screen** | Extension | Main content area |
| **sidebar** | Extension | Collapsible side panel |
| **popup** | Extension | Modal dialogs |
| **overlay** | Extension | Full-screen overlays |
| header | Configuration | Top navigation bar (store slice driven) |
| footer | Configuration | Bottom bar (store slice driven) |
| menu | Configuration | Side navigation (populated from registered screen extension presentation metadata) |

Extension lifecycle actions are relevant only to extension domains.

**Menu auto-population**: The menu configuration domain is populated dynamically from the `presentation` metadata on registered screen extensions. The screen domain requires extensions to use the derived `extension_screen.v1` type which includes required `presentation` metadata. When a screen extension is registered with `presentation.label`, `presentation.icon`, `presentation.route`, and `presentation.order`, the host derives menu items from these fields. No hardcoded menu items exist. See [Screen Extension Schema](./schemas.md#screen-extension-schema-derived) for the `presentation` field definition.

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

**Note on `id` and `type` fields**: Action instances carry both `id` and `type` with the same value. `id` is required by GTS registration (all GTS entities have an `id`). `type` is the Action schema's self-identifying field (`x-gts-ref: "/$id"`). They share the same value because the action's identity IS its type.

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

> **Note on `defaultActionTimeout`**: The authoritative value for all domains is `30000` (30 seconds), as shown in the TypeScript constants in `base-domains.ts` and in the code blocks below. The GTS JSON instance files (`screen.v1.json`, `sidebar.v1.json`, `popup.v1.json`, `overlay.v1.json`) currently carry `5000` due to an implementation-time discrepancy. Phase 37 task 37.2.4 aligns all 4 domain JSON files to `30000`.

```typescript
// Screen domain -- load_ext + mount_ext only (no unmount_ext)
//
// Screen domain lifecycleStages: [init] only.
// The screen domain is a permanent fixture -- it is always visible and never
// destroyed during the application lifespan. It does not go through activated,
// deactivated, or destroyed stages. It is initialized once at app startup and
// remains alive until the app itself is torn down.
//
// Extensions within the screen domain still go through all 4 stages
// (extensionsLifecycleStages) because individual screen extensions are
// swapped in and out via mount_ext.
const screenDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.screen.v1',
  sharedProperties: [
    HAI3_SHARED_PROPERTY_THEME,
    HAI3_SHARED_PROPERTY_LANGUAGE,
  ],
  actions: [
    HAI3_ACTION_LOAD_EXT,
    HAI3_ACTION_MOUNT_EXT,
    // No HAI3_ACTION_UNMOUNT_EXT -- screen always has content
  ],
  extensionsActions: [],
  // Screen domain requires extensions to use the derived extension_screen type
  extensionsTypeId: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~',
  defaultActionTimeout: 30000,
  lifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    // No activated, deactivated, destroyed -- screen domain is a permanent fixture
  ],
  extensionsLifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
};

// Sidebar domain -- all three actions (popup and overlay are structurally identical)
const sidebarDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~hai3.screensets.layout.sidebar.v1',
  sharedProperties: [
    HAI3_SHARED_PROPERTY_THEME,
    HAI3_SHARED_PROPERTY_LANGUAGE,
  ],
  actions: [
    HAI3_ACTION_LOAD_EXT,
    HAI3_ACTION_MOUNT_EXT,
    HAI3_ACTION_UNMOUNT_EXT,
  ],
  extensionsActions: [],
  defaultActionTimeout: 30000,
  lifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
  extensionsLifecycleStages: [
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
    'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
  ],
};

// Popup domain (hai3.screensets.layout.popup.v1) and
// Overlay domain (hai3.screensets.layout.overlay.v1) are structurally
// identical to sidebar -- all three actions, all 4 lifecycle stages for
// both domain and extensions. Only the domain ID differs.
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

`ExtensionLifecycleActionHandler` is an `@internal` class implementing `ActionHandler`. It receives focused callbacks (`ExtensionLifecycleCallbacks`) wired by `DefaultScreensetsRegistry.registerDomain()` through `OperationSerializer` to `MountManager`. The handler does NOT hold a reference to `ScreensetsRegistry`.

**Behavior**: The handler switches on action type:
- **`load_ext`**: Validates payload, delegates to `callbacks.loadExtension(extensionId)`.
- **`mount_ext`**: Validates payload. For 'swap' semantics: unmounts the current extension (via `callbacks.getMountedExtension` + `callbacks.unmountExtension` + `containerProvider.releaseContainer`), then obtains a container via `containerProvider.getContainer` and mounts the new extension. For 'toggle' semantics: obtains container and mounts directly.
- **`unmount_ext`**: Validates payload, unmounts via `callbacks.unmountExtension`, then calls `containerProvider.releaseContainer`.
- **Other actions**: Delegates to `customActionHandler` if provided, otherwise no-op.

All lifecycle actions require a payload; missing payload throws `MfeError` with code `LIFECYCLE_ACTION_MISSING_PAYLOAD`.

#### Custom Action Handlers for Non-Lifecycle Domain Actions

Domains may support non-lifecycle actions in their `actions` array. The `ExtensionLifecycleActionHandler` delegates non-lifecycle actions to an optional `customActionHandler` callback. This is a valid extension point for future domain-specific actions that are not part of the core extension lifecycle (load/mount/unmount).

**Distinction between actions chains and custom action handlers:**
- **Actions chains**: Declarative MFE lifecycle coordination (load/mount/unmount) and cross-runtime routing. Validated by the mediator, routed through operation serializer, and executed by MountManager.
- **Custom action handlers**: Imperative host-side effects for non-lifecycle domain actions (store dispatch, external API calls, etc.). NOT part of the MFE lifecycle, but rather domain-specific host behaviors.

**`CustomActionHandler` type:**

```typescript
/**
 * Custom action handler callback type.
 * Invoked for non-lifecycle actions on the domain.
 */
export type CustomActionHandler = (actionTypeId: string, payload: Record<string, unknown> | undefined) => Promise<void>;
```

**Usage example:**

```typescript
// Define a custom domain action
const CUSTOM_ACTION = 'gts.hai3.mfes.comm.action.v1~acme.dashboard.comm.custom_action.v1';

// Register domain with a custom action handler
const customHandler = async (actionTypeId: string, payload?: Record<string, unknown>) => {
  if (actionTypeId === CUSTOM_ACTION) {
    // Host-side effect: dispatch to store, call external API, etc.
  }
};

screensetsRegistry.registerDomain(domain, containerProvider, undefined, customHandler);
```

**Important: custom action handlers must NOT be used as data proxies between runtimes.** See [Principles - Independent Data Fetching per Runtime](./principles.md#independent-data-fetching-per-runtime) for the architectural principle. Each runtime fetches its own data independently. Custom action handlers are for host-side effects triggered by MFE actions (e.g., navigating to an external URL, triggering a host-owned workflow), NOT for relaying data from MFE to host.

#### Callback Wiring

`DefaultScreensetsRegistry.registerDomain()` creates an `ExtensionLifecycleActionHandler` and wires its callbacks through `OperationSerializer` to `MountManager`. The handler is registered with the `ActionsChainsMediator` as the domain's `ActionHandler`. This follows the same callback injection pattern used by all collaborators.

---

## Usage Examples

### Mounting an Extension via Actions Chain

```typescript
// Framework-level (L2) code -- MFE packages (L4) import from '@hai3/react' instead
import { HAI3_ACTION_MOUNT_EXT, HAI3_POPUP_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.popups.settings.v1',
    },
  },
});
```

### Screen Navigation (Swap Semantics)

```typescript
// Framework-level (L2) code -- MFE packages (L4) import from '@hai3/react' instead
import { HAI3_ACTION_MOUNT_EXT, HAI3_SCREEN_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_MOUNT_EXT,
    target: HAI3_SCREEN_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.dashboard.screens.main.v1',
    },
  },
});
```

### Preloading an Extension

```typescript
// Framework-level (L2) code -- MFE packages (L4) import from '@hai3/react' instead
import { HAI3_ACTION_LOAD_EXT, HAI3_SIDEBAR_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_LOAD_EXT,
    target: HAI3_SIDEBAR_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.support.panels.help.v1',
    },
  },
});
```

### Dismissing a Popup

```typescript
// Framework-level (L2) code -- MFE packages (L4) import from '@hai3/react' instead
import { HAI3_ACTION_UNMOUNT_EXT, HAI3_POPUP_DOMAIN } from '@hai3/framework';

await registry.executeActionsChain({
  action: {
    type: HAI3_ACTION_UNMOUNT_EXT,
    target: HAI3_POPUP_DOMAIN,
    payload: {
      extensionId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.popups.settings.v1',
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
// Framework-level (L2) code -- MFE packages (L4) import from '@hai3/react' instead
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
abstract registerDomain(
  domain: ExtensionDomain,
  containerProvider: ContainerProvider,
  onInitError?: (error: Error) => void,
  customActionHandler?: CustomActionHandler
): void;
```

The `ContainerProvider` is stored alongside the domain state and passed to the `ExtensionLifecycleActionHandler` at construction time. The optional `customActionHandler` is passed to the action handler to handle non-lifecycle domain actions. See "Custom Action Handlers for Non-Lifecycle Domain Actions" section above for details.

### MountManager Signature

`DefaultMountManager.mountExtension(id, container)` continues to accept `container` as a parameter. The `ExtensionLifecycleActionHandler` calls `this.containerProvider.getContainer(extensionId)` to obtain the container, then passes it through the callback chain to `MountManager.mountExtension(id, container)`.

### RefContainerProvider and ExtensionDomainSlot (in @hai3/react)

`RefContainerProvider` and `ExtensionDomainSlot` are React-specific components in `@hai3/react` (not `@hai3/screensets`). `RefContainerProvider` wraps a React ref, returning `ref.current` from `getContainer()` and using a no-op `releaseContainer()`. `ExtensionDomainSlot` dispatches `mount_ext`/`unmount_ext` actions but does NOT call `registerDomain()`.

### ExtensionDomainSlot Usage (in @hai3/react)

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

**Store slice**: Retains extension registration state and mount notification signals. The `mountedExtensions` map is a notification trigger for React hooks, NOT the authoritative mount state (which remains in the screensets registry's internal `ExtensionState`).

**ESLint protection**: Effects files cannot call `executeActionsChain()`. Both `**/effects.ts` and `**/*Effects.ts` patterns are covered in `screenset.ts` (L4) and `framework.ts` (L2) ESLint configs.

### Framework registerDomain Signature

```typescript
// packages/framework/src/types.ts
registerDomain: (
  domain: ExtensionDomain,
  containerProvider: ContainerProvider,
  onInitError?: (error: Error) => void,
  customActionHandler?: CustomActionHandler
) => void;
```

### ContainerProvider Ownership Model

**Key principle**: `ExtensionDomainSlot` (in `@hai3/react`) does NOT call `registerDomain()`. Domains are registered by framework-level code. `ExtensionDomainSlot` only dispatches `mount_ext`/`unmount_ext` actions.

**Registration flow by domain type**:

| Domain Type | Who Registers | Who Creates ContainerProvider | When |
|-------------|--------------|-------------------------------|------|
| HAI3 built-in layout domains | Framework microfrontends plugin / application initialization | Framework-level code creates `RefContainerProvider` (from `@hai3/react`) wrapping the React ref from `ExtensionDomainSlot` via a two-step pattern. | During app initialization or plugin setup |
| Custom/MFE-defined domains | MFE initialization code or application code | The registering code creates an appropriate `ContainerProvider` | At runtime, when the domain is needed |

**Two-step registration pattern for React-rendered domains**:

1. **Domain registration**: Framework-level code calls `registerDomain(domain, containerProvider, onInitError?, customActionHandler?)` with a `RefContainerProvider` wrapping a React ref. The ref's `.current` may be `null` at this point. The optional `customActionHandler` is provided if the domain supports custom non-lifecycle actions.
2. **React mount**: When `ExtensionDomainSlot` mounts, the React ref attaches to the DOM element. `RefContainerProvider.getContainer()` reads `ref.current` lazily at call time, so it returns the correct element once React has mounted.

This works because `getContainer()` is only called during `mount_ext` handling, which happens AFTER the React component has rendered and the ref is attached.

### React Ref Stability and Strict Mode

`RefContainerProvider` wraps a `React.RefObject<HTMLDivElement>`. Since `getContainer()` reads `ref.current` lazily, the same provider instance works across re-renders and Strict Mode remounts.

### Design Decisions

1. **ContainerProvider is an abstract class, not an interface** -- follows HAI3's established pattern.

2. **Registered alongside the domain, not on the domain type** -- `ExtensionDomain` is JSON-serializable. Adding a `ContainerProvider` would break serialization.

3. **`releaseContainer` is called by the handler, not by MountManager** -- keeps acquisition and release at the same level.

4. **MountManager receives `container: Element` from `ContainerProvider`** -- the handler resolves the container from the `ContainerProvider`. MountManager then creates a `ShadowRoot` via `createShadowRoot()` on the container element and passes the `ShadowRoot` to the lifecycle's `mount()` method. The lifecycle never sees the raw container element.

5. **Handler owns all ContainerProvider interactions** -- single point of ownership for `getContainer` and `releaseContainer`.

6. **Breaking change** -- `registerDomain(domain)` becomes `registerDomain(domain, containerProvider, onInitError?)`. Acceptable for alpha stage.
