/**
 * @hai3/screensets
 *
 * Pure TypeScript contracts and registry for HAI3 screenset management.
 * This package has ZERO dependencies - SDK Layer (L1).
 *
 * Screensets are HAI3's first-class citizen - self-contained vertical slices
 * that can be composed into applications or injected into external platforms.
 *
 * NOTE: Translations are NOT part of this package. Use @hai3/i18n for translations.
 * Screensets register translations directly with i18nRegistry via framework.
 *
 * @example
 * ```typescript
 * import {
 *   screensetRegistry,
 *   ScreensetDefinition,
 *   ScreensetCategory,
 *   LayoutDomain,
 * } from '@hai3/screensets';
 *
 * const myScreenset: ScreensetDefinition = {
 *   id: 'myApp',
 *   name: 'My Application',
 *   category: ScreensetCategory.Production,
 *   defaultScreen: 'home',
 *   menu: [
 *     { menuItem: homeMenuItem, screen: () => import('./HomeScreen') }
 *   ]
 * };
 *
 * screensetRegistry.register(myScreenset);
 * ```
 */

// ============================================================================
// Registry
// ============================================================================

export { screensetRegistry, createScreensetRegistry } from './registry';

// ============================================================================
// Types and Contracts
// ============================================================================

export {
  // Enums
  LayoutDomain,
  ScreensetCategory,

  // Branded types
  type ScreensetId,
  type ScreenId,

  // Configuration interfaces
  type MenuItemConfig,
  type ScreenLoader,
  type ScreenConfig,
  type MenuScreenItem,
  type ScreensetDefinition,

  // Registry interface
  type ScreensetRegistry,
} from './types';

// ============================================================================
// MFE (Microfrontend) Support
// ============================================================================

// Type System Plugin
export type {
  JSONSchema,
  ValidationError,
  ValidationResult,
  CompatibilityChange,
  CompatibilityResult,
  AttributeResult,
  TypeSystemPlugin,
} from './mfe';

// MFE TypeScript Interfaces
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
  // Action payloads
  LoadExtPayload,
  MountExtPayload,
  UnmountExtPayload,
  // Handler types
  ParentMfeBridge,
  ChildMfeBridge,
  MfeEntryLifecycle,
} from './mfe';

// MFE Handler Abstract Classes (concrete implementations are internal)
export { MfeBridgeFactory, MfeHandler } from './mfe';

// HAI3 Type ID Constants
export { HAI3_CORE_TYPE_IDS, HAI3_LIFECYCLE_STAGE_IDS, HAI3_MF_TYPE_IDS } from './mfe';

// HAI3 Convenience Constants
export {
  HAI3_MFE_ENTRY,
  HAI3_MFE_ENTRY_MF,
  HAI3_MF_MANIFEST,
  HAI3_EXT_DOMAIN,
  HAI3_EXT_EXTENSION,
  HAI3_EXT_ACTION,
  HAI3_ACTION_LOAD_EXT,
  HAI3_ACTION_MOUNT_EXT,
  HAI3_ACTION_UNMOUNT_EXT,
} from './mfe';

// GTS JSON Loaders (preferred method for loading schemas and instances)
export { loadSchemas, loadLifecycleStages, loadBaseActions } from './mfe';

// MFE Runtime (ScreensetsRegistry - the MFE-enabled registry)
export { ScreensetsRegistry, ScreensetsRegistryFactory, screensetsRegistryFactory, ContainerProvider } from './mfe';
export type { ScreensetsRegistryConfig } from './mfe';

// Shadow DOM Utilities
export { createShadowRoot, injectCssVariables, injectStylesheet } from './mfe';
export type { ShadowRootOptions } from './mfe';

// MFE State Container (abstract class for DIP, concrete implementation is internal)
export { MfeStateContainer } from './mfe';
export type { MfeStateContainerConfig } from './mfe';

// MFE Error Classes
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
  NoActionsChainHandlerError,
  BridgeDisposedError,
} from './mfe';

// NOTE: GTS Plugin is NOT re-exported here to avoid pulling in @globaltypesystem/gts-ts
// for consumers who don't need it. Import directly from '@hai3/screensets/plugins/gts'
