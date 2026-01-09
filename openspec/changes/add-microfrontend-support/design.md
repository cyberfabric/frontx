# Design: Add Microfrontend Support

## Context

HAI3 needs to support microfrontend (MFE) architecture where independent applications can be composed into a host application. Each MFE is a separately deployed unit with its own HAI3 state instance. Communication between host and MFE must be explicit, type-safe, and controlled.

The type system for MFE contracts is abstracted through a **Type System Plugin** interface, allowing different type system implementations while shipping GTS as the default.

### Key Principle: Opaque Type IDs

The @hai3/screensets package treats **type IDs as opaque strings**. All type ID understanding (parsing, format validation, building) is delegated to the TypeSystemPlugin. When metadata about a type ID is needed, call plugin methods (`parseTypeId`, `getAttribute`, etc.) directly.

### Stakeholders

- **HAI3 Host Application**: Defines extension domains and orchestrates MFE communication
- **MFE Vendors**: Create independently deployable extensions
- **End Users**: Experience seamless integration of multiple MFEs
- **Type System Providers**: Implement Type System plugin interface for custom type systems

### Constraints

- State isolation: No direct state access between host and MFE
- Type safety: All communication contracts defined via pluggable Type System
- Security: MFEs cannot access host internals
- Performance: Lazy loading of MFE bundles
- Plugin requirement: Type System plugin must be provided at initialization

## Goals / Non-Goals

### Goals

1. **State Isolation**: Each MFE has its own HAI3 state instance
2. **Symmetric Contracts**: Clear bidirectional communication contracts
3. **Contract Validation**: Compile-time and runtime validation of compatibility
4. **Mediated Actions**: Centralized action chain delivery through ActionsChainsMediator
5. **Hierarchical Domains**: Support nested extension points
6. **Pluggable Type System**: Abstract Type System as a plugin with GTS as default
7. **Opaque Type IDs**: Screensets package treats type IDs as opaque strings

### Non-Goals

1. **Direct State Sharing**: No shared Redux store between host and MFE
2. **Event Bus Bridging**: No automatic event propagation across boundaries
3. **Hot Module Replacement**: MFE updates require reload
4. **Version Negotiation**: Single version per MFE entry
5. **Multiple Concurrent Plugins**: Only one Type System plugin per application instance

## Decisions

### Decision 1: Type System Plugin Interface

The @hai3/screensets package defines a `TypeSystemPlugin` interface that abstracts type system operations. This allows different type system implementations while shipping GTS as the default.

The screensets package treats type IDs as **opaque strings**. The plugin is responsible for all type ID parsing, validation, and building.

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
   * Register a JSON Schema for a type ID
   */
  registerSchema(typeId: string, schema: JSONSchema): void;

  /**
   * Validate an instance against the schema for a type ID
   */
  validateInstance(typeId: string, instance: unknown): ValidationResult;

  /**
   * Get the schema registered for a type ID
   */
  getSchema(typeId: string): JSONSchema | undefined;

  // === Query ===

  /**
   * Query registered type IDs matching a pattern
   */
  query(pattern: string, limit?: number): string[];

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

The GTS plugin implements `TypeSystemPlugin` using `@globaltypesystem/gts-ts`:

```typescript
// packages/screensets/src/mfe/plugins/gts/index.ts
import { Gts, GtsStore, GtsQuery } from '@globaltypesystem/gts-ts';
import type { TypeSystemPlugin, ValidationResult } from '../types';

export function createGtsPlugin(): TypeSystemPlugin {
  const gtsStore = new GtsStore();

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

    // Schema registry
    registerSchema(typeId: string, schema: JSONSchema): void {
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

    getSchema(typeId: string): JSONSchema | undefined {
      return gtsStore.getSchema(typeId);
    },

    // Query
    query(pattern: string, limit?: number): string[] {
      return GtsQuery.search(gtsStore, pattern, { limit });
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
export const gtsPlugin = createGtsPlugin();
```

### Decision 2: GTS Type ID Format and Registration

The GTS type ID format follows the structure: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### HAI3 GTS Type IDs

The type system is organized into **6 core types** that define the contract model, plus **2 MF-specific types** for Module Federation loading:

**Core Types (6 total):**

| Type | GTS Type ID | Purpose |
|------|-------------|---------|
| MFE Entry (Abstract) | `gts.hai3.screensets.mfe.entry.v1~` | Pure contract type (abstract base) |
| Extension Domain | `gts.hai3.screensets.ext.domain.v1~` | Extension point contract |
| Extension | `gts.hai3.screensets.ext.extension.v1~` | Extension binding |
| Shared Property | `gts.hai3.screensets.ext.shared_property.v1~` | Property definition |
| Action | `gts.hai3.screensets.ext.action.v1~` | Action type with target and self-id |
| Actions Chain | `gts.hai3.screensets.ext.actions_chain.v1~` | Action chain for mediation |

**MF-Specific Types (2 total):**

| Type | GTS Type ID | Purpose |
|------|-------------|---------|
| MF Manifest | `gts.hai3.screensets.mfe.mf.v1~` | Module Federation manifest (standalone) |
| MFE Entry MF (Derived) | `gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~` | Module Federation entry with manifest reference |

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

#### Complete GTS JSON Schema Definitions

**1. MFE Entry Schema (Abstract Base):**

MfeEntry is the **abstract base type** for all entry contracts. It defines ONLY the communication interface (properties, actions). Derived types add loader-specific fields.

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "requiredProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" },
      "$comment": "SharedProperty type IDs that MUST be provided by the domain"
    },
    "optionalProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" },
      "$comment": "SharedProperty type IDs that MAY be provided by the domain"
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs this entry can emit to the domain"
    },
    "domainActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs this entry can receive from the domain"
    }
  },
  "required": ["id", "requiredProperties", "actions", "domainActions"]
}
```

**1a. MFE Entry MF Schema (Derived - Module Federation):**

The Module Federation derived type adds fields specific to Webpack 5 / Rspack Module Federation 2.0 implementation.

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [
    { "$ref": "gts://gts.hai3.screensets.mfe.entry.v1~" }
  ],
  "properties": {
    "manifest": {
      "x-gts-ref": "gts.hai3.screensets.mfe.mf.v1~*",
      "$comment": "Reference to MfManifest type ID containing Module Federation config"
    },
    "exposedModule": {
      "type": "string",
      "minLength": 1,
      "$comment": "Module Federation exposed module name (e.g., './ChartWidget')"
    }
  },
  "required": ["manifest", "exposedModule"]
}
```

**2. MF Manifest Schema (Standalone):**

MfManifest is a **standalone type** containing Module Federation configuration.

```json
{
  "$id": "gts://gts.hai3.screensets.mfe.mf.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "remoteEntry": {
      "type": "string",
      "format": "uri",
      "$comment": "URL to the remoteEntry.js file"
    },
    "remoteName": {
      "type": "string",
      "minLength": 1,
      "$comment": "Module Federation container name"
    },
    "sharedDependencies": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "$comment": "Package name (e.g., 'react', 'lodash')" },
          "requiredVersion": { "type": "string", "$comment": "Semver range (e.g., '^18.0.0')" },
          "singleton": {
            "type": "boolean",
            "default": false,
            "$comment": "If true, share single instance. Default false = code shared but instances isolated."
          }
        },
        "required": ["name", "requiredVersion"]
      },
      "$comment": "Dependencies to share for bundle optimization. singleton defaults to false (isolated instances)."
    },
    "entries": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~*" },
      "$comment": "Convenience field for discovery - lists MfeEntryMF type IDs"
    }
  },
  "required": ["id", "remoteEntry", "remoteName"]
}
```

**MfeEntry Type Hierarchy:**

```
gts.hai3.screensets.mfe.entry.v1~ (Base - Abstract Contract)
  |-- id: string (GTS type ID)
  |-- requiredProperties: x-gts-ref[] -> gts.hai3.screensets.ext.shared_property.v1~*
  |-- optionalProperties?: x-gts-ref[] -> gts.hai3.screensets.ext.shared_property.v1~*
  |-- actions: x-gts-ref[] -> gts.hai3.screensets.ext.action.v1~*
  |-- domainActions: x-gts-ref[] -> gts.hai3.screensets.ext.action.v1~*
  |
  +-- gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~ (Module Federation)
        |-- (inherits contract fields from base)
        |-- manifest: x-gts-ref -> gts.hai3.screensets.mfe.mf.v1~*
        |-- exposedModule: string

gts.hai3.screensets.mfe.mf.v1~ (Standalone - Module Federation Config)
  |-- id: string (GTS type ID)
  |-- remoteEntry: string (URL)
  |-- remoteName: string
  |-- sharedDependencies?: SharedDependencyConfig[] (code sharing + optional instance sharing)
  |     |-- name: string
  |     |-- requiredVersion: string
  |     |-- singleton?: boolean (default: false = isolated instances)
  |-- entries?: x-gts-ref[] -> gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~*
```

