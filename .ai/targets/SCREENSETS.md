<!-- @standalone -->
# Screensets Guidelines

## AI WORKFLOW (REQUIRED)
1) Summarize 3-5 rules from this file before proposing changes.
2) REQUIRED: When user provides Figma link, run `npm run check:mcp` first to verify MCP availability.
3) STOP if you add manual styling, custom state management, direct slice imports, or hardcode screenset names.

## SCOPE
- Applies to all screensets under src/screensets/**.
- Screensets may define local actions, events, slices, effects, API services, and localization.

## CRITICAL RULES
- REQUIRED: Use @hai3/uikit components; manual styling only in uikit/base/.
- Data flow must follow EVENTS.md.
- State management must follow @hai3/state Redux+Flux pattern.
- Screensets are isolated; no hardcoded screenset names in shared code.
- Registry imports only the screenset root file.
- No direct slice imports; use @hai3/react hooks or local actions.

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
- REQUIRED: Namespaces: "screenset.id:key" (screenset), "screen.screenset.screen:key" (screen).
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
- REQUIRED: Menu item icons use Iconify string IDs (e.g., "lucide:home", "lucide:globe").
- REQUIRED: Icon strings in menu config (e.g., menuItem: { icon: "lucide:palette" }).
- FORBIDDEN: registerIcons() calls or React.ComponentType in MenuItem.icon field.
- FORBIDDEN: Storing React components as icons (causes Redux serialization warnings).

## SCREENSET UI KIT RULES
- REQUIRED: Prioritize global @hai3/uikit components; create local only if missing.
- REQUIRED: Screenset uikit/ structure: base/, composite/, icons/ (mirrors global).
- REQUIRED: uikit/base/ for rare primitives; needs strong justification.
- REQUIRED: uikit/composite/ for screenset-specific composites (value/onChange).
- FORBIDDEN: @hai3/state or @hai3/framework imports in screensets/*/uikit/ (UI only).
- REQUIRED: Inline styles allowed ONLY in uikit/base/; composite uses theme tokens.

## COMPONENT PLACEMENT RULES
- REQUIRED: Decompose screens into components BEFORE writing screen file.
- REQUIRED: Screen files orchestrate components only.
- FORBIDDEN: Inline component definitions in *Screen.tsx files.
- FORBIDDEN: Inline data arrays; use API services per EVENTS.md.
- REQUIRED: Presentational components (value/onChange only) in screensets/{name}/uikit/.
- REQUIRED: Shared screenset components in screensets/{name}/components/.
- REQUIRED: Screen-local components in screens/{screen}/components/.
- DETECT: eslint local/screen-inline-components

## PRE-DIFF CHECKLIST
- [ ] @hai3/uikit used; local uikit only if missing (inline styles in base/ only).
- [ ] Slices use registerSlice with RootState augmentation.
- [ ] No direct slice imports; no barrel exports in events/ or effects/.
- [ ] Icons exported; API service isolated; events/effects split by domain.
- [ ] All text uses t(); loaders use I18nRegistry.createLoader.
- [ ] useScreenTranslations for screen-level; namespaces: screenset.id, screen.screenset.screen.
- [ ] No inline components or data arrays in *Screen.tsx.
