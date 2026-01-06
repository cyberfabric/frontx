# Design: Add Microfrontend Support

## Context

HAI3 needs to support microfrontend (MFE) architecture where independent applications can be composed into a host application. Each MFE is a separately deployed unit with its own HAI3 state instance. Communication between host and MFE must be explicit, type-safe, and controlled.

The type system for MFE contracts is abstracted through a **Type System Plugin** interface, allowing different type system implementations while shipping GTS as the default.

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
4. **Orchestrated Actions**: Centralized action delivery through orchestrator
5. **Hierarchical Domains**: Support nested extension points
6. **Pluggable Type System**: Abstract Type System as a plugin with GTS as default

### Non-Goals

1. **Direct State Sharing**: No shared Redux store between host and MFE
2. **Event Bus Bridging**: No automatic event propagation across boundaries
3. **Hot Module Replacement**: MFE updates require reload
4. **Version Negotiation**: Single version per MFE entry
5. **Multiple Concurrent Plugins**: Only one Type System plugin per application instance

## Decisions

### Decision 1: Type System Plugin Interface

The @hai3/screensets package defines a `TypeSystemPlugin` interface that abstracts type system operations. This allows different type system implementations while shipping GTS as the default.

#### Plugin Interface Definition

```typescript
/**
 * Parsed representation of a type ID
 */
interface ParsedTypeId {
  namespace: string;
  name: string;
  version: string;
  qualifier?: string;
}

/**
 * Options for building a type ID
 */
interface TypeIdOptions {
  namespace: string;
  name: string;
  version: string;
  qualifier?: string;
}

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
 * Type System Plugin interface
 * Abstracts type system operations for MFE contracts
 */
interface TypeSystemPlugin<TTypeId = string> {
  /** Plugin identifier */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  // === Type ID Operations ===

  /**
   * Parse a type ID string into structured components
   */
  parseTypeId(id: string): ParsedTypeId;

  /**
   * Check if a string is a valid type ID format
   */
  isValidTypeId(id: string): boolean;

  /**
   * Build a type ID from components
   */
  buildTypeId(options: TypeIdOptions): TTypeId;

  // === Schema Registry ===

  /**
   * Register a JSON Schema for a type ID
   */
  registerSchema(typeId: TTypeId, schema: JSONSchema): void;

  /**
   * Validate an instance against the schema for a type ID
   */
  validateInstance(typeId: TTypeId, instance: unknown): ValidationResult;

  /**
   * Get the schema registered for a type ID
   */
  getSchema(typeId: TTypeId): JSONSchema | undefined;

  /**
   * Check if a type ID has a registered schema
   */
  hasSchema(typeId: TTypeId): boolean;

  // === Query ===

  /**
   * Query registered type IDs matching a pattern
   */
  query(pattern: string, limit?: number): TTypeId[];

  /**
   * List all registered type IDs
   */
  listAll(): TTypeId[];

  // === Compatibility (Optional) ===

  /**
   * Check compatibility between two type versions
   */
  checkCompatibility?(oldTypeId: TTypeId, newTypeId: TTypeId): CompatibilityResult;
}
```

#### GTS Plugin Implementation

The GTS plugin implements `TypeSystemPlugin` using `@globaltypesystem/gts-ts`:

```typescript
// packages/screensets/src/mfe/plugins/gts/index.ts
import { Gts, GtsStore, GtsQuery } from '@globaltypesystem/gts-ts';
import type { TypeSystemPlugin, ParsedTypeId, ValidationResult } from '../types';

type GtsTypeId = string; // GTS type ID format: gts.namespace.name.version~

export function createGtsTypeSystem(): TypeSystemPlugin<GtsTypeId> {
  const store = new GtsStore();

  return {
    name: 'gts',
    version: '1.0.0',

    // Type ID operations
    parseTypeId(id: string): ParsedTypeId {
      const parsed = Gts.parseGtsID(id);
      return {
        namespace: parsed.namespace,
        name: parsed.name,
        version: parsed.version,
        qualifier: parsed.qualifier,
      };
    },

    isValidTypeId(id: string): boolean {
      return Gts.isValidGtsID(id);
    },

    buildTypeId(options): GtsTypeId {
      return Gts.buildGtsID(options);
    },

    // Schema registry
    registerSchema(typeId: GtsTypeId, schema: JSONSchema): void {
      store.register(typeId, schema);
    },

    validateInstance(typeId: GtsTypeId, instance: unknown): ValidationResult {
      const result = store.validate(typeId, instance);
      return {
        valid: result.valid,
        errors: result.errors.map(e => ({
          path: e.instancePath,
          message: e.message,
          keyword: e.keyword,
        })),
      };
    },

    getSchema(typeId: GtsTypeId): JSONSchema | undefined {
      return store.getSchema(typeId);
    },

    hasSchema(typeId: GtsTypeId): boolean {
      return store.has(typeId);
    },

    // Query
    query(pattern: string, limit?: number): GtsTypeId[] {
      return GtsQuery.search(store, pattern, { limit });
    },

    listAll(): GtsTypeId[] {
      return store.listAll();
    },

    // Compatibility
    checkCompatibility(oldTypeId: GtsTypeId, newTypeId: GtsTypeId) {
      return Gts.checkCompatibility(store, oldTypeId, newTypeId);
    },
  };
}

// Default export for convenience
export const gtsTypeSystem = createGtsTypeSystem();
```

### Decision 2: GTS Type ID Format and Registration

The GTS type ID format follows the structure: `gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~`

#### HAI3 GTS Type IDs

| Type | GTS Type ID | Segments |
|------|-------------|----------|
| MFE Definition | `gts.hai3.screensets.mfe.definition.v1~` | vendor=hai3, package=screensets, namespace=mfe, type=definition |
| MFE Entry | `gts.hai3.screensets.mfe.entry.v1~` | vendor=hai3, package=screensets, namespace=mfe, type=entry |
| Extension Domain | `gts.hai3.screensets.ext.domain.v1~` | vendor=hai3, package=screensets, namespace=ext, type=domain |
| Extension | `gts.hai3.screensets.ext.extension.v1~` | vendor=hai3, package=screensets, namespace=ext, type=extension |
| Shared Property | `gts.hai3.screensets.ext.shared_property.v1~` | vendor=hai3, package=screensets, namespace=ext, type=shared_property |
| Action | `gts.hai3.screensets.ext.action.v1~` | vendor=hai3, package=screensets, namespace=ext, type=action |
| Actions Chain | `gts.hai3.screensets.ext.actions_chain.v1~` | vendor=hai3, package=screensets, namespace=ext, type=actions_chain |

