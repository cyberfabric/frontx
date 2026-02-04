# Design: Type System and Contract Validation

This document covers the Type System Plugin architecture and contract validation for MFE contracts.

**Related Documents:**
- [Schemas](./schemas.md) - JSON Schema definitions for all MFE types
- [Registry and Runtime](./registry-runtime.md) - Runtime isolation, action mediation, bridges
- [MFE Loading](./mfe-loading.md) - MfeHandler abstraction, handler registry, Module Federation loading

---

## Context

HAI3 needs to support microfrontend (MFE) architecture where independent applications can be composed into a parent application. HAI3's default handler enforces instance-level isolation where each MFE **instance** gets its own HAI3 state instance. Custom handlers can implement different isolation strategies for internal MFEs. Communication between parent and MFE instance must be explicit, type-safe, and controlled.

The type system for MFE contracts is abstracted through a **Type System Plugin** interface, allowing different type system implementations while shipping GTS as the default.

### Key Principle: Opaque Type IDs

The @hai3/screensets package treats **type IDs as opaque strings**. All type ID understanding (parsing, format validation, building) is delegated to the TypeSystemPlugin. When metadata about a type ID is needed, call plugin methods (`parseTypeId`, `getAttribute`, etc.) directly.

### Stakeholders

- **HAI3 Parent Application**: Defines extension domains and orchestrates MFE instance communication (parent can be host or another MFE)
- **MFE Vendors**: Create independently deployable extensions
- **End Users**: Experience seamless integration of multiple MFE instances
- **Type System Providers**: Implement Type System plugin interface for custom type systems

### Constraints

- Instance-level state isolation (default): With HAI3's default handler, no direct state access between parent and MFE instance (or between MFE instances). Custom handlers can relax this for internal MFEs.
- Type safety: All communication contracts defined via pluggable Type System
- Security: MFE instances cannot access parent internals or sibling instance internals (enforced by default handler; custom handlers for internal MFEs may allow sharing)
- Performance: Lazy loading of MFE bundles
- Plugin requirement: Type System plugin must be provided at initialization

## Goals / Non-Goals

### Goals

1. **Instance-Level State Isolation (Default)**: HAI3's default handler enforces that each MFE instance has its own HAI3 state instance. Custom handlers can implement different isolation strategies.
2. **Symmetric Contracts**: Clear bidirectional communication contracts
3. **Contract Validation**: Compile-time and runtime validation of compatibility
4. **Mediated Actions**: Centralized action chain delivery through ActionsChainsMediator
5. **Hierarchical Domains**: Support nested extension points at any level (host or MFE)
6. **Pluggable Type System**: Abstract Type System as a plugin with GTS as default
7. **Opaque Type IDs**: Screensets package treats type IDs as opaque strings

### Non-Goals

1. **Direct State Sharing (default)**: With HAI3's default handler, no shared Redux store between parent and MFE instance. Custom handlers may allow sharing for internal MFEs.
2. **Event Bus Bridging**: No automatic event propagation across boundaries
3. **Hot Module Replacement**: MFE updates require reload (but hot-swap of extensions IS supported)
4. **Version Negotiation**: Single version per MFE entry
5. **Multiple Concurrent Plugins**: Only one Type System plugin per runtime instance
6. **Static Extension Registry**: Extensions are NOT known at initialization time (dynamic registration is the model)

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

