import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { EndpointDescriptor, ServerStateRuntime } from '@cyberfabric/framework';
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2
import { createQueryCache, type MutationCallbackContext } from '../hooks/QueryCache';
import type { ApiQueryOverrides } from '../hooks/useApiQuery';
import type {
  ApiInfiniteQueryOptions,
} from '../hooks/useApiInfiniteQuery';
import type { UseApiMutationOptions } from '../hooks/useApiMutation';
import type { ServerStateReactAdapter } from './types';
import { getServerStateReactAdapter } from './registry';
import './tanstackAdapter';

const ServerStateRuntimeContext = createContext<ServerStateRuntime | undefined>(undefined);

function useRequiredRuntime(): ServerStateRuntime {
  const runtime = useContext(ServerStateRuntimeContext);
  if (!runtime) {
    throw new Error(
      '[HAI3Provider] No server-state runtime available. Add queryCache() to your plugin composition or pass a serverState prop.'
    );
  }
  return runtime;
}

function getRequiredAdapter(runtime: ServerStateRuntime): ServerStateReactAdapter {
  const adapter = getServerStateReactAdapter(runtime.adapterId);
  if (!adapter) {
    throw new Error(
      `[HAI3Provider] Unsupported server-state adapter "${runtime.adapterId}".`
    );
  }
  return adapter;
}

export function ServerStateProvider({
  runtime,
  children,
}: {
  runtime?: ServerStateRuntime;
  children: ReactNode;
}) {
  if (!runtime) {
    return <>{children}</>;
  }

  const adapter = getRequiredAdapter(runtime);

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider
  return (
    <ServerStateRuntimeContext.Provider value={runtime}>
      <adapter.Provider runtime={runtime}>{children}</adapter.Provider>
    </ServerStateRuntimeContext.Provider>
  );
  // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider
}

export function useServerStateRuntime(): ServerStateRuntime | undefined {
  return useContext(ServerStateRuntimeContext);
}

export function useServerStateQuery<TData = unknown, TError = Error>(
  descriptor: EndpointDescriptor<TData>,
  overrides?: ApiQueryOverrides
) {
  const runtime = useRequiredRuntime();
  return getRequiredAdapter(runtime).useQuery<TData, TError>(runtime, descriptor, overrides);
}

export function useServerStateSuspenseQuery<TData = unknown, TError = Error>(
  descriptor: EndpointDescriptor<TData>,
  overrides?: ApiQueryOverrides
) {
  const runtime = useRequiredRuntime();
  return getRequiredAdapter(runtime).useSuspenseQuery<TData, TError>(
    runtime,
    descriptor,
    overrides
  );
}

export function useServerStateInfiniteQuery<TPage = unknown, TError = Error>(
  options: ApiInfiniteQueryOptions<TPage>
) {
  const runtime = useRequiredRuntime();
  return getRequiredAdapter(runtime).useInfiniteQuery<TPage, TError>(runtime, options);
}

export function useServerStateSuspenseInfiniteQuery<TPage = unknown, TError = Error>(
  options: ApiInfiniteQueryOptions<TPage>
) {
  const runtime = useRequiredRuntime();
  return getRequiredAdapter(runtime).useSuspenseInfiniteQuery<TPage, TError>(
    runtime,
    options
  );
}

export function useServerStateMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseApiMutationOptions<TData, TError, TVariables, TContext>
){
  const runtime = useRequiredRuntime();
  const queryCache = useMemo(() => createQueryCache(runtime), [runtime]);
  const callbackCtx: MutationCallbackContext = useMemo(() => ({ queryCache }), [queryCache]);
  return getRequiredAdapter(runtime).useMutation<TData, TError, TVariables, TContext>(
    runtime,
    options,
    callbackCtx
  );
}
