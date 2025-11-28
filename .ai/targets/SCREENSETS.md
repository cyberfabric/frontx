<!-- @standalone -->
# Screensets Guidelines

## AI WORKFLOW (REQUIRED)
1) Summarize 3-5 rules from this file before proposing changes.
2) STOP if you add manual styling, custom state management, direct slice imports, or hardcode screenset names.

## SCOPE
- Applies to all screensets under src/screensets/**.
- Screensets may define local actions, events, slices, effects, API services, and localization.

## CRITICAL RULES
- Manual styling is FORBIDDEN; use @hai3/uikit components only.
- Data flow must follow EVENTS.md.
- State management must follow @hai3/uicore Redux+Flux pattern.
- Screensets are isolated; no hardcoded screenset names in shared code.
- Registry imports only the screenset root file.
- No direct slice imports; use @hai3/uicore or local actions.

## STATE MANAGEMENT RULES
- REQUIRED: Export slice object (not just reducer) as default from slice files.
- REQUIRED: registerSlice(sliceObject, initEffects) passes slice object directly.
- REQUIRED: Split screenset into domains (threads, messages, settings, etc).
- REQUIRED: Domain-specific folders: slices/, actions/, events/, effects/.
- REQUIRED: Events split into domain files with local DOMAIN_ID.
- REQUIRED: Effects split into domain files; each slice registers its own effects.
- FORBIDDEN: Object.defineProperty on reducers.
- FORBIDDEN: Exporting only reducer from slice files.
- FORBIDDEN: Coordinator effects files.
- FORBIDDEN: Monolithic slice/events/effects files.
- FORBIDDEN: Barrel exports in events/ or effects/.
- REQUIRED: RootState augmentation in screenset store files.
- FORBIDDEN: Zustand-style stores, custom stores, manual subscribe/notify.
- DETECT: grep -rn "class.*Store\\|subscribe.*listener" src/screensets/*/
- DETECT: grep -rn "events/index\\|effects/index" src/screensets
- DETECT: grep -rn "chatEffects\\|demoEffects" src/screensets
- DETECT: grep -rn "Object\\.defineProperty.*reducer" src/screensets

## DRAFT ENTITY PATTERN
- REQUIRED: Create draft entities locally before backend save.
- REQUIRED: Use isDraft: true and temporary IDs.
- REQUIRED: Replace draft with persisted entity from backend.
- REQUIRED: Entity data must not contain i18n strings; UI handles translation.
- FORBIDDEN: Hardcoded i18n values in entity data.
- DETECT: grep -rn "t(.*new_.*)" src/screensets/*/

## LOCALIZATION RULES
- REQUIRED: Two-tier system: screenset-level and screen-level translations.
- REQUIRED: Screenset-level: localization: TranslationLoader in config.
- REQUIRED: Screen-level: useScreenTranslations(screensetId, screenId, loader).
- REQUIRED: Use I18nRegistry.createLoader with full language map.
- REQUIRED: Screenset namespace: "screenset.id:key".
- REQUIRED: Screen namespace: "screen.screenset.screen:key".
- REQUIRED: Place translations in local i18n folders for screenset and screen.
- REQUIRED: Wrap translated text with <TextLoader>.
- FORBIDDEN: Hardcoded strings or partial language sets.
- DETECT: grep -R "['\"] [A-Za-z].* " src/screensets

## API SERVICE RULES
- REQUIRED: Screenset-local API services in src/screensets/*/api/.
- REQUIRED: Unique domain constant per screenset.
- REQUIRED: Import API service in screenset root for registration.
- REQUIRED: Actions import from local api folder.
- FORBIDDEN: Centralized src/api/ directory.
- FORBIDDEN: Sharing API services between screensets.
- DETECT: grep -rn "@/api/services" src/

## ICON RULES
- Screenset icons defined and registered in screenset root.
- Icon IDs exported as constants.
- Screenset icons do not go into UiKitIcon enum.

## SCREENSET UI KIT RULES
- Local components under src/screensets/*/uikit/ must follow UIKIT.md.

## UI KIT DECISION TREE
1) Use existing @hai3/uikit component.
2) If missing, generate via "npx shadcn add".
3) Composite belongs in @hai3/uikit/composite.
4) Screenset-specific components stay local.
5) Manual styling is never allowed.

## PRE-DIFF CHECKLIST
- [ ] No manual styling.
- [ ] No custom store patterns.
- [ ] Slices registered with registerSlice.
- [ ] RootState augmented in screenset store.
- [ ] No direct slice imports.
- [ ] Icons exported and registered.
- [ ] Screenset-local API service present, registered, and isolated.
- [ ] All text uses t().
- [ ] Screenset and screen loaders use I18nRegistry.createLoader.
- [ ] useScreenTranslations used for screen-level translations.
- [ ] Namespaces follow screenset.id and screen.screenset.screen.
- [ ] No barrel exports in events/ or effects/.
- [ ] Events and effects split by domain.
- [ ] Data flow rules from EVENTS.md are followed.