**Rationale:**
1. First-class types define system capabilities - they establish the contract model
2. The plugin implementation depends on these system capabilities
3. Changes to first-class types require code changes in the screensets package
4. Vendors can only extend within the boundaries defined by these types
5. Having schemas built-in eliminates initialization ceremony and potential registration errors

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
   * Build a type ID from plugin-specific options.
   * The options object is plugin-specific and opaque to screensets.
   */
  buildTypeId(options: Record<string, unknown>): string;

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
   * Validate an instance against the schema for a type ID
   */
  validateInstance(typeId: string, instance: unknown): ValidationResult;

  /**
   * Validate an instance directly against a provided schema.
   * Used for dynamic validation where the schema doesn't have a stable type ID
   * (e.g., validating Extension.uiMeta against domain.extensionsUiMeta).
   */
  validateAgainstSchema(schema: JSONSchema, instance: unknown): ValidationResult;

  /**
   * Get the schema registered for a type ID
   */
  getSchema(typeId: string): JSONSchema | undefined;

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
   * Used for dynamic schema resolution (e.g., getting domain's extensionsUiMeta).
   */
  getAttribute(typeId: string, path: string): AttributeResult;
}
```

#### GTS Plugin Implementation

The GTS plugin implements `TypeSystemPlugin` using `@globaltypesystem/gts-ts`. First-class citizen schemas are registered during plugin construction - the plugin is ready to use immediately:

```typescript
// packages/screensets/src/mfe/plugins/gts/index.ts
import { Gts, GtsStore, GtsQuery } from '@globaltypesystem/gts-ts';
import type { TypeSystemPlugin, ValidationResult } from '../types';
import { mfeGtsSchemas } from '../../schemas/gts-schemas';

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

export function createGtsPlugin(): TypeSystemPlugin {
  const gtsStore = new GtsStore();

  // Register all first-class citizen schemas during construction.
  // These types define system capabilities and are well-known at compile time.
  // Changes to them require code changes in screensets anyway.
  const firstClassSchemas = [
    // Core types (8)
    mfeGtsSchemas.mfeEntry,
    mfeGtsSchemas.extensionDomain,
    mfeGtsSchemas.extension,
    mfeGtsSchemas.sharedProperty,
    mfeGtsSchemas.action,
    mfeGtsSchemas.actionsChain,
    mfeGtsSchemas.lifecycleStage,
    mfeGtsSchemas.lifecycleHook,
    // Default lifecycle stages (4)
    mfeGtsSchemas.lifecycleStageInit,
    mfeGtsSchemas.lifecycleStageActivated,
    mfeGtsSchemas.lifecycleStageDeactivated,
    mfeGtsSchemas.lifecycleStageDestroyed,
    // MF-specific types (2)
    mfeGtsSchemas.mfManifest,
    mfeGtsSchemas.mfeEntryMf,
  ];

  for (const schema of firstClassSchemas) {
    const typeId = extractTypeIdFromSchema(schema);
    gtsStore.register(typeId, schema);
  }

  return {
    name: 'gts',
    version: '1.0.0',

    // Type ID operations
    isValidTypeId(id: string): boolean {
      return Gts.isValidGtsID(id);
    },

    buildTypeId(options: Record<string, unknown>): string {
      return Gts.buildGtsID(options);
    },

    parseTypeId(id: string): Record<string, unknown> {
      // GTS-specific parsing - returns vendor, package, namespace, type, version
      const parsed = Gts.parseGtsID(id);
      return {
        vendor: parsed.vendor,
        package: parsed.package,
        namespace: parsed.namespace,
        type: parsed.type,
        version: parsed.version,
        qualifier: parsed.qualifier,
      };
    },

    // Schema registry - for vendor/dynamic schemas only
    // First-class schemas are already registered during construction
    registerSchema(schema: JSONSchema): void {
      const typeId = extractTypeIdFromSchema(schema);
      gtsStore.register(typeId, schema);
    },

    validateInstance(typeId: string, instance: unknown): ValidationResult {
      const result = gtsStore.validate(typeId, instance);
      return {
        valid: result.valid,
        errors: result.errors.map(e => ({
          path: e.instancePath,
          message: e.message,
          keyword: e.keyword,
        })),
      };
    },

    validateAgainstSchema(schema: JSONSchema, instance: unknown): ValidationResult {
      // Use a temporary in-memory validator without registering to the store
      const result = Gts.validateAgainstSchema(schema, instance);
      return {
        valid: result.valid,
        errors: result.errors.map(e => ({
          path: e.instancePath,
          message: e.message,
          keyword: e.keyword,
        })),
      };
    },

    getSchema(typeId: string): JSONSchema | undefined {
      return gtsStore.getSchema(typeId);
    },

    // Query
    query(pattern: string, limit?: number): string[] {
      return GtsQuery.search(gtsStore, pattern, { limit });
    },

    // Type Hierarchy
    isTypeOf(typeId: string, baseTypeId: string): boolean {
      // GTS type derivation: derived types include the base type ID as a prefix
      // e.g., 'gts.hai3.screensets.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~'
      // is derived from 'gts.hai3.screensets.mfe.entry.v1~'
      return typeId.startsWith(baseTypeId) || typeId === baseTypeId;
    },

    // Compatibility (REQUIRED)
    checkCompatibility(oldTypeId: string, newTypeId: string) {
      return Gts.checkCompatibility(gtsStore, oldTypeId, newTypeId);
    },

    // Attribute Access (REQUIRED for dynamic schema resolution)
    getAttribute(typeId: string, path: string): AttributeResult {
      const result = gtsStore.getAttribute(typeId, path);
      return {
        typeId,
        path,
        resolved: result !== undefined,
        value: result,
        error: result === undefined ? `Attribute '${path}' not found in type '${typeId}'` : undefined,
      };
    },
  };
}

