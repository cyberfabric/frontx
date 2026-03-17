/**
 * RestEndpointProtocol - Declarative REST endpoint descriptors
 *
 * Owns the descriptor contract for cacheable REST endpoints while delegating
 * imperative execution to an injected RestProtocol instance.
 *
 * SDK Layer: L1 (Only peer dependency on axios via RestProtocol)
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-mutation:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2

import {
  ApiProtocol,
  type ApiServiceConfig,
  type BasePluginHooks,
  type EndpointDescriptor,
  type EndpointOptions,
  type MutationDescriptor,
  type MutationMethod,
  type ParameterizedEndpointDescriptor,
  type PluginClass,
} from '../types';
import { RestProtocol } from './RestProtocol';

/**
 * Declarative REST descriptor contract.
 *
 * This contract is separate from RestProtocol's imperative get/post/put API so
 * services can opt into either or both styles explicitly.
 */
export class RestEndpointProtocol extends ApiProtocol<BasePluginHooks> {
  private config: Readonly<ApiServiceConfig> | null = null;

  constructor(private readonly rest: RestProtocol) {
    super();
  }

  initialize(
    config: Readonly<ApiServiceConfig>,
    _getExcludedClasses?: () => ReadonlySet<PluginClass>
  ): void {
    this.config = config;
  }

  getPluginsInOrder(): readonly BasePluginHooks[] {
    return [];
  }

  cleanup(): void {
    this.config = null;
  }

  query<TData>(
    path: string,
    options?: EndpointOptions
  ): EndpointDescriptor<TData> {
    const config = this.getConfig();
    const key = [config.baseURL, 'GET', path] as const;

    return {
      key,
      fetch: ({ signal, staleTime } = {}) => {
        // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-dedup
        return this.rest.getWithSharedCache<TData>(path, {
          descriptorKey: key,
          signal,
          staleTime: staleTime ?? options?.staleTime,
        });
        // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-dedup
      },
      ...(options?.staleTime !== undefined && { staleTime: options.staleTime }),
      ...(options?.gcTime !== undefined && { gcTime: options.gcTime }),
    };
  }

  queryWith<TData, TParams>(
    pathFn: (params: TParams) => string,
    options?: EndpointOptions
  ): ParameterizedEndpointDescriptor<TData, TParams> {
    const config = this.getConfig();

    return (params: TParams): EndpointDescriptor<TData> => {
      const resolvedPath = pathFn(params);
      const key = [config.baseURL, 'GET', resolvedPath, { ...params }] as const;

      return {
        key,
        fetch: ({ signal, staleTime } = {}) => {
          // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-dedup
          return this.rest.getWithSharedCache<TData>(resolvedPath, {
            descriptorKey: key,
            signal,
            staleTime: staleTime ?? options?.staleTime,
          });
          // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-dedup
        },
        ...(options?.staleTime !== undefined && { staleTime: options.staleTime }),
        ...(options?.gcTime !== undefined && { gcTime: options.gcTime }),
      };
    };
  }

  mutation<TData, TVariables>(
    method: MutationMethod,
    path: string
  ): MutationDescriptor<TData, TVariables> {
    const config = this.getConfig();
    const key = [config.baseURL, method, path] as const;

    return {
      key,
      fetch: (variables: TVariables, options?: { signal?: AbortSignal }) => {
        // @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-mutation-service-call
        switch (method) {
          case 'DELETE':
            return this.rest.delete<TData, TVariables>(path, variables, {
              signal: options?.signal,
            });
          case 'POST':
            return this.rest.post<TData, TVariables>(path, variables, {
              signal: options?.signal,
            });
          case 'PUT':
            return this.rest.put<TData, TVariables>(path, variables, {
              signal: options?.signal,
            });
          case 'PATCH':
            return this.rest.patch<TData, TVariables>(path, variables, {
              signal: options?.signal,
            });
        }
        // @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-mutation:p2:inst-mutation-service-call
      },
    };
  }

  private getConfig(): Readonly<ApiServiceConfig> {
    if (!this.config) {
      throw new Error('RestEndpointProtocol not initialized. Call initialize() first.');
    }

    return this.config;
  }
}
