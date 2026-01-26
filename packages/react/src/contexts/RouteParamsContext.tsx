/**
 * Route Params Context
 *
 * Provides route parameters to screen components via React context.
 *
 * React Layer: L3
 */

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Route params type
 */
export type RouteParams = Record<string, string>;

/**
 * Route params context
 */
const RouteParamsContext = createContext<RouteParams>({});

/**
 * Route params provider props
 */
export interface RouteParamsProviderProps {
  params: RouteParams;
  children: ReactNode;
}

/**
 * Route params provider component
 */
export function RouteParamsProvider({ params, children }: RouteParamsProviderProps): JSX.Element {
  return (
    <RouteParamsContext.Provider value={params}>
      {children}
    </RouteParamsContext.Provider>
  );
}

/**
 * Hook to access route params from context
 */
export function useRouteParamsContext(): RouteParams {
  return useContext(RouteParamsContext);
}

export { RouteParamsContext };
