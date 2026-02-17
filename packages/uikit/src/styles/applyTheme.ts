/**
 * Theme application utility
 * Generates CSS variables from theme objects dynamically
 * Single source of truth: theme objects in TypeScript
 * Maps to shadcn CSS variable naming convention
 */

import type { Theme } from '../types';

/**
 * Normalize color value for CSS variable
 * - HSL format (hsl(221 83% 53%)) → strip hsl() wrapper for shadcn
 * - Special values (transparent) → used as-is
 */
const hslToVar = (color: string): string => {
  // Handle special cases
  if (color === 'transparent') {
    return 'transparent';
  }

  // HSL format - strip wrapper for shadcn compatibility
  if (color.startsWith('hsl(')) {
    return color.replace('hsl(', '').replace(')', '');
  }

  // Return as-is (shouldn't happen with HSL-only system)
  return color;
};

/**
 * Apply theme to document by injecting CSS variables
 * Theme objects are the single source of truth
 * @param theme - Theme object to apply
 * @param themeName - Optional theme name for data attribute
 */
export const applyTheme = (theme: Theme, themeName?: string): void => {
  const root = document.documentElement;

  // Set theme attribute for CSS selectors
  if (themeName) {
    root.setAttribute('data-theme', themeName);
  }

  // Apply shadcn color variables
  root.style.setProperty('--background', hslToVar(theme.colors.background));
  root.style.setProperty('--foreground', hslToVar(theme.colors.foreground));
  root.style.setProperty('--card', hslToVar(theme.colors.background));
  root.style.setProperty('--card-foreground', hslToVar(theme.colors.foreground));
  root.style.setProperty('--popover', hslToVar(theme.colors.background));
  root.style.setProperty('--popover-foreground', hslToVar(theme.colors.foreground));
  root.style.setProperty('--primary', hslToVar(theme.colors.primary));
  root.style.setProperty('--primary-foreground', hslToVar(theme.colors.background));
  root.style.setProperty('--secondary', hslToVar(theme.colors.secondary));
  root.style.setProperty('--secondary-foreground', hslToVar(theme.colors.foreground));
  root.style.setProperty('--muted', hslToVar(theme.colors.muted));
  root.style.setProperty('--muted-foreground', hslToVar(theme.colors.foreground));
  root.style.setProperty('--accent', hslToVar(theme.colors.accent));
  root.style.setProperty('--accent-foreground', hslToVar(theme.colors.background));
  root.style.setProperty('--destructive', hslToVar(theme.colors.error));
  root.style.setProperty('--destructive-foreground', hslToVar(theme.colors.foreground));
  root.style.setProperty('--border', hslToVar(theme.colors.border));
  root.style.setProperty('--input', hslToVar(theme.colors.border));
  root.style.setProperty('--ring', hslToVar(theme.colors.primary));

  // Apply state colors
  root.style.setProperty('--error', hslToVar(theme.colors.error));
  root.style.setProperty('--warning', hslToVar(theme.colors.warning));
  root.style.setProperty('--success', hslToVar(theme.colors.success));
  root.style.setProperty('--info', hslToVar(theme.colors.info));

  // Apply chart colors (OKLCH format - pass as-is)
  root.style.setProperty('--chart-1', theme.colors.chart[1]);
  root.style.setProperty('--chart-2', theme.colors.chart[2]);
  root.style.setProperty('--chart-3', theme.colors.chart[3]);
  root.style.setProperty('--chart-4', theme.colors.chart[4]);
  root.style.setProperty('--chart-5', theme.colors.chart[5]);

  // Apply left menu colors
  root.style.setProperty('--left-menu', hslToVar(theme.colors.mainMenu.DEFAULT));
  root.style.setProperty('--left-menu-foreground', hslToVar(theme.colors.mainMenu.foreground));
  root.style.setProperty('--left-menu-hover', hslToVar(theme.colors.mainMenu.hover));
  root.style.setProperty('--left-menu-selected', hslToVar(theme.colors.mainMenu.selected));
  root.style.setProperty('--left-menu-border', hslToVar(theme.colors.mainMenu.border));

  // Apply spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Apply border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // Apply shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });

  // Apply transitions
  Object.entries(theme.transitions).forEach(([key, value]) => {
    root.style.setProperty(`--transition-${key}`, value);
  });

  // For -large themes: scale base font size
  if (themeName?.endsWith('-large')) {
    root.style.fontSize = '125%';
  } else {
    root.style.fontSize = '';
  }
};

