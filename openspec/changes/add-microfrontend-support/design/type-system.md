# Design: Type System and Contract Definitions

This document covers the Type System Plugin architecture and GTS type definitions for MFE contracts.

**Related Documents:**
- [Registry and Runtime](./registry-runtime.md) - Runtime isolation, action mediation, bridges
- [MFE Loading](./mfe-loading.md) - Module Federation loading, error handling, manifest fetching

---

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
3. **Hot Module Replacement**: MFE updates require reload (but hot-swap of extensions IS supported)
4. **Version Negotiation**: Single version per MFE entry
5. **Multiple Concurrent Plugins**: Only one Type System plugin per application instance
6. **Static Extension Registry**: Extensions are NOT known at initialization time (dynamic registration is the model)

---

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
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~",
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
      "items": { "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~*" },
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
  +-- gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~ (Module Federation)
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
  |-- entries?: x-gts-ref[] -> gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~*
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
 * GTS Type: gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~
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

When initializing the ScreensetsRegistry with the GTS plugin, HAI3 types are registered. There are 6 core types plus 2 MF-specific types:

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
  mfeEntryMf: 'gts.hai3.screensets.mfe.entry.v1~hai3.screensets.mfe.entry_mf.v1~',
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

### Decision 5: ScreensetsRegistry Configuration

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
  mfeLoader?: MfeLoaderConfig;

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

  // Register HAI3 types (6 core + 2 MF-specific)
  const typeIds = registerHai3Types(typeSystem);

  return new ScreensetsRegistry(typeSystem, typeIds, options);
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

### Decision 6: Framework Plugin Model (No Static Configuration)

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
