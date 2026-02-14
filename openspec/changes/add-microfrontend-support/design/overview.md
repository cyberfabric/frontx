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
| [**Domain**](./mfe-domain.md) | A slot where MFE instances can mount (can exist at any level - host or nested MFE) | A power outlet |
| [**Entry**](./mfe-entry-mf.md) | The MFE's contract (what it needs and provides) | A plug specification |
| [**Extension**](./mfe-domain.md#extension) | The actual MFE instance mounted in a domain (isolated by default; custom handlers can allow sharing) | A plugged-in device |
| [**LifecycleStage**](./mfe-lifecycle.md) | A lifecycle event type that triggers actions chains | A lifecycle hook trigger |
| [**LifecycleHook**](./mfe-lifecycle.md) | Binds a lifecycle stage to an actions chain | A declared lifecycle behavior |

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

1. **[Shared Properties](./mfe-shared-property.md)** - One-way: parent → MFEs
   - User context, theme, selected items
   - MFEs subscribe and react to changes

2. **[Actions Chains](./mfe-actions.md)** - Executed via registry
   - `registry.executeActionsChain(chain)` is the ONLY public API for triggering actions chains
   - Child MFEs access this via `childBridge.executeActionsChain()` (pass-through to registry)
   - ActionsChainsMediator routes chains to targets based on `action.target`
   - Action types in contracts define what targets can send/receive; ActionsChains are the messages
   - **[Extension lifecycle actions](./mfe-ext-lifecycle-actions.md)** (`load_ext`, `mount_ext`, `unmount_ext`) are the consumer-facing API for loading, mounting, and unmounting extensions -- direct registry methods are internal

### Action Chain Execution

The public API is `registry.executeActionsChain(chain)` -- the single entry point for all runtimes. Child MFEs access this via `childBridge.executeActionsChain()` (pass-through to registry). For hierarchical composition, bridge-to-bridge transport between mediator instances uses private concrete-only methods. See [MFE API - Action Chain Execution Model](./mfe-api.md#action-chain-execution-model) for the complete design including cross-runtime routing via `ChildDomainForwardingHandler`.

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

The [MfManifest](./mfe-manifest.md) tells the handler where to find the MFE bundle and what dependencies it shares with the parent.

---

<a name="runtime-isolation-default-behavior"></a>
## Runtime Isolation (Default Behavior)

HAI3's default handler (`MfeHandlerMF`) enforces instance-level isolation. Custom handlers can implement different isolation strategies based on their requirements.

**With the default handler, each MFE instance runs in complete isolation:**

- **Separate state** - Instance A cannot access Instance B's React state (even if they're the same MFE entry)
- **Separate styles** - CSS from one instance doesn't leak to another (Shadow DOM)
- **Separate errors** - If Instance A crashes, Instance B keeps working
- **Instance-level isolation** - mounting the same MFE entry twice creates two completely independent runtime instances

```
┌───────────────────────────────────────────────────────────────────┐
│                           PARENT                                  │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Shadow DOM       │  │ Shadow DOM       │  │ Shadow DOM       │ │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │ │
│  │ │ INSTANCE A   │ │  │ │ INSTANCE B   │ │  │ │ INSTANCE C   │ │ │
│  │ │ (ChartMFE)   │ │  │ │ (ChartMFE)   │ │  │ │ (TableMFE)   │ │ │
│  │ │              │ │  │ │              │ │  │ │              │ │ │
│  │ │ Own React    │ │  │ │ Own React    │ │  │ │ Own Vue      │ │ │
│  │ │ Own styles   │ │  │ │ Own styles   │ │  │ │ Own styles   │ │ │
│  │ │ Own state    │ │  │ │ Own state    │ │  │ │ Own state    │ │ │
│  │ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                   │
│  Note: With default handler, Instances A and B (same MFE entry)   │
│  are completely isolated. Custom handlers can allow sharing.      │
└───────────────────────────────────────────────────────────────────┘
```

**Isolation Recommendations:**

| MFE Source | Recommended Strategy | Reason |
|------------|---------------------|--------|
| 3rd-party/vendor MFEs | Always isolate | Security - untrusted code must not access other instances |
| Internal MFEs | Handler can allow sharing | Coordination, efficiency - trusted code can share state if beneficial |

Custom handlers (e.g., `MfeHandlerAcme`) can choose to allow internal MFE instances to share state, bridges, or other resources when isolation is not required.

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

**Lifecycle stages** allow extensions and domains to declare explicit actions chains that execute at each stage. See [MFE Lifecycle](./mfe-lifecycle.md) for details.

**Extension lifecycle actions** (`load_ext`, `mount_ext`, `unmount_ext`) are the consumer-facing API for triggering load, mount, and unmount operations via `executeActionsChain()`. See [Extension Lifecycle Actions](./mfe-ext-lifecycle-actions.md) for the complete design.

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
| [mfe-domain.md](./mfe-domain.md) | Extension domains and extensions |
| [mfe-entry-mf.md](./mfe-entry-mf.md) | MFE entry contracts |
| [mfe-manifest.md](./mfe-manifest.md) | Module Federation configuration |
| [mfe-loading.md](./mfe-loading.md) | Handler architecture and bundle loading |
| [mfe-actions.md](./mfe-actions.md) | Action types and actions chains |
| [mfe-ext-lifecycle-actions.md](./mfe-ext-lifecycle-actions.md) | Extension lifecycle actions (load, mount, unmount) |
| [mfe-shared-property.md](./mfe-shared-property.md) | Shared properties |
| [mfe-lifecycle.md](./mfe-lifecycle.md) | Lifecycle stages and hooks |
| [mfe-api.md](./mfe-api.md) | MFE lifecycle and bridge interfaces |
| [mfe-errors.md](./mfe-errors.md) | Error class hierarchy |
| [type-system.md](./type-system.md) | Type system plugin and contract validation |
| [schemas.md](./schemas.md) | GTS JSON Schema definitions |
| [registry-runtime.md](./registry-runtime.md) | Runtime isolation and registration |
| [principles.md](./principles.md) | Design principles |
