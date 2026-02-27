## Context

The MFE conversion (Phase 35-36) created two MFE packages (`demo-mfe`, `_blank-mfe`) under `src/mfe_packages/`. These packages are Module Federation remotes that run in Shadow DOM isolation. Each MFE bundles its own copy of `@hai3/react` (and transitively `@hai3/framework`, `@hai3/state`, `@hai3/api`) because `@hai3/react` is NOT in the Module Federation `shared` config. Only `react`, `react-dom`, `tailwindcss`, and `@hai3/uikit` are shared.

This means each MFE naturally gets its own isolated instances of all singletons: `eventBus`, `apiRegistry`, `createStore`/`storeInstance`, `registerSlice`. The isolation is a property of the bundling, not something we need to engineer.

Currently, the demo MFE's Profile screen uses `setTimeout` + mock data with React-local `useState`. The `_blank-mfe` template has no flux scaffolding. The AI guidelines (`EVENTS.md`, `SCREENSETS.md`, `GUIDELINES.md`) describe the pre-MFE single-runtime architecture.

## Goals / Non-Goals

**Goals:**
- Establish the canonical flux/events dataflow pattern inside MFE packages: Action → Event → Effect → Store
- Demo MFE Profile screen fetches user data via its own `AccountsApiService` instance through the flux cycle
- Blank MFE template includes flux scaffolding so new screensets start with the correct architecture
- AI guidelines accurately describe both host-level and MFE-internal flux patterns, including cross-runtime boundary rules

**Non-Goals:**
- Menu label translation (no design exists yet)
- `@hai3/api` cache sharing / request deduplication across runtimes (future work)
- Changes to any `@hai3/*` SDK or framework packages (L1/L2/L3)
- Converting HelloWorld, CurrentTheme, or UIKit screens to store-backed state (they have no data fetching needs)

## Decisions

### Decision 1: MFE App via `createHAI3().use(effects()).use(mock()).build()` + `registerSlice()`

The MFE creates a HAI3App using `createHAI3().use(effects()).use(mock()).build()` from `@hai3/react`. The `effects()` plugin provides core effect coordination, and the `mock()` plugin auto-enables mock API mode on localhost — without it, `RestMockPlugin` instances registered via `registerPlugin()` stay inactive (stored but never added to the protocol's active plugin chain). The MFE then registers its slices using `registerSlice()` from `@hai3/react`, which adds them to the same singleton store.

Because the MFE bundles its own copy of `@hai3/react` (and transitively `@hai3/state`), the module-level `storeInstance` singleton is isolated from the host's store. The `.build()` call creates/retrieves this isolated store.

**Why `createHAI3().build()` instead of raw `createStore()`?** Using `createHAI3().build()` produces a `HAI3App` object that can be passed to `HAI3Provider`, which is the only sanctioned way to provide store context to React trees. Direct usage of `createStore()` + raw Redux `Provider` is forbidden — all store access goes through `@hai3/react` APIs (`useAppSelector`, `useAppDispatch`) which depend on `HAI3Provider` context.

**Why not `createHAI3App()` (full preset)?** `createHAI3App()` applies the full preset (screensets, themes, layout, microfrontends, i18n, effects, mock). An MFE only needs `effects()` + `mock()` — no themes, layout, or microfrontends plugin overhead. The remaining plugins are host-level concerns.

**Why `effects()` + `mock()` and not zero plugins?** The `mock()` plugin is essential for development workflow. It calls `syncMockPlugins()` during `onInit()`, which iterates `apiRegistry.getAll()` and adds `RestMockPlugin` instances to protocol active chains. Without it, mock API services don't intercept requests. The `effects()` plugin is a dependency of `mock()`.

### Decision 2: HAI3Provider in ThemeAwareReactLifecycle

The `ThemeAwareReactLifecycle.renderContent()` method wraps the React tree in `<HAI3Provider>` from `@hai3/react` with the MFE's `HAI3App`. This enables `useAppSelector`/`useAppDispatch` inside screen components. `HAI3Provider` internally wraps the Redux `Provider` — MFE code never imports or references `react-redux` directly.

```
ThemeAwareReactLifecycle.mount(container, bridge)
  │
  ├─ initializeStyles(container)
  ├─ apply initial theme
  ├─ subscribe to theme changes
  ├─ create React root
  └─ renderContent(root, bridge)
       └─ root.render(
            <HAI3Provider app={mfeApp}>
              <ScreenComponent bridge={bridge} />
            </HAI3Provider>
          )
```

The MFE's bundled `@hai3/react` includes its own `HAI3Provider`, which creates its own React context (separate from the host's). Because `@hai3/react` is NOT shared via Module Federation, the MFE's `HAI3Provider` context is isolated. `useAppSelector`/`useAppDispatch` in MFE components connect to the MFE's Provider, not the host's.

