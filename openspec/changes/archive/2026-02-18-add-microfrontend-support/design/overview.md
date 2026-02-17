# MFE System Design Overview

This document provides a high-level overview of the Microfrontend (MFE) system architecture.

---

## What is the MFE System?

The MFE system allows independent UI components (microfrontends) to be loaded into a parent application at runtime. Each MFE is developed, deployed, and versioned independently, and they can work together through well-defined contracts.

**Key Benefits:**
- Teams can develop and deploy independently
- MFEs can use different frameworks (React, Vue, Svelte, etc.)
- **Instance-level isolation (default)** - HAI3's default handler enforces isolation where each MFE instance has its own runtime; custom handlers can implement different strategies
- New features can be added without redeploying the parent
- **Hierarchical composition** - MFEs can define their own domains for nested extensions

<a name="system-boundary"></a>
**System Boundary:**
The MFE system's scope is **registration and lifecycle**, NOT fetching. How MFE entities (manifests, entries, extensions, domains) are obtained from backends is **outside the MFE system scope**. Application code is responsible for fetching entities and calling registration methods. Entities become the MFE system's concern only AFTER they are registered.

---

## Core Concepts

```
┌────────────────────────────────────────────────────────────────────────┐
│                          HOST APPLICATION                              │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         DOMAIN A (Host's)                        │  │
│  │  - Provides shared properties (user, theme, etc.)                │  │
│  │  - Defines supported action types (contract)                     │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────┐  ┌─────────────────┐    │  │
│  │  │          EXTENSION A                │  │   EXTENSION B   │    │  │
│  │  │  ┌───────────────────────────────┐  │  │  ┌───────────┐  │    │  │
│  │  │  │   MFE INSTANCE (React)        │  │  │  │    MFE    │  │    │  │
│  │  │  │   - Has its own runtime       │  │  │  │   (Vue)   │  │    │  │
│  │  │  │   - Can define its OWN domain │  │  │  └───────────┘  │    │  │
│  │  │  │                               │  │  └─────────────────┘    │  │
│  │  │  │  ┌─────────────────────────┐  │  │                         │  │
│  │  │  │  │    DOMAIN B (MFE's)     │  │  │  MFEs can be BOTH:      │  │
│  │  │  │  │  ┌────────┐ ┌────────┐  │  │  │  - Extension to parent  │  │
│  │  │  │  │  │ Ext C  │ │ Ext D  │  │  │  │  - Domain provider for  │  │
│  │  │  │  │  │ (MFE)  │ │ (MFE)  │  │  │  │    its own children     │  │
│  │  │  │  │  └────────┘ └────────┘  │  │  │                         │  │
│  │  │  │  └─────────────────────────┘  │  │                         │  │
│  │  │  └───────────────────────────────┘  │                         │  │
│  │  └─────────────────────────────────────┘                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### The Main Types

| Type | What it is | Analogy |
|------|-----------|---------|
| [**Domain**](./schemas.md#extension-domain-schema) | A slot where MFE instances can mount (can exist at any level - host or nested MFE) | A power outlet |
| [**Entry**](./mfe-entry-mf.md) | The MFE's contract (what it needs and provides) | A plug specification |
| [**Extension**](./schemas.md#extension-schema) | The actual MFE instance mounted in a domain (isolated by default; custom handlers can allow sharing) | A plugged-in device |
| [**LifecycleStage**](./schemas.md#lifecycle-stage-schema) | A lifecycle event type that triggers actions chains | A lifecycle hook trigger |
| [**LifecycleHook**](./schemas.md#lifecycle-hook-schema) | Binds a lifecycle stage to an actions chain | A declared lifecycle behavior |

---

## How MFE Instances Communicate

MFE instances don't talk directly to each other. Each MFE **instance** has its own **ChildMfeBridge** to its parent domain. All communication goes through the registry.

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    MFE A    │      │   REGISTRY   │      │    MFE B    │
│             │      │              │      │             │
│             │◀─────│──(properties)│─────▶│             │
│             │      │              │      │             │
│ execute     │─────▶│executeAC()   │◀─────│ execute     │
│ ActionsChain│      │(mediator     │      │ ActionsChain│
│ (via bridge)│      │  routes)     │      │ (via bridge)│
└─────────────┘      └──────────────┘      └─────────────┘
ChildMfeBridge A                        ChildMfeBridge B
.executeActionsChain()                  .executeActionsChain()
```

