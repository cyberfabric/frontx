/**
 * Type System Plugin for MFE contracts
 *
 * The @hai3/screensets package treats type IDs as OPAQUE STRINGS.
 * All type ID understanding (parsing, format validation, building) is delegated to the plugin.
 *
 * @packageDocumentation
 */

/**
 * JSON Schema type (simplified for type system plugin interface)
 */
export interface JSONSchema {
  $id?: string;
  $schema?: string;
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  allOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  $ref?: string;
  items?: JSONSchema | JSONSchema[];
  [key: string]: unknown;
}

/**
 * Single validation error
 */
export interface ValidationError {
  /** Path to the property that failed validation */
  path: string;
  /** Human-readable error message */
  message: string;
  /** Schema keyword that caused the error */
  keyword: string;
}

/**
 * Result of schema validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];
}

/**
 * Single compatibility change between type versions
 */
export interface CompatibilityChange {
  /** Type of change */
  type: 'added' | 'removed' | 'modified';
  /** Path to the changed property */
  path: string;
  /** Human-readable description of the change */
  description: string;
}

/**
 * Result of compatibility check between two type versions
 */
export interface CompatibilityResult {
  /** Whether the new type is compatible with the old type */
  compatible: boolean;
  /** Whether there are breaking changes */
  breaking: boolean;
  /** List of all changes detected */
  changes: CompatibilityChange[];
}

/**
 * Result of attribute access via property path
 */
export interface AttributeResult {
  /** The type ID that was queried */
  typeId: string;
  /** The property path that was accessed */
  path: string;
  /** Whether the attribute was found */
  resolved: boolean;
  /** The value if resolved (undefined if not resolved) */
  value?: unknown;
  /** Error message if not resolved */
  error?: string;
}

/**
 * Type System Plugin interface
 *
 * Abstracts type system operations for MFE contracts.
 * The screensets package treats type IDs as OPAQUE STRINGS.
 * All type ID understanding is delegated to the plugin.
 *
 * @example
 * ```typescript
 * // Using the GTS plugin (default)
 * import { screensetsRegistryFactory, gtsPlugin } from '@hai3/screensets';
 *
 * const registry = screensetsRegistryFactory.build({ typeSystem: gtsPlugin });
 * registry.registerDomain(myDomain, containerProvider);
 * ```
 */
export interface TypeSystemPlugin {
  /** Plugin identifier */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  // === Type ID Operations ===

  /**
   * Check if a string is a valid type ID format.
   * Used before any operation that requires a valid type ID.
   *
   * @param id - String to check
   * @returns true if the string is a valid type ID format
   */
  isValidTypeId(id: string): boolean;

  /**
   * Parse a type ID into plugin-specific components.
   * Returns a generic object - the structure is plugin-defined.
   * Use this when you need metadata about a type ID.
   *
   * Note: buildTypeId() is intentionally omitted. GTS type IDs are consumed
   * (validated, parsed) but never programmatically generated at runtime.
   * All type IDs are defined as string constants.
   *
   * @param id - Type ID to parse
   * @returns Plugin-specific metadata object
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
   *
   * @param schema - JSON Schema to register
   * @throws Error if schema does not have a $id field
   */
  registerSchema(schema: JSONSchema): void;

  /**
   * Get the schema registered for a type ID.
   *
   * @param typeId - Type ID identifying the schema
   * @returns JSON Schema if found, undefined otherwise
   */
  getSchema(typeId: string): JSONSchema | undefined;

  // === Instance Registry (GTS-Native Approach) ===

  /**
   * Register any GTS entity (schema or instance) with the type system.
   * For instances, the entity must have an `id` field containing the instance ID.
   *
   * gts-ts uses the instance ID to automatically determine the schema:
   * - Instance ID: `gts.hai3.mfes.ext.extension.v1~acme.widget.v1`
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
   * - Instance ID: `gts.hai3.mfes.ext.extension.v1~acme.widget.v1`
   * - Schema ID:   `gts.hai3.mfes.ext.extension.v1~`
   *
   * @param instanceId - The instance ID (does NOT end with ~)
   * @returns Validation result
   */
  validateInstance(instanceId: string): ValidationResult;

  // === Query ===

  /**
   * Query registered type IDs matching a pattern.
   * Pattern matching is plugin-specific.
   *
   * @param pattern - Pattern to match (format is plugin-specific)
   * @param limit - Optional limit on number of results
   * @returns Array of matching type IDs
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
   * Check compatibility between two type versions.
   *
   * @param oldTypeId - Old version type ID
   * @param newTypeId - New version type ID
   * @returns Compatibility result with breaking change analysis
   */
  checkCompatibility(oldTypeId: string, newTypeId: string): CompatibilityResult;

  // === Attribute Access (REQUIRED for dynamic schema resolution) ===

  /**
   * Get an attribute value from a type using property path.
   * Used for dynamic schema resolution (e.g., getting domain's extensionsTypeId).
   *
   * @param typeId - Type ID to query
   * @param path - Property path to access (e.g., "extensionsTypeId")
   * @returns Attribute result with value if resolved
   */
  getAttribute(typeId: string, path: string): AttributeResult;
}