// Default export for convenience - creates a singleton plugin instance
// Plugin is immediately ready to use with all first-class schemas registered
export const gtsPlugin = createGtsPlugin();
```

### Decision 2: GTS Type ID Format and Registration

The GTS type ID format follows the structure: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### HAI3 GTS Type IDs

The type system is organized into **8 core types** that define the contract model (including LifecycleStage and LifecycleHook), plus **2 MF-specific types** for Module Federation loading. See [schemas.md](./schemas.md) for complete schema definitions.

**Core Types (8 total):**

| Type | GTS Type ID | Purpose |
|------|-------------|---------|
| MFE Entry (Abstract) | `gts.hai3.screensets.mfe.entry.v1~` | Pure contract type (abstract base) |
| Extension Domain | `gts.hai3.screensets.ext.domain.v1~` | Extension point contract |
| Extension | `gts.hai3.screensets.ext.extension.v1~` | Extension binding |
| Shared Property | `gts.hai3.screensets.ext.shared_property.v1~` | Property definition |
| Action | `gts.hai3.screensets.ext.action.v1~` | Action type with target and self-id |
| Actions Chain | `gts.hai3.screensets.ext.actions_chain.v1~` | Action chain for mediation |
| LifecycleStage | `gts.hai3.screensets.ext.lifecycle_stage.v1~` | Lifecycle event type |
| LifecycleHook | `gts.hai3.screensets.ext.lifecycle_hook.v1~` | Binds stage to actions chain |

**MF-Specific Types (2 total):**

| Type | GTS Type ID | Purpose |
|------|-------------|---------|
| MF Manifest | `gts.hai3.screensets.mfe.mf.v1~` | Module Federation manifest (standalone) |
| MFE Entry MF (Derived) | `gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~` | Module Federation entry with manifest reference |

#### Why This Structure Eliminates Parallel Hierarchies

The previous design had parallel hierarchies:
- `MfeDefinition` (abstract) -> `MfeDefinitionMF` (derived)
- `MfeEntry` (pure contract)

This created redundancy because both hierarchies needed to track entries. The new design:

1. **Makes MfeEntry the abstract base** for entry contracts
2. **Adds MfeEntryMF as derived** that references its MfManifest
3. **MfManifest is standalone** containing Module Federation config
4. **Extension binds to MfeEntry** (or its derived types)

Benefits:
- **No parallel hierarchies**: Only one entry hierarchy
- **Future-proof**: ESM loader would add `MfeEntryEsm` derived type with its own manifest reference
- **Clear ownership**: Entry owns its contract AND references its manifest

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

**Key Principle**: First-class citizen schemas are built into the GTS plugin, not registered via `registerSchema` calls.

**Rationale:**
1. **First-class types define system capabilities** - MfeEntry, ExtensionDomain, Action, etc. establish the contract model that the entire system depends on
2. **Well-known at compile time** - These types are not dynamic; they are fixed parts of the HAI3 architecture
3. **Changes require code changes** - Modifying these schemas requires updating the screensets package anyway
4. **Vendors extend, not replace** - Third parties can only create derived types within the boundaries of these base types
5. **Eliminates initialization ceremony** - No `registerHai3Types()` call needed; plugin is ready to use immediately

**What this means:**
- The GTS plugin constructor registers all first-class schemas internally (see GTS Plugin Implementation above)
- `ScreensetsRegistry` does NOT call any schema registration for core types
- `registerSchema` is available ONLY for vendor/dynamic schemas

```typescript
// packages/screensets/src/mfe/init.ts

