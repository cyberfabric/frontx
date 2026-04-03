/**
 * useApiSuspenseInfiniteQuery - Suspense paginated data fetching hook
 *
 * Mirrors useApiInfiniteQuery but integrates with React Suspense so the initial
 * page load is handled by a Suspense boundary while pagination stays
 * descriptor-driven.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2

import { useSuspenseInfiniteQuery } from '@tanstack/react-query';
import type { EndpointDescriptor } from '@cyberfabric/framework';
import type { ApiSuspenseInfiniteQueryResult } from '../types';
import type {
  ApiInfiniteQueryOptions,
  ApiInfiniteQueryPageContext,
} from './useApiInfiniteQuery';

function buildPageContext<TPage>(
  page: TPage,
  pages: readonly TPage[],
  descriptor: EndpointDescriptor<TPage>,
  descriptors: readonly EndpointDescriptor<TPage>[]
): ApiInfiniteQueryPageContext<TPage> {
  return {
    page,
    pages,
    descriptor,
    descriptors,
  };
}

export function useApiSuspenseInfiniteQuery<TPage = unknown, TError = Error>(
  options: ApiInfiniteQueryOptions<TPage>
): ApiSuspenseInfiniteQueryResult<TPage> {
  // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-suspense-infinite-query
  const result = useSuspenseInfiniteQuery<
    TPage,
    TError,
    readonly TPage[],
    readonly unknown[],
    EndpointDescriptor<TPage>
  >({
    queryKey: options.initialPage.key as readonly unknown[],
    initialPageParam: options.initialPage,
    queryFn: ({ pageParam, signal }) => pageParam.fetch({ signal }),
    // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-resolve-adjacent-pages
    getNextPageParam: (
      lastPage,
      allPages,
      lastPageDescriptor,
      allPageDescriptors
    ) =>
      options.getNextPage(
        buildPageContext(
          lastPage,
          allPages,
          lastPageDescriptor,
          allPageDescriptors
        )
      ),
    getPreviousPageParam: options.getPreviousPage
      ? (firstPage, allPages, firstPageDescriptor, allPageDescriptors) =>
          options.getPreviousPage!(
            buildPageContext(
              firstPage,
              allPages,
              firstPageDescriptor,
              allPageDescriptors
            )
          )
      : undefined,
    // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-resolve-adjacent-pages
    select: (data) => data.pages,
    staleTime: options.staleTime ?? options.initialPage.staleTime,
    gcTime: options.gcTime ?? options.initialPage.gcTime,
    maxPages: options.maxPages,
  });
  // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-suspense-infinite-query

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-return-suspense-infinite-pages
  return {
    data: result.data,
    isFetching: result.isFetching,
    hasNextPage: result.hasNextPage ?? false,
    hasPreviousPage: result.hasPreviousPage ?? false,
    isFetchingNextPage: result.isFetchingNextPage,
    isFetchingPreviousPage: result.isFetchingPreviousPage,
    fetchNextPage: async () => {
      await result.fetchNextPage();
    },
    fetchPreviousPage: async () => {
      await result.fetchPreviousPage();
    },
    refetch: async () => {
      await result.refetch();
    },
  };
  // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-return-suspense-infinite-pages
}
