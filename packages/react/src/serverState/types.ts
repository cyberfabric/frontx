import type React from 'react';
import type {
  EndpointDescriptor,
  ServerStateRuntime,
} from '@cyberfabric/framework';
import type { ApiQueryOverrides } from '../hooks/useApiQuery';
import type {
  ApiInfiniteQueryOptions,
} from '../hooks/useApiInfiniteQuery';
import type { UseApiMutationOptions } from '../hooks/useApiMutation';
import type { MutationCallbackContext } from '../hooks/QueryCache';
import type {
  ApiInfiniteQueryResult,
  ApiMutationResult,
  ApiQueryResult,
  ApiSuspenseInfiniteQueryResult,
  ApiSuspenseQueryResult,
} from '../types';

export interface ServerStateReactAdapter {
  readonly adapterId: string;
  readonly Provider: React.ComponentType<{
    runtime: ServerStateRuntime;
    children: React.ReactNode;
  }>;
  useQuery<TData = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    descriptor: EndpointDescriptor<TData>,
    overrides?: ApiQueryOverrides
  ): ApiQueryResult<TData, TError>;
  useSuspenseQuery<TData = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    descriptor: EndpointDescriptor<TData>,
    overrides?: ApiQueryOverrides
  ): ApiSuspenseQueryResult<TData, TError>;
  useInfiniteQuery<TPage = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    options: ApiInfiniteQueryOptions<TPage>
  ): ApiInfiniteQueryResult<TPage, TError>;
  useSuspenseInfiniteQuery<TPage = unknown, TError = Error>(
    runtime: ServerStateRuntime,
    options: ApiInfiniteQueryOptions<TPage>
  ): ApiSuspenseInfiniteQueryResult<TPage, TError>;
  useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
    runtime: ServerStateRuntime,
    options: UseApiMutationOptions<TData, TError, TVariables, TContext>,
    callbackCtx: MutationCallbackContext
  ): ApiMutationResult<TData, TError, TVariables>;
}