**No `react-redux` in MFE dependencies.** Direct Redux usage is forbidden. All store access goes through `@hai3/react` APIs: `HAI3Provider` for context, `useAppSelector`/`useAppDispatch` for hooks, `createHAI3`/`registerSlice` for setup. The MFE never directly imports `react-redux`, `redux`, or `@reduxjs/toolkit`.

### Decision 3: Shared `init.ts` Module for Idempotent MFE Bootstrap

All 4 entries in the demo MFE share the same Module Federation bundle. A shared `init.ts` module is imported by all lifecycle files. The first import triggers initialization as a module-level side effect:

```typescript
// src/init.ts — executed once when any entry first loads
import { createHAI3, registerSlice, apiRegistry, effects, mock } from '@hai3/react';
import { profileSlice, initProfileEffects } from './slices/profileSlice';
import { AccountsApiService } from './api/AccountsApiService';

// Register API services BEFORE build — mock plugin syncs during build(),
// so services must already be present for mock activation to find them
apiRegistry.register(AccountsApiService);
apiRegistry.initialize();

// Create HAI3 app with effects + mock plugins (mock auto-enables on localhost)
const mfeApp = createHAI3().use(effects()).use(mock()).build();

// Register slices with effects (needs store from build())
registerSlice(profileSlice, initProfileEffects);

export { mfeApp };
```

**Critical ordering: API services BEFORE `.build()`**. The `mock()` plugin's `onInit()` calls `syncMockPlugins(true)` which iterates `apiRegistry.getAll()`. If services aren't registered yet, mock plugins won't be activated. Slices must come AFTER `.build()` because `registerSlice()` needs the store.

**Why module-level side effects?** This matches the pattern used by the original screensets (`demoScreenset.tsx` registered with `screensetRegistry` as a module-level side effect) and follows the "registries self-register at import" convention. Module-level execution is naturally idempotent — JavaScript modules execute once regardless of how many times they're imported.

### Decision 4: MFE-Local AccountsApiService

The MFE defines its own `AccountsApiService` class inside `demo-mfe/src/api/`. It has the same endpoints and mock map as the host's `src/app/api/AccountsApiService.ts`. This is intentional duplication — per the Independent Data Fetching principle, each runtime independently defines and fetches the data it needs. Future `@hai3/api` cache sharing will deduplicate at the network level without coupling the runtimes.

**Why not share the service definition?** The host's `AccountsApiService` lives at `src/app/api/` (host L4 code). The MFE cannot import from there (cross-boundary violation). A shared `@hai3/api-accounts` package is possible but premature — the service is small (one endpoint) and API service isolation between runtimes is a feature, not a cost.

### Decision 5: MFE-Internal Event Naming Convention

MFE-internal events follow the existing convention adapted for the MFE context:

- **Format**: `mfe/<domain>/<eventName>` (past tense for all event names, including requests)
- **Example**: `mfe/profile/user-fetch-requested`
- **Module augmentation**: MFE augments `EventPayloadMap` on its own bundled copy of `@hai3/react`

Only events that are actually emitted via `eventBus.emit()` need `EventPayloadMap` entries. In the demo MFE's profile flux cycle, only the request event is emitted (by the action). The effect listens for that event and dispatches directly to the store — it does NOT emit outcome events. Therefore only `mfe/profile/user-fetch-requested` appears in the augmentation:

```typescript
// demo-mfe/src/events/profileEvents.ts
declare module '@hai3/react' {
  interface EventPayloadMap {
    'mfe/profile/user-fetch-requested': undefined;
  }
}
```

The `mfe/` prefix distinguishes MFE-internal events from host events (`app/`). This is purely a naming convention — the events never cross runtime boundaries because the MFE has its own `eventBus` instance.

### Decision 6: Profile Screen Flux Cycle

The Profile screen converts from React-local state to store-backed state:

