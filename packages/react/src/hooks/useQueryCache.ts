import { useMemo } from 'react';
import { createQueryCache } from './QueryCache';
import { useServerStateRuntime } from '../serverState';

/**
 * Exposes the sanctioned imperative cache API for app and MFE code without
 * leaking the raw server-state runtime.
 *
 * Preferred usage:
 * - useApiQuery() for declarative reads
 * - useApiMutation() for writes
 * - useQueryCache() for controlled imperative cache inspection and invalidation
 */
export function useQueryCache() {
  const runtime = useServerStateRuntime();

  if (!runtime) {
    throw new Error(
      '[HAI3Provider] No server-state runtime available. Add queryCache() to your plugin composition or pass a serverState prop.'
    );
  }

  return useMemo(() => createQueryCache(runtime), [runtime]);
}
