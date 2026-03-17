/**
 * useApiMutation - Declarative mutation hook with restricted QueryCache injection
 *
 * Wraps @tanstack/react-query's useMutation for use with HAI3 API services.
 * Supports optimistic updates, rollback, and cache invalidation through the
 * QueryCache interface injected into each callback. For imperative cache work
 * outside mutation lifecycles, callers use useQueryCache() — MFEs never receive
 * the raw queryClient instance directly.
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
// @cpt-dod:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-mutation:p2
// @cpt-algo:cpt-hai3-algo-request-lifecycle-optimistic-update:p2
// @cpt-algo:cpt-hai3-algo-request-lifecycle-query-invalidation:p2

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { createQueryCache } from './QueryCache';
import type { QueryCache, MutationCallbackContext } from './QueryCache';

export type { QueryCache, MutationCallbackContext };

// @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-type-alias
/**
 * Mutation options with HAI3-specific callback signatures.
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
  mutationFn?: (variables: TVariables) => Promise<TData>;
  onMutate?: (variables: TVariables, ctx: MutationCallbackContext) => Promise<TContext> | TContext;
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined, ctx: MutationCallbackContext) => Promise<unknown> | unknown;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined, ctx: MutationCallbackContext) => Promise<unknown> | unknown;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined, ctx: MutationCallbackContext) => Promise<unknown> | unknown;
};
// @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-mutation:p2:inst-type-alias

// @cpt-begin:cpt-hai3-flow-request-lifecycle-use-api-mutation:p2:inst-delegate-use-mutation
export function useApiMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseApiMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  // queryClient is internal — never passed to callers directly.
  const queryClient = useQueryClient();

  // Stable queryCache instance across renders; rebuilt only when queryClient changes.
  const queryCache = useMemo(() => createQueryCache(queryClient), [queryClient]);

  const callbackCtx: MutationCallbackContext = { queryCache };

  // The adapters below bridge our callback signatures (which include { queryCache } as
  // a final argument) to TanStack's internal callback signatures. We widen the internal
  // useMutation call to TContext = unknown so that the onMutate return type (`TContext |
  // Promise<TContext>`) is assignable — TanStack resolves the actual TOnMutateResult type
  // at the observer level, not at the options level. The result is then narrowed back to
  // UseMutationResult<TData, TError, TVariables, TContext> at the return boundary.
  const mutation = useMutation<TData, TError, TVariables, unknown>({
    mutationFn: options.mutationFn as ((variables: TVariables) => Promise<TData>) | undefined,

    onMutate: options.onMutate
      ? (variables: TVariables) => options.onMutate!(variables, callbackCtx)
      : undefined,

    onSuccess: options.onSuccess
      ? (data: TData, variables: TVariables, context: unknown) =>
          options.onSuccess!(data, variables, context as TContext | undefined, callbackCtx)
      : undefined,

    onError: options.onError
      ? (error: TError, variables: TVariables, context: unknown) =>
          options.onError!(error, variables, context as TContext | undefined, callbackCtx)
      : undefined,

    onSettled: options.onSettled
      ? (data: TData | undefined, error: TError | null, variables: TVariables, context: unknown) =>
          options.onSettled!(data, error, variables, context as TContext | undefined, callbackCtx)
      : undefined,
  });

  return mutation as UseMutationResult<TData, TError, TVariables, TContext>;
}
// @cpt-end:cpt-hai3-flow-request-lifecycle-use-api-mutation:p2:inst-delegate-use-mutation
