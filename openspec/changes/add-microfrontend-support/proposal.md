# Change: Add Microfrontend Support

## Why

HAI3 applications need to compose functionality from multiple independently deployed microfrontends (MFEs). Vendors can create MFE extensions that integrate into parent applications through well-defined extension points. This enables:

1. **Independent Deployment**: MFEs can be deployed separately from the parent application
2. **Vendor Extensibility**: Third parties can create extensions without modifying parent code, using ANY UI framework (Vue 3, Angular, Svelte, etc.)
3. **Instance-Level Runtime Isolation (Default)**: HAI3's default handler (`MfeHandlerMF`) enforces isolation - each MFE instance maintains its own isolated runtime (state, TypeSystemPlugin, schema registry). Custom handlers can implement different isolation strategies based on their requirements.
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
// - mfeActions.registerExtension({ extension })
// - mfeActions.registerDomain({ domain })
// - runtime.registerExtension(extension)
// - runtime.registerDomain(domain)
```

### Core Architecture

HAI3's default handler (`MfeHandlerMF`) enforces instance-level isolation as the default strategy. Custom handlers can implement different isolation strategies (including shared state) for internal MFEs when needed.

**With the default handler, each MFE instance has its own FULLY ISOLATED runtime:**
- Own `@hai3/screensets` instance (NOT singleton)
- Own `TypeSystemPlugin` instance (NOT singleton) with isolated schema registry
- Own `@hai3/state` container
- Can use ANY UI framework (parent uses React, MFEs can use Vue 3, Angular, Svelte, etc.)

**Instance-level isolation (default behavior)**: If the same MFE entry is mounted twice (in two different extensions), HAI3's default handler creates isolated runtimes. Instance A of "ChartWidget" cannot access Instance B of "ChartWidget".

**Custom handler flexibility**: Custom handlers (e.g., `MfeHandlerAcme`) can implement different isolation strategies:
- **Strict isolation** (like default) - recommended for 3rd-party/vendor MFEs (security)
- **Shared state** between instances - for internal MFEs that need coordination
- **Hybrid approaches** - isolate some resources, share others

Communication happens ONLY through the explicit contract (MfeBridge interface):
- **Shared properties** (parent to child, read-only)
- **Actions chain** delivered by ActionsChainsMediator to targets

Internal runtime coordination (between parent and MFE instance runtimes) uses PRIVATE mechanisms not exposed to MFE code.

**Hierarchical domains**: Domains can exist at ANY level. An MFE can be an extension to its parent's domain, define its OWN domains for nested MFEs, or both simultaneously.

### Architectural Decision: Type System Plugin Abstraction

The @hai3/screensets package abstracts the Type System as a **pluggable dependency**:

1. **Opaque Type IDs**: The screensets package treats type IDs as opaque strings
2. **Required Plugin**: A `TypeSystemPlugin` must be provided at initialization
3. **Default Implementation**: GTS (`@globaltypesystem/gts-ts`) ships as the default plugin
4. **Extensibility**: Other Type System implementations can be plugged in

**Key Principle**: When metadata about a type ID is needed, call plugin methods (`parseTypeId`, `getAttribute`, etc.) directly.

**Plugin Interface:**
```typescript
interface TypeSystemPlugin {
  // Type ID operations
  isValidTypeId(id: string): boolean;
  buildTypeId(options: Record<string, unknown>): string;
  parseTypeId(id: string): Record<string, unknown>;

  // Schema registry (for vendor/dynamic schemas only)
  // First-class citizen schemas are built into the plugin
  registerSchema(schema: JSONSchema): void;  // Type ID extracted from schema.$id
  validateInstance(typeId: string, instance: unknown): ValidationResult;
  validateAgainstSchema(schema: JSONSchema, instance: unknown): ValidationResult;  // Direct schema validation
  getSchema(typeId: string): JSONSchema | undefined;

  // Query
  query(pattern: string, limit?: number): string[];

  // Type Hierarchy (REQUIRED for MfeHandler.canHandle())
  isTypeOf(typeId: string, baseTypeId: string): boolean;

  // Compatibility (REQUIRED)
  checkCompatibility(oldTypeId: string, newTypeId: string): CompatibilityResult;

