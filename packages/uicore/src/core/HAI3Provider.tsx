/**
 * HAI3Provider Component
 * Main provider component that wraps HAI3 applications
 * Includes Redux Provider and AppRouter - apps just need to register themes/screensets
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { store, type AppDispatch } from '../store';
import { setHeaderConfig } from '../layout/domains/header/headerSlice';
import { setMenuConfig } from '../layout/domains/menu/menuSlice';
import { setFooterConfig } from '../layout/domains/footer/footerSlice';
import { setSidebarConfig } from '../layout/domains/sidebar/sidebarSlice';
import { AppRouter } from './routing/AppRouter';

/**
 * Router configuration type
 */
export type RouterType = 'browser' | 'hash' | 'memory';

export type RouterConfig = {
  type: RouterType;
};

/**
 * Layout configuration type
 * Each domain accepts an object with visible field
 */
export type LayoutConfig = {
  header?: { visible?: boolean };
  menu?: { visible?: boolean };
  footer?: { visible?: boolean };
  sidebar?: { visible?: boolean };
};

/**
 * Check if we're in development mode
 * Works in both Vite and non-Vite environments
 */
const isDevelopment =
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
  (typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV);

/**
 * Lazy load Studio only in development mode and only if installed
 * Falls back to null component if @hai3/studio is not available
 *
 * Note: Studio is an optional peer dependency loaded via dynamic import
 * The .catch() ensures graceful degradation if the package is not installed
 * Type declaration in types/optionalModules.d.ts allows TypeScript to recognize the module
 */
const StudioOverlay = isDevelopment
  ? lazy(() =>
      import('@hai3/studio')
        .then(module => ({ default: module.StudioOverlay }))
        .catch(() => {
          // Studio not installed - gracefully degrade
          console.debug('[HAI3] Studio package not found. Install @hai3/studio for development tools.');
          return { default: () => null };
        })
    )
  : null;

export interface HAI3ProviderProps {
  children?: React.ReactNode;
  router?: RouterConfig;
  layout?: LayoutConfig;
}

const useApplyLayoutConfig = (layout?: LayoutConfig) => {
   const dispatch = useDispatch<AppDispatch>();

   useEffect(() => {
    if (!layout) {
      return;
    }

    const actions = {
      header: setHeaderConfig,
      menu: setMenuConfig,
      footer: setFooterConfig,
      sidebar: setSidebarConfig,
    } as const;

    (Object.keys(actions) as (keyof typeof actions)[]).forEach((key) => {
      const config = layout[key];

      if (config) {
        dispatch(actions[key](config));
      }
    });
   }, [dispatch, layout]);
};

const HAI3ProviderInner: React.FC<HAI3ProviderProps> = ({ children, router, layout }) => {
  useApplyLayoutConfig(layout);

  return (
    <>
      {children}
      <AppRouter routerType={router?.type} />
      {StudioOverlay && (
        <Suspense fallback={null}>
          <StudioOverlay />
        </Suspense>
      )}
    </>
  );
};

/**
 * HAI3Provider - Main wrapper for HAI3 applications
 *
 * Includes:
 * - Redux Provider with UI Core store
 * - AppRouter with dynamic routing
 *
 * Apps only need to:
 * 1. Import theme/screenset registries (auto-register)
 * 2. Register core icons in App component
 * 3. Configure domains in App component
 *
 * @example
 * ```tsx
 * // main.tsx
 * ReactDOM.render(
 *   <HAI3Provider>
 *     <App />
 *   </HAI3Provider>,
 *   root
 * );
 *
 * // App.tsx
 * import '@/themes/themeRegistry';
 * import '@/screensets/screensetRegistry';
 *
 * export const App = () => {
 *   // Register icons, configure domains
 *   return null; // HAI3Provider renders AppRouter
 * };
 * ```
 */
export const HAI3Provider: React.FC<HAI3ProviderProps> = (props) => (
  <Provider store={store}>
    <HAI3ProviderInner {...props} />
  </Provider>
);
