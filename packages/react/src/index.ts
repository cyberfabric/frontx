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

export { useRouteParams } from './hooks/useRouteParams';

// ============================================================================
// Components
// ============================================================================

export { AppRouter } from './components';

// ============================================================================
// Contexts
// ============================================================================

export { RouteParamsProvider, RouteParamsContext } from './contexts/RouteParamsContext';
export type { RouteParams, RouteParamsProviderProps } from './contexts/RouteParamsContext';

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
  // NOTE: eventBus is re-exported separately below with augmented EventPayloadMap type

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
  BasePluginHooks,
  // Protocol-specific types
  RestPluginHooks,
  SsePluginHooks,
  RestRequestContext,
  RestResponseContext,
  ApiPluginErrorContext,
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

// ============================================================================
// Module Augmentation Support - EventPayloadMap Re-declaration
// ============================================================================

/**
 * Re-declare EventPayloadMap to enable module augmentation on @hai3/react
 *
 * This creates a new declaration site in @hai3/react that TypeScript can augment.
 * App-layer code can now use `declare module '@hai3/react'` instead of importing
 * from L1 packages directly, maintaining proper layer architecture.
 *
 * ARCHITECTURE: This pattern allows L3+ code to augment event types without
 * violating layer boundaries by importing from L1 (@hai3/state).
 *
 * IMPORTANT: We must also re-export eventBus with the augmented type to ensure
 * type safety. The eventBus instance uses this augmented EventPayloadMap.
 *
 * @example
 * ```typescript
 * // In app-layer code (e.g., src/app/events/bootstrapEvents.ts)
 * import '@hai3/react';
 *
 * declare module '@hai3/react' {
 *   interface EventPayloadMap {
 *     'app/user/fetch': void;
 *     'app/user/loaded': { user: ApiUser };
 *   }
 * }
 * ```
 */
import type { EventPayloadMap as FrameworkEventPayloadMap } from '@hai3/framework';
import type { EventBus } from '@hai3/state';
import { eventBus as frameworkEventBus } from '@hai3/framework';

export interface EventPayloadMap extends FrameworkEventPayloadMap {}

/**
 * Re-export eventBus with augmented EventPayloadMap type.
 * This ensures that code importing eventBus from @hai3/react gets
 * type-safe access to both framework events and app-layer augmented events.
 */
export const eventBus: EventBus<EventPayloadMap> = frameworkEventBus as EventBus<EventPayloadMap>;
