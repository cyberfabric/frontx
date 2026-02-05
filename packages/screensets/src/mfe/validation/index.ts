/**
 * MFE Validation
 *
 * Validation utilities for MFE contracts and metadata.
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

// uiMeta validation
export { validateExtensionUiMeta } from './uimeta';
