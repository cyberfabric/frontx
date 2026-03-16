/**
 * Lifecycle Validation
 *
 * Validation utilities for lifecycle hooks and stages.
 *
 * @packageDocumentation
 */

import type { ExtensionDomain, Extension } from '../types';

/**
 * Result of lifecycle hook validation
 */
export interface LifecycleValidationResult {
  valid: boolean;
  errors: Array<{
    stage: string;
    message: string;
  }>;
}

/**
 * Validate that an extension domain's lifecycle hooks reference supported stages.
 *
 * This is a stateless validation helper that takes all dependencies as parameters
 * and returns a ValidationResult. It does not manage state or coordinate components.
 *
 * @param domain - The extension domain to validate
 * @returns Validation result with errors if any hooks reference unsupported stages
 *
 * @example
 * ```typescript
 * const result = validateDomainLifecycleHooks(domain);
 * if (!result.valid) {
 *   console.error('Invalid lifecycle hooks:', result.errors);
 * }
 * ```
 */
export function validateDomainLifecycleHooks(
  domain: ExtensionDomain
): LifecycleValidationResult {
  const errors: Array<{ stage: string; message: string }> = [];

  // Skip validation if domain has no lifecycle hooks
  if (!domain.lifecycle || domain.lifecycle.length === 0) {
    return { valid: true, errors: [] };
  }

  // Validate each hook references a supported domain stage
  for (const hook of domain.lifecycle) {
    if (!domain.lifecycleStages.includes(hook.stage)) {
      errors.push({
        stage: hook.stage,
        message: `Domain lifecycle hook references unsupported stage '${hook.stage}'. Supported stages: ${domain.lifecycleStages.join(', ')}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that an extension's lifecycle hooks reference stages supported by its domain.
 *
 * This is a stateless validation helper that takes all dependencies as parameters
 * and returns a ValidationResult. It does not manage state or coordinate components.
 *
 * @param extension - The extension to validate
 * @param domain - The domain the extension mounts into
 * @returns Validation result with errors if any hooks reference unsupported stages
 *
 * @example
 * ```typescript
 * const result = validateExtensionLifecycleHooks(extension, domain);
 * if (!result.valid) {
 *   console.error('Invalid lifecycle hooks:', result.errors);
 * }
 * ```
 */
export function validateExtensionLifecycleHooks(
  extension: Extension,
  domain: ExtensionDomain
): LifecycleValidationResult {
  const errors: Array<{ stage: string; message: string }> = [];

  // Skip validation if extension has no lifecycle hooks
  if (!extension.lifecycle || extension.lifecycle.length === 0) {
    return { valid: true, errors: [] };
  }

  // Validate each hook references a supported extension stage in the domain
  for (const hook of extension.lifecycle) {
    if (!domain.extensionsLifecycleStages.includes(hook.stage)) {
      errors.push({
        stage: hook.stage,
        message: `Extension lifecycle hook references unsupported stage '${hook.stage}'. Domain '${domain.id}' supports: ${domain.extensionsLifecycleStages.join(', ')}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
