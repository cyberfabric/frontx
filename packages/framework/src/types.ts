/**
 * @hai3/framework - Type Definitions
 *
 * Core types for HAI3 framework with plugin architecture.
 * Integrates all SDK packages into a cohesive framework.
 */

// ============================================================================
// Type Imports from SDK Packages
// ============================================================================

// From @hai3/state
import type {
  HAI3Store as StoreType,
  EffectInitializer,
} from '@hai3/state';

import type { Reducer } from '@reduxjs/toolkit';

// From @hai3/screensets
import type { ScreensetRegistry } from '@hai3/screensets';

// From @hai3/api
import type { ApiRegistry } from '@hai3/api';

// From @hai3/i18n
import type { I18nRegistry } from '@hai3/i18n';

// Re-export HAI3Store from @hai3/store for framework consumers
export type HAI3Store = StoreType;

// ============================================================================
// HAI3 Configuration
// ============================================================================

/**
 * HAI3 Application Configuration
 * Configuration options for creating a HAI3 application.
 */
export interface HAI3Config {
  /** Application name */
  name?: string;
  /** Enable development mode */
  devMode?: boolean;
  /** Enable strict mode (throws on errors) */
  strictMode?: boolean;
  /**
   * Auto-navigate to first screenset on mount.
   * When false, stays on "/" until navigateToScreen/navigateToScreenset is called.
   * @default true
   */
  autoNavigate?: boolean;
  /**
   * Base path for navigation. Example: '/console' makes routes /console/*.
   * @default '/'
   */
  base?: string;
}

// ============================================================================
// Internal Slice Types
// ============================================================================

/**
 * Registerable Slice Interface
 * Minimal interface for slices that can be registered with the framework.
 * Used for heterogeneous slice collections where different state types are mixed.
 *
 * This is an internal framework type - plugins provide slices matching this structure.
 * The Reducer type uses RTK's default, avoiding explicit `any` in HAI3 code.
 */
export interface RegisterableSlice {
  /** Slice name - becomes the state key */
  readonly name: string;
  /** Slice reducer function */
  readonly reducer: Reducer;
  /** Slice action creators (optional for registration) */
  readonly actions?: Record<string, unknown>;
}

// ============================================================================
// Plugin System Types
// ============================================================================

/**
 * HAI3 Actions Interface
 * Central registry of all actions available in the application.
 *
 * Built-in actions are defined here. Consumers can extend this interface
 * via module augmentation to add custom actions:
 *
 * @example
 * ```typescript
 * declare module '@hai3/framework' {
 *   interface HAI3Actions {
 *     myCustomAction: (payload: MyPayload) => void;
 *   }
 * }
 * ```
 *
 * Design: Interface (not type) enables TypeScript declaration merging.
 */
export interface HAI3Actions {
  // ==========================================================================
  // Navigation actions (from navigation plugin)
  // ==========================================================================
  navigateToScreen: (payload: NavigateToScreenPayload) => void;
  navigateToScreenset: (payload: NavigateToScreensetPayload) => void;

  // ==========================================================================
  // Theme actions (from themes plugin)
  // ==========================================================================
  changeTheme: (payload: ChangeThemePayload) => void;

  // ==========================================================================
  // I18n actions (from i18n plugin)
  // ==========================================================================
  setLanguage: (payload: SetLanguagePayload) => void;

  // ==========================================================================
  // Layout actions (from layout plugin)
  // ==========================================================================
  showPopup: (payload: ShowPopupPayload) => void;
  hidePopup: () => void;
  showOverlay: (payload: { id: string }) => void;
  hideOverlay: () => void;
  toggleMenuCollapsed: (payload: { collapsed: boolean }) => void;
  toggleSidebarCollapsed: (payload: { collapsed: boolean }) => void;
  setHeaderVisible: (payload: boolean) => void;
  setFooterVisible: (payload: boolean) => void;
  setMenuCollapsed: (payload: boolean) => void;
  setSidebarCollapsed: (payload: boolean) => void;

  // ==========================================================================
  // Screenset actions (from screensets plugin)
  // ==========================================================================
  setActiveScreen: (payload: string) => void;
  setScreenLoading: (payload: boolean) => void;

  // ==========================================================================
  // Mock actions (from mock plugin)
  // ==========================================================================
  toggleMockMode: (enabled: boolean) => void;
}

/**
 * Plugin Provides Interface
 * What a plugin contributes to the application.
 */
export interface PluginProvides {
  /** Registry contributions */
  registries?: Record<string, unknown>;
  /** Redux slices to register */
  slices?: RegisterableSlice[];
  /** Effect initializers to register */
  effects?: EffectInitializer[];
  /** Actions provided by the plugin (subset of HAI3Actions) */
  actions?: Partial<HAI3Actions>;
}

/**
 * Plugin Lifecycle Interface
 * Lifecycle hooks for plugin initialization.
 */
export interface PluginLifecycle {
  /**
   * Called when plugin is registered (before app starts).
   *
   * @param app - The app builder instance
   * @param config - Plugin configuration
   */
  onRegister?(app: HAI3AppBuilder, config: unknown): void;

