/**
 * useApiQuery - Declarative data fetching hook
 *
 * Accepts an EndpointDescriptor from @cyberfabric/api and returns a HAI3-owned
 * ApiQueryResult. AbortSignal for request cancellation is threaded automatically
 * by the active server-state adapter.
 *
 * Cache config cascade: component overrides > descriptor defaults > plugin defaults.
 * Omit overrides to rely on the descriptor's staleTime/gcTime, which in turn
 * fall back to the plugin-level server-state defaults.
 */
// @cpt-dod:cpt-frontx-dod-request-lifecycle-use-api-query:p2
// @cpt-flow:cpt-frontx-flow-request-lifecycle-use-api-query:p2
// @cpt-state:cpt-frontx-state-request-lifecycle-query:p2
// @cpt-FEATURE:implement-endpoint-descriptors:p3

import type { EndpointDescriptor } from '@cyberfabric/framework';
import type { ApiQueryResult } from '../types';
import { useServerStateQuery } from '../serverState';

/** Per-call cache overrides. Cascade: these > descriptor > plugin defaults. */
export interface ApiQueryOverrides {
  /** Override staleTime for this specific call site. */
  staleTime?: number;
  /** Override gcTime for this specific call site. */
  gcTime?: number;
}

// @cpt-begin:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
export function useApiQuery<TData = unknown, TError = Error>(
  descriptor: EndpointDescriptor<TData>,
  overrides?: ApiQueryOverrides
): ApiQueryResult<TData, TError> {
  return useServerStateQuery(descriptor, overrides);
}
// @cpt-end:cpt-frontx-flow-request-lifecycle-use-api-query:p2:inst-delegate-use-query
