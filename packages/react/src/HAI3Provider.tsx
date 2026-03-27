/**
 * FrontX Provider - Main provider component for FrontX applications
 *
 * React Layer: L3 (Depends on @cyberfabric/framework)
 */
// @cpt-flow:cpt-frontx-flow-react-bindings-bootstrap-provider:p1
// @cpt-algo:cpt-frontx-algo-react-bindings-resolve-app:p1
// @cpt-algo:cpt-frontx-algo-react-bindings-build-provider-tree:p1
// @cpt-dod:cpt-frontx-dod-react-bindings-provider:p1

import React, { useMemo, useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { createHAI3App } from '@cyberfabric/framework';
import type { HAI3App } from '@cyberfabric/framework';
import { HAI3Context } from './HAI3Context';
import { MfeProvider } from './mfe/MfeProvider';
import type { HAI3ProviderProps } from './types';

/**
 * FrontX Provider Component
 *
 * Provides the FrontX application context to all child components.
 * Creates the FrontX app instance with the full preset by default.
 *
 * @example
 * ```tsx
 * // Default - creates app with full preset
 * <FrontXProvider>
 *   <App />
 * </FrontXProvider>
 *
 * // With configuration
 * <FrontXProvider config={{ devMode: true }}>
 *   <App />
 * </FrontXProvider>
 *
 * // With pre-built app
 * const app = createFrontX().use(screensets()).use(microfrontends()).build();
 * <FrontXProvider app={app}>
 *   <App />
 * </FrontXProvider>
 *
 * // With MFE bridge (for MFE components)
 * <FrontXProvider mfeBridge={{ bridge, extensionId, domainId }}>
 *   <MyMfeApp />
 * </FrontXProvider>
 * ```
 */
// @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-render-provider
// @cpt-begin:cpt-frontx-dod-react-bindings-provider:p1:inst-render-provider
export const HAI3Provider: React.FC<HAI3ProviderProps> = ({
  children,
  config,
  app: providedApp,
  mfeBridge,
}) => {
  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-resolve-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-use-provided-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-create-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-memoize-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-resolve-app-tree
  // Create or use provided app instance
  const app = useMemo<HAI3App>(() => {
    if (providedApp) {
      return providedApp;
    }

    return createHAI3App(config);
  }, [providedApp, config]);
  // @cpt-end:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-use-provided-app
  // @cpt-end:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-create-app
  // @cpt-end:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-memoize-app
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-resolve-app-tree
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-resolve-app

  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-destroy-app
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only destroy if we created the app (not provided)
      if (!providedApp) {
        app.destroy();
      }
    };
  }, [app, providedApp]);
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-destroy-app

  // @cpt-begin:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-hai3-context
  // @cpt-begin:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-redux
  // @cpt-begin:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-render-children-tree
  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-set-hai3-context
  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-set-redux-provider
  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-render-children
  // Render content
  const content = (
    <HAI3Context.Provider value={app}>
      <ReduxProvider store={app.store as Parameters<typeof ReduxProvider>[0]['store']}>
        {children}
      </ReduxProvider>
    </HAI3Context.Provider>
  );
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-hai3-context
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-redux
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-render-children-tree
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-set-hai3-context
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-set-redux-provider
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-render-children

  // @cpt-begin:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-mfe-conditional
  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p2:inst-wrap-mfe-provider
  // Wrap with MfeProvider if bridge is provided
  if (mfeBridge) {
    return (
      <MfeProvider value={mfeBridge}>
        {content}
      </MfeProvider>
    );
  }
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-mfe-conditional
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p2:inst-wrap-mfe-provider

  return content;
};
// @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-render-provider
// @cpt-end:cpt-frontx-dod-react-bindings-provider:p1:inst-render-provider
