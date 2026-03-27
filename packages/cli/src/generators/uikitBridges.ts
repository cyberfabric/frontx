// @cpt-algo:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1
// @cpt-dod:cpt-frontx-dod-ui-libraries-choice-bridge-generation:p1
// @cpt-begin:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1:inst-bridge-generation-1
import type { ThemeConfig } from '../core/types.js';

/**
 * Bridge for CSS-class-based libraries (e.g., @acronis-platform/shadcn-uikit).
 * The library owns CSS variables via class selectors; bridge.css aliases
 * FrontX variable names to the library's namespace using var() references.
 */
export type CssAliasBridge = {
  type: 'css-alias';
  /** CSS @import lines for the library's stylesheets */
  cssImports: string[];
  /** Content of bridge.css — :root aliases from library vars to FrontX vars */
  bridgeCss: string;
  /** Flattened theme definitions mapping FrontX IDs to library theme+mode */
  themes: LibraryThemeMapping[];
  /** Import statement(s) for sync effect in App.tsx */
  syncImport: string;
  /** useEffect body code for syncing FrontX theme → library theme */
  syncEffect: string;
  /** Additional npm dependencies required by the bridge */
  dependencies: Record<string, string>;
};

/**
 * Bridge for JS ThemeProvider-based libraries (e.g., antd, MUI).
 * Reserved for future use — not implemented in this change.
 */
export type JsAdapterBridge = {
  type: 'js-adapter';
  syncImport: string;
  syncEffect: string;
  dependencies: Record<string, string>;
};

export type UikitBridge = CssAliasBridge | JsAdapterBridge;

export type LibraryThemeMapping = {
  id: string;
  name: string;
  libraryTheme: string;
  colorMode: 'light' | 'dark';
  default?: boolean;
};

const KNOWN_BRIDGES: Record<string, UikitBridge> = {
  '@acronis-platform/shadcn-uikit': {
    type: 'css-alias',
    cssImports: [
      '@import "@acronis-platform/shadcn-uikit/styles";',
      '@import "@acronis-platform/shadcn-uikit/styles/themes/acronis-ocean";',
    ],
    bridgeCss: `:root {
  /* Bridge: alias FrontX variable names to @acronis-platform/shadcn-uikit --av-* tokens.
     UIKit tokens store raw HSL triplets (e.g. "0 0% 100%"). We pass them through
     as-is — consumers wrap with hsl(var(--...)) per the shadcn convention. */
  --background: var(--av-background);
  --foreground: var(--av-foreground);
  --card: var(--av-card);
  --card-foreground: var(--av-card-foreground);
  --popover: var(--av-popover, var(--av-card));
  --popover-foreground: var(--av-popover-foreground, var(--av-card-foreground));
  --primary: var(--av-primary);
  --primary-foreground: var(--av-primary-foreground);
  --secondary: var(--av-secondary);
  --secondary-foreground: var(--av-secondary-foreground);
  --muted: var(--av-muted);
  --muted-foreground: var(--av-muted-foreground);
  --accent: var(--av-accent, var(--av-muted));
  --accent-foreground: var(--av-accent-foreground, var(--av-muted-foreground));
  --destructive: var(--av-destructive);
  --destructive-foreground: var(--av-destructive-foreground);
  --border: var(--av-border);
  --input: var(--av-input, var(--av-border));
  --ring: var(--av-ring, var(--av-primary));
  --error: var(--av-destructive);
  --warning: var(--av-warning, 30 100% 50%);
  --success: var(--av-success, 142 71% 45%);
  --info: var(--av-info, 199 89% 48%);
  --radius: var(--av-radius, 0.5rem);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
`,
    themes: [
      { id: 'acronis-default', name: 'Acronis Default', libraryTheme: 'acronis-default', colorMode: 'light', default: true },
      { id: 'acronis-default-dark', name: 'Acronis Default Dark', libraryTheme: 'acronis-default', colorMode: 'dark' },
      { id: 'acronis-ocean', name: 'Acronis Ocean', libraryTheme: 'acronis-ocean', colorMode: 'light' },
      { id: 'acronis-ocean-dark', name: 'Acronis Ocean Dark', libraryTheme: 'acronis-ocean', colorMode: 'dark' },
    ],
    syncImport: `import { applyTheme, applyColorMode, initializeThemeSystem } from '@acronis-platform/shadcn-uikit';`,
    syncEffect: `    const themeMap: Record<string, { theme: string; mode: 'light' | 'dark' }> = {
      'acronis-default': { theme: 'acronis-default', mode: 'light' },
      'acronis-default-dark': { theme: 'acronis-default', mode: 'dark' },
      'acronis-ocean': { theme: 'acronis-ocean', mode: 'light' },
      'acronis-ocean-dark': { theme: 'acronis-ocean', mode: 'dark' },
    };
    const mapping = themeMap[currentTheme];
    if (mapping) {
      applyTheme(mapping.theme, false);
      applyColorMode(mapping.mode, false);
    }`,
    dependencies: {
      '@acronis-platform/shadcn-uikit': 'latest',
    },
  },
};
// @cpt-end:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1:inst-bridge-generation-1