**3. Extension Domain Schema (Base):**

```json
{
  "$id": "gts://gts.hai3.screensets.ext.domain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "sharedProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" }
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs domain can emit to extensions"
    },
    "extensionsActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
      "$comment": "Action type IDs domain can receive from extensions"
    },
    "extensionsUiMeta": { "type": "object" },
    "defaultActionTimeout": {
      "type": "number",
      "minimum": 1,
      "$comment": "Default timeout in milliseconds for actions targeting this domain. REQUIRED. All actions use this unless they specify their own timeout override."
    }
  },
  "required": ["id", "sharedProperties", "actions", "extensionsActions", "extensionsUiMeta", "defaultActionTimeout"]
}
```

**4. Extension Schema:**

```json
{
  "$id": "gts://gts.hai3.screensets.ext.extension.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this instance"
    },
    "domain": {
      "x-gts-ref": "gts.hai3.screensets.ext.domain.v1~*",
      "$comment": "ExtensionDomain type ID to mount into"
    },
    "entry": {
      "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~*",
      "$comment": "MfeEntry type ID to mount"
    },
    "uiMeta": {
      "type": "object",
      "$comment": "Must conform to the domain's extensionsUiMeta schema"
    }
  },
  "required": ["id", "domain", "entry", "uiMeta"]
}
```

**5. Shared Property Schema:**

```json
{
  "$id": "gts://gts.hai3.screensets.ext.shared_property.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "id": {
      "x-gts-ref": "/$id",
      "$comment": "The GTS type ID for this shared property"
    },
    "value": {
      "$comment": "The shared property value"
    }
  },
  "required": ["id", "value"]
}
```

**6. Action Schema:**

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
    },
    "timeout": {
      "type": "number",
      "minimum": 1,
      "$comment": "Optional timeout override in milliseconds. If not specified, uses target domain's defaultActionTimeout."
    }
  },
  "required": ["type", "target"]
}
```

**7. Actions Chain Schema:**

ActionsChain contains actual Action INSTANCES (embedded objects), not references. ActionsChain itself is NOT referenced by other types, so it has no `id` field.

```json
{
  "$id": "gts://gts.hai3.screensets.ext.actions_chain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "action": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.action.v1~"
    },
    "next": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~"
    },
    "fallback": {
      "type": "object",
      "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~"
    }
  },
  "required": ["action"]
}
```

### Decision 3: Internal TypeScript Type Definitions

The MFE system uses internal TypeScript interfaces with a simple `id: string` field as the identifier. When metadata is needed about a type ID, call `plugin.parseTypeId(id)` directly.

#### TypeScript Interface Definitions

All MFE types use `id: string` as their identifier:

```typescript
// packages/screensets/src/mfe/types/index.ts

/**
 * Defines an entry point with its communication contract (PURE CONTRACT - Abstract Base)
 * GTS Type: gts.hai3.screensets.mfe.entry.v1~
 */
interface MfeEntry {
  /** The GTS type ID for this entry */
  id: string;
  /** SharedProperty type IDs that MUST be provided by domain */
  requiredProperties: string[];
  /** SharedProperty type IDs that MAY be provided by domain (optional field) */
  optionalProperties?: string[];
  /** Action type IDs this entry can emit to the domain */
  actions: string[];
  /** Action type IDs this entry can receive from the domain */
  domainActions: string[];
}

/**
 * Module Federation 2.0 implementation of MfeEntry
 * GTS Type: gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~
 */
interface MfeEntryMF extends MfeEntry {
  /** Reference to MfManifest type ID containing Module Federation config */
  manifest: string;
  /** Module Federation exposed module name (e.g., './ChartWidget') */
  exposedModule: string;
}

/**
 * Module Federation manifest containing shared configuration
 * GTS Type: gts.hai3.screensets.mfe.mf.v1~
 */
interface MfManifest {
  /** The GTS type ID for this manifest */
  id: string;
  /** URL to the remoteEntry.js file */
  remoteEntry: string;
  /** Module Federation container name */
  remoteName: string;
  /** Optional override for shared dependency configuration */
  sharedDependencies?: SharedDependencyConfig[];
  /** Convenience field for discovery - lists MfeEntryMF type IDs */
  entries?: string[];
}

/**
 * Configuration for a shared dependency in Module Federation.
 *
 * Module Federation shared dependencies provide TWO independent benefits:
 * 1. **Code/bundle sharing** - Download the code once, cache it (performance)
 * 2. **Runtime instance isolation** - Control whether instances are shared or isolated
 *
 * These benefits are NOT mutually exclusive! The `singleton` parameter controls
 * instance behavior while code sharing always provides the bundle optimization.
 *
 * - `singleton: false` (DEFAULT) = Code shared, instances ISOLATED per MFE
 * - `singleton: true` = Code shared, instance SHARED across all consumers
 *
 * HAI3 Recommendation:
 * - Use `singleton: false` (default) for anything with state (React, @hai3/*, GTS)
 * - Use `singleton: true` ONLY for truly stateless utilities (lodash, date-fns)
 */
interface SharedDependencyConfig {
  /** Package name (e.g., 'react', 'lodash', '@hai3/screensets') */
  name: string;
  /** Semver range (e.g., '^18.0.0', '^4.17.0') */
  requiredVersion: string;
  /**
   * Whether to share a single instance across all consumers.
   * Default: false (each consumer gets its own isolated instance)
   *
   * - false: Code is shared (cached), but each MFE gets its OWN instance
   * - true: Code is shared AND the same instance is used everywhere
   *
   * IMPORTANT: Only set to true for truly stateless utilities (lodash, date-fns).
   * Libraries with state (React, Redux, GTS, @hai3/*) should use false.
   */
  singleton?: boolean;
}

/**
 * Defines an extension point (domain) where MFEs can be mounted
 * GTS Type: gts.hai3.screensets.ext.domain.v1~
 */
interface ExtensionDomain {
  /** The GTS type ID for this domain */
  id: string;
  /** SharedProperty type IDs provided to extensions */
  sharedProperties: string[];
  /** Action type IDs domain can emit to extensions */
  actions: string[];
  /** Action type IDs domain can receive from extensions */
  extensionsActions: string[];
  /** JSON Schema for UI metadata extensions must provide */
  extensionsUiMeta: JSONSchema;
  /** Default timeout for actions targeting this domain (milliseconds, REQUIRED) */
  defaultActionTimeout: number;
}

/**
 * Binds an MFE entry to an extension domain
 * GTS Type: gts.hai3.screensets.ext.extension.v1~
 */
interface Extension {
  /** The GTS type ID for this extension */
  id: string;
  /** ExtensionDomain type ID to mount into */
  domain: string;
  /** MfeEntry type ID to mount */
  entry: string;
  /** UI metadata instance conforming to domain's extensionsUiMeta schema */
  uiMeta: Record<string, unknown>;
}

/**
 * Defines a shared property instance passed from domain to extension
 * GTS Type: gts.hai3.screensets.ext.shared_property.v1~
 */
interface SharedProperty {
  /** The GTS type ID for this shared property */
  id: string;
  /** The shared property value */
  value: unknown;
}

/**
 * An action with target, self-identifying type, and optional payload
 * GTS Type: gts.hai3.screensets.ext.action.v1~
 */
interface Action {
  /** Self-reference to this action's type ID */
  type: string;
  /** Target type ID (ExtensionDomain or Extension) */
  target: string;
  /** Optional action payload */
  payload?: unknown;
  /** Optional timeout override in milliseconds (overrides domain's defaultActionTimeout) */
  timeout?: number;
}

/**
 * Defines a mediated chain of actions with success/failure branches
 * GTS Type: gts.hai3.screensets.ext.actions_chain.v1~
 *
 * Contains actual Action INSTANCES (embedded objects).
 * ActionsChain is NOT referenced by other types, so it has NO id field.
 */
interface ActionsChain {
  /** Action instance (embedded object) */
  action: Action;
  /** Next chain to execute on success */
  next?: ActionsChain;
  /** Fallback chain to execute on failure */
  fallback?: ActionsChain;
}
```

### Decision 4: HAI3 Type Registration via Plugin

When initializing the ScreensetsRuntime with the GTS plugin, HAI3 types are registered. There are 6 core types plus 2 MF-specific types:

```typescript
// packages/screensets/src/mfe/init.ts

import { mfeGtsSchemas } from './schemas/gts-schemas';