/** GTS Type IDs for HAI3 MFE core types (8 types) - for reference only */
export const HAI3_CORE_TYPE_IDS = {
  mfeEntry: 'gts.hai3.screensets.mfe.entry.v1~',
  extensionDomain: 'gts.hai3.screensets.ext.domain.v1~',
  extension: 'gts.hai3.screensets.ext.extension.v1~',
  sharedProperty: 'gts.hai3.screensets.ext.shared_property.v1~',
  action: 'gts.hai3.screensets.ext.action.v1~',
  actionsChain: 'gts.hai3.screensets.ext.actions_chain.v1~',
  lifecycleStage: 'gts.hai3.screensets.ext.lifecycle_stage.v1~',
  lifecycleHook: 'gts.hai3.screensets.ext.lifecycle_hook.v1~',
} as const;

/** GTS Type IDs for default lifecycle stages (4 stages) - for reference only */
export const HAI3_LIFECYCLE_STAGE_IDS = {
  init: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.init.v1~',
  activated: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.activated.v1~',
  deactivated: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.deactivated.v1~',
  destroyed: 'gts.hai3.screensets.ext.lifecycle_stage.v1~hai3.screensets.lifecycle.destroyed.v1~',
} as const;

/** GTS Type IDs for MF-specific types (2 types) - for reference only */
export const HAI3_MF_TYPE_IDS = {
  mfManifest: 'gts.hai3.screensets.mfe.mf.v1~',
  mfeEntryMf: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~',
} as const;

// NOTE: No registerHai3Types() function needed.
// The GTS plugin registers all first-class schemas during construction.
// See createGtsPlugin() in gts/index.ts for implementation.
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
|  - gts.hai3.screensets.ext.action.v1~acme.analytics.ext.data_updated.v1~|
|  - gts.hai3.screensets.mfe.entry.v1~acme.analytics.mfe.chart_widget.v1~ |
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
Base type:    gts.hai3.screensets.ext.action.v1~
                              |
                              v (extends)
Derived type: gts.hai3.screensets.ext.action.v1~acme.analytics.ext.data_updated.v1~
              +------------ base ------------++---------- vendor qualifier ---------+
```

GTS supports **polymorphic schema resolution**: when the mediator validates an action payload, it uses the derived type's schema (which includes vendor-specific fields) while still recognizing the instance as conforming to the base action contract.

#### Example: Vendor Derived Action Type

A vendor (Acme Analytics) defines a custom action with a vendor-specific payload schema:

```typescript
// Vendor-specific schema extending base Action
// The type ID is extracted from the $id field - no need to specify it separately
const acmeDataUpdatedSchema: JSONSchema = {
  "$id": "gts://gts.hai3.screensets.ext.action.v1~acme.analytics.ext.data_updated.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.ext.action.v1~" }
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

1. **Vendor types are DERIVED types** - They extend HAI3 base types (e.g., `gts.hai3.screensets.ext.action.v1~`) with a vendor qualifier suffix
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

// 2. Register vendor's instances
registry.registerManifest(acmeManifest);
registry.registerEntry(acmeChartWidgetEntry);
registry.registerExtension(acmeChartExtension);
```

### Decision 6: ScreensetsRegistry Configuration

The ScreensetsRegistry requires a Type System plugin at initialization:

```typescript
// packages/screensets/src/mfe/runtime/config.ts

/**
 * Configuration for the ScreensetsRegistry
 */
interface ScreensetsRegistryConfig {
  /** Required: Type System plugin for type handling */
  typeSystem: TypeSystemPlugin;

  /** Optional: Custom error handler */
  onError?: (error: MfeError) => void;

  /** Optional: Custom loading state component */
  loadingComponent?: React.ComponentType;

  /** Optional: Custom error fallback component */
  errorFallbackComponent?: React.ComponentType<{ error: MfeError; retry: () => void }>;

  /** Optional: Enable debug logging */
  debug?: boolean;

  /** MFE loader configuration (enables hosting nested MFEs) */
  mfeHandler?: MfeHandlerConfig;

