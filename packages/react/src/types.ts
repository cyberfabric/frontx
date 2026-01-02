/**
 * @hai3/react - Type Definitions
 *
 * Core types for HAI3 React bindings.
 * Provides type-safe hooks and components.
 *
 * Now using real imports from @hai3/framework since packages are built together.
 */

import type { ReactNode } from 'react';
import type {
  HAI3Config,
  HAI3App,
  RootState,
  Language,
  LanguageMetadata,
  MenuItemConfig,
  ScreensetDefinition,
  ScreensetCategory,
} from '@hai3/framework';

// Re-export imported types for convenience
export type { HAI3Config, HAI3App, MenuItemConfig, ScreensetDefinition, ScreensetCategory };

// ============================================================================
// Type Aliases
// ============================================================================

// From @hai3/store
type Selector<TResult, TState = RootState> = (state: TState) => TResult;

// Language is imported from @hai3/framework
type TranslationParams = Record<string, string | number | boolean>;

// ============================================================================
// HAI3 Provider Props
// ============================================================================

/**
 * HAI3 Provider Props
 * Props for the main HAI3Provider component.
 *
 * @example
 * ```tsx
 * <HAI3Provider config={{ devMode: true }}>
 *   <App />
 * </HAI3Provider>
 * ```
 */
export interface HAI3ProviderProps {
  /** Child components */
  children: ReactNode;
  /** HAI3 configuration */
  config?: HAI3Config;
  /** Pre-built HAI3 app instance (optional) */
  app?: HAI3App;
}

// ============================================================================
// Hook Return Types
// ============================================================================

/**
 * useHAI3 Hook Return Type
 * Returns the HAI3 app instance from context.
 */
export type UseHAI3Return = HAI3App;

/**
 * useAppSelector Hook
 * Type-safe selector hook for Redux state.
 *
 * @template TResult - The result type of the selector
 */
export type UseAppSelector = <TResult>(selector: Selector<TResult>) => TResult;

/**
 * useAppDispatch Hook Return Type
 * Returns the typed dispatch function.
 */
export type UseAppDispatchReturn = (action: unknown) => unknown;

/**
 * useTranslation Hook Return Type
 * Translation utilities.
 */
export interface UseTranslationReturn {
  /** Translate a key */
  t: (key: string, params?: TranslationParams) => string;
  /** Current language */
  language: Language | null;
  /** Change language */
  setLanguage: (language: Language) => Promise<void>;
  /** Check if current language is RTL */
  isRTL: boolean;
}

/**
 * useScreenTranslations Hook Return Type
 * Screen-level translation loading state.
 */
export interface UseScreenTranslationsReturn {
  /** Whether translations are loaded */
  isLoaded: boolean;
  /** Loading error (if any) */
  error: Error | null;
}

/**
 * useLanguage Hook Return Type
 * Language selection utilities.
 */
export interface UseLanguageReturn {
  /** Current language */
  current: Language | null;
  /** All supported languages */
  supported: LanguageMetadata[];
  /** Change language */
  setLanguage: (language: Language) => Promise<void>;
  /** Check if current language is RTL */
  isRTL: boolean;
}

/**
 * useTheme Hook Return Type
 * Theme utilities.
 */
export interface UseThemeReturn {
  /** Current theme ID */
  currentTheme: string | undefined;
  /** All available themes */
  themes: Array<{ id: string; name: string }>;
  /** Change theme */
  setTheme: (themeId: string) => void;
}

/**
 * useMenu Hook Return Type
 * Menu state and actions.
 */
export interface UseMenuReturn {
  /** Menu items */
  items: MenuItemConfig[];
  /** Whether menu is collapsed */
  collapsed: boolean;
  /** Whether menu is visible */
  visible: boolean;
  /** Toggle menu collapse */
  toggle: () => void;
  /** Set collapsed state */
  setCollapsed: (collapsed: boolean) => void;
}

/**
 * useScreen Hook Return Type
 * Current screen state.
 */
export interface UseScreenReturn {
  /** Active screen ID */
  activeScreen: string | null;
  /** Whether screen is loading */
  isLoading: boolean;
}

/**
 * useNavigation Hook Return Type
 * Navigation utilities.
 */
export interface UseNavigationReturn {
  /** Navigate to a screen */
  navigateToScreen: (screensetId: string, screenId: string) => void;
  /** Navigate to a screenset (uses default screen) */
  navigateToScreenset: (screensetId: string) => void;
  /** Current screenset ID */
  currentScreenset: string | null;
  /** Current screen ID */
  currentScreen: string | null;
}

/**
 * useScreenset Hook Return Type
 * Current screenset state.
 */
export interface UseScreensetReturn {
  /** Current screenset */
  screenset: ScreensetDefinition | undefined;
  /** Current screenset ID */
  screensetId: string | null;
  /** Current category */
  category: ScreensetCategory | null;
}

/**
 * usePopup Hook Return Type
 * Popup utilities.
 */
export interface UsePopupReturn {
  /** Show a popup */
  show: (config: { id: string; title?: string; content?: () => Promise<{ default: React.ComponentType }> }) => void;
  /** Hide current popup */
  hide: () => void;
  /** Hide all popups */
  hideAll: () => void;
  /** Whether any popup is open */
  isOpen: boolean;
  /** Current popup stack */
  stack: Array<{ id: string; title?: string }>;
}

/**
 * useOverlay Hook Return Type
 * Overlay utilities.
 */
export interface UseOverlayReturn {
  /** Show an overlay */
  show: (config: { id: string; content?: () => Promise<{ default: React.ComponentType }> }) => void;
  /** Hide current overlay */
  hide: () => void;
  /** Whether any overlay is open */
  isOpen: boolean;
}

// ============================================================================
// App Router Props
// ============================================================================

/**
 * App Router Props
 * Props for the AppRouter component.
 */
export interface AppRouterProps {
  /** Fallback component while loading */
  fallback?: ReactNode;
  /** Error boundary fallback */
  errorFallback?: ReactNode | ((error: Error) => ReactNode);
}

// ============================================================================
// Component Types
// ============================================================================

/**
 * HAI3Provider Component Type
 */
export type HAI3ProviderComponent = React.FC<HAI3ProviderProps>;

/**
 * AppRouter Component Type
 */
export type AppRouterComponent = React.FC<AppRouterProps>;