#### Complete GTS JSON Schema Definitions

All 7 GTS types with proper `$id`, `$schema`, and `x-gts-ref` references:

**1. MFE Definition Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.mfe.definition.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "url": { "type": "string", "format": "uri" },
    "entries": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~*" },
      "minItems": 1
    }
  },
  "required": ["name", "url", "entries"]
}
```

**2. MFE Entry Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.mfe.entry.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "requiredProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" }
    },
    "optionalProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" }
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" }
    },
    "domainActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" }
    }
  },
  "required": ["path", "requiredProperties", "actions", "domainActions"]
}
```

**3. Extension Domain Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.ext.domain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "sharedProperties": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.shared_property.v1~*" }
    },
    "actions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" }
    },
    "extensionsActions": {
      "type": "array",
      "items": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" }
    },
    "uiMetadataContract": { "type": "object" }
  },
  "required": ["sharedProperties", "actions", "extensionsActions", "uiMetadataContract"]
}
```

**4. Extension Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.ext.extension.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "domain": { "x-gts-ref": "gts.hai3.screensets.ext.domain.v1~*" },
    "entry": { "x-gts-ref": "gts.hai3.screensets.mfe.entry.v1~*" },
    "uiMetadata": { "type": "object" }
  },
  "required": ["domain", "entry", "uiMetadata"]
}
```

**5. Shared Property Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.ext.shared_property.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "schema": { "type": "object" }
  },
  "required": ["name", "schema"]
}
```

**6. Action Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.ext.action.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "payloadSchema": { "type": "object" }
  },
  "required": ["name", "payloadSchema"]
}
```

**7. Actions Chain Schema:**
```json
{
  "$id": "gts://gts.hai3.screensets.ext.actions_chain.v1~",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "target": { "type": "string", "x-gts-ref": "gts.*" },
    "action": { "x-gts-ref": "gts.hai3.screensets.ext.action.v1~*" },
    "payload": { "type": "object" },
    "next": { "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~" },
    "fallback": { "$ref": "gts://gts.hai3.screensets.ext.actions_chain.v1~" }
  },
  "required": ["target", "action"]
}
```

### Decision 3: Internal TypeScript Type Definitions

The MFE system uses internal TypeScript interfaces that include `GtsMetadata` extracted from GTS type IDs. This metadata is populated at runtime when types are parsed/registered.

#### GtsMetadata Interface

The `GtsMetadata` interface contains data extracted from parsing a GTS type ID:

```typescript
// packages/screensets/src/mfe/types/metadata.ts

/**
 * Metadata extracted from a GTS type ID
 * The GTS ID format is: gts.<vendor>.<package>.<namespace>.<type>.v<MAJOR>[.<MINOR>]~
 */
interface GtsMetadata {
  /** Full GTS type ID (e.g., "gts.hai3.screensets.mfe.definition.v1~") */
  readonly typeId: string;
  /** Vendor segment (e.g., "hai3") */
  readonly vendor: string;
  /** Package segment (e.g., "screensets") */
  readonly package: string;
  /** Namespace segment (e.g., "mfe" or "ext") */
  readonly namespace: string;
  /** Type segment (e.g., "definition", "entry", "domain") */
  readonly type: string;
  /** Version information extracted from type ID */
  readonly version: {
    major: number;
    minor?: number;
  };
}

/**
 * Utility function to parse a GTS type ID into GtsMetadata
 */
function parseGtsTypeId(typeId: string): GtsMetadata {
  // Example: gts.hai3.screensets.mfe.definition.v1~ ->
  //   vendor=hai3, package=screensets, namespace=mfe, type=definition, version={major:1}
  const regex = /^gts\.([^.]+)\.([^.]+)\.([^.]+)\.([^.]+)\.v(\d+)(?:\.(\d+))?~$/;
  const match = typeId.match(regex);

  if (!match) {
    throw new Error(`Invalid GTS type ID format: ${typeId}`);
  }

  return {
    typeId,
    vendor: match[1],
    package: match[2],
    namespace: match[3],
    type: match[4],
    version: {
      major: parseInt(match[5], 10),
      minor: match[6] ? parseInt(match[6], 10) : undefined,
    },
  };
}
```

#### TypeScript Interface Definitions with GtsMetadata

All MFE types extend `GtsMetadata` and include domain-specific properties:

```typescript
// packages/screensets/src/mfe/types/index.ts

/**
 * Represents a deployable MFE unit
 * GTS Type: gts.hai3.screensets.mfe.definition.v1~
 */
interface MfeDefinition extends GtsMetadata {
  /** Human-readable MFE name */
  name: string;
  /** Base URL for MFE bundle */
  url: string;
  /** List of MfeEntry type IDs this MFE provides */
  entries: string[];
}

/**
 * Defines an entry point with its communication contract
 * GTS Type: gts.hai3.screensets.mfe.entry.v1~
 */
interface MfeEntry extends GtsMetadata {
  /** Path within MFE bundle to entry component */
  path: string;
  /** SharedProperty type IDs that MUST be provided by domain */
  requiredProperties: string[];
  /** SharedProperty type IDs that MAY be provided by domain */
  optionalProperties: string[];
  /** Action type IDs this entry can emit to the domain */
  actions: string[];
  /** Action type IDs this entry can receive from the domain */
  domainActions: string[];
}

/**
 * Defines an extension point (domain) where MFEs can be injected
 * GTS Type: gts.hai3.screensets.ext.domain.v1~
 */
interface ExtensionDomain extends GtsMetadata {
  /** SharedProperty type IDs provided to extensions */
  sharedProperties: string[];
  /** Action type IDs domain can emit to extensions */
  actions: string[];
  /** Action type IDs domain can receive from extensions */
  extensionsActions: string[];
  /** JSON Schema for UI metadata extensions must provide */
  uiMetadataContract: JSONSchema;
}

/**
 * Binds an MFE entry to an extension domain
 * GTS Type: gts.hai3.screensets.ext.extension.v1~
 */
interface Extension extends GtsMetadata {
  /** ExtensionDomain type ID to inject into */
  domain: string;
  /** MfeEntry type ID to inject */
  entry: string;
  /** UI metadata conforming to domain's uiMetadataContract */
  uiMetadata: Record<string, unknown>;
}

/**
 * Defines a property that can be shared from domain to extension
 * GTS Type: gts.hai3.screensets.ext.shared_property.v1~
 * Note: No default value - domain provides values at runtime
 */
interface SharedProperty extends GtsMetadata {
  /** Property name for injection */
  name: string;
  /** JSON Schema for property value */
  schema: JSONSchema;
}

/**
 * Defines an action that can be sent between domain and extension
 * GTS Type: gts.hai3.screensets.ext.action.v1~
 */
interface Action extends GtsMetadata {
  /** Action name for dispatch */
  name: string;
  /** JSON Schema for action payload */
  payloadSchema: JSONSchema;
}

/**
 * Defines an orchestrated chain of actions with success/failure branches
 * GTS Type: gts.hai3.screensets.ext.actions_chain.v1~
 */
interface ActionsChain extends GtsMetadata {
  /** Type ID of target (ExtensionDomain or MfeEntry) */
  target: string;
  /** Action type ID to deliver */
  action: string;
  /** Action payload conforming to action's payloadSchema */
  payload?: unknown;
  /** Chain to execute on success (recursive) */
  next?: ActionsChain;
  /** Chain to execute on failure (recursive) */
  fallback?: ActionsChain;
}
```

### Decision 4: GtsMetadata Extraction Utility

The system provides a utility to extract `GtsMetadata` from type IDs and hydrate runtime objects:

```typescript
// packages/screensets/src/mfe/utils/gts-metadata.ts

/**
 * Create a typed instance with GtsMetadata from raw data
 */
function hydrateWithMetadata<T extends GtsMetadata>(
  typeId: string,
  data: Omit<T, keyof GtsMetadata>
): T {
  const metadata = parseGtsTypeId(typeId);
  return {
    ...metadata,
    ...data,
  } as T;
}

// Usage example:
const mfeEntry = hydrateWithMetadata<MfeEntry>(
  'gts.hai3.screensets.mfe.entry.v1~',
  {
    path: '/widgets/chart',
    requiredProperties: ['gts.hai3.screensets.ext.shared_property.v1~:user_context'],
    optionalProperties: [],
    actions: ['gts.hai3.screensets.ext.action.v1~:data_updated'],
    domainActions: ['gts.hai3.screensets.ext.action.v1~:refresh'],
  }
);

// mfeEntry now has:
// - typeId: 'gts.hai3.screensets.mfe.entry.v1~'
// - vendor: 'hai3'
// - package: 'screensets'
// - namespace: 'mfe'
// - type: 'entry'
// - version: { major: 1 }
// - path: '/widgets/chart'
// - requiredProperties: [...]
// - actions: [...]
// - domainActions: [...]
```

### Decision 5: HAI3 Type Registration via Plugin

When initializing the orchestrator with the GTS plugin, HAI3 types are registered:

```typescript
// packages/screensets/src/mfe/init.ts

import { mfeGtsSchemas } from './schemas/gts-schemas';

/** GTS Type IDs for HAI3 MFE types */
const HAI3_TYPE_IDS = {
  mfeDefinition: 'gts.hai3.screensets.mfe.definition.v1~',
  mfeEntry: 'gts.hai3.screensets.mfe.entry.v1~',
  extensionDomain: 'gts.hai3.screensets.ext.domain.v1~',
  extension: 'gts.hai3.screensets.ext.extension.v1~',
  sharedProperty: 'gts.hai3.screensets.ext.shared_property.v1~',
  action: 'gts.hai3.screensets.ext.action.v1~',
  actionsChain: 'gts.hai3.screensets.ext.actions_chain.v1~',
} as const;

function registerHai3Types<TTypeId>(
  plugin: TypeSystemPlugin<TTypeId>
): typeof HAI3_TYPE_IDS {
  // Register each schema with its GTS type ID
  plugin.registerSchema(
    HAI3_TYPE_IDS.mfeDefinition as TTypeId,
    mfeGtsSchemas.mfeDefinition
  );
  plugin.registerSchema(
    HAI3_TYPE_IDS.mfeEntry as TTypeId,
    mfeGtsSchemas.mfeEntry
  );
  plugin.registerSchema(
    HAI3_TYPE_IDS.extensionDomain as TTypeId,
    mfeGtsSchemas.extensionDomain
  );
  plugin.registerSchema(
    HAI3_TYPE_IDS.extension as TTypeId,
    mfeGtsSchemas.extension
  );
  plugin.registerSchema(
    HAI3_TYPE_IDS.sharedProperty as TTypeId,
    mfeGtsSchemas.sharedProperty
  );
  plugin.registerSchema(
    HAI3_TYPE_IDS.action as TTypeId,
    mfeGtsSchemas.action
  );
  plugin.registerSchema(
    HAI3_TYPE_IDS.actionsChain as TTypeId,
    mfeGtsSchemas.actionsChain
  );

  return HAI3_TYPE_IDS;
}
```

### Decision 6: Screensets Orchestrator Configuration

The orchestrator requires a Type System plugin at initialization:

```typescript
// packages/screensets/src/mfe/orchestrator/config.ts

/**
 * Configuration for the Screensets MFE Orchestrator
 */
interface ScreensetsOrchestratorConfig<TTypeId = string> {
  /** Required: Type System plugin for type handling */
  typeSystem: TypeSystemPlugin<TTypeId>;

  /** Optional: Custom error handler */
  onError?: (error: MfeError) => void;

  /** Optional: Custom loading state component */
  loadingComponent?: React.ComponentType;

  /** Optional: Custom error fallback component */
  errorFallbackComponent?: React.ComponentType<{ error: MfeError; retry: () => void }>;

  /** Optional: Enable debug logging */
  debug?: boolean;
}

/**
 * Create the MFE orchestrator with required Type System plugin
 */
function createScreensetsOrchestrator<TTypeId = string>(
  config: ScreensetsOrchestratorConfig<TTypeId>
): MfeOrchestrator<TTypeId> {
  const { typeSystem, ...options } = config;

  // Validate plugin
  if (!typeSystem) {
    throw new Error('ScreensetsOrchestrator requires a typeSystem');
  }

  // Register HAI3 types
  const typeIds = registerHai3Types(typeSystem);

  return new MfeOrchestratorImpl(typeSystem, typeIds, options);
}

// Usage with GTS (default)
import { gtsTypeSystem } from '@hai3/screensets/plugins/gts';

const orchestrator = createScreensetsOrchestrator({
  typeSystem: gtsTypeSystem,
  debug: process.env.NODE_ENV === 'development',
});

// Usage with custom plugin
import { customTypeSystem } from './my-custom-plugin';

const orchestratorWithCustomPlugin = createScreensetsOrchestrator({
  typeSystem: customTypeSystem,
});
```

### Decision 7: Plugin Propagation to Framework

The @hai3/framework microfrontends plugin accepts the Type System plugin from screensets:

```typescript
// packages/framework/src/plugins/microfrontends/index.ts

interface MicrofrontendsPluginConfig<TTypeId = string> {
  /** Type System plugin inherited from screensets configuration */
  typeSystem: TypeSystemPlugin<TTypeId>;

  /** Base domains to register */
  baseDomains?: Array<'sidebar' | 'popup' | 'screen' | 'overlay'>;
}

function createMicrofrontendsPlugin<TTypeId = string>(
  config: MicrofrontendsPluginConfig<TTypeId>
): FrameworkPlugin {
  return {
    name: 'microfrontends',

    setup(framework) {
      // Create orchestrator with provided plugin
      const orchestrator = createScreensetsOrchestrator({
        typeSystem: config.typeSystem,
      });

      // Register base domains if specified
      if (config.baseDomains) {
        for (const domain of config.baseDomains) {
          orchestrator.registerDomain(getBaseDomain(domain, config.typeSystem));
        }
      }

      // Expose orchestrator to framework
      framework.provide('mfeOrchestrator', orchestrator);
    },
  };
}

// App initialization example
import { createFramework } from '@hai3/framework';
import { gtsTypeSystem } from '@hai3/screensets/plugins/gts';

const app = createFramework({
  plugins: [
    createMicrofrontendsPlugin({
      typeSystem: gtsTypeSystem,
      baseDomains: ['sidebar', 'popup', 'screen', 'overlay'],
    }),
  ],
});
```

### Decision 8: Contract Matching Rules

For an MFE entry to be injectable into an extension domain, the following conditions must ALL be true:

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
  domain: ExtDomain
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

### Decision 9: Isolated State Instances

Each MFE instance runs with its own HAI3 state container. The host also has its own state instance.

**Architecture:**
```
+------------------+      +------------------+
|   HOST STATE     |      |   MFE STATE      |
|  (HAI3 Store)    |      |  (HAI3 Store)    |
+--------+---------+      +--------+---------+
         |                         |
         v                         v
+--------+---------+      +--------+---------+
|  HOST COMPONENT  |      |  MFE COMPONENT   |
+--------+---------+      +--------+---------+
         |                         |
         +-----------+-------------+
                     |
              +------v------+
              | ORCHESTRATOR |
              | (with GPTS)  |
              +-------------+
```

**Key Points:**
- No direct store access across boundary
- Shared properties passed via props at render time
- Actions delivered via orchestrator messaging
- Type System plugin validates type IDs and schemas

### Decision 10: Actions Chain Execution

The orchestrator delivers action chains to targets and handles success/failure branching. The Type System plugin validates all type IDs and payloads.

**Execution Flow:**
```
1. Orchestrator receives chain
2. Validate chain.target via typeSystem.isValidTypeId()
3. Resolve target (domain or entry instance)
4. Validate action against target's contract
5. Validate payload via typeSystem.validateInstance()
6. Deliver payload to target
7. Wait for result (Promise<success|failure>)
8. If success AND chain.next: execute chain.next
9. If failure AND chain.fallback: execute chain.fallback
10. Recurse until no next/fallback
```

**API Contract:**
```typescript
interface MfeOrchestrator<TTypeId = string> {
  /** The Type System plugin used by this orchestrator */
  readonly typeSystem: TypeSystemPlugin<TTypeId>;

  // Execute an action chain
  execute(chain: ActionsChain<TTypeId>): Promise<ChainResult>;

  // Register extension instance
  registerExtension(
    extensionId: string,
    domainId: TTypeId,
    entryId: TTypeId,
    handler: ActionHandler<TTypeId>
  ): void;

  // Unregister extension instance
  unregisterExtension(extensionId: string): void;

  // Register a domain (uses plugin for type registration)
  registerDomain(domain: ExtensionDomain<TTypeId>): void;
}

interface ActionHandler<TTypeId = string> {
  handleAction(actionId: TTypeId, payload: unknown): Promise<void>;
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

const widgetSlotDomain: ExtensionDomain = hydrateWithMetadata(
  'gts.acme.dashboard.ext.domain.widget_slot.v1~',
  {
    sharedProperties: [
      'gts.hai3.screensets.ext.shared_property.user_context.v1~',
    ],
    actions: [
      'gts.acme.dashboard.ext.action.refresh.v1~',
    ],
    extensionsActions: [
      'gts.acme.dashboard.ext.action.data_update.v1~',
    ],
    uiMetadataContract: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        icon: { type: 'string' },
        size: { enum: ['small', 'medium', 'large'] },
      },
      required: ['title', 'size'],
    },
  }
);
```

### Decision 12: Module Federation 2.0 for Bundle Loading

**What**: Use Webpack 5 / Rspack Module Federation 2.0 for loading remote MFE bundles.

**Why**:
- Mature ecosystem with TypeScript type generation
- Shared dependency deduplication (single React instance across host and MFEs)
- Battle-tested at scale (Zara, IKEA, others)
- Works with existing HAI3 Vite build (via `@originjs/vite-plugin-federation`)

**Alternatives Considered**:

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| Native Federation (ESM + Import Maps) | Pure ESM, no bundler | React CommonJS issues, import map constraints | Rejected |
| iframes | Complete isolation | Poor UX, heavy performance, no shared context | Rejected |
| Web Components only | Native platform | No shared React context, complex state | Rejected |