/** GTS Type IDs for HAI3 MFE core types (6 types) */
const HAI3_CORE_TYPE_IDS = {
  mfeEntry: 'gts.hai3.screensets.mfe.entry.v1~',
  extensionDomain: 'gts.hai3.screensets.ext.domain.v1~',
  extension: 'gts.hai3.screensets.ext.extension.v1~',
  sharedProperty: 'gts.hai3.screensets.ext.shared_property.v1~',
  action: 'gts.hai3.screensets.ext.action.v1~',
  actionsChain: 'gts.hai3.screensets.ext.actions_chain.v1~',
} as const;

/** GTS Type IDs for MF-specific types (2 types) */
const HAI3_MF_TYPE_IDS = {
  mfManifest: 'gts.hai3.screensets.mfe.mf.v1~',
  mfeEntryMf: 'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~',
} as const;

function registerHai3Types(
  plugin: TypeSystemPlugin
): { core: typeof HAI3_CORE_TYPE_IDS; mf: typeof HAI3_MF_TYPE_IDS } {
  // Register core schemas (6 types)
  plugin.registerSchema(HAI3_CORE_TYPE_IDS.mfeEntry, mfeGtsSchemas.mfeEntry);
  plugin.registerSchema(HAI3_CORE_TYPE_IDS.extensionDomain, mfeGtsSchemas.extensionDomain);
  plugin.registerSchema(HAI3_CORE_TYPE_IDS.extension, mfeGtsSchemas.extension);
  plugin.registerSchema(HAI3_CORE_TYPE_IDS.sharedProperty, mfeGtsSchemas.sharedProperty);
  plugin.registerSchema(HAI3_CORE_TYPE_IDS.action, mfeGtsSchemas.action);
  plugin.registerSchema(HAI3_CORE_TYPE_IDS.actionsChain, mfeGtsSchemas.actionsChain);

  // Register MF-specific schemas (2 types)
  plugin.registerSchema(HAI3_MF_TYPE_IDS.mfManifest, mfeGtsSchemas.mfManifest);
  plugin.registerSchema(HAI3_MF_TYPE_IDS.mfeEntryMf, mfeGtsSchemas.mfeEntryMf);

  return { core: HAI3_CORE_TYPE_IDS, mf: HAI3_MF_TYPE_IDS };
}
```

### Decision 5: ScreensetsRuntime Configuration

The ScreensetsRuntime requires a Type System plugin at initialization:

```typescript
// packages/screensets/src/mfe/runtime/config.ts

/**
 * Configuration for the ScreensetsRuntime
 */
interface ScreensetsRuntimeConfig {
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
  mfeLoader?: MfeLoaderConfig;

  /** Initial parent bridge (if loaded as MFE) */
  parentBridge?: MfeBridgeConnection;
}

/**
 * Create the ScreensetsRuntime with required Type System plugin
 */
function createScreensetsRuntime(
  config: ScreensetsRuntimeConfig
): ScreensetsRuntime {
  const { typeSystem, ...options } = config;

  // Validate plugin
  if (!typeSystem) {
    throw new Error('ScreensetsRuntime requires a typeSystem');
  }

  // Register HAI3 types (6 core + 2 MF-specific)
  const typeIds = registerHai3Types(typeSystem);

  return new ScreensetsRuntime(typeSystem, typeIds, options);
}

// Usage with GTS (default)
import { gtsPlugin } from '@hai3/screensets/plugins/gts';

const runtime = createScreensetsRuntime({
  typeSystem: gtsPlugin,
  debug: process.env.NODE_ENV === 'development',
});

// Usage with custom plugin
import { customPlugin } from './my-custom-plugin';

const runtimeWithCustomPlugin = createScreensetsRuntime({
  typeSystem: customPlugin,
});
```

### Decision 6: Plugin Propagation to Framework

The @hai3/framework microfrontends plugin accepts the Type System plugin from screensets:

```typescript
// packages/framework/src/plugins/microfrontends/index.ts

interface MicrofrontendsPluginConfig {
  /** Type System plugin inherited from screensets configuration */
  typeSystem: TypeSystemPlugin;

  /** Base domains to register */
  baseDomains?: Array<'sidebar' | 'popup' | 'screen' | 'overlay'>;
}

function createMicrofrontendsPlugin(
  config: MicrofrontendsPluginConfig
): FrameworkPlugin {
  return {
    name: 'microfrontends',

    setup(framework) {
      // Create runtime with provided plugin
      const runtime = createScreensetsRuntime({
        typeSystem: config.typeSystem,
      });

      // Register base domains if specified
      if (config.baseDomains) {
        for (const domain of config.baseDomains) {
          runtime.registerDomain(getBaseDomain(domain, config.typeSystem));
        }
      }

      // Expose runtime to framework
      framework.provide('screensetsRuntime', runtime);
    },
  };
}

// App initialization example
import { createFramework } from '@hai3/framework';
import { gtsPlugin } from '@hai3/screensets/plugins/gts';

const app = createFramework({
  plugins: [
    createMicrofrontendsPlugin({
      typeSystem: gtsPlugin,
      baseDomains: ['sidebar', 'popup', 'screen', 'overlay'],
    }),
  ],
});
```

### Decision 7: Contract Matching Rules

For an MFE entry to be mountable into an extension domain, the following conditions must ALL be true:

```
1. entry.requiredProperties  SUBSET_OF  domain.sharedProperties
   (domain provides all required properties)

2. entry.actions             SUBSET_OF  domain.extensionsActions
   (domain can receive all actions entry emits)

