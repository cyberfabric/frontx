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
  Formatters,
} from '@hai3/framework';
import type { QueryClient } from '@tanstack/react-query';
import type { MfeContextValue } from './mfe/MfeContext';

// Re-export imported types for convenience
export type { HAI3Config, HAI3App };

// ============================================================================
// API Hook Result Types
// ============================================================================

/**
 * HAI3-owned query result type.
 * Returned by useApiQuery — callers depend on this contract, not on TanStack internals.
 */
// @cpt-FEATURE:implement-endpoint-descriptors:p3
// @cpt-begin:implement-endpoint-descriptors:p3:inst-api-query-result
export interface ApiQueryResult<TData, TError = Error> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}
// @cpt-end:implement-endpoint-descriptors:p3:inst-api-query-result

/**
 * HAI3-owned mutation result type.
 * Returned by useApiMutation — callers depend on this contract, not on TanStack internals.
 */
// @cpt-begin:implement-endpoint-descriptors:p3:inst-api-mutation-result
export interface ApiMutationResult<TData, TError = Error, TVariables = void> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  error: TError | null;
  data: TData | undefined;
  reset: () => void;
}
// @cpt-end:implement-endpoint-descriptors:p3:inst-api-mutation-result

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
 *
 * // With pre-built app
 * const app = createHAI3().use(screensets()).use(microfrontends()).build();
 * <HAI3Provider app={app}>
 *   <App />
 * </HAI3Provider>
 *
 * // With MFE bridge (for MFE components)
 * <HAI3Provider mfeBridge={{ bridge, extensionId, domainId }}>
 *   <MyMfeApp />
 * </HAI3Provider>
 *
 * // With injected QueryClient shared across roots
 * <HAI3Provider app={app} queryClient={sharedQueryClient}>
 *   <MyMfeApp />
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
  /** MFE bridge context (for MFE components) */
  mfeBridge?: MfeContextValue;
  /**
   * Optional externally managed QueryClient for MFE injection.
   * When multiple React roots (host + MFEs) must share one cache, pass the
   * host-owned QueryClient here so each MFE root participates in the same instance.
   * When omitted, HAI3Provider reads app.queryClient from the queryCache() plugin.
   */
  queryClient?: QueryClient;
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
  setLanguage: (language: Language) => void;
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
 * useFormatters Hook Return Type
 * Locale-aware formatters (locale from i18nRegistry.getLanguage()).
 * References @hai3/i18n Formatters so signatures stay in sync.
 */
export type UseFormattersReturn = Formatters;
