import { describe, expect, it } from 'vitest';
import {
  clearMfeMountRuntimeContext,
  createMfeMountRuntimeToken,
  MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL,
  primeMfeMountRuntimeContextForChain,
  registerMfeMountExplicitServerState,
  resolveMfeMountServerState,
  setMfeMountRuntimeContext,
} from '../../../src/plugins/microfrontends/mountRuntimeContext';
import { HAI3_ACTION_MOUNT_EXT, type ActionsChain } from '@cyberfabric/screensets';

describe('MFE mount serverState handoff resolution', () => {
  it('prefers explicit HAI3Provider registration over app.serverState', () => {
    const pluginRuntime = { adapterId: 'plugin' };
    const app = { serverState: pluginRuntime as never };
    const injected = { adapterId: 'injected' };
    const dispose = registerMfeMountExplicitServerState(app, injected as never);
    expect(resolveMfeMountServerState(app)).toBe(injected);
    dispose();
    expect(resolveMfeMountServerState(app)).toBe(pluginRuntime);
  });

  it('nested explicit providers unregister in LIFO order', () => {
    const app = {};
    const outer = { adapterId: 'outer' };
    const inner = { adapterId: 'inner' };
    const d1 = registerMfeMountExplicitServerState(app, outer as never);
    const d2 = registerMfeMountExplicitServerState(app, inner as never);
    expect(resolveMfeMountServerState(app)).toBe(inner);
    d2();
    expect(resolveMfeMountServerState(app)).toBe(outer);
    d1();
    expect(resolveMfeMountServerState(app)).toBeUndefined();
  });

  it('keeps explicit server-state registrations scoped to each app', () => {
    const appA = { serverState: { adapterId: 'plugin-a' } as never };
    const appB = { serverState: { adapterId: 'plugin-b' } as never };
    const runtimeA = { adapterId: 'runtime-a' };
    const runtimeB = { adapterId: 'runtime-b' };
    const disposeA = registerMfeMountExplicitServerState(appA, runtimeA as never);
    const disposeB = registerMfeMountExplicitServerState(appB, runtimeB as never);

    expect(resolveMfeMountServerState(appA)).toBe(runtimeA);
    expect(resolveMfeMountServerState(appB)).toBe(runtimeB);

    disposeB();
    expect(resolveMfeMountServerState(appA)).toBe(runtimeA);
    expect(resolveMfeMountServerState(appB)).toBe(appB.serverState);

    disposeA();
  });

  it('removes only the disposed registration for the same app', () => {
    const app = {};
    const first = { adapterId: 'first' };
    const second = { adapterId: 'second' };
    const d1 = registerMfeMountExplicitServerState(app, first as never);
    const d2 = registerMfeMountExplicitServerState(app, second as never);

    d1();
    expect(resolveMfeMountServerState(app)).toBe(second);

    d2();
    expect(resolveMfeMountServerState(app)).toBeUndefined();
  });

  it('treats repeated cleanup for a missing registration as a no-op', () => {
    const app = {};
    const first = { adapterId: 'first' };
    const second = { adapterId: 'second' };
    const d1 = registerMfeMountExplicitServerState(app, first as never);
    const d2 = registerMfeMountExplicitServerState(app, second as never);

    d1();
    d1();
    expect(resolveMfeMountServerState(app)).toBe(second);

    d2();
    expect(resolveMfeMountServerState(app)).toBeUndefined();
  });

  it('preserves an already-forwarded mount token for nested runtime handoff', () => {
    const token = createMfeMountRuntimeToken();
    const parentRuntime = { adapterId: 'parent-runtime' };
    const childRuntime = { adapterId: 'child-runtime' };
    const chain: ActionsChain = {
      action: {
        type: HAI3_ACTION_MOUNT_EXT,
        target: 'gts.hai3.mfes.ext.domain.v1~child.domain.v1',
        payload: { subject: 'gts.hai3.mfes.ext.extension.v1~child.extension.v1' },
      },
      mountRuntimeToken: token,
    };

    setMfeMountRuntimeContext(token, { serverState: parentRuntime as never });

    const ownedTokens = primeMfeMountRuntimeContextForChain(
      chain,
      childRuntime as never
    );
    const store = (
      globalThis as typeof globalThis & {
        [MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL]?: Map<
          string,
          { readonly serverState?: { adapterId: string } }
        >;
      }
    )[MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL];

    expect(ownedTokens).toEqual([]);
    expect(chain.mountRuntimeToken).toBe(token);
    expect(store?.get(token)).toEqual({ serverState: parentRuntime });

    clearMfeMountRuntimeContext(token);
  });
});