```
ProfileScreen
  │ useEffect → fetchUser()                    ← ACTION (emits event)
  │     └─ eventBus.emit('mfe/profile/user-fetch-requested')
  │
  │ profileEffects listens                     ← EFFECT (listens + dispatches)
  │     └─ apiRegistry.getService(AccountsApiService).getCurrentUser()
  │         ├─ success: dispatch(setUser(user)), dispatch(setLoading(false))
  │         └─ failure: dispatch(setError(error)), dispatch(setLoading(false))
  │
  │ ProfileScreen re-renders                   ← COMPONENT
  │     ├─ useAppSelector(state => state['demo/profile'].user)
  │     ├─ useAppSelector(state => state['demo/profile'].loading)
  │     └─ useAppSelector(state => state['demo/profile'].error)
```

The `notifyUserLoaded()` call from the original screen is NOT restored. The host header fetches its own user data independently via `bootstrapEffects` (triggered by `Layout.tsx` calling `fetchCurrentUser()` on mount).

### Decision 7: Blank MFE Template Scaffolding

The `_blank-mfe` template gets the same flux directory structure as the demo MFE, but all scaffolding files are **empty structures** — they contain the minimal boilerplate (imports, class declaration, module augmentation block, function signature) with no imaginary domain logic:

```
_blank-mfe/src/
  api/
    _BlankApiService.ts       ← empty class extending BaseApiService, no methods; API response types are defined in this same file (no separate types.ts)
    mocks.ts                  ← empty mock map, no endpoints
  actions/
    homeActions.ts            ← empty file, no actions defined
  events/
    homeEvents.ts             ← empty EventPayloadMap augmentation, no events declared
  effects/
    homeEffects.ts            ← empty initHomeEffects(dispatch), no subscriptions
  slices/
    homeSlice.ts              ← minimal createSlice, empty state, no domain reducers
  init.ts                     ← store + slice + API registration
```

These files are compilable scaffolding, not working stubs. They contain no fake methods, no fake events, no fake actions, and no fake reducers. The template provides the correct file structure and import patterns so developers know where to add each concern. Developers replace `_Blank` prefixes with their screenset name, same as the existing convention for the blank template.

### Decision 8: AI Guidelines Updates

Three guideline files need updates:

**`.ai/GUIDELINES.md`** — Routing table:
- Add `src/mfe_packages` → `.ai/targets/SCREENSETS.md` route
- Keep `src/screensets` route but note it's legacy (no screensets exist there anymore)

**`.ai/targets/EVENTS.md`** — Add MFE isolation section:
- Existing rules still apply within each runtime (host OR MFE)
- New section: "MFE Runtime Isolation" — each MFE has own eventBus, events never cross runtime boundaries
- New section: "Cross-Runtime Communication" — only via shared properties and actions chains, data proxying forbidden
- Update event naming to include `mfe/` prefix convention for MFE-internal events

**`.ai/targets/SCREENSETS.md`** — Modernize for MFE era:
- Scope: `src/mfe_packages/**` (primary), `src/screensets/**` (legacy, if still used)
- State management: same rules apply, but store is MFE-local
- Localization: bridge-based language property + `import.meta.glob` pattern (not `I18nRegistry.createLoader`)
- API services: MFE-local in `src/mfe_packages/*/src/api/`, own `apiRegistry` instance
- Remove references to `screensetRegistry`, `useNavigation`, `navigateToScreen`
- Add MFE-specific rules: lifecycle files, `ThemeAwareReactLifecycle`, `init.ts` pattern

### Decision 9: Blank MFE Bridge Info i18n Consistency

The blank MFE HomeScreen currently hardcodes "Bridge Properties" and all bridge-related labels (Domain ID, Instance ID, Current Theme, Current Language) as English strings. Since the blank MFE is registered and rendered alongside the demo MFE, it must follow the same i18n pattern: all visible text uses `{t('key')}` with translations loaded from `import.meta.glob` i18n files.

The 5 bridge-related keys (`bridge_info`, `domain_id`, `instance_id`, `current_theme`, `current_language`) must be added to all 36 blank MFE HomeScreen i18n files. Non-English locales use English-only placeholder text for bridge keys — this matches the existing pattern across demo MFE i18n files, where bridge info is a developer debug section, not user-facing content requiring professional translation.

### Decision 10: Blank MFE Presentation Metadata

