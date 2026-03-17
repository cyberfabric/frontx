/**
 * _Blank Domain - Query Keys and Query Options
 * Replace these factories with your domain-specific queries.
 *
 * @cpt-FEATURE:cpt-hai3-dod-request-lifecycle-use-api-query:p2
 */
import { apiRegistry, queryOptions, type UseApiQueryOptions } from '@hai3/react';
import { _BlankApiService } from '../api/_BlankApiService';
import type { GetBlankStatusResponse } from '../api/types';

export const blankKeys = {
  all: ['@blank'] as const,
  status: () => [...blankKeys.all, 'status'] as const,
};

export const blankQueries = {
  status: (): UseApiQueryOptions<GetBlankStatusResponse> =>
    queryOptions({
      queryKey: blankKeys.status(),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiRegistry.getService(_BlankApiService).getStatus({ signal }),
    }) as UseApiQueryOptions<GetBlankStatusResponse>,
};
