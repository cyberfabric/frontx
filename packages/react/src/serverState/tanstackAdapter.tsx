import React from 'react';
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2
// @cpt-state:cpt-frontx-state-request-lifecycle-query:p2
// @cpt-state:cpt-frontx-state-request-lifecycle-mutation:p2
import {
  QueryClientProvider,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
  type MutationFunctionContext,
} from '@tanstack/react-query';
import type {
  EndpointDescriptor,
  ServerStateRuntime,
} from '@cyberfabric/framework';
import { SERVER_STATE_NATIVE_HANDLE } from '@cyberfabric/framework';
import type { ApiQueryOverrides } from '../hooks/useApiQuery';
import type {
  ApiInfiniteQueryOptions,
  ApiInfiniteQueryPageContext,
} from '../hooks/useApiInfiniteQuery';
import type { UseApiMutationOptions } from '../hooks/useApiMutation';
import type { MutationCallbackContext } from '../hooks/QueryCache';
import type { ServerStateReactAdapter } from './types';
import { registerServerStateReactAdapter } from './registry';

type RuntimeAwareEndpointDescriptor<TData> = EndpointDescriptor<TData> & {
  fetch(options?: { signal?: AbortSignal; staleTime?: number }): Promise<TData>;
};

function resolveQueryClient(runtime: ServerStateRuntime): QueryClient {
  const nativeHandle = runtime[SERVER_STATE_NATIVE_HANDLE];
  if (!nativeHandle || typeof nativeHandle !== 'object') {
    throw new Error('[HAI3Provider] The configured server-state runtime is missing its native handle.');
  }

  return nativeHandle as QueryClient;
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

function normalizeFetchStaleTime(staleTime: unknown): number | undefined {
  if (staleTime === 'static') {
    return Number.POSITIVE_INFINITY;
  }

  return typeof staleTime === 'number' ? staleTime : undefined;
}

function resolveFetchStaleTime<TData>(
  queryClient: QueryClient,
  descriptor: EndpointDescriptor<TData>,
  overrideStaleTime?: number
): number | undefined {
  return normalizeFetchStaleTime(
    overrideStaleTime ??
      descriptor.staleTime ??
      queryClient.getDefaultOptions().queries?.staleTime
  );
}

function fetchDescriptor<TData>(
  descriptor: EndpointDescriptor<TData>,
  options?: { signal?: AbortSignal; staleTime?: number }
): Promise<TData> {
  return (descriptor as RuntimeAwareEndpointDescriptor<TData>).fetch(options);
}

const tanstackAdapter: ServerStateReactAdapter = {
  adapterId: 'tanstack',
  Provider({ runtime, children }) {
    const queryClient = resolveQueryClient(runtime);
    // @cpt-begin:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    // @cpt-end:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2:inst-render-query-provider
  },
  useQuery<TData = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    descriptor: EndpointDescriptor<TData>,
    overrides?: ApiQueryOverrides
  ) {
    const queryClient = resolveQueryClient(runtime);
    const staleTime = resolveFetchStaleTime(queryClient, descriptor, overrides?.staleTime);
    // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
    const result = useQuery<TData, TError>({
      queryKey: descriptor.key as unknown[],
      queryFn: ({ signal }) => fetchDescriptor(descriptor, { signal, staleTime }),
      staleTime: overrides?.staleTime ?? descriptor.staleTime,
      gcTime: overrides?.gcTime ?? descriptor.gcTime,
    });
    // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query

    return {
      data: result.data,
      error: result.error,
      isLoading: result.isLoading,
      isFetching: result.isFetching,
      isError: result.isError,
      refetch: result.refetch,
    };
  },
  useSuspenseQuery<TData = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    descriptor: EndpointDescriptor<TData>,
    overrides?: ApiQueryOverrides
  ) {
    const queryClient = resolveQueryClient(runtime);
    const staleTime = resolveFetchStaleTime(queryClient, descriptor, overrides?.staleTime);
    // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-call-use-api-suspense-query
    const result = useSuspenseQuery<TData, TError>({
      queryKey: descriptor.key as unknown[],
      queryFn: ({ signal }) => fetchDescriptor(descriptor, { signal, staleTime }),
      staleTime: overrides?.staleTime ?? descriptor.staleTime,
      gcTime: overrides?.gcTime ?? descriptor.gcTime,
    });
    // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-call-use-api-suspense-query

    return {
      data: result.data,
      error: result.error,
      isFetching: result.isFetching,
      refetch: async () => {
        await result.refetch();
      },
    };
  },
  useInfiniteQuery<TPage = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    options: ApiInfiniteQueryOptions<TPage>
  ) {
    const queryClient = resolveQueryClient(runtime);
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
      queryFn: ({ pageParam, signal }) =>
        fetchDescriptor(pageParam, {
          signal,
          staleTime: resolveFetchStaleTime(queryClient, pageParam, options.staleTime),
        }),
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
      select: (data) => data.pages,
      staleTime: options.staleTime ?? options.initialPage.staleTime,
      gcTime: options.gcTime ?? options.initialPage.gcTime,
      maxPages: options.maxPages,
    });
    // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-infinite-query

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
  },
  useSuspenseInfiniteQuery<TPage = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    options: ApiInfiniteQueryOptions<TPage>
  ) {
    const queryClient = resolveQueryClient(runtime);
    // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-call-use-api-suspense-infinite-query
    const result = useSuspenseInfiniteQuery<
      TPage,
      TError,
      readonly TPage[],
      readonly unknown[],
      EndpointDescriptor<TPage>
    >({
      queryKey: options.initialPage.key as readonly unknown[],
      initialPageParam: options.initialPage,
      queryFn: ({ pageParam, signal }) =>
        fetchDescriptor(pageParam, {
          signal,
          staleTime: resolveFetchStaleTime(queryClient, pageParam, options.staleTime),
        }),
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
      select: (data) => data.pages,
      staleTime: options.staleTime ?? options.initialPage.staleTime,
      gcTime: options.gcTime ?? options.initialPage.gcTime,
      maxPages: options.maxPages,
    });
    // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-call-use-api-suspense-infinite-query

    return {
      data: result.data,
      error: result.error,
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
  },
  useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
    _runtime: ServerStateRuntime,
    options: UseApiMutationOptions<TData, TError, TVariables, TContext>,
    callbackCtx: MutationCallbackContext
  ) {
    const latestRef = React.useRef({ options, callbackCtx });
    latestRef.current = { options, callbackCtx };
    const fetchAbortControllersRef = React.useRef<Set<AbortController>>(new Set());

    React.useEffect(() => {
      const fetchAbortControllers = fetchAbortControllersRef.current;
      return () => {
        if (latestRef.current.options.abortOnUnmount) {
          for (const controller of fetchAbortControllers) {
            controller.abort();
          }
          fetchAbortControllers.clear();
        }
      };
    }, []);

    const mutationFn = React.useCallback((variables: TVariables, context: MutationFunctionContext) => {
      const cancelOnSupersede = latestRef.current.options.cancelOnSupersede;
      if (cancelOnSupersede) {
        for (const controller of fetchAbortControllersRef.current) {
          controller.abort();
        }
        fetchAbortControllersRef.current.clear();
      }

      const controller = new AbortController();
      fetchAbortControllersRef.current.add(controller);

      const librarySignal = (context as MutationFunctionContext & { signal?: AbortSignal }).signal;
      if (cancelOnSupersede && librarySignal) {
        if (librarySignal.aborted) {
          controller.abort();
        } else {
          librarySignal.addEventListener('abort', () => controller.abort(), { once: true });
        }
      }

      // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-mutation-service-call
      return latestRef.current.options.endpoint
        .fetch(variables, { signal: controller.signal })
        .finally(() => {
          fetchAbortControllersRef.current.delete(controller);
        });
      // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-mutation-service-call
    }, []);

    const onMutate = React.useCallback((variables: TVariables, _context: MutationFunctionContext) => {
      const current = latestRef.current;
      if (!current.options.onMutate) {
        return undefined as TContext;
      }

      return current.options.onMutate(variables, current.callbackCtx);
    }, []);

    const onSuccess = React.useCallback((data: TData, variables: TVariables, context: TContext | undefined) => {
      const current = latestRef.current;
      return current.options.onSuccess?.(data, variables, context, current.callbackCtx);
    }, []);

    const onError = React.useCallback((error: TError, variables: TVariables, context: TContext | undefined) => {
      const current = latestRef.current;
      return current.options.onError?.(error, variables, context, current.callbackCtx);
    }, []);

    const onSettled = React.useCallback((
      data: TData | undefined,
      error: TError | null,
      variables: TVariables,
      context: TContext | undefined
    ) => {
      const current = latestRef.current;
      return current.options.onSettled?.(
        data,
        error,
        variables,
        context,
        current.callbackCtx
      );
    }, []);

    const mutation = useMutation<TData, TError, TVariables, TContext>({
      mutationFn,
      onMutate: options.onMutate ? onMutate : undefined,
      onSuccess: options.onSuccess ? onSuccess : undefined,
      onError: options.onError ? onError : undefined,
      onSettled: options.onSettled ? onSettled : undefined,
    });

    return {
      mutate: mutation.mutate as (variables: TVariables) => void,
      mutateAsync: mutation.mutateAsync as (variables: TVariables) => Promise<TData>,
      isPending: mutation.isPending,
      error: mutation.error,
      data: mutation.data,
      reset: mutation.reset,
    };
  },
};

registerServerStateReactAdapter(tanstackAdapter);
