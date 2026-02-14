# Change: Add Microfrontend Support

## Why

HAI3 applications need to compose functionality from multiple independently deployed microfrontends (MFEs). Vendors can create MFE extensions that integrate into parent applications through well-defined extension points. This enables:

1. **Independent Deployment**: MFEs can be deployed separately from the parent application
2. **Vendor Extensibility**: Third parties can create extensions without modifying parent code, using ANY UI framework (Vue 3, Angular, Svelte, etc.)
3. **Instance-Level Runtime Isolation (Default)**: HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](./design/overview.md#runtime-isolation-default-behavior) for details.
4. **Type-Safe Contracts**: Each runtime has its own TypeSystemPlugin instance - MFE instances cannot discover parent or sibling schemas
5. **Framework Agnostic**: Parent uses React, but MFEs can use any framework - no React/ReactDOM dependency for MFEs
6. **Dynamic Registration**: Extensions and MFEs can be registered at ANY time during runtime, not just at app initialization - enabling runtime configuration, feature flags, and backend-driven extensibility
7. **Hierarchical Composition**: MFEs can define their own domains for nested extensions - an MFE can be both an extension (to its parent) and a domain provider (for its children)

## What Changes

### Framework Plugin Model

**Key Principles:**
- **Screensets is CORE to HAI3** - automatically initialized by `createHAI3()`, NOT a `.use()` plugin
- **Microfrontends plugin enables MFE capabilities** with NO static configuration
- **All MFE registration is dynamic** - happens at runtime via actions/API, not at initialization

```typescript
// Screensets is CORE - automatically initialized by createHAI3()
const app = createHAI3()
  .use(microfrontends())  // No configuration - just enables MFE capabilities
  .build();

// All registration happens dynamically at runtime:
// Extension registration via Flux actions (with store state tracking):
// - mfeActions.registerExtension({ extension })
// Domain registration via runtime API (direct, synchronous):
// - runtime.registerDomain(domain, containerProvider, onInitError?)
```

### Core Architecture

HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](./design/overview.md#runtime-isolation-default-behavior) for the complete isolation model, including recommendations for 3rd-party vs internal MFEs.

Communication happens ONLY through the explicit contract (ChildMfeBridge interface):
- **Shared properties** (parent to child, read-only)
- **Actions chain** delivered by ActionsChainsMediator to targets

**Hierarchical domains**: Domains can exist at ANY level. An MFE can be an extension to its parent's domain, define its OWN domains for nested MFEs, or both simultaneously.

### Architectural Decision: Type System Plugin Abstraction

The @hai3/screensets package abstracts the Type System as a **pluggable dependency**:

1. **Opaque Type IDs**: The screensets package treats type IDs as opaque strings
2. **Required Plugin**: A `TypeSystemPlugin` must be provided at initialization
3. **Default Implementation**: GTS (`@globaltypesystem/gts-ts`) ships as the default plugin
4. **Extensibility**: Other Type System implementations can be plugged in

**Key Principle**: The screensets package treats type IDs as opaque strings. All type understanding is delegated to the plugin.

See [Type System - Decision 1](./design/type-system.md#decision-1-type-system-plugin-interface) for the complete `TypeSystemPlugin` interface definition.

**GTS-Native Validation Model:**
- Schema/type IDs end with `~`: `gts.hai3.mfes.ext.extension.v1~`
- Instance IDs do NOT end with `~`: `gts.hai3.mfes.ext.extension.v1~acme.ext.widget.v1`
- gts-ts extracts the schema ID from the chained instance ID automatically
- gts-ts uses Ajv INTERNALLY - no direct Ajv dependency needed in MFE plugin

**Built-in First-Class Citizen Schemas:**

The GTS plugin ships with all HAI3 first-class citizen schemas built-in. No `registerSchema` calls are needed for core types. See [Type System - Decision 4](./design/type-system.md#decision-4-built-in-first-class-citizen-schemas) for the rationale.

### HAI3 Internal TypeScript Types

The MFE system uses these internal TypeScript interfaces. Each type has an `id: string` field as its identifier:

**Core Types (8 type schemas):**

> **Note on type count**: The 8 core types listed below are GTS **type schemas** (JSON Schema definitions). LifecycleStage and LifecycleHook are type schemas that define the structure for lifecycle-related entities. The 4 default lifecycle stages (`init`, `activated`, `deactivated`, `destroyed`) listed later are **instances/values** of the LifecycleStage type - they are pre-defined stage definitions, not additional type schemas.

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeEntry` | `id, requiredProperties: string[], optionalProperties?: string[], actions: string[], domainActions: string[]` | Pure contract type (Abstract Base) |
| `ExtensionDomain` | `id, sharedProperties: string[], actions: string[], extensionsActions: string[], extensionsTypeId?: string, defaultActionTimeout: number, lifecycleStages: string[], extensionsLifecycleStages: string[], lifecycle?: LifecycleHook[]` | Extension point contract |
| `Extension` | `id, domain, entry, lifecycle?: LifecycleHook[]` | Extension binding (domain-specific fields in derived types) |
| `SharedProperty` | `id, value` | Shared property instance |
| `Action` | `type, target, payload?, timeout?` | Action with self-identifying type ID and optional timeout override |
| `ActionsChain` | `action: Action, next?: ActionsChain, fallback?: ActionsChain` | Action chain for mediation (contains instances, no id) |
| `LifecycleStage` | `id, description?` | Lifecycle event type that triggers actions chains |
| `LifecycleHook` | `stage, actions_chain` | Binds a lifecycle stage to an actions chain |

**MF-Specific Types (2 types):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfManifest` | `id, remoteEntry, remoteName, sharedDependencies?: SharedDependencyConfig[], entries?: string[]` | Module Federation manifest (standalone) |
| `MfeEntryMF` | `(extends MfeEntry) manifest, exposedModule` | Module Federation entry (derived) |

**Framework-Agnostic Lifecycle Interface (1 type):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeEntryLifecycle<TBridge>` | `mount(container: Element, bridge: TBridge): void \| Promise<void>, unmount(container: Element): void \| Promise<void>` | Lifecycle interface for MFE entries (TBridge defaults to ChildMfeBridge) |

**Handler Abstraction (1 public type):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeHandler<TEntry, TBridge>` | `bridgeFactory, canHandle(entryTypeId), load(entry), priority?` | Abstract handler class for different entry types |

### Intentionally Omitted Methods

- **`validateAgainstSchema`**: Not needed; extension validation uses native `validateInstance()` with derived Extension types.
- **`buildTypeId`**: GTS type IDs are consumed but never generated at runtime; all are string constants.

### Bridge Interface Names

The MFE Bridge interfaces are named to clarify which side of the parent/child relationship each interface is for. See [MFE API - Bridge Interfaces](./design/mfe-api.md#mfe-bridge-interfaces) for the complete interface definitions, methods, and examples.

### GTS Type ID Format

The GTS type ID format is: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

### Type System Registration (Built-in to GTS Plugin)

The GTS plugin ships with all first-class citizen schemas **built-in** (8 core types, 4 default lifecycle stages, 2 MF-specific types). No `registerSchema` calls are needed for core types. See [Type System - Decision 2](./design/type-system.md#decision-2-gts-type-id-format-and-registration) for the complete GTS Type ID tables.

### GTS JSON Schema Definitions

Each of the 8 core types and 2 MF-specific types has a corresponding JSON Schema with proper `$id`. See [design/schemas.md](./design/schemas.md) for complete JSON Schema definitions of all types.

**Note on `registerSchema`:** The `registerSchema(schema)` method is for vendor/dynamic schemas only. The type ID is extracted from the schema's `$id` field - no need to pass it separately. First-class citizen schemas are built into the plugin and do not require registration.

### MfeEntry Type Hierarchy

MfeEntry is the abstract base type for all entry contracts. MfeEntryMF extends it with Module Federation fields. Companies can create their own derived types (e.g., `MfeEntryAcme`) with richer contracts.

For the complete type hierarchy diagram including field definitions, `x-gts-ref` annotations, and company custom entry type examples, see [design/mfe-entry-mf.md](./design/mfe-entry-mf.md#mfeentry-type-hierarchy).

### Contract Matching Rules

For mounting to be valid, the entry must be compatible with the domain. See [Contract Matching Rules in type-system.md](./design/type-system.md#decision-8-contract-matching-rules) for the complete validation algorithm and implementation details.

### Domain-Specific Extension Validation via Derived Types

Domain-specific fields are defined in **derived Extension schemas** directly (not a separate `uiMeta` field). `ExtensionDomain.extensionsTypeId` optionally references a derived Extension type; extensions must derive from it. Validation uses GTS-native `register()` + `validateInstance()` + `isTypeOf()`. See [Type System - Decision 9](./design/type-system.md#decision-9-domain-specific-extension-validation-via-derived-types) for details.

### Explicit Timeout Configuration

`Effective timeout = action.timeout ?? domain.defaultActionTimeout`. Timeout is treated as failure (triggers `ActionsChain.fallback`). Chain-level `chainTimeout` limits total chain execution. See [MFE Actions - Timeout](./design/mfe-actions.md#explicit-timeout-configuration) for details.

### Actions Chain Runtime

ActionsChainsMediator delivers actions chains to targets. On success: executes `next` chain; on failure/timeout: executes `fallback` chain. Recurses until chain ends. See [MFE Actions - Mediation](./design/mfe-actions.md#actions-chain-mediation) for the execution flow diagram.

### Hierarchical Extension Domains

Domains can exist at any level: host provides base layout domains (`sidebar`, `popup`, `screen`, `overlay`); MFEs can define their own domains for nested extensions; an MFE can be both extension and domain provider simultaneously. See [MFE Domain - Hierarchical Domains](./design/mfe-domain.md#hierarchical-extension-domains) for diagrams.

### Extension Lifecycle Actions

Three generic actions (`load_ext`, `mount_ext`, `unmount_ext`) serve as the consumer-facing API for extension lifecycle. Each domain handles them according to its layout semantics; `executeActionsChain()` is the only consumer-facing entry point. See [Extension Lifecycle Actions](./design/mfe-ext-lifecycle-actions.md) for action constant IDs, GTS instance IDs, domain support matrix, and the complete design.

### Container Provider Abstraction

A `ContainerProvider` abstract class shifts DOM container management from action callers to the domain. The provider is passed at domain registration time via `registerDomain(domain, containerProvider, onInitError?)`, and the `ExtensionLifecycleActionHandler` is the single owner of all provider interactions. See [Extension Lifecycle Actions - ContainerProvider](./design/mfe-ext-lifecycle-actions.md#container-provider-abstraction) for the complete design including the ownership model, `RefContainerProvider`, and callback wiring.

### Dynamic Registration Model

Extensions and MFEs are NOT known at app initialization time. `ScreensetsRegistry` handles dynamic registration at any point during the application lifecycle. Loading fetches the bundle; mounting renders to DOM. Entity fetching is outside MFE system scope. See [Registry Runtime - Decision 17](./design/registry-runtime.md#decision-17-dynamic-registration-model) for the complete API and [System Boundary](./design/overview.md#system-boundary) for scope.

### Architectural Requirement: Abstract Class Layers

Every major stateful component has an abstract class (pure contract) and a concrete implementation. See [Principle #6](./design/principles.md#abstract-class-layers-with-singleton-construction) and [Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction) for the complete design including construction patterns (singleton constant, factory-with-cache, direct construction), export policy, and file layout.

### Flux Architecture Compliance for MFE Lifecycle Actions

Lifecycle actions (`loadExtension`, `mountExtension`, `unmountExtension`) call `executeActionsChain()` directly (fire-and-forget, no await, void return). Effects remain only for `registerExtension` and `unregisterExtension` (async operations with store state tracking). Domain registration is called directly on `ScreensetsRegistry` (synchronous). Load/mount state is tracked internally by the registry via `ExtensionState`; the framework store slice tracks registration state only. ESLint rules enforce that effects files cannot call `executeActionsChain()` (ESLint rule modification required -- see tasks). See [mfe-ext-lifecycle-actions.md](./design/mfe-ext-lifecycle-actions.md) for the complete design.

## Impact

### Affected specs
- `screensets` - Core MFE integration, Type System plugin interface, and type definitions

### Affected code

**New packages:**
- `packages/screensets/src/mfe/` - MFE runtime, ActionsChainsMediator
- `packages/screensets/src/mfe/types/` - Internal TypeScript type definitions
- `packages/screensets/src/mfe/validation/` - Contract matching validation
- `packages/screensets/src/mfe/mediator/` - ActionsChainsMediator for action chain delivery
- `packages/screensets/src/mfe/plugins/` - Type System plugin interface and implementations
- `packages/screensets/src/mfe/plugins/gts/` - GTS plugin implementation (default)
- `packages/screensets/src/mfe/handler/` - MfeHandler abstract class, MfeBridgeFactory, and handler registry
- `packages/screensets/src/mfe/handler/mf-handler.ts` - MfeHandlerMF and MfeBridgeFactoryDefault (Module Federation default handler)

**Modified packages:**
- `packages/screensets/src/state/` - Isolated state instances (uses @hai3/state)
- `packages/screensets/src/screensets/` - Extension domain registration
- `packages/framework/src/plugins/microfrontends/` - Enables MFE capabilities (no static configuration)

### Test File Location Convention

Test files MUST be placed in `packages/<package>/__tests__/` (mirroring `src/mfe/` structure), NOT co-located inside `src/` subdirectories. The root `tsconfig.json` exclude pattern only matches `__tests__` directly under `packages/*/` or `packages/*/src/`, not deeply nested paths.

### Interface Changes

Note: HAI3 is in alpha stage. Backward-incompatible interface changes are expected.

- MFEs require Type System-compliant type definitions for integration
- Extension points must define explicit contracts
- `ScreensetsRegistryConfig` requires `typeSystem` parameter

### Implementation strategy
1. Define `TypeSystemPlugin` interface in @hai3/screensets
2. Create GTS plugin implementation with built-in first-class citizen schemas
3. Implement ScreensetsRegistry with dynamic registration API
4. Define internal TypeScript types for MFE architecture (8 core + 2 MF-specific)
5. GTS plugin registers all first-class schemas during construction (no separate initialization step)
6. Support runtime registration of extensions, domains, and MFEs at any time
7. Propagate plugin through @hai3/framework layers
8. Update documentation and examples
9. Refactor ScreensetsRegistry into abstract class (pure contract) + DefaultScreensetsRegistry concrete + screensetsRegistry singleton constant (intermediate -- replaced by factory-with-cache in step 12)
10. Split collaborator files into separate abstract/concrete modules
11. Update all DIP consumer references to type against abstract ScreensetsRegistry; eliminate all standalone factory functions and static factory methods
12. Replace screensetsRegistry singleton constant with ScreensetsRegistryFactory factory-with-cache pattern to enable true TypeSystemPlugin pluggability
