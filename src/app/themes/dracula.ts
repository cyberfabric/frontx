/**
 * Dracula theme for HAI3
 * Based on the classic Dracula color scheme
 */

import type { Theme } from '@hai3/uikit';

/**
 * Dracula theme ID
 */
export const DRACULA_THEME_ID = 'dracula' as const;

/**
 * Dracula color palette
 * Official Dracula colors: https://draculatheme.com/contribute
 */
const dracula = {
  purple: 'hsl(265 89% 78%)',       // #bd93f9
  comment: 'hsl(225 27% 51%)',      // #6272a4
  pink: 'hsl(326 100% 74%)',        // #ff79c6
  background: 'hsl(231 15% 18%)',   // #282a36
  foreground: 'hsl(60 30% 96%)',    // #f8f8f2
  currentLine: 'hsl(232 14% 31%)',  // #44475a
  red: 'hsl(0 100% 67%)',           // #ff5555
  yellow: 'hsl(65 92% 76%)',        // #f1fa8c
  green: 'hsl(135 94% 65%)',        // #50fa7b
  cyan: 'hsl(191 97% 77%)',         // #8be9fd
  backgroundDark: 'hsl(231 15% 14%)', // darker variant
};

export const draculaTheme: Theme = {
  name: DRACULA_THEME_ID,
  colors: {
    primary: dracula.purple,
    secondary: dracula.comment,
    accent: dracula.pink,
    background: dracula.background,
    foreground: dracula.foreground,
    muted: dracula.currentLine,
    border: dracula.currentLine,
    error: dracula.red,
    warning: dracula.yellow,
    success: dracula.green,
    info: dracula.cyan,
    mainMenu: {
      DEFAULT: dracula.backgroundDark,
      foreground: dracula.comment,
      hover: dracula.currentLine,
      selected: dracula.purple,
      border: dracula.currentLine,
    },
    chat: {
      leftMenu: {
        DEFAULT: dracula.backgroundDark,
        foreground: dracula.foreground,
        hover: dracula.currentLine,
        selected: dracula.purple,
        border: dracula.currentLine,
      },
      message: {
        user: {
          background: dracula.purple,
          foreground: dracula.background,
        },
        assistant: {
          background: dracula.green,
          foreground: dracula.background,
        },
      },
      input: {
        background: dracula.background,
        foreground: dracula.foreground,
        border: dracula.currentLine,
      },
      codeBlock: {
        background: dracula.backgroundDark,
        foreground: dracula.foreground,
        border: dracula.currentLine,
        headerBackground: dracula.currentLine,
      },
    },
    inScreenMenu: {
      DEFAULT: dracula.backgroundDark,
      foreground: dracula.foreground,
      hover: dracula.currentLine,
      selected: dracula.purple,
      border: dracula.currentLine,
    },
    // Chart colors for data visualization (OKLCH format, Dracula-inspired palette)
    chart: {
      1: 'oklch(0.714 0.203 313.26)',   // purple (Dracula purple)
      2: 'oklch(0.799 0.194 145.19)',   // green (Dracula green)
      3: 'oklch(0.821 0.173 85.29)',    // yellow (Dracula yellow)
      4: 'oklch(0.71 0.191 349.76)',    // pink (Dracula pink)
      5: 'oklch(0.822 0.131 194.77)',   // cyan (Dracula cyan)
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.6)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
  },
  transitions: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
};
