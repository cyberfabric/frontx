/**
 * @hai3/framework - HAI3 Framework Package
 *
 * This package provides:
 * - Plugin architecture for composable HAI3 applications
 * - Registries for screensets, themes, routes
 * - Presets for common configurations
 * - Re-exports from SDK packages for convenience
 *
 * Framework Layer: L2 (Depends on all SDK packages)
 */

// ============================================================================
// Core Exports
// ============================================================================

export { createHAI3 } from './createHAI3';
export { createHAI3App, type HAI3AppConfig } from './createHAI3App';

// ============================================================================
// Plugin Exports
// ============================================================================

export {
  screensets,
  themes,
  layout,
  navigation,
  routing,
  i18n,
  effects,
} from './plugins';

// ============================================================================
// Preset Exports
// ============================================================================

export { presets, full, minimal, headless, type FullPresetConfig } from './presets';

// ============================================================================
// Registry Exports
// ============================================================================

export {
  createScreensetRegistry,
  createThemeRegistry,
  createRouteRegistry,
} from './registries';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  HAI3Config,
  HAI3Plugin,
  HAI3AppBuilder,
  HAI3App,
  PluginFactory,
  PluginProvides,
  PluginLifecycle,
  ScreensetRegistry,
  ThemeRegistry,
  ThemeConfig,
  ThemeApplyFn,
  UikitTheme,
  RouteRegistry,
  Preset,
  Presets,
  ScreensetsConfig,
  ThemesConfig,
  NavigateToScreenPayload,
  NavigateToScreensetPayload,
  ShowPopupPayload,
  ChangeThemePayload,
  SetLanguagePayload,
} from './types';

// ============================================================================
// Re-exports from SDK packages for convenience
// ============================================================================

// From @hai3/state (unified Flux dataflow pattern)
export { eventBus, createStore, getStore, registerSlice, hasSlice, createSlice } from '@hai3/state';
export type {
  ReducerPayload,
  EventPayloadMap,
  EventHandler,
  Subscription,
  RootState,
  AppDispatch,
  SliceObject,
  EffectInitializer,
} from '@hai3/state';

// Re-export HAI3Store from types (wrapped version)
export type { HAI3Store } from './types';

// From @hai3/screensets (contracts only - SDK Layer L1)
export {
  LayoutDomain,
  ScreensetCategory,
  // Note: createScreensetRegistry is exported from ./registries (framework version)
  // SDK version is available via: import { createScreensetRegistry } from '@hai3/screensets'
} from '@hai3/screensets';

// Re-export screensetRegistry from compat (wraps SDK registry with framework interface)
// Note: screensetRegistry is also exported from ./compat further down

export type {
  ScreensetId,
  ScreenId,
  MenuItemConfig,
  ScreenLoader,
  ScreenConfig,
  MenuScreenItem,
  ScreensetDefinition,
  ScreensetRegistry as ScreensetRegistryContract,
} from '@hai3/screensets';

// Layout slices (owned by @hai3/framework)
export {
  layoutReducer,
  layoutDomainReducers,
  LAYOUT_SLICE_NAME,
  // Tenant slice (app-level, not layout)
  TENANT_SLICE_NAME,
  tenantSlice,
  tenantActions,
  tenantReducer,
  setTenant,
  setTenantLoading,
  clearTenant,
  // Mock slice (app-level, not layout)
  mockSlice,
  mockActions,
  setMockEnabled,
  // Domain slices
  headerSlice,
  footerSlice,
  menuSlice,
  sidebarSlice,
  screenSlice,
  popupSlice,
  overlaySlice,
  // Domain actions
  headerActions,
  footerActions,
  menuActions,
  sidebarActions,
  screenActions,
  popupActions,
  overlayActions,
  // Individual reducer functions - header
  setUser,
  setHeaderLoading,
  clearUser,
  // Individual reducer functions - footer
  setFooterVisible,
  setFooterConfig,
  toggleMenu,
  setMenuCollapsed,
  setMenuItems,
  setMenuVisible,
  setMenuConfig,
  toggleSidebar,
  setSidebarCollapsed,
  setSidebarPosition,
  setSidebarTitle,
  setSidebarContent,
  setSidebarVisible,
  setSidebarWidth,
  setSidebarConfig,
  setActiveScreen,
  setScreenLoading,
  navigateTo,
  clearActiveScreen,
  openPopup,
  closePopup,
  closeTopPopup,
  closeAllPopups,
  showOverlay,
  hideOverlay,
  setOverlayVisible,
} from './slices';

