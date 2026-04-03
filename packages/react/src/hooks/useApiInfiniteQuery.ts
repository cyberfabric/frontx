/**
 * useApiInfiniteQuery - Declarative paginated data fetching hook
 *
 * Accepts an initial EndpointDescriptor plus descriptor resolvers for adjacent
 * pages. Each page remains a standard service descriptor so MFE code does not
 * need raw TanStack query keys or query functions.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2

import { useInfiniteQuery } from '@tanstack/react-query';
import type { EndpointDescriptor } from '@cyberfabric/framework';
import type { ApiInfiniteQueryResult } from '../types';
import type { ApiQueryOverrides } from './useApiQuery';

export interface ApiInfiniteQueryPageContext<TPage> {
  page: TPage;
  pages: readonly TPage[];
  descriptor: EndpointDescriptor<TPage>;
  descriptors: readonly EndpointDescriptor<TPage>[];
}

export interface ApiInfiniteQueryOptions<TPage> extends ApiQueryOverrides {
  /** Descriptor for the first page in the sequence. */
  initialPage: EndpointDescriptor<TPage>;
  /**
   * Resolve the next page descriptor from the current page payload.
   * Return undefined when there is no next page.
   */
  getNextPage: (
    context: ApiInfiniteQueryPageContext<TPage>
  ) => EndpointDescriptor<TPage> | undefined;
  /**
   * Resolve the previous page descriptor from the current first page payload.
   * Return undefined when backward pagination is not available.
   */
  getPreviousPage?: (
    context: ApiInfiniteQueryPageContext<TPage>
  ) => EndpointDescriptor<TPage> | undefined;
  /** Optional TanStack maxPages passthrough for bounded page windows. */
  maxPages?: number;
}

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

export function useApiInfiniteQuery<TPage = unknown, TError = Error>(
  options: ApiInfiniteQueryOptions<TPage>
): ApiInfiniteQueryResult<TPage, TError> {
  // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-infinite-query
  const result = useInfiniteQuery<
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
          options.getPreviousPage?.(
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
  // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-infinite-query

  // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-return-infinite-pages
  return {
    data: result.data,
    error: result.error,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
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
  // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-return-infinite-pages
}
