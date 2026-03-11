/**
 * @hai3/uikit - Type Definitions
 *
 * All UI Kit component types are defined here.
 * This replaces @hai3/uikit-contracts for type imports.
 */

// @cpt-dod:cpt-hai3-dod-uikit-components-registry-types:p2
// @cpt-dod:cpt-hai3-dod-uikit-components-standalone:p1
// @cpt-flow:cpt-hai3-flow-uikit-components-registry-lookup:p2

import type { ComponentType, ReactNode, ButtonHTMLAttributes } from 'react';

// ============================================================================
// Text Direction (string literal to avoid circular deps with @hai3/i18n)
// ============================================================================

/**
 * Text Direction Type
 * Compatible with @hai3/i18n TextDirection enum values.
 */
export type TextDirection = 'ltr' | 'rtl';

// ============================================================================
// Theme Contract
// ============================================================================

/**
 * Theme Contract
 * Defines the structure of themes for UI Kit styling.
 */
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    mainMenu: {
      DEFAULT: string;
      foreground: string;
      hover: string;
      selected: string;
      border: string;
    };
    chat: {
      leftMenu: {
        DEFAULT: string;
        foreground: string;
        hover: string;
        selected: string;
        border: string;
      };
      message: {
        user: {
          background: string;
          foreground: string;
        };
        assistant: {
          background: string;
          foreground: string;
        };
      };
      input: {
        background: string;
        foreground: string;
        border: string;
      };
      codeBlock: {
        background: string;
        foreground: string;
        border: string;
        headerBackground: string;
      };
    };
    inScreenMenu: {
      DEFAULT: string;
      foreground: string;
      hover: string;
      selected: string;
      border: string;
    };
    /** Chart colors for data visualization (OKLCH format recommended) */
    chart: {
      1: string;
      2: string;
      3: string;
      4: string;
      5: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  typography: {
    fontFamily: {
      sans: string[];
      mono: string[];
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
      '5xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  transitions: {
    fast: string;
    base: string;
    slow: string;
    slower: string;
  };
}

// ============================================================================
// Button Component Types
// ============================================================================

/**
 * Button Variant Enum
 */
export enum ButtonVariant {
  Default = 'default',
  Destructive = 'destructive',
  Outline = 'outline',
  Secondary = 'secondary',
  Ghost = 'ghost',
  Link = 'link',
}

/**
 * Button Size Enum
 */
export enum ButtonSize {
  Default = 'default',
  Sm = 'sm',
  Lg = 'lg',
  Icon = 'icon',
}

/**
 * Button Props Interface
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export type ButtonComponent = ComponentType<ButtonProps>;

// ============================================================================
// IconButton Component Types
// ============================================================================

/**
 * IconButton Size Enum
 */
export enum IconButtonSize {
  Default = 'default',
  Small = 'sm',
  Large = 'lg',
}

/**
 * IconButton Props Interface
 */
export interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: IconButtonSize;
  'aria-label': string;
  className?: string;
}

export type IconButtonComponent = ComponentType<IconButtonProps>;

// ============================================================================
// DropdownButton Component Types
// ============================================================================

/**
 * DropdownButton Props Interface
 * Button with integrated chevron for dropdown triggers
 */
export interface DropdownButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

export type DropdownButtonComponent = ComponentType<DropdownButtonProps>;

// ============================================================================
// Switch Component Types
// ============================================================================

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export type SwitchComponent = ComponentType<SwitchProps>;

// ============================================================================
// Skeleton Component Types
// ============================================================================

export interface SkeletonProps {
  className?: string;
  /**
   * If true, skeleton inherits text color instead of using bg-muted
   * Useful for buttons, menu items, and colored text
   */
  inheritColor?: boolean;
}

export type SkeletonComponent = ComponentType<SkeletonProps>;

// ============================================================================
// Spinner Component Types
// ============================================================================

export interface SpinnerProps {
  className?: string;
  icon?: ComponentType<{ className?: string }>;
  size?: string;
}

export type SpinnerComponent = ComponentType<SpinnerProps>;

// ============================================================================
// Sidebar Component Types
// ============================================================================

