## 1. Demo MFE — API Service Layer

- [ ] 1.1 Create `demo-mfe/src/api/types.ts` with `GetCurrentUserResponse` and `UserData` types (match host's `src/app/api/types.ts`)
- [ ] 1.2 Create `demo-mfe/src/api/mocks.ts` with `accountsMockMap` (same endpoints and mock data as host's `src/app/api/mocks.ts`)
- [ ] 1.3 Create `demo-mfe/src/api/AccountsApiService.ts` extending `BaseApiService` from `@hai3/react`, with `getCurrentUser()` method and `RestMockPlugin` registration (mirror host's `src/app/api/AccountsApiService.ts`)

## 2. Demo MFE — Flux Infrastructure

- [ ] 2.1 Create `demo-mfe/src/events/profileEvents.ts` with `EventPayloadMap` module augmentation for `mfe/profile/user-fetch-requested`, `mfe/profile/user-fetched`, `mfe/profile/user-fetch-failed`
- [ ] 2.2 Create `demo-mfe/src/slices/profileSlice.ts` with `createSlice` (name: `'demo/profile'`, state: `user`, `loading`, `error`), `RootState` module augmentation, and exported reducer functions (`setUser`, `setLoading`, `setError`)
- [ ] 2.3 Create `demo-mfe/src/effects/profileEffects.ts` with `initProfileEffects(dispatch)` — subscribes to `mfe/profile/user-fetch-requested`, calls `apiRegistry.getService(AccountsApiService).getCurrentUser()`, emits success/failure events, dispatches to slice
- [ ] 2.4 Create `demo-mfe/src/actions/profileActions.ts` with `fetchUser()` action that emits `mfe/profile/user-fetch-requested` via `eventBus.emit()`

## 3. Demo MFE — Bootstrap and Integration

- [ ] 3.1 Create `demo-mfe/src/init.ts` — calls `createHAI3().build()` (no plugins), `registerSlice(profileSlice, initProfileEffects)`, `apiRegistry.register(AccountsApiService)`, `apiRegistry.initialize()`, exports `mfeApp`
- [ ] 3.2 Update `demo-mfe/src/shared/ThemeAwareReactLifecycle.tsx` — modify `renderContent()` to wrap React tree in `<HAI3Provider app={mfeApp}>` (import `HAI3Provider` from `@hai3/react`, import `mfeApp` from `../init`)
- [ ] 3.3 Update all 4 concrete lifecycle files (`lifecycle-helloworld.tsx`, `lifecycle-profile.tsx`, `lifecycle-theme.tsx`, `lifecycle-uikit.tsx`) to import from `../init` (triggers module-level bootstrap)
- [ ] 3.4 Convert `ProfileScreen.tsx` from React-local state (`useState` for `userData`, `loading`, `error`) to store-backed state (`useAppSelector` for `state['demo/profile']`), replace `fetchUserData` with `fetchUser()` action call, remove `setTimeout` mock data

## 4. Blank MFE — Template Flux Scaffolding

- [ ] 4.1 Create `_blank-mfe/src/api/types.ts` with placeholder response type
- [ ] 4.2 Create `_blank-mfe/src/api/mocks.ts` with empty mock map placeholder
- [ ] 4.3 Create `_blank-mfe/src/api/_BlankApiService.ts` extending `BaseApiService` from `@hai3/react` with placeholder method
- [ ] 4.4 Create `_blank-mfe/src/events/homeEvents.ts` with `EventPayloadMap` augmentation placeholder
- [ ] 4.5 Create `_blank-mfe/src/slices/homeSlice.ts` with minimal `createSlice` (name: `'_blank/home'`), `RootState` augmentation, exported reducer functions
- [ ] 4.6 Create `_blank-mfe/src/effects/homeEffects.ts` with `initHomeEffects(dispatch)` placeholder
- [ ] 4.7 Create `_blank-mfe/src/actions/homeActions.ts` with placeholder `fetchData()` action
- [ ] 4.8 Create `_blank-mfe/src/init.ts` — calls `createHAI3().build()`, `registerSlice(homeSlice, initHomeEffects)`, `apiRegistry.register(_BlankApiService)`, exports `mfeApp`
- [ ] 4.9 Update `_blank-mfe/src/shared/ThemeAwareReactLifecycle.tsx` to wrap React tree in `<HAI3Provider app={mfeApp}>`
- [ ] 4.10 Update `_blank-mfe/src/lifecycle.tsx` to import from `../init`

## 5. AI Guidelines Updates

- [ ] 5.1 Update `.ai/GUIDELINES.md` routing table — add `src/mfe_packages -> .ai/targets/SCREENSETS.md` route, annotate `src/screensets` as legacy
- [ ] 5.2 Update `.ai/targets/EVENTS.md` — add "MFE Runtime Isolation" section (each MFE has own eventBus, events never cross boundaries), add "Cross-Runtime Communication" section (only shared properties and actions chains), add `mfe/<domain>/<eventName>` naming convention
- [ ] 5.3 Update `.ai/targets/SCREENSETS.md` — update scope to `src/mfe_packages/**` (primary), add MFE state management rules (`createHAI3().build()` + `HAI3Provider`, no direct Redux), add MFE API service rules (local services with own `apiRegistry`), add MFE i18n rules (bridge-based language + `import.meta.glob`), add MFE lifecycle rules (`ThemeAwareReactLifecycle`, `init.ts` pattern), remove references to `screensetRegistry`, `useNavigation`, `navigateToScreen`, `I18nRegistry.createLoader`

## 6. Verification

- [ ] 6.1 Verify demo MFE TypeScript compilation (`cd src/mfe_packages/demo-mfe && npx tsc --noEmit`)
- [ ] 6.2 Verify blank MFE TypeScript compilation (`cd src/mfe_packages/_blank-mfe && npx tsc --noEmit`)
- [ ] 6.3 Build demo MFE and verify Profile screen loads with store-backed data in browser via Chrome DevTools
