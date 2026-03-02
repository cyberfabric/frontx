/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HAI3Provider, apiRegistry, createHAI3App, type ThemeApplyFn } from '@hai3/react';
import { Toaster, applyTheme } from '@hai3/uikit';
import { AccountsApiService } from '@/app/api';
import '@hai3/uikit/styles';
import '@/app/events/bootstrapEvents';
import { registerBootstrapEffects } from '@/app/effects/bootstrapEffects';
import App from './App';

import { DEFAULT_THEME_ID, defaultTheme } from '@/app/themes/default';
import { DARK_THEME_ID, darkTheme } from '@/app/themes/dark';
import { LIGHT_THEME_ID, lightTheme } from '@/app/themes/light';
import { DRACULA_THEME_ID, draculaTheme } from '@/app/themes/dracula';
import { DRACULA_LARGE_THEME_ID, draculaLargeTheme } from '@/app/themes/dracula-large';

apiRegistry.register(AccountsApiService);
apiRegistry.initialize({});

const app = createHAI3App({
  themes: { applyFn: applyTheme as ThemeApplyFn },
});

registerBootstrapEffects(app.store.dispatch);

app.themeRegistry.register(DEFAULT_THEME_ID, defaultTheme);
app.themeRegistry.register(LIGHT_THEME_ID, lightTheme);
app.themeRegistry.register(DARK_THEME_ID, darkTheme);
app.themeRegistry.register(DRACULA_THEME_ID, draculaTheme);
app.themeRegistry.register(DRACULA_LARGE_THEME_ID, draculaLargeTheme);

app.themeRegistry.apply(DEFAULT_THEME_ID);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HAI3Provider app={app}>
      <App />
      <Toaster />
    </HAI3Provider>
  </StrictMode>
);
