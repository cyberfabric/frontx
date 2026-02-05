/**
 * Contract Matching Validation
 *
 * Validates that MFE entries are compatible with extension domains before mounting.
 *
 * @packageDocumentation
 */

import type { MfeEntry } from '../types/mfe-entry';
import type { ExtensionDomain } from '../types/extension-domain';

/**
 * Error types for contract validation failures
 */
export type ContractErrorType =
  | 'missing_property'
  | 'unsupported_action'
  | 'unhandled_domain_action';

/**
 * Contract validation error details
 */
export interface ContractError {
  /** Error type */
  type: ContractErrorType;
  /** Human-readable error details */
  details: string;
}

/**
 * Result of contract validation
 */
export interface ContractValidationResult {
  /** Whether the contract is valid */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ContractError[];
}

/**
 * Validate that an MFE entry is compatible with an extension domain.
 *
 * Contract matching rules (all must be satisfied):
 * 1. entry.requiredProperties ⊆ domain.sharedProperties
 *    (domain provides all properties required by entry)
 * 2. entry.actions ⊆ domain.extensionsActions
 *    (domain accepts all action types the MFE may send to it)
 * 3. domain.actions ⊆ entry.domainActions
 *    (MFE can handle all action types that may target it)
 *
 * @param entry - The MFE entry to validate
 * @param domain - The extension domain to validate against
 * @returns Validation result with errors if invalid
 */
export function validateContract(
  entry: MfeEntry,
  domain: ExtensionDomain
): ContractValidationResult {
  const errors: ContractError[] = [];

  // Rule 1: Required properties subset check
  // entry.requiredProperties must be a subset of domain.sharedProperties
  for (const prop of entry.requiredProperties) {
    if (!domain.sharedProperties.includes(prop)) {
      errors.push({
        type: 'missing_property',
        details: `Entry requires property '${prop}' not provided by domain`,
      });
    }
  }

  // Rule 2: Entry actions subset check
  // entry.actions must be a subset of domain.extensionsActions
  for (const action of entry.actions) {
    if (!domain.extensionsActions.includes(action)) {
      errors.push({
        type: 'unsupported_action',
        details: `MFE may send action '${action}' not accepted by domain`,
      });
    }
  }

  // Rule 3: Domain actions subset check
  // domain.actions must be a subset of entry.domainActions
  for (const action of domain.actions) {
    if (!entry.domainActions.includes(action)) {
      errors.push({
        type: 'unhandled_domain_action',
        details: `Action '${action}' may target MFE but MFE doesn't handle it`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format contract validation errors into a human-readable message.
 *
 * @param result - The contract validation result
 * @returns Formatted error message
 */
export function formatContractErrors(result: ContractValidationResult): string {
  if (result.valid) {
    return 'Contract is valid';
  }

  const lines = ['Contract validation failed:'];

  for (const error of result.errors) {
    lines.push(`  - [${error.type}] ${error.details}`);
  }

  return lines.join('\n');
}
