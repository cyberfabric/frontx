/**
 * Theme Resolution Module for Demo MFE
 *
 * Maps theme ID strings (received via domain properties) to Theme objects.
 * Theme definitions are inlined directly in this file for MFE independence.
 * Each MFE is an independently deployable unit and must not import from host boundaries.
 *
 * @packageDocumentation
 */

import type { Theme } from '@hai3/uikit';

/**
 * Default theme
 * Based on original PoC design with light color scheme
 */
const defaultTheme: Theme = {
  name: 'default',
  colors: {
    primary: 'hsl(221 83% 53%)',        // blue-600
    secondary: 'hsl(210 20% 98%)',      // gray-50
    accent: 'hsl(220 14% 96%)',         // blue-100
    background: 'hsl(0 0% 100%)',       // white
    foreground: 'hsl(221 39% 11%)',     // gray-900
    muted: 'hsl(220 14% 96%)',          // gray-100
    border: 'hsl(220 13% 91%)',         // gray-200
    error: 'hsl(0 84% 60%)',            // red-500
    warning: 'hsl(25 95% 53%)',         // orange-500
    success: 'hsl(142 76% 36%)',        // green-600
    info: 'hsl(199 89% 48%)',           // sky-500
    mainMenu: {
      DEFAULT: 'hsl(221 39% 11%)',      // gray-900
      foreground: 'hsl(218 11% 65%)',   // gray-400
      hover: 'hsl(217 19% 27%)',        // gray-700
      selected: 'hsl(221 83% 53%)',     // blue-600
      border: 'hsl(217 19% 27%)',       // gray-700
    },
    chat: {
      leftMenu: {
        DEFAULT: 'hsl(215 28% 17%)',    // gray-800
        foreground: 'hsl(0 0% 100%)',   // white
        hover: 'hsl(217 19% 27%)',      // gray-700
        selected: 'hsl(221 83% 53%)',   // blue-600
        border: 'hsl(217 19% 27%)',     // gray-700
      },
      message: {
        user: {
          background: 'hsl(217 91% 60%)', // blue-500
          foreground: 'hsl(0 0% 100%)',   // white
        },
        assistant: {
          background: 'hsl(142 71% 45%)', // green-500
          foreground: 'hsl(0 0% 100%)',   // white
        },
      },
      input: {
        background: 'hsl(0 0% 100%)',   // white
        foreground: 'hsl(221 39% 11%)', // gray-900
        border: 'hsl(216 12% 84%)',     // gray-300
      },
      codeBlock: {
        background: 'hsl(215 28% 17%)', // gray-800
        foreground: 'hsl(220 13% 91%)', // gray-200
        border: 'hsl(217 19% 27%)',     // gray-700
        headerBackground: 'hsl(217 19% 27%)', // gray-700
      },
    },
    inScreenMenu: {
      DEFAULT: 'hsl(210 20% 98%)',      // gray-50
      foreground: 'hsl(221 39% 11%)',   // gray-900
      hover: 'hsl(220 14% 96%)',        // gray-100
      selected: 'hsl(214 100% 97%)',    // blue-50
      border: 'hsl(220 13% 91%)',       // gray-200
    },
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

/**
 * Dark theme
 */
const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: 'hsl(0 0% 98%)',           // zinc-50
    secondary: 'hsl(240 4% 16%)',       // zinc-800
    accent: 'hsl(240 5% 65%)',          // zinc-400
    background: 'hsl(240 10% 4%)',      // zinc-950
    foreground: 'hsl(0 0% 98%)',        // zinc-50
    muted: 'hsl(240 4% 16%)',           // zinc-800
    border: 'hsl(240 4% 16%)',          // zinc-800
    error: 'hsl(0 63% 31%)',            // red-900
    warning: 'hsl(25 95% 53%)',         // orange-500
    success: 'hsl(142 71% 45%)',        // green-500
    info: 'hsl(199 89% 48%)',           // sky-500
    mainMenu: {
      DEFAULT: 'hsl(0 0% 0%)',          // black
      foreground: 'hsl(240 5% 65%)',    // zinc-400
      hover: 'hsl(240 6% 10%)',         // zinc-900
      selected: 'hsl(240 4% 46%)',      // zinc-500
      border: 'hsl(240 4% 16%)',        // zinc-800
    },
    chat: {
      leftMenu: {
        DEFAULT: 'hsl(240 6% 10%)',     // zinc-900
        foreground: 'hsl(240 5% 96%)',  // zinc-100
        hover: 'hsl(240 4% 16%)',       // zinc-800
        selected: 'hsl(240 5% 26%)',    // zinc-700
        border: 'hsl(240 4% 16%)',      // zinc-800
      },
      message: {
        user: {
          background: 'hsl(221 83% 53%)', // blue-600
          foreground: 'hsl(0 0% 100%)',   // white
        },
        assistant: {
          background: 'hsl(142 76% 36%)', // green-600
          foreground: 'hsl(0 0% 100%)',   // white
        },
      },
      input: {
        background: 'hsl(240 6% 10%)',  // zinc-900
        foreground: 'hsl(240 5% 96%)',  // zinc-100
        border: 'hsl(240 5% 26%)',      // zinc-700
      },
      codeBlock: {
        background: 'hsl(240 6% 10%)',  // zinc-900
        foreground: 'hsl(240 6% 90%)',  // zinc-200
        border: 'hsl(240 4% 16%)',      // zinc-800
        headerBackground: 'hsl(240 4% 16%)', // zinc-800
      },
    },
    inScreenMenu: {
      DEFAULT: 'hsl(240 6% 10%)',       // zinc-900
      foreground: 'hsl(240 5% 96%)',    // zinc-100
      hover: 'hsl(240 4% 16%)',         // zinc-800
      selected: 'hsl(240 5% 26%)',      // zinc-700
      border: 'hsl(240 4% 16%)',        // zinc-800
    },
    chart: {
      1: 'oklch(0.488 0.243 264.376)',  // blue
      2: 'oklch(0.696 0.17 162.48)',    // emerald
      3: 'oklch(0.769 0.188 70.08)',    // amber
      4: 'oklch(0.627 0.265 303.9)',    // violet
      5: 'oklch(0.645 0.246 16.439)',   // rose
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
  },
  transitions: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
};

/**
 * Light theme
 */
const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: 'hsl(221 39% 11%)',        // zinc-900
    secondary: 'hsl(240 5% 96%)',       // zinc-100
    accent: 'hsl(240 5% 65%)',          // zinc-400
    background: 'hsl(0 0% 100%)',       // white
    foreground: 'hsl(240 10% 4%)',      // zinc-950
    muted: 'hsl(240 5% 96%)',           // zinc-100
    border: 'hsl(240 6% 90%)',          // zinc-200
    error: 'hsl(0 84% 60%)',            // red-500
    warning: 'hsl(25 95% 53%)',         // orange-500
    success: 'hsl(142 76% 36%)',        // green-600
    info: 'hsl(199 89% 48%)',           // sky-500
    mainMenu: {
      DEFAULT: 'hsl(240 5% 96%)',       // zinc-100
      foreground: 'hsl(240 4% 46%)',    // zinc-500
      hover: 'hsl(240 6% 90%)',         // zinc-200
      selected: 'hsl(221 83% 53%)',     // blue-600
      border: 'hsl(240 6% 90%)',        // zinc-200
    },
    chat: {
      leftMenu: {
        DEFAULT: 'hsl(240 5% 96%)',     // zinc-100
        foreground: 'hsl(221 39% 11%)', // zinc-900
        hover: 'hsl(240 6% 90%)',       // zinc-200
        selected: 'hsl(221 83% 53%)',   // blue-600
        border: 'hsl(240 6% 90%)',      // zinc-200
      },
      message: {
        user: {
          background: 'hsl(217 91% 60%)', // blue-500
          foreground: 'hsl(0 0% 100%)',   // white
        },
        assistant: {
          background: 'hsl(142 71% 45%)', // green-500
          foreground: 'hsl(0 0% 100%)',   // white
        },
      },
      input: {
        background: 'hsl(0 0% 100%)',   // white
        foreground: 'hsl(221 39% 11%)', // zinc-900
        border: 'hsl(240 5% 84%)',      // zinc-300
      },
      codeBlock: {
        background: 'hsl(240 5% 96%)',  // zinc-100
        foreground: 'hsl(221 39% 11%)', // zinc-900
        border: 'hsl(240 5% 84%)',      // zinc-300
        headerBackground: 'hsl(240 6% 90%)', // zinc-200
      },
    },
    inScreenMenu: {
      DEFAULT: 'hsl(0 0% 98%)',         // zinc-50
      foreground: 'hsl(221 39% 11%)',   // zinc-900
      hover: 'hsl(240 5% 96%)',         // zinc-100
      selected: 'hsl(214 100% 97%)',    // blue-50
      border: 'hsl(240 6% 90%)',        // zinc-200
    },
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

/**
 * Dracula theme
 * Based on the classic Dracula color scheme
 */
const draculaTheme: Theme = {
  name: 'dracula',
  colors: {
    primary: 'hsl(265 89% 78%)',        // #bd93f9
    secondary: 'hsl(225 27% 51%)',      // #6272a4
    accent: 'hsl(326 100% 74%)',        // #ff79c6
    background: 'hsl(231 15% 18%)',     // #282a36
    foreground: 'hsl(60 30% 96%)',      // #f8f8f2
    muted: 'hsl(232 14% 31%)',          // #44475a
    border: 'hsl(232 14% 31%)',         // #44475a
    error: 'hsl(0 100% 67%)',           // #ff5555
    warning: 'hsl(65 92% 76%)',         // #f1fa8c
    success: 'hsl(135 94% 65%)',        // #50fa7b
    info: 'hsl(191 97% 77%)',           // #8be9fd
    mainMenu: {
      DEFAULT: 'hsl(231 15% 14%)',      // darker variant
      foreground: 'hsl(225 27% 51%)',   // #6272a4
      hover: 'hsl(232 14% 31%)',        // #44475a
      selected: 'hsl(265 89% 78%)',     // #bd93f9
      border: 'hsl(232 14% 31%)',       // #44475a
    },
    chat: {
      leftMenu: {
        DEFAULT: 'hsl(231 15% 14%)',    // darker variant
        foreground: 'hsl(60 30% 96%)',  // #f8f8f2
        hover: 'hsl(232 14% 31%)',      // #44475a
        selected: 'hsl(265 89% 78%)',   // #bd93f9
        border: 'hsl(232 14% 31%)',     // #44475a
      },
      message: {
        user: {
          background: 'hsl(265 89% 78%)', // #bd93f9
          foreground: 'hsl(231 15% 18%)', // #282a36
        },
        assistant: {
          background: 'hsl(135 94% 65%)', // #50fa7b
          foreground: 'hsl(231 15% 18%)', // #282a36
        },
      },
      input: {
        background: 'hsl(231 15% 18%)', // #282a36
        foreground: 'hsl(60 30% 96%)',  // #f8f8f2
        border: 'hsl(232 14% 31%)',     // #44475a
      },
      codeBlock: {
        background: 'hsl(231 15% 14%)', // darker variant
        foreground: 'hsl(60 30% 96%)',  // #f8f8f2
        border: 'hsl(232 14% 31%)',     // #44475a
        headerBackground: 'hsl(232 14% 31%)', // #44475a
      },
    },
    inScreenMenu: {
      DEFAULT: 'hsl(231 15% 14%)',      // darker variant
      foreground: 'hsl(60 30% 96%)',    // #f8f8f2
      hover: 'hsl(232 14% 31%)',        // #44475a
      selected: 'hsl(265 89% 78%)',     // #bd93f9
      border: 'hsl(232 14% 31%)',       // #44475a
    },
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

/**
 * Dracula Large theme
 * Based on Dracula theme with larger spacing and typography
 */
const draculaLargeTheme: Theme = {
  name: 'dracula-large',
  colors: {
    primary: 'hsl(265 89% 78%)',        // #bd93f9
    secondary: 'hsl(225 27% 51%)',      // #6272a4
    accent: 'hsl(326 100% 74%)',        // #ff79c6
    background: 'hsl(231 15% 18%)',     // #282a36
    foreground: 'hsl(60 30% 96%)',      // #f8f8f2
    muted: 'hsl(232 14% 31%)',          // #44475a
    border: 'hsl(232 14% 31%)',         // #44475a
    error: 'hsl(0 100% 67%)',           // #ff5555
    warning: 'hsl(65 92% 76%)',         // #f1fa8c
    success: 'hsl(135 94% 65%)',        // #50fa7b
    info: 'hsl(191 97% 77%)',           // #8be9fd
    mainMenu: {
      DEFAULT: 'hsl(231 15% 14%)',      // darker variant
      foreground: 'hsl(225 27% 51%)',   // #6272a4
      hover: 'hsl(232 14% 31%)',        // #44475a
      selected: 'hsl(265 89% 78%)',     // #bd93f9
      border: 'hsl(232 14% 31%)',       // #44475a
    },
    chat: {
      leftMenu: {
        DEFAULT: 'hsl(231 15% 14%)',    // darker variant
        foreground: 'hsl(60 30% 96%)',  // #f8f8f2
        hover: 'hsl(232 14% 31%)',      // #44475a
        selected: 'hsl(265 89% 78%)',   // #bd93f9
        border: 'hsl(232 14% 31%)',     // #44475a
      },
      message: {
        user: {
          background: 'hsl(265 89% 78%)', // #bd93f9
          foreground: 'hsl(231 15% 18%)', // #282a36
        },
        assistant: {
          background: 'hsl(135 94% 65%)', // #50fa7b
          foreground: 'hsl(231 15% 18%)', // #282a36
        },
      },
      input: {
        background: 'hsl(231 15% 18%)', // #282a36
        foreground: 'hsl(60 30% 96%)',  // #f8f8f2
        border: 'hsl(232 14% 31%)',     // #44475a
      },
      codeBlock: {
        background: 'hsl(231 15% 14%)', // darker variant
        foreground: 'hsl(60 30% 96%)',  // #f8f8f2
        border: 'hsl(232 14% 31%)',     // #44475a
        headerBackground: 'hsl(232 14% 31%)', // #44475a
      },
    },
    inScreenMenu: {
      DEFAULT: 'hsl(231 15% 14%)',      // darker variant
      foreground: 'hsl(60 30% 96%)',    // #f8f8f2
      hover: 'hsl(232 14% 31%)',        // #44475a
      selected: 'hsl(265 89% 78%)',     // #bd93f9
      border: 'hsl(232 14% 31%)',       // #44475a
    },
    chart: {
      1: 'oklch(0.714 0.203 313.26)',   // purple (Dracula purple)
      2: 'oklch(0.799 0.194 145.19)',   // green (Dracula green)
      3: 'oklch(0.821 0.173 85.29)',    // yellow (Dracula yellow)
      4: 'oklch(0.71 0.191 349.76)',    // pink (Dracula pink)
      5: 'oklch(0.822 0.131 194.77)',   // cyan (Dracula cyan)
    },
  },
  spacing: {
    xs: '0.375rem',   // 1.5x
    sm: '0.75rem',    // 1.5x
    md: '1.5rem',     // 1.5x
    lg: '2.25rem',    // 1.5x
    xl: '3rem',       // 1.5x
    '2xl': '4.5rem',  // 1.5x
    '3xl': '6rem',    // 1.5x
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: '0.9375rem',   // 1.25x
      sm: '1.09375rem',  // 1.25x
      base: '1.25rem',   // 1.25x
      lg: '1.40625rem',  // 1.25x
      xl: '1.5625rem',   // 1.25x
      '2xl': '1.875rem', // 1.25x
      '3xl': '2.34375rem', // 1.25x
      '4xl': '2.8125rem',  // 1.25x
      '5xl': '3.75rem',    // 1.25x
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
    sm: '0.1875rem',  // Slightly larger
    md: '0.375rem',   // Slightly larger
    lg: '0.75rem',    // Slightly larger
    xl: '1.5rem',     // Slightly larger
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

/**
 * Map of theme ID strings to Theme objects
 */
export const THEME_MAP: Record<string, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  light: lightTheme,
  dracula: draculaTheme,
  'dracula-large': draculaLargeTheme,
};

/**
 * Resolve a theme ID string to a Theme object
 *
 * @param themeId - Theme ID string from domain property
 * @returns Theme object, or undefined if theme ID not found
 */
export function resolveTheme(themeId: string): Theme | undefined {
  return THEME_MAP[themeId];
}
