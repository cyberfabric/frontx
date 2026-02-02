# Glossary

This document defines key terms used throughout the MFE system design documents.

---

## Core Concepts

### Microfrontend (MFE)
A Microfrontend (MFE) is an independently developed, deployed, and versioned UI component that can be loaded into a parent application at runtime. HAI3's default handler (`MfeHandlerMF`) enforces instance-level isolation - each MFE instance gets its own runtime, and even multiple instances of the same MFE entry are isolated from each other. Custom handlers can implement different isolation strategies for internal MFEs. Communication happens only through defined contracts via the MfeBridge. Throughout these documents, "MFE" is used as the standard abbreviation after the first occurrence.

### Domain (ExtensionDomain)
An extension point where MFE instances can be mounted. Domains can exist at **any level of the hierarchy** - the host application can define domains, and MFEs themselves can define their own domains for nested extensions. This enables hierarchical composition where an MFE acts as both an extension (to its parent's domain) and a domain provider (for its own child extensions). Domains define the contract with extensions by declaring shared properties, supported action types, and UI metadata schemas. See [mfe-domain.md](./mfe-domain.md).

### Extension
A binding that connects an MFE entry to a specific domain, creating a concrete MFE instance. With the default handler, each extension registration creates an isolated instance - the same MFE entry mounted twice results in two isolated runtime instances. Custom handlers may allow sharing for internal MFEs. Extensions include UI metadata that must conform to the domain's schema and are registered dynamically at runtime. See [mfe-domain.md](./mfe-domain.md#extension).

### Entry (MfeEntry)
The contract that an MFE declares with its hosting domain. Specifies required/optional properties and bidirectional action capabilities. MfeEntry is abstract; derived types (like MfeEntryMF) add loader-specific fields. See [mfe-entry-mf.md](./mfe-entry-mf.md).

### Bridge (MfeBridge)
The communication channel between an MFE instance and its parent domain. Provides methods for subscribing to shared properties and sending action requests to the domain. With HAI3's default handler, each MFE **instance** receives its own bridge instance - this supports instance-level isolation. Custom handlers can create bridges with different isolation characteristics. See [mfe-api.md](./mfe-api.md).

---

## Communication

### Action
A typed message with a target (domain or extension), self-identifying type ID, optional payload, and optional timeout override. Actions are the units of communication in action chains. See [mfe-actions.md](./mfe-actions.md).

### ActionsChain
A linked structure of actions with `next` (on success) and `fallback` (on failure) branches. Enables declarative action workflows where the outcome of one action determines which action executes next. See [mfe-actions.md](./mfe-actions.md).

### SharedProperty
A typed value passed from the host to mounted MFEs (one-way: host to MFE). Domains declare which properties they provide; entries declare which properties they require. MFEs subscribe to property updates via the bridge. See [mfe-shared-property.md](./mfe-shared-property.md).

---

## Lifecycle

### LifecycleStage
A GTS type representing a lifecycle event that can trigger actions chains. HAI3 provides four default stages (`init`, `activated`, `deactivated`, `destroyed`), and projects can define custom stages. Lifecycle stages enable declarative, explicit lifecycle behavior on extensions and domains. See [mfe-lifecycle.md](./mfe-lifecycle.md).

### LifecycleHook
A binding between a lifecycle stage and an actions chain. When the stage triggers, the system executes the associated actions chain. Extensions and domains can declare multiple hooks for different stages. See [mfe-lifecycle.md](./mfe-lifecycle.md).

---

## Runtime Components

### Handler (MfeHandler)
An abstract class that handles loading MFE bundles for specific entry types. Handlers use type hierarchy matching to determine which entries they can handle. HAI3 provides MfeHandlerMF for Module Federation; companies can register custom handlers. See [mfe-loading.md](./mfe-loading.md).

### MfeBridgeFactory
An abstract factory that creates bridge instances for specific entry types. Each handler has an associated bridge factory. Custom handlers can provide rich bridges with additional services (routing, API clients, etc.).

### ActionsChainsMediator
The runtime component that routes action chains to their targets and handles success/failure branching. Validates action types against domain contracts before delivery. Each isolated runtime has its own mediator instance. See [mfe-actions.md](./mfe-actions.md).

---

## Type System

### TypeSystemPlugin
An interface that abstracts type system operations for MFE contracts. Provides methods for type ID validation, schema registration, instance validation, and type hierarchy checking. The screensets package treats type IDs as opaque strings. See [type-system.md](./type-system.md).

### GTS (Global Type System)
HAI3's default implementation of TypeSystemPlugin. Uses the `@globaltypesystem/gts-ts` package. GTS type IDs follow the format: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>~`. See [type-system.md](./type-system.md).

### Contract
The agreement between an MFE entry and a domain, defining:
- Which shared properties the domain provides and the entry requires
- Which action types the entry can send to the domain
- Which action types can target the entry from the domain

Contract matching is validated at extension registration time. See [type-system.md](./type-system.md#decision-8-contract-matching-rules).

---

## Module Federation

### MfManifest
A GTS type containing Module Federation 2.0 configuration: remote entry URL, container name, and shared dependency settings. Referenced by MfeEntryMF instances. Multiple entries can share one manifest when exposed from the same federated container. See [mfe-manifest.md](./mfe-manifest.md).

### MfeEntryMF
HAI3's default derived entry type extending MfeEntry with Module Federation fields. References an MfManifest and specifies the exposed module path. This is the thin contract suitable for third-party vendors. See [mfe-entry-mf.md](./mfe-entry-mf.md).
