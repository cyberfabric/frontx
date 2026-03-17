import { useMemo } from 'react';
import { createQueryCache } from './QueryCache';
import { useOptionalHAI3QueryClient } from '../queryClient';

/**
 * Exposes the sanctioned imperative cache API for app and MFE code without
 * leaking the raw QueryClient.
 *
 * Preferred usage:
 * - useApiQuery() for declarative reads
 * - useApiMutation() for writes
 * - useQueryCache() for controlled imperative cache inspection and invalidation
 */
export function useQueryCache() {
  const queryClient = useOptionalHAI3QueryClient();

  if (!queryClient) {
    throw new Error(
      '[HAI3Provider] No query cache available. Add queryCache() or queryCacheShared() to your plugin composition.'
    );
  }

  return useMemo(() => createQueryCache(queryClient), [queryClient]);
}
