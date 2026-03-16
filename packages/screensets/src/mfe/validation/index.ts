/**
 * MFE Validation
 *
 * Validation utilities for MFE contracts and type hierarchy.
 *
 * @packageDocumentation
 */

// Contract validation
export {
  validateContract,
  formatContractErrors,
  type ContractValidationResult,
  type ContractError,
  type ContractErrorType,
} from './contract';

// Extension type validation (replaces uiMeta validation)
export { validateExtensionType } from './extension-type';

// Lifecycle validation
export {
  validateDomainLifecycleHooks,
  validateExtensionLifecycleHooks,
  type LifecycleValidationResult,
} from './lifecycle';