3. domain.actions            SUBSET_OF  entry.domainActions
   (entry can handle all actions domain emits)
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

  // Rule 2: Entry actions
  for (const action of entry.actions) {
    if (!domain.extensionsActions.includes(action)) {
      errors.push({
        type: 'unsupported_action',
        details: `Entry emits action '${action}' not accepted by domain`
      });
    }
  }

  // Rule 3: Domain actions
  for (const action of domain.actions) {
    if (!entry.domainActions.includes(action)) {
      errors.push({
        type: 'unhandled_domain_action',
        details: `Domain emits action '${action}' not handled by entry`
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Decision 8: Dynamic uiMeta Validation via Attribute Selector

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

  // 3. Create a temporary type for validation
  const tempTypeId = `${extension.id}:uiMeta:validation`;
  plugin.registerSchema(tempTypeId, extensionsUiMetaSchema);

  // 4. Validate extension.uiMeta against the resolved schema
  const result = plugin.validateInstance(tempTypeId, extension.uiMeta);

  // 5. Transform errors to include context
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

The ScreensetsRuntime calls `validateExtensionUiMeta()` during extension registration, after contract matching validation:

```typescript
// In ScreensetsRuntime.registerExtension()
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

### Decision 9: Isolated Runtime Instances (Framework-Agnostic)

Each MFE instance runs with its own FULLY ISOLATED runtime:
- Own @hai3/screensets instance
- Own TypeSystemPlugin instance (with own schema registry)
- Own @hai3/state container
- Can use ANY UI framework (Vue 3, Angular, Svelte, etc.)

The host uses React, but MFEs are NOT required to use React.

**Architecture:**
```
+---------------------------+      +---------------------------+
|      HOST RUNTIME         |      |       MFE RUNTIME         |
|  (React + TypeSystemA)    |      |  (Vue 3 + TypeSystemB)    |
+---------------------------+      +---------------------------+
|   TypeSystemPlugin A      |      |   TypeSystemPlugin B      |
|   (host schemas only)     |      |   (MFE schemas only)      |
+---------------------------+      +---------------------------+
|   HAI3 State Instance A   |      |   HAI3 State Instance B   |
+---------------------------+      +---------------------------+
|   React Host Component    |      |   Vue 3 MFE Component     |
+-------------+-------------+      +-------------+-------------+
              |                                  |
              |    MfeBridge (Contract)          |
              +==================================+
              |  - Shared Properties (read-only) |
              |  - Actions (bidirectional)       |
              +==================================+
              |                                  |
              |  RuntimeCoordinator (PRIVATE)    |
              |  (WeakMap<Element, Connection>)  |
              +----------------------------------+
```

**Key Points:**
- No direct store access across boundary
- No direct schema registry access across boundary (security)
- Shared properties passed via MfeBridge only
- Actions delivered via ActionsChainsMediator through MfeBridge
- Internal coordination via private RuntimeCoordinator (not exposed to MFE code)
- MFEs can use ANY UI framework - not limited to React

### Decision 10: Actions Chain Mediation

The **ActionsChainsMediator** delivers action chains to targets and handles success/failure branching. The Type System plugin validates all type IDs and payloads.

**Execution Flow:**
```
1. ActionsChainsMediator receives chain
2. Validate chain.action.target via typeSystem.isValidTypeId()
3. Resolve target (domain or entry instance)
4. Validate action against target's contract
5. Validate payload via typeSystem.validateInstance()
6. Deliver payload to target
7. Wait for result (Promise<success|failure>)
8. If success AND chain.next: mediator executes chain.next
9. If failure AND chain.fallback: mediator executes chain.fallback
10. Recurse until no next/fallback
```

**API Contract:**

```typescript
/**
 * ActionsChainsMediator - Mediates action chain delivery between domains and extensions.
 */
interface ActionsChainsMediator {
  /** The Type System plugin used by this mediator */
  readonly typeSystem: TypeSystemPlugin;

  /**
   * Execute an action chain, routing to targets and handling success/failure branching.
   * @param chain - The actions chain to execute
   * @param options - Optional per-request execution options (override defaults)
   */
  executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /** Register an extension's action handler for receiving actions */
  registerExtensionHandler(
    extensionId: string,
    domainId: string,
    entryId: string,
    handler: ActionHandler
  ): void;

  /** Unregister an extension's action handler */
  unregisterExtensionHandler(extensionId: string): void;

  /** Register a domain's action handler for receiving actions from extensions */
  registerDomainHandler(
    domainId: string,
    handler: ActionHandler
  ): void;
}

interface ActionHandler {
  handleAction(actionId: string, payload: unknown): Promise<void>;
}

interface ChainResult {
  completed: boolean;
  path: string[];  // Action IDs executed
  error?: string;  // If failed
}
```

### Decision 11: Hierarchical Extension Domains

Extension domains can be hierarchical. HAI3 provides base layout domains, and vendor screensets can define their own. Base domains are registered via the Type System plugin.

**Base Layout Domains (registered via plugin):**

When using GTS plugin, base domains follow the format `gts.hai3.screensets.ext.domain.<layout>.v1~`:
- `gts.hai3.screensets.ext.domain.sidebar.v1~` - Sidebar panels
- `gts.hai3.screensets.ext.domain.popup.v1~` - Modal popups
- `gts.hai3.screensets.ext.domain.screen.v1~` - Full screen views
- `gts.hai3.screensets.ext.domain.overlay.v1~` - Floating overlays

**Vendor-Defined Domains:**

Vendors define their own domains following the GTS type ID format:

```typescript
// Example: Dashboard screenset defines widget slot domain
// Type ID: gts.acme.dashboard.ext.domain.widget_slot.v1~

const widgetSlotDomain: ExtensionDomain = {
  id: 'gts.acme.dashboard.ext.domain.widget_slot.v1~',
  sharedProperties: [
    'gts.hai3.screensets.ext.shared_property.user_context.v1~',
  ],
  actions: [
    'gts.acme.dashboard.ext.action.refresh.v1~',
  ],
  extensionsActions: [
    'gts.acme.dashboard.ext.action.data_update.v1~',
  ],
  extensionsUiMeta: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      icon: { type: 'string' },
      size: { enum: ['small', 'medium', 'large'] },
    },
    required: ['title', 'size'],
  },
};
```

### Decision 12: Module Federation 2.0 for Bundle Loading

**What**: Use Webpack 5 / Rspack Module Federation 2.0 for loading remote MFE bundles.

**Why**:
- Mature ecosystem with TypeScript type generation
- Shared dependency configuration with independent control over code sharing and instance isolation
- Battle-tested at scale (Zara, IKEA, others)
- Works with existing HAI3 Vite build (via `@originjs/vite-plugin-federation`)

#### Shared Dependencies Model

Module Federation's shared dependencies provide TWO independent benefits:

1. **Code/Bundle Sharing** (Performance)
   - When a dependency is listed in `shared`, the code is downloaded once and cached
   - All consumers (host and MFEs) use the cached bundle
   - This reduces total download size and improves load times

2. **Runtime Instance Control** (Isolation vs Sharing)
   - The `singleton` flag controls whether consumers share the same instance
   - `singleton: false` (DEFAULT): Each consumer gets its OWN instance from the shared code
   - `singleton: true`: All consumers share the SAME instance

**Key Insight**: These benefits are NOT mutually exclusive. With `singleton: false`, you get BOTH:
- Code is shared (bundle optimization)
- Instances are isolated (runtime isolation)

#### Why `singleton: false` is the Correct Default

HAI3's architecture requires runtime isolation between MFEs. Setting `singleton: false` ensures:

1. **React State Isolation**: Each MFE has its own React context, hooks state, and reconciler
2. **TypeSystemPlugin Isolation**: Each MFE's schema registry is isolated (security requirement)
3. **@hai3/screensets Isolation**: Each MFE has its own state container

Without this isolation, MFEs could:
- Corrupt each other's React state
- Discover host schemas via `plugin.query('gts.*')` (security violation)
- Interfere with each other's state management

#### When `singleton: true` is Safe

Only use `singleton: true` for libraries that are **truly stateless**:

| Library | singleton | Reason |
|---------|-----------|--------|
| lodash | `true` | Pure functions, no internal state |
| date-fns | `true` | Pure functions, no internal state |
| uuid | `true` | Pure functions, no internal state |
| React | `false` | Has hooks state, context, reconciler |
| ReactDOM | `false` | Has fiber tree, event system |
| @hai3/* | `false` | Has TypeSystemPlugin, schema registry |
| GTS | `false` | Has schema registry |
| Redux/Zustand | `false` | Has store state |

#### Performance vs Isolation Trade-offs

| Configuration | Bundle Size | Memory | Isolation |
|--------------|-------------|--------|-----------|
| Not in `shared` | Duplicated | Duplicated | Full |
| `shared` + `singleton: false` | Shared | Duplicated | Full |
| `shared` + `singleton: true` | Shared | Shared | None |

**HAI3 Recommendation**: Use `singleton: false` for all stateful libraries. The memory overhead of duplicate instances is negligible compared to the complexity of debugging shared state issues across MFE boundaries.

**MfeLoader Implementation:**

The MfeLoader uses the `MfeEntryMF` derived type which references an `MfManifest`:

```typescript
// packages/screensets/src/mfe/loader/index.ts

interface MfeLoaderConfig {
  /** Timeout for bundle loading in ms (default: 30000) */
  timeout?: number;
  /** Retry attempts on load failure (default: 2) */
  retries?: number;
  /** Enable preloading of known MFEs */
  preload?: boolean;
}

interface LoadedMfe {
  /** The loaded React component */
  component: React.ComponentType<MfeBridgeProps>;
  /** The entry that was loaded (Module Federation variant) */
  entry: MfeEntryMF;
  /** The manifest used for loading */
  manifest: MfManifest;
  /** Cleanup function to unload the MFE */
  unload: () => void;
}

/**
 * MFE Loader using Module Federation 2.0
 */
class MfeLoader {
  /** GTS Type ID for Module Federation MFE entries */
  private static readonly MF_ENTRY_TYPE_ID =
    'gts.hai3.screensets.mfe.entry.v1~hai3.mfe.entry_mf.v1~';

  /** GTS Type ID for Module Federation manifests */
  private static readonly MF_MANIFEST_TYPE_ID =
    'gts.hai3.screensets.mfe.mf.v1~';

  // Cache of loaded manifests by type ID
  private loadedManifests = new Map<string, MfManifest>();
  // Cache of loaded containers by remoteName
  private loadedContainers = new Map<string, Container>();

  constructor(
    private typeSystem: TypeSystemPlugin,
    private config: MfeLoaderConfig = {}
  ) {}

  /**
   * Load an MFE from its MfeEntryMF definition
   */
  async load(entry: MfeEntryMF): Promise<LoadedMfe> {
    // 1. Validate entry against Module Federation entry schema
    const entryValidation = this.typeSystem.validateInstance(
      MfeLoader.MF_ENTRY_TYPE_ID,
      entry
    );
    if (!entryValidation.valid) {
      throw new MfeLoadError('Invalid MfeEntryMF', entryValidation.errors);
    }

    // 2. Resolve and validate manifest
    const manifest = await this.resolveManifest(entry.manifest);

    // 3. Load remote container (cached per remoteName)
    const container = await this.loadRemoteContainer(manifest);

    // 4. Get the exposed module using entry.exposedModule
    const moduleFactory = await container.get(entry.exposedModule);
    if (!moduleFactory) {
      throw new MfeLoadError(
        `Module '${entry.exposedModule}' not found in container '${manifest.remoteName}'`,
        []
      );
    }
    const module = moduleFactory();

    return {
      component: module.default,
      entry,
      manifest,
      unload: () => this.unloadIfUnused(manifest.remoteName),
    };
  }

  private async resolveManifest(manifestTypeId: string): Promise<MfManifest> {
    if (this.loadedManifests.has(manifestTypeId)) {
      return this.loadedManifests.get(manifestTypeId)!;
    }

    const manifest = await this.fetchManifestInstance(manifestTypeId);

    const validation = this.typeSystem.validateInstance(
      MfeLoader.MF_MANIFEST_TYPE_ID,
      manifest
    );
    if (!validation.valid) {
      throw new MfeLoadError('Invalid MfManifest', validation.errors);
    }

    this.loadedManifests.set(manifestTypeId, manifest);
    return manifest;
  }

  private async loadRemoteContainer(manifest: MfManifest): Promise<Container> {
    if (this.loadedContainers.has(manifest.remoteName)) {
      return this.loadedContainers.get(manifest.remoteName)!;
    }

    await this.loadScript(manifest.remoteEntry);

    const container = (window as any)[manifest.remoteName];
    if (!container) {
      throw new MfeLoadError(
        `Container '${manifest.remoteName}' not found after loading ${manifest.remoteEntry}`,
        []
      );
    }

    await container.init(__webpack_share_scopes__.default);

    this.loadedContainers.set(manifest.remoteName, container);
    return container;
  }

  async preload(entries: MfeEntryMF[]): Promise<void> {
    const byManifest = new Map<string, MfeEntryMF[]>();
    for (const entry of entries) {
      const existing = byManifest.get(entry.manifest) || [];
      existing.push(entry);
      byManifest.set(entry.manifest, existing);
    }

    await Promise.allSettled(
      Array.from(byManifest.keys()).map(async (manifestId) => {
        const manifest = await this.resolveManifest(manifestId);
        await this.loadRemoteContainer(manifest);
      })
    );
  }

  private async loadScript(url: string): Promise<void> {
    // Script loading with timeout and error handling
  }

  private unloadIfUnused(remoteName: string): void {
    // Cleanup logic
  }

  private async fetchManifestInstance(manifestTypeId: string): Promise<MfManifest> {
    // Fetch manifest from registry or remote endpoint
    throw new Error('Not implemented');
  }
}
```

**Example MfManifest Instance:**

```typescript
const analyticsManifest: MfManifest = {
  id: 'gts.acme.analytics.mfe.mf.v1~',
  remoteEntry: 'https://cdn.acme.com/analytics/remoteEntry.js',
  remoteName: 'acme_analytics',
  // sharedDependencies configures Module Federation code sharing.
  // Two benefits are controlled independently:
  // 1. Code sharing (always) - download once, cache it
  // 2. Instance sharing (singleton flag) - share instance or isolate
  sharedDependencies: [
    // React/ReactDOM: Code shared for bundle optimization, but singleton: false
    // ensures each MFE gets its own React instance (isolation preserved)
    { name: 'react', requiredVersion: '^18.0.0', singleton: false },
    { name: 'react-dom', requiredVersion: '^18.0.0', singleton: false },
    // Stateless utilities: singleton: true is safe (no state to isolate)
    { name: 'lodash', requiredVersion: '^4.17.0', singleton: true },
    { name: 'date-fns', requiredVersion: '^2.30.0', singleton: true },
    // @hai3/* packages: Must use singleton: false for runtime isolation
    // Or omit entirely if this MFE doesn't need to share code with host
    // { name: '@hai3/screensets', requiredVersion: '^1.0.0', singleton: false },
  ],
  entries: [
    'gts.acme.analytics.mfe.entry.v1~hai3.mfe.entry_mf.v1:chart',
    'gts.acme.analytics.mfe.entry.v1~hai3.mfe.entry_mf.v1:metrics',
  ],
};
```

**Example MfeEntryMF Instance:**

```typescript
const chartEntry: MfeEntryMF = {
  id: 'gts.acme.analytics.mfe.entry.v1~hai3.mfe.entry_mf.v1:chart',
  requiredProperties: [
    'gts.hai3.screensets.ext.shared_property.v1~:user_context',
    'gts.hai3.screensets.ext.shared_property.v1~:selected_date_range',
  ],
  optionalProperties: [
    'gts.hai3.screensets.ext.shared_property.v1~:theme',
  ],
  actions: ['gts.acme.analytics.ext.action.data_updated.v1~'],
  domainActions: ['gts.acme.analytics.ext.action.refresh.v1~'],
  manifest: 'gts.acme.analytics.mfe.mf.v1~',
  exposedModule: './ChartWidget',
};
```

### Decision 13: Framework-Agnostic Isolation Model

**What**: MFEs are completely isolated with their own runtime instances. Each MFE can use ANY UI framework (React, Vue 3, Angular, Svelte, etc.) - the host uses React but MFEs are framework-agnostic.

**Key Architectural Principle**: Complete Isolation

Each MFE runtime instance has:
- Its own `@hai3/screensets` instance (NOT singleton)
- Its own `TypeSystemPlugin` instance (NOT singleton)
- Its own isolated schema registry
- No direct access to host or other MFE internals

**Why Complete GTS Isolation is Required**:

If GTS/TypeSystemPlugin were shared as a singleton:
1. **Security Violation**: MFEs could call `plugin.query('gts.*')` and discover ALL registered types from the host and other MFEs
2. **Information Leakage**: An MFE could learn about host's internal domain structure, other MFE contracts, and business logic encoded in type schemas
3. **Contract Violation**: MFEs should ONLY know about their own contract with the host domain - nothing more

With isolated TypeSystemPlugin per runtime:
- Each MFE's plugin only contains schemas for that MFE's contract types
- Host's plugin contains host-specific schemas (domains, extensions)
- No cross-boundary schema discovery is possible

**Why Framework Agnostic**:

1. **Vendor Extensibility**: Third-party vendors may use Vue 3, Angular, or other frameworks for their MFEs
2. **No React Dependency**: MFEs are NOT required to use React - only the host uses React
3. **Technology Freedom**: Each MFE team chooses their own framework and tooling

**Internal Runtime Coordination**:

Host and MFE runtimes need to coordinate (property updates, action delivery) but this coordination is PRIVATE. The coordination uses a WeakMap-based approach for better encapsulation and automatic garbage collection:

```typescript
// INTERNAL: Not exposed to MFE code - used only by ScreensetsRuntime internals

// Module-level WeakMap instead of window global
const runtimeConnections = new WeakMap<Element, RuntimeConnection>();

interface RuntimeConnection {
  hostRuntime: ScreensetsRuntime;
  bridges: Map<string, MfeBridgeConnection>; // entryTypeId -> bridge
}

// Register when mounting MFE to a container element
function registerRuntime(container: Element, connection: RuntimeConnection): void;

// Lookup by container element
function getRuntime(container: Element): RuntimeConnection | undefined;

// Cleanup when unmounting
function unregisterRuntime(container: Element): void;

interface RuntimeCoordinator {
  sendToChild(instanceId: string, message: CoordinatorMessage): void;
  sendToParent(message: CoordinatorMessage): void;
  onMessage(handler: (message: CoordinatorMessage) => void): () => void;
}

// WHAT MFE CODE SEES: Only the MfeBridge interface
interface MfeBridge {
  readonly entryTypeId: string;
  readonly domainId: string;
  requestHostAction(actionTypeId: string, payload?: unknown): Promise<void>;
  subscribeToProperty(propertyTypeId: string, callback: (value: unknown) => void): () => void;
  getProperty(propertyTypeId: string): unknown;
  subscribeToAllProperties(callback: (properties: Map<string, unknown>) => void): () => void;
}
```

**Communication Layers**:

```
+------------------+     Contract (MfeBridge)      +------------------+
|   HOST RUNTIME   | <===========================> |   MFE RUNTIME    |
| (React + GTS A)  |     Properties & Actions      | (Vue 3 + GTS B)  |
+--------+---------+                               +--------+---------+
         |                                                  |
         |  Internal Coordination (PRIVATE)                 |
         |  (window.__hai3_runtime_coordinator)             |
         +--------------------------------------------------+
```

**Module Federation Shared Configuration**:

Module Federation provides TWO independent benefits:
1. **Code/bundle sharing** - Download code once, cache it (always enabled when dep is in `shared`)
2. **Runtime instance isolation** - Controlled by `singleton` flag

With `singleton: false` (the default in HAI3), you get BOTH benefits:
- Code is downloaded and cached once (performance)
- Each MFE gets its OWN instance (isolation)

```javascript
// Host and ALL MFEs webpack/rspack/vite config
shared: {
  // React/ReactDOM: Share CODE but NOT instance (singleton: false)
  // This gives bundle optimization while preserving isolation
  'react': {
    requiredVersion: '^18.0.0',
    singleton: false,  // Each MFE gets own React instance
  },
  'react-dom': {
    requiredVersion: '^18.0.0',
    singleton: false,
  },

  // GTS: Share CODE but NOT instance (isolation required for security)
  '@globaltypesystem/gts-ts': {
    requiredVersion: '^1.0.0',
    singleton: false,  // Each runtime has isolated schema registry
  },

  // @hai3/screensets: Share CODE but NOT instance
  '@hai3/screensets': {
    requiredVersion: '^1.0.0',
    singleton: false,  // Each MFE has isolated TypeSystemPlugin
  },

  // Stateless utilities: Can safely use singleton: true
  'lodash': {
    requiredVersion: '^4.17.0',
    singleton: true,   // No state, safe to share instance
  },
  'date-fns': {
    requiredVersion: '^2.30.0',
    singleton: true,
  },
}
```

**Summary of singleton usage:**
| Package Type | singleton | Reason |
|--------------|-----------|--------|
| React/ReactDOM | `false` | Has internal state (hooks, context) |
| @hai3/* | `false` | Has runtime state (TypeSystemPlugin, schema registry) |
| GTS | `false` | Has schema registry state |
| lodash, date-fns | `true` | Purely functional, no state |

**Class-Based ScreensetsRuntime**:

```typescript
// packages/screensets/src/runtime/ScreensetsRuntime.ts

/**
 * ScreensetsRuntime - FULLY isolated instance per MFE.
 * Each instance has:
 * - Its own TypeSystemPlugin instance (NOT shared)
 * - Its own schema registry (isolated from other runtimes)
 * - Its own state, domains, extensions, bridges
 *
 * Can operate as:
 * - Connect to a parent host (be a child MFE)
 * - Define extension domains and host nested MFEs (be a host)
 * - Both simultaneously (intermediate host pattern)
 */
class ScreensetsRuntime {
  // === Isolated State (per instance) ===
  private readonly domains = new Map<string, ExtensionDomainState>();
  private readonly extensions = new Map<string, ExtensionState>();
  private readonly childBridges = new Map<string, MfeBridgeConnection>();
  private readonly actionHandlers = new Map<string, ActionHandler>();

  // Parent connection (if this runtime is an MFE)
  private parentBridge: MfeBridgeConnection | null = null;

  // Isolated HAI3 state for this runtime
  private readonly state: HAI3State;

  // ISOLATED Type System instance - NOT shared across runtimes
  // Each runtime has its own TypeSystemPlugin with its own schema registry
  // This prevents MFEs from discovering host/other MFE types via plugin.query()
  public readonly typeSystem: TypeSystemPlugin;

  constructor(config: ScreensetsRuntimeConfig) {
    this.typeSystem = config.typeSystem;
    this.state = createHAI3State();  // Fresh isolated state

    if (config.mfeLoader) {
      this.mfeLoader = new MfeLoader(this.typeSystem, config.mfeLoader);
    }
  }

  /**
   * Register an extension domain.
   */
  registerDomain(domain: ExtensionDomain): void {
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.domain.v1~',
      domain
    );
    if (!validation.valid) {
      throw new DomainValidationError(validation.errors);
    }

    this.domains.set(domain.id, {
      domain,
      properties: new Map(),
      extensions: new Set(),
    });
  }

  /**
   * Mount an extension into a domain.
   */
  mountExtension(extension: Extension): MfeBridgeConnection {
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.ext.extension.v1~',
      extension
    );
    if (!validation.valid) {
      throw new ExtensionValidationError(validation.errors);
    }

    const domainState = this.domains.get(extension.domain);
    if (!domainState) {
      throw new Error(`Domain '${extension.domain}' not registered`);
    }

    // Contract validation
    const entry = this.getEntry(extension.entry);
    const contractResult = validateContract(entry, domainState.domain);
    if (!contractResult.valid) {
      throw new ContractValidationError(contractResult.errors);
    }

    // Dynamic uiMeta validation
    const uiMetaResult = validateExtensionUiMeta(this.typeSystem, extension);
    if (!uiMetaResult.valid) {
      throw new UiMetaValidationError(uiMetaResult.errors);
    }

    // Create domain-scoped bridge for this extension
    const instanceId = generateInstanceId();
    const bridge = this.createBridge(domainState, entry, instanceId);

    this.extensions.set(instanceId, { extension, entry, bridge });
    this.childBridges.set(instanceId, bridge);
    domainState.extensions.add(instanceId);

    return bridge;
  }

  /**
   * Connect this runtime to a parent host via bridge.
   */
  connectToParent(bridge: MfeBridgeConnection): void {
    this.parentBridge = bridge;
    bridge.subscribeToAllProperties((props) => {
      this.handleParentProperties(props);
    });
    this.registerDomainActionHandlers(bridge);
  }

  /**
   * Execute an actions chain.
   */
  async executeActionsChain(chain: ActionsChain): Promise<ChainResult> {
    const { target, type, payload } = chain.action;

    const validation = this.typeSystem.validateInstance(type, payload);
    if (!validation.valid) {
      return this.handleChainFailure(chain, validation.errors);
    }

    try {
      if (this.domains.has(target)) {
        await this.deliverToDomain(target, chain.action);
      } else if (this.childBridges.has(target)) {
        await this.deliverToChild(target, chain.action);
      } else if (this.parentBridge && target === this.parentBridge.domainId) {
        return this.parentBridge.sendActionsChain(chain);
      } else {
        throw new Error(`Unknown target: ${target}`);
      }

      if (chain.next) {
        return this.executeActionsChain(chain.next);
      }
      return { completed: true, path: [chain.action.type] };

    } catch (error) {
      return this.handleChainFailure(chain, error);
    }
  }

  private async handleChainFailure(
    chain: ActionsChain,
    error: unknown
  ): Promise<ChainResult> {
    if (chain.fallback) {
      return this.executeActionsChain(chain.fallback);
    }
    return { completed: false, path: [], error: String(error) };
  }

  dispose(): void {
    this.parentBridge?.dispose();
    this.parentBridge = null;
    for (const bridge of this.childBridges.values()) {
      bridge.dispose();
    }
    this.childBridges.clear();
    this.domains.clear();
    this.extensions.clear();
    this.actionHandlers.clear();
  }
}
```

### Decision 14: MFE Bridge Interfaces

The MFE Bridge provides a bidirectional communication channel between host and MFE. The bridge is created by the host when mounting an extension and passed to the MFE component via props.

#### Bridge Interface Definitions

```typescript
// packages/screensets/src/mfe/bridge/types.ts

