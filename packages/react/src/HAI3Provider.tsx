/**
 * FrontX Provider - Main provider component for FrontX applications
 *
 * React Layer: L3 (Depends on @cyberfabric/framework)
 *
 * Server-state lifecycle is owned by the queryCache() framework plugin (L2).
 * HAI3Provider reads app.serverState from context instead of creating its own.
 * For separate render trees, callers can pass the same host-owned serverState
 * runtime so every tree participates in the same cache runtime.
 */
// @cpt-flow:cpt-frontx-flow-react-bindings-bootstrap-provider:p1
// @cpt-algo:cpt-frontx-algo-react-bindings-resolve-app:p1
// @cpt-algo:cpt-frontx-algo-react-bindings-build-provider-tree:p1
// @cpt-dod:cpt-frontx-dod-react-bindings-provider:p1
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import React, { useMemo, useEffect, useLayoutEffect, useState } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import type { Store } from '@reduxjs/toolkit';
import {
  createHAI3,
  createHAI3App,
  effects,
  i18n,
  layout,
  microfrontends,
  mock,
  registerMfeMountExplicitServerState,
  screensets,
  themes,
} from '@cyberfabric/framework';
import type { HAI3App, ServerStateRuntime } from '@cyberfabric/framework';
import { HAI3Context } from './HAI3Context';
import { MfeProvider } from './mfe/MfeProvider';
import { ServerStateProvider } from './serverState';
import type { HAI3ProviderProps } from './types';

/**
 * Shallow-compare two plain objects by own-enumerable values (Object.is).
 * Prevents unnecessary app recreation when callers pass inline config literals
 * whose values haven't actually changed between renders.
 */
function shallowEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((k) => Object.is(a[k], b[k]));
}

type ProviderOwnedAppConfig = HAI3ProviderProps['config'] & {
  microfrontends?: Parameters<typeof microfrontends>[0];
};

function createProviderOwnedApp(
  config: ProviderOwnedAppConfig | undefined,
  providedServerState: ServerStateRuntime | undefined
): HAI3App {
  if (providedServerState === undefined) {
    return createHAI3App(config);
  }

  // When a host/runtime is injected, avoid booting a second queryCache() lifecycle.
  // Keep the mock plugin available so provider-owned roots still expose the same
  // actions/slice behavior as the default preset, but suppress its init-time
  // dev auto-toggle because that would eagerly clear the externally managed runtime.
  const builder = createHAI3(config)
    .use(effects())
    .use(screensets({ autoDiscover: true }))
    .use(themes())
    .use(layout())
    .use(i18n())
    .use(mock({ enabledByDefault: false }));

  if (config?.microfrontends) {
    builder.use(microfrontends(config.microfrontends));
  }

  const app = builder.build();
  app.serverState = providedServerState;
  return app;
}

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
 * const app = createFrontX().use(queryCache()).use(screensets()).build();
 * <FrontXProvider app={app}>
 *   <App />
 * </FrontXProvider>
 *
 * // With MFE bridge (for MFE components)
 * <FrontXProvider mfeBridge={{ bridge, extensionId, domainId }}>
 *   <MyMfeApp />
 * </FrontXProvider>
 *
 * // With injected server-state runtime (host + separate roots share one cache)
 * <FrontXProvider app={app} serverState={sharedServerState}>
 *   <MyMfeApp />
 * </FrontXProvider>
 * ```
 */
// @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-render-provider
// @cpt-begin:cpt-frontx-dod-react-bindings-provider:p1:inst-render-provider
// @cpt-begin:cpt-frontx-dod-request-lifecycle-query-provider:p2:inst-render-provider
export const HAI3Provider: React.FC<HAI3ProviderProps> = ({
  children,
  config,
  app: providedApp,
  mfeBridge,
  serverState: providedServerState,
}) => {
  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-resolve-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-use-provided-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-create-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-memoize-app
  // @cpt-begin:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-resolve-app-tree
  // Stabilize config by shallow value without mutating a ref during render.
  // When the incoming config shallow-differs, a render-phase setState triggers an
  // immediate re-render so useMemo sees the updated stable reference in the same
  // turn as a reference-changing (but value-equal) prop would be ignored.
  const [stableConfig, setStableConfig] = useState(config);
  if (
    !shallowEqual(
      stableConfig as Record<string, unknown> | undefined,
      config as Record<string, unknown> | undefined,
    )
  ) {
    setStableConfig(config);
  }

  const app = useMemo<HAI3App>(() => {
    if (providedApp) {
      return providedApp;
    }

    return createProviderOwnedApp(
      stableConfig as ProviderOwnedAppConfig | undefined,
      providedServerState,
    );
  }, [providedApp, providedServerState, stableConfig]);
  // @cpt-end:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-use-provided-app
  // @cpt-end:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-create-app
  // @cpt-end:cpt-frontx-algo-react-bindings-resolve-app:p1:inst-memoize-app
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-resolve-app-tree
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-resolve-app

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-resolve-query-client
  // Priority: explicitly injected runtime > plugin-owned runtime (app.serverState).
  // Memoized so descendants (e.g. ExtensionDomainSlot effects keyed on app) do not see spurious
  // reference churn when the provider re-renders with the same inputs.
  const serverState = useMemo(
    () => providedServerState ?? app.serverState,
    [providedServerState, app.serverState],
  );

  const contextApp = useMemo<HAI3App>(() => {
    if (serverState === app.serverState) {
      return app;
    }

    // Keep useHAI3().serverState aligned with the runtime injected into
    // ServerStateProvider without mutating a caller-owned app instance.
    return {
      ...app,
      serverState,
    };
  }, [app, serverState]);

  if (!serverState && process.env.NODE_ENV !== 'production') {
    console.warn(
      '[HAI3Provider] No server-state runtime available. Add queryCache() to your plugin composition ' +
      'or pass a serverState prop. useApiQuery/useApiMutation will fail without it.'
    );
  }
  // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-resolve-query-client

  // Register explicit serverState for this app's microfrontends() mount handoff.
  useLayoutEffect(() => {
    if (providedServerState === undefined) {
      return;
    }

    const disposeAppRegistration = registerMfeMountExplicitServerState(app, providedServerState);
    const disposeContextRegistration =
      contextApp === app
        ? undefined
        : registerMfeMountExplicitServerState(contextApp, providedServerState);

    return () => {
      disposeContextRegistration?.();
      disposeAppRegistration();
    };
  }, [app, contextApp, providedServerState]);

  // @cpt-begin:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-destroy-app
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only destroy if we created the app (not provided externally)
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
  // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider
  // Provider order (outer to inner):
  //   HAI3Context -> ReduxProvider -> ServerStateProvider -> children
  // A host-owned runtime can be injected via the serverState prop so separately
  // mounted roots share one cache. MfeProvider does not create server-state runtime.
  const content = (
    <HAI3Context.Provider value={contextApp}>
      <ReduxProvider store={contextApp.store as Store}>
        {/* app.store is FrontX-owned but Redux-compatible. Cast keeps react-redux happy. */}
        <ServerStateProvider runtime={serverState}>
          {children}
        </ServerStateProvider>
      </ReduxProvider>
    </HAI3Context.Provider>
  );
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-hai3-context
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-wrap-redux
  // @cpt-end:cpt-frontx-algo-react-bindings-build-provider-tree:p1:inst-render-children-tree
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-set-hai3-context
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-set-redux-provider
  // @cpt-end:cpt-frontx-flow-react-bindings-bootstrap-provider:p1:inst-render-children
  // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider

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
// @cpt-end:cpt-frontx-dod-request-lifecycle-query-provider:p2:inst-render-provider