  // Attribute access (REQUIRED for dynamic schema resolution)
  getAttribute(typeId: string, path: string): AttributeResult;
}
```

**Built-in First-Class Citizen Schemas:**

The GTS plugin ships with all HAI3 first-class citizen schemas built-in. No `registerSchema` calls are needed for core types. Rationale:
- First-class types define system capabilities (well-known at compile time)
- Changes to them require code changes in the screensets package anyway
- Vendors can only extend within these boundaries
- Plugin is ready to use immediately after creation

### HAI3 Internal TypeScript Types

The MFE system uses these internal TypeScript interfaces. Each type has an `id: string` field as its identifier:

**Core Types (8 types):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeEntry` | `id, requiredProperties[], optionalProperties?[], actions[], domainActions[]` | Pure contract type (Abstract Base) |
| `ExtensionDomain` | `id, sharedProperties[], actions[], extensionsActions[], extensionsUiMeta, defaultActionTimeout, lifecycleStages[], extensionsLifecycleStages[], lifecycle?[]` | Extension point contract |
| `Extension` | `id, domain, entry, uiMeta, lifecycle?[]` | Extension binding |
| `SharedProperty` | `id, value` | Shared property instance |
| `Action` | `type, target, payload?, timeout?` | Action with self-identifying type ID and optional timeout override |
| `ActionsChain` | `action: Action, next?: ActionsChain, fallback?: ActionsChain` | Action chain for mediation (contains instances, no id) |
| `LifecycleStage` | `id, description?` | Lifecycle event type that triggers actions chains |
| `LifecycleHook` | `stage, actions_chain` | Binds a lifecycle stage to an actions chain |

**MF-Specific Types (2 types):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfManifest` | `id, remoteEntry, remoteName, sharedDependencies?[], entries?` | Module Federation manifest (standalone) |
| `MfeEntryMF` | `(extends MfeEntry) manifest, exposedModule` | Module Federation entry (derived) |

**Framework-Agnostic Lifecycle Interface (1 type):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeEntryLifecycle` | `mount(container, bridge), unmount(container)` | Lifecycle interface for MFE entries |

