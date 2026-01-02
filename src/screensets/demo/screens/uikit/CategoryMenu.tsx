import React from 'react';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { UIKIT_CATEGORIES, IMPLEMENTED_ELEMENTS, getElementId } from './uikitCategories';
import { ExpandableButton } from '../../uikit/icons/ExpandableButton';
import { MenuItemButton } from '../../uikit/icons/MenuItemButton';
import { DEMO_SCREENSET_ID } from "../../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../../ids";

interface CategoryMenuProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
  activeElementId?: string;
  onElementClick?: (elementId: string) => void;
}

/**
 * Category Menu Component
 * Navigation menu with collapsible categories for UI Kit elements
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const CategoryMenu: React.FC<CategoryMenuProps> = ({
  selectedCategory,
  onCategorySelect,
  activeElementId,
  onElementClick,
}) => {
  const { t } = useTranslation();

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  return (
    <nav className="w-64 border-r border-border pr-4">
      <div className="sticky top-4">
        <TextLoader skeletonClassName="h-4 w-20">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {tk('categories_heading')}
          </h3>
        </TextLoader>
        <div className="space-y-1">
          {UIKIT_CATEGORIES.map((category) => {
            const isExpanded = selectedCategory === category.id;
            const implementedCount = category.elements.filter(el =>
              IMPLEMENTED_ELEMENTS.includes(el)
            ).length;
            const hasImplemented = implementedCount > 0;

            return (
              <div key={category.id} className="space-y-1">
                <ExpandableButton
                  onClick={() => onCategorySelect(category.id)}
                  isExpanded={isExpanded}
                  isActive={isExpanded}
                  badge={hasImplemented ? implementedCount : undefined}
                  showChevron={hasImplemented}
                  disabled={!hasImplemented}
                >
                  {tk(category.translationKey)}
                </ExpandableButton>

                {isExpanded && (
                  <div className="ml-4 space-y-0.5 py-1">
                    {category.elements.map((element) => {
                      const isImplemented = IMPLEMENTED_ELEMENTS.includes(element);
                      if (!isImplemented) return null;

                      const elementId = getElementId(element);
                      const isActiveElement = activeElementId === elementId;

                      const elementTranslationKey = `element_${element.toLowerCase().replace(/\s+/g, '_')}`;

                      return (
                        <MenuItemButton
                          key={element}
                          isActive={isActiveElement}
                          onClick={(e) => {
                            // Blur button to prevent focus-related scroll issues
                            e.currentTarget.blur();
                            onElementClick?.(elementId);
                          }}
                        >
                          {tk(elementTranslationKey)}
                        </MenuItemButton>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-3 bg-muted/50 rounded-md">
          <TextLoader skeletonClassName="h-4 w-full">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">{IMPLEMENTED_ELEMENTS.length}</span> {tk('of')}{' '}
              <span className="font-semibold">
                {UIKIT_CATEGORIES.reduce((acc, cat) => acc + cat.elements.length, 0)}
              </span>{' '}
              {tk('elements_implemented')}
            </p>
          </TextLoader>
        </div>
      </div>
    </nav>
  );
};

CategoryMenu.displayName = 'CategoryMenu';
