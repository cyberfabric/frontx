/**
 * FrontX-owned server-state contracts.
 *
 * These types describe the cache/runtime surface exposed by the framework
 * without leaking the underlying engine into public L2/L3 APIs.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-query-provider:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-query-client-lifecycle:p2

export type ServerStateKey = readonly unknown[];

export type ServerStateRefetchMode = 'active' | 'inactive' | 'all' | 'none';

export type ServerStateFetchStatus = 'fetching' | 'paused' | 'idle';

export type ServerStateStatus = 'pending' | 'error' | 'success';

export type ServerStateUpdater<T> = T | ((old: T | undefined) => T | undefined);

export interface ServerStateQueryState<TData = unknown, TError = Error> {
  data: TData | undefined;
  dataUpdatedAt: number;
  error: TError | null;
  errorUpdatedAt: number;
  fetchFailureCount: number;
  fetchFailureReason: TError | null;
  fetchStatus: ServerStateFetchStatus;
  isInvalidated: boolean;
  status: ServerStateStatus;
}

export interface ServerStateInvalidateFilters {
  queryKey: ServerStateKey;
  exact?: boolean;
  refetchType?: ServerStateRefetchMode;
}

export interface ServerStateCache {
  get<T>(queryKey: ServerStateKey): T | undefined;
  getState<TData = unknown, TError = Error>(
    queryKey: ServerStateKey
  ): ServerStateQueryState<TData, TError> | undefined;
  set<T>(queryKey: ServerStateKey, dataOrUpdater: ServerStateUpdater<T>): void;
  cancel(queryKey: ServerStateKey): Promise<void>;
  cancelAll(): Promise<void>;
  invalidate(queryKey: ServerStateKey): Promise<void>;
  invalidateMany(filters: ServerStateInvalidateFilters): Promise<void>;
  remove(queryKey: ServerStateKey): void;
  clear(): void;
}

/**
 * Symbol-keyed native handle used by internal adapter implementations.
 * Consumers should treat this as opaque.
 */
export const SERVER_STATE_NATIVE_HANDLE = Symbol.for('hai3:server-state:native-handle');

/**
 * Internal runtime token used to suppress echo when cache sync events are
 * broadcast across multiple roots.
 */
export const SERVER_STATE_BROADCAST_TARGET = Symbol.for('hai3:server-state:broadcast-target');

/**
 * Default adapter identifier. Internal React bindings use this to select the
 * matching provider/hook bridge for a runtime instance.
 */
export const DEFAULT_SERVER_STATE_ADAPTER_ID = 'tanstack';

export interface ServerStateRuntime {
  readonly adapterId: string;
  readonly cache: ServerStateCache;
  readonly [SERVER_STATE_BROADCAST_TARGET]: string;
  readonly [SERVER_STATE_NATIVE_HANDLE]: object;
}
