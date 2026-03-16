/**
 * Light theme for HAI3
 */

import type { Theme } from '@hai3/uikit';
import colors from './tailwindColors';

/**
 * Light theme ID
 */
export const LIGHT_THEME_ID = 'light' as const;

export const lightTheme: Theme = {
  name: LIGHT_THEME_ID,
  colors: {
    // Light theme - using Tailwind colors directly
    primary: colors.zinc[900],
    secondary: colors.zinc[100],
    accent: colors.zinc[400],
    background: colors.white,
    foreground: colors.zinc[950],
    muted: colors.zinc[100],
    border: colors.zinc[200],
    error: colors.red[500],
    warning: colors.orange[500],
    success: colors.green[600],
    info: colors.sky[500],
    mainMenu: {
      DEFAULT: colors.zinc[100],
      foreground: colors.zinc[500],
      hover: colors.zinc[200],
      selected: colors.blue[600],
      border: colors.zinc[200],
    },
    chat: {
      leftMenu: {
        DEFAULT: colors.zinc[100],
        foreground: colors.zinc[900],
        hover: colors.zinc[200],
        selected: colors.blue[600],
        border: colors.zinc[200],
      },
      message: {
        user: {
          background: colors.blue[500],
          foreground: colors.white,
        },
        assistant: {
          background: colors.green[500],
          foreground: colors.white,
        },
      },
      input: {
        background: colors.white,
        foreground: colors.zinc[900],
        border: colors.zinc[300],
      },
      codeBlock: {
        background: colors.zinc[100],
        foreground: colors.zinc[900],
        border: colors.zinc[300],
        headerBackground: colors.zinc[200],
      },
    },
    inScreenMenu: {
      DEFAULT: colors.zinc[50],
      foreground: colors.zinc[900],
      hover: colors.zinc[100],
      selected: colors.blue[50],
      border: colors.zinc[200],
    },
    // Chart colors for data visualization (OKLCH format, shadcn/ui light theme)
    chart: {
      1: 'oklch(0.646 0.222 41.116)',   // warm orange
      2: 'oklch(0.6 0.118 184.704)',    // teal
      3: 'oklch(0.398 0.07 227.392)',   // slate blue
      4: 'oklch(0.828 0.189 84.429)',   // yellow
      5: 'oklch(0.769 0.188 70.08)',    // amber
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
};