**MfeLoader Implementation:**

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
  /** Metadata from the MFE manifest */
  manifest: MfeDefinition;
  /** Cleanup function to unload the MFE */
  unload: () => void;
}

/**
 * MFE Loader using Module Federation 2.0
 * Handles remote bundle loading with schema validation
 */
class MfeLoader {
  constructor(
    private typeSystem: TypeSystemPlugin,
    private config: MfeLoaderConfig = {}
  ) {}

  /**
   * Load an MFE from its definition
   * Validates manifest against GTS schema before loading
   */
  async load(definition: MfeDefinition): Promise<LoadedMfe> {
    // 1. Validate definition against schema
    const validation = this.typeSystem.validateInstance(
      'gts.hai3.screensets.mfe.definition.v1~',
      definition
    );
    if (!validation.valid) {
      throw new MfeLoadError('Invalid MFE definition', validation.errors);
    }

    // 2. Load remote container via Module Federation
    const container = await this.loadRemoteContainer(definition.url);

    // 3. Get and validate entry module
    const entry = await container.get(definition.entries[0]);

    return {
      component: entry.default,
      manifest: definition,
      unload: () => this.unloadContainer(definition.name),
    };
  }

  /**
   * Preload MFEs for faster subsequent mounting
   */
  async preload(definitions: MfeDefinition[]): Promise<void> {
    await Promise.allSettled(
      definitions.map(def => this.loadRemoteContainer(def.url))
    );
  }

  private async loadRemoteContainer(url: string): Promise<Container> {
    // Module Federation container loading logic
    // Uses __webpack_init_sharing__ and __webpack_share_scopes__
  }
}
```

### Decision 13: Shadow DOM for Style Isolation

**What**: Each MFE entry renders inside a Shadow DOM container that isolates its styles from the host and other MFEs.

**Why**:
- Web standard with excellent browser support (>96%)
- CSS custom properties (theme variables) pierce the shadow boundary
- No build coordination required between host and MFEs
- Declarative Shadow DOM enables future SSR path

**CSS Variables Strategy**:

```css
/* Host defines theme variables (these pierce shadow boundary) */
:root {
  --hai3-color-primary: #3b82f6;
  --hai3-color-secondary: #64748b;
  --hai3-spacing-unit: 4px;
  --hai3-border-radius: 8px;
  --hai3-font-family: system-ui, sans-serif;
}

/* MFE styles reference variables (works inside shadow DOM) */
.mfe-button {
  background: var(--hai3-color-primary);
  padding: calc(var(--hai3-spacing-unit) * 2);
  border-radius: var(--hai3-border-radius);
  font-family: var(--hai3-font-family);
}
```

**Shadow DOM Utilities**:

```typescript
// packages/screensets/src/mfe/shadow/index.ts

interface ShadowContainerOptions {
  /** Shadow DOM mode (default: 'open') */
  mode?: 'open' | 'closed';
  /** Inject CSS reset into shadow root */
  injectReset?: boolean;
  /** Additional styles to inject */
  styles?: string[];
}

/**
 * Create a shadow root container for MFE isolation
 */
function createShadowContainer(
  hostElement: HTMLElement,
  options: ShadowContainerOptions = {}
): ShadowRoot {
  const { mode = 'open', injectReset = true, styles = [] } = options;

  const shadowRoot = hostElement.attachShadow({ mode });

  // Inject CSS reset to prevent host style leakage
  if (injectReset) {
    const resetStyle = document.createElement('style');
    resetStyle.textContent = `
      :host {
        all: initial;
        display: block;
        contain: content;
      }
    `;
    shadowRoot.appendChild(resetStyle);
  }

  // Inject additional styles
  for (const css of styles) {
    const style = document.createElement('style');
    style.textContent = css;
    shadowRoot.appendChild(style);
  }

  return shadowRoot;
}

/**
 * Inject CSS variables from host into shadow root
 * Called when theme changes to update MFE styling
 */
function syncCssVariables(
  shadowRoot: ShadowRoot,
  variablePrefix = '--hai3-'
): void {
  const rootStyles = getComputedStyle(document.documentElement);
  const variables: string[] = [];

  // Extract all HAI3 theme variables
  for (const prop of document.documentElement.style) {
    if (prop.startsWith(variablePrefix)) {
      variables.push(`${prop}: ${rootStyles.getPropertyValue(prop)};`);
    }
  }

  // Apply to shadow root host
  const style = shadowRoot.querySelector('style[data-theme]')
    || document.createElement('style');
  style.setAttribute('data-theme', 'true');
  style.textContent = `:host { ${variables.join(' ')} }`;

  if (!style.parentNode) {
    shadowRoot.appendChild(style);
  }
}
```

### Decision 14: MfeBridge Communication Layer

The `MfeBridge` class provides the runtime communication interface between an MFE entry and its extension domain. It handles shared property subscriptions and actions chain sending.

```typescript
// packages/screensets/src/mfe/bridge/index.ts

interface MfeBridgeProps {
  /** Shared properties from domain (read-only) */
  sharedProperties: Readonly<Record<string, unknown>>;
  /** Callback to send actions chain to orchestrator */
  sendActionsChain: (chain: ActionsChain) => Promise<ChainResult>;
  /** Handler for receiving actions from domain */
  onDomainAction: (actionId: string, handler: ActionHandler) => void;
}

/**
 * Bridge class for MFE-to-orchestrator communication
 * Created per MFE instance, injected as props
 */
class MfeBridge {
  private actionHandlers = new Map<string, ActionHandler>();
  private unsubscribers: (() => void)[] = [];

  constructor(
    private orchestrator: MfeOrchestrator,
    private extensionId: string,
    private domainId: string,
    private entryId: string
  ) {}

  /**
   * Get current shared properties from domain
   */
  getSharedProperties(): Readonly<Record<string, unknown>> {
    return this.orchestrator.getSharedProperties(this.domainId);
  }

