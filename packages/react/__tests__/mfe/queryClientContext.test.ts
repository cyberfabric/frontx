/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { act, waitFor, cleanup } from '@testing-library/react';
import {
  createHAI3,
  type EndpointDescriptor,
  type HAI3App,
  queryCache,
  queryCacheShared,
} from '@cyberfabric/framework';
import { resetSharedQueryClient } from '@cyberfabric/framework/testing';
import { ThemeAwareReactLifecycle } from '../../src/mfe/ThemeAwareReactLifecycle';
import { useApiQuery, useQueryCache } from '../../src';
import { bootstrapHAI3QueryClient, useOptionalHAI3QueryClient } from '../../src/queryClient';
import { QueryClient } from '@tanstack/react-query';

const APP_QUERY_CLIENT_SYMBOL = Symbol.for('hai3:query-cache:app-client');
const SHARED_QUERY_CLIENT_SYMBOL = Symbol.for('hai3:query-cache:shared-client');

type HiddenQueryClientApp = HAI3App & {
  [APP_QUERY_CLIENT_SYMBOL]?: QueryClient;
};

type SharedQueryClientHost = typeof globalThis & {
  [SHARED_QUERY_CLIENT_SYMBOL]?: QueryClient;
};

afterEach(() => {
  cleanup();
  resetSharedQueryClient();
});

function createStoreStub() {
  return {
    dispatch: () => undefined,
    getState: () => ({}),
    subscribe: () => () => undefined,
  };
}

/** Minimal test double: ThemeAwareReactLifecycle only needs `store` + app-owned QueryClient here. */
function createMinimalHai3App(queryClient?: QueryClient): HAI3App {
  const app = {
    store: createStoreStub(),
  } as unknown as HiddenQueryClientApp;
  if (queryClient) {
    app[APP_QUERY_CLIENT_SYMBOL] = queryClient;
  }
  return app;
}

function QueryCacheProbe({ onRender }: { onRender: (value: unknown) => void }) {
  const queryCache = useQueryCache();
  onRender(queryCache.get(['probe']));
  return null;
}

function OptionalQueryClientProbe({ onRender }: { onRender: (value: unknown) => void }) {
  const queryClient = useOptionalHAI3QueryClient();
  onRender(queryClient?.getQueryData(['probe']));
  return null;
}

const LATE_JOIN_API_QUERY_DESCRIPTOR: EndpointDescriptor<string> = {
  key: ['mfe-late-join-useApiQuery'],
  staleTime: 0,
  gcTime: 0,
  fetch: () => Promise.resolve('late-join-data'),
};

function ApiQueryLateJoinProbe({
  onRender,
}: {
  onRender: (r: { data: unknown; isLoading: boolean }) => void;
}) {
  const result = useApiQuery(LATE_JOIN_API_QUERY_DESCRIPTOR);
  onRender({ data: result.data, isLoading: result.isLoading });
  return null;
}

class TestLifecycle extends ThemeAwareReactLifecycle {
  constructor(
    app: HAI3App,
    private readonly onRender: (value: unknown) => void
  ) {
    super(app);
  }

  protected renderContent() {
    return React.createElement(QueryCacheProbe, { onRender: this.onRender });
  }
}

class OptionalQueryClientLifecycle extends ThemeAwareReactLifecycle {
  constructor(
    app: HAI3App,
    private readonly onRender: (value: unknown) => void
  ) {
    super(app);
  }

  protected renderContent() {
    return React.createElement(OptionalQueryClientProbe, { onRender: this.onRender });
  }
}

class ApiQueryLateJoinLifecycle extends ThemeAwareReactLifecycle {
  constructor(
    app: HAI3App,
    private readonly onRender: (r: { data: unknown; isLoading: boolean }) => void
  ) {
    super(app);
  }

  protected renderContent() {
    return React.createElement(ApiQueryLateJoinProbe, { onRender: this.onRender });
  }
}

