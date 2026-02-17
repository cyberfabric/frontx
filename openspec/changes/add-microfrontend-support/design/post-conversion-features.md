# Post-Conversion Feature Set (Current State)

> **Historical document.** All gaps described below were resolved in Phase 36 (Feature Parity Remediation). This document is preserved as a baseline reference for the remediation work. See `tasks.md` Phase 36 and `tasks-archive.md` Phase 36 for remediation details.

Documents the current state of the MFE conversion after Phase 35, identifying every gap against the pre-conversion baseline (`pre-conversion-features.md`).

## Architecture Error: 4 MFEs Instead of 1

The conversion created 4 separate MFE packages (`hello-world-mfe`, `profile-mfe`, `current-theme-mfe`, `uikit-elements-mfe`) instead of 1 MFE package with 4 entries.

Correct architecture: ONE SCREENSET = ONE MFE. The demo screenset should be ONE MFE package (`demo-mfe`) with:

- 1 manifest (single Module Federation remote)
- 4 entries (each with its own `exposedModule`)
- 4 extensions (each targeting the screen domain, each pointing to its entry)
- Module Federation exposes 4 lifecycle modules
- Shared i18n, styles, utilities inside the package

Navigation is host-controlled: the app triggers `executeActionsChain({ action: { type: mount_ext, target: screenDomain, payload: { extensionId } } })` to switch between screens. No internal routing.

## Current MFE Packages (ALL have zero feature parity)

### hello-world-mfe

- Hardcoded English strings (no i18n)
- No `useScreenTranslations()`, no `t()`, no `<TextLoader>`
- No UIKit components (raw divs with Tailwind)
- No navigation button to Theme screen
- Bridge subscription to theme/language (NEW -- correct)

### profile-mfe

- Static "John Doe" data (no API fetching)
- No loading/error/no-data states
- No retry/refresh buttons
- No user avatar
- No header notification
- No UIKit components
- Hardcoded English (no i18n)
- 1 unused `en.json` file with 5 keys

### current-theme-mfe

- Receives theme via bridge (PARITY with different mechanism)
- Color swatches using CSS variables (NEW -- acceptable addition)
- No i18n
- No UIKit components

### uikit-elements-mfe

- 5 static sections with ~12 CSS mockups
- No `<CategoryMenu>`, no category navigation
- No actual UIKit components
- No lazy loading
- No scroll-to-element
- No i18n
- Lost 56 implemented elements, replaced with ~12 CSS approximations

### Menu

- Extension-driven (presentation metadata) -- correct mechanism
- Labels are plain strings, not translation keys -- NOT TRANSLATABLE
- Icons use bare names (`hand-wave`, `user`) -- may not resolve in Iconify without `lucide:` prefix

### Blank Screenset

- NOT converted -- still exists at `src/screensets/_blank/`
- Legacy screenset API (`screensetRegistry`) not deleted

## Shared Properties GTS Design Error

Shared properties are registered as GTS instances with hardcoded values:

- `theme.v1.json`: `{ "id": "...theme.v1", "value": "light" }`
- `language.v1.json`: `{ "id": "...language.v1", "value": "en" }`

This is wrong. Shared properties are contracts defining which values consumers must support. The `value` field carries a frozen default that has no runtime meaning. Theme and language should be string enums in their GTS schemas:

- Theme schema: enum of supported theme IDs (e.g., `"default"`, `"light"`, `"dark"`, `"dracula"`, `"dracula-large"`)
- Language schema: enum of supported language codes (the 36 `Language` enum values)

The GTS instances should declare the property TYPE (schema), not carry a runtime value. Runtime values are set by `updateDomainProperty()` and are NOT part of the GTS type system.

## Gap Summary

| Category | Gaps |
|----------|------|
| Architecture | 4 MFEs instead of 1; `_blank` not converted; legacy API not deleted |
| i18n | Zero translations in any MFE; no `useScreenTranslations`; no `t()`; no `<TextLoader>` |
| Profile | No API, no loading/error states, no retry, no avatar, no dynamic data |
| UIKit | 56 elements reduced to 12 CSS mockups; no `<CategoryMenu>`; no lazy loading; no actual UIKit components |
| HelloWorld | No navigation button |
| Menu | Labels not translatable; icon prefixes may be wrong |
| GTS | Shared properties carry frozen values instead of enum schemas |