**Handler Abstraction (3 types):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeBridgeFactory<TBridge>` | `create(domainId, entryTypeId, instanceId)` | Abstract factory for creating bridge instances |
| `MfeHandler<TEntry, TBridge>` | `bridgeFactory, canHandle(entryTypeId), load(entry), preload?(entry), priority?` | Abstract handler class for different entry types |
| `LoadedMfe` | `lifecycle, entry, unload()` | Result of loading an MFE bundle |

**Note on MfeEntry Design:** MfeEntry is a **pure contract** type (abstract base) that defines ONLY the communication contract (properties, actions). Derived types like `MfeEntryMF` add handler-specific fields. This separation ensures the same entry contract works with any handler and allows future handlers (ESM, Import Maps) to add their own derived types.

**Note on MfeEntryLifecycle Design:** MfeEntryLifecycle is the **lifecycle interface** that all MFE entries must implement. The name focuses on lifecycle semantics (mount/unmount) rather than implementation details like "Export" or "Module". This interface:
- Defines framework-agnostic lifecycle methods any MFE entry must implement
- Is extensible for future lifecycle methods (onSuspend, onResume, etc.)
- Allows MFEs to be written in any UI framework (React, Vue, Angular, Svelte, Vanilla JS)
- Maintains a consistent loading contract with the host

**Note on MfeHandler Extensibility:** The `MfeHandler` abstract class, `MfeBridgeFactory`, and handler registry enable companies to:
- Create custom derived entry types (e.g., `MfeEntryAcme`) with richer contracts (translations, preload assets, feature flags)
- Register custom handlers to handle their entry types
- Create custom bridge factories that inject shared services (router, API client) into bridges for internal MFEs
- Keep "static knowledge about MFEs" in their handlers, not HAI3 core

This solves the tension between 3rd-party vendors (who need thin, stable contracts and thin bridges) and enterprises (who want richer integration for internal MFEs with rich bridges). See `design/mfe-loading.md` for the MfeHandler abstract class and `design/principles.md` for the extensibility principle.

### GTS Type ID Format

The GTS type ID format is: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

### Type System Registration (Built-in to GTS Plugin)

The GTS plugin ships with all first-class citizen schemas **built-in**. When using the GTS plugin, the following types are available immediately (no registration needed):

**Core Types (8 types):**

| GTS Type ID | Purpose |
|-------------|---------|
| `gts.hai3.screensets.mfe.entry.v1~` | Pure contract type (Abstract Base) |
| `gts.hai3.screensets.ext.domain.v1~` | Extension point contract |
| `gts.hai3.screensets.ext.extension.v1~` | Extension binding |
| `gts.hai3.screensets.ext.shared_property.v1~` | Property definition |
| `gts.hai3.screensets.ext.action.v1~` | Action type with target and self-id |
| `gts.hai3.screensets.ext.actions_chain.v1~` | Action chain for mediation |
| `gts.hai3.screensets.ext.lifecycle_stage.v1~` | Lifecycle event type |
| `gts.hai3.screensets.ext.lifecycle_hook.v1~` | Lifecycle stage to actions chain binding |

**Default Lifecycle Stages (4 stages):**

| GTS Type ID | When Triggered |
|-------------|----------------|
| `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~` | After registration |
| `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~` | After mount |
| `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~` | After unmount |
| `gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~` | Before unregistration |

**MF-Specific Types (2 types):**

| GTS Type ID | Purpose |
|-------------|---------|
| `gts.hai3.screensets.mfe.mf.v1~` | Module Federation manifest (standalone) |
| `gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~` | Module Federation entry (derived) |

### GTS JSON Schema Definitions

Each of the 8 core types and 2 MF-specific types has a corresponding JSON Schema with proper `$id`. Example Action schema (note: Action uses `type` field for self-identification instead of `id`):

```json
{
  "$id": "gts://gts.hai3.screensets.ext.action.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "type": {
      "x-gts-ref": "/$id",
      "$comment": "Self-reference to this action's type ID"
    },
    "target": {
      "type": "string",
      "oneOf": [
        { "x-gts-ref": "gts.hai3.screensets.ext.domain.v1~*" },
        { "x-gts-ref": "gts.hai3.screensets.ext.extension.v1~*" }
      ],
      "$comment": "Type ID of the target ExtensionDomain or Extension"
    },
    "payload": {
      "type": "object",
      "$comment": "Optional action payload"
    }
  },
  "required": ["type", "target"]
}
```

See `design/schemas.md` for complete JSON Schema definitions of all types.

**Note on `registerSchema`:** The `registerSchema(schema)` method is for vendor/dynamic schemas only. The type ID is extracted from the schema's `$id` field - no need to pass it separately. First-class citizen schemas are built into the plugin and do not require registration.

### MfeEntry Type Hierarchy

```
gts.hai3.screensets.mfe.entry.v1~ (Base - Abstract Contract)
  |-- id: string (GTS type ID)
  |-- requiredProperties: string[]
  |-- optionalProperties?: string[]
  |-- actions: string[]
  |-- domainActions: string[]
  |
  +-- gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~ (Module Federation)
        |-- (inherits contract fields from base)
        |-- manifest: string (MfManifest type ID)
        |-- exposedModule: string

gts.hai3.screensets.mfe.mf.v1~ (Standalone - Module Federation Config)
  |-- id: string (GTS type ID)
  |-- remoteEntry: string (URL)
  |-- remoteName: string
  |-- sharedDependencies?: SharedDependencyConfig[] (code sharing + optional instance sharing)
  |     |-- name: string (package name)
  |     |-- requiredVersion: string (semver)
  |     |-- singleton?: boolean (default: false = isolated instances)
  |-- entries?: string[] (MfeEntryMF type IDs)
