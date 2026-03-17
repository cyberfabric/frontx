/**
 * HAI3 Provider - Main provider component for HAI3 applications
 *
 * React Layer: L3 (Depends on @hai3/framework)
 */
// @cpt-flow:cpt-hai3-flow-react-bindings-bootstrap-provider:p1
// @cpt-algo:cpt-hai3-algo-react-bindings-resolve-app:p1
// @cpt-algo:cpt-hai3-algo-react-bindings-build-provider-tree:p1
// @cpt-dod:cpt-hai3-dod-react-bindings-provider:p1
// @cpt-dod:cpt-hai3-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-algo:cpt-hai3-algo-request-lifecycle-query-client-defaults:p2

import React, { useMemo, useEffect, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHAI3App } from '@hai3/framework';
import type { HAI3App } from '@hai3/framework';
import { HAI3Context } from './HAI3Context';
import { MfeProvider } from './mfe/MfeProvider';
import type { HAI3ProviderProps } from './types';

// @cpt-begin:cpt-hai3-algo-request-lifecycle-query-client-defaults:p2:inst-build-defaults
/**
 * Builds a QueryClient with HAI3 defaults merged with optional caller overrides.
 *
 * retry: 0 because HAI3's RestProtocol plugin chain handles retry internally.
 * Enabling TanStack retry on top would cause double retries for every failed request.
 */
function buildQueryClient(config?: ConstructorParameters<typeof QueryClient>[0]): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      ...config?.defaultOptions,
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        retry: 0,
        refetchOnWindowFocus: true,
        ...config?.defaultOptions?.queries,
      },
    },
  });
}
// @cpt-end:cpt-hai3-algo-request-lifecycle-query-client-defaults:p2:inst-build-defaults

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
  queryClientConfig,
}) => {
  // @cpt-begin:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client
  // If a host passes a QueryClient explicitly, reuse it so multiple React roots
  // can participate in the same cache. Otherwise create one local client for
  // this provider mount.
  const [ownedQueryClient] = useState<QueryClient | null>(() =>
    providedQueryClient ? null : buildQueryClient(queryClientConfig)
  );
  const queryClient = providedQueryClient ?? ownedQueryClient!;
  // @cpt-end:cpt-hai3-flow-request-lifecycle-query-client-lifecycle:p2:inst-create-query-client

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

  // @cpt-begin:cpt-hai3-flow-react-bindings-bootstrap-provider:p1:inst-destroy-app
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only clear the QueryClient if this provider created it locally.
      if (ownedQueryClient) {
        ownedQueryClient.clear();
      }

      // Only destroy if we created the app (not provided)
      if (!providedApp) {
        app.destroy();
      }
    };
  }, [app, ownedQueryClient, providedApp]);
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
  // A host-owned QueryClient can be injected here so separately mounted MFE
  // roots share one cache. MfeProvider itself does not create a QueryClient.
  const content = (
    <HAI3Context.Provider value={app}>
      <ReduxProvider store={app.store as Parameters<typeof ReduxProvider>[0]['store']}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
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
