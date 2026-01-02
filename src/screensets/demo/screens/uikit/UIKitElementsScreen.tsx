import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation, useScreenTranslations, I18nRegistry, Language } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { CategoryMenu } from './CategoryMenu';
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../../ids";
import { DEMO_SCREENSET_ID } from "../../ids";
import { UIKIT_CATEGORIES, IMPLEMENTED_ELEMENTS, getElementId } from './uikitCategories';

/**
 * UIKit screen translations (loaded lazily when screen mounts)
 */
const translations = I18nRegistry.createLoader({
  [Language.English]: () => import('./i18n/en.json'),
  [Language.Arabic]: () => import('./i18n/ar.json'),
  [Language.Bengali]: () => import('./i18n/bn.json'),
  [Language.Czech]: () => import('./i18n/cs.json'),
  [Language.Danish]: () => import('./i18n/da.json'),
  [Language.German]: () => import('./i18n/de.json'),
  [Language.Greek]: () => import('./i18n/el.json'),
  [Language.Spanish]: () => import('./i18n/es.json'),
  [Language.Persian]: () => import('./i18n/fa.json'),
  [Language.Finnish]: () => import('./i18n/fi.json'),
  [Language.French]: () => import('./i18n/fr.json'),
  [Language.Hebrew]: () => import('./i18n/he.json'),
  [Language.Hindi]: () => import('./i18n/hi.json'),
  [Language.Hungarian]: () => import('./i18n/hu.json'),
  [Language.Indonesian]: () => import('./i18n/id.json'),
  [Language.Italian]: () => import('./i18n/it.json'),
  [Language.Japanese]: () => import('./i18n/ja.json'),
  [Language.Korean]: () => import('./i18n/ko.json'),
  [Language.Malay]: () => import('./i18n/ms.json'),
  [Language.Dutch]: () => import('./i18n/nl.json'),
  [Language.Norwegian]: () => import('./i18n/no.json'),
  [Language.Polish]: () => import('./i18n/pl.json'),
  [Language.Portuguese]: () => import('./i18n/pt.json'),
  [Language.Romanian]: () => import('./i18n/ro.json'),
  [Language.Russian]: () => import('./i18n/ru.json'),
  [Language.Swedish]: () => import('./i18n/sv.json'),
  [Language.Swahili]: () => import('./i18n/sw.json'),
  [Language.Tamil]: () => import('./i18n/ta.json'),
  [Language.Thai]: () => import('./i18n/th.json'),
  [Language.Tagalog]: () => import('./i18n/tl.json'),
  [Language.Turkish]: () => import('./i18n/tr.json'),
  [Language.Ukrainian]: () => import('./i18n/uk.json'),
  [Language.Urdu]: () => import('./i18n/ur.json'),
  [Language.Vietnamese]: () => import('./i18n/vi.json'),
  [Language.ChineseSimplified]: () => import('./i18n/zh.json'),
  [Language.ChineseTraditional]: () => import('./i18n/zh-TW.json'),
});

// Dynamic imports for element components (code splitting)
// Each component will be loaded only when its category is selected
const DataDisplayElements = lazy(() =>
  import('../../components/DataDisplayElements').then(m => ({ default: m.DataDisplayElements }))
);
const LayoutElements = lazy(() =>
  import('../../components/LayoutElements').then(m => ({ default: m.LayoutElements }))
);
const ActionElements = lazy(() =>
  import('../../components/ActionElements').then(m => ({ default: m.ActionElements }))
);
const FeedbackElements = lazy(() =>
  import('../../components/FeedbackElements').then(m => ({ default: m.FeedbackElements }))
);
const MediaElements = lazy(() =>
  import('../../components/MediaElements').then(m => ({ default: m.MediaElements }))
);
const FormElements = lazy(() =>
  import('../../components/FormElements').then(m => ({ default: m.FormElements }))
);
const OverlayElements = lazy(() =>
  import('../../components/OverlayElements').then(m => ({ default: m.OverlayElements }))
);
const DisclosureElements = lazy(() =>
  import('../../components/DisclosureElements').then(m => ({ default: m.DisclosureElements }))
);
const NavigationElements = lazy(() =>
  import('../../components/NavigationElements').then(m => ({ default: m.NavigationElements }))
);