// PopupSliceState type
export type { PopupSliceState } from './slices';

// Layout state types (defined locally to avoid circular deps with uicore/react)
export type {
  // App-level types
  Tenant,
  TenantState,
  // Layout domain types
  HeaderUser,
  HeaderState,
  HeaderConfig,
  FooterState,
  FooterConfig,
  MenuItem,
  MenuState,
  SidebarPosition,
  SidebarState,
  ScreenState,
  PopupState,
  PopupConfig,
  OverlayState,
  OverlayConfig,
  LayoutState,
  LayoutDomainState,
  RootStateWithLayout,
  LayoutDomainReducers,
} from './layoutTypes';

// Mock state type
export type { MockState } from './slices/mockSlice';

// Tenant effects and events
export {
  initTenantEffects,
  changeTenant,
  clearTenantAction,
  setTenantLoadingState,
  TenantEvents,
} from './effects/tenantEffects';
export type { TenantChangedPayload, TenantClearedPayload } from './effects/tenantEffects';

// Mock effects and events
export {
  initMockEffects,
  toggleMockMode,
  MockEvents,
} from './effects/mockEffects';
export type { MockTogglePayload } from './effects/mockEffects';

// From @hai3/api
export {
  apiRegistry,
  BaseApiService,
  RestProtocol,
  SseProtocol,
  // Protocol-specific mock plugins (replaces generic MockPlugin)
  RestMockPlugin,
  SseMockPlugin,
  MockEventSource,
  // Plugin base classes
  ApiPluginBase,
  ApiPlugin,
  ApiProtocol,
  RestPlugin,
  RestPluginWithConfig,
  SsePlugin,
  SsePluginWithConfig,
  // Type guards
  isShortCircuit,
  isRestShortCircuit,
  isSseShortCircuit,
  // Mock plugin identification
  MOCK_PLUGIN,
  isMockPlugin,
} from '@hai3/api';
export type {
  ApiService,
  MockMap,
  ApiServiceConfig,
  JsonValue,
  JsonObject,
  JsonPrimitive,
  JsonCompatible,
  SseProtocolConfig,
  RestProtocolConfig,
  // Plugin context types (class-based plugin system)
  ApiRequestContext,
  ApiResponseContext,
  ShortCircuitResponse,
  PluginClass,
  ProtocolClass,
  ProtocolPluginType,
  ProtocolPluginHooks,
  BasePluginHooks,
  // Protocol-specific types
  RestPluginHooks,
  SsePluginHooks,
  RestRequestContext,
  RestResponseContext,
  SseConnectContext,
  EventSourceLike,
  RestShortCircuitResponse,
  SseShortCircuitResponse,
  RestMockConfig,
  SseMockConfig,
  SseMockEvent,
} from '@hai3/api';


// NOTE: AccountsApiService, ACCOUNTS_DOMAIN, and account types (ApiUser, UserRole, etc.)
// have been moved to CLI templates. They are now generated by `hai3 scaffold layout`
// and should be imported from user code (e.g., @/layout/api or @/api).

// From @hai3/i18n
export { i18nRegistry, I18nRegistryImpl, createI18nRegistry, Language, SUPPORTED_LANGUAGES, getLanguageMetadata, TextDirection, LanguageDisplayMode } from '@hai3/i18n';
export type { I18nConfig, TranslationLoader, TranslationMap, TranslationDictionary, LanguageMetadata, I18nRegistry as I18nRegistryType } from '@hai3/i18n';

// Backward compatibility aliases
// I18nRegistry type (capital I) - alias for consistency with old @hai3/uicore API
export { I18nRegistryImpl as I18nRegistry } from '@hai3/i18n';

// ScreensetConfig type alias - maps to ScreensetDefinition in new architecture
export type { ScreensetDefinition as ScreensetConfig } from '@hai3/screensets';

// Singleton registries for backward compatibility
export {
  screensetRegistry,
  // Backward compatibility constants
  ACCOUNTS_DOMAIN,
} from './compat';

// ============================================================================
// Migration Helpers (for @hai3/uicore backward compatibility)
// ============================================================================

export {
  createLegacySelector,
  setDeprecationWarnings,
  isDeprecationWarningsEnabled,
  getLayoutDomainState,
  hasLegacyUicoreState,
  hasNewLayoutState,
  STATE_PATH_MAPPING,
} from './migration';

export type {
  LegacyUicoreState,
  LegacyRootState,
  Selector,
} from './migration';
