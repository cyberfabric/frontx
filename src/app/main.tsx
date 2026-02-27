/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HAI3Provider, apiRegistry, createHAI3App, type ThemeApplyFn, MfeHandlerMF, gtsPlugin } from '@hai3/react';
import { Toaster, applyTheme } from '@hai3/uikit';
import { AccountsApiService } from '@/app/api';
import '@hai3/uikit/styles'; // UI Kit styles
import '@/app/events/bootstrapEvents'; // Register app-level events (type augmentation)
import { registerBootstrapEffects } from '@/app/effects/bootstrapEffects'; // Register app-level effects
import App from './App';

// Import all themes
import { DEFAULT_THEME_ID, defaultTheme } from '@/app/themes/default';
import { DARK_THEME_ID, darkTheme } from '@/app/themes/dark';
import { LIGHT_THEME_ID, lightTheme } from '@/app/themes/light';
import { DRACULA_THEME_ID, draculaTheme } from '@/app/themes/dracula';
import { DRACULA_LARGE_THEME_ID, draculaLargeTheme } from '@/app/themes/dracula-large';

// Register accounts service (application-level service for user info)
apiRegistry.register(AccountsApiService);

// Initialize API services
apiRegistry.initialize({});

// Create HAI3 app instance with theme apply function (constructor injection)
// Register MfeHandlerMF to enable Module Federation MFE loading
const app = createHAI3App({
  themes: { applyFn: applyTheme as ThemeApplyFn },
  microfrontends: {
    mfeHandlers: [new MfeHandlerMF(gtsPlugin)],
    // Pre-populate the Module Federation share scope with the host's already-loaded
    // bundles so that the first MFE benefits from sharing immediately.
    hostSharedDependencies: [
      { name: 'react', version: '19.0.0', get: () => import('react').then((m) => () => m) },
      { name: 'react-dom', version: '19.0.0', get: () => import('react-dom').then((m) => () => m) },
      { name: 'tailwindcss', version: '3.4.1', get: () => import('tailwindcss').then((m) => () => m) },
      { name: '@hai3/uikit', version: '0.1.0', get: () => import('@hai3/uikit').then((m) => () => m) },
      { name: '@hai3/react', version: '0.1.0', get: () => import('@hai3/react').then((m) => () => m) },
      { name: '@hai3/framework', version: '0.1.0', get: () => import('@hai3/framework').then((m) => () => m) },
      { name: '@hai3/state', version: '0.1.0', get: () => import('@hai3/state').then((m) => () => m) },
      { name: '@hai3/screensets', version: '0.1.0', get: () => import('@hai3/screensets').then((m) => () => m) },
      { name: '@hai3/api', version: '0.1.0', get: () => import('@hai3/api').then((m) => () => m) },
      { name: '@hai3/i18n', version: '0.1.0', get: () => import('@hai3/i18n').then((m) => () => m) },
      { name: '@reduxjs/toolkit', version: '2.0.0', get: () => import('@reduxjs/toolkit').then((m) => () => m) },
      { name: 'react-redux', version: '9.0.0', get: () => import('react-redux').then((m) => () => m) },
    ],
  },
});

// Register app-level effects (pass store dispatch)
registerBootstrapEffects(app.store.dispatch);

// Register all themes (default theme first, becomes the default selection)
app.themeRegistry.register(DEFAULT_THEME_ID, defaultTheme);
app.themeRegistry.register(LIGHT_THEME_ID, lightTheme);
app.themeRegistry.register(DARK_THEME_ID, darkTheme);
app.themeRegistry.register(DRACULA_THEME_ID, draculaTheme);
app.themeRegistry.register(DRACULA_LARGE_THEME_ID, draculaLargeTheme);

// Apply default theme
app.themeRegistry.apply(DEFAULT_THEME_ID);

/**
 * Render application
 * Bootstrap happens automatically when Layout mounts
 *
 * Flow:
 * 1. App renders → Layout mounts → bootstrap dispatched
 * 2. Components show skeleton loaders (translationsReady = false)
 * 3. User fetched → language set → translations loaded
 * 4. Components re-render with actual text (translationsReady = true)
 * 5. MFE system loads and mounts extensions via MfeScreenContainer
 *
 * Note: Mock API is controlled via the HAI3 Studio panel.
 * The mock plugin (included in full preset) handles mock plugin lifecycle automatically.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HAI3Provider app={app}>
      <App />
      <Toaster />
    </HAI3Provider>
  </StrictMode>
);