  /**
   * Subscribe to shared property updates
   * Returns unsubscribe function
   */
  subscribeToProperty(
    propertyId: string,
    callback: (value: unknown) => void
  ): () => void {
    const unsubscribe = this.orchestrator.subscribeProperty(
      this.domainId,
      propertyId,
      callback
    );
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Send an actions chain to the orchestrator
   * The orchestrator delivers to target and handles success/failure paths
   */
  async sendActionsChain(chain: ActionsChain): Promise<ChainResult> {
    // Validate action is in entry's allowed actions
    const entry = this.orchestrator.getEntry(this.entryId);
    if (!entry.actions.includes(chain.action)) {
      throw new ContractViolationError(
        `Action '${chain.action}' not in entry's declared actions`
      );
    }

    return this.orchestrator.execute(chain);
  }

  /**
   * Register handler for domain actions
   */
  onDomainAction(actionId: string, handler: ActionHandler): void {
    this.actionHandlers.set(actionId, handler);
    this.orchestrator.registerActionHandler(
      this.extensionId,
      actionId,
      handler
    );
  }

  /**
   * Cleanup on MFE unmount
   */
  dispose(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.actionHandlers.clear();
    this.orchestrator.unregisterExtension(this.extensionId);
  }
}

/**
 * React hook for MFE components to access bridge
 */
function useMfeBridge(): MfeBridge {
  const bridge = useContext(MfeBridgeContext);
  if (!bridge) {
    throw new Error('useMfeBridge must be used within MfeBridgeProvider');
  }
  return bridge;
}
```

## Data Flow Diagrams

### Extension Loading and Mounting Flow

```
+------------------+     1. Load MFE      +------------------+
|   HOST APP       | ------------------>  | MFE LOADER       |
| (with Domain)    |                      | (Module Fed 2.0) |
+--------+---------+                      +--------+---------+
         |                                         |
         |                                    2. Fetch Bundle
         |                                         |
         |                                         v
         |                                +------------------+
         |                                | REMOTE SERVER    |
         |                                | (MFE Bundle)     |
         |                                +--------+---------+
         |                                         |
         |     3. Return Loaded Component          |
         | <---------------------------------------+
         |
         v
+--------+---------+     4. Validate      +------------------+
| MFE ORCHESTRATOR | <----------------->  | TYPE SYSTEM      |
| (with Plugin)    |     Contract         | PLUGIN (GTS)     |
+--------+---------+                      +------------------+
         |
         | 5. Contract Valid
         v
+--------+---------+
| SHADOW DOM       |
| CONTAINER        |
+--------+---------+
         |
         | 6. Mount in Shadow Root
         v
+------------------+
| MFE COMPONENT    |
| (with Bridge)    |
+------------------+
```

### Shared Properties Flow (Domain to Extension)

```
+------------------+                      +------------------+
|   DOMAIN STATE   |  1. State Change    | ORCHESTRATOR     |
| (Host HAI3 Store)|  ---------------->  |                  |
+--------+---------+                      +--------+---------+
                                                   |
                                          2. Update Shared Properties
                                                   |
                    +------------------------------+
                    |
                    v
+------------------+     3. Notify       +------------------+
| SHARED PROPS     | ----------------->  | MFE BRIDGE       |
| SUBSCRIPTION     |                     | (per Extension)  |
+------------------+                     +--------+---------+
                                                  |
                                         4. Callback
                                                  |
                                                  v
                                         +------------------+
                                         | MFE COMPONENT    |
                                         | (Re-render)      |
                                         +------------------+
```

### Actions Chain Flow (Extension to Domain and Back)

```
+------------------+                      +------------------+
| MFE COMPONENT    |  1. sendActionsChain | MFE BRIDGE      |
| (User Action)    | ------------------> |                  |
+------------------+                      +--------+---------+
                                                   |
                                          2. Validate Action in Contract
                                                   |
                                                   v
+------------------+                      +------------------+
| TYPE SYSTEM      | <---3. Validate---> | ORCHESTRATOR     |
| PLUGIN (GTS)     |    Payload Schema   |                  |
+------------------+                      +--------+---------+
                                                   |
                                          4. Resolve Target
                                                   |
                    +------------------------------+
                    |
                    v
+------------------+     5. Deliver      +------------------+
| DOMAIN HANDLER   | <----------------- | ACTION CHAIN     |
| (Host L2 Layer)  |    Action+Payload   | EXECUTOR         |
+--------+---------+                     +--------+---------+
         |                                        |
         | 6. Execute (Flux Dispatch)             |
         |                                        |
         v                                        |
+------------------+                              |
| SUCCESS/FAILURE  | --------------------------->+
|                  |  7. Result                   |
+------------------+                              |
                                                  |
                                         8. Execute next/fallback
                                                  |
                                                  v
                                         +------------------+
                                         | NEXT TARGET      |
                                         | (Chain Continues)|
                                         +------------------+
```

## Component Architecture Diagram

```
+==============================================================================+
|                              HOST APPLICATION                                  |
|                                                                               |
|  +--------------------------+     +--------------------------------------+    |
|  |     HOST HAI3 STORE      |     |        MFE ORCHESTRATOR              |    |
|  |    (Isolated State)      |     |  +--------------------------------+  |    |
|  +--------------------------+     |  | Type System Plugin (GTS)       |  |    |
|                                   |  | - Schema Registry              |  |    |
|  +--------------------------+     |  | - Type Validation              |  |    |
|  |    EXTENSION DOMAIN      |     |  | - Contract Matching            |  |    |
|  |  (sidebar.v1~)           |     |  +--------------------------------+  |    |
|  |                          |     |  | Actions Chain Executor         |  |    |
|  |  sharedProperties:       |     |  | - Target Resolution            |  |    |
|  |    - user_context        |     |  | - Success/Failure Routing      |  |    |
|  |  actions: [refresh]      |     |  +--------------------------------+  |    |
|  |  extensionsActions:      |     +--------------------------------------+    |
|  |    - data_update         |                      |                          |
|  +-----------+--------------+                      |                          |
|              |                                     |                          |
|              | Contract Validation                 |                          |
|              +-------------------------------------+                          |
|              |                                                                |
|  +-----------v--------------+                                                 |
|  |   EXTENSION SLOT         |                                                 |
|  |   (Shadow DOM Container) |                                                 |
|  |                          |                                                 |
|  |  +--------------------+  |     +--------------------------------------+    |
|  |  |  SHADOW ROOT       |  |     |         MFE INSTANCE                 |    |
|  |  |  (Style Isolation) |  |     |                                      |    |
|  |  |                    |  |     |  +--------------------------------+  |    |
|  |  |  +---------------+ |  |     |  |     MFE HAI3 STORE             |  |    |
|  |  |  | CSS Variables | |  |     |  |    (Isolated State)            |  |    |
|  |  |  | (Theme)       | |  |     |  +--------------------------------+  |    |
|  |  |  +---------------+ |  |     |                                      |    |
|  |  |                    |  |     |  +--------------------------------+  |    |
|  |  |  +---------------+ |  |---->|  |     MFE BRIDGE                 |  |    |
|  |  |  | MFE COMPONENT | |  |     |  | - subscribeToProperty()        |  |    |
|  |  |  | (Rendered)    | |  |     |  | - sendActionsChain()           |  |    |
|  |  |  +---------------+ |  |     |  | - onDomainAction()             |  |    |
|  |  +--------------------+  |     |  +--------------------------------+  |    |
|  +--------------------------+     +--------------------------------------+    |
|                                                                               |
+===============================================================================+
```

## Risks / Trade-offs

### Risk Summary Table

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| React version mismatch host/MFE | Critical (runtime crash) | Medium | Strict shared dep version validation at load time via Module Federation |
| CSS leakage despite Shadow DOM | Medium (visual bugs) | Low | CSS reset in shadow root, automated visual regression testing |
| Contract mismatch at runtime | High (mount failure) | Medium | Validate contracts at registration, clear error messages with type IDs |
| Actions chain loops | High (infinite recursion) | Low | Max chain depth limit (default: 10), loop detection in orchestrator |
| Slow MFE loads | Medium (poor UX) | Medium | Preloading strategies, loading skeletons, configurable timeouts |
| Contract evolution breaks MFEs | High (integration failure) | Medium | Semantic versioning in type IDs, new versions are new types |
| Plugin implementation complexity | Medium (adoption barrier) | Medium | Ship GTS as reference, comprehensive docs, testing utilities |

### Risk 1: Contract Evolution

**Risk:** Changing domain contracts may break existing MFE entries.

**Mitigation:**
- Use semantic versioning in type IDs (plugin-agnostic)
- New domain versions are new types (not modifications)
- Use plugin's `checkCompatibility()` when available
- Document contract stability levels

### Risk 2: Performance Overhead

**Risk:** Action chain execution adds latency.

**Mitigation:**
- Actions are async by design (no blocking)
- Batch related actions where possible
- Profile and optimize hot paths
- Plugin implementations can optimize type resolution

### Risk 3: Debugging Complexity

**Risk:** Distributed state makes debugging harder.

**Mitigation:**
- Orchestrator logs all action chains with type IDs
- DevTools extension for MFE state inspection
- Clear error messages with chain context and plugin details

### Risk 4: Plugin Implementation Complexity

**Risk:** Implementing a custom Type System plugin requires understanding the full interface.

**Mitigation:**
- Provide comprehensive interface documentation
- Ship GTS plugin as reference implementation
- Create plugin testing utilities
- Minimal required methods vs optional methods clearly documented

### Risk 5: React Version Mismatch

**Risk:** Host and MFE may use different React versions causing runtime crashes.

**Mitigation:**
- Module Federation shared dependency configuration enforces single React instance
- Validate React version at MFE load time before mounting
- Clear error message if version mismatch detected
- Document supported React version ranges

### Risk 6: CSS Leakage Despite Shadow DOM

**Risk:** Some styles may leak into or out of Shadow DOM containers.

**Mitigation:**
- Inject CSS reset (`all: initial`) in shadow root
- Use `contain: content` for additional isolation
- Automated visual regression testing for MFE components
- Document CSS variable naming conventions

### Risk 7: Actions Chain Loops

**Risk:** Circular action chains could cause infinite recursion.

**Mitigation:**
- Implement max chain depth limit (configurable, default: 10)
- Track visited targets in chain execution
- Detect and break loops with clear error message
- Log chain execution path for debugging

### Risk 8: Slow MFE Bundle Loads

**Risk:** Remote MFE bundles may load slowly, degrading user experience.

**Mitigation:**
- Preload known MFEs during idle time
- Show loading skeleton in extension slot
- Configurable timeout with retry mechanism
- Bundle size monitoring and alerts

## Migration Plan

### Phase 1: SDK Contracts and Type System Plugin Infrastructure

**Goal**: Define the plugin interface and core type contracts.

1. Define `TypeSystemPlugin` interface with all required methods
2. Create supporting types (`ParsedTypeId`, `ValidationResult`, `CompatibilityResult`, etc.)
3. Define `GtsMetadata` interface for extracted type ID metadata
4. Create `parseGtsTypeId()` and `hydrateWithMetadata()` utilities
5. Export plugin interface from `@hai3/screensets`
6. Document plugin interface with examples

**Deliverables**:
- `packages/screensets/src/mfe/plugins/types.ts`
- `packages/screensets/src/mfe/types/metadata.ts`
- Plugin interface documentation

### Phase 2: GTS Plugin Implementation

**Goal**: Ship GTS as the default Type System plugin.

1. Implement GTS plugin using `@globaltypesystem/gts-ts`
2. Implement all plugin interface methods (`parseTypeId`, `validateInstance`, etc.)
3. Register HAI3 MFE type schemas (all 7 GTS types)
4. Test all plugin interface methods with real GTS type IDs
5. Export as `@hai3/screensets/plugins/gts`
6. Add peer dependency on `@globaltypesystem/gts-ts`

**Deliverables**:
- `packages/screensets/src/mfe/plugins/gts/index.ts`
- `packages/screensets/src/mfe/schemas/gts-schemas.ts`
- GTS plugin unit tests

### Phase 3: Internal TypeScript Types and Schemas

**Goal**: Define all MFE types with GtsMetadata extraction.

1. Define MFE TypeScript interfaces with generic `TTypeId` (all 7 types)
2. Create JSON schemas with proper `$id` and `x-gts-ref` references
3. Implement `registerHai3Types(plugin)` function
4. Implement x-gts-ref reference validation
5. Export types from `@hai3/screensets`

**Deliverables**:
- `packages/screensets/src/mfe/types/index.ts`
- Complete JSON schema definitions
- Type registration utilities

### Phase 4: Framework Integration

**Goal**: Wire Type System plugin through all layers.

1. Update `ScreensetsOrchestratorConfig` to require `typeSystem`
2. Implement `createScreensetsOrchestrator()` factory
3. Create `MicrofrontendsPluginConfig` for @hai3/framework
4. Implement `createMicrofrontendsPlugin()` factory
5. Register base layout domains via plugin
6. Expose orchestrator via `framework.provide()`

**Deliverables**:
- Updated orchestrator configuration
- Framework microfrontends plugin
- Base domain definitions

### Phase 5: MFE Loading and Shadow DOM

**Goal**: Implement MFE bundle loading with style isolation.

1. Implement `MfeLoader` class with Module Federation 2.0
2. Add manifest validation against GTS schema
3. Implement `createShadowContainer()` for style isolation
4. Implement `syncCssVariables()` for theme propagation
5. Add preloading and retry mechanisms
6. Create loading skeleton components

**Deliverables**:
- `packages/screensets/src/mfe/loader/index.ts`
- `packages/screensets/src/mfe/shadow/index.ts`
- Vite plugin configuration for Module Federation

### Phase 6: Contract Validation and Actions Chain

**Goal**: Implement contract matching and action chain execution.

1. Implement contract matching algorithm (3 subset rules)
2. Add validation at extension registration time
3. Implement `execute(chain)` method in orchestrator
4. Implement success/failure path routing
5. Add max depth limit and loop detection
6. Create clear error messages with type ID context

**Deliverables**:
- `packages/screensets/src/mfe/validation/contract.ts`
- Actions chain executor
- Contract error types and messages

### Phase 7: MfeBridge and State Isolation

**Goal**: Implement the MFE communication layer.

1. Create `MfeBridge` class for MFE-to-orchestrator communication
2. Implement shared property subscription
3. Implement actions chain sending with contract validation
4. Create `useMfeBridge()` React hook
5. Implement isolated state container factory
6. Add state disposal on MFE unmount

**Deliverables**:
- `packages/screensets/src/mfe/bridge/index.ts`
- `MfeBridgeContext` and provider
- State isolation utilities

### Phase 8: Documentation and Examples

**Goal**: Comprehensive documentation and working examples.

1. Update `.ai/targets/SCREENSETS.md` with MFE architecture
2. Create MFE vendor development guide
3. Document `TypeSystemPlugin` interface
4. Document GTS plugin usage and type schemas
5. Create custom plugin implementation guide
6. Create example MFE implementation

**Deliverables**:
- Updated SCREENSETS.md
- Vendor SDK documentation
- Example MFE project

### Phase 9: Production Hardening

**Goal**: Ensure production readiness.

1. Performance testing for action chain execution
2. Bundle size optimization
3. Error boundary implementation
4. DevTools extension for MFE debugging
5. Visual regression testing setup
6. Security audit for cross-MFE communication

**Deliverables**:
- Performance benchmarks
- DevTools extension
- Security documentation

## Open Questions

### Q1: How to handle MFE bundle loading errors?

**Proposal:** Orchestrator provides fallback UI with retry option. Domain can define custom error handling via actions chain.

**Details:**
- Show loading skeleton while bundle loads
- On timeout (configurable, default 30s), show error UI with retry button
- Log error with bundle URL and timeout details
- Domain can provide custom `errorFallbackComponent` in config

### Q2: Should optional properties have defaults?

**Decision:** No. Domain is responsible for providing all values. This keeps the contract simple and explicit.

**Rationale:**
- Defaults would require synchronization between domain and entry
- Domain knows the runtime context, entry does not
- Simpler mental model: domain provides, entry consumes

### Q3: How to version action payloads?

**Proposal:** Action type IDs include version. Breaking payload changes require new action type. Plugin's versioning convention is used.

**Example:**
- `gts.hai3.screensets.ext.action.refresh.v1~` - original action
- `gts.hai3.screensets.ext.action.refresh.v2~` - breaking payload change (new type)
- Domain can support both v1 and v2 during migration

### Q4: Can plugins be swapped at runtime?

**Decision:** No. Plugin is set at initialization and cannot be changed. This ensures type ID consistency throughout the application lifecycle.

**Rationale:**
- Type IDs registered with one plugin may not be valid in another
- Schemas are cached in plugin's internal registry
- Runtime swap would require re-registration of all types

### Q5: How to handle authentication tokens for MFEs?

**Open:** How should MFEs receive authentication tokens for API calls?

**Options:**
1. Pass via shared property (`authToken` in domain's `sharedProperties`)
2. MFE calls host's auth service via actions chain
3. Use browser cookie/session (if same origin)
4. Host provides token refresh callback via bridge

**Recommendation:** Option 1 for simplicity. Domain subscribes to token changes and updates shared property. MFE receives updates via property subscription.

### Q6: How to handle deep linking into MFE routes?

**Open:** If an MFE has internal routing, how does the host handle deep links?

**Options:**
1. MFE reports its route state via action, host updates URL
2. Host passes initial route via shared property on mount
3. MFE manages its own URL segment (path prefix convention)

**Recommendation:** Combination of options 1 and 2. Host provides `initialRoute` property, MFE sends `routeChanged` action when internal navigation occurs.

### Q7: What is the error boundary strategy?

**Open:** How should React error boundaries work across MFE boundaries?

**Options:**
1. Each MFE wrapped in its own error boundary (isolation)
2. Host provides a single error boundary for all MFEs
3. Nested boundaries with escalation

**Recommendation:** Option 1 with escalation. Each MFE has its own boundary. If error occurs, MFE boundary catches it and sends `mfe.error` action to domain. Domain can decide to retry, remove, or show global error.

### Q8: What is the versioning strategy for contracts?

**Open:** How do we handle version compatibility between domain and entry contracts?

**Options:**
1. Exact version match required (strict)
2. Major version compatibility (semver)
3. Feature detection at runtime

**Recommendation:** Option 2 (semver) with plugin's `checkCompatibility()` when available. Breaking changes require major version bump. Additive changes (new optional properties/actions) allowed within major version.
