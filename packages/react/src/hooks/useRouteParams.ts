/**
 * useRouteParams Hook
 *
 * Provides access to route parameters from the current URL.
 * Supports type-safe route params via module augmentation.
 *
 * React Layer: L3
 *
 * @example
 * ```tsx
 * import { useRouteParams } from '@hai3/react';
 *
 * // Basic usage (no type safety)
 * const UserDetailScreen: React.FC = () => {
 *   const params = useRouteParams();
 *   // params: Record<string, string>
 *
 *   return <div>User ID: {params.id}</div>;
 * };
 *
 * // Type-safe usage with module augmentation
 * // First, declare the route params in your app:
 * // declare module '@hai3/framework' {
 * //   interface RouteParams {
 * //     'user-detail': { userId: string };
 * //   }
 * // }
 *
 * const UserDetailScreen: React.FC = () => {
 *   const params = useRouteParams<'user-detail'>();
 *   // params: { userId: string } - fully typed!
 *
 *   return <div>User ID: {params.userId}</div>;
 * };
 * ```
 */

import { useRouteParamsContext } from '../contexts/RouteParamsContext';
import type { RouteParams as FrameworkRouteParams } from '@hai3/framework';

/**
 * Hook to access route parameters from the current URL.
 * 
 * @template TScreenId - Optional screen ID for type-safe route params
 * @returns Route parameters, optionally typed based on screen ID
 */
export function useRouteParams<TScreenId extends keyof FrameworkRouteParams = string>(): TScreenId extends keyof FrameworkRouteParams 
  ? FrameworkRouteParams[TScreenId] 
  : Record<string, string> {
  return useRouteParamsContext() as TScreenId extends keyof FrameworkRouteParams 
    ? FrameworkRouteParams[TScreenId] 
    : Record<string, string>;
}