  /**
   * Called after all plugins registered, before app starts.
   *
   * @param app - The built app instance
   */
  onInit?(app: HAI3App): void | Promise<void>;

  /**
   * Called when app is destroyed.
   *
   * @param app - The app instance
   */
  onDestroy?(app: HAI3App): void;
}

/**
 * HAI3 Plugin Interface
 * All plugins implement this contract.
 * Follows Liskov Substitution Principle - any plugin can be used interchangeably.
 *
 * @template TConfig - Plugin configuration type
 *
 * @example
 * ```typescript
 * const screensetsPlugin: HAI3Plugin = {
 *   name: 'screensets',
 *   dependencies: [],
 *   provides: {
 *     registries: { screensetRegistry: createScreensetRegistry() },
 *     slices: [screenSlice],
 *   },
 *   onInit(app) {
 *     discoverScreensets(app.screensetRegistry);
 *   },
 * };
 * ```
 */
export interface HAI3Plugin<TConfig = unknown> extends PluginLifecycle {
  /** Unique plugin identifier */
  name: string;

  /** Other plugins this plugin requires */
  dependencies?: string[];

  /** What this plugin provides to the app */
  provides?: PluginProvides;

  /** Plugin configuration type marker (used for type inference) */
  _configType?: TConfig;
}

/**
 * Plugin Factory Function
 * Factory function that creates a plugin with optional configuration.
 *
 * @template TConfig - Plugin configuration type
 */
export type PluginFactory<TConfig = unknown> = (config?: TConfig) => HAI3Plugin<TConfig>;

// ============================================================================
// App Builder Interface
// ============================================================================

/**
 * HAI3 App Builder Interface
 * Fluent builder for composing HAI3 applications with plugins.
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(screensets())
 *   .use(themes())
 *   .use(layout())
 *   .build();
 * ```
 */
export interface HAI3AppBuilder {
  /**
   * Add a plugin to the application.
   *
   * @param plugin - Plugin instance or factory
   * @returns Builder for chaining
   */
  use(plugin: HAI3Plugin | PluginFactory): HAI3AppBuilder;

  /**
   * Add multiple plugins at once.
   *
   * @param plugins - Array of plugins or factories
   * @returns Builder for chaining
   */
  useAll(plugins: Array<HAI3Plugin | PluginFactory>): HAI3AppBuilder;

  /**
   * Build the application.
   * Resolves dependencies, initializes plugins, and returns the app.
   *
   * @returns The built HAI3 application
   */
  build(): HAI3App;
}

// ============================================================================
// Built App Interface
// ============================================================================

// Re-export ScreensetRegistry from SDK - do NOT duplicate the interface
export type { ScreensetRegistry } from '@hai3/screensets';

/**
 * Theme Configuration
 * Configuration for a theme.
 */
export interface ThemeConfig {
  /** Theme ID */
  id: string;
  /** Theme name */
  name: string;
  /** CSS custom properties */
  variables: Record<string, string>;
  /** Whether this is the default theme */
  default?: boolean;
}

/**
 * UIKit Theme type (from @hai3/uikit)
 * Used for themes that require custom apply functions (e.g., @hai3/uikit's applyTheme).
 * Using 'unknown' as the base type to accept any theme structure.
 */
export type UikitTheme = unknown;

/**
 * Theme apply function type
 * Generic to accept any theme type from UI kit implementations.
 * @internal - uses generic function signature for compatibility with various theme implementations
 */
export interface ThemeApplyFn {
  (theme: unknown, themeName?: string): void;
}

/**
 * Theme Registry Interface
 * Registry for managing themes.
 */
export interface ThemeRegistry {
  /**
   * Register a theme.
   * Supports both config-based API and UIKit theme API.
   *
   * @param configOrId - ThemeConfig or theme ID (for UIKit themes)
   * @param uikitTheme - UIKit Theme object (optional, for @hai3/uikit themes)
   */
  register(configOrId: ThemeConfig | string, uikitTheme?: UikitTheme): void;

  /** Get theme by ID */
  get(id: string): ThemeConfig | undefined;
  /** Get all themes */
  getAll(): ThemeConfig[];
  /** Apply a theme */
  apply(id: string): void;
  /** Get current theme */
  getCurrent(): ThemeConfig | undefined;

  /**
   * Subscribe to theme changes.
   * @param callback - Called when theme changes
   * @returns Unsubscribe function
   */
  subscribe(callback: () => void): () => void;

  /**
   * Get current version number.
   * Used by React for re-rendering on theme changes.
   */
  getVersion(): number;
}

/**
 * Route Registry Interface
 * Registry for managing routes (auto-synced from screensets).
 */
