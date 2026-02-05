/**
 * GTS Plugin Implementation
 *
 * Implements TypeSystemPlugin using @globaltypesystem/gts-ts.
 * First-class citizen schemas are registered during plugin construction.
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
import { mfeGtsSchemas } from '../../schemas/gts-schemas';

/**
 * Create a GTS plugin instance.
 * All first-class citizen schemas are registered during construction.
 * The plugin is ready to use immediately - no additional setup required.
 *
 * @returns TypeSystemPlugin instance configured for HAI3 MFE types
 */
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
    // createJsonEntity wraps the schema as a JsonEntity for registration
    const entity: JsonEntity = createJsonEntity(schema);
    gtsStore.register(entity);
  }

  return {
    name: 'gts',
    version: '1.0.0',

    // Type ID operations - using standalone functions from gts-ts
    isValidTypeId(id: string): boolean {
      return isValidGtsID(id);
    },

    // Note: buildTypeId() is intentionally omitted. GTS type IDs are consumed
    // (validated, parsed) but never programmatically generated at runtime.
    // All type IDs are defined as string constants.

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
    },

    // Schema registry - for vendor/dynamic schemas only
    // First-class schemas are already registered during construction
    registerSchema(schema: JSONSchema): void {
      const entity: JsonEntity = createJsonEntity(schema);
      gtsStore.register(entity);
    },

    validateInstance(typeId: string, instance: unknown): ValidationResult {
      try {
        // Check if schema exists
        const schema = gtsStore.get(typeId);
        if (!schema) {
          return {
            valid: false,
            errors: [
              {
                path: '',
                message: `Schema not found for type: ${typeId}`,
                keyword: 'schema-not-found',
              },
            ],
          };
        }

        // Create a temporary instance entity derived from the schema type
        // Use timestamp to create unique derived type ID
        // Format: baseTypeId + hai3.screensets.temp.inst_<timestamp>.v1~
        const timestamp = Date.now();
        const tempInstanceId = `${typeId}hai3.screensets.temp.inst_${timestamp}.v1~`;

        const instanceEntity: JsonEntity = createJsonEntity({
          $id: `gts://${tempInstanceId}`,
          $schema: `gts://${typeId}`,
          ...(typeof instance === 'object' && instance !== null ? instance : {}),
        });

        gtsStore.register(instanceEntity);

        const result: GtsValidationResult = gtsStore.validateInstance(tempInstanceId);

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
      } catch (error) {
        return {
          valid: false,
          errors: [
            {
              path: '',
              message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
              keyword: 'validation-error',
            },
          ],
        };
      }
    },

    getSchema(typeId: string): JSONSchema | undefined {
      // GtsStore.get() returns JsonEntity | undefined
      const entity = gtsStore.get(typeId);
      if (!entity) return undefined;
      // JsonEntity.content contains the actual schema/instance data
      return entity.content as JSONSchema;
    },

    // Query - using GtsQuery.query() static method
    query(pattern: string, limit?: number): string[] {
      const result: GtsQueryResult = GtsQuery.query(gtsStore, pattern, limit);
      return result.items || [];
    },

    // Type Hierarchy
    isTypeOf(typeId: string, baseTypeId: string): boolean {
      // GTS type derivation: derived types include the base type ID as a prefix
      // e.g., 'gts.hai3.screensets.mfe.entry.v1~acme.corp.mfe.entry_acme.v1~'
      // is derived from 'gts.hai3.screensets.mfe.entry.v1~'
      return typeId.startsWith(baseTypeId) || typeId === baseTypeId;
    },

    // Compatibility (REQUIRED) - checkCompatibility is on GtsStore
    checkCompatibility(oldTypeId: string, newTypeId: string): CompatibilityResult {
      const result: GtsCompatibilityResult = gtsStore.checkCompatibility(oldTypeId, newTypeId);
      const errors = result.errors || [];
      const warnings = result.warnings || [];

      return {
        compatible: result.compatible,
        breaking: !result.compatible && errors.length > 0,
        changes: [
          ...errors.map((e) => ({
            type: 'removed' as const,
            path: '',
            description: e,
          })),
          ...warnings.map((w) => ({
            type: 'modified' as const,
            path: '',
            description: w,
          })),
        ],
      };
    },

    // Attribute Access (REQUIRED for dynamic schema resolution)
    getAttribute(typeId: string, path: string): AttributeResult {
      const result = gtsStore.getAttribute(typeId, path);
      return {
        typeId,
        path,
        resolved: result !== undefined,
        value: result,
        error:
          result === undefined ? `Attribute '${path}' not found in type '${typeId}'` : undefined,
      };
    },
  };
}

/**
 * Default GTS plugin singleton instance.
 * All first-class citizen schemas are built-in and ready to use.
 *
 * @example
 * ```typescript
 * import { gtsPlugin } from '@hai3/screensets/plugins/gts';
 *
 * const runtime = createScreensetsRegistry({
 *   typeSystem: gtsPlugin
 * });
 * ```
 */
export const gtsPlugin = createGtsPlugin();
