/**
 * useApiQuery - Declarative data fetching hook
 *
 * Wraps @tanstack/react-query's useQuery for use with HAI3 API services.
 * Automatically provides AbortSignal for request cancellation on unmount
 * via TanStack Query's built-in signal threading to the queryFn.
 */
// @cpt-dod:cpt-hai3-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-hai3-flow-request-lifecycle-use-api-query:p2

import { useQuery, queryOptions } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

export { queryOptions };

// @cpt-begin:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-type-alias
export type UseApiQueryOptions<TData = unknown, TError = Error> = UseQueryOptions<TData, TError>;
// @cpt-end:cpt-hai3-dod-request-lifecycle-use-api-query:p2:inst-type-alias

// @cpt-begin:cpt-hai3-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
export function useApiQuery<TData = unknown, TError = Error>(
  options: UseApiQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  // TanStack Query passes { signal } to queryFn automatically; no extra wiring needed.
  // The caller forwards signal to their BaseApiService method for cancellation on unmount.
  return useQuery<TData, TError>(options);
}
// @cpt-end:cpt-hai3-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