/**
 * Look up a known bridge for the given npm package name.
 * Returns null if the package is not recognized.
 */
// @cpt-begin:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1:inst-bridge-generation-2
export function getUikitBridge(packageName: string): UikitBridge | null {
  return KNOWN_BRIDGES[packageName] ?? null;
}
// @cpt-end:cpt-frontx-algo-ui-libraries-choice-bridge-generation:p1:inst-bridge-generation-2

/**
 * Generate generic themes for unknown UI libraries.
 * Produces default (light) and dark ThemeConfig objects with inline HSL values
 * so the Studio theme selector works out of the box.
 */
// @cpt-algo:cpt-frontx-algo-ui-libraries-choice-theme-propagation:p1
// @cpt-dod:cpt-frontx-dod-ui-libraries-choice-theme-propagation:p1
// @cpt-begin:cpt-frontx-algo-ui-libraries-choice-theme-propagation:p1:inst-theme-propagation-1
export function generateGenericThemes(): { themes: ThemeConfig[]; defaultId: string } {
  const defaultTheme: ThemeConfig = {
    id: 'default',
    name: 'Default',
    default: true,
    variables: {
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '240 10% 3.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '240 10% 3.9%',
      '--primary': '240 5.9% 10%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '240 4.8% 95.9%',
      '--secondary-foreground': '240 5.9% 10%',
      '--muted': '240 4.8% 95.9%',
      '--muted-foreground': '240 3.8% 46.1%',
      '--accent': '240 4.8% 95.9%',
      '--accent-foreground': '240 5.9% 10%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '240 5.9% 90%',
      '--input': '240 5.9% 90%',
      '--ring': '240 5.9% 10%',
      '--error': '0 84.2% 60.2%',
      '--warning': '30 100% 50%',
      '--success': '142 71% 45%',
      '--info': '199 89% 48%',
      '--radius-sm': '0.125rem',
      '--radius-md': '0.25rem',
      '--radius-lg': '0.5rem',
      '--radius-xl': '1rem',
    },
  };

  const darkTheme: ThemeConfig = {
    id: 'dark',
    name: 'Dark',
    variables: {
      '--background': '240 10% 3.9%',
      '--foreground': '0 0% 98%',
      '--card': '240 10% 3.9%',
      '--card-foreground': '0 0% 98%',
      '--popover': '240 10% 3.9%',
      '--popover-foreground': '0 0% 98%',
      '--primary': '0 0% 98%',
      '--primary-foreground': '240 5.9% 10%',
      '--secondary': '240 3.7% 15.9%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '240 3.7% 15.9%',
      '--muted-foreground': '240 5% 64.9%',
      '--accent': '240 3.7% 15.9%',
      '--accent-foreground': '0 0% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '240 3.7% 15.9%',
      '--input': '240 3.7% 15.9%',
      '--ring': '240 4.9% 83.9%',
      '--error': '0 62.8% 30.6%',
      '--warning': '30 100% 50%',
      '--success': '142 71% 45%',
      '--info': '199 89% 48%',
      '--radius-sm': '0.125rem',
      '--radius-md': '0.25rem',
      '--radius-lg': '0.5rem',
      '--radius-xl': '1rem',
    },
  };

  return { themes: [defaultTheme, darkTheme], defaultId: 'default' };
}
// @cpt-end:cpt-frontx-algo-ui-libraries-choice-theme-propagation:p1:inst-theme-propagation-1

/**
 * Generate generic globals.css for unknown UI libraries.
 * Provides :root fallback CSS variables and base body styling
 * so the Studio panel renders correctly.
 */
// @cpt-begin:cpt-frontx-algo-ui-libraries-choice-theme-propagation:p1:inst-theme-propagation-5
export function generateGenericGlobalsCss(): string {
  const { themes } = generateGenericThemes();
  const defaultTheme = themes[0];
  const vars = defaultTheme.variables;

  const varLines = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `:root {
${varLines}
}

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, sans-serif;
}
`;
}
// @cpt-end:cpt-frontx-algo-ui-libraries-choice-theme-propagation:p1:inst-theme-propagation-5
