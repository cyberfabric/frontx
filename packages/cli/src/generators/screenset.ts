import type { GeneratedFile, ScreensetCategory } from '../core/types.js';
import { toPascalCase, toScreamingSnake } from './utils.js';
import { generateI18nStubs, generateTranslationLoader } from './i18n.js';

/**
 * Input for screenset generation
 */
export interface ScreensetGeneratorInput {
  /** Screenset ID (camelCase) */
  screensetId: string;
  /** Initial screen ID (camelCase) */
  initialScreenId: string;
  /** Screenset category */
  category: ScreensetCategory;
}

/**
 * Map category string to enum value
 */
function getCategoryEnum(category: ScreensetCategory): string {
  const map: Record<ScreensetCategory, string> = {
    drafts: 'ScreensetCategory.Drafts',
    mockups: 'ScreensetCategory.Mockups',
    production: 'ScreensetCategory.Production',
  };
  return map[category];
}

/**
 * Generate complete screenset with initial screen
 */
export function generateScreenset(
  input: ScreensetGeneratorInput
): GeneratedFile[] {
  const { screensetId, initialScreenId, category } = input;
  const screensetName = toPascalCase(screensetId);
  const screenName = toPascalCase(initialScreenId);
  const screensetConstName = toScreamingSnake(screensetId);
  const screenConstName = toScreamingSnake(initialScreenId);
  const basePath = `src/screensets/${screensetId}`;

  const files: GeneratedFile[] = [];

  // 1. ids.ts
  files.push({
    path: `${basePath}/ids.ts`,
    content: `/**
 * ${screensetName} Screenset IDs
 *
 * ALL unique identifiers for this screenset in one place.
 * When duplicating this screenset, ONLY change the values in this file.
 * Everything else (events, icons, API domains, translations) will auto-update via template literals.
 */

/**
 * Screenset ID
 * Used for: Redux slice name, event namespace, icon namespace, API domain, translations
 */
export const ${screensetConstName}_SCREENSET_ID = '${screensetId}';

/**
 * Screen IDs
 * Used for: Screen routing, screen-level translations
 */
export const ${screenConstName}_SCREEN_ID = '${initialScreenId}';
`,
  });

  // 2. Screenset config
  const translationLoader = generateTranslationLoader('./i18n');
  files.push({
    path: `${basePath}/${screensetId}Screenset.tsx`,
    content: `import { type ScreensetConfig, ScreensetCategory, I18nRegistry, Language, screensetRegistry } from '@hai3/react';
import { ${screensetConstName}_SCREENSET_ID, ${screenConstName}_SCREEN_ID } from './ids';

/**
 * Screenset-level translations
 * All 36 languages must be provided for type safety
 */
const screensetTranslations = ${translationLoader};

/**
 * ${screensetName} Screenset Configuration
 * Self-contained - knows about its own screens, icons, translations, and structure
 * All screens are lazy-loaded for optimal performance
 */
export const ${screensetId}Screenset: ScreensetConfig = {
  id: ${screensetConstName}_SCREENSET_ID,
  name: '${screensetName}',
  category: ${getCategoryEnum(category)},
  defaultScreen: ${screenConstName}_SCREEN_ID,
  localization: screensetTranslations,
  menu: [
    {
      menuItem: {
        id: ${screenConstName}_SCREEN_ID,
        label: \`screenset.\${${screensetConstName}_SCREENSET_ID}:screens.\${${screenConstName}_SCREEN_ID}.title\`,
        icon: 'lucide:home',
      },
      screen: () => import('./screens/${initialScreenId}/${screenName}Screen'),
    },
  ],
};

/**
 * Self-register screenset
 * Auto-discovered via Vite glob import in screensetRegistry.tsx
 */
screensetRegistry.register(${screensetId}Screenset);
`,
  });

  // 3. Screenset-level i18n
  files.push(
    ...generateI18nStubs({
      basePath: `${basePath}/i18n`,
      translations: {
        [`screens.${initialScreenId}.title`]: screenName,
      },
    })
  );

  // 4. Initial screen
  const screenTranslationLoader = generateTranslationLoader('./i18n');
  files.push({
    path: `${basePath}/screens/${initialScreenId}/${screenName}Screen.tsx`,
    content: `import React from 'react';
import { useTranslation, useScreenTranslations, I18nRegistry, Language } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { ${screensetConstName}_SCREENSET_ID, ${screenConstName}_SCREEN_ID } from '../../ids';

/**
 * ${screenName} screen translations (loaded lazily when screen mounts)
 */
const translations = ${screenTranslationLoader};

/**
 * ${screenName} Screen
 * Uses TextLoader for automatic translation loading states
 * Registers its own translations lazily when component mounts
 */
export const ${screenName}Screen: React.FC = () => {
  // Register translations for this screen
  useScreenTranslations(${screensetConstName}_SCREENSET_ID, ${screenConstName}_SCREEN_ID, translations);

  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 p-8">
      <TextLoader skeletonClassName="h-10 w-64">
        <h1 className="text-4xl font-bold">
          {t(\`screen.\${${screensetConstName}_SCREENSET_ID}.\${${screenConstName}_SCREEN_ID}:title\`)}
        </h1>
      </TextLoader>
      <TextLoader skeletonClassName="h-6 w-96">
        <p className="text-muted-foreground">
          {t(\`screen.\${${screensetConstName}_SCREENSET_ID}.\${${screenConstName}_SCREEN_ID}:description\`)}
        </p>
      </TextLoader>
    </div>
  );
};

${screenName}Screen.displayName = '${screenName}Screen';

// Default export for lazy loading
export default ${screenName}Screen;
`,
  });

  // 5. Screen-level i18n
  files.push(
    ...generateI18nStubs({
      basePath: `${basePath}/screens/${initialScreenId}/i18n`,
      translations: {
        title: screenName,
        description: `Welcome to the ${screenName} screen.`,
      },
    })
  );

  return files;
}
