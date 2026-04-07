import { HAI3_ACTION_MOUNT_EXT, type ActionsChain } from '@cyberfabric/screensets';
import type { ServerStateRuntime } from '../../serverState';
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2

export const MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL = Symbol.for('hai3:mfe-mount-runtime-context');

type MfeMountServerStateOwner = {
  serverState?: ServerStateRuntime;
};

type ExplicitServerStateEntry = {
  readonly runtime: ServerStateRuntime;
};

/**
 * App-scoped LIFO stacks of runtimes registered by HAI3Provider trees that pass
 * an explicit `serverState` prop. Each app resolves only its own innermost
 * registration so independent host apps mounted on the same page do not leak
 * server-state handoff into one another.
 */
const explicitMfeMountServerStateStacks = new WeakMap<
  MfeMountServerStateOwner,
  ExplicitServerStateEntry[]
>();

type MountRuntimeContextKey = string;

type MountRuntimeContextValue = {
  readonly serverState?: ServerStateRuntime;
};

type MountRuntimeContextStore = Map<MountRuntimeContextKey, MountRuntimeContextValue>;

type GlobalHost = typeof globalThis & {
  [MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL]?: MountRuntimeContextStore;
};

function getStore(): MountRuntimeContextStore {
  const host = globalThis as GlobalHost;
  host[MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL] ??= new Map();
  return host[MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL];
}

/**
 * Creates an opaque token for one `mount_ext` handoff. Prefer UUID when available.
 */
export function createMfeMountRuntimeToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `hai3-mrt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function setMfeMountRuntimeContext(
  mountRuntimeToken: string,
  value: MountRuntimeContextValue
): void {
  getStore().set(mountRuntimeToken, value);
}

export function clearMfeMountRuntimeContext(mountRuntimeToken: string): void {
  getStore().delete(mountRuntimeToken);
}

/**
 * Assigns a fresh token per `mount_ext` link under `chain` and stores serverState under that token.
 * Returns tokens to clear in `finally` after the chain runs.
 */
export function primeMfeMountRuntimeContextForChain(
  chain: ActionsChain,
  serverState: ServerStateRuntime
): string[] {
  const tokens: string[] = [];

  const visit = (link: ActionsChain): void => {
    const action = link.action;
    const domainId = action?.target;
    const extensionId =
      typeof action?.payload?.subject === 'string' ? action.payload.subject : undefined;

    if (action?.type === HAI3_ACTION_MOUNT_EXT && domainId && extensionId) {
      let token = link.mountRuntimeToken;
      if (token === undefined) {
        token = createMfeMountRuntimeToken();
        link.mountRuntimeToken = token;
      }
      if (!getStore().has(token)) {
        // Preserve already-forwarded handoffs so nested runtimes in the same JS
        // realm do not overwrite the parent runtime before React consumes it.
        // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-query-client
        setMfeMountRuntimeContext(token, { serverState });
        // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-query-client
        tokens.push(token);
      }
    }

    if (link.next) {
      visit(link.next);
    }
    if (link.fallback) {
      visit(link.fallback);
    }
  };

  visit(chain);
  return tokens;
}

/**
 * Register an externally injected server-state runtime for MFE mount handoff.
 * Call from HAI3Provider when the `serverState` prop is set; disposer runs on unmount.
 */
export function registerMfeMountExplicitServerState(
  app: MfeMountServerStateOwner,
  runtime: ServerStateRuntime
): () => void {
  const stack = explicitMfeMountServerStateStacks.get(app) ?? [];
  const entry: ExplicitServerStateEntry = { runtime };
  stack.push(entry);
  explicitMfeMountServerStateStacks.set(app, stack);

  return () => {
    const registeredStack = explicitMfeMountServerStateStacks.get(app);
    const entryIndex = registeredStack?.lastIndexOf(entry) ?? -1;
    if (entryIndex < 0) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[HAI3] registerMfeMountExplicitServerState cleanup missed its app-scoped registration entry.',
        );
      }
      return;
    }

    if (!registeredStack) {
      return;
    }

    registeredStack.splice(entryIndex, 1);
    if (registeredStack.length === 0) {
      explicitMfeMountServerStateStacks.delete(app);
    }
  };
}

/**
 * Runtime to stash for the next `mount_ext` handoff: explicit provider registration,
 * else plugin-owned `app.serverState` (queryCache).
 */
export function resolveMfeMountServerState(app: MfeMountServerStateOwner): ServerStateRuntime | undefined {
  const stack = explicitMfeMountServerStateStacks.get(app);
  const explicitRuntime = stack && stack.length > 0 ? stack[stack.length - 1]?.runtime : undefined;
  return explicitRuntime ?? app.serverState;
}
