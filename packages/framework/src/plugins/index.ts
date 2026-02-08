/**
 * Plugin exports
 */

export { screensets } from './screensets';
export { themes } from './themes';
export { layout } from './layout';
export { navigation } from './navigation';
export { routing } from './routing';
export { i18n } from './i18n';
export { effects } from './effects';
export { mock, type MockPluginConfig } from './mock';
export {
  microfrontends,
  createSidebarDomain,
  createPopupDomain,
  createScreenDomain,
  createOverlayDomain,
  // MFE actions
  loadExtension,
  preloadExtension,
  mountExtension,
  unmountExtension,
  handleMfeHostAction,
  // MFE slice and selectors
  selectMfeLoadState,
  selectMfeMountState,
  selectMfeError,
  selectAllExtensionStates,
  // MFE components
  MfeErrorBoundary,
  MfeLoadingIndicator,
  ShadowDomContainer,
  // Types
  type MfeState,
  type MfeLoadState,
  type MfeMountState,
  type ExtensionMfeState,
  type LoadExtensionPayload,
  type PreloadExtensionPayload,
  type MountExtensionPayload,
  type UnmountExtensionPayload,
  type HostActionPayload,
  type MfeErrorBoundaryConfig,
  type MfeLoadingIndicatorConfig,
  type ShadowDomContainerConfig,
  // HAI3 layout domain constants
  HAI3_POPUP_DOMAIN,
  HAI3_SIDEBAR_DOMAIN,
  HAI3_SCREEN_DOMAIN,
  HAI3_OVERLAY_DOMAIN,
} from './microfrontends';
