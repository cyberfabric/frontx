/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HAI3Provider, apiRegistry, createHAI3App } from '@hai3/react';
import { AccountsApiService } from '@/app/api';
import '@/app/events/bootstrapEvents';
import { registerBootstrapEffects } from '@/app/effects/bootstrapEffects';
import App from './App';

apiRegistry.register(AccountsApiService);
apiRegistry.initialize({});

const app = createHAI3App({});

registerBootstrapEffects(app.store.dispatch);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HAI3Provider app={app}>
      <App />
    </HAI3Provider>
  </StrictMode>
);
