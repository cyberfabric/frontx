/**
 * AppRouter Component - Renders the active screen
 *
 * React Layer: L3
 */

import React, { Suspense, useState, useEffect } from 'react';
import { useHAI3 } from '../HAI3Context';
import { useNavigation } from '../hooks/useNavigation';
import { RouteParamsProvider, type RouteParams } from '../contexts/RouteParamsContext';
import type { AppRouterProps } from '../types';

/**
 * AppRouter Component
 *
 * Renders the currently active screen based on navigation state.
 * Handles lazy loading and error boundaries.
 *
 * @example
 * ```tsx
 * <HAI3Provider>
 *   <Layout>
 *     <AppRouter
 *       fallback={<LoadingSpinner />}
 *       errorFallback={(error) => <ErrorPage error={error} />}
 *     />
 *   </Layout>
 * </HAI3Provider>
 * ```
 */
export const AppRouter: React.FC<AppRouterProps> = ({
  fallback = null,
  errorFallback,
}) => {
  const app = useHAI3();
  const { currentScreenset, currentScreen } = useNavigation();
  const [ScreenComponent, setScreenComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Extract route params synchronously from current URL to avoid race condition
  // This ensures params are available on first render
  const [routeParams, setRouteParams] = useState<RouteParams>(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    const pathname = window.location.pathname;
    const base = app.config.base || '';
    const internalPath = base && pathname.startsWith(base)
      ? pathname.slice(base.length) || '/'
      : pathname;
    const match = app.routeRegistry?.matchRoute(internalPath);
    return match?.params ?? {};
  });

  // Update route params when navigation changes (browser back/forward or programmatic navigation)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const pathname = window.location.pathname;
    const base = app.config.base || '';
    const internalPath = base && pathname.startsWith(base)
      ? pathname.slice(base.length) || '/'
      : pathname;
    const match = app.routeRegistry?.matchRoute(internalPath);
    setRouteParams(match?.params ?? {});
  }, [app.config.base, app.routeRegistry, currentScreen]);

  useEffect(() => {
    let cancelled = false;

    const loadScreen = async () => {
      if (!currentScreenset || !currentScreen) {
        setScreenComponent(null);
        return;
      }

      try {
        // Get screen loader from route registry
        const loader = app.routeRegistry.getScreen(currentScreenset, currentScreen);

        if (!loader) {
          throw new Error(
            `Screen "${currentScreen}" not found in screenset "${currentScreenset}".`
          );
        }

        // Load the screen component
        const module = await loader();

        if (!cancelled) {
          setScreenComponent(() => module.default);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setScreenComponent(null);
        }
      }
    };

    loadScreen();

    return () => {
      cancelled = true;
    };
  }, [currentScreenset, currentScreen, app.routeRegistry]);

  // Handle error state
  if (error) {
    if (errorFallback) {
      if (typeof errorFallback === 'function') {
        return <>{errorFallback(error)}</>;
      }
      return <>{errorFallback}</>;
    }
    // Default error display
    return (
      <div className="p-5 text-destructive">
        <h2>Error loading screen</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  // Handle loading state
  if (!ScreenComponent) {
    return <>{fallback}</>;
  }

  // Render the screen component wrapped with route params context
  return (
    <RouteParamsProvider params={routeParams}>
      <Suspense fallback={fallback}>
        <ScreenComponent />
      </Suspense>
    </RouteParamsProvider>
  );
};