### Two Communication Mechanisms

1. **[Shared Properties](./mfe-api.md#domain-level-property-updates)** - One-way: parent → MFEs
   - **Theme** (`HAI3_SHARED_PROPERTY_THEME`): Type ID for the theme shared property contract. The runtime value (e.g., `"dark"`) is set by the host via `updateDomainProperty()`. MFEs apply their own CSS variables based on the received value.
   - **Language** (`HAI3_SHARED_PROPERTY_LANGUAGE`): Type ID for the language shared property contract. The runtime value (e.g., `"de"`) is set by the host via `updateDomainProperty()`. MFEs load their own i18n translations based on the received value.
   - All 4 base extension domains declare theme and language as shared properties.
   - MFE entries declare theme and language in `requiredProperties` to ensure the contract is validated at registration.
   - MFEs subscribe and react to changes via `bridge.subscribeToProperty()`.

2. **[Actions Chains](./mfe-actions.md)** - Executed via registry
   - `registry.executeActionsChain(chain)` is the ONLY public API for triggering actions chains
   - Child MFEs access this via `childBridge.executeActionsChain()` (pass-through to registry)
   - ActionsChainsMediator routes chains to targets based on `action.target`
   - Action types in contracts define what targets can send/receive; ActionsChains are the messages
   - **[Extension lifecycle actions](./mfe-ext-lifecycle-actions.md)** (`load_ext`, `mount_ext`, `unmount_ext`) are the consumer-facing API for loading, mounting, and unmounting extensions -- direct registry methods are internal

### Action Chain Execution

The public API is `registry.executeActionsChain(chain)` -- the single entry point for all runtimes. Child MFEs access this via `childBridge.executeActionsChain()` (pass-through to registry). For hierarchical composition, bridge-to-bridge transport between mediator instances uses private concrete-only methods. See [MFE API - Action Chain Execution Model](./mfe-api.md#action-chain-execution-model) for the complete design including cross-runtime routing via `ChildDomainForwardingHandler`.

---

## Navigation Menu Auto-Population

The navigation menu is driven entirely by registered screen extensions. Screen extensions use the derived `extension_screen.v1` type which includes required `presentation` metadata (label, icon, route, order) that the host uses to build the nav menu dynamically.

```
Screen Extension Registration Flow:
  1. registerExtension({ id, domain: screenDomain, entry, presentation: { label, icon, route, order } })
     (Extension uses extension_screen derived type with required presentation)
  2. Host queries: runtime.getExtensionsForDomain(HAI3_SCREEN_DOMAIN)
  3. Host builds menu items from each extension's presentation metadata
  4. Menu items are sorted by presentation.order
  5. Clicking a menu item triggers mount_ext for that extension

  No hardcoded menu items. No legacy screenset registry. No AppRouter.
  The menu reflects exactly what is registered.
```

See [Screen Extension Schema](./schemas.md#screen-extension-schema-derived) for the `presentation` field definition and [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md#extension-domains-vs-configuration-domains) for the menu configuration domain.

---

## How MFEs are Loaded

MFEs are loaded on-demand using [Module Federation](./mfe-loading.md). The parent doesn't bundle MFE code - it fetches it at runtime.

```
┌─────────────────┐         ┌─────────────────┐
│   PARENT APP    │         │   CDN / Server  │
│                 │         │                 │
│  "Load chart    │  HTTP   │  ┌───────────┐  │
│   widget"       │────────▶│  │ Chart MFE │  │
│                 │         │  │  Bundle   │  │
│                 │◀────────│  └───────────┘  │
│  ┌───────────┐  │         │                 │
│  │ Chart MFE │  │         │  ┌───────────┐  │
│  │ (loaded)  │  │         │  │ Table MFE │  │
│  └───────────┘  │         │  │  Bundle   │  │
│                 │         │  └───────────┘  │
└─────────────────┘         └─────────────────┘
```

MfManifest is an internal detail of the MF handler (see [mfe-loading.md Decision 12](./mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf)) -- it provides bundle location and shared dependency configuration to the handler's resolution logic.

---

<a name="runtime-isolation-default-behavior"></a>
## Runtime Isolation (Default Behavior)

HAI3's default handler (`MfeHandlerMF`) enforces instance-level isolation: separate state, styles (Shadow DOM), and errors per instance. Custom handlers can implement different strategies.

See [Principles - Shadow DOM Style Isolation](./principles.md#shadow-dom-style-isolation-default-handler) for the full Shadow DOM isolation model, CSS variable behavior, and custom handler options.

---

## MFE Lifecycle

```
    ┌─────────┐
    │ DEFINE  │  Developer creates MfeEntry (contract)
    └────┬────┘  and MfManifest (loading config)
         │
         ▼
    ┌─────────┐
    │ REGISTER│  Parent registers Extension (binds entry to domain)
    └────┬────┘  [init] lifecycle stage triggered
         │
         ▼
    ┌─────────┐
    │  LOAD   │  Bundle fetched via Module Federation
    └────┬────┘  (triggered by load_ext action chain)
         │
         ▼
    ┌─────────┐
    │  MOUNT  │  MFE's mount() called with container and bridge
    └────┬────┘  (triggered by mount_ext action chain)
         │       [activated] lifecycle stage triggered
         ▼
    ┌─────────┐
    │  RUN    │  MFE renders UI, subscribes to properties,
    └────┬────┘  communicates via actions chains
         │
         ▼
    ┌─────────┐
    │ UNMOUNT │  MFE's unmount() called, cleanup performed
    └────┬────┘  (triggered by unmount_ext action chain)
         │       [deactivated] lifecycle stage triggered
         │
         ▼
    ┌─────────┐
    │ UNREGISTER │  Extension removed from registry
    └─────────┘    [destroyed] lifecycle stage triggered
```

**Lifecycle stages** allow extensions and domains to declare explicit actions chains that execute at each stage. See [schemas.md - Lifecycle Stage Schema](./schemas.md#lifecycle-stage-schema) for the type definition and [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md) for how lifecycle actions integrate with the domain system.

**Extension lifecycle actions** (`load_ext`, `mount_ext`, `unmount_ext`) are the consumer-facing API for triggering load, mount, and unmount operations via `executeActionsChain()`. See [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md) for the complete design.

**Preloading**: `MountManager` exposes a `loadExtension(extensionId)` method that fetches the JS bundle without mounting. This method is **internal only** (not on the public `ScreensetsRegistry` abstract class). It is triggered by the `load_ext` action via `ExtensionLifecycleActionHandler`. Consumers preload via `executeActionsChain()` with `HAI3_ACTION_LOAD_EXT`, not by calling `loadExtension` directly.

See [MFE API](./mfe-api.md) for the mount/unmount interface that MFEs must implement.

---

## Error Handling

When things go wrong, the system provides [specific error types](./mfe-errors.md). See [MFE Errors](./mfe-errors.md) for the complete error class hierarchy (13 error classes).

---

## Design Documents

For detailed specifications, see:

| Document | Description |
|----------|-------------|
| [glossary.md](./glossary.md) | Key terms and definitions |
| [mfe-entry-mf.md](./mfe-entry-mf.md) | MFE entry contracts |
| [mfe-manifest.md](./mfe-manifest.md) | Module Federation configuration |
| [mfe-loading.md](./mfe-loading.md) | Handler architecture and bundle loading |
| [mfe-actions.md](./mfe-actions.md) | Action types and actions chains |
| [mfe-ext-lifecycle-actions.md](./mfe-ext-lifecycle-actions.md) | Extension lifecycle actions (load, mount, unmount) |
| [mfe-api.md](./mfe-api.md) | MFE lifecycle, bridge interfaces, shared properties |
| [mfe-errors.md](./mfe-errors.md) | Error class hierarchy |
| [type-system.md](./type-system.md) | Type system plugin and contract validation |
| [schemas.md](./schemas.md) | GTS JSON Schema definitions (all core types including Domain, Extension, SharedProperty, LifecycleStage, LifecycleHook) |
| [registry-runtime.md](./registry-runtime.md) | Runtime isolation and registration |
| [principles.md](./principles.md) | Design principles |
