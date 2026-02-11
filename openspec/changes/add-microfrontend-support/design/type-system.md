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

1. **Instance-Level State Isolation (Default)**: HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](./overview.md#runtime-isolation-default-behavior) for details.
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
 * Result of compatibility check
 */
interface CompatibilityResult {
  compatible: boolean;
  breaking: boolean;
  changes: CompatibilityChange[];
}

interface CompatibilityChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  description: string;
}

/**
 * Result of attribute access
 */
interface AttributeResult {
  /** The type ID that was queried */
  typeId: string;
  /** The property path that was accessed */
  path: string;
  /** Whether the attribute was found */
  resolved: boolean;
  /** The value if resolved */
  value?: unknown;
  /** Error message if not resolved */
  error?: string;
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
 * - Instance IDs do NOT end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~acme.ext.widget.v1`)
 * - gts-ts extracts the schema ID from the chained instance ID automatically
 *
 * Note: buildTypeId() is intentionally omitted. GTS type IDs are consumed
 * (validated, parsed) but never programmatically generated at runtime.
 * All type IDs are defined as string constants.
 */
interface TypeSystemPlugin {
  /** Plugin identifier */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  // === Type ID Operations ===

  /**
   * Check if a string is a valid type ID format.
   * Used before any operation that requires a valid type ID.
   */
  isValidTypeId(id: string): boolean;

  /**
   * Parse a type ID into plugin-specific components.
   * Returns a generic object - the structure is plugin-defined.
   * Use this when you need metadata about a type ID.
   */
  parseTypeId(id: string): Record<string, unknown>;

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
   * - Instance ID: `gts.hai3.mfes.ext.extension.v1~acme.ext.widget.v1`
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
   * - Instance ID: `gts.hai3.mfes.ext.extension.v1~acme.ext.widget.v1`
   * - Schema ID:   `gts.hai3.mfes.ext.extension.v1~`
   *
   * @param instanceId - The instance ID (does NOT end with ~)
   * @returns Validation result
   */
  validateInstance(instanceId: string): ValidationResult;

  // === Query ===

  /**
   * Query registered type IDs matching a pattern
   */
  query(pattern: string, limit?: number): string[];

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

  // === Compatibility (REQUIRED) ===

  /**
   * Check compatibility between two type versions
   */
  checkCompatibility(oldTypeId: string, newTypeId: string): CompatibilityResult;

  // === Attribute Access (REQUIRED for dynamic schema resolution) ===

  /**
   * Get an attribute value from a type using property path.
   * Used for dynamic schema resolution (e.g., getting domain's extensionsTypeId to resolve derived Extension types).
   */
  getAttribute(typeId: string, path: string): AttributeResult;
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

```typescript
// packages/screensets/src/mfe/plugins/gts/index.ts
import {
  isValidGtsID,
  parseGtsID,
  GtsStore,
  GtsQuery,
  createJsonEntity,
  type GtsIDSegment,
  type ParseResult,
  type ValidationResult as GtsValidationResult,
  type CompatibilityResult as GtsCompatibilityResult,
} from '@globaltypesystem/gts-ts';
import type { TypeSystemPlugin, ValidationResult, CompatibilityResult } from '../types';
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

Schema IDs end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~`); instance IDs do NOT (e.g., `gts.hai3.mfes.ext.extension.v1~acme.ext.widget.v1`). gts-ts extracts the schema ID from the instance ID automatically.

### Decision 2: GTS Type ID Format and Registration

The GTS type ID format follows the structure: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### HAI3 GTS Type IDs

The type system is organized into **8 core types** that define the contract model (including LifecycleStage and LifecycleHook), plus **2 MF-specific types** for Module Federation loading. See [schemas.md](./schemas.md) for complete schema definitions.

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

The MFE system uses internal TypeScript interfaces with a simple `id: string` field as the identifier. When metadata is needed about a type ID, call `plugin.parseTypeId(id)` directly.

TypeScript interface definitions are distributed across their respective design documents:

- **MfeEntry / MfeEntryMF**: See [MFE Entry](./mfe-entry-mf.md#typescript-interface-definitions)
- **MfManifest / SharedDependencyConfig**: See [MFE Manifest](./mfe-manifest.md#typescript-interface-definitions)
- **ExtensionDomain / Extension**: See [MFE Domain](./mfe-domain.md#typescript-interface-definitions)
- **SharedProperty**: See [MFE Shared Property](./mfe-shared-property.md#typescript-interface-definition)
- **Action / ActionsChain**: See [MFE Actions](./mfe-actions.md#typescript-interface-definitions)
- **MfeEntryLifecycle**: See [MFE API](./mfe-api.md#mfeentrylifecycle-interface)

### Decision 4: Built-in First-Class Citizen Schemas

First-class citizen schemas are built into the GTS plugin (see Decision 1 above for the rationale). The GTS plugin constructor registers all first-class schemas internally. `ScreensetsRegistry` does NOT call schema registration for core types. `registerSchema` is for vendor/dynamic schemas only.

```typescript
// packages/screensets/src/mfe/init.ts

/** GTS Type IDs for HAI3 MFE core types (8 types) - for reference only */
export const HAI3_CORE_TYPE_IDS = {
  mfeEntry: 'gts.hai3.mfes.mfe.entry.v1~',
  extensionDomain: 'gts.hai3.mfes.ext.domain.v1~',
  extension: 'gts.hai3.mfes.ext.extension.v1~',
  sharedProperty: 'gts.hai3.mfes.comm.shared_property.v1~',
  action: 'gts.hai3.mfes.comm.action.v1~',
  actionsChain: 'gts.hai3.mfes.comm.actions_chain.v1~',
  lifecycleStage: 'gts.hai3.mfes.lifecycle.stage.v1~',
  lifecycleHook: 'gts.hai3.mfes.lifecycle.hook.v1~',
} as const;

/** GTS Type IDs for default lifecycle stages (4 stages) - for reference only */
export const HAI3_LIFECYCLE_STAGE_IDS = {
  init: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.init.v1',
  activated: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.activated.v1',
  deactivated: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.deactivated.v1',
  destroyed: 'gts.hai3.mfes.lifecycle.stage.v1~hai3.mfes.lifecycle.destroyed.v1',
} as const;

/** GTS Type IDs for MF-specific types (2 types) - for reference only */
export const HAI3_MF_TYPE_IDS = {
  mfManifest: 'gts.hai3.mfes.mfe.mf_manifest.v1~',
  mfeEntryMf: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~',
} as const;

// NOTE: No registerHai3Types() function needed.
// The GTS plugin registers all first-class schemas during construction.
// See gtsPlugin singleton in gts/index.ts for implementation.
```

### Decision 5: Vendor Type Registration

Vendors (third-party MFE providers) deliver complete packages containing derived types and instances that extend HAI3's base types. This section explains how vendor packages integrate with the GTS type system.

#### Vendor Package Concept

A vendor package is a self-contained bundle that includes:

1. **Derived Type Definitions (schemas)** - Vendor-specific types that extend HAI3 base types
2. **Well-Known Instances** - Pre-defined MFE entries, manifests, extensions, and actions

All vendor package identifiers follow the pattern `~<vendor>.<package>.*.*v*` as a GTS qualifier suffix.

**Note on Wildcards:** The wildcards (`*`) in this diagram represent pattern matching for documentation purposes only. Actual type IDs use concrete values (e.g., `acme.analytics.ext.data_updated.v1`). Wildcards are used only when explaining pattern matching in `TypeSystemPlugin.query()`.

```
+-------------------------------------------------------------+
|                    VENDOR PACKAGE                           |
|                  (e.g., acme-analytics)                     |
+-------------------------------------------------------------+
|  Derived Types (schemas):                                   |
|  - gts.hai3.mfes.comm.action.v1~acme.analytics.comm.data_updated.v1~|
|  - gts.hai3.mfes.mfe.entry.v1~acme.analytics.mfe.chart_widget.v1~ |
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

```typescript
// packages/screensets/src/mfe/runtime/config.ts

/**
 * Configuration for the ScreensetsRegistry
 *
 * Note on loading/error components:
 * - Components configured here serve as REGISTRY-LEVEL DEFAULTS
 * - Individual domain containers (e.g., ExtensionDomainSlot) can OVERRIDE these defaults
 * - This enables per-use customization while providing sensible defaults
 */
interface ScreensetsRegistryConfig {
  /** Required: Type System plugin for type handling */
  typeSystem: TypeSystemPlugin;

  /** Optional: Custom error handler */
  onError?: (error: MfeError) => void;

  /**
   * Optional: Default loading state component for the registry.
   * Domain containers can override this at the container level for per-use customization.
   *
   * Note: @hai3/screensets is L1 (framework-agnostic). This uses a generic type
   * so it works with any UI framework. The L2/L3 layers (e.g., @hai3/framework,
   * @hai3/react) provide typed wrappers that accept framework-specific components.
   */
  loadingComponent?: unknown;

  /**
   * Optional: Default error fallback component for the registry.
   * Domain containers can override this at the container level for per-use customization.
   *
   * Note: @hai3/screensets is L1 (framework-agnostic). This uses a generic type
   * so it works with any UI framework. The L2/L3 layers (e.g., @hai3/framework,
   * @hai3/react) provide typed wrappers that accept framework-specific components.
   */
  errorFallbackComponent?: unknown;

  /** Optional: Enable debug logging */
  debug?: boolean;

  /**
   * Optional custom MFE handler instance.
   * If provided, this handler will be registered with the registry.
   *
   * Note: The default MfeHandlerMF is NOT automatically registered.
   * Applications must explicitly provide handlers they want to use.
   */
  mfeHandler?: MfeHandler;

  /** Initial parent bridge (if loaded as MFE) */
  parentBridge?: ParentMfeBridge;

  /** Optional runtime coordinator for MFE isolation (defaults to WeakMapRuntimeCoordinator) */
  coordinator?: RuntimeCoordinator;

  /**
   * Optional actions chains mediator.
   * Used for executing action chains with success/failure branching.
   *
   * If not provided, defaults to DefaultActionsChainsMediator.
   * Custom mediators can be provided for testing or specialized behavior.
   *
   * @default DefaultActionsChainsMediator
   */
  mediator?: ActionsChainsMediator;
}

// Factory-with-cache (see Decision 18 in registry-runtime.md)
// screensetsRegistryFactory.build(config) is the ONLY way to obtain an instance.
// There is no standalone createScreensetsRegistry() function, no static create() method,
// and no pre-built screensetsRegistry singleton constant.

// Usage with GTS (default) -- bind at application wiring time
import { screensetsRegistryFactory, gtsPlugin } from '@hai3/screensets';

// GTS binding happens at application wiring level, not module level
const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
```

### Decision 7: Framework Plugin Model (No Static Configuration)

**Key Principles:**
- Screensets is CORE to HAI3 - automatically initialized, NOT a plugin
- The microfrontends plugin enables MFE capabilities with NO static configuration
- All MFE registrations (manifests, extensions, domains) happen dynamically at runtime

The @hai3/framework microfrontends plugin requires NO configuration. It simply enables MFE capabilities and wires the ScreensetsRegistry into the Flux data flow pattern:

```typescript
// packages/framework/src/plugins/microfrontends/index.ts

/**
 * Microfrontends plugin - enables MFE capabilities.
 * NO configuration required or accepted.
 * All MFE registration happens dynamically at runtime.
 */
function microfrontends(): FrameworkPlugin {
  return {
    name: 'microfrontends',

    setup(framework) {
      // Create ScreensetsRegistry via factory-with-cache at wiring time
      const runtime = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });

      // Register MFE actions and effects
      framework.registerActions(mfeActions);
      framework.registerEffects(mfeEffects);
      framework.registerSlice(mfeSlice);

      // Base domains (sidebar, popup, screen, overlay) are registered
      // dynamically at runtime, not via static configuration
    },
  };
}

// App initialization example - screensets is CORE, not a plugin
import { createHAI3, microfrontends } from '@hai3/framework';
// Note: Domain instance ID constants are exported from @hai3/framework (L2),
// not @hai3/screensets (L1), because they reference runtime configuration.
import {
  HAI3_SIDEBAR_DOMAIN,
  HAI3_POPUP_DOMAIN,
  HAI3_SCREEN_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
} from '@hai3/framework';

// Screensets is CORE - automatically initialized by createHAI3()
const app = createHAI3()
  .use(microfrontends())  // No configuration - just enables MFE capabilities
  .build();

// All registration happens dynamically at runtime via actions:
// - mfeActions.registerDomain({ domain })
// - mfeActions.registerExtension({ extension })

// Or via runtime API:
// - runtime.registerDomain(domain)
// - runtime.registerExtension(extension)
// Note: Manifest is internal to MfeHandlerMF - no public registerManifest()

// Example: Register base domains dynamically after app initialization
eventBus.on('app/ready', () => {
  mfeActions.registerDomain(HAI3_SIDEBAR_DOMAIN);
  mfeActions.registerDomain(HAI3_POPUP_DOMAIN);
  mfeActions.registerDomain(HAI3_SCREEN_DOMAIN);
  mfeActions.registerDomain(HAI3_OVERLAY_DOMAIN);
});
```

### Decision 8: Contract Matching Rules

For an MFE entry to be mountable into an extension domain, the following conditions must ALL be true:

```
1. entry.requiredProperties  SUBSET_OF  domain.sharedProperties
   (domain provides all properties required by entry)

2. entry.actions             SUBSET_OF  domain.extensionsActions
   (domain accepts all action types the MFE may send to it)

3. domain.actions            SUBSET_OF  entry.domainActions
   (MFE can handle all action types that may target it)
```

The visual representation of contract matching:

```
+-------------------+                      +-------------------+
|   MfeEntry        |                      |  ExtensionDomain  |
+-------------------+                      +-------------------+
| requiredProperties| --------subset-----> | sharedProperties  |
|                   |                      |                   |
| actions           | --------subset-----> | extensionsActions |
|                   |                      |                   |
| domainActions     | <-------subset------ | actions           |
+-------------------+                      +-------------------+
```

**Validation Implementation:**
```typescript
interface ContractValidationResult {
  valid: boolean;
  errors: ContractError[];
}

interface ContractError {
  type: 'missing_property' | 'unsupported_action' | 'unhandled_domain_action';
  details: string;
}

function validateContract(
  entry: MfeEntry,
  domain: ExtensionDomain
): ContractValidationResult {
  const errors: ContractError[] = [];

  // Rule 1: Required properties
  for (const prop of entry.requiredProperties) {
    if (!domain.sharedProperties.includes(prop)) {
      errors.push({
        type: 'missing_property',
        details: `Entry requires property '${prop}' not provided by domain`
      });
    }
  }

  // Rule 2: Entry actions (MFE can send these to domain)
  for (const action of entry.actions) {
    if (!domain.extensionsActions.includes(action)) {
      errors.push({
        type: 'unsupported_action',
        details: `MFE may send action '${action}' not accepted by domain`
      });
    }
  }

  // Rule 3: Domain actions (can target MFE)
  for (const action of domain.actions) {
    if (!entry.domainActions.includes(action)) {
      errors.push({
        type: 'unhandled_domain_action',
        details: `Action '${action}' may target MFE but MFE doesn't handle it`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Decision 9: Domain-Specific Extension Validation via Derived Types

**Problem:** An `Extension` instance may need domain-specific fields beyond the base Extension contract (e.g., `title`, `icon`, `size` for a widget domain).

**Solution:** Domain-specific fields are defined directly in derived Extension schemas rather than in a separate wrapper field. Domains specify `extensionsTypeId` pointing to a derived Extension type that extensions must conform to. This provides simpler validation, native GTS support, and no parallel hierarchies.

**Design:** `ExtensionDomain.extensionsTypeId` optionally references a derived Extension type. Domain-specific fields are defined directly in derived Extension schemas. Benefits: simpler (one entity vs two), native GTS validation, no parallel hierarchies, no Ajv dependency.

**Validation Implementation:**

```typescript
/**
 * Validate Extension against its domain's extensionsTypeId.
 * This ensures the extension uses a type that derives from the domain's required type.
 */
function validateExtensionType(
  plugin: TypeSystemPlugin,
  extension: Extension,
  domain: ExtensionDomain
): ValidationResult {
  // If domain doesn't require a specific extension type, skip this check
  if (!domain.extensionsTypeId) {
    return { valid: true, errors: [] };
  }

  // Check that extension's type derives from domain's extensionsTypeId
  if (!plugin.isTypeOf(extension.id, domain.extensionsTypeId)) {
    return {
      valid: false,
      errors: [{
        path: 'id',
        message: `Extension type '${extension.id}' must derive from '${domain.extensionsTypeId}'`,
        keyword: 'x-gts-ref',
      }],
    };
  }

  // Native GTS validation handles all fields (including domain-specific ones)
  // This is already done when validating the extension instance
  return { valid: true, errors: [] };
}
```

**Domain Definition Example:**

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
  id: 'gts.hai3.mfes.ext.extension.v1~acme.dashboard.ext.widget_extension.v1~acme.analytics.v1',
  domain: 'gts.hai3.mfes.ext.domain.v1~acme.dashboard.layout.widget_slot.v1',
  entry: 'gts.hai3.mfes.mfe.entry.v1~hai3.mfes.mfe.entry_mf.v1~acme.analytics.mfe.chart.v1',
  // Domain-specific fields (defined in derived schema):
  title: 'Analytics Dashboard',
  icon: 'chart-line',
  size: 'large',
};
```

**Integration Point:**

The ScreensetsRegistry validates extension type compatibility during registration using the GTS-native approach:

```typescript
// In ScreensetsRegistry.registerExtension()

// 1. Register the extension as a GTS entity (required before validation)
this.typeSystem.register(extension);

// 2. Validate the registered extension instance by its ID
// gts-ts extracts the schema ID from the instance ID automatically:
// - Instance ID: gts.hai3.mfes.ext.extension.v1~acme.ext.widget.v1
// - Schema ID:   gts.hai3.mfes.ext.extension.v1~ (extracted automatically)
const instanceResult = this.typeSystem.validateInstance(extension.id);
if (!instanceResult.valid) {
  throw new ExtensionValidationError(instanceResult.errors, extension.id);
}

// 3. Validate contract matching (entry vs domain)
const contractResult = validateContract(entry, domain);
if (!contractResult.valid) {
  throw new ContractValidationError(contractResult.errors, entry.id, domain.id);
}

// 4. Validate extension type derives from domain's extensionsTypeId
const typeResult = validateExtensionType(this.typeSystem, extension, domain);
if (!typeResult.valid) {
  throw new ExtensionTypeError(extension.id, domain.extensionsTypeId!);
}

// All validations pass, extension is now registered and validated
```
