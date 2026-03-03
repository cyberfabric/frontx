## ADDED Requirements

### Requirement: Custom Vite Plugin for Complete Import Externalization

A custom Vite plugin (`hai3-mfe-externalize`) SHALL transform ALL `import` statements for shared dependencies into `importShared()` calls across the entire MFE bundle — not just expose entry files.

#### Scenario: Code-split chunk imports transformed to importShared

- **GIVEN** a code-split chunk (e.g., `useScreenTranslations.js`) contains `import { r as requireReact } from './index-MCx4YXC7.js'` (a static import to a bundled React copy)
- **WHEN** the `hai3-mfe-externalize` plugin processes the chunk during `vite build`
- **THEN** the static import SHALL be transformed to use `importShared('react')` instead
- **AND** the transformed code SHALL route through the federation runtime's per-MFE `moduleCache`

#### Scenario: Expose entry imports already handled by federation plugin

- **GIVEN** an expose entry file already uses `importShared('react')` via the federation plugin
- **WHEN** the `hai3-mfe-externalize` plugin processes the file
- **THEN** the plugin SHALL NOT create duplicate `importShared()` calls
- **AND** existing `importShared()` calls SHALL remain unchanged

#### Scenario: Plugin reads shared package list from federation config

- **WHEN** the `hai3-mfe-externalize` plugin initializes
- **THEN** it SHALL read the list of shared packages from the federation plugin's `shared` configuration array
- **AND** only imports of those packages SHALL be transformed
- **AND** imports of non-shared packages SHALL remain unchanged

### Requirement: Deterministic Chunk Filenames

The `hai3-mfe-externalize` plugin SHALL configure shared dependency chunks to use deterministic filenames without content hashes. This ensures `chunkPath` values in `mfe.json` (a GTS entity declaration served from the backend) remain stable across rebuilds.

#### Scenario: Shared dependency chunks have no content hashes

- **WHEN** the MFE is built with `vite build`
- **THEN** shared dependency chunks SHALL be emitted with deterministic filenames (e.g., `__federation_shared_react.js`, NOT `__federation_shared_react-DMgTugcw.js`)
- **AND** the filename pattern SHALL be `__federation_shared_<packageName>.js` (scoped packages use the full name, e.g., `__federation_shared_@hai3/uikit.js`)
- **AND** non-shared chunks (expose entries, code-split chunks, federation runtime) MAY retain content hashes

#### Scenario: chunkPath in mfe.json is stable across rebuilds

- **GIVEN** an MFE's `mfe.json` declares `chunkPath: "__federation_shared_react.js"` for the react shared dependency
- **WHEN** the MFE source code is modified and rebuilt
- **THEN** the emitted react chunk filename SHALL remain `__federation_shared_react.js`
- **AND** the `mfe.json` declaration SHALL NOT require updating
- **AND** cache busting SHALL be handled at the deployment URL level (versioned paths, CDN headers), not at the filename level

### Requirement: Plugin Scope and Lifecycle

The `hai3-mfe-externalize` plugin SHALL operate at build time only and SHALL NOT introduce runtime dependencies.

#### Scenario: Plugin runs during vite build only

- **WHEN** the Vite development server is running (`vite dev`)
- **THEN** the `hai3-mfe-externalize` plugin SHALL NOT transform any imports
- **AND** the plugin SHALL only activate during `vite build`

#### Scenario: Plugin has zero runtime footprint

- **WHEN** the MFE bundle is loaded in the browser
- **THEN** no code from the `hai3-mfe-externalize` plugin SHALL be present in the bundle
- **AND** the plugin SHALL NOT add any runtime dependencies to the MFE package

#### Scenario: Plugin is shared across MFE packages

- **WHEN** configuring MFE vite builds
- **THEN** the plugin SHALL be importable from a shared location (`src/mfe_packages/shared/vite-plugin-hai3-externalize.ts`)
- **AND** each MFE's `vite.config.ts` SHALL reference the shared plugin

### Requirement: Import Transformation Correctness

The plugin's import transformations SHALL preserve module semantics and handle edge cases.

#### Scenario: Named imports preserved

- **GIVEN** a chunk contains `import { useState, useEffect } from './bundled-react.js'`
- **WHEN** the plugin transforms this import
- **THEN** the transformed code SHALL destructure the same named exports from `importShared('react')`
- **AND** `useState` and `useEffect` SHALL reference the same exports as the original import

#### Scenario: Default imports preserved

- **GIVEN** a chunk contains `import React from './bundled-react.js'`
- **WHEN** the plugin transforms this import
- **THEN** the transformed code SHALL assign the default export from `importShared('react')` to `React`

#### Scenario: Non-shared package imports untouched

- **GIVEN** a chunk imports from a package not in the `shared` list (e.g., a local utility module)
- **WHEN** the plugin processes the file
- **THEN** the import SHALL remain unchanged
- **AND** relative imports to non-shared modules SHALL NOT be transformed
