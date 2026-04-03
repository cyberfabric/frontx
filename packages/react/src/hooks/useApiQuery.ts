/**
 * useApiQuery - Declarative data fetching hook
 *
 * Accepts an EndpointDescriptor from @cyberfabric/api and returns a HAI3-owned
 * ApiQueryResult. AbortSignal for request cancellation is threaded automatically
 * via TanStack Query's built-in signal forwarding to the queryFn.
 *
 * Cache config cascade: component overrides > descriptor defaults > plugin defaults.
 * Omit overrides to rely on the descriptor's staleTime/gcTime, which in turn
 * fall back to the plugin-level QueryClient defaults.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2
// @cpt-state:cpt-frontx-state-request-lifecycle-query:p2
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import { useQuery } from '@tanstack/react-query';
import type { EndpointDescriptor } from '@cyberfabric/framework';
import type { ApiQueryResult } from '../types';

/** Per-call cache overrides. Cascade: these > descriptor > plugin defaults. */
export interface ApiQueryOverrides {
  /** Override staleTime for this specific call site. */
  staleTime?: number;
  /** Override gcTime for this specific call site. */
  gcTime?: number;
}

// @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
export function useApiQuery<TData = unknown, TError = Error>(
  descriptor: EndpointDescriptor<TData>,
  overrides?: ApiQueryOverrides
): ApiQueryResult<TData, TError> {
  // TanStack Query passes { signal } to queryFn automatically; the descriptor's
  // fetch method forwards it to the underlying protocol for cancellation on unmount.
  const result = useQuery<TData, TError>({
    queryKey: descriptor.key as unknown[],
    queryFn: ({ signal }) => descriptor.fetch({ signal }),
    // Component overrides win; descriptor provides per-endpoint defaults; plugin
    // defaults apply when both are undefined.
    staleTime: overrides?.staleTime ?? descriptor.staleTime,
    gcTime: overrides?.gcTime ?? descriptor.gcTime,
  });

  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    refetch: result.refetch,
  };
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
