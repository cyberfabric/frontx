/**
 * useApiMutation - Declarative mutation hook with restricted QueryCache injection
 *
 * Accepts { endpoint: MutationDescriptor, callbacks } and returns a HAI3-owned
 * ApiMutationResult. Supports optimistic updates, rollback, and cache invalidation
 * through the QueryCache interface injected into each callback.
 *
 * Optimistic update pattern:
 *   onMutate  -> cancel outgoing refetches, snapshot via queryCache.get,
 *                apply optimistic data via queryCache.set, return snapshot
 *   onError   -> restore snapshot via queryCache.set(key, context.snapshot)
 *   onSettled -> invalidate to refetch authoritative state
 *
 * useQueryClient is used internally only and is NOT re-exported.
 * MFEs interact with the cache through QueryCache, not the raw queryClient.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2
// @cpt-algo:cpt-frontx-algo-request-lifecycle-optimistic-update:p2
// @cpt-algo:cpt-frontx-algo-request-lifecycle-query-invalidation:p2
// @cpt-state:cpt-frontx-state-request-lifecycle-mutation:p2
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient, type MutationFunctionContext } from '@tanstack/react-query';
import type { MutationDescriptor } from '@cyberfabric/framework';
import { createQueryCache } from './QueryCache';
import type { MutationCallbackContext } from './QueryCache';
import type { ApiMutationResult } from '../types';

export type { QueryCache, MutationCallbackContext } from './QueryCache';

// @cpt-begin:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2:inst-type-alias
/**
 * Options for useApiMutation.
 *
 * Each callback receives { queryCache } as an additional final parameter,
 * providing controlled access to the shared cache without exposing the
 * raw QueryClient. TContext is the return type of onMutate, passed as
 * context to onSuccess, onError, and onSettled.
 */
export type UseApiMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = {
  endpoint: MutationDescriptor<TData, TVariables>;
  cancelOnSupersede?: boolean;
  abortOnUnmount?: boolean;
  onMutate?: (variables: TVariables, ctx: MutationCallbackContext) => Promise<TContext> | TContext;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined, ctx: MutationCallbackContext) => unknown;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined, ctx: MutationCallbackContext) => unknown;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined, ctx: MutationCallbackContext) => unknown;
};
// @cpt-end:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2:inst-type-alias

type LatestMutationRef<TData, TError, TVariables, TContext> = {
  current: {
    options: UseApiMutationOptions<TData, TError, TVariables, TContext>;
    callbackCtx: MutationCallbackContext;
  };
};

function useStableMutationAdapter<
  TData,
  TError,
  TVariables,
  TContext,
  TArgs extends unknown[],
  TReturn,
>(
  latestRef: LatestMutationRef<TData, TError, TVariables, TContext>,
  adapter: (
    options: UseApiMutationOptions<TData, TError, TVariables, TContext>,
    ctx: MutationCallbackContext,
    ...args: TArgs
  ) => TReturn,
) {
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  return useCallback((...args: TArgs): TReturn => {
    const { options, callbackCtx } = latestRef.current;
    return adapterRef.current(options, callbackCtx, ...args);
  }, [latestRef]);
}

// @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-delegate-use-mutation
export function useApiMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseApiMutationOptions<TData, TError, TVariables, TContext>
): ApiMutationResult<TData, TError, TVariables> {
  // queryClient is internal — never passed to callers directly.
  const queryClient = useQueryClient();

  // Stable queryCache instance across renders; rebuilt only when queryClient changes.
  const queryCache = useMemo(() => createQueryCache(queryClient), [queryClient]);

  const callbackCtx: MutationCallbackContext = useMemo(() => ({ queryCache }), [queryCache]);

  // Stable refs so useMutation receives stable function identities; each call reads the
  // latest options/callbackCtx (TanStack v5 may not re-subscribe when callbacks change).
  const latestRef = useRef({ options, callbackCtx });
  latestRef.current = { options, callbackCtx };

  /** Cancels the in-flight mutation request on unmount or when a new mutate supersedes it. */
  const fetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (latestRef.current.options.abortOnUnmount) {
        fetchAbortRef.current?.abort();
      }
    };
  }, []);

  const mutationFn = useCallback((variables: TVariables, context: MutationFunctionContext) => {
    const cancelOnSupersede = latestRef.current.options.cancelOnSupersede;
    if (cancelOnSupersede) {
      fetchAbortRef.current?.abort();
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    // TanStack Query may add `signal` to this context in future versions; link it so either
    // source can abort the request we pass to the descriptor.
    const librarySignal = (context as MutationFunctionContext & { signal?: AbortSignal }).signal;
    if (cancelOnSupersede && librarySignal) {
      if (librarySignal.aborted) {
        controller.abort();
      } else {
        librarySignal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    }

    return latestRef.current.options.endpoint
      .fetch(variables, { signal: controller.signal })
      .finally(() => {
        if (fetchAbortRef.current === controller) {
          fetchAbortRef.current = null;
        }
      });
  }, []);

  // Each adapter bridges our callback signatures (which append { queryCache }) to TanStack's.
  // We widen TContext to unknown so onMutate's return type is assignable at the options level.
  const onMutateAdapter = useStableMutationAdapter(
    latestRef,
    (o, ctx, variables: TVariables) => o.onMutate!(variables, ctx),
  );
  const onSuccessAdapter = useStableMutationAdapter(
    latestRef,
    (o, ctx, data: TData, variables: TVariables, context: unknown) =>
      o.onSuccess!(data, variables, context as TContext | undefined, ctx),
  );
  const onErrorAdapter = useStableMutationAdapter(
    latestRef,
    (o, ctx, error: TError, variables: TVariables, context: unknown) =>
      o.onError!(error, variables, context as TContext | undefined, ctx),
  );
  const onSettledAdapter = useStableMutationAdapter(
    latestRef,
    (o, ctx, data: TData | undefined, error: TError | null, variables: TVariables, context: unknown) =>
      o.onSettled!(data, error, variables, context as TContext | undefined, ctx),
  );

  const mutation = useMutation<TData, TError, TVariables, unknown>({
    mutationFn,
    onMutate: options.onMutate ? onMutateAdapter : undefined,
    onSuccess: options.onSuccess ? onSuccessAdapter : undefined,
    onError: options.onError ? onErrorAdapter : undefined,
    onSettled: options.onSettled ? onSettledAdapter : undefined,
  });

  return {
    mutate: mutation.mutate as (variables: TVariables) => void,
    mutateAsync: mutation.mutateAsync as (variables: TVariables) => Promise<TData>,
    isPending: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-delegate-use-mutation
