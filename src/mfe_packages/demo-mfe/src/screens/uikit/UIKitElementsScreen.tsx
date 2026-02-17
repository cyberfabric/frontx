/**
 * UIKit Elements Screen
 *
 * Comprehensive showcase of all UIKit components available in HAI3.
 * Features:
 * - CategoryMenu with 9 categories
 * - 56 element demos using real UIKit components
 * - Lazy loading for category components
 * - Scroll-to-element navigation
 * - i18n support for all text
 * - Theme and language reactivity via bridge
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ChildMfeBridge } from '@hai3/react';
import { HAI3_SHARED_PROPERTY_LANGUAGE } from '@hai3/react';
import { useScreenTranslations } from '../../shared/useScreenTranslations';
import { CategoryMenu } from './components/CategoryMenu';
import { Skeleton, Toaster, TooltipProvider } from '@hai3/uikit';

// Lazy-loaded category components
const LayoutElements = lazy(() =>
  import('./components/LayoutElements').then((m) => ({ default: m.LayoutElements }))
);
const NavigationElements = lazy(() =>
  import('./components/NavigationElements').then((m) => ({ default: m.NavigationElements }))
);
const FormElements = lazy(() =>
  import('./components/FormElements').then((m) => ({ default: m.FormElements }))
);
const ActionElements = lazy(() =>
  import('./components/ActionElements').then((m) => ({ default: m.ActionElements }))
);
const FeedbackElements = lazy(() =>
  import('./components/FeedbackElements').then((m) => ({ default: m.FeedbackElements }))
);
const DataDisplayElements = lazy(() =>
  import('./components/DataDisplayElements').then((m) => ({ default: m.DataDisplayElements }))
);
const OverlayElements = lazy(() =>
  import('./components/OverlayElements').then((m) => ({ default: m.OverlayElements }))
);
const MediaElements = lazy(() =>
  import('./components/MediaElements').then((m) => ({ default: m.MediaElements }))
);
const DisclosureElements = lazy(() =>
  import('./components/DisclosureElements').then((m) => ({ default: m.DisclosureElements }))
);

interface UIKitElementsScreenProps {
  bridge: ChildMfeBridge;
}

// Stable reference for translation modules (hoisted to module level to prevent re-render loops)
const languageModules = import.meta.glob('./i18n/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, string> }>
>;

/**
 * UIKit Elements Screen component.
 *
 * Displays a comprehensive showcase of all UIKit components with:
 * - CategoryMenu navigation
 * - Lazy-loaded category sections
 * - Scroll-to-element functionality
 * - Full i18n support
 * - Theme and language reactivity
 */
export const UIKitElementsScreen: React.FC<UIKitElementsScreenProps> = ({ bridge }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeElement, setActiveElement] = useState<string | undefined>();

  // Load translations
  const { t, loading: translationsLoading } = useScreenTranslations(languageModules, bridge);

  // Handle RTL languages
  useEffect(() => {
    // Read initial language for RTL
    const initialLang = bridge.getProperty(HAI3_SHARED_PROPERTY_LANGUAGE);
    if (initialLang && typeof initialLang.value === 'string') {
      const rootNode = containerRef.current?.getRootNode();
      if (rootNode && 'host' in rootNode) {
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        const direction = rtlLanguages.includes(initialLang.value) ? 'rtl' : 'ltr';
        (rootNode.host as HTMLElement).dir = direction;
      }
    }

    const languageUnsubscribe = bridge.subscribeToProperty(HAI3_SHARED_PROPERTY_LANGUAGE, (property) => {
      if (typeof property.value === 'string') {
        const rootNode = containerRef.current?.getRootNode();
        if (rootNode && 'host' in rootNode) {
          const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
          const direction = rtlLanguages.includes(property.value) ? 'rtl' : 'ltr';
          (rootNode.host as HTMLElement).dir = direction;
        }
      }
    });

    return languageUnsubscribe;
  }, [bridge]);

  // Track active element on scroll (intersection observer)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id.startsWith('element-')) {
            setActiveElement(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -50% 0px' }
    );

    // Query elements from the correct root (shadow DOM or light DOM)
    const root = containerRef.current?.getRootNode();
    let elements: NodeListOf<Element>;

    if (root && root instanceof ShadowRoot) {
      // Inside Shadow DOM: query from shadow root
      elements = root.querySelectorAll('[id^="element-"]');
    } else {
      // Fallback to light DOM for compatibility
      elements = document.querySelectorAll('[id^="element-"]');
    }

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  if (translationsLoading) {
    return (
      <div ref={containerRef} className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div ref={containerRef} className="flex gap-6 p-8">
        {/* Sidebar Menu */}
        <aside className="w-64 flex-shrink-0">
          <CategoryMenu t={t} activeElement={activeElement} containerRef={containerRef} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
            <p className="text-lg text-muted-foreground">{t('description')}</p>
          </div>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <LayoutElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <NavigationElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <FormElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <ActionElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <FeedbackElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <DataDisplayElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <OverlayElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <MediaElements t={t} />
          </Suspense>

          <Suspense
            fallback={
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            }
          >
            <DisclosureElements t={t} />
          </Suspense>
        </main>

        {/* Toast container (rendered once at screen level) */}
        <Toaster />
      </div>
    </TooltipProvider>
  );
};

UIKitElementsScreen.displayName = 'UIKitElementsScreen';
