/**
 * HAI3 Provider - Main provider component for HAI3 applications
 *
 * React Layer: L3 (Depends on @hai3/framework)
 *
 * QueryClient lifecycle is owned by the queryCache() framework plugin (L2).
 * HAI3Provider reads app.queryClient from context instead of creating its own.
 * For MFE roots that render in separate React trees, callers pass the same host-
 * owned QueryClient via the queryClient prop so all roots share one cache.
 */
// @cpt-flow:cpt-hai3-flow-react-bindings-bootstrap-provider:p1
// @cpt-algo:cpt-hai3-algo-react-bindings-resolve-app:p1
// @cpt-algo:cpt-hai3-algo-react-bindings-build-provider-tree:p1
// @cpt-dod:cpt-hai3-dod-react-bindings-provider:p1
// @cpt-dod:cpt-hai3-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import React, { useMemo, useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
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
 * // Default - creates app with full preset (includes queryCache plugin)
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
 * const app = createHAI3().use(queryCache()).use(screensets()).build();
 * <HAI3Provider app={app}>
 *   <App />
 * </HAI3Provider>
 *
 * // With MFE bridge (for MFE components)
 * <HAI3Provider mfeBridge={{ bridge, extensionId, domainId }}>
 *   <MyMfeApp />
 * </HAI3Provider>
 *
 * // With injected QueryClient (host + separate MFE roots share one cache)
 * <HAI3Provider app={app} queryClient={sharedQueryClient}>
 *   <MyMfeApp />
 * </HAI3Provider>
 * ```
 */
// @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-render-provider
// @cpt-begin:cpt-hai3-dod-react-bindings-provider:p1:inst-render-provider
// @cpt-begin:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-render-provider
export const HAI3Provider: React.FC<HAI3ProviderProps> = ({
  children,
  config,
  app: providedApp,
  mfeBridge,
  queryClient: providedQueryClient,
}) => {
  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-resolve-app
  // @cpt-begin:cpt-hai3-algo-react-bindings-resolve-app:p1:inst-use-provided-app
  // @cpt-begin:cpt-hai3-algo-react-bindings-resolve-app:p1:inst-create-app
  // @cpt-begin:cpt-hai3-algo-react-bindings-resolve-app:p1:inst-memoize-app
  // @cpt-begin:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-resolve-app-tree
  // Create or use provided app instance
  const app = useMemo<HAI3App>(() => {
    if (providedApp) {
      return providedApp;
    }

    return createHAI3App(config);
  }, [providedApp, config]);
  // @cpt-end:cpt-hai3-algo-react-bindings-resolve-app:p1:inst-use-provided-app
  // @cpt-end:cpt-hai3-algo-react-bindings-resolve-app:p1:inst-create-app
  // @cpt-end:cpt-hai3-algo-react-bindings-resolve-app:p1:inst-memoize-app
  // @cpt-end:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-resolve-app-tree
  // @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-resolve-app

  // @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-resolve-query-client
  // Priority: explicitly injected client (MFE root) > plugin-owned client (app.queryClient).
  // Callers must ensure one of these is present; if queryCache() plugin is not registered
  // and no client is injected, QueryClientProvider will throw at render time.
  const queryClient = providedQueryClient ?? app.queryClient;
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-resolve-query-client

  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-destroy-app
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only destroy if we created the app (not provided externally)
      if (!providedApp) {
        app.destroy();
      }
    };
  }, [app, providedApp]);
  // @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-destroy-app

  // @cpt-begin:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-wrap-hai3-context
  // @cpt-begin:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-wrap-redux
  // @cpt-begin:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-render-children-tree
  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-set-hai3-context
  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-set-redux-provider
  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-render-children
  // @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider
  // Provider order (outer to inner):
  //   HAI3Context -> ReduxProvider -> QueryClientProvider -> children
  // A host-owned QueryClient can be injected via the queryClient prop so separately
  // mounted MFE roots share one cache. MfeProvider does not create a QueryClient.
  const content = queryClient ? (
    <HAI3Context.Provider value={app}>
      <ReduxProvider store={app.store as Parameters<typeof ReduxProvider>[0]['store']}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ReduxProvider>
    </HAI3Context.Provider>
  ) : (
    // No QueryClient available (queryCache plugin not registered, none injected).
    // Render without QueryClientProvider — useApiQuery/useApiMutation will throw
    // if called, which surfaces the misconfiguration clearly.
    <HAI3Context.Provider value={app}>
      <ReduxProvider store={app.store as Parameters<typeof ReduxProvider>[0]['store']}>
        {children}
      </ReduxProvider>
    </HAI3Context.Provider>
  );
  // @cpt-end:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-wrap-hai3-context
  // @cpt-end:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-wrap-redux
  // @cpt-end:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-render-children-tree
  // @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-set-hai3-context
  // @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-set-redux-provider
  // @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-render-children
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider

  // @cpt-begin:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-wrap-mfe-conditional
  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p2:inst-wrap-mfe-provider
  // Wrap with MfeProvider if bridge is provided
  if (mfeBridge) {
    return (
      <MfeProvider value={mfeBridge}>
        {content}
      </MfeProvider>
    );
  }
  // @cpt-end:cpt-hai3-algo-react-bindings-build-provider-tree:p1:inst-wrap-mfe-conditional
  // @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p2:inst-wrap-mfe-provider

  return content;
};
// @cpt-end:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-render-provider
// @cpt-end:cpt-hai3-dod-react-bindings-provider:p1:inst-render-provider
// @cpt-end:cpt-hai3-dod-request-lifecycle-query-provider:p2:inst-render-provider