/**
 * UI Kit Elements Screen
 * Demo page with available UI Kit elements and styles annotations
 */
export const UIKitElementsScreen: React.FC = () => {
  // Register translations for this screen
  useScreenTranslations(DEMO_SCREENSET_ID, UI_KIT_ELEMENTS_SCREEN_ID, translations);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('layout');
  const [activeElementId, setActiveElementId] = useState<string>('');
  const { t } = useTranslation();

  // Set initial active element on mount
  useEffect(() => {
    if (selectedCategory && !activeElementId) {
      const category = UIKIT_CATEGORIES.find(cat => cat.id === selectedCategory);
      if (category) {
        const firstImplementedElement = category.elements.find(el =>
          IMPLEMENTED_ELEMENTS.includes(el)
        );
        if (firstImplementedElement) {
          const elementId = getElementId(firstImplementedElement);
          setActiveElementId(elementId);
        }
      }
    }
  }, [selectedCategory, activeElementId]);

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);

    // Find first implemented element in the category and set it as active
    const category = UIKIT_CATEGORIES.find(cat => cat.id === categoryId);
    if (category) {
      const firstImplementedElement = category.elements.find(el =>
        IMPLEMENTED_ELEMENTS.includes(el)
      );
      if (firstImplementedElement) {
        const elementId = getElementId(firstImplementedElement);
        setActiveElementId(elementId);

        // Use requestAnimationFrame to ensure DOM has settled before scrolling
        requestAnimationFrame(() => {
          const targetElement = document.querySelector(`[data-element-id="${elementId}"]`);
          const scrollContainer = document.querySelector('main');
          if (targetElement && scrollContainer) {
            // Calculate scroll position relative to the scroll container
            const containerRect = scrollContainer.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop + targetRect.top - containerRect.top;
            scrollContainer.scrollTo({ top: scrollTop, behavior: 'auto' });
          }
        });
      }
    }
  };

  // Handle element click from menu
  const handleElementClick = (elementId: string) => {
    setActiveElementId(elementId);
    // Use requestAnimationFrame to ensure DOM has settled before scrolling
    requestAnimationFrame(() => {
      const targetElement = document.querySelector(`[data-element-id="${elementId}"]`);
      const scrollContainer = document.querySelector('main');
      if (targetElement && scrollContainer) {
        // Calculate scroll position relative to the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop + targetRect.top - containerRect.top;
        scrollContainer.scrollTo({ top: scrollTop, behavior: 'auto' });
      }
    });
  };

  // Render the appropriate category component
  const renderCategoryElements = () => {
    switch (selectedCategory) {
      case 'data-display':
        return <DataDisplayElements />;
      case 'layout':
        return <LayoutElements />;
      case 'actions':
        return <ActionElements />;
      case 'feedback':
        return <FeedbackElements />;
      case 'media':
        return <MediaElements />;
      case 'forms':
        return <FormElements />;
      case 'overlays':
        return <OverlayElements />;
      case 'disclosure':
        return <DisclosureElements />;
      case 'navigation':
        return <NavigationElements />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              Select a category from the menu to view elements
            </p>
          </div>
        );
    }
  };


  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-10 w-48">
          <h1 className="text-4xl font-bold">
            {t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:title`)}
          </h1>
        </TextLoader>
        <TextLoader skeletonClassName="h-6 w-full">
          <p className="text-muted-foreground">
            {t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:description`)}
          </p>
        </TextLoader>
      </div>

      <div className="flex gap-8">
        {/* Category Navigation */}
        <CategoryMenu
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          activeElementId={activeElementId}
          onElementClick={handleElementClick}
        />

        {/* Content Area */}
        <div className="flex-1 max-w-3xl flex flex-col gap-8">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <TextLoader skeletonClassName="h-8 w-full">
                <p className="text-muted-foreground">Loading elements...</p>
              </TextLoader>
            </div>
          }>
            {renderCategoryElements()}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

UIKitElementsScreen.displayName = 'UIKitElementsScreen';

// Default export for lazy loading
export default UIKitElementsScreen;
