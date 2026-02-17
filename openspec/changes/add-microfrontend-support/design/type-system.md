# Design: Type System and Contract Validation

This document covers the Type System Plugin architecture and contract validation for MFE contracts.

**Related Documents:**
- [Schemas](./schemas.md) - JSON Schema definitions for all MFE types
- [Registry and Runtime](./registry-runtime.md) - Runtime isolation, action mediation, bridges
- [MFE Loading](./mfe-loading.md) - MfeHandler abstraction, handler registry, Module Federation loading

---

## Context

The type system for MFE contracts is abstracted through a **Type System Plugin** interface, allowing different type system implementations while shipping GTS as the default. The @hai3/screensets package treats **type IDs as opaque strings** - all type ID understanding is delegated to the TypeSystemPlugin.

See [MFE System Overview](./overview.md) for architecture details.

## Goals / Non-Goals

### Goals

1. **Instance-Level State Isolation (Default)**: See [Runtime Isolation](./overview.md#runtime-isolation-default-behavior) for the canonical description of the isolation model.
2. **Symmetric Contracts**: Clear bidirectional communication contracts
3. **Contract Validation**: Compile-time and runtime validation of compatibility
4. **Mediated Actions**: Centralized action chain delivery through ActionsChainsMediator
5. **Hierarchical Domains**: Support nested extension points at any level (host or MFE)
6. **Pluggable Type System**: Abstract Type System as a plugin with GTS as default
7. **Opaque Type IDs**: Screensets package treats type IDs as opaque strings

### Non-Goals

1. **Direct State Sharing (default)**: See [Runtime Isolation](./overview.md#runtime-isolation-default-behavior) for isolation model
2. **Event Bus Bridging**: No automatic event propagation across boundaries
3. **Hot Module Replacement**: MFE updates require reload (but hot-swap of extensions IS supported)
4. **Version Negotiation**: Single version per MFE entry
5. **Multiple Concurrent Plugins**: Only one Type System plugin per runtime instance
6. **Static Extension Registry**: Extensions are NOT known at initialization time (dynamic registration is the model)
7. **Entity Fetching**: Outside MFE system scope. See [System Boundary](./overview.md#system-boundary).

---

## Decisions

### Decision 1: Type System Plugin Interface

The @hai3/screensets package defines a `TypeSystemPlugin` interface that abstracts type system operations. This allows different type system implementations while shipping GTS as the default.

The screensets package treats type IDs as **opaque strings**. The plugin is responsible for all type ID parsing, validation, and building.

#### Built-in First-Class Citizen Schemas

**Key Principle**: First-class citizen types define system capabilities. They are well-known at compile time. Changes to them require code changes in the screensets package anyway. Therefore:

- The GTS plugin ships with all HAI3 first-class citizen schemas **built-in**
- No `registerSchema` calls needed for core types
- Plugin is ready to use immediately after creation

**First-class citizen types (built into plugin):**
- MfeEntry (abstract base)
- ExtensionDomain
- Extension
- SharedProperty
- Action
- ActionsChain
- LifecycleStage
- LifecycleHook
- MfManifest
- MfeEntryMF

**`registerSchema` is for vendor/dynamic schemas only** - schemas that extend HAI3's base types with vendor-specific fields.

#### Plugin Interface Definition

```typescript
/**
 * Result of schema validation
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

/**
 * Type System Plugin interface
 * Abstracts type system operations for MFE contracts.
 *
 * The screensets package treats type IDs as OPAQUE STRINGS.
 * All type ID understanding is delegated to the plugin.
 *
 * **GTS-Native Validation Model:**
 * - All runtime entities (schemas AND instances) must be registered with the plugin
 * - Validation happens on registered instances by their instance ID
 * - Schema/type IDs end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~`)
 * - Instance IDs do NOT end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.dashboard.widgets.chart.v1`)
 * - gts-ts extracts the schema ID from the chained instance ID automatically
 *
 * Note: buildTypeId() is intentionally omitted. GTS type IDs are consumed
 * but never programmatically generated at runtime.
 * All type IDs are defined as string constants.
 */
interface TypeSystemPlugin {
  /** Plugin identifier */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  // === Schema Registry ===

  /**
   * Register a JSON Schema for validation.
   * The type ID is extracted from the schema's $id field.
   *
   * Note: First-class citizen schemas (MfeEntry, ExtensionDomain, Extension,
   * SharedProperty, Action, ActionsChain, LifecycleStage, LifecycleHook,
   * MfManifest, MfeEntryMF) are built into the plugin and do not need
   * to be registered. This method is for vendor/dynamic schemas only.
   */
  registerSchema(schema: JSONSchema): void;

  /**
   * Get the schema registered for a type ID (ends with ~)
   */
  getSchema(typeId: string): JSONSchema | undefined;

  // === Instance Registry (GTS-Native Approach) ===

  /**
   * Register any GTS entity (schema or instance) with the type system.
   * For instances, the entity must have an `id` field containing the instance ID.
   *
   * gts-ts uses the instance ID to automatically determine the schema:
   * - Instance ID: `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.dashboard.widgets.chart.v1`
   * - Schema ID:   `gts.hai3.mfes.ext.extension.v1~` (extracted automatically)
   *
   * @param entity - The GTS entity to register (must have an `id` field)
   */
  register(entity: unknown): void;

  /**
   * Validate a registered instance by its instance ID.
   * The instance must be registered first via register().
   *
   * gts-ts extracts the schema ID from the instance ID automatically:
   * - Instance ID: `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~acme.dashboard.widgets.chart.v1`
   * - Schema ID:   `gts.hai3.mfes.ext.extension.v1~`
   *
   * @param instanceId - The instance ID (does NOT end with ~)
   * @returns Validation result
   */
  validateInstance(instanceId: string): ValidationResult;

  // === Type Hierarchy ===

  /**
   * Check if a type ID is of (or derived from) a base type.
   * Used by MfeHandler.canHandle() for type hierarchy matching.
   *
   * @param typeId - The type ID to check
   * @param baseTypeId - The base type ID to check against
   * @returns true if typeId is the same as or derived from baseTypeId
   */
  isTypeOf(typeId: string, baseTypeId: string): boolean;
}
```

#### GTS Plugin Implementation

The GTS plugin implements `TypeSystemPlugin` using `@globaltypesystem/gts-ts`. First-class citizen schemas are registered during plugin construction - the plugin is ready to use immediately.

**Key Points about GTS-Native Validation:**
- gts-ts uses Ajv INTERNALLY - we do NOT need Ajv as a direct dependency
- All entities (schemas and instances) are registered with `gtsStore.register()`
- Validation happens by instance ID, not by passing arbitrary data
- Schema IDs end with `~`, instance IDs do NOT end with `~`
- gts-ts extracts the schema ID from the chained instance ID automatically

**Schema Authoring Constraint -- `x-gts-ref` inside `oneOf`/`anyOf`:**
Since gts-ts delegates to Ajv for JSON Schema validation, and Ajv does not recognize `x-gts-ref` (a GTS extension keyword), subschemas containing ONLY `x-gts-ref` are treated as empty schemas `{}` by Ajv. An empty schema validates anything. If two such subschemas are placed inside `oneOf`, both always match, and `oneOf` (which requires exactly one match) always fails. **Rule: Never use `x-gts-ref` as the sole content of a subschema inside `oneOf` or `anyOf`.** Use `x-gts-ref` at the top level of a property or inside `items`. When a property can reference multiple entity types, use a plain `"type": "string"` constraint and defer type-specific validation to runtime logic. See [schemas.md - Action Schema](./schemas.md#action-schema) for an example of this pattern.

```typescript
// packages/screensets/src/mfe/plugins/gts/index.ts
import {
  GtsStore,
  createJsonEntity,
  type ValidationResult as GtsValidationResult,
} from '@globaltypesystem/gts-ts';
import type { TypeSystemPlugin, ValidationResult } from '../types';
import { loadSchemas } from '../../gts/loader';

/**
 * Extract type ID from a JSON Schema's $id field.
 * Handles both "gts://gts.hai3..." and "gts.hai3..." formats.
 */
function extractTypeIdFromSchema(schema: JSONSchema): string {
  if (!schema.$id) {
    throw new Error('Schema must have an $id field');
  }
  // Remove "gts://" prefix if present
  return schema.$id.replace(/^gts:\/\//, '');
}

/**
 * GtsPlugin -- concrete implementation of TypeSystemPlugin using @globaltypesystem/gts-ts.
 *
 * - Implements all TypeSystemPlugin methods by delegating to a private GtsStore instance.
 * - Registers all first-class citizen schemas during construction (plugin is ready immediately).
 * - Exported @internal for test files that need fresh instances for isolation.
 *   Production code uses the gtsPlugin singleton.
 *
 * See packages/screensets/src/mfe/plugins/gts/index.ts for the authoritative implementation.
 */
class GtsPlugin implements TypeSystemPlugin { /* ... */ }

/**
 * Singleton GTS plugin instance -- the primary public export.
 * There is no factory function and no create() method.
 * GtsPlugin is a singleton: one GTS type system per application.
 */
export const gtsPlugin: TypeSystemPlugin = new GtsPlugin();
```

#### Instance ID Convention

Schema IDs end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~`); instance IDs do NOT (e.g., `gts.hai3.mfes.ext.extension.v1~hai3.screensets.layout.screen.v1~hai3.demo.screens.helloworld.v1`). gts-ts extracts the schema ID from the instance ID automatically.

> **Canonical definition**: This is the authoritative definition of the instance ID convention. Other documents may reference this convention inline for readability.

For the naming rules governing the instance segment (package name, namespace, and name), see [schemas.md -- Instance ID Naming Convention](./schemas.md#instance-id-naming-convention).

### Decision 2: GTS Type ID Format and Registration

The GTS type ID format follows the structure: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### HAI3 GTS Type IDs

The type system is organized into **8 core types** that define the contract model (including LifecycleStage and LifecycleHook), plus **2 MF-specific types** for Module Federation loading, plus **1 built-in derived type** (screen extension). See [schemas.md](./schemas.md) for complete schema definitions.

**Core Types (8 total):**

| Type | GTS Type ID | Purpose |
|------|-------------|---------|
| MFE Entry (Abstract) | `gts.hai3.mfes.mfe.entry.v1~` | Pure contract type (abstract base) |
| Extension Domain | `gts.hai3.mfes.ext.domain.v1~` | Extension point contract |
| Extension | `gts.hai3.mfes.ext.extension.v1~` | Extension binding |
| Shared Property | `gts.hai3.mfes.comm.shared_property.v1~` | Property definition |
| Action | `gts.hai3.mfes.comm.action.v1~` | Action type with target and self-id |
| Actions Chain | `gts.hai3.mfes.comm.actions_chain.v1~` | Action chain for mediation |
| LifecycleStage | `gts.hai3.mfes.lifecycle.stage.v1~` | Lifecycle event type |
| LifecycleHook | `gts.hai3.mfes.lifecycle.hook.v1~` | Binds stage to actions chain |

**MF-Specific Types (2 total):**

| Type | GTS Type ID | Purpose |
|------|-------------|---------|
| MF Manifest | `gts.hai3.mfes.mfe.mf_manifest.v1~` | Module Federation manifest (standalone) |
| MFE Entry MF (Derived) | `gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~` | Module Federation entry with manifest reference |

#### Why This Structure

MfeEntry is the single abstract base for entry contracts. MfeEntryMF is a derived type referencing its MfManifest. Future loaders (ESM, Import Maps) add their own derived types.

### Decision 3: Internal TypeScript Type Definitions

The MFE system uses internal TypeScript interfaces with a simple `id: string` field as the identifier.

TypeScript interface definitions are distributed across their respective design documents:

- **MfeEntry / MfeEntryMF**: See [MFE Entry](./mfe-entry-mf.md#typescript-interface-definitions)
- **MfManifest / SharedDependencyConfig**: See [MFE Manifest](./mfe-manifest.md#typescript-interface-definitions)
- **ExtensionDomain / Extension / ExtensionPresentation**: See [MFE Domain](./mfe-domain.md#typescript-interface-definitions) for TypeScript interface definitions; see [schemas.md - Extension Domain Schema](./schemas.md#extension-domain-schema) and [schemas.md - Extension Schema](./schemas.md#extension-schema) for JSON Schema definitions
- **SharedProperty**: See [schemas.md - Shared Property Schema](./schemas.md#shared-property-schema) for the JSON Schema definition and TypeScript interface
- **Action / ActionsChain**: See [MFE Actions](./mfe-actions.md#typescript-interface-definitions)
- **MfeEntryLifecycle**: See [MFE API](./mfe-api.md#mfeentrylifecycle-interface)

### Decision 4: Built-in First-Class Citizen Schemas

First-class citizen schemas are built into the GTS plugin (see Decision 1 above for the rationale). The GTS plugin constructor registers all first-class schemas internally. `ScreensetsRegistry` does NOT call schema registration for core types. `registerSchema` is for vendor/dynamic schemas only.

`HAI3_CORE_TYPE_IDS`, `HAI3_LIFECYCLE_STAGE_IDS`, and `HAI3_MF_TYPE_IDS` are internal constant collections used by the registry and validation code. They are NOT exported from the public barrel. The GTS plugin registers all first-class schemas during construction -- no separate initialization step is needed. See [Decision 2](#decision-2-gts-type-id-format-and-registration) for the complete type ID tables.

### Decision 5: Vendor Type Registration

Vendors (third-party MFE providers) deliver complete packages containing derived types and instances that extend HAI3's base types. This section explains how vendor packages integrate with the GTS type system.

#### Vendor Package Concept

A vendor package is a self-contained bundle that includes:

1. **Derived Type Definitions (schemas)** - Vendor-specific types that extend HAI3 base types
2. **Well-Known Instances** - Pre-defined MFE entries, manifests, extensions, and actions

All vendor package identifiers follow the pattern `~<vendor>.<package>.*.*v*` as a GTS qualifier suffix.

**Note on Wildcards:** The wildcards (`*`) in this diagram represent pattern matching for documentation purposes only. Actual type IDs use concrete values (e.g., `acme.analytics.actions.data_updated.v1`).

```
+-------------------------------------------------------------+
|                    VENDOR PACKAGE                           |
|                  (e.g., acme-analytics)                     |
+-------------------------------------------------------------+
|  Derived Types (schemas):                                   |
|  - gts.hai3.mfes.comm.action.v1~acme.analytics.comm.data_updated.v1~|
|  - gts.hai3.mfes.mfe.entry.v1~acme.analytics.mfe.chart.v1~ |
|                                                             |
|  Instances:                                                 |
|  - MFE entries, manifests, extensions, actions              |
|  - All IDs ending with ~acme.analytics.<namespace>.<type>.v*~|
+-------------------------------------------------------------+
                              |
                              | (delivery mechanism
                              |  out of scope)
                              v
+-------------------------------------------------------------+
|                    HAI3 RUNTIME                             |
+-------------------------------------------------------------+
|  TypeSystemPlugin.registerSchema() <- vendor type schemas   |
|  ScreensetsRegistry.register*()    <- vendor instances      |
|  Polymorphic validation via GTS derived type IDs            |
+-------------------------------------------------------------+
```

#### Derived Types and Polymorphic Validation

Vendor types are **derived types** that extend HAI3 base types using GTS's type derivation mechanism. The derived type ID includes both the base type and the vendor qualifier:

```
Base type:    gts.hai3.mfes.comm.action.v1~
                              |
                              v (extends)
Derived type: gts.hai3.mfes.comm.action.v1~acme.analytics.comm.data_updated.v1~
              +------------ base ------------++---------- vendor qualifier ---------+
```

GTS supports **polymorphic schema resolution**: when the mediator validates an action payload, it uses the derived type's schema (which includes vendor-specific fields) while still recognizing the instance as conforming to the base action contract.

#### Example: Vendor Derived Action Type

A vendor (Acme Analytics) defines a custom action with a vendor-specific payload schema:

```typescript
// Vendor-specific schema extending base Action
// The type ID is extracted from the $id field - no need to specify it separately
const acmeDataUpdatedSchema: JSONSchema = {
  "$id": "gts://gts.hai3.mfes.comm.action.v1~acme.analytics.comm.data_updated.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.mfes.comm.action.v1~" }
  ],
  "properties": {
    "payload": {
      "type": "object",
      "properties": {
        "datasetId": { "type": "string" },
        "metrics": {
          "type": "array",
          "items": { "type": "string" }
        },
        "timestamp": { "type": "number" }
      },
      "required": ["datasetId", "metrics"]
    }
  }
};

// Vendor registers their derived type schema
// Type ID is extracted from schema.$id automatically
plugin.registerSchema(acmeDataUpdatedSchema);
```

When an action instance uses this derived type ID, the mediator:
1. Recognizes it as an Action (from the base type prefix)
2. Validates the payload using the derived type's schema (with vendor-specific fields)
3. Routes it through the standard action mediation flow

#### Key Points

1. **Vendor types are DERIVED types** - They extend HAI3 base types (e.g., `gts.hai3.mfes.comm.action.v1~`) with a vendor qualifier suffix
2. **GTS polymorphic schema resolution** - The mediator validates payloads using the most specific (derived) type's schema while maintaining base type compatibility
3. **Delivery mechanism is out of scope** - HOW vendor packages are delivered to the HAI3 runtime is not defined by this proposal
4. **Interfaces for registration** - The proposal defines the registration interfaces (`TypeSystemPlugin.registerSchema()`, `ScreensetsRegistry.register*()`) that vendor packages use, not the delivery mechanism

#### Vendor Registration Flow

```typescript
// After vendor package is loaded (delivery mechanism out of scope):

// 1. Register vendor's derived type schemas
// Type ID is extracted from schema.$id - no redundant ID parameter
plugin.registerSchema(acmeDataUpdatedSchema);
plugin.registerSchema(acmeChartWidgetEntrySchema);

// 2. Register vendor's extensions (which reference entries)
// Extensions reference MfeEntryMF which contains manifest info internally
registry.registerExtension(acmeChartExtension);
// The extension.entry references the MfeEntryMF type ID
// MfeHandlerMF resolves the manifest from the entry when loading
```

### Decision 6: ScreensetsRegistry Configuration

The ScreensetsRegistry requires a Type System plugin at initialization:

`ScreensetsRegistryConfig` requires `typeSystem: TypeSystemPlugin` and optionally accepts `mfeHandlers?: MfeHandler[]`. The registry is obtained via `screensetsRegistryFactory.build(config)`. See [registry-runtime.md - Decision 18](./registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction) for the complete factory-with-cache pattern.

### Decision 7: Framework Plugin Model (Optional Handler Configuration)

**Key Principles:**
- Screensets is CORE to HAI3 -- automatically initialized, NOT a plugin
- The microfrontends plugin enables MFE capabilities with optional handler configuration (`mfeHandlers?: MfeHandler[]`)
- All domain and extension registrations happen dynamically at runtime

The `microfrontends()` plugin creates the `ScreensetsRegistry` via `screensetsRegistryFactory.build({ typeSystem: gtsPlugin, mfeHandlers })` and registers MFE actions, effects, and the store slice. Domain registration is called directly on `ScreensetsRegistry` (synchronous, no Flux round-trip). Lifecycle actions (`loadExtension`, `mountExtension`, `unmountExtension`) call `executeActionsChain()` fire-and-forget. Extension registration (`registerExtension`, `unregisterExtension`) uses effects with store state tracking. See [mfe-ext-lifecycle-actions.md](./mfe-ext-lifecycle-actions.md) for the complete lifecycle actions design.

#### Framework Re-Export Policy

`@hai3/framework` re-exports ALL public symbols from `@hai3/screensets` so that downstream packages (`@hai3/react`) import from L2, never from L1. See [registry-runtime.md - Export Policy](./registry-runtime.md#export-policy) for the complete list of public exports.

#### React Re-Export Policy

`@hai3/react` re-exports ALL public symbols from `@hai3/framework` (including MFE symbols, plugin factories, selectors, action functions, constants, types, abstract classes, and utilities). Each layer fully covers the layer below so that L4 application code can import everything from `@hai3/react` without reaching through to `@hai3/framework` or `@hai3/screensets`.

### Decision 8: Contract Matching Rules

For an MFE entry to be mountable into an extension domain, the following conditions must ALL be true:

```
1. entry.requiredProperties  SUBSET_OF  domain.sharedProperties
   (domain provides all properties required by entry)

2. entry.actions             SUBSET_OF  domain.extensionsActions
   (domain accepts all action types the MFE may send to it)

3. domain.actions \ INFRASTRUCTURE_LIFECYCLE_ACTIONS  SUBSET_OF  entry.domainActions
   (MFE can handle all CUSTOM action types that may target it;
    infrastructure lifecycle actions are excluded from this check)
```

**Rule 3 -- Infrastructure Lifecycle Action Exclusion:**

`domain.actions` typically includes infrastructure lifecycle actions (`HAI3_ACTION_LOAD_EXT`, `HAI3_ACTION_MOUNT_EXT`, `HAI3_ACTION_UNMOUNT_EXT`) that are dispatched to the domain via `executeActionsChain`. These actions are handled by the domain's `ExtensionLifecycleActionHandler` -- registered per-domain by the registry during `registerDomain()` -- and are never seen by MFE application code. The MFE entry's `domainActions` field declares only the custom/application-level actions that the MFE must explicitly handle in its own code.

Therefore, rule 3 excludes the three infrastructure lifecycle action type IDs from the subset check. Only non-infrastructure domain actions are validated against `entry.domainActions`. This means a domain with `actions: [HAI3_ACTION_LOAD_EXT, HAI3_ACTION_MOUNT_EXT]` and an entry with `domainActions: []` is a valid contract (no custom actions to handle).

The set of infrastructure lifecycle actions excluded from rule 3:
- `HAI3_ACTION_LOAD_EXT` (`gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.load_ext.v1`)
- `HAI3_ACTION_MOUNT_EXT` (`gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.mount_ext.v1`)
- `HAI3_ACTION_UNMOUNT_EXT` (`gts.hai3.mfes.comm.action.v1~hai3.mfes.ext.unmount_ext.v1`)

The visual representation of contract matching:

```
+-------------------+                      +-------------------+
|   MfeEntry        |                      |  ExtensionDomain  |
+-------------------+                      +-------------------+
| requiredProperties| --------subset-----> | sharedProperties  |
|                   |                      |                   |
| actions           | --------subset-----> | extensionsActions |
|                   |                      |                   |
| domainActions     | <--subset (filtered) | actions           |
|                   |    (excludes infra   |  (may include     |
|                   |     lifecycle actions)|  load/mount/unmount)
+-------------------+                      +-------------------+
```

**Validation behavior**: `validateContract(entry, domain)` checks each of the three subset rules above. For each violation it produces a `ContractError` with a discriminated `type` (`'missing_property'`, `'unsupported_action'`, or `'unhandled_domain_action'`) and a human-readable `details` string. Returns `{ valid: boolean, errors: ContractError[] }`. Rule 3 filters out infrastructure lifecycle actions before the subset check -- only custom domain actions produce `unhandled_domain_action` errors.

### Decision 9: Domain-Specific Extension Validation via Derived Types

**Problem:** An `Extension` instance may need domain-specific fields beyond the base Extension contract (e.g., `title`, `icon`, `size` for a widget domain).

**Solution:** Domain-specific fields are defined directly in derived Extension schemas rather than in a separate wrapper field. Domains specify `extensionsTypeId` pointing to a derived Extension type that extensions must conform to. This provides simpler validation, native GTS support, and no parallel hierarchies.

**Design:** `ExtensionDomain.extensionsTypeId` optionally references a derived Extension type. Domain-specific fields are defined directly in derived Extension schemas. Benefits: simpler (one entity vs two), native GTS validation, no parallel hierarchies, no Ajv dependency.

**Validation behavior**: `validateExtensionType(plugin, extension, domain)` skips the check if `domain.extensionsTypeId` is unset. Otherwise, it calls `plugin.isTypeOf(extension.id, domain.extensionsTypeId)` to verify the extension's type derives from the domain's required type. Returns a `ValidationResult` with an error on the `id` path if the check fails. GTS-native instance validation (via `validateInstance`) handles domain-specific field validation separately.

**Domain Definition Example:** (See [mfe-domain.md - Vendor-Defined Domains](./mfe-domain.md#vendor-defined-domains) for the full `widgetSlotDomain` definition with all fields.)

```typescript
// 1. First, define and register a derived Extension schema with domain-specific fields
const widgetExtensionSchema: JSONSchema = {
  "$id": "gts://gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.mfes.ext.extension.v1~" }
  ],
  "properties": {
    "title": { "type": "string" },
    "icon": { "type": "string" },
    "size": { "enum": ["small", "medium", "large"] }
  },
  "required": ["title", "size"]
};
plugin.registerSchema(widgetExtensionSchema);

