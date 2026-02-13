/**
 * GTS Plugin Implementation
 *
 * Implements TypeSystemPlugin using @globaltypesystem/gts-ts.
 * First-class citizen schemas are registered during plugin construction.
 *
 * GTS-Native Validation Model:
 * - All runtime entities (schemas AND instances) must be registered with gtsStore
 * - Validation happens on registered instances by their instance ID
 * - Schema IDs end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~`)
 * - Instance IDs do NOT end with `~` (e.g., `gts.hai3.mfes.ext.extension.v1~acme.widget.v1`)
 * - gts-ts extracts the schema ID from the chained instance ID automatically
 * - gts-ts uses Ajv INTERNALLY - we do NOT need Ajv as a direct dependency
 *
 * @packageDocumentation
 */

import {
  isValidGtsID,
  parseGtsID,
  GtsStore,
  GtsQuery,
  createJsonEntity,
  type ParseResult,
  type ValidationResult as GtsValidationResult,
  type CompatibilityResult as GtsCompatibilityResult,
  type QueryResult as GtsQueryResult,
  type JsonEntity,
} from '@globaltypesystem/gts-ts';
import type {
  TypeSystemPlugin,
  ValidationResult,
  CompatibilityResult,
  AttributeResult,
  JSONSchema,
} from '../types';
import { loadSchemas, loadLifecycleStages, loadBaseActions } from '../../gts/loader';

/**
 * Concrete GTS plugin class implementing TypeSystemPlugin.
 *
 * Uses @globaltypesystem/gts-ts internally. First-class citizen schemas
 * are registered during construction -- the plugin is ready to use
 * immediately after instantiation.
 *
 * The gtsPlugin singleton constant is the only public instance.
 * Tests that need multiple isolated instances should construct new GtsPlugin() directly.
 *
 * @internal - Exported only for test usage. External code should use gtsPlugin singleton.
 */
export class GtsPlugin implements TypeSystemPlugin {
  readonly name = 'gts';
  readonly version = '1.0.0';

  private readonly gtsStore: GtsStore;

  constructor() {
    this.gtsStore = new GtsStore();

    // Load and register all first-class citizen schemas from JSON files (10 schemas)
    // These schemas are stored in packages/screensets/src/mfe/gts/hai3.mfe/schemas/
    const schemas = loadSchemas();
    for (const schema of schemas) {
      const entity: JsonEntity = createJsonEntity(schema);
      this.gtsStore.register(entity);
    }

    // Load and register default lifecycle stage instances from JSON files (4 instances)
    // These instances are stored in packages/screensets/src/mfe/gts/hai3.mfe/instances/lifecycle-stages/
    const lifecycleStages = loadLifecycleStages();
    for (const instance of lifecycleStages) {
      const entity: JsonEntity = createJsonEntity(instance);
      this.gtsStore.register(entity);
    }

    // Load and register base action instances from JSON files (2 instances)
    // These instances are stored in packages/screensets/src/mfe/gts/hai3.mfe/instances/actions/
    const baseActions = loadBaseActions();
    for (const action of baseActions) {
      const entity: JsonEntity = createJsonEntity(action);
      this.gtsStore.register(entity);
    }
  }

  // === Type ID Operations ===
  // Note: buildTypeId() is intentionally omitted. GTS type IDs are consumed
  // (validated, parsed) but never programmatically generated at runtime.
  // All type IDs are defined as string constants.

  isValidTypeId(id: string): boolean {
    return isValidGtsID(id);
  }

  parseTypeId(id: string): Record<string, unknown> {
    // parseGtsID returns ParseResult { ok, segments, error }
    const result: ParseResult = parseGtsID(id);
    if (!result.ok || result.segments.length === 0) {
      throw new Error(result.error ?? `Invalid GTS ID: ${id}`);
    }
    // Return the first segment's components (primary type identifier)
    const segment = result.segments[0];
    return {
      vendor: segment.vendor,
      package: segment.package,
      namespace: segment.namespace,
      type: segment.type,
      verMajor: segment.verMajor,
      verMinor: segment.verMinor,
      // For derived types, include additional segments
      segments: result.segments,
    };
  }

  // === Schema Registry ===
  // First-class schemas are already registered during construction.
  // registerSchema is for vendor/dynamic schemas only.

