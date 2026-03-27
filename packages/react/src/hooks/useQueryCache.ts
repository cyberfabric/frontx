import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createQueryCache } from './QueryCache';

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
  const queryClient = useQueryClient();

  return useMemo(() => createQueryCache(queryClient), [queryClient]);
}
