/**
 * @hai3/screensets - Type Definitions
 *
 * Pure TypeScript contracts for HAI3 screenset management.
 * This package has ZERO dependencies - pure types and contracts only.
 *
 * NOTE: Layout state shapes (HeaderState, MenuState, etc.) are in @hai3/framework
 */

import type { ComponentType } from 'react';

// Note: ComponentType is only used for ScreenLoader return type

// ============================================================================
// Layout Domain Enum
// ============================================================================

/**
 * Layout Domain Enum
 * Defines all layout domains that can be orchestrated.
 */
export enum LayoutDomain {
  Header = 'header',
  Footer = 'footer',
  Menu = 'menu',
  Sidebar = 'sidebar',
  Screen = 'screen',
  Popup = 'popup',
  Overlay = 'overlay',
}

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/**
 * Branded type for Screenset IDs
 * Provides compile-time safety for screenset identification.
 *
 * @example
 * ```typescript
 * const chatScreensetId = 'chat' as ScreensetId;
 * const demoScreensetId = 'demo' as ScreensetId;
 * ```
 */
export type ScreensetId = string & { readonly __brand: 'ScreensetId' };

/**
 * Branded type for Screen IDs
 * Provides compile-time safety for screen identification.
 *
 * @example
 * ```typescript
 * const homeScreenId = 'home' as ScreenId;
 * const profileScreenId = 'profile' as ScreenId;
 * ```
 */
export type ScreenId = string & { readonly __brand: 'ScreenId' };

// ============================================================================
// Screenset Category
// ============================================================================

/**
 * Screenset Category Enum
 * Defines the three-stage development workflow categories.
 */
export enum ScreensetCategory {
  /** AI-generated initial layouts */
  Drafts = 'drafts',
  /** Designer-refined versions */
  Mockups = 'mockups',
  /** Engineer-finalized, production-ready screens */
  Production = 'production',
}

// ============================================================================
// Menu Item Configuration
// ============================================================================

/**
 * Menu Item Configuration
 * Defines the structure of a menu item.
 *
 * @example
 * ```typescript
 * const menuItem: MenuItemConfig = {
 *   id: 'dashboard',
 *   label: 'screen.dashboard:title',  // Translation key
 *   icon: 'lucide:home',              // Iconify icon ID
 *   screenId: 'dashboard',
 * };
 * ```
 */
export interface MenuItemConfig {
  /** Unique identifier for the menu item */
  id: string;
  /** Translation key for the label */
  label: string;
  /** Iconify icon ID (e.g., "lucide:home", "lucide:globe") */
  icon?: string;
  /** Screen ID to navigate to on click */
  screenId?: string;
  /** External URL (mutually exclusive with screenId) */
  href?: string;
  /** Click handler (for custom actions) */
  onClick?: () => void;
  /** Child menu items for nested menus */
  children?: MenuItemConfig[];
  /** Badge content (string or number) */
  badge?: string | number;
}

// ============================================================================
// Screen Configuration
// ============================================================================

/**
 * Screen Loader Function Type
 * Returns a Promise resolving to a module with a default React component.
 *
 * @example
 * ```typescript
 * const loader: ScreenLoader = () => import('./screens/HomeScreen');
 * ```
 */
export type ScreenLoader = () => Promise<{ default: ComponentType }>;

/**
 * Screen Configuration
 * Defines the structure of a screen.
 *
 * @example
 * ```typescript
 * const screen: ScreenConfig = {
 *   id: 'home',
 *   loader: () => import('./screens/HomeScreen'),
 * };
 * ```
 */
export interface ScreenConfig {
  /** Unique identifier for the screen */
  id: string;
  /** Lazy loader function for the screen component */
  loader: ScreenLoader;
}

// ============================================================================
// Screenset Definition
// ============================================================================

/**
 * Menu Screen Item
 * Combines menu item config with its screen loader.
 */
export interface MenuScreenItem {
  /** Menu item configuration */
  menuItem: MenuItemConfig;
  /** Screen loader function */
  screen: ScreenLoader;
}

/**
 * Screenset Definition
 * Complete definition of a screenset including screens and menu.
 *
 * NOTE: Translations are NOT part of screenset definition.
 * Screensets register translations directly with i18nRegistry via framework.
 *
 * @example
 * ```typescript
 * const demoScreenset: ScreensetDefinition = {
 *   id: 'demo',
 *   name: 'Demo Screenset',
 *   category: ScreensetCategory.Drafts,
 *   defaultScreen: 'home',
 *   menu: [
 *     { menuItem: homeMenuItem, screen: () => import('./screens/HomeScreen') },
 *   ],
 * };
 * ```
 */
export interface ScreensetDefinition {
  /** Unique identifier for the screenset */
  id: string;
  /** Display name for the screenset */
  name: string;
  /** Category (drafts, mockups, production) */
  category: ScreensetCategory;
  /** Default screen ID to show when screenset is selected */
  defaultScreen: string;
  /** Menu items with their associated screens */
  menu: MenuScreenItem[];
}

// ============================================================================
// Screenset Registry Interface
// ============================================================================

/**
 * Screenset Registry Interface
 * Pure storage interface for screenset registration.
 * Implementation is a simple Map wrapper with no side effects.
 */
export interface ScreensetRegistry {
  /** Register a screenset */
  register(screenset: ScreensetDefinition): void;
  /** Get a screenset by ID */
  get(id: string): ScreensetDefinition | undefined;
  /** Register multiple screensets at once */
  registerMany(configs: ScreensetDefinition[]): void;
  /** Get all registered screensets */
  getAll(): ScreensetDefinition[];
  /** Check if a screenset is registered */
  has(id: string): boolean;
  /** Unregister a screenset */
  unregister(id: string): boolean;
  /** Clear all screensets (useful for testing) */
  clear(): void;
}
