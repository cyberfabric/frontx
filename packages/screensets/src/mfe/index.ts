/**
 * MFE (Microfrontend) support exports
 *
 * @packageDocumentation
 */

// Type System Plugin
export type {
  JSONSchema,
  ValidationError,
  ValidationResult,
  CompatibilityChange,
  CompatibilityResult,
  AttributeResult,
  TypeSystemPlugin,
} from './plugins';

// NOTE: GTS Plugin is NOT re-exported here to avoid pulling in @globaltypesystem/gts-ts
// for consumers who don't need it. Import directly from '@hai3/screensets/plugins/gts'

// HAI3 Type ID Constants
export { HAI3_CORE_TYPE_IDS, HAI3_LIFECYCLE_STAGE_IDS, HAI3_MF_TYPE_IDS } from './init';

// GTS Schemas (for reference/documentation)
export { mfeGtsSchemas } from './schemas/gts-schemas';

// TypeScript Interfaces
export type {
  MfeEntry,
  MfeEntryMF,
  ExtensionDomain,
  Extension,
  SharedProperty,
  Action,
  ActionsChain,
  LifecycleStage,
  LifecycleHook,
  MfManifest,
  SharedDependencyConfig,
} from './types';

// Runtime
export {
  ScreensetsRegistry,
  createScreensetsRegistry,
} from './runtime';
export type { ScreensetsRegistryConfig } from './runtime';

// Handler Types
export type {
  ParentMfeBridge,
  MfeEntryLifecycle,
  LoadedMfe,
  MfeBridgeFactory,
  MfeHandler,
} from './handler/types';

// Validation
export type {
  ContractError,
  ContractErrorType,
  ContractValidationResult,
} from './validation/contract';
export { validateContract, formatContractErrors } from './validation/contract';
export { validateExtensionType } from './validation/extension-type';

// Error Classes
export {
  MfeError,
  MfeLoadError,
  ContractValidationError,
  ExtensionTypeError,
  ChainExecutionError,
  MfeVersionMismatchError,
  MfeTypeConformanceError,
  DomainValidationError,
  ExtensionValidationError,
  UnsupportedDomainActionError,
  UnsupportedLifecycleStageError,
} from './errors';