/**
 * Read-only bridge interface exposed to MFE components.
 * MFEs use this to communicate with the host.
 */
interface MfeBridge {
  /** The entry type ID for this MFE instance */
  readonly entryTypeId: string;

  /** The domain type ID this MFE is mounted in */
  readonly domainId: string;

  /**
   * Request an action from the host.
   * The bridge validates the payload against the action's schema before sending.
   * @param actionTypeId - Action type ID (must be in entry's actions list)
   * @param payload - Action payload (validated against action schema)
   * @returns Promise that resolves when host acknowledges receipt
   */
  requestHostAction(actionTypeId: string, payload?: unknown): Promise<void>;

  /**
   * Subscribe to a shared property from the domain.
   * @param propertyTypeId - SharedProperty type ID
   * @param callback - Called with current value and on subsequent updates
   * @returns Unsubscribe function
   */
  subscribeToProperty(
    propertyTypeId: string,
    callback: (value: unknown) => void
  ): () => void;

  /**
   * Get current value of a shared property.
   * @param propertyTypeId - SharedProperty type ID
   * @returns Current value or undefined if not set
   */
  getProperty(propertyTypeId: string): unknown;

  /**
   * Subscribe to all shared properties at once.
   * @param callback - Called with property map on any property update
   * @returns Unsubscribe function
   */
  subscribeToAllProperties(
    callback: (properties: Map<string, unknown>) => void
  ): () => void;
}