export interface RouteRegistry {
  /** Check if a screen exists by screenId only (globally unique) */
  hasScreenById(screenId: string): boolean;
  /** Check if a screen exists by both screensetId and screenId (explicit lookup when screenset context is known) */
  hasScreen(screensetId: string, screenId: string): boolean;
  /** Get screenset ID for a given screen ID (reverse lookup) */
  getScreensetForScreen(screenId: string): string | undefined;
  /** Get screen loader by screenId only */
  getScreenById(screenId: string): (() => Promise<{ default: React.ComponentType }>) | undefined;
  /** Get screen loader by both screensetId and screenId (explicit lookup when screenset context is known) */
  getScreen(screensetId: string, screenId: string): (() => Promise<{ default: React.ComponentType }>) | undefined;
  /** Get all routes */
  getAll(): Array<{ screensetId: string; screenId: string }>;
}

/**
 * HAI3 App Interface
 * The built application with all features available.
 *
 * @example
 * ```typescript
 * const app = createHAI3App();
 *
 * // Access registries
 * const screensets = app.screensetRegistry.getAll();
 *
 * // Access store
 * const state = app.store.getState();
 *
 * // Access actions
 * app.actions.navigateToScreen({ screensetId: 'demo', screenId: 'home' });
 * ```
 */
export interface HAI3App {
  /** Application configuration */
  config: HAI3Config;

  /** Redux store */
  store: HAI3Store;

  /** Screenset registry */
  screensetRegistry: ScreensetRegistry;

  /** Theme registry */
  themeRegistry: ThemeRegistry;

  /** Route registry */
  routeRegistry: RouteRegistry;

  /** API registry */
  apiRegistry: ApiRegistry;

  /** I18n registry */
  i18nRegistry: I18nRegistry;

  /** All registered actions (type-safe via HAI3Actions interface) */
  actions: HAI3Actions;

  /** Destroy the application and cleanup resources */
  destroy(): void;
}

// ============================================================================
// Create HAI3 App Function Signature
// ============================================================================

/**
 * Create HAI3 App Function Signature
 * Creates a fully configured HAI3 application using the full preset.
 *
 * @param config - Optional configuration
 * @returns The built HAI3 application
 *
 * @example
 * ```typescript
 * // Default - uses full() preset
 * const app = createHAI3App();
 *
 * // With configuration
 * const app = createHAI3App({ devMode: true });
 * ```
 */
export type CreateHAI3App = (config?: HAI3Config) => HAI3App;

/**
 * Create HAI3 Function Signature
 * Creates a HAI3 app builder for custom plugin composition.
 *
 * @returns App builder for plugin composition
 *
 * @example
 * ```typescript
 * const app = createHAI3()
 *   .use(screensets())
 *   .use(themes())
 *   .build();
 * ```
 */
export type CreateHAI3 = () => HAI3AppBuilder;

// ============================================================================
// Preset Types
// ============================================================================

/**
 * Preset Type
 * A preset is a function that returns an array of plugins.
 *
 * @example
 * ```typescript
 * const minimal: Preset = () => [
 *   screensets({ autoDiscover: true }),
 *   themes(),
 * ];
 * ```
 */
export type Preset = () => HAI3Plugin[];

/**
 * Presets Collection
 * Available presets for different use cases.
 */
export interface Presets {
  /** All plugins - default for hai3 create */
  full: Preset;
  /** Screensets + themes only */
  minimal: Preset;
  /** Screensets only - for external platform integration */
  headless: Preset;
}

// ============================================================================
// Plugin Configurations
// ============================================================================

/**
 * Navigation Plugin Configuration
 * Configuration options for the navigation plugin.
 */
export interface NavigationConfig {
  /**
   * Base path for navigation. Overrides app.config.base if set.
   */
  base?: string;
}

/**
 * Screensets Plugin Configuration
 * Configuration options for the screensets plugin.
 */
export interface ScreensetsConfig {
  /** Auto-discover screensets via glob */
  autoDiscover?: boolean;
  /** Glob pattern for screenset discovery */
  globPattern?: string;
}

/**
 * Themes Plugin Configuration
 * Configuration options for the themes plugin.
 */
export interface ThemesConfig {
  /**
   * Custom apply function for UIKit themes.
   * Called when a theme is applied to execute theme-specific logic.
   *
   * @example
   * ```typescript
   * import { applyTheme } from '@hai3/uikit';
   *
   * const app = createHAI3()
   *   .use(themes({ applyFn: applyTheme }))
   *   .build();
   * ```
   */
  applyFn?: ThemeApplyFn;
}

// ============================================================================
// Navigation Action Payloads
// ============================================================================

/**
 * Navigate to Screen Payload
 */
export interface NavigateToScreenPayload {
  screensetId: string;
  screenId: string;
}

/**
 * Navigate to Screenset Payload
 */
export interface NavigateToScreensetPayload {
  screensetId: string;
}

/**
 * Show Popup Payload
 */
export interface ShowPopupPayload {
  id: string;
  title?: string;
  content?: () => Promise<{ default: React.ComponentType }>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * Change Theme Payload
 */
export interface ChangeThemePayload {
  themeId: string;
}

/**
 * Set Language Payload
 */
export interface SetLanguagePayload {
  language: string;
}
