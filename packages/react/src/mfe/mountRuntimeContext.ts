import {
  MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL,
  type ServerStateRuntime,
} from '@cyberfabric/framework';
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2

type MountRuntimeContextKey = string;

type MountRuntimeContextValue = {
  readonly serverState?: ServerStateRuntime;
};

type MountRuntimeContextStore = Map<MountRuntimeContextKey, MountRuntimeContextValue>;

type GlobalHost = typeof globalThis & {
  [MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL]?: MountRuntimeContextStore;
};

function peekStore(): MountRuntimeContextStore | undefined {
  return (globalThis as GlobalHost)[MFE_MOUNT_RUNTIME_CONTEXT_SYMBOL];
}

export function peekMfeMountRuntimeContext(
  mountRuntimeToken: string
): MountRuntimeContextValue | undefined {
  return peekStore()?.get(mountRuntimeToken);
}

export function consumeMfeMountRuntimeContext(
  mountRuntimeToken: string
): MountRuntimeContextValue | undefined {
  const store = peekStore();
  if (!store) {
    return undefined;
  }

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-query-client
  const value = store.get(mountRuntimeToken);
  store.delete(mountRuntimeToken);
  return value;
  // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-mfe-query-client
}