```

### Contract Matching Rules

For mounting to be valid:
```
entry.requiredProperties  is subset of  domain.sharedProperties
entry.actions             is subset of  domain.extensionsActions
domain.actions            is subset of  entry.domainActions
```

### Dynamic uiMeta Validation

An `Extension`'s `uiMeta` must conform to its domain's `extensionsUiMeta` schema. Since the domain reference is dynamic, this validation uses the plugin's attribute accessor at runtime:
- The ScreensetsRegistry calls `plugin.getAttribute(extension.domain, 'extensionsUiMeta')` to resolve the schema
- Then validates `extension.uiMeta` against the resolved schema
- See Decision 8 in `design/type-system.md` for implementation details

### Explicit Timeout Configuration

Action timeouts are configured **explicitly in type definitions**, not as implicit code defaults. This ensures the platform is fully runtime-configurable and declarative.

**Timeout Resolution:**
```
Effective timeout = action.timeout ?? domain.defaultActionTimeout
On timeout: execute fallback chain if defined (same as any other failure)
```

- `ExtensionDomain.defaultActionTimeout` (REQUIRED): Default timeout in milliseconds for all actions targeting this domain
- `Action.timeout` (optional): Override timeout for a specific action

**Timeout as Failure**: Timeout is treated as just another failure case. The `ActionsChain.fallback` field handles all failures uniformly, including timeouts. There is no separate `fallbackOnTimeout` flag - the existing fallback mechanism provides complete failure handling.

**Chain-level configuration** only includes `chainTimeout` (total chain execution limit), not individual action timeouts.

### Actions Chain Runtime

1. ActionsChainsMediator delivers actions chain to target (domain or entry)
2. Target executes the action (only target understands payload based on action type)
3. Action timeout is determined by: `action.timeout ?? domain.defaultActionTimeout`
4. On success: mediator delivers `next` chain to its target
5. On failure (including timeout): mediator delivers `fallback` chain if defined
6. Recursive until chain ends (no next/fallback)

### Hierarchical Extension Domains

Domains can exist at **any level** of the hierarchy, enabling nested composition:

- **Host-level domains**: HAI3 provides base layout domains (`sidebar`, `popup`, `screen`, `overlay`)
- **MFE-level domains**: Any MFE can define its own domains for nested extensions
- **Recursive nesting**: An MFE can be both an extension (to its parent) AND a domain provider (for its children)

```
Host Application
  └── Sidebar Domain (host's)
        └── Dashboard MFE (extension to host, also defines domains)
              └── Widget Slot Domain (MFE's own domain)
                    └── Chart Widget MFE (nested extension)
                    └── Table Widget MFE (nested extension)
```

Example: A dashboard screenset defines a "widget slot" domain for third-party widgets, while itself being an extension to the host's sidebar domain.

### DRY Principle for Extension Actions

**Key Principle**: Extension lifecycle uses generic actions (`load_ext`, `unload_ext`) instead of domain-specific actions. This follows the DRY principle - each domain handles the same action according to its specific layout behavior.

**Why NOT domain-specific actions:**
- `show_popup`, `hide_popup`, `show_sidebar`, `hide_sidebar` are semantically the same - they load/unload extensions
- Creating separate action types for each domain violates DRY
- When adding new domains, you would need to create new action types
- Each extension would need to know domain-specific action types

**Generic Extension Actions:**
```typescript
// Only two action constants needed for ALL domains
HAI3_ACTION_LOAD_EXT: 'gts.hai3.screensets.ext.action.v1~hai3.screensets.actions.load_ext.v1~'
HAI3_ACTION_UNLOAD_EXT: 'gts.hai3.screensets.ext.action.v1~hai3.screensets.actions.unload_ext.v1~'

// Action payload specifies target domain and extension
interface LoadExtPayload {
  domainTypeId: string;     // e.g., HAI3_POPUP_DOMAIN, HAI3_SIDEBAR_DOMAIN
  extensionTypeId: string;  // the extension to load
  // ... additional domain-specific params
}
```

**Benefits:**
1. **Single action type** works for popup, sidebar, screen, overlay, and custom domains
2. **Domain handles layout semantics** - popup shows modal, sidebar shows panel, screen navigates
3. **Extensible** - new domains automatically support load_ext/unload_ext
4. **Simpler API** - MFE code only needs to know two action constants

### Domain-Specific Action Support

**Key Principle**: Not all domains can support all actions. Each domain declares which HAI3 actions it supports via its `actions` field.

**Action Support by Domain:**
- **Popup, Sidebar, Overlay**: Support BOTH `load_ext` and `unload_ext` (can be shown/hidden)
- **Screen**: Only supports `load_ext` (you can navigate TO a screen, but cannot have "no screen selected")

**Domain declares supported actions:**
```typescript
// Popup domain - supports both load and unload
{
  id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.popup.v1~',
  actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_UNLOAD_EXT],
  // ...
}

// Screen domain - only supports load (navigate to)
{
  id: 'gts.hai3.screensets.ext.domain.v1~hai3.screensets.layout.screen.v1~',
  actions: [HAI3_ACTION_LOAD_EXT],  // No unload - can't have "no screen"
  // ...
}
```

**Key Principles:**
1. **`load_ext` is universal**: All domains MUST support `HAI3_ACTION_LOAD_EXT`
2. **`unload_ext` is optional**: Some domains (like screen) cannot semantically support unloading
3. **ActionsChainsMediator validates**: Before delivering an action, the mediator checks if the target domain supports it
4. **Clear error on unsupported action**: `UnsupportedDomainActionError` is thrown when attempting an unsupported action

### Dynamic Registration Model

**Key Principle**: Extensions and MFEs are NOT known at app initialization time. They can be registered dynamically at any point during the application lifecycle.

**ScreensetsRegistry** is the central registry for MFE screensets. Each MFE instance has its own ScreensetsRegistry (for instance-level isolation). It:
- Registers extension domains (extension points where MFE instances can mount - can be at host level OR within an MFE)
- Registers extensions (bindings between MFE entries and domains, each creating an isolated instance)
- Registers MFE entries and manifests
- Manages the Type System plugin for type validation and schema registry
- Coordinates MFE loading and lifecycle

**ScreensetsRegistry API:**
```typescript
interface ScreensetsRegistry {
  // === Dynamic Registration (anytime during runtime) ===

  /** Register extension dynamically - can be called at any time */
  registerExtension(extension: Extension): Promise<void>;

  /** Unregister extension dynamically */
  unregisterExtension(extensionId: string): Promise<void>;

  /** Register domain dynamically - can be called at any time */
  registerDomain(domain: ExtensionDomain): Promise<void>;

  /** Unregister domain dynamically */
  unregisterDomain(domainId: string): Promise<void>;

  // === Handler Registry (for custom entry types) ===

  /** Register an MFE handler for custom entry types */
  registerHandler(handler: MfeHandler): void;

  /** Unregister an MFE handler by handled base type ID */
  unregisterHandler(handledBaseTypeId: string): void;

  // === MFE Loading (on-demand) ===

  /** Mount extension on demand - uses handler registry to find appropriate handler */
  mountExtension(extensionId: string, container: Element): Promise<MfeBridgeConnection>;

  /** Unmount extension */
  unmountExtension(extensionId: string): Promise<void>;

  // === Type Instance Provider (future backend integration) ===

  /** Set the provider for fetching GTS type instances from backend */
  setTypeInstanceProvider(provider: TypeInstanceProvider): void;

  /** Refresh extensions from backend - triggers provider.fetchExtensions() */
  refreshExtensionsFromBackend(): Promise<void>;
}
```

**Use Cases for Dynamic Registration:**
1. **Feature Flags**: Register extensions based on user feature flags fetched after login
2. **Backend Configuration**: GTS types and instances fetched from backend API
3. **User Actions**: User enables/disables features at runtime (e.g., toggle a widget)
4. **Lazy Loading**: Mount extensions on-demand when user navigates to specific screens
5. **Hot-Swap**: Replace extension implementation at runtime (e.g., A/B testing)
6. **Permission Changes**: Register/unregister extensions when user permissions change

**TypeInstanceProvider Interface (Future Backend Integration):**
```typescript
/**
 * Provider for fetching GTS type instances from backend.
 * Current implementation: in-memory registry
 * Future: backend API calls
 */
interface TypeInstanceProvider {
  /** Fetch all available extensions from backend */
  fetchExtensions(): Promise<Extension[]>;

  /** Fetch all available domains from backend */
  fetchDomains(): Promise<ExtensionDomain[]>;

  /** Fetch specific type instance by ID */
  fetchInstance<T>(typeId: string): Promise<T | undefined>;

  /** Subscribe to instance updates (real-time sync) */
  subscribeToUpdates(callback: (update: InstanceUpdate) => void): () => void;
}

interface InstanceUpdate {
  type: 'added' | 'updated' | 'removed';
  typeId: string;
  instance?: unknown;
}
```

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
- `packages/screensets/src/mfe/handler/mf-handler.ts` - MfeHandlerMF (Module Federation default handler)
- `packages/screensets/src/mfe/handler/bridge-factory-default.ts` - MfeBridgeFactoryDefault (thin bridge factory)

**Modified packages:**
- `packages/screensets/src/state/` - Isolated state instances (uses @hai3/state)
- `packages/screensets/src/screensets/` - Extension domain registration
- `packages/framework/src/plugins/microfrontends/` - Enables MFE capabilities (no static configuration)

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
8. Add TypeInstanceProvider interface for future backend integration
9. Update documentation and examples
