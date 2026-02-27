## Why

The MFE conversion (Phase 35-36) migrated the demo and blank screensets from host-embedded components to isolated Module Federation remotes. To cut scope, the conversion dropped the flux/events-based dataflow architecture inside the MFEs: the Profile screen uses mock data with `setTimeout` instead of real API services, all state management is React-local (`useState`) instead of the canonical Action → Event → Effect → Store cycle, and there is no internal event bus, effects, or store. Additionally, the AI guidelines (`EVENTS.md`, `SCREENSETS.md`, `GUIDELINES.md`) still describe the pre-MFE single-runtime architecture and do not account for MFE runtime isolation or the independent data fetching principle.

## What Changes

### Demo MFE Internal Architecture
- Establish full flux/events dataflow cycle inside the demo MFE: own `eventBus`, own Redux store with slices, own actions/events/effects
- Add MFE-local `AccountsApiService` with mock plugin (same endpoints as host, own `apiRegistry` instance)
- Convert Profile screen from React-local state + mock data to store-backed state with real API fetch via flux cycle
- Add shared initialization module (`init.ts`) for idempotent MFE bootstrap (store creation, slice registration, API service registration, effects registration)
- Wrap MFE React tree in Redux `<Provider>` (in `ThemeAwareReactLifecycle`) so `useAppSelector`/`useAppDispatch` work against MFE's isolated store
- Remove the `notifyUserLoaded()` pattern — MFEs do not proxy data to the host (per Independent Data Fetching principle)

### Blank MFE Template
- Add full flux/events scaffolding to `_blank-mfe` template: `api/`, `actions/`, `events/`, `effects/`, `slices/`, `init.ts` directories with minimal placeholder files
- Update `ThemeAwareReactLifecycle` in blank template to wrap React tree in Redux `<Provider>` with MFE store
- This is the CLI template for creating new screensets — new screensets must start with the correct internal dataflow architecture out of the box

### Demo MFE Screen Consistency — Bridge Info on All 4 Screens
- Add Bridge Info section (Domain ID, Instance ID, Current Theme, Current Language) to the UIKit Elements screen, which is the only demo MFE screen missing it
- Add the 5 bridge-related i18n keys to UIKit Elements language files to match the pattern already present in HelloWorld, Profile, and CurrentTheme screens

### Blank MFE i18n and Presentation Metadata Fixes
- Replace hardcoded English strings in Blank MFE HomeScreen Bridge Info section with i18n key lookups (`{t('bridge_info')}`, etc.)
- Add the 5 bridge-related i18n keys to all 36 blank MFE HomeScreen language files
- Replace template placeholders in `_blank-mfe/mfe.json` presentation section: label `"[Your Screen Label]"` becomes `"Blank Home"`, route `"/[your-route]"` becomes `"/blank-home"`

### CurrentThemeScreen CSS Swatch Corrections
- Fix 3 incorrect CSS class assignments in the `colorSwatches` array: Secondary, Accent, and Destructive swatches were using wrong `bg-`/`text-` classes, causing them to render with incorrect colors

### AI Guidelines Update
- **BREAKING**: Update `SCREENSETS.md` scope from `src/screensets/**` to cover `src/mfe_packages/**` as MFE screensets
- **BREAKING**: Update `EVENTS.md` to distinguish host-level flux (single runtime) from MFE-internal flux (isolated runtime with own eventBus/store)
- Update `GUIDELINES.md` routing table: add `src/mfe_packages` route, update `src/screensets` description
- Update `EVENTS.md` with cross-runtime boundary rules (what's forbidden: data proxying, cross-runtime events)
- Update `SCREENSETS.md` localization rules for MFE i18n pattern (bridge-based language property + local `import.meta.glob`)
- Update `SCREENSETS.md` API service rules for MFE-local API services

## Capabilities

### New Capabilities
- `mfe-internal-dataflow`: Flux/events dataflow architecture inside MFE packages — own eventBus, store, slices, actions, events, effects, and API services per MFE runtime

### Modified Capabilities
- `screensets`: Screenset guidelines updated to cover MFE packages (`src/mfe_packages/`), MFE-local state management, MFE-local API services, and MFE i18n patterns
- `microfrontends`: Add requirement for independent data fetching principle enforcement — MFEs MUST NOT proxy data to the host, each runtime fetches independently

## Impact

- **Demo MFE** (`src/mfe_packages/demo-mfe/`): New directories (`api/`, `actions/`, `events/`, `effects/`, `slices/`, `init.ts`), Profile screen rewrite to use store
- **Blank MFE** (`src/mfe_packages/_blank-mfe/`): New directories (`api/`, `actions/`, `events/`, `effects/`, `slices/`, `init.ts`) with minimal scaffolding — CLI template for new screensets
- **ThemeAwareReactLifecycle**: Modified in both MFEs to wrap React tree in Redux Provider with MFE store
- **AI guidelines** (`.ai/targets/EVENTS.md`, `.ai/targets/SCREENSETS.md`, `.ai/GUIDELINES.md`): Breaking changes to scope, routing, and rules
- **UIKit Elements screen** (`src/mfe_packages/demo-mfe/src/screens/uikit/`): Bridge Info section added, i18n keys added to all language files
- **Blank MFE HomeScreen** (`src/mfe_packages/_blank-mfe/src/screens/home/`): Hardcoded Bridge Info labels replaced with i18n key lookups, 5 bridge keys added to all 36 language files
- **Blank MFE manifest** (`src/mfe_packages/_blank-mfe/mfe.json`): Presentation label and route changed from template placeholders to proper values (`"Blank Home"`, `"/blank-home"`)
- **CurrentThemeScreen** (`src/mfe_packages/demo-mfe/src/screens/theme/CurrentThemeScreen.tsx`): 3 CSS class corrections in colorSwatches array (Secondary, Accent, Destructive)
- **No changes to** `@hai3/screensets`, `@hai3/framework`, `@hai3/react`, or `@hai3/api` packages — all changes are in L4 app code and AI guidelines
- **No API contract changes** — the `ChildMfeBridge` interface is unchanged; MFEs use existing `@hai3/react` re-exports (`createStore`, `registerSlice`, `eventBus`, `apiRegistry`)