/**
 * Apply theme to a shadow root by injecting CSS variables
 * Uses :host selector instead of document.documentElement
 * Idempotent - reuses existing style element with id __hai3-theme-vars__
 *
 * @param shadowRoot - The shadow root to inject theme variables into
 * @param theme - Theme object to apply
 * @param themeName - Optional theme name for data attribute
 */
export const applyThemeToShadowRoot = (
  shadowRoot: ShadowRoot,
  theme: Theme,
  themeName?: string
): void => {
  // Get or create style element
  let styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement | null;
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = '__hai3-theme-vars__';
    shadowRoot.appendChild(styleElement);
  }

  // Set data-theme attribute for debugging
  if (themeName) {
    styleElement.setAttribute('data-theme', themeName);
  }

  // Generate CSS variable declarations
  const cssVars: string[] = [];

  // Shadcn color variables
  cssVars.push(`--background: ${hslToVar(theme.colors.background)};`);
  cssVars.push(`--foreground: ${hslToVar(theme.colors.foreground)};`);
  cssVars.push(`--card: ${hslToVar(theme.colors.background)};`);
  cssVars.push(`--card-foreground: ${hslToVar(theme.colors.foreground)};`);
  cssVars.push(`--popover: ${hslToVar(theme.colors.background)};`);
  cssVars.push(`--popover-foreground: ${hslToVar(theme.colors.foreground)};`);
  cssVars.push(`--primary: ${hslToVar(theme.colors.primary)};`);
  cssVars.push(`--primary-foreground: ${hslToVar(theme.colors.background)};`);
  cssVars.push(`--secondary: ${hslToVar(theme.colors.secondary)};`);
  cssVars.push(`--secondary-foreground: ${hslToVar(theme.colors.foreground)};`);
  cssVars.push(`--muted: ${hslToVar(theme.colors.muted)};`);
  cssVars.push(`--muted-foreground: ${hslToVar(theme.colors.foreground)};`);
  cssVars.push(`--accent: ${hslToVar(theme.colors.accent)};`);
  cssVars.push(`--accent-foreground: ${hslToVar(theme.colors.background)};`);
  cssVars.push(`--destructive: ${hslToVar(theme.colors.error)};`);
  cssVars.push(`--destructive-foreground: ${hslToVar(theme.colors.foreground)};`);
  cssVars.push(`--border: ${hslToVar(theme.colors.border)};`);
  cssVars.push(`--input: ${hslToVar(theme.colors.border)};`);
  cssVars.push(`--ring: ${hslToVar(theme.colors.primary)};`);

  // State colors
  cssVars.push(`--error: ${hslToVar(theme.colors.error)};`);
  cssVars.push(`--warning: ${hslToVar(theme.colors.warning)};`);
  cssVars.push(`--success: ${hslToVar(theme.colors.success)};`);
  cssVars.push(`--info: ${hslToVar(theme.colors.info)};`);

  // Chart colors (OKLCH format - pass as-is)
  cssVars.push(`--chart-1: ${theme.colors.chart[1]};`);
  cssVars.push(`--chart-2: ${theme.colors.chart[2]};`);
  cssVars.push(`--chart-3: ${theme.colors.chart[3]};`);
  cssVars.push(`--chart-4: ${theme.colors.chart[4]};`);
  cssVars.push(`--chart-5: ${theme.colors.chart[5]};`);

  // Left menu colors
  cssVars.push(`--left-menu: ${hslToVar(theme.colors.mainMenu.DEFAULT)};`);
  cssVars.push(`--left-menu-foreground: ${hslToVar(theme.colors.mainMenu.foreground)};`);
  cssVars.push(`--left-menu-hover: ${hslToVar(theme.colors.mainMenu.hover)};`);
  cssVars.push(`--left-menu-selected: ${hslToVar(theme.colors.mainMenu.selected)};`);
  cssVars.push(`--left-menu-border: ${hslToVar(theme.colors.mainMenu.border)};`);

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    cssVars.push(`--spacing-${key}: ${value};`);
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    cssVars.push(`--radius-${key}: ${value};`);
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    cssVars.push(`--shadow-${key}: ${value};`);
  });

  // Transitions
  Object.entries(theme.transitions).forEach(([key, value]) => {
    cssVars.push(`--transition-${key}: ${value};`);
  });

  // Build CSS content
  let cssContent = `:host {\n  ${cssVars.join('\n  ')}\n}`;

  // For -large themes: add font-size rule
  if (themeName?.endsWith('-large')) {
    cssContent += '\n\n:host {\n  font-size: 125%;\n}';
  }

  styleElement.textContent = cssContent;
};
