/**
 * UI Kit Element Categories
 * Organized grouping of all UI Kit elements
 */

import { toLower } from 'lodash';

export interface UIKitCategory {
  id: string;
  label: string;
  translationKey: string;
  elements: string[];
}

export const UIKIT_CATEGORIES: UIKitCategory[] = [
  {
    id: 'layout',
    label: 'Layout & Structure',
    translationKey: 'category_layout',
    elements: [
      'Aspect Ratio',
      'Card',
      'Dialog',
      'Drawer',
      'Resizable',
      'Scroll Area',
      'Separator',
      'Sheet',
      'Sidebar',
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    translationKey: 'category_navigation',
    elements: [
      'Breadcrumb',
      'Menubar',
      'Navigation Menu',
      'Pagination',
      'Tabs',
    ],
  },
  {
    id: 'forms',
    label: 'Forms & Inputs',
    translationKey: 'category_forms',
    elements: [
      'Calendar',
      'Checkbox',
      'Combobox',
      'Date Picker',
      'Field',
      'Form',
      'Input',
      'Input Group',
      'Input OTP',
      'Label',
      'Native Select',
      'Radio Group',
      'Select',
      'Switch',
      'Textarea',
    ],
  },
  {
    id: 'actions',
    label: 'Actions & Buttons',
    translationKey: 'category_actions',
    elements: [
      'Button',
      'Button Group',
      'Command',
      'Toggle',
      'Toggle Group',
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback & Status',
    translationKey: 'category_feedback',
    elements: [
      'Alert',
      'Alert Dialog',
      'Empty',
      'Progress',
      'Skeleton',
      'Sonner',
      'Spinner',
      'Toast',
    ],
  },
  {
    id: 'data-display',
    label: 'Data Display',
    translationKey: 'category_data_display',
    elements: [
      'Avatar',
      'Badge',
      'Chart',
      'Data Table',
      'Item',
      'Kbd',
      'Table',
      'Typography',
    ],
  },
  {
    id: 'overlays',
    label: 'Overlays & Popovers',
    translationKey: 'category_overlays',
    elements: [
      'Context Menu',
      'Dropdown Menu',
      'Hover Card',
      'Popover',
      'Tooltip',
    ],
  },
  {
    id: 'media',
    label: 'Media & Content',
    translationKey: 'category_media',
    elements: [
      'Carousel',
      'Slider',
    ],
  },
  {
    id: 'disclosure',
    label: 'Disclosure',
    translationKey: 'category_disclosure',
    elements: [
      'Accordion',
      'Collapsible',
    ],
  },
];

/**
 * Get category by ID
 */
export function getCategoryById(categoryId: string): UIKitCategory | undefined {
  return UIKIT_CATEGORIES.find(cat => cat.id === categoryId);
}

/**
 * Get category ID for an element
 */
export function getCategoryIdForElement(elementName: string): string | undefined {
  const category = UIKIT_CATEGORIES.find(cat =>
    cat.elements.includes(elementName)
  );
  return category?.id;
}

/**
 * Get normalized element ID (for DOM IDs)
 */
export function getElementId(elementName: string): string {
  return `element-${toLower(elementName).replace(/\s+/g, '-')}`;
}

/**
 * Currently implemented elements (matching UIKitElementsScreen)
 */
export const IMPLEMENTED_ELEMENTS = [
  'Accordion',
  'Aspect Ratio',
  'Avatar',
  'Badge',
  'Breadcrumb',
  'Button',
  'Calendar',
  'Card',
  'Carousel',
  'Checkbox',
  'Chart',
  'Collapsible',
  'Context Menu',
  'Data Table',
  'Date Picker',
  'Dialog',
  'Drawer',
  'Dropdown Menu',
  'Hover Card',
  'Input',
  'Input Group',
  'Input OTP',
  'Field',
  'Form',
  'Item',
  'Label',
  'Menubar',
  'Native Select',
  'Navigation Menu',
  'Pagination',
  'Popover',
  'Progress',
  'Radio Group',
  'Resizable',
  'Scroll Area',
  'Select',
  'Separator',
  'Sheet',
  'Skeleton',
  'Slider',
  'Spinner',
  'Switch',
  'Table',
  'Tabs',
  'Textarea',
  'Tooltip',
];
