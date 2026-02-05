/**
 * Dynamic uiMeta Validation
 *
 * Validates that an Extension's uiMeta conforms to its domain's extensionsUiMetaTypeId schema
 * using the type ID reference pattern.
 *
 * Implementation follows Decision 9 in design/type-system.md:
 * - Domain has optional extensionsUiMetaTypeId field (type ID reference)
 * - Extension has optional uiMeta field (instance data)
 * - Validate using standard plugin.validateInstance(typeId, instance)
 * - No pre-registration needed - the uiMeta schema is a separate GTS type
 *
 * @packageDocumentation
 */

import type { TypeSystemPlugin, ValidationResult } from '../plugins/types';
import type { Extension } from '../types/extension';
import type { ExtensionDomain } from '../types/extension-domain';

/**
 * Validate an Extension's uiMeta against its domain's extensionsUiMetaTypeId.
 *
 * Implementation follows Decision 9 type ID reference pattern:
 * 1. Check if domain has extensionsUiMetaTypeId - skip validation if not
 * 2. Check if extension has uiMeta - skip validation if not
 * 3. Validate using standard plugin.validateInstance(typeId, instance)
 * 4. Transform validation errors to include uiMeta context
 *
 * @param plugin - Type System plugin instance
 * @param domain - Extension domain (contains optional extensionsUiMetaTypeId)
 * @param extension - Extension with optional uiMeta to validate
 * @returns Validation result with errors if invalid
 */
export function validateExtensionUiMeta(
  plugin: TypeSystemPlugin,
  domain: ExtensionDomain,
  extension: Extension
): ValidationResult {
  try {
    // 1. If domain doesn't specify extensionsUiMetaTypeId, skip validation
    if (!domain.extensionsUiMetaTypeId) {
      return { valid: true, errors: [] };
    }

    // 2. If extension doesn't have uiMeta, skip validation
    if (!extension.uiMeta) {
      return { valid: true, errors: [] };
    }

    // 3. Validate using standard validateInstance
    const result = plugin.validateInstance(
      domain.extensionsUiMetaTypeId,
      extension.uiMeta
    );

    // 4. Transform errors to include uiMeta context and type ID
    if (!result.valid) {
      return {
        valid: false,
        errors: result.errors.map((error) => {
          // If schema is not found, provide clearer error message
          if (error.keyword === 'schema-not-found') {
            return {
              ...error,
              path: 'uiMeta',
              message: `Type '${domain.extensionsUiMetaTypeId}' may not be registered.`,
            };
          }

          return {
            ...error,
            path: `uiMeta${error.path ? '.' + error.path : ''}`,
            message: `uiMeta validation failed against ${domain.extensionsUiMetaTypeId}: ${error.message}`,
          };
        }),
      };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    // Handle case where referenced type is not registered
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it's a "schema not found" error
    if (errorMessage.includes('Schema not found')) {
      return {
        valid: false,
        errors: [
          {
            path: 'uiMeta',
            message: `Type '${domain.extensionsUiMetaTypeId}' may not be registered.`,
            keyword: 'schema-not-found',
          },
        ],
      };
    }

    return {
      valid: false,
      errors: [
        {
          path: 'uiMeta',
          message: `uiMeta validation error: ${errorMessage}`,
          keyword: 'validation-error',
        },
      ],
    };
  }
}