// 2. Domain references the derived Extension type (schema ID ends with ~)
// Note: Domain instance ID does NOT end with ~ (only schema IDs do)
const widgetSlotDomain: ExtensionDomain = {
  id: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  // ... other fields ...
  // extensionsTypeId is a SCHEMA reference, so it ends with ~
  extensionsTypeId: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~',
  // ...
};

// 3. Extensions use the derived type with domain-specific fields
// Note: Instance IDs do NOT end with ~ (only schema IDs do)
const analyticsExtension: Extension = {
  id: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics.widgets.chart.v1',
  domain: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields (defined in derived schema):
  title: 'Analytics Dashboard',
  icon: 'chart-line',
  size: 'large',
};
```

**Integration Point:**

`ScreensetsRegistry.registerExtension()` validates extension type compatibility in four steps:
1. Register the extension as a GTS entity via `typeSystem.register(extension)`.
2. Validate the instance via `typeSystem.validateInstance(extension.id)` -- throws `ExtensionValidationError` on failure.
3. Validate contract matching (entry vs domain) via `validateContract(entry, domain)` -- throws `ContractValidationError` on failure.
4. Validate extension type hierarchy via `validateExtensionType(plugin, extension, domain)` -- throws `ExtensionTypeError` if the extension does not derive from `domain.extensionsTypeId`.
