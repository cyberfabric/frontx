/**
 * Tests for applyThemeToShadowRoot - Phase 43
 *
 * Tests that theme CSS variables are correctly applied to shadow roots
 * with idempotency, data-theme attributes, and -large theme handling.
 *
 * @packageDocumentation
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyThemeToShadowRoot } from '../../src/styles/applyTheme';
import type { Theme } from '../../src/types';

describe('applyThemeToShadowRoot - Phase 43', () => {
  let container: HTMLElement;
  let shadowRoot: ShadowRoot;
  let testTheme: Theme;

  beforeEach(() => {
    container = document.createElement('div');
    shadowRoot = container.attachShadow({ mode: 'open' });

    // Create a minimal test theme with all required categories
    testTheme = {
      name: 'test',
      colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(0 0% 3.9%)',
        primary: 'hsl(221 83% 53%)',
        secondary: 'hsl(210 40% 96.1%)',
        accent: 'hsl(210 40% 96.1%)',
        muted: 'hsl(210 40% 96.1%)',
        border: 'hsl(214.3 31.8% 91.4%)',
        error: 'hsl(0 84.2% 60.2%)',
        warning: 'hsl(38 92% 50%)',
        success: 'hsl(142.1 76.2% 36.3%)',
        info: 'hsl(199 89% 48%)',
        chart: {
          1: 'oklch(0.65 0.2 220)',
          2: 'oklch(0.65 0.2 160)',
          3: 'oklch(0.65 0.2 100)',
          4: 'oklch(0.65 0.2 40)',
          5: 'oklch(0.65 0.2 340)',
        },
        mainMenu: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(0 0% 3.9%)',
          hover: 'hsl(210 40% 96.1%)',
          selected: 'hsl(221 83% 53%)',
          border: 'hsl(214.3 31.8% 91.4%)',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '1rem',
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
      transitions: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
    };
  });

  describe('43.5.5: applyThemeToShadowRoot applies CSS variables to shadow root', () => {
    it('should create style element and apply theme variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement).toBeDefined();
      expect(styleElement.tagName).toBe('STYLE');

      const content = styleElement.textContent || '';
      expect(content).toContain(':host');
      expect(content).toContain('--background: 0 0% 100%');
      expect(content).toContain('--foreground: 0 0% 3.9%');
      expect(content).toContain('--primary: 221 83% 53%');
      expect(content).toContain('--secondary: 210 40% 96.1%');
      expect(content).toContain('--accent: 210 40% 96.1%');
      expect(content).toContain('--muted: 210 40% 96.1%');
      expect(content).toContain('--border: 214.3 31.8% 91.4%');
      expect(content).toContain('--error: 0 84.2% 60.2%');
      expect(content).toContain('--warning: 38 92% 50%');
      expect(content).toContain('--success: 142.1 76.2% 36.3%');
      expect(content).toContain('--info: 199 89% 48%');
    });
  });

  describe('43.5.6: applyThemeToShadowRoot is idempotent', () => {
    it('should reuse existing style element', () => {
      const themeA: Theme = { ...testTheme, name: 'themeA' };
      const themeB: Theme = {
        ...testTheme,
        name: 'themeB',
        colors: {
          ...testTheme.colors,
          primary: 'hsl(142 76% 36%)',
        },
      };

      applyThemeToShadowRoot(shadowRoot, themeA);
      const styleElement1 = shadowRoot.getElementById('__hai3-theme-vars__');
      expect(styleElement1).toBeDefined();
      expect(styleElement1?.textContent).toContain('--primary: 221 83% 53%');

      applyThemeToShadowRoot(shadowRoot, themeB);
      const styleElement2 = shadowRoot.getElementById('__hai3-theme-vars__');
      expect(styleElement2).toBeDefined();
      expect(styleElement2).toBe(styleElement1);

      // Content should be updated to theme B
      expect(styleElement2?.textContent).toContain('--primary: 142 76% 36%');
      expect(styleElement2?.textContent).not.toContain('--primary: 221 83% 53%');

      // Should still have exactly one style element
      const allStyles = shadowRoot.querySelectorAll('#__hai3-theme-vars__');
      expect(allStyles.length).toBe(1);
    });
  });

  describe('43.5.7: applyThemeToShadowRoot sets data-theme attribute when themeName provided', () => {
    it('should set data-theme attribute', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme, 'dark');

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement).toBeDefined();
      expect(styleElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should not set data-theme attribute when themeName not provided', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement).toBeDefined();
      expect(styleElement.hasAttribute('data-theme')).toBe(false);
    });
  });

  describe('43.5.8: applyThemeToShadowRoot applies font-size 125% for -large themes', () => {
    it('should apply font-size 125% for -large theme', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme, 'dracula-large');

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement).toBeDefined();
      expect(styleElement.textContent).toContain('font-size: 125%');
    });

    it('should not apply font-size for non-large theme', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme, 'dark');

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement).toBeDefined();
      expect(styleElement.textContent).not.toContain('font-size: 125%');
    });

    it('should update font-size rule when switching themes', () => {
      // Apply large theme
      applyThemeToShadowRoot(shadowRoot, testTheme, 'dracula-large');
      let styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement.textContent).toContain('font-size: 125%');

      // Switch to non-large theme
      applyThemeToShadowRoot(shadowRoot, testTheme, 'dark');
      styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      expect(styleElement.textContent).not.toContain('font-size: 125%');
    });
  });

  describe('43.5.9: applyThemeToShadowRoot includes all variable categories', () => {
    it('should include all shadcn color variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      // shadcn color variables
      expect(content).toContain('--background:');
      expect(content).toContain('--foreground:');
      expect(content).toContain('--card:');
      expect(content).toContain('--card-foreground:');
      expect(content).toContain('--popover:');
      expect(content).toContain('--popover-foreground:');
      expect(content).toContain('--primary:');
      expect(content).toContain('--primary-foreground:');
      expect(content).toContain('--secondary:');
      expect(content).toContain('--secondary-foreground:');
      expect(content).toContain('--muted:');
      expect(content).toContain('--muted-foreground:');
      expect(content).toContain('--accent:');
      expect(content).toContain('--accent-foreground:');
      expect(content).toContain('--destructive:');
      expect(content).toContain('--destructive-foreground:');
      expect(content).toContain('--border:');
      expect(content).toContain('--input:');
      expect(content).toContain('--ring:');
    });

    it('should include state color variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--error:');
      expect(content).toContain('--warning:');
      expect(content).toContain('--success:');
      expect(content).toContain('--info:');
    });

    it('should include chart color variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--chart-1:');
      expect(content).toContain('--chart-2:');
      expect(content).toContain('--chart-3:');
      expect(content).toContain('--chart-4:');
      expect(content).toContain('--chart-5:');
    });

    it('should include left menu variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--left-menu:');
      expect(content).toContain('--left-menu-foreground:');
      expect(content).toContain('--left-menu-hover:');
      expect(content).toContain('--left-menu-selected:');
      expect(content).toContain('--left-menu-border:');
    });

    it('should include spacing variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--spacing-xs:');
      expect(content).toContain('--spacing-sm:');
      expect(content).toContain('--spacing-md:');
      expect(content).toContain('--spacing-lg:');
      expect(content).toContain('--spacing-xl:');
    });

    it('should include border radius variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--radius-sm:');
      expect(content).toContain('--radius-md:');
      expect(content).toContain('--radius-lg:');
      expect(content).toContain('--radius-xl:');
    });

    it('should include shadow variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--shadow-sm:');
      expect(content).toContain('--shadow-md:');
      expect(content).toContain('--shadow-lg:');
    });

    it('should include transition variables', () => {
      applyThemeToShadowRoot(shadowRoot, testTheme);

      const styleElement = shadowRoot.getElementById('__hai3-theme-vars__') as HTMLStyleElement;
      const content = styleElement?.textContent || '';

      expect(content).toContain('--transition-fast:');
      expect(content).toContain('--transition-base:');
      expect(content).toContain('--transition-slow:');
    });
  });
});
