/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { waitFor, cleanup } from '@testing-library/react';
import {
  type HAI3App,
  DEFAULT_SERVER_STATE_ADAPTER_ID,
  SERVER_STATE_BROADCAST_TARGET,
  SERVER_STATE_NATIVE_HANDLE,
  type ServerStateRuntime,
  clearMfeMountRuntimeContext,
  createMfeMountRuntimeToken,
  setMfeMountRuntimeContext,
} from '../../../framework/src';
import { consumeMfeMountRuntimeContext } from '../../src/mfe/mountRuntimeContext';
import { ThemeAwareReactLifecycle } from '../../src/mfe/ThemeAwareReactLifecycle';
import { useHAI3 } from '../../src';
import { QueryClient } from '@tanstack/react-query';

afterEach(() => {
  cleanup();
});

function createStoreStub() {
  return {
    dispatch: () => undefined,
    getState: () => ({}),
    subscribe: () => () => undefined,
  };
}

function createServerStateStub(adapterId: string): ServerStateRuntime {
  return {
    adapterId: DEFAULT_SERVER_STATE_ADAPTER_ID,
    cache: {
      get: () => undefined,
      getState: () => undefined,
      set: () => undefined,
      cancel: async () => undefined,
      cancelAll: async () => undefined,
      invalidate: async () => undefined,
      invalidateMany: async () => undefined,
      remove: () => undefined,
      clear: () => undefined,
    },
    [SERVER_STATE_BROADCAST_TARGET]: adapterId,
    [SERVER_STATE_NATIVE_HANDLE]: new QueryClient(),
  };
}

function RuntimeProbe({ onRender }: { onRender: (runtime: unknown) => void }) {
  const app = useHAI3();
  onRender(app.serverState);
  return null;
}

class TestLifecycle extends ThemeAwareReactLifecycle {
  constructor(
    app: HAI3App,
    private readonly onRender: (runtime: unknown) => void
  ) {
    super(app);
  }

  protected renderContent() {
    return React.createElement(RuntimeProbe, { onRender: this.onRender });
  }
}

describe('MFE mount runtime context side channel', () => {
  it('shares serverState between framework mount setup and react lifecycle lookup', () => {
    const token = createMfeMountRuntimeToken();
    const serverState = { adapterId: 'tanstack' };

    setMfeMountRuntimeContext(token, { serverState });

    expect(consumeMfeMountRuntimeContext(token)).toEqual({ serverState });
    expect(consumeMfeMountRuntimeContext(token)).toBeUndefined();

    clearMfeMountRuntimeContext(token);
  });

  it('keeps concurrent mount handoffs isolated by token', () => {
    const t1 = createMfeMountRuntimeToken();
    const t2 = createMfeMountRuntimeToken();
    const a = { adapterId: 'a' };
    const b = { adapterId: 'b' };
    setMfeMountRuntimeContext(t1, { serverState: a });
    setMfeMountRuntimeContext(t2, { serverState: b });

    expect(consumeMfeMountRuntimeContext(t1)?.serverState).toEqual(a);
    expect(consumeMfeMountRuntimeContext(t2)?.serverState).toEqual(b);

    clearMfeMountRuntimeContext(t1);
    clearMfeMountRuntimeContext(t2);
  });

  it('keeps the handoff runtime available through the first React commit even if the host clears immediately', async () => {
    const token = createMfeMountRuntimeToken();
    const hostServerState = createServerStateStub('host-runtime');
    const fallbackServerState = createServerStateStub('fallback-runtime');
    setMfeMountRuntimeContext(token, { serverState: hostServerState });

    let observedRuntime: unknown;
    const lifecycle = new TestLifecycle(
      {
        store: createStoreStub(),
        serverState: fallbackServerState,
      } as HAI3App,
      (runtime) => {
        observedRuntime = runtime;
      }
    );

    const container = document.createElement('div');
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
        mountRuntimeToken: token,
      }
    );

    clearMfeMountRuntimeContext(token);

    await waitFor(() => {
      expect(observedRuntime).toBe(hostServerState);
    });

    lifecycle.unmount(container);
  });
});
