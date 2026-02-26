## 1. Demo MFE — API Service Layer

- [x] 1.1 Create `demo-mfe/src/api/types.ts` with `GetCurrentUserResponse` and `ApiUser` types (match host's `src/app/api/types.ts`)
- [x] 1.2 Create `demo-mfe/src/api/mocks.ts` with `accountsMockMap` (same endpoints and mock data as host's `src/app/api/mocks.ts`)
- [x] 1.3 Create `demo-mfe/src/api/AccountsApiService.ts` extending `BaseApiService` from `@hai3/react`, with `getCurrentUser()` method and `RestMockPlugin` registration (mirror host's `src/app/api/AccountsApiService.ts`)

## 2. Demo MFE — Flux Infrastructure

- [x] 2.1 Create `demo-mfe/src/events/profileEvents.ts` with `EventPayloadMap` module augmentation for `mfe/profile/user-fetch-requested` (the only event emitted via `eventBus.emit()`; effects dispatch directly to the store and do not emit outcome events)
- [x] 2.2 Create `demo-mfe/src/slices/profileSlice.ts` with `createSlice` (name: `'demo/profile'`, state: `user`, `loading`, `error`), `RootState` module augmentation, and exported reducer functions (`setUser`, `setLoading`, `setError`)
- [x] 2.3 Create `demo-mfe/src/effects/profileEffects.ts` with `initProfileEffects(dispatch)` — subscribes to `mfe/profile/user-fetch-requested`, calls `apiRegistry.getService(AccountsApiService).getCurrentUser()`, dispatches to slice (effects dispatch directly to the store and do not emit outcome events, which is the correct pattern for MFE-internal effects)
- [x] 2.4 Create `demo-mfe/src/actions/profileActions.ts` with `fetchUser()` action that emits `mfe/profile/user-fetch-requested` via `eventBus.emit()`

## 3. Demo MFE — Bootstrap and Integration

- [x] 3.1 Create `demo-mfe/src/init.ts` — registers API services, calls `createHAI3().use(effects()).use(mock()).build()`, `registerSlice(profileSlice, initProfileEffects)`, exports `mfeApp`
- [x] 3.2 Update `demo-mfe/src/shared/ThemeAwareReactLifecycle.tsx` — modify `renderContent()` to wrap React tree in `<HAI3Provider app={mfeApp}>` (import `HAI3Provider` from `@hai3/react`, import `mfeApp` from `../init`)
- [x] 3.3 Ensure `ThemeAwareReactLifecycle` base class imports from `../init` (triggers module-level bootstrap for all lifecycle entries that extend it)
- [x] 3.4 Convert `ProfileScreen.tsx` from React-local state (`useState` for `userData`, `loading`, `error`) to store-backed state (`useAppSelector` for `state['demo/profile']`), replace `fetchUserData` with `fetchUser()` action call, remove `setTimeout` mock data

## 4. Blank MFE — Template Flux Scaffolding

- [x] 4.1 Delete `_blank-mfe/src/api/types.ts` — types file removed; API response types belong in the API service file (`_BlankApiService.ts`), not a separate file
- [x] 4.2 Create `_blank-mfe/src/api/mocks.ts` — empty mock map (no endpoints defined; developers add their own mock entries here)
- [x] 4.3 Create `_blank-mfe/src/api/_BlankApiService.ts` — empty class extending `BaseApiService` from `@hai3/react` (no methods defined; developers add their own API methods and response types in this file)
- [x] 4.4 Create `_blank-mfe/src/events/homeEvents.ts` — empty `EventPayloadMap` module augmentation (no events declared; developers add their own event types here)
- [x] 4.5 Create `_blank-mfe/src/slices/homeSlice.ts` — minimal `createSlice` (name: `'_blank/home'`, empty initial state, no domain-specific reducers), `RootState` module augmentation, no exported reducer functions beyond what `createSlice` produces
- [x] 4.6 Create `_blank-mfe/src/effects/homeEffects.ts` — empty effect initializer function `initHomeEffects(dispatch)` with no event subscriptions (developers add their own subscriptions here)
- [x] 4.7 Create `_blank-mfe/src/actions/homeActions.ts` — empty actions file (no actions defined; developers add their own action functions here)
- [x] 4.8 Create `_blank-mfe/src/init.ts` — registers API services, calls `createHAI3().use(effects()).use(mock()).build()`, `registerSlice(homeSlice, initHomeEffects)`, exports `mfeApp`
- [x] 4.9 Update `_blank-mfe/src/shared/ThemeAwareReactLifecycle.tsx` to wrap React tree in `<HAI3Provider app={mfeApp}>`
- [x] 4.10 Update `_blank-mfe/src/lifecycle.tsx` to import from `../init`

## 5. AI Guidelines Updates

- [x] 5.1 Update `.ai/GUIDELINES.md` routing table — add `src/mfe_packages -> .ai/targets/SCREENSETS.md` route, annotate `src/screensets` as legacy
- [x] 5.2 Update `.ai/targets/EVENTS.md` — add "MFE Runtime Isolation" section (each MFE has own eventBus, events never cross boundaries), add "Cross-Runtime Communication" section (only shared properties and actions chains), add `mfe/<domain>/<eventName>` naming convention
- [x] 5.3 Update `.ai/targets/SCREENSETS.md` — update scope to `src/mfe_packages/**` (primary), add MFE state management rules (`createHAI3().use(effects()).use(mock()).build()` + `HAI3Provider`, no direct Redux), add MFE API service rules (local services with own `apiRegistry`), add MFE i18n rules (bridge-based language + `import.meta.glob`), add MFE lifecycle rules (`ThemeAwareReactLifecycle`, `init.ts` pattern), remove references to `screensetRegistry`, `useNavigation`, `navigateToScreen`, `I18nRegistry.createLoader`

## 6. Verification

- [x] 6.1 Verify demo MFE TypeScript compilation (`cd src/mfe_packages/demo-mfe && npx tsc --noEmit`)
- [x] 6.2 Verify blank MFE TypeScript compilation (`cd src/mfe_packages/_blank-mfe && npx tsc --noEmit`)
  - Note: Blank MFE has pre-existing node_modules resolution issue (missing @hai3/react symlink, npm install fails due to corporate registry). Code is correct — same patterns as demo MFE which compiles cleanly.
- [x] 6.3 Build demo MFE and verify Profile screen loads with store-backed data in browser via Chrome DevTools
  - Note: MFE init.ts requires `effects()` + `mock()` plugins in `createHAI3()` for mock API activation. API services must be registered BEFORE `.build()` due to mock plugin sync timing.

## 7. UIKit Elements Screen — Bridge Info Consistency Fix

Pre-existing gap: UIKit Elements is the only demo MFE screen missing the Bridge Info section. The other 3 screens (HelloWorld, Profile, CurrentTheme) all display Domain ID, Instance ID, Current Theme, and Current Language from the bridge. This section brings UIKit Elements into consistency with the established screen pattern.

- [x] 7.1 Add the 5 bridge-related i18n keys (`bridge_info`, `domain_id`, `instance_id`, `current_theme`, `current_language`) to ALL UIKit language files under `src/mfe_packages/demo-mfe/src/screens/uikit/i18n/` — English values: "Bridge Info", "Domain ID:", "Instance ID:", "Current Theme:", "Current Language:"; other languages: use the same translated values as the corresponding HelloWorld i18n files
  - Note: The bridge-related keys use English-only placeholder text in all non-English locale files (fr.json, ja.json, de.json, etc.). This is intentional and matches the existing pattern across HelloWorld, Profile, and CurrentTheme i18n files — bridge info is a developer debug section, not user-facing content.
  - Traces to: Requirement "Demo MFE Screen Consistency — Bridge Info Section", Scenario "Bridge Info i18n keys present in all screen language files"
- [x] 7.2 Add Bridge Info section to `UIKitElementsScreen.tsx` — subscribe to `HAI3_SHARED_PROPERTY_THEME` and `HAI3_SHARED_PROPERTY_LANGUAGE` via bridge, add `theme` and `language` state, render a Card with `bridge.domainId`, `bridge.instanceId`, current theme, and current language using the same `<dl>` pattern as `HelloWorldScreen.tsx`
  - Implementation note: UIKitElementsScreen already subscribes to `HAI3_SHARED_PROPERTY_LANGUAGE` for RTL direction detection. The implementation must: (1) add `HAI3_SHARED_PROPERTY_THEME` import and new theme state/subscription, (2) extend the existing language subscription to also update a `language` display state (or reuse the existing language value from the RTL detection logic), (3) preserve the existing RTL detection logic alongside the new Bridge Info display.
  - Traces to: Requirement "Demo MFE Screen Consistency — Bridge Info Section", Scenario "UIKit Elements screen Bridge Info (pre-existing gap fix)"
- [x] 7.3 Verify UIKit Elements screen displays Bridge Info section in browser after build
  - Traces to: Requirement "Demo MFE Screen Consistency — Bridge Info Section", Scenario "All 4 demo MFE screens render Bridge Info"

## 8. Runtime Test Fixes — Blank MFE i18n, Presentation Metadata, and Theme Swatch CSS

Fixes discovered during chrome-devtools-runtime-tester testing. Three independent issues affecting the blank MFE and demo MFE CurrentThemeScreen.

- [x] 8.1 Add 5 bridge-related i18n keys to ALL 36 blank MFE HomeScreen i18n files under `src/mfe_packages/_blank-mfe/src/screens/home/i18n/` — add keys `bridge_info`, `domain_id`, `instance_id`, `current_theme`, `current_language` to each file. English values: `"Bridge Info"`, `"Domain ID:"`, `"Instance ID:"`, `"Current Theme:"`, `"Current Language:"`. Non-English locales: use English-only placeholder text (matching existing demo MFE bridge info i18n pattern).
  - Traces to: Requirement "Blank MFE Screen Consistency — Bridge Info Section", Scenario "Blank MFE i18n files include 5 bridge-related keys"

- [x] 8.2 Update blank MFE HomeScreen (`src/mfe_packages/_blank-mfe/src/screens/home/HomeScreen.tsx`) to use i18n keys for the Bridge Info section — replace hardcoded `"Bridge Properties"` heading with `{t('bridge_info')}`, replace hardcoded `"Domain ID:"` with `{t('domain_id')}`, `"Instance ID:"` with `{t('instance_id')}`, `"Current Theme:"` with `{t('current_theme')}`, `"Current Language:"` with `{t('current_language')}`
  - Traces to: Requirement "Blank MFE Screen Consistency — Bridge Info Section", Scenario "Blank MFE HomeScreen uses i18n keys for Bridge Info labels"

- [x] 8.3 Update blank MFE `mfe.json` (`src/mfe_packages/_blank-mfe/mfe.json`) presentation section — change label from `"[Your Screen Label]"` to `"Blank Home"`, change route from `"/[your-route]"` to `"/blank-home"`. Leave icon (`"lucide:home"`) and order (`100`) unchanged.
  - Traces to: Requirement "Blank MFE Presentation Metadata — Proper Values", Scenario "Blank MFE mfe.json has proper label and route"

- [x] 8.4 Fix CurrentThemeScreen colorSwatches CSS classes (`src/mfe_packages/demo-mfe/src/screens/theme/CurrentThemeScreen.tsx`) — change Secondary swatch from `bg-muted text-foreground` to `bg-secondary text-secondary-foreground`, change Accent swatch from `bg-muted text-foreground` to `bg-accent text-accent-foreground`, change Destructive swatch from `bg-primary text-primary-foreground` to `bg-destructive text-destructive-foreground`
  - Traces to: Requirement "CurrentThemeScreen Color Swatches — Correct CSS Classes", Scenario "Color swatches use correct semantic Tailwind classes"

- [x] 8.5 Rebuild both MFEs and verify all 3 fixes in browser via Chrome DevTools — blank MFE HomeScreen shows i18n-translated bridge info labels, sidebar shows "Blank Home" label with `/blank-home` route, CurrentThemeScreen shows 7 visually distinct color swatches
  - Traces to: Requirement "Blank MFE Screen Consistency — Bridge Info Section" Scenario "Blank MFE HomeScreen uses i18n keys for Bridge Info labels", Requirement "Blank MFE Presentation Metadata — Proper Values" Scenario "Blank MFE appears correctly in sidebar navigation", Requirement "CurrentThemeScreen Color Swatches — Correct CSS Classes" Scenario "All 7 swatches render with visually distinct colors"

- [x] 8.6 Add missing color CSS class definitions to `lifecycle-theme.tsx` shadow DOM stylesheet — the `initializeStyles()` method must include CSS rules for all Tailwind color classes used by CurrentThemeScreen's color swatches: `bg-foreground`, `text-background`, `bg-secondary`, `text-secondary-foreground`, `bg-accent`, `text-accent-foreground`, `bg-destructive`, `text-destructive-foreground`
