## Requirements

### Requirement: Dynamic MFE Registration

The system SHALL support dynamic registration of MFE extensions and domains at runtime. There is NO static configuration - all registration is dynamic.

**Important**: MfManifest is internal to MfeHandlerMF. See [Manifest as Internal Implementation Detail](../../design/mfe-loading.md#decision-12-manifest-as-internal-implementation-detail-of-mfehandlermf).

#### Scenario: Dynamic MFE isolation principles (default handler)

HAI3's default handler enforces instance-level isolation via Blob URL module evaluation. See [Runtime Isolation](../../design/overview.md#runtime-isolation-default-behavior) for the complete isolation model.

- **WHEN** loading an MFE with the default handler
- **THEN** each MFE instance SHALL have its own isolated runtime
- **AND** isolation SHALL be achieved by evaluating shared dependency source text via unique Blob URLs, producing a fresh ES module evaluation per MFE
- **AND** any dependency MAY be listed in `sharedDependencies` for bundle code optimization; the handler fetches source text once and creates a new Blob URL per MFE load, ensuring isolated instances from shared code
- **AND** `SharedDependencyConfig` SHALL NOT include a `singleton` field — the field is removed because Module Federation singleton semantics are non-functional with this plugin, and blob URL isolation provides unconditional per-MFE isolation for all dependencies with `chunkPath`

### Requirement: Microfrontends Plugin

The system SHALL provide a `microfrontends()` plugin in `@hai3/framework` that enables MFE capabilities. Screensets is CORE to HAI3 and is automatically initialized - it is NOT a plugin. The microfrontends plugin wires the ScreensetsRegistry into the Flux data flow pattern.

**Key Principles:**
- Screensets is built-in to HAI3 - NOT a `.use()` plugin
- Microfrontends plugin enables MFE capabilities with optional handler configuration
- All MFE registrations (domains, extensions) happen dynamically at runtime via actions/API
- The plugin does NOT manage `globalThis.__federation_shared__` — shared dependency isolation is handled entirely by MfeHandlerMF at the handler level
- The plugin does NOT own shared property propagation — each plugin that owns data (themes, i18n) propagates its own properties

#### Scenario: Enable microfrontends in HAI3

```typescript
import { createHAI3, microfrontends } from '@hai3/react';
import { MfeHandlerMF } from '@hai3/screensets/mfe/handler';
import { gtsPlugin } from '@hai3/screensets/plugins/gts';

// Screensets is CORE - automatically initialized by createHAI3()
// Microfrontends plugin enables MFE capabilities
const app = createHAI3()
  .use(microfrontends({
    mfeHandlers: [new MfeHandlerMF(gtsPlugin)],
  }))
  .build();
```

- **WHEN** building an app with microfrontends plugin
- **THEN** the plugin SHALL enable MFE capabilities
- **AND** screensets SHALL be automatically available (core to HAI3)
- **AND** the plugin SHALL accept an optional configuration object with `mfeHandlers?: MfeHandler[]`
- **AND** the plugin SHALL NOT accept `hostSharedDependencies` (removed — blob URL isolation handles dependency isolation at the handler level)
- **AND** the plugin SHALL NOT subscribe to `theme/changed` or `i18n/language/changed` events
- **AND** the plugin SHALL NOT call `updateSharedProperty` for any shared property
- **AND** all domain and extension registration SHALL happen dynamically at runtime

### Requirement: Theme Propagation Owned by Themes Plugin

The `themes()` plugin SHALL propagate theme values to MFE domains via `updateSharedProperty`. The `microfrontends()` plugin SHALL NOT be involved in theme propagation.

#### Scenario: Theme change propagates to MFE domains

- **WHEN** a `theme/changed` event is emitted on the eventBus
- **THEN** the `themes()` plugin SHALL call `app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_THEME, payload.themeId)` in its event handler
- **AND** the call SHALL be wrapped in try/catch — if `updateSharedProperty` throws (e.g., GTS validation failure), the error SHALL be logged and the theme registry's own state SHALL NOT be affected
- **AND** the optional chaining (`?.`) SHALL be used because `screensetsRegistry` MAY be undefined if the microfrontends plugin is not used
- **AND** the `microfrontends()` plugin SHALL NOT contain any `theme/changed` event listener

#### Scenario: Themes plugin works without microfrontends

- **WHEN** an app uses the `minimal` preset (screensets + themes only, no microfrontends)
- **THEN** the themes plugin SHALL function normally for theme registry operations
- **AND** the `app.screensetsRegistry?.updateSharedProperty()` call SHALL silently skip (undefined registry)
- **AND** no errors SHALL occur

### Requirement: Language Propagation Owned by I18n Plugin

The `i18n()` plugin SHALL propagate language values to MFE domains via `updateSharedProperty`. The `microfrontends()` plugin SHALL NOT be involved in language propagation.

#### Scenario: Language change propagates to MFE domains

- **WHEN** an `i18n/language/changed` event is emitted on the eventBus
- **THEN** the `i18n()` plugin SHALL call `app.screensetsRegistry?.updateSharedProperty(HAI3_SHARED_PROPERTY_LANGUAGE, payload.language)` in its event handler
- **AND** the call SHALL be wrapped in try/catch — if `updateSharedProperty` throws (e.g., GTS validation failure), the error SHALL be logged and the i18n registry's own language state SHALL NOT be affected
- **AND** the optional chaining (`?.`) SHALL be used because `screensetsRegistry` MAY be undefined
- **AND** the `microfrontends()` plugin SHALL NOT contain any `i18n/language/changed` event listener

#### Scenario: I18n plugin works without microfrontends

- **WHEN** an app uses a preset without microfrontends
- **THEN** the i18n plugin SHALL function normally for language registry operations
- **AND** the `app.screensetsRegistry?.updateSharedProperty()` call SHALL silently skip
- **AND** no errors SHALL occur
