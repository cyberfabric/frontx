/**
 * @hai3/react - React Bindings
 *
 * This package provides:
 * - HAI3Provider context provider
 * - Type-safe hooks for state and actions
 * - AppRouter for screen rendering
 *
 * Layer: L3 (Depends on @hai3/framework)
 */

// ============================================================================
// Provider
// ============================================================================

export { HAI3Provider } from './HAI3Provider';
export { HAI3Context, useHAI3 } from './HAI3Context';

// ============================================================================
// Hooks
// ============================================================================

export {
  useAppDispatch,
  useAppSelector,
  useTranslation,
  useScreenTranslations,
  useNavigation,
  useTheme,
} from './hooks';

// ============================================================================
// Components
// ============================================================================

export { AppRouter } from './components';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  HAI3ProviderProps,
  UseHAI3Return,
  UseAppSelector,
  UseAppDispatchReturn,
  UseTranslationReturn,
  UseScreenTranslationsReturn,
  UseLanguageReturn,
  UseThemeReturn,
  UseMenuReturn,
  UseScreenReturn,
  UseNavigationReturn,
  UseScreensetReturn,
  UsePopupReturn,
  UseOverlayReturn,
  AppRouterProps,
  HAI3ProviderComponent,
  AppRouterComponent,
} from './types';

// ============================================================================
// Re-exports from @hai3/framework for convenience
// ============================================================================

// These re-exports allow users to import everything from @hai3/react
// without needing to import from @hai3/framework directly

export {
  // Core
  createHAI3,
  createHAI3App,
  presets,

  // Backward compatibility singletons
  screensetRegistry,

  // Backward compatibility constants
  ACCOUNTS_DOMAIN,

  // I18nRegistry class (capital I for backward compat)
  I18nRegistry,

  // Plugins
  screensets,
  themes,
  layout,
  navigation,
  routing,
  i18n,
  effects,

  // Registries
  createScreensetRegistry,
  createThemeRegistry,
  createRouteRegistry,

  // Flux (Event bus + Store)
  eventBus,

  // Store
  createStore,
  getStore,
  registerSlice,
  hasSlice,
  createSlice,

  // Layout domain exports
  LayoutDomain,
  ScreensetCategory,
  layoutReducer,
  layoutDomainReducers,
  LAYOUT_SLICE_NAME,
  headerSlice,
  footerSlice,
  menuSlice,
  sidebarSlice,
  screenSlice,
  popupSlice,
  overlaySlice,
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

  // Tenant (app-level, not layout)
  TENANT_SLICE_NAME,
  tenantSlice,
  tenantActions,
  tenantReducer,
  setTenant,
  setTenantLoading,
  clearTenant,
  // Tenant effects and events
  initTenantEffects,
  changeTenant,
  clearTenantAction,
  setTenantLoadingState,
  TenantEvents,

  // Mock (app-level, not layout)
  mockSlice,
  mockActions,
  setMockEnabled,
  // Mock effects and events
  initMockEffects,
  toggleMockMode,
  MockEvents,

  // API
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

  // I18n
  i18nRegistry,
  I18nRegistryImpl,
  createI18nRegistry,
  SUPPORTED_LANGUAGES,
  getLanguageMetadata,
} from '@hai3/framework';

// Re-export i18n types from @hai3/framework (correct layer access)
export { Language, TextDirection, LanguageDisplayMode } from '@hai3/framework';

// Re-export types from @hai3/framework
export type {
  // Config
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
  RouteRegistry,
  Preset,
  Presets,
  ScreensetsConfig,
  NavigateToScreenPayload,
  NavigateToScreensetPayload,
  ShowPopupPayload,
  ChangeThemePayload,
  SetLanguagePayload,

  // Flux (Events + Store)
  EventPayloadMap,
  EventHandler,
  Subscription,

  // Store
  RootState,
  AppDispatch,
  SliceObject,
  HAI3Store,

  // Layout
  ScreensetId,
  ScreenId,
  MenuItemConfig,
  ScreenLoader,
  ScreenConfig,
  MenuScreenItem,
  ScreensetDefinition,
  LayoutDomainState,
  HeaderUser,
  HeaderConfig,
  HeaderState,
  FooterConfig,
  FooterState,
  MenuItem,
  MenuState,
  SidebarPosition,
  SidebarState,
  ScreenState,
  PopupConfig,
  PopupState,
  PopupSliceState,
  OverlayConfig,
  OverlayState,
  LayoutState,
  RootStateWithLayout,
  LayoutDomainReducers,

  // Tenant types
  Tenant,
  TenantState,
  TenantChangedPayload,
  TenantClearedPayload,

  // Mock types
  MockState,
  MockTogglePayload,

  // API
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

  // Backward compatibility type aliases
  ScreensetConfig,

  // Theme types
  ThemeApplyFn,
  UikitTheme,

  // I18n
  I18nConfig,
  TranslationLoader,
  TranslationMap,
  TranslationDictionary,
  LanguageMetadata,
  I18nRegistryType,
} from '@hai3/framework';
