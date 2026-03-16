/**
 * Tailwind configuration for @hai3/uikit package
 *
 * This config is used to pre-compile CSS with all Tailwind classes
 * used by uikit components. The output is shipped as dist/styles.css
 * so consuming apps don't need to scan node_modules.
 */
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  // Scan all component source files for Tailwind classes
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  safelist: [
    // RTL utilities used in components
    'rtl:flex-row-reverse',
    'rtl:rotate-180',
    'rtl:-translate-x-4',
    'ms-auto',
    // Data attribute + RTL combos for Switch
    'data-[state=checked]:ltr:translate-x-4',
    'data-[state=checked]:rtl:-translate-x-4',
    // ARIA invalid state for form elements
    'aria-[invalid=true]:ring-2',
    'aria-[invalid=true]:ring-destructive/30',
    'aria-[invalid=true]:border-destructive',
    // Calendar cell size CSS variable
    '[--cell-size:2.75rem]',
    'md:[--cell-size:3rem]',
    // Layout utilities used by @hai3/uicore (Layout, Screen, Footer, etc.)
    'flex',
    'flex-col',
    'flex-1',
    'flex-row',
    'items-center',
    'justify-center',
    'justify-between',
    'gap-4',
    'h-screen',
    'h-full',
    'h-12',
    'w-screen',
    'w-full',
    'overflow-hidden',
    'overflow-auto',
    'bg-background',
    'bg-muted/30',
    'text-muted-foreground',
    'text-primary',
    'text-sm',
    'border-t',
    'border-border',
    'px-6',
    'py-3',
    'size-8',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        error: 'hsl(var(--error))',
        warning: 'hsl(var(--warning))',
        success: 'hsl(var(--success))',
        info: 'hsl(var(--info))',
        mainMenu: {
          DEFAULT: 'hsl(var(--left-menu))',
          foreground: 'hsl(var(--left-menu-foreground))',
          hover: 'hsl(var(--left-menu-hover))',
          selected: 'hsl(var(--left-menu-selected))',
          border: 'hsl(var(--left-menu-border))',
        },
      },
      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
        '2xl': 'var(--spacing-2xl)',
        '3xl': 'var(--spacing-3xl)',
      },
      borderRadius: {
        none: '0',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: '9999px',
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
        slower: '500ms',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
