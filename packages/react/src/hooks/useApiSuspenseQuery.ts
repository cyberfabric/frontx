/**
 * useApiSuspenseQuery - Suspense declarative data fetching hook
 *
 * Mirrors useApiQuery but integrates with React Suspense so the initial load is
 * handled by a Suspense boundary.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2
// @cpt-state:cpt-frontx-state-request-lifecycle-query:p2

import { useSuspenseQuery } from '@tanstack/react-query';
import type { EndpointDescriptor } from '@cyberfabric/framework';
import type { ApiSuspenseQueryResult } from '../types';
import type { ApiQueryOverrides } from './useApiQuery';

// @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-suspense-query
export function useApiSuspenseQuery<TData = unknown, TError = Error>(
  descriptor: EndpointDescriptor<TData>,
  overrides?: ApiQueryOverrides
): ApiSuspenseQueryResult<TData> {
  const result = useSuspenseQuery<TData, TError>({
    queryKey: descriptor.key as unknown[],
    queryFn: ({ signal }) => descriptor.fetch({ signal }),
    staleTime: overrides?.staleTime ?? descriptor.staleTime,
    gcTime: overrides?.gcTime ?? descriptor.gcTime,
  });
  // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-suspense-query

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-return-suspense-data
  return {
    data: result.data,
    isFetching: result.isFetching,
    refetch: async () => {
      await result.refetch();
    },
  };
  // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-return-suspense-data
}