export interface SidebarProps {
  collapsed?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface SidebarContentProps {
  className?: string;
  children?: ReactNode;
}

export interface SidebarHeaderProps {
  logo?: ReactNode;
  logoText?: ReactNode;
  collapsed?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface SidebarMenuProps {
  className?: string;
  children?: ReactNode;
}

export interface SidebarMenuItemProps {
  className?: string;
  children?: ReactNode;
}

export interface SidebarMenuButtonProps {
  onClick?: () => void;
  tooltip?: string;
  isActive?: boolean;
  variant?: string;
  size?: string;
  asChild?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface SidebarMenuIconProps {
  className?: string;
  children?: ReactNode;
}

export interface SidebarMenuLabelProps {
  className?: string;
  children?: ReactNode;
}

export type SidebarComponent = ComponentType<SidebarProps>;
export type SidebarContentComponent = ComponentType<SidebarContentProps>;
export type SidebarHeaderComponent = ComponentType<SidebarHeaderProps>;
export type SidebarMenuComponent = ComponentType<SidebarMenuProps>;
export type SidebarMenuItemComponent = ComponentType<SidebarMenuItemProps>;
export type SidebarMenuButtonComponent = ComponentType<SidebarMenuButtonProps>;
export type SidebarMenuIconComponent = ComponentType<SidebarMenuIconProps>;
export type SidebarMenuLabelComponent = ComponentType<SidebarMenuLabelProps>;

// ============================================================================
// Header Component Types
// ============================================================================

export interface HeaderProps {
  className?: string;
  children?: ReactNode;
}

export type HeaderComponent = ComponentType<HeaderProps>;

// ============================================================================
// UserInfo Component Types
// ============================================================================

export interface UserInfoProps {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  loading?: boolean;
}

export type UserInfoComponent = ComponentType<UserInfoProps>;

// ============================================================================
// Dropdown Component Types
// ============================================================================

export interface DropdownMenuProps {
  children?: ReactNode;
  dir?: TextDirection;
}

export interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children?: ReactNode;
}

export interface DropdownMenuContentProps {
  align?: 'start' | 'center' | 'end';
  children?: ReactNode;
}

export interface DropdownMenuItemProps {
  onClick?: () => void;
  children?: ReactNode;
}

export interface DropdownMenuSubProps {
  children?: ReactNode;
}

export interface DropdownMenuSubTriggerProps {
  disabled?: boolean;
  children?: ReactNode;
}

export interface DropdownMenuSubContentProps {
  children?: ReactNode;
}

export type DropdownMenuComponent = ComponentType<DropdownMenuProps>;
export type DropdownMenuTriggerComponent = ComponentType<DropdownMenuTriggerProps>;
export type DropdownMenuContentComponent = ComponentType<DropdownMenuContentProps>;
export type DropdownMenuItemComponent = ComponentType<DropdownMenuItemProps>;
export type DropdownMenuSubComponent = ComponentType<DropdownMenuSubProps>;
export type DropdownMenuSubTriggerComponent = ComponentType<DropdownMenuSubTriggerProps>;
export type DropdownMenuSubContentComponent = ComponentType<DropdownMenuSubContentProps>;

// ============================================================================
// UI Kit Component Registry Types
// ============================================================================

/**
 * UI Kit Component Enum
 * Defines components that can be registered with the UI Kit registry.
 */
// @cpt-begin:cpt-hai3-dod-uikit-components-registry-types:p2:inst-1
// @cpt-begin:cpt-hai3-flow-uikit-components-registry-lookup:p2:inst-1
export enum UiKitComponent {
  Button = 'Button',
  IconButton = 'IconButton',
  DropdownButton = 'DropdownButton',
  Switch = 'Switch',
  Skeleton = 'Skeleton',
  Spinner = 'Spinner',
  Header = 'Header',
  Sidebar = 'Sidebar',
  SidebarContent = 'SidebarContent',
  SidebarHeader = 'SidebarHeader',
  SidebarMenu = 'SidebarMenu',
  SidebarMenuItem = 'SidebarMenuItem',
  SidebarMenuButton = 'SidebarMenuButton',
  SidebarMenuIcon = 'SidebarMenuIcon',
  SidebarMenuLabel = 'SidebarMenuLabel',
  UserInfo = 'UserInfo',
  DropdownMenu = 'DropdownMenu',
  DropdownMenuTrigger = 'DropdownMenuTrigger',
  DropdownMenuContent = 'DropdownMenuContent',
  DropdownMenuItem = 'DropdownMenuItem',
  DropdownMenuSub = 'DropdownMenuSub',
  DropdownMenuSubTrigger = 'DropdownMenuSubTrigger',
  DropdownMenuSubContent = 'DropdownMenuSubContent',
}

/**
 * UI Kit Icon Enum
 * Well-known icons that UI Kit expects from implementations.
 */
export enum UiKitIcon {
  Close = 'close',
  AppLogo = 'app-logo',
  AppLogoText = 'app-logo-text',
}

/**
 * UI Kit Component Map
 * Maps component enum values to their type implementations.
 */
export interface UiKitComponentMap {
  // Basic components
  [UiKitComponent.Button]: ButtonComponent;
  [UiKitComponent.IconButton]: IconButtonComponent;
  [UiKitComponent.DropdownButton]: DropdownButtonComponent;
  [UiKitComponent.Switch]: SwitchComponent;
  [UiKitComponent.Skeleton]: SkeletonComponent;
  [UiKitComponent.Spinner]: SpinnerComponent;

  // Layout components
  [UiKitComponent.Header]: HeaderComponent;
  [UiKitComponent.Sidebar]: SidebarComponent;
  [UiKitComponent.SidebarContent]: SidebarContentComponent;
  [UiKitComponent.SidebarHeader]: SidebarHeaderComponent;
  [UiKitComponent.SidebarMenu]: SidebarMenuComponent;
  [UiKitComponent.SidebarMenuItem]: SidebarMenuItemComponent;
  [UiKitComponent.SidebarMenuButton]: SidebarMenuButtonComponent;
  [UiKitComponent.SidebarMenuIcon]: SidebarMenuIconComponent;
  [UiKitComponent.SidebarMenuLabel]: SidebarMenuLabelComponent;

  // Domain components
  [UiKitComponent.UserInfo]: UserInfoComponent;

  // Dropdown components
  [UiKitComponent.DropdownMenu]: DropdownMenuComponent;
  [UiKitComponent.DropdownMenuTrigger]: DropdownMenuTriggerComponent;
  [UiKitComponent.DropdownMenuContent]: DropdownMenuContentComponent;
  [UiKitComponent.DropdownMenuItem]: DropdownMenuItemComponent;
  [UiKitComponent.DropdownMenuSub]: DropdownMenuSubComponent;
  [UiKitComponent.DropdownMenuSubTrigger]: DropdownMenuSubTriggerComponent;
  [UiKitComponent.DropdownMenuSubContent]: DropdownMenuSubContentComponent;
}

/**
 * Component Names - for type-safe registration
 */
export type ComponentName = keyof UiKitComponentMap;
// @cpt-end:cpt-hai3-dod-uikit-components-registry-types:p2:inst-1
// @cpt-end:cpt-hai3-flow-uikit-components-registry-lookup:p2:inst-1
