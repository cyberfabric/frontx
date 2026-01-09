# Change: Add Microfrontend Support

## Why

HAI3 applications need to compose functionality from multiple independently deployed microfrontends (MFEs). Vendors can create MFE extensions that integrate into host applications through well-defined extension points. This enables:

1. **Independent Deployment**: MFEs can be deployed separately from the host application
2. **Vendor Extensibility**: Third parties can create extensions without modifying host code, using ANY UI framework (Vue 3, Angular, Svelte, etc.)
3. **Complete Runtime Isolation**: Each MFE maintains its own isolated runtime (state, TypeSystemPlugin, schema registry) with controlled communication ONLY through the contract
4. **Type-Safe Contracts**: Each runtime has its own TypeSystemPlugin instance - MFEs cannot discover host or other MFE schemas
5. **Framework Agnostic**: Host uses React, but MFEs can use any framework - no React/ReactDOM dependency for MFEs

## What Changes

### Core Architecture

Each MFE and host has its **own FULLY ISOLATED runtime**:
- Own `@hai3/screensets` instance (NOT singleton)
- Own `TypeSystemPlugin` instance (NOT singleton) with isolated schema registry
- Own `@hai3/state` container
- Can use ANY UI framework (host uses React, MFEs can use Vue 3, Angular, Svelte, etc.)

Communication happens ONLY through the explicit contract (MfeBridge interface):
- **Shared properties** (parent to child, read-only)
- **Actions chain** delivered by ActionsChainsMediator to targets

Internal runtime coordination (between host and MFE runtimes) uses PRIVATE mechanisms not exposed to MFE code.

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

  // Schema registry
  registerSchema(typeId: string, schema: JSONSchema): void;
  validateInstance(typeId: string, instance: unknown): ValidationResult;
  getSchema(typeId: string): JSONSchema | undefined;

  // Query
  query(pattern: string, limit?: number): string[];

  // Compatibility (REQUIRED)
  checkCompatibility(oldTypeId: string, newTypeId: string): CompatibilityResult;

  // Attribute access (REQUIRED for dynamic schema resolution)
  getAttribute(typeId: string, path: string): AttributeResult;
}
```

### HAI3 Internal TypeScript Types

The MFE system uses these internal TypeScript interfaces. Each type has an `id: string` field as its identifier:

**Core Types (6 types):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfeEntry` | `id, requiredProperties[], optionalProperties?[], actions[], domainActions[]` | Pure contract type (Abstract Base) |
| `ExtensionDomain` | `id, sharedProperties[], actions[], extensionsActions[], extensionsUiMeta, defaultActionTimeout` | Extension point contract |
| `Extension` | `id, domain, entry, uiMeta` | Extension binding |
| `SharedProperty` | `id, value` | Shared property instance |
| `Action` | `type, target, payload?, timeout?` | Action with self-identifying type ID and optional timeout override |
| `ActionsChain` | `action: Action, next?: ActionsChain, fallback?: ActionsChain` | Action chain for mediation (contains instances, no id) |

**MF-Specific Types (2 types):**

| TypeScript Interface | Fields | Purpose |
|---------------------|--------|---------|
| `MfManifest` | `id, remoteEntry, remoteName, sharedDependencies?[], entries?` | Module Federation manifest (standalone) |
| `MfeEntryMF` | `(extends MfeEntry) manifest, exposedModule` | Module Federation entry (derived) |

**Note on MfeEntry Design:** MfeEntry is a **pure contract** type (abstract base) that defines ONLY the communication interface (properties, actions). Derived types like `MfeEntryMF` add loader-specific fields. This separation ensures the same entry contract works with any loader and allows future loaders (ESM, Import Maps) to add their own derived types.

### GTS Type ID Format

The GTS type ID format is: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

### Type System Registration (via Plugin)

When using the GTS plugin, the following types are registered with properly structured GTS type IDs:

**Core Types (6 types):**

| GTS Type ID | Purpose |
|-------------|---------|
| `gts.hai3.screensets.mfe.entry.v1~` | Pure contract type (Abstract Base) |
| `gts.hai3.screensets.ext.domain.v1~` | Extension point contract |
| `gts.hai3.screensets.ext.extension.v1~` | Extension binding |
| `gts.hai3.screensets.ext.shared_property.v1~` | Property definition |
| `gts.hai3.screensets.ext.action.v1~` | Action type with target and self-id |
| `gts.hai3.screensets.ext.actions_chain.v1~` | Action chain for mediation |

**MF-Specific Types (2 types):**

| GTS Type ID | Purpose |
|-------------|---------|
| `gts.hai3.screensets.mfe.mf.v1~` | Module Federation manifest (standalone) |
| `gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~` | Module Federation entry (derived) |

### GTS JSON Schema Definitions

Each of the 6 core types and 2 MF-specific types has a corresponding JSON Schema with proper `$id`. Example Action schema (note: Action uses `type` field for self-identification instead of `id`):

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

See `design.md` for complete JSON Schema definitions of all 8 types.

### MfeEntry Type Hierarchy

```
gts.hai3.screensets.mfe.entry.v1~ (Base - Abstract Contract)
  |-- id: string (GTS type ID)
  |-- requiredProperties: string[]
  |-- optionalProperties?: string[]
  |-- actions: string[]
  |-- domainActions: string[]
  |
  +-- gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~ (Module Federation)
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
- The ScreensetsRuntime calls `plugin.getAttribute(extension.domain, 'extensionsUiMeta')` to resolve the schema
- Then validates `extension.uiMeta` against the resolved schema
- See Decision 8 in `design.md` for implementation details

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

- HAI3 provides base layout domains: `sidebar`, `popup`, `screen`, `overlay`
- Vendor screensets can define their own extension domains
- Example: A dashboard screenset defines a "widget slot" domain for third-party widgets

## Impact

### Affected specs
- `screensets` - Core MFE integration, Type System plugin interface, and type definitions

### Affected code

**New packages:**
- `packages/screensets/src/mfe/` - MFE runtime, loader, ActionsChainsMediator
- `packages/screensets/src/mfe/types/` - Internal TypeScript type definitions
- `packages/screensets/src/mfe/validation/` - Contract matching validation
- `packages/screensets/src/mfe/mediator/` - ActionsChainsMediator for action chain delivery
- `packages/screensets/src/mfe/plugins/` - Type System plugin interface and implementations
- `packages/screensets/src/mfe/plugins/gts/` - GTS plugin implementation (default)
- `packages/screensets/src/mfe/loader/` - MFE loader (Module Federation)

**Modified packages:**
- `packages/screensets/src/state/` - Isolated state instances (uses @hai3/state)
- `packages/screensets/src/screensets/` - Extension domain registration
- `packages/framework/src/plugins/microfrontends/` - Accept Type System plugin from screensets

### Breaking changes
- **BREAKING**: MFEs require Type System-compliant type definitions for integration
- **BREAKING**: Extension points must define explicit contracts
- **BREAKING**: `ScreensetsRuntimeConfig` now requires `typeSystem` parameter

### Migration strategy
1. Define `TypeSystemPlugin` interface in @hai3/screensets
2. Create GTS plugin implementation as default
3. Implement ScreensetsRuntime to require plugin at initialization
4. Define internal TypeScript types for MFE architecture (6 core + 2 MF-specific)
5. Register HAI3 types via plugin at initialization
6. Propagate plugin through @hai3/framework layers
7. Update documentation and examples
