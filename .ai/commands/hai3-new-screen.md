<!-- @standalone -->
# hai3:new-screen - Add New Screen

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/SCREENSETS.md before starting.
2) Gather requirements from user.
3) Follow steps below.

## GATHER REQUIREMENTS
Ask user for:
- Screenset path (e.g., src/screensets/chat).
- Screen name (camelCase).
- Add to menu? (Y/N)

## STEP 1: Add Screen ID to ids.ts
File: src/screensets/{screenset}/ids.ts
Add: export const NEW_SCREEN_ID = 'newScreen';

## STEP 2: Create Screen Directory
```bash
mkdir -p src/screensets/{screenset}/screens/{screen-name}/i18n
```

## STEP 3: Create Screen i18n Files
Create ALL 36 language files in screens/{screen-name}/i18n/.

## STEP 4: Create Screen Component
File: src/screensets/{screenset}/screens/{screen-name}/{ScreenName}Screen.tsx
- Import useScreenTranslations, useTranslation, I18nRegistry, Language from @hai3/uicore.
- Import SCREENSET_ID and SCREEN_ID from ../../ids.
- Create translation loader with I18nRegistry.createLoader() for ALL 36 languages.
- Call useScreenTranslations(SCREENSET_ID, SCREEN_ID, translations) in component.
- Use t() with keys: screen.${SCREENSET_ID}.${SCREEN_ID}:key.
- Wrap translated text with TextLoader.
- Add displayName property.
- Export default for lazy loading.

## STEP 5: If Adding to Menu
Edit src/screensets/{screenset}/{screenset}Screenset.tsx menu array:
- Add menuItem with id, label (translation key), optional icon.
- Add screen lazy loader: () => import('./screens/{screen-name}/{ScreenName}Screen').

## STEP 6: Validate
```bash
npm run type-check && npm run lint
```

## STEP 7: Test via Chrome MCP
STOP: If MCP WebSocket is closed, fix first.
- Navigate to screenset.
- Navigate to new screen.
- Verify 0 console errors.
- Verify translations load correctly.
