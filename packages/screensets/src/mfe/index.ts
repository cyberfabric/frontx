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

// GTS JSON Loaders (preferred method for loading schemas and instances)
export {
  loadSchemas,
  loadLifecycleStages,
  loadBaseActions,
  loadLayoutDomains,
} from './gts/loader';

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

// Runtime Coordination (abstract class and interface only - concrete implementation is internal)
export { RuntimeCoordinator } from './coordination/types';
export type { RuntimeConnection } from './coordination/types';

// Actions Chains Mediation (abstract class and interfaces only - concrete implementation is internal)
export { ActionsChainsMediator } from './mediator';
export type {
  ChainResult,
  ChainExecutionOptions,
  ActionHandler,
} from './mediator';

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

// NOTE: State Container Factory, Shared Properties Provider, and Runtime Coordination
// are INTERNAL implementation details of ScreensetsRegistry and are NOT publicly exported.
// These are encapsulated within the registry class per SOLID principles.
// If you need these for internal development or testing, import directly from the source files.
