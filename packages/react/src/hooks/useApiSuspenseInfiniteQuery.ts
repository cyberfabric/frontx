/**
 * useApiSuspenseInfiniteQuery - Suspense paginated data fetching hook
 *
 * Mirrors useApiInfiniteQuery but integrates with React Suspense so the initial
 * page load is handled by a Suspense boundary while pagination stays
 * descriptor-driven.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2

import type { ApiSuspenseInfiniteQueryResult } from '../types';
import type {
  ApiInfiniteQueryOptions,
} from './useApiInfiniteQuery';
import { useHAI3SuspenseInfiniteQuery } from '../queryClient';

export function useApiSuspenseInfiniteQuery<TPage = unknown, TError = Error>(
  options: ApiInfiniteQueryOptions<TPage>
): ApiSuspenseInfiniteQueryResult<TPage, TError> {
  return useHAI3SuspenseInfiniteQuery<TPage, TError>(options);
}
