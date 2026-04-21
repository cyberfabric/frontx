/**
 * Domain-Specific Extension Validation via Derived Types
 *
 * Validates that an Extension's type conforms to its domain's extensionsTypeId
 * requirement. This enables domain-specific fields without separate uiMeta
 * entities or custom Ajv validation.
 *
 * Schema validation runs automatically inside `plugin.register(extension)` —
 * an invalid extension throws before this function needs to check anything.
 * This helper focuses on the remaining, type-hierarchy-specific check that
 * the plugin does not encode: whether `extension.id` derives from the
 * domain's required `extensionsTypeId`.
 *
 * @packageDocumentation
 */
// @cpt-algo:cpt-frontx-algo-screenset-registry-extension-type-validation:p1

import type { TypeSystemPlugin } from '../plugins/types';
import type { Extension } from '../types/extension';
import type { ExtensionDomain } from '../types/extension-domain';
import { ExtensionTypeError } from '../errors';

/**
 * Validate extension type hierarchy against the domain's requirement.
 *
 * Prerequisite: `plugin.register(extension)` must have been called successfully
 * (schema validation passes automatically on register).
 *
 * @param plugin - Type System plugin instance
 * @param domain - Extension domain (contains optional extensionsTypeId)
 * @param extension - Extension whose type hierarchy should be verified
 * @throws ExtensionTypeError if domain requires `extensionsTypeId` and the
 *   extension's type does not derive from it.
 */
// @cpt-begin:cpt-frontx-algo-screenset-registry-extension-type-validation:p1:inst-1
export function validateExtensionType(
  plugin: TypeSystemPlugin,
  domain: ExtensionDomain,
  extension: Extension
): void {
  if (!domain.extensionsTypeId) {
    return;
  }
  if (!plugin.isTypeOf(extension.id, domain.extensionsTypeId)) {
    throw new ExtensionTypeError(extension.id, domain.extensionsTypeId);
  }
}
// @cpt-end:cpt-frontx-algo-screenset-registry-extension-type-validation:p1:inst-1
