# Glossary

Quick-reference definitions for key MFE system terms. Each entry links to the authoritative design document for full details.

---

## Core Concepts

### Microfrontend (MFE)
An independently developed, deployed, and versioned UI component loaded into a parent application at runtime. See [overview.md](./overview.md).

### Domain (ExtensionDomain)
An extension point where MFE instances mount. Domains exist at any hierarchy level and define the contract (shared properties, action types) with extensions. See [schemas.md](./schemas.md#extension-domain-schema).

### Extension
A binding connecting an MFE entry to a domain, creating a concrete MFE instance. Domain-specific fields use derived types (e.g., `ScreenExtension`). See [schemas.md](./schemas.md#extension-schema-base).

### ScreenExtension
Derived Extension type for the screen domain that adds required `presentation` metadata. See [schemas.md](./schemas.md#screen-extension-schema-derived).

### ExtensionPresentation
Presentation metadata on screen extensions: `label`, `icon`, `route`, `order`. Drives nav menu auto-population. See [schemas.md](./schemas.md#screen-extension-schema-derived).

### Entry (MfeEntry)
The contract an MFE declares with its parent domain (required properties, action capabilities). Abstract; derived types like MfeEntryMF add loader-specific fields. See [mfe-entry-mf.md](./mfe-entry-mf.md).

### ChildMfeBridge
Communication channel for child MFE code to interact with its parent domain (property subscriptions, actions chain execution). See [mfe-api.md](./mfe-api.md).

### ParentMfeBridge
Parent-side interface for managing a mounted MFE instance (`instanceId`, `dispose()`). See [mfe-api.md](./mfe-api.md).

---

## Communication

### Action
A typed message with target, type ID, optional payload, and optional timeout. See [mfe-actions.md](./mfe-actions.md).

### ActionsChain
Linked actions with `next` (success) and `fallback` (failure) branches for declarative workflows. See [mfe-actions.md](./mfe-actions.md).

### SharedProperty
A one-way (parent-to-child) typed value. Domains declare provided properties; entries declare required ones. HAI3 provides built-in `theme` and `language` instances. See [mfe-shared-property.md](./mfe-shared-property.md).

---

## Lifecycle

### LifecycleStage
A GTS type representing a lifecycle event that can trigger actions chains (`init`, `activated`, `deactivated`, `destroyed`). See [mfe-ext-lifecycle-actions.md](./mfe-ext-lifecycle-actions.md).

### LifecycleHook
A binding between a lifecycle stage and an actions chain, triggering the chain when the stage fires. See [mfe-ext-lifecycle-actions.md](./mfe-ext-lifecycle-actions.md).

---

## Runtime Components

### Handler (MfeHandler)
Abstract class for loading MFE bundles for specific entry types, using type hierarchy matching. See [mfe-loading.md](./mfe-loading.md).

### MfeBridgeFactory
Abstract factory that creates bridge instances for MFEs loaded by a specific handler. See [mfe-loading.md](./mfe-loading.md).

### RuntimeBridgeFactory
`@internal` abstract class for internal bridge wiring between host and child runtimes (distinct from handler-level `MfeBridgeFactory`). See [registry-runtime.md](./registry-runtime.md#runtime-bridge-factory-class-based).

### ActionsChainsMediator
Routes action chains to targets and handles success/failure branching. Public API: `registry.executeActionsChain()`. See [mfe-actions.md](./mfe-actions.md).

### ChildDomainForwardingHandler
`@internal` class that forwards actions targeting a child domain through bridge transport. See [mfe-api.md](./mfe-api.md#cross-runtime-action-chain-routing-hierarchical-composition).

---

## Type System

### TypeSystemPlugin
Interface abstracting type system operations (schema registration, validation, type hierarchy). See [type-system.md](./type-system.md).

### GTS (Global Type System)
HAI3's default TypeSystemPlugin implementation using `@globaltypesystem/gts-ts`. Type ID format: `gts.<vendor>.<package>.<namespace>.<type>.v<N>~`. See [type-system.md](./type-system.md).

### Contract
The agreement between an MFE entry and a domain covering shared properties and bidirectional action types. Validated at registration time. See [type-system.md](./type-system.md#decision-8-contract-matching-rules).

---

## Module Federation

### MfManifest
GTS type with Module Federation 2.0 config (remote entry URL, container name, shared deps). Multiple entries can share one manifest. See [mfe-manifest.md](./mfe-manifest.md).

### MfeEntryMF
HAI3's default derived entry type adding Module Federation fields (manifest reference, exposed module path). See [mfe-entry-mf.md](./mfe-entry-mf.md).