/**
 * Extended bridge interface used by the host to manage MFE communication.
 * Created by ScreensetsRuntime when mounting an extension.
 */
interface MfeBridgeConnection extends MfeBridge {
  /** Unique instance ID for this bridge connection */
  readonly instanceId: string;

  /**
   * Send an actions chain to the MFE.
   * Used for domain-to-extension communication.
   * @param chain - ActionsChain to deliver
   * @param options - Optional per-request execution options (override defaults)
   * @returns ChainResult indicating execution outcome
   */
  sendActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /**
   * Update a shared property value.
   * Notifies all subscribers in the MFE.
   * @param propertyTypeId - SharedProperty type ID
   * @param value - New property value
   */
  updateProperty(propertyTypeId: string, value: unknown): void;

  /**
   * Register handler for actions coming from the MFE.
   * @param handler - Callback invoked when MFE requests host action
   */
  onHostAction(
    handler: (actionTypeId: string, payload: unknown) => Promise<void>
  ): void;

  /**
   * Clean up the bridge connection.
   * Unsubscribes all listeners and releases resources.
   */
  dispose(): void;
}

/**
 * Props interface for MFE entry components.
 * All MFE entry components must accept these props.
 */
interface MfeBridgeProps {
  /** Bridge for host-MFE communication */
  bridge: MfeBridge;
}
```

#### Bridge Creation Flow

```typescript
// When mounting an extension
const bridge = runtime.mountExtension(extension);

