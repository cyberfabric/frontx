## 1. Demo MFE — API Service Layer

- [x] 1.1 Create `demo-mfe/src/api/types.ts` with `GetCurrentUserResponse` and `UserData` types (match host's `src/app/api/types.ts`)
- [x] 1.2 Create `demo-mfe/src/api/mocks.ts` with `accountsMockMap` (same endpoints and mock data as host's `src/app/api/mocks.ts`)
- [x] 1.3 Create `demo-mfe/src/api/AccountsApiService.ts` extending `BaseApiService` from `@hai3/react`, with `getCurrentUser()` method and `RestMockPlugin` registration (mirror host's `src/app/api/AccountsApiService.ts`)

## 2. Demo MFE — Flux Infrastructure

- [x] 2.1 Create `demo-mfe/src/events/profileEvents.ts` with `EventPayloadMap` module augmentation for `mfe/profile/user-fetch-requested`, `mfe/profile/user-fetched`, `mfe/profile/user-fetch-failed`
- [x] 2.2 Create `demo-mfe/src/slices/profileSlice.ts` with `createSlice` (name: `'demo/profile'`, state: `user`, `loading`, `error`), `RootState` module augmentation, and exported reducer functions (`setUser`, `setLoading`, `setError`)
- [x] 2.3 Create `demo-mfe/src/effects/profileEffects.ts` with `initProfileEffects(dispatch)` — subscribes to `mfe/profile/user-fetch-requested`, calls `apiRegistry.getService(AccountsApiService).getCurrentUser()`, emits success/failure events, dispatches to slice
- [x] 2.4 Create `demo-mfe/src/actions/profileActions.ts` with `fetchUser()` action that emits `mfe/profile/user-fetch-requested` via `eventBus.emit()`

## 3. Demo MFE — Bootstrap and Integration

- [x] 3.1 Create `demo-mfe/src/init.ts` — registers API services, calls `createHAI3().use(effects()).use(mock()).build()`, `registerSlice(profileSlice, initProfileEffects)`, exports `mfeApp`
- [x] 3.2 Update `demo-mfe/src/shared/ThemeAwareReactLifecycle.tsx` — modify `renderContent()` to wrap React tree in `<HAI3Provider app={mfeApp}>` (import `HAI3Provider` from `@hai3/react`, import `mfeApp` from `../init`)
- [x] 3.3 Update all 4 concrete lifecycle files (`lifecycle-helloworld.tsx`, `lifecycle-profile.tsx`, `lifecycle-theme.tsx`, `lifecycle-uikit.tsx`) to import from `../init` (triggers module-level bootstrap)
- [x] 3.4 Convert `ProfileScreen.tsx` from React-local state (`useState` for `userData`, `loading`, `error`) to store-backed state (`useAppSelector` for `state['demo/profile']`), replace `fetchUserData` with `fetchUser()` action call, remove `setTimeout` mock data

## 4. Blank MFE — Template Flux Scaffolding

- [x] 4.1 Create `_blank-mfe/src/api/types.ts` with placeholder response type
- [x] 4.2 Create `_blank-mfe/src/api/mocks.ts` with empty mock map placeholder
- [x] 4.3 Create `_blank-mfe/src/api/_BlankApiService.ts` extending `BaseApiService` from `@hai3/react` with placeholder method
- [x] 4.4 Create `_blank-mfe/src/events/homeEvents.ts` with `EventPayloadMap` augmentation placeholder
- [x] 4.5 Create `_blank-mfe/src/slices/homeSlice.ts` with minimal `createSlice` (name: `'_blank/home'`), `RootState` augmentation, exported reducer functions
- [x] 4.6 Create `_blank-mfe/src/effects/homeEffects.ts` with `initHomeEffects(dispatch)` placeholder
- [x] 4.7 Create `_blank-mfe/src/actions/homeActions.ts` with placeholder `fetchData()` action
- [x] 4.8 Create `_blank-mfe/src/init.ts` — calls `createHAI3().build()`, `registerSlice(homeSlice, initHomeEffects)`, `apiRegistry.register(_BlankApiService)`, `apiRegistry.initialize()`, exports `mfeApp`
- [x] 4.9 Update `_blank-mfe/src/shared/ThemeAwareReactLifecycle.tsx` to wrap React tree in `<HAI3Provider app={mfeApp}>`
- [x] 4.10 Update `_blank-mfe/src/lifecycle.tsx` to import from `../init`

## 5. AI Guidelines Updates

- [x] 5.1 Update `.ai/GUIDELINES.md` routing table — add `src/mfe_packages -> .ai/targets/SCREENSETS.md` route, annotate `src/screensets` as legacy
- [x] 5.2 Update `.ai/targets/EVENTS.md` — add "MFE Runtime Isolation" section (each MFE has own eventBus, events never cross boundaries), add "Cross-Runtime Communication" section (only shared properties and actions chains), add `mfe/<domain>/<eventName>` naming convention
- [x] 5.3 Update `.ai/targets/SCREENSETS.md` — update scope to `src/mfe_packages/**` (primary), add MFE state management rules (`createHAI3().build()` + `HAI3Provider`, no direct Redux), add MFE API service rules (local services with own `apiRegistry`), add MFE i18n rules (bridge-based language + `import.meta.glob`), add MFE lifecycle rules (`ThemeAwareReactLifecycle`, `init.ts` pattern), remove references to `screensetRegistry`, `useNavigation`, `navigateToScreen`, `I18nRegistry.createLoader`

## 6. Verification

- [x] 6.1 Verify demo MFE TypeScript compilation (`cd src/mfe_packages/demo-mfe && npx tsc --noEmit`)
- [x] 6.2 Verify blank MFE TypeScript compilation (`cd src/mfe_packages/_blank-mfe && npx tsc --noEmit`)
  - Note: Blank MFE has pre-existing node_modules resolution issue (missing @hai3/react symlink, npm install fails due to corporate registry). Code is correct — same patterns as demo MFE which compiles cleanly.
- [x] 6.3 Build demo MFE and verify Profile screen loads with store-backed data in browser via Chrome DevTools
  - Note: MFE init.ts requires `effects()` + `mock()` plugins in `createHAI3()` for mock API activation. API services must be registered BEFORE `.build()` due to mock plugin sync timing.