  /** Initial parent bridge (if loaded as MFE) */
  parentBridge?: MfeBridgeConnection;
}

/**
 * Create the ScreensetsRegistry with required Type System plugin
 */
function createScreensetsRegistry(
  config: ScreensetsRegistryConfig
): ScreensetsRegistry {
  const { typeSystem, ...options } = config;

  // Validate plugin
  if (!typeSystem) {
    throw new Error('ScreensetsRegistry requires a typeSystem');
  }

  // NOTE: No schema registration needed here.
  // The GTS plugin already has all first-class citizen schemas built-in.
  // It is ready to use immediately after creation.

  return new ScreensetsRegistry(typeSystem, options);
}

// Usage with GTS (default)
import { gtsPlugin } from '@hai3/screensets/plugins/gts';

const runtime = createScreensetsRegistry({
  typeSystem: gtsPlugin,
  debug: process.env.NODE_ENV === 'development',
});

// Usage with custom plugin
import { customPlugin } from './my-custom-plugin';

const runtimeWithCustomPlugin = createScreensetsRegistry({
  typeSystem: customPlugin,
});
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
      // Screensets runtime is already initialized by HAI3 core
      // We just need to get the reference and wire it into Flux
      const runtime = framework.get<ScreensetsRegistry>('screensetsRegistry');

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

// Screensets is CORE - automatically initialized by createHAI3()
const app = createHAI3()
  .use(microfrontends())  // No configuration - just enables MFE capabilities
  .build();

// All registration happens dynamically at runtime via actions:
// - mfeActions.registerDomain({ domain })
// - mfeActions.registerExtension({ extension })
// - mfeActions.registerManifest({ manifest })

// Or via runtime API:
// - runtime.registerDomain(domain)
// - runtime.registerExtension(extension)
// - runtime.registerManifest(manifest)

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

### Decision 9: Dynamic uiMeta Validation via Attribute Selector

**Problem:** An `Extension` instance has a `domain` field containing a type ID reference, and its `uiMeta` property must conform to that domain's `extensionsUiMeta` schema. This cannot be expressed as a static JSON Schema constraint because the domain reference is a dynamic value.

**Solution:** Use the plugin's `getAttribute()` method to resolve the domain's `extensionsUiMeta` schema at runtime.

**Implementation:**

```typescript
/**
 * Validate Extension's uiMeta against its domain's extensionsUiMeta schema
 */
function validateExtensionUiMeta(
  plugin: TypeSystemPlugin,
  extension: Extension
): ValidationResult {
  // 1. Get the domain's extensionsUiMeta schema using getAttribute
  const schemaResult = plugin.getAttribute(extension.domain, 'extensionsUiMeta');

  if (!schemaResult.resolved) {
    return {
      valid: false,
      errors: [{
        path: 'domain',
        message: `Cannot resolve extensionsUiMeta from domain '${extension.domain}'`,
        keyword: 'x-gts-attr',
      }],
    };
  }

  // 2. The resolved value is the JSON Schema for uiMeta
  const extensionsUiMetaSchema = schemaResult.value as JSONSchema;

  // 3. Validate extension.uiMeta directly against the resolved schema
  const result = plugin.validateAgainstSchema(extensionsUiMetaSchema, extension.uiMeta);

  // 4. Transform errors to include context
  return {
    valid: result.valid,
    errors: result.errors.map(e => ({
      ...e,
      path: `uiMeta.${e.path}`,
      message: `uiMeta validation failed against ${extension.domain}@extensionsUiMeta: ${e.message}`,
    })),
  };
}
```

**Integration Point:**

The ScreensetsRegistry calls `validateExtensionUiMeta()` during extension registration, after contract matching validation:

```typescript
// In ScreensetsRegistry.registerExtension()
const contractResult = validateContract(entry, domain);
if (!contractResult.valid) {
  throw new ContractValidationError(contractResult.errors);
}

const uiMetaResult = validateExtensionUiMeta(this.typeSystem, extension);
if (!uiMetaResult.valid) {
  throw new UiMetaValidationError(uiMetaResult.errors);
}

// Contract and uiMeta both valid, proceed with registration
```