// Bridge is passed to MFE component via props
<MfeComponent bridge={bridge} />

// MFE uses bridge to communicate
const MyMfeEntry: React.FC<MfeBridgeProps> = ({ bridge }) => {
  const [theme, setTheme] = useState<Theme>();

  useEffect(() => {
    // Subscribe to shared property
    const unsubscribe = bridge.subscribeToProperty(
      'gts.hai3.screensets.ext.shared_property.v1~:theme',
      (value) => setTheme(value as Theme)
    );
    return unsubscribe;
  }, [bridge]);

  const handleClick = () => {
    // Request action from host
    bridge.requestHostAction(
      'gts.acme.analytics.ext.action.v1~:data_updated',
      { timestamp: Date.now() }
    );
  };

  return <div>...</div>;
};
```

### Decision 15: Shadow DOM Utilities

Shadow DOM utilities are provided by `@hai3/screensets` for style isolation. The `@hai3/framework` uses these utilities in its `ShadowDomContainer` component.

#### Shadow DOM API

```typescript
// packages/screensets/src/mfe/shadow/index.ts

/**
 * Options for creating a shadow root
 */
interface ShadowRootOptions {
  /** Shadow DOM mode (default: 'open') */
  mode?: 'open' | 'closed';
  /** Enable delegatesFocus for accessibility */
  delegatesFocus?: boolean;
}

/**
 * Create a shadow root attached to an element.
 * Handles edge cases like already-attached shadow roots.
 *
 * @param element - Host element for the shadow root
 * @param options - Shadow root configuration
 * @returns The created or existing ShadowRoot
 * @throws Error if element cannot host shadow DOM
 */
function createShadowRoot(
  element: HTMLElement,
  options: ShadowRootOptions = {}
): ShadowRoot {
  const { mode = 'open', delegatesFocus = false } = options;

  // Return existing shadow root if present
  if (element.shadowRoot && mode === 'open') {
    return element.shadowRoot;
  }

  return element.attachShadow({ mode, delegatesFocus });
}

/**
 * CSS variable map type
 */
type CssVariables = Record<string, string>;

/**
 * Inject CSS custom properties into a shadow root.
 * Variables are set on the :host element and cascade to all children.
 *
 * @param shadowRoot - Target shadow root
 * @param variables - Map of CSS variable names to values
 */
function injectCssVariables(
  shadowRoot: ShadowRoot,
  variables: CssVariables
): void {
  const styleId = '__hai3_css_variables__';
  let styleElement = shadowRoot.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    shadowRoot.prepend(styleElement);
  }

  const cssText = Object.entries(variables)
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n');

  styleElement.textContent = `:host {\n${cssText}\n}`;
}

/**
 * Inject a stylesheet into a shadow root.
 * Supports both CSS text and URLs.
 *
 * @param shadowRoot - Target shadow root
 * @param css - CSS text or URL to stylesheet
 * @param id - Optional ID for the style element (for updates)
 */
function injectStylesheet(
  shadowRoot: ShadowRoot,
  css: string,
  id?: string
): void {
  if (id) {
    const existing = shadowRoot.getElementById(id);
    if (existing) {
      existing.textContent = css;
      return;
    }
  }

  const styleElement = document.createElement('style');
  if (id) styleElement.id = id;
  styleElement.textContent = css;
  shadowRoot.appendChild(styleElement);
}

// Export utilities
export { createShadowRoot, injectCssVariables, injectStylesheet };
export type { ShadowRootOptions, CssVariables };
```

### Decision 16: Error Class Hierarchy

The MFE system defines a hierarchy of error classes for specific failure scenarios.

#### Error Classes

```typescript
// packages/screensets/src/mfe/errors/index.ts

/**
 * Base error class for all MFE errors
 */
class MfeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MfeError';
  }
}

/**
 * Error thrown when MFE bundle fails to load
 */
class MfeLoadError extends MfeError {
  constructor(
    message: string,
    public readonly entryTypeId: string,
    public readonly cause?: Error
  ) {
    super(`Failed to load MFE '${entryTypeId}': ${message}`, 'MFE_LOAD_ERROR');
    this.name = 'MfeLoadError';
  }
}

/**
 * Error thrown when contract validation fails
 */
class ContractValidationError extends MfeError {
  constructor(
    public readonly errors: ContractError[],
    public readonly entryTypeId?: string,
    public readonly domainTypeId?: string
  ) {
    const details = errors.map(e => `  - ${e.type}: ${e.details}`).join('\n');
    super(
      `Contract validation failed:\n${details}`,
      'CONTRACT_VALIDATION_ERROR'
    );
    this.name = 'ContractValidationError';
  }
}

/**
 * Error thrown when uiMeta validation fails
 */
class UiMetaValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string,
    public readonly domainTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `uiMeta validation failed for extension '${extensionTypeId}' against domain '${domainTypeId}':\n${details}`,
      'UI_META_VALIDATION_ERROR'
    );
    this.name = 'UiMetaValidationError';
  }
}

/**
 * Error thrown when actions chain execution fails
 */
class ChainExecutionError extends MfeError {
  constructor(
    message: string,
    public readonly chain: ActionsChain,
    public readonly failedAction: Action,
    public readonly executedPath: string[],
    public readonly cause?: Error
  ) {
    super(
      `Actions chain execution failed at '${failedAction.type}': ${message}`,
      'CHAIN_EXECUTION_ERROR'
    );
    this.name = 'ChainExecutionError';
  }
}

/**
 * Error thrown when shared dependency version validation fails
 */
class MfeVersionMismatchError extends MfeError {
  constructor(
    public readonly manifestTypeId: string,
    public readonly dependency: string,
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(
      `Version mismatch for '${dependency}' in MFE '${manifestTypeId}': expected ${expected}, got ${actual}`,
      'MFE_VERSION_MISMATCH_ERROR'
    );
    this.name = 'MfeVersionMismatchError';
  }
}

/**
 * Error thrown when type conformance check fails
 */
class MfeTypeConformanceError extends MfeError {
  constructor(
    public readonly typeId: string,
    public readonly expectedBaseType: string
  ) {
    super(
      `Type '${typeId}' does not conform to base type '${expectedBaseType}'`,
      'MFE_TYPE_CONFORMANCE_ERROR'
    );
    this.name = 'MfeTypeConformanceError';
  }
}

/**
 * Error thrown when domain validation fails
 */
class DomainValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly domainTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `Domain validation failed for '${domainTypeId}':\n${details}`,
      'DOMAIN_VALIDATION_ERROR'
    );
    this.name = 'DomainValidationError';
  }
}

/**
 * Error thrown when extension validation fails
 */
class ExtensionValidationError extends MfeError {
  constructor(
    public readonly errors: ValidationError[],
    public readonly extensionTypeId: string
  ) {
    const details = errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
    super(
      `Extension validation failed for '${extensionTypeId}':\n${details}`,
      'EXTENSION_VALIDATION_ERROR'
    );
    this.name = 'ExtensionValidationError';
  }
}

export {
  MfeError,
  MfeLoadError,
  ContractValidationError,
  UiMetaValidationError,
  ChainExecutionError,
  MfeVersionMismatchError,
  MfeTypeConformanceError,
  DomainValidationError,
  ExtensionValidationError,
};
```

### Decision 17: Explicit Timeout Configuration in Types

Action timeouts are configured **explicitly in type definitions**, not as implicit code defaults. This ensures the platform is fully runtime-configurable and declarative.

#### Timeout Resolution Model

Timeouts are resolved from two levels:

1. **ExtensionDomain** - Defines the default timeout for all actions targeting this domain
2. **Action** - Can optionally override the domain's default for specific actions

```
Effective timeout = action.timeout ?? domain.defaultActionTimeout
On timeout: execute fallback chain if defined (same as any other failure)
```

**Timeout as Failure**: Timeout is treated as just another failure case. The `ActionsChain.fallback` field handles all failures uniformly, including timeouts. There is no separate `fallbackOnTimeout` flag - the existing fallback mechanism provides complete failure handling.

This model ensures:
- **Explicit Configuration**: All timeouts are visible in type definitions
- **Runtime Configurability**: Domains define their timeout contracts
- **Action-Level Override**: Individual actions can specify different timeouts when needed
- **No Hidden Defaults**: No implicit code defaults for action timeouts
- **Unified Failure Handling**: Timeout triggers the same fallback mechanism as any other failure

#### Chain-Level Configuration

The only mediator-level configuration is the total chain execution limit:

```typescript
// packages/screensets/src/mfe/mediator/config.ts

