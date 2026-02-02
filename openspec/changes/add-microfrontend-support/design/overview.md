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

MFE instances don't talk directly to each other. Each MFE **instance** has its own **Bridge** to its parent domain. All communication goes through the parent.

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│    MFE A    │      │     HOST     │      │    MFE B    │
│             │      │              │      │             │
│             │◀─────│──(properties)│─────▶│             │
│             │      │              │      │             │
│  (request)  │─────▶│              │◀─────│  (request)  │
│             │◀─────│(chains both  │─────▶│             │
│             │      │    ways)     │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
    Bridge A                                  Bridge B
     (own)                                     (own)
```

### Two Communication Mechanisms

1. **[Shared Properties](./mfe-shared-property.md)** - One-way: host → MFEs
   - User context, theme, selected items
   - MFEs subscribe and react to changes

2. **[Actions Chains](./mfe-actions.md)** - Bidirectional: routed to targets
   - ActionsChains are sent to targets (domains or extensions)
   - ActionsChainsMediator routes chains to targets based on `action.target`
   - Action types in contracts define what targets can send/receive; ActionsChains are the messages

---

## How MFEs are Loaded

MFEs are loaded on-demand using [Module Federation](./mfe-loading.md). The host doesn't bundle MFE code - it fetches it at runtime.

```
┌─────────────────┐         ┌─────────────────┐
│   HOST APP      │         │   CDN / Server  │
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

The [MfManifest](./mfe-manifest.md) tells the handler where to find the MFE bundle and what dependencies it shares with the host.

---

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
    │ REGISTER│  Host registers Extension (binds entry to domain)
    └────┬────┘  [init] lifecycle stage triggered
         │
         ▼
    ┌─────────┐
    │  LOAD   │  Bundle fetched via Module Federation
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │  MOUNT  │  MFE's mount() called with container and bridge
    └────┬────┘  [activated] lifecycle stage triggered
         │
         ▼
    ┌─────────┐
    │  RUN    │  MFE renders UI, subscribes to properties,
    └────┬────┘  communicates via actions chains
         │
         ▼
    ┌─────────┐
    │ UNMOUNT │  MFE's unmount() called, cleanup performed
    └────┬────┘  [deactivated] lifecycle stage triggered
         │
         ▼
    ┌─────────┐
    │ UNREGISTER │  Extension removed from registry
    └─────────┘    [destroyed] lifecycle stage triggered
```

**Lifecycle stages** allow extensions and domains to declare explicit actions chains that execute at each stage. See [MFE Lifecycle](./mfe-lifecycle.md) for details.

See [MFE API](./mfe-api.md) for the mount/unmount interface that MFEs must implement.

---

## Error Handling

When things go wrong, the system provides [specific error types](./mfe-errors.md):

| Error | When it happens |
|-------|-----------------|
| `MfeLoadError` | Bundle failed to load (network, 404, etc.) |
| `ContractValidationError` | MFE doesn't match domain's requirements |
| `ChainExecutionError` | Action chain failed during execution |
| `UnsupportedDomainActionError` | Action not supported by target domain |

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
| [mfe-shared-property.md](./mfe-shared-property.md) | Shared properties |
| [mfe-lifecycle.md](./mfe-lifecycle.md) | Lifecycle stages and hooks |
| [mfe-api.md](./mfe-api.md) | MFE lifecycle and bridge interfaces |
| [mfe-errors.md](./mfe-errors.md) | Error class hierarchy |
| [type-system.md](./type-system.md) | Type system plugin and contract validation |
| [schemas.md](./schemas.md) | GTS JSON Schema definitions |
| [registry-runtime.md](./registry-runtime.md) | Runtime isolation and registration |
| [principles.md](./principles.md) | Design principles |