describe('MFE shared QueryClient join', () => {
  it('resolves the shared QueryClient at mount when the child app built before the host', async () => {
    const childApp = createHAI3().use(queryCacheShared()).build();
    const hostApp = createHAI3().use(queryCache()).build() as HiddenQueryClientApp;
    const hostClient = hostApp[APP_QUERY_CLIENT_SYMBOL];
    if (!hostClient) {
      throw new Error('expected host query client');
    }
    hostClient.setQueryData(['probe'], 'shared-query-client');

    let observedValue: unknown;
    const lifecycle = new TestLifecycle(childApp, (value) => {
      observedValue = value;
    });

    const container = document.createElement('div');
    await act(async () => {
      lifecycle.mount(
        container,
        {
          executeActionsChain: async () => undefined,
          getProperty: () => undefined,
          subscribeToProperty: () => () => undefined,
          domainId: 'screen',
          instanceId: 'bridge',
        } as never,
        {
          domainId: 'screen',
          extensionId: 'ext',
        }
      );
    });

    await waitFor(() => {
      expect(observedValue).toBe('shared-query-client');
    });

    act(() => {
      lifecycle.unmount(container);
      childApp.destroy();
      hostApp.destroy();
    });
  });

  it('keeps the joined QueryClient readable after immediate host app teardown following mount', async () => {
    const hostApp = createHAI3().use(queryCache()).build() as HiddenQueryClientApp;
    const hostClient = hostApp[APP_QUERY_CLIENT_SYMBOL];
    if (!hostClient) {
      throw new Error('expected host query client');
    }
    hostClient.setQueryData(['probe'], 'shared-query-client');

    const childApp = createHAI3().use(queryCacheShared()).build();

    let observedValue: unknown;
    const lifecycle = new TestLifecycle(childApp, (value) => {
      observedValue = value;
    });

    const container = document.createElement('div');
    await act(async () => {
      lifecycle.mount(
        container,
        {
          executeActionsChain: async () => undefined,
          getProperty: () => undefined,
          subscribeToProperty: () => () => undefined,
          domainId: 'screen',
          instanceId: 'bridge',
        } as never,
        {
          domainId: 'screen',
          extensionId: 'ext',
        }
      );
    });

    act(() => {
      hostApp.destroy();
    });

    await waitFor(() => {
      expect(observedValue).toBe('shared-query-client');
    });

    act(() => {
      lifecycle.unmount(container);
      childApp.destroy();
    });
  });

  it('reads the app QueryClient through the first React commit', async () => {
    const sharedClient = new QueryClient();
    sharedClient.setQueryData(['probe'], 'shared-query-client');

    let observedValue: unknown;
    const lifecycle = new TestLifecycle(
      createMinimalHai3App(sharedClient),
      (value) => {
        observedValue = value;
      }
    );

    const container = document.createElement('div');
    await act(async () => {
      lifecycle.mount(
        container,
        {
          executeActionsChain: async () => undefined,
          getProperty: () => undefined,
          subscribeToProperty: () => () => undefined,
          domainId: 'screen',
          instanceId: 'bridge',
        } as never,
        {
          domainId: 'screen',
          extensionId: 'ext',
        }
      );
    });

    await waitFor(() => {
      expect(observedValue).toBe('shared-query-client');
    });

    act(() => {
      lifecycle.unmount(container);
    });
  });

  it('does not activate queryCacheShared() from render bootstrap', async () => {
    const childApp = createHAI3().use(queryCacheShared()).build() as HiddenQueryClientApp;
    const hostApp = createHAI3().use(queryCache()).build();

    expect(bootstrapHAI3QueryClient(childApp)).toBeUndefined();
    expect(childApp[APP_QUERY_CLIENT_SYMBOL]).toBeUndefined();

    act(() => {
      hostApp.destroy();
    });

    await waitFor(() => {
      expect((globalThis as SharedQueryClientHost)[SHARED_QUERY_CLIENT_SYMBOL]).toBeUndefined();
    });

    childApp.destroy();
  });

  it('useApiQuery resolves after the host runtime appears when the MFE mounted first', async () => {
    const childApp = createHAI3().use(queryCacheShared()).build();

    let last: { data: unknown; isLoading: boolean } | undefined;
    const lifecycle = new ApiQueryLateJoinLifecycle(childApp, (r) => {
      last = r;
    });

    const container = document.createElement('div');
    await act(async () => {
      lifecycle.mount(
        container,
        {
          executeActionsChain: async () => undefined,
          getProperty: () => undefined,
          subscribeToProperty: () => () => undefined,
          domainId: 'screen',
          instanceId: 'bridge',
        } as never,
        {
          domainId: 'screen',
          extensionId: 'ext',
        }
      );
    });

    expect(last).toBeUndefined();

    const hostApp = createHAI3().use(queryCache()).build() as HiddenQueryClientApp;

    await waitFor(() => {
      expect(last?.data).toBe('late-join-data');
      expect(last?.isLoading).toBe(false);
    });

    act(() => {
      lifecycle.unmount(container);
      childApp.destroy();
      hostApp.destroy();
    });
  });

  it('waits for the host runtime when it appears after the mounted MFE renders', async () => {
    const childApp = createHAI3().use(queryCacheShared()).build();

    let observedValue: unknown = 'initial';
    const lifecycle = new OptionalQueryClientLifecycle(childApp, (value) => {
      observedValue = value;
    });

    const container = document.createElement('div');
    await act(async () => {
      lifecycle.mount(
        container,
        {
          executeActionsChain: async () => undefined,
          getProperty: () => undefined,
          subscribeToProperty: () => () => undefined,
          domainId: 'screen',
          instanceId: 'bridge',
        } as never,
        {
          domainId: 'screen',
          extensionId: 'ext',
        }
      );
    });

    // HAI3Provider defers the subtree until the shared client joins, so the probe
    // does not mount (and does not observe undefined) until the host exists.
    expect(observedValue).toBe('initial');

    const hostApp = createHAI3().use(queryCache()).build() as HiddenQueryClientApp;
    const hostClient = hostApp[APP_QUERY_CLIENT_SYMBOL];
    if (!hostClient) {
      throw new Error('expected host query client');
    }
    hostClient.setQueryData(['probe'], 'shared-query-client');

    await waitFor(() => {
      expect(observedValue).toBe('shared-query-client');
    });

    act(() => {
      lifecycle.unmount(container);
      childApp.destroy();
      hostApp.destroy();
    });
  });

  it('fails explicitly when a mounted MFE app has no shared QueryClient', async () => {
    const lifecycle = new TestLifecycle(createMinimalHai3App(), () => undefined);
    const container = document.createElement('div');

    expect(() => {
      act(() => {
        lifecycle.mount(
          container,
          {
            executeActionsChain: async () => undefined,
            getProperty: () => undefined,
            subscribeToProperty: () => () => undefined,
            domainId: 'screen',
            instanceId: 'bridge',
          } as never,
          {
            domainId: 'screen',
            extensionId: 'ext',
          }
        );
      });
    }).toThrow(
      '[HAI3Provider] Mounted MFEs require queryCacheShared() in the child app and queryCache() in the host app before loading the MFE app.'
    );
  });
});
