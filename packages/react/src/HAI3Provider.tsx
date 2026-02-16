/**
 * HAI3 Provider - Main provider component for HAI3 applications
 *
 * React Layer: L3 (Depends on @hai3/framework)
 */

import React, { useMemo, useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { createHAI3App } from '@hai3/framework';
import type { HAI3App } from '@hai3/framework';
import { HAI3Context } from './HAI3Context';
import { MfeProvider } from './mfe/MfeProvider';
import type { HAI3ProviderProps } from './types';

/**
 * HAI3 Provider Component
 *
 * Provides the HAI3 application context to all child components.
 * Creates the HAI3 app instance with the full preset by default.
 *
 * @example
 * ```tsx
 * // Default - creates app with full preset
 * <HAI3Provider>
 *   <App />
 * </HAI3Provider>
 *
 * // With configuration
 * <HAI3Provider config={{ devMode: true }}>
 *   <App />
 * </HAI3Provider>
 *
 * // With pre-built app
 * const app = createHAI3().use(screensets()).use(microfrontends()).build();
 * <HAI3Provider app={app}>
 *   <App />
 * </HAI3Provider>
 *
 * // With MFE bridge (for MFE components)
 * <HAI3Provider mfeBridge={{ bridge, extensionId, domainId }}>
 *   <MyMfeApp />
 * </HAI3Provider>
 * ```
 */
export const HAI3Provider: React.FC<HAI3ProviderProps> = ({
  children,
  config,
  app: providedApp,
  mfeBridge,
}) => {
  // Create or use provided app instance
  const app = useMemo<HAI3App>(() => {
    if (providedApp) {
      return providedApp;
    }

    return createHAI3App(config);
  }, [providedApp, config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only destroy if we created the app (not provided)
      if (!providedApp) {
        app.destroy();
      }
    };
  }, [app, providedApp]);

  // Render content
  const content = (
    <HAI3Context.Provider value={app}>
      <ReduxProvider store={app.store as Parameters<typeof ReduxProvider>[0]['store']}>
        {children}
      </ReduxProvider>
    </HAI3Context.Provider>
  );

  // Wrap with MfeProvider if bridge is provided
  if (mfeBridge) {
    return (
      <MfeProvider value={mfeBridge}>
        {content}
      </MfeProvider>
    );
  }

  return content;
};
