/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HAI3Provider, apiRegistry, createHAI3App, registerSlice, mockSlice, initMockEffects, type ThemeApplyFn } from '@hai3/react';
import { Toaster, applyTheme } from '@hai3/uikit';
import { AccountsApiService } from '@/app/api';
import '@hai3/uikit/styles'; // UI Kit styles
import '@/screensets/screensetRegistry'; // Auto-registers screensets (includes API services + mocks + i18n loaders)
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
const app = createHAI3App({
  themes: { applyFn: applyTheme as ThemeApplyFn },
});

// Register mock slice (app-level slice for centralized mock mode control)
registerSlice(mockSlice);

// Register app-level effects (pass store dispatch)
registerBootstrapEffects(app.store.dispatch);

// Initialize mock mode effects (manages ALL mock plugins across services)
initMockEffects();

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
 * 5. HAI3Provider includes AppRouter for URL-based navigation
 *
 * Note: Mock API is controlled via the HAI3 Studio panel.
 * The ApiModeToggle component dispatches mock mode events.
 * Mock effects handle ALL mock plugin lifecycle (global and instance-level).
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HAI3Provider app={app}>
      <App />
      <Toaster />
    </HAI3Provider>
  </StrictMode>
);