/**
 * Configuration for ActionsChain execution (mediator-level)
 *
 * NOTE: Individual action timeouts are NOT configured here.
 * Action timeouts are defined explicitly in ExtensionDomain (defaultActionTimeout)
 * and can be overridden per-action via Action.timeout field.
 */
interface ActionsChainsConfig {
  /**
   * Maximum total time for entire chain execution (ms)
   * This is a safety limit for the entire chain, not individual actions.
   * Default: 120000 (2 minutes)
   */
  chainTimeout?: number;
}

const DEFAULT_CONFIG: Required<ActionsChainsConfig> = {
  chainTimeout: 120000,
};

/**
 * Per-request execution options (chain-level only)
 *
 * NOTE: Action-level timeouts are defined in:
 * - ExtensionDomain.defaultActionTimeout (required)
 * - Action.timeout (optional override)
 *
 * Timeout is treated as a failure - the ActionsChain.fallback handles all failures uniformly.
 */
interface ChainExecutionOptions {
  /**
   * Override chain timeout for this execution (ms)
   * This limits the total time for the entire chain execution.
   */
  chainTimeout?: number;
}

/**
 * Extended ChainResult with timing information
 */
interface ChainResult {
  completed: boolean;
  path: string[];  // Action type IDs executed
  error?: string;
  timedOut?: boolean;
  executionTime?: number;  // Total execution time in ms
}
```

#### Method Signatures

```typescript
/**
 * ActionsChainsMediator interface
 *
 * Action-level timeouts are resolved from type definitions:
 * - domain.defaultActionTimeout (required)
 * - action.timeout (optional override)
 *
 * Timeout is treated as a failure - the ActionsChain.fallback handles all failures uniformly.
 */
interface ActionsChainsMediator {
  /** The Type System plugin used by this mediator */
  readonly typeSystem: TypeSystemPlugin;

  /**
   * Execute an action chain, routing to targets and handling success/failure branching.
   *
   * Action timeouts are determined by:
   *   action.timeout ?? domain.defaultActionTimeout
   *
   * On timeout or any other failure: execute fallback chain if defined.
   *
   * @param chain - The actions chain to execute
   * @param options - Optional chain-level execution options
   */
  executeActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  /**
   * Deliver an action chain (internal routing).
   * @param chain - The actions chain to deliver
   * @param options - Optional chain-level execution options
   */
  deliver(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  // ... other methods unchanged
}

/**
 * MfeBridgeConnection interface
 */
interface MfeBridgeConnection extends MfeBridge {
  /** Unique instance ID for this bridge connection */
  readonly instanceId: string;

  /**
   * Send an actions chain to the MFE.
   * Used for domain-to-extension communication.
   *
   * Action timeouts come from the Action and domain type definitions.
   *
   * @param chain - ActionsChain to deliver
   * @param options - Optional chain-level execution options
   * @returns ChainResult indicating execution outcome
   */
  sendActionsChain(chain: ActionsChain, options?: ChainExecutionOptions): Promise<ChainResult>;

  // ... other methods unchanged
}
```

#### Usage Example

```typescript
// Domain defines default timeout in its type definition
const dashboardDomain: ExtensionDomain = {
  id: 'gts.acme.dashboard.ext.domain.v1~',
  sharedProperties: [...],
  actions: [...],
  extensionsActions: [...],
  extensionsUiMeta: {...},
  defaultActionTimeout: 30000,  // 30 seconds default for all actions
};

// Action uses domain's default timeout
const refreshAction: Action = {
  type: 'gts.acme.dashboard.ext.action.refresh.v1~',
  target: 'gts.acme.dashboard.ext.domain.v1~',
  // No timeout specified - uses domain's 30000ms default
};

// Action overrides for a long-running operation
const exportAction: Action = {
  type: 'gts.acme.dashboard.ext.action.export.v1~',
  target: 'gts.acme.dashboard.ext.domain.v1~',
  timeout: 120000,  // 2 minutes for this specific action
  // On timeout: executes fallback chain if defined (same as any other failure)
};

// Execute chain - timeouts come from type definitions
// On timeout or any failure: fallback chain is executed if defined
await mediator.executeActionsChain(chain);

// Override total chain timeout only (not individual action timeouts)
await mediator.executeActionsChain(chain, {
  chainTimeout: 300000,  // 5 minutes total for entire chain
});
```

### Decision 18: Manifest Fetching Strategy

The MfeLoader requires a strategy for fetching MfManifest instances from their type IDs.

#### Manifest Fetching Design

```typescript
// packages/screensets/src/mfe/loader/manifest-fetcher.ts

/**
 * Strategy for fetching MfManifest instances
 */
interface ManifestFetcher {
  /**
   * Fetch a manifest by its type ID
   * @param manifestTypeId - GTS type ID for the MfManifest
   * @returns The manifest instance
   */
  fetch(manifestTypeId: string): Promise<MfManifest>;
}

/**
 * URL-based manifest fetcher - fetches manifest JSON from a URL pattern
 */
class UrlManifestFetcher implements ManifestFetcher {
  constructor(
    private readonly urlResolver: (manifestTypeId: string) => string,
    private readonly fetchOptions?: RequestInit
  ) {}

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    const url = this.urlResolver(manifestTypeId);
    const response = await fetch(url, this.fetchOptions);

    if (!response.ok) {
      throw new MfeLoadError(
        `Failed to fetch manifest: ${response.status} ${response.statusText}`,
        manifestTypeId
      );
    }

    const manifest = await response.json();
    return manifest as MfManifest;
  }
}

/**
 * Registry-based manifest fetcher - looks up manifests from a pre-registered map
 */
class RegistryManifestFetcher implements ManifestFetcher {
  private readonly manifests = new Map<string, MfManifest>();

  register(manifest: MfManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    const manifest = this.manifests.get(manifestTypeId);
    if (!manifest) {
      throw new MfeLoadError(
        `Manifest not found in registry`,
        manifestTypeId
      );
    }
    return manifest;
  }
}

/**
 * Composite fetcher - tries multiple strategies in order
 */
class CompositeManifestFetcher implements ManifestFetcher {
  constructor(private readonly fetchers: ManifestFetcher[]) {}

  async fetch(manifestTypeId: string): Promise<MfManifest> {
    for (const fetcher of this.fetchers) {
      try {
        return await fetcher.fetch(manifestTypeId);
      } catch {
        continue;
      }
    }
    throw new MfeLoadError(
      `Manifest not found by any fetcher`,
      manifestTypeId
    );
  }
}

/**
 * MfeLoader configuration with manifest fetching
 */
interface MfeLoaderConfig {
  /** Timeout for bundle loading in ms (default: 30000) */
  timeout?: number;
  /** Retry attempts on load failure (default: 2) */
  retries?: number;
  /** Enable preloading of known MFEs */
  preload?: boolean;
  /** Strategy for fetching manifests */
  manifestFetcher: ManifestFetcher;
}
```

#### Usage Example

```typescript
// Configure loader with URL-based fetching
const loader = new MfeLoader(typeSystem, {
  manifestFetcher: new UrlManifestFetcher(
    (typeId) => `https://mfe-registry.example.com/manifests/${encodeURIComponent(typeId)}.json`
  ),
});

// Or with pre-registered manifests
const registryFetcher = new RegistryManifestFetcher();
registryFetcher.register(analyticsManifest);
registryFetcher.register(billingManifest);

const loader = new MfeLoader(typeSystem, {
  manifestFetcher: registryFetcher,
});

// Or composite strategy (try registry first, then URL)
const loader = new MfeLoader(typeSystem, {
  manifestFetcher: new CompositeManifestFetcher([
    registryFetcher,
    new UrlManifestFetcher((typeId) => `https://cdn.example.com/manifests/${typeId}.json`),
  ]),
});
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Type System plugin complexity | Provide comprehensive GTS plugin as reference implementation |
| Contract validation overhead | Cache validation results, validate once at registration |
| Module Federation bundle size | Tree-shaking, shared dependencies, lazy loading |
| Hierarchical domain complexity | Clear documentation, example implementations |
| Actions chain timeout | Configurable timeouts with fallback support |
| Manifest discovery | Multiple fetching strategies (registry, URL, composite) |

## Testing Strategy

1. **Unit Tests**: Plugin interface, contract validation, type validation, bridge communication
2. **Integration Tests**: MFE loading, domain registration, action chain execution, Shadow DOM isolation
3. **E2E Tests**: Full MFE lifecycle with real Module Federation bundles
