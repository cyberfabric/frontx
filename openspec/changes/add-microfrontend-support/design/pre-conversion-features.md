# Pre-Conversion Feature Set

Source of truth for 100% feature parity. Documents the exact capabilities of the legacy demo screenset before MFE conversion.

## Demo Screenset (`src/screensets/demo/`)

### Structure

- 1 screenset, 4 screens, 9 element category components
- Screenset-level i18n: 36 language JSON files
- Screen-level i18n: 36 language JSON files per screen (4 x 36 = 144 files)
- Screenset-level translations registered via `I18nRegistry.createLoader()`
- Screen-level translations loaded via `useScreenTranslations()` hook

### Screen: HelloWorld

- `useScreenTranslations()` with 36 languages
- `useTranslation()` -- all UI text via `t()` keys
- `<TextLoader>` skeleton states while translations load
- UIKit components: `<Card>`, `<CardContent>`, `<Button>`
- Programmatic navigation: `navigateToScreen(DEMO_SCREENSET_ID, CURRENT_THEME_SCREEN_ID)` -- "Go to Theme Screen" button
- Translation keys: title, welcome, description, navigation_title, navigation_description, go_to_theme

### Screen: Profile

- `useScreenTranslations()` with 36 languages
- API integration: `apiRegistry.getService(AccountsApiService).getCurrentUser()` on mount
- Loading state with `<TextLoader>` skeleton
- Error state with error message + Retry button
- No-data state with "No user data" + Load User button
- User data display: avatar (round img), firstName, lastName, email, role, department, id, createdAt, updatedAt
- Refresh button in `<CardFooter>`
- Header notification: `notifyUserLoaded(response.user)` updates header via flux action
- UIKit components: `<Card>`, `<CardContent>`, `<CardFooter>`, `<Button>`
- Translation keys: title, welcome, loading, error_prefix, retry, no_user_data, load_user, role_label, department_label, id_label, created_label, last_updated_label, refresh

### Screen: CurrentTheme

- `useScreenTranslations()` with 36 languages
- HAI3 store state access: `useAppSelector((state) => state['layout/app']?.theme)` for current theme
- Translation keys: title, current_theme_label, description

### Screen: UIKitElements

- `useScreenTranslations()` with 36 languages
- 9 categories: layout, navigation, forms, actions, feedback, data-display, overlays, media, disclosure
- `<CategoryMenu>` component with category tree + element navigation + scroll-to-element + active element highlighting
- 56 implemented UIKit elements across 9 lazy-loaded category components (`React.lazy`)
- Category components: DataDisplayElements, LayoutElements, ActionElements, FeedbackElements, MediaElements, FormElements, OverlayElements, DisclosureElements, NavigationElements
- Custom components: PaymentsDataTable, ProfileForm, ExpandableButton, MenuItemButton, LinkTextInput
- 30KB+ UIKit translation file (en.json) with per-element translation keys
- Uses actual `@hai3/uikit` components (Accordion, Alert, Button, Calendar, Chart, DataTable, Dialog, Drawer, etc.)

### Menu

- 4 items with Lucide icons: `lucide:globe`, `lucide:palette`, `lucide:user`, `lucide:component`
- Labels are translation keys: `screenset.demo:screens.helloworld.title` etc.
- Translated via `t(item.label)` at render time
- Active state tracked via store state

**MFE conversion note**: The pre-conversion menu label translation mechanism relies on screenset-level `t()` with host-registered i18n loaders (`I18nRegistry.createLoader()`). MFEs do not have an equivalent host-side i18n namespace registration mechanism yet. For the demo conversion, plain English labels in `mfe.json` presentation metadata are acceptable. Menu label translation is a future enhancement that requires MFE i18n namespace registration with the host.

### Blank Screenset (`src/screensets/_blank/`)

- Template screenset for scaffolding new screensets
- 1 screen (HomeScreen), screenset-level + screen-level i18n (36 languages each)
- Serves as CLI template reference