  registerSchema(schema: JSONSchema): void {
    const entity: JsonEntity = createJsonEntity(schema);
    this.gtsStore.register(entity);
  }

  getSchema(typeId: string): JSONSchema | undefined {
    // GtsStore.get() returns JsonEntity | undefined
    const entity = this.gtsStore.get(typeId);
    if (!entity) return undefined;
    // JsonEntity.content contains the actual schema/instance data
    if (!entity.content || typeof entity.content !== 'object') {
      return undefined;
    }
    return entity.content as JSONSchema;
  }

  // === Instance Registry (GTS-native approach) ===

  register(entity: unknown): void {
    // Wrap the entity in a JsonEntity for gts-ts
    // gts-ts requires all entities to be wrapped as JsonEntity
    // For instances, the entity must have an `id` field
    const jsonEntity: JsonEntity = createJsonEntity(entity);
    this.gtsStore.register(jsonEntity);
  }

  // === Validation ===

  validateInstance(instanceId: string): ValidationResult {
    // GtsStore.validateInstance takes the instance ID (NOT schema ID)
    // gts-ts extracts the schema ID from the chained instance ID:
    // - Instance ID: gts.hai3.mfes.ext.extension.v1~acme.widget.v1
    // - Schema ID:   gts.hai3.mfes.ext.extension.v1~ (extracted automatically)
    const result: GtsValidationResult = this.gtsStore.validateInstance(instanceId);
    return {
      valid: result.ok && (result.valid ?? false),
      errors: result.error
        ? [
            {
              path: '',
              message: result.error,
              keyword: 'validation',
            },
          ]
        : [],
    };
  }

  // === Query ===

  query(pattern: string, limit?: number): string[] {
    const result: GtsQueryResult = GtsQuery.query(this.gtsStore, pattern, limit);
    // GtsQuery returns full entity objects, extract type IDs
    return (result.items || []).map((item: { $id?: string }) => {
      if (typeof item === 'string') return item;
      // Extract ID from $id field, removing 'gts://' prefix
      const id = item.$id || '';
      return id.startsWith('gts://') ? id.slice(6) : id;
    });
  }

  // === Type Hierarchy ===

  isTypeOf(typeId: string, baseTypeId: string): boolean {
    // GTS type derivation: derived types include the base type ID as a prefix
    // e.g., 'gts.hai3.mfes.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~'
    // is derived from 'gts.hai3.mfes.mfe.entry.v1~'
    return typeId.startsWith(baseTypeId) || typeId === baseTypeId;
  }

  // === Compatibility (REQUIRED) ===

  checkCompatibility(oldTypeId: string, newTypeId: string): CompatibilityResult {
    const result: GtsCompatibilityResult = this.gtsStore.checkCompatibility(oldTypeId, newTypeId);
    const backwardErrors = result.backward_errors || [];
    const forwardErrors = result.forward_errors || [];

    return {
      compatible: result.is_fully_compatible,
      breaking: !result.is_fully_compatible && backwardErrors.length > 0,
      changes: [
        ...backwardErrors.map((e: string) => ({
          type: 'removed' as const,
          path: '',
          description: e,
        })),
        ...forwardErrors.map((w: string) => ({
          type: 'added' as const,
          path: '',
          description: w,
        })),
      ],
    };
  }

  // === Attribute Access (REQUIRED for dynamic schema resolution) ===

  getAttribute(typeId: string, path: string): AttributeResult {
    const result = this.gtsStore.getAttribute(typeId, path);
    return {
      typeId,
      path,
      resolved: result !== undefined,
      value: result,
      error:
        result === undefined ? `Attribute '${path}' not found in type '${typeId}'` : undefined,
    };
  }
}

/**
 * GTS plugin singleton instance.
 * All first-class citizen schemas are built-in and ready to use.
 *
 * @example
 * ```typescript
 * import { gtsPlugin, screensetsRegistryFactory } from '@hai3/screensets';
 *
 * // Build the registry with GTS plugin at application wiring time
 * const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
 *
 * // Use the registry
 * registry.registerDomain(myDomain, containerProvider);
 * ```
 */
export const gtsPlugin: TypeSystemPlugin = new GtsPlugin();