The blank MFE `mfe.json` has template placeholders (`[Your Screen Label]`, `/[your-route]`) in the presentation section. Since the blank MFE is registered in `bootstrap.ts` and actively runs, these placeholders render literally in the UI: the sidebar shows `[Your Screen Label]` and the router attempts to match `/[your-route]` (brackets in URL paths cause matching failures in most routing libraries).

The fix is straightforward: replace the label with `"Blank Home"` and the route with `"/blank-home"`. These are proper values that display correctly in the sidebar and match cleanly in the router. The icon (`lucide:home`) and order (`100`) remain unchanged.

### Decision 11: CurrentThemeScreen Color Swatch CSS Classes

The `colorSwatches` array in `CurrentThemeScreen.tsx` has 3 incorrect entries:
- Secondary uses `bg-muted text-foreground` instead of `bg-secondary text-secondary-foreground`
- Accent uses `bg-muted text-foreground` instead of `bg-accent text-accent-foreground`
- Destructive uses `bg-primary text-primary-foreground` instead of `bg-destructive text-destructive-foreground`

This causes 3 swatches to render with wrong colors (Secondary and Accent both look like Muted; Destructive looks like Primary). The fix is a direct class string replacement in the `colorSwatches` array. Each swatch must use its own semantic `bg-<name>` and `text-<name>-foreground` classes so the theme demonstration screen actually demonstrates the theme's distinct colors.

### Decision 12: Restore Lost Demo MFE Translations

During MFE conversion (commit `c1c534d`), all 140 non-English i18n locale files across the 4 demo-mfe screens were overwritten with English-only text. The original translated content from the pre-MFE codebase (commit `2ed18ae`) must be restored and merged with new MFE-specific keys.

The merge strategy: for each locale file, take the old translated values for keys that existed pre-MFE, and use English fallback text for new keys (`bridge_info`, `domain_id`, etc.) that were added during MFE conversion.

### Decision 13: Blank MFE useScreenTranslations Hook Fix

The blank MFE's `useScreenTranslations` hook had two bugs compared to the working demo-mfe version:
1. Used `useState` for `currentLanguage` tracking instead of `useRef`, causing unnecessary state updates and effect re-runs
2. Included `currentLanguage` in the effect dependency array, creating a circular dependency

The fix aligns the blank MFE hook with the demo-mfe pattern: `useRef` for internal language tracking, effect deps `[bridge, loadTranslations]` only.

Additionally, the `import.meta.glob('./i18n/*.json')` call must be hoisted to module level in all screen components to prevent creating new object references on each render (which triggers `useCallback`/`useEffect` dependency changes in the hook).

### Decision 14: Menu Filtering by Active GTS Package

The sidebar `Menu.tsx` used `getExtensionsForDomain(HAI3_SCREEN_DOMAIN)` which returns ALL screen extensions from ALL registered packages. This caused extensions from both `hai3.demo` and `hai3.blank` to appear simultaneously in the menu — a regression from the pre-MFE behavior where only the active screenset's screens were visible.

The fix uses `useActivePackage()` (from `@hai3/react`) to get the currently mounted screen's GTS package, then `getExtensionsForPackage(activePackage)` filtered by screen domain to show only the active package's screens. Falls back to `getExtensionsForDomain()` when no package is active yet.

## Risks / Trade-offs

**[Duplicate AccountsApiService]** → Two copies of the same service definition exist (host and MFE). Accepted as architectural cost of runtime independence. Future `@hai3/api` cache sharing mitigates the network cost. If service definitions diverge, that's a feature (each runtime evolves independently).

**[Store overhead for simple screens]** → HelloWorld, CurrentTheme, UIKit screens get an `HAI3Provider` but don't use the store. The overhead is negligible (one React context, one minimal HAI3App) and the Provider is required because all 4 entries share the same `ThemeAwareReactLifecycle` base class.

**[Module augmentation isolation]** → The MFE augments `EventPayloadMap` and `RootState` on its own bundled copy of `@hai3/react`. TypeScript sees these augmentations at compile time. If the MFE's tsconfig includes both MFE source and host source, augmentations could collide. The MFE's tsconfig must scope to its own source only.

**[Guidelines breaking changes]** → Updating `SCREENSETS.md` scope and `EVENTS.md` rules is a breaking change for AI workflows. Any agent following the old guidelines may produce incorrect patterns. Mitigation: the changes are additive (new MFE sections) rather than destructive (old host patterns still valid for host code).
