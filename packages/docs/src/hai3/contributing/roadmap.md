---
title: Development Roadmap
description: HAI3 development planning and task tracking
---

# HAI3 Development Roadmap

> **TARGET AUDIENCE:** Humans
> **PURPOSE:** Development planning and task tracking

This roadmap outlines practical, actionable tasks. V#1 defines the core dual-mode architecture (SDK + Full Platform), while V#2-V#10 represent feature areas that build on this foundation.

---

## v0.1.0 Core Milestones

### Architecture & Packages
- [x] Implement basic version of Layout
- [x] Introduce basic structure of UI Kit
- [x] Implement basic data flow and state management
- [x] Move UI Core and UI Kit to separate packages
- [x] Create uikit-contracts package (interface definitions)
- [x] Create studio package (development overlay)
- [x] Create CLI package (project scaffolding)
- [x] Migrate to flux architecture (event-driven)
- [x] Remove dependency of UI Core on UI Kit (abstract via contracts)
- [x] Implement UI Kit components registry

### Navigation & Routing
- [x] Navigation (application routing)
- [x] Route registry with lazy initialization
- [x] URL sync with Redux state

### API Layer
- [x] Basic interaction with API
- [x] Support REST protocol in API services
- [x] Support SSE protocol in API services
- [x] Implement API mock plugin
- [ ] Support updating data on backend events (SSE)

### Localization
- [x] Localization infrastructure
- [x] Multi-language dictionary examples (36 languages)
- [x] Implement screens lazy loading
- [x] Implement per-screen i18n dictionaries lazy loading

### Developer Tools
- [x] Implement studio as a separate dev dependency
- [x] Demo page with all UI Kit elements and style annotations
- [x] HAI3 CLI for project creation
- [x] HAI3 CLI for screenset management (create, copy)
- [x] HAI3 CLI for package updates (update command with alpha/stable channels)
- [x] HAI3 CLI for component validation (validate:components command)
- [x] HAI3 CLI template system (3-stage pipeline: copy → generate → use)
- [x] Full template sync via `hai3 update` command
- [x] Develop HAI3-Samples in separate repository

### Pending for v0.1.0
- [ ] Role based access control
- [ ] Define and document data types for interfaces (Tenant, User, UI Flags)
- [ ] UI styles polishing
- [ ] Tests
- [ ] Electron build

### Architecture Checks (arch:check)
- [x] Circular dependencies check
- [x] HAI3 packages dependencies violations check
- [x] Flux architecture violations check
- [x] Unused imports and variables check
- [x] Clean build validation
- [x] Unused exports check (knip)
- [x] Hardcoded colors violations check (via no-inline-styles ESLint rule)

---

## V#1 - 4-Layer SDK Architecture ✅ COMPLETE

**Goal**: HAI3 operates with a layered architecture - SDK packages (L1) for pure data flow, Framework (L2) for plugin system and registries, React (L3) for UI bindings, and App (L4) for user application code.

### 4-Layer Package Structure ✅

```
L1 (SDK)        @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
                Zero cross-dependencies, no React, use anywhere
                    ↓
L2 (Framework)  @hai3/framework
                Plugin system, registries, composed from SDK
                    ↓
L3 (React)      @hai3/react
                React bindings, hooks, providers
                    ↓
L4 (App)        User application code
                Screensets, themes, custom components
```

### Phase 1: SDK Package Implementation ✅
- [x] Create @hai3/state package (EventBus, store, slices, registerSlice)
- [x] Create @hai3/api package (BaseApiService, RestProtocol, MockPlugin)
- [x] Create @hai3/i18n package (Language enum, translation loading)
- [x] Create @hai3/screensets package (screenset types and utilities)
- [x] All SDK packages have zero @hai3 dependencies
- [x] All SDK packages work without React

### Phase 2: Framework Implementation ✅
- [x] Create @hai3/framework with plugin system
- [x] Implement createHAI3() builder with .use() and .build()
- [x] Implement plugins: screensets, themes, layout, routing, navigation, i18n
- [x] Implement presets: full (all plugins), minimal, headless (screensets only)
- [x] createHAI3App() convenience function
- [x] Plugin dependency resolution and lifecycle management

### Phase 3: React Bindings ✅
- [x] Create @hai3/react package
- [x] Implement HAI3Provider component
- [x] Implement hooks: useAppSelector, useAppDispatch, useTranslation
- [x] Implement AppRouter component
- [x] Only @hai3/framework as dependency

### Phase 4: Tooling & Validation ✅
- [x] Layer-specific ESLint configs (@hai3/eslint-config)
- [x] Layer-specific dependency-cruiser configs (@hai3/depcruise-config)
- [x] Per-package eslint.config.js and .dependency-cruiser.cjs
- [x] Architecture tests: npm run arch:sdk, arch:layers
- [x] CLI updates: scaffold layout, ai sync, layer support
- [x] Package-level CLAUDE.md documentation

### Phase 5: Deprecation & Migration ✅
- [x] @hai3/uicore re-exports from @hai3/framework + @hai3/react (deprecated)
- [x] @hai3/uikit-contracts re-exports from @hai3/uikit (deprecated)
- [x] State migration helpers for old state paths
- [x] Layout components moved to CLI templates
- [x] Backward compatibility maintained

### Future: Studio & Emulator (Planned)
- [ ] Adapt Studio to work with SDK modules (not just screensets)
- [ ] Add event bus monitoring and Redux state viewer
- [ ] Create @hai3/emulator package for backend simulation

### Full Platform Mode (Layout System)
- [x] Implement menu collapse/expand toggle
- [x] Menu items from screenset configuration
- [ ] Create proper centralized layout configuration
- [ ] Add configurable header height, footer height, sidebar widths
- [ ] Implement layout presets (compact, standard, spacious)
- [ ] Add layout configuration UI in Settings screen
- [ ] Implement menu item visibility rules based on configuration
- [ ] Add support for nested menu items (sub-menus)
- [ ] Create menu item ordering/reordering system
- [ ] Add menu item badges/notifications support
- [ ] Implement popup/overlay/sidebar registration in screensets (similar to screens)
- [ ] Create PopupConfig, OverlayConfig, SidebarConfig interfaces
- [ ] Add uicore orchestration for popups/overlays/sidebars lifecycle
- [ ] Implement lazy loading for registered popups/overlays/sidebars

---

## V#2 - Layout-Safe Screen Generation

**Goal**: Maintain visual integrity across auto-generated and manually crafted screens.

### Repository
- [x] Define the project repository layout
- [x] NPM packages published (@hai3/cli, @hai3/uikit, @hai3/uicore, @hai3/studio, @hai3/uikit-contracts)
- [x] ESM-first package format for all packages (with dual CJS/ESM exports)
- [x] CLI migrated to ESM-only
- [ ] Define the config files layout with default values
- [ ] Prepare the `docs/REPO_STRUCTURE.md`
- [ ] The HAI3 submodule/package can be updated independently at any time

### Screensets
- [x] Create a mechanism for screensets registration
- [x] Implement screenset categories (Drafts, Mockups, Production)
- [x] Implement the customizable screenset switcher
- [x] Auto-discovery via Vite glob pattern
- [x] Screenset self-containment (IDs centralized in ids.ts, auto-derive names)
- [x] Auto-namespace icon IDs with screenset prefix
- [x] Auto-derive Redux slice names, event namespaces, API domains
- [x] 96% reduction in duplication effort (copy + update ids.ts only)
- [ ] Ensure the UI-Core part is layout-safe

### AI-guidelines
- [x] Define AI-guidelines for screen generation (.ai/ folder)
- [x] ESLint rules for screenset conventions
- [x] Multi-IDE support (Claude Code, Cursor, Windsurf, Cline, Aider)
- [x] Command prefixing strategy (hai3:, openspec:, hai3dev:)
- [x] Split AI rules by context (standalone vs monorepo)
- [x] Commands-only architecture (eliminated workflows)
- [x] Layer-aware AI configuration (targets filtered by project layer)
- [x] Layer-specific GUIDELINES variants (sdk, framework, react/app)
- [x] Command variant selection with fallback chain (react → framework → sdk → base)
- [x] Layer stored in hai3.config.json for `hai3 update` to use
- [ ] Implement AI-guidelines validation in CI

---

## V#3 - Component and Style Consistency

**Goal**: Avoid design fragmentation - AI must behave like a trained team member reusing existing UI vocabulary.

### Component Library
- [x] Create shared UI Kit package
- [x] Base components (button, card, dialog, dropdown-menu, input, select, etc.)
- [x] Composite components (chat, navigation, user)
- [x] Layout components (header, skeleton, spinner)
- [x] Add `Tabs.tsx` component
- [x] Add `Breadcrumb.tsx` component
- [ ] Add `Table.tsx` component with sorting, filtering, pagination
- [ ] Add `Form.tsx` component with validation support
- [ ] Add `Toast.tsx` notification component

### Style System
- [x] Theme registry for theme management
- [x] Theme selector component
- [x] Multiple built-in themes (default, light, dark, dracula, dracula-large)
- [x] Tailwind CSS integration
- [ ] Document all theme tokens in `docs/THEME_TOKENS.md`
- [ ] Create Tailwind plugin for custom HAI3 utilities
- [ ] Add CSS variable fallbacks for all theme tokens
- [ ] Create style guide documentation with examples

---

## V#4 - Modular Screen Architecture

**Goal**: Treat UI screens as composable building blocks - easy to swap, version, and evolve.

### Screen Module System
- [ ] Create screen metadata schema (version, author, dependencies, description)
- [ ] Implement screen validation system (schema validation, dependency checks)
- [ ] Add screen versioning and compatibility checks
- [ ] Create screen documentation template

### Screen Packaging & Distribution
- [ ] Create CLI tool for screen packaging (`npm run pack-screen`)
- [ ] Implement screen import/export functionality
- [ ] Add Git submodule support documentation
- [ ] Create screen marketplace manifest format (JSON schema)

### Screen-Set Management (Full Platform Mode)
- [ ] Add screen-set configuration UI in Settings
- [ ] Create screen-set comparison/diff tool for A/B testing
- [ ] Add feature flag integration for screen-set toggling

---

## V#5 - Pluggable UI Microfrontends Architecture (Full Platform Mode)

**Goal**: Enable secure, isolated plugin ecosystems where third-party developers can contribute screens and integrations. Applies to Full Platform Mode only.

### Placeholder System
- [ ] Document all placeholders in `docs/PLACEHOLDERS.md`
- [ ] Implement menu placeholder API
- [ ] Implement header placeholder API
- [ ] Implement footer placeholder API
- [ ] Implement sidebar placeholder API
- [ ] Implement action bar placeholder API
- [ ] Implement notification placeholder API
- [ ] Create placeholder registration and lifecycle hooks

### Microfrontend Registration & Loading
- [ ] Design microfrontend API interface
- [ ] Create microfrontend registry
- [ ] Implement lazy loading for microfrontend modules
- [ ] Add microfrontend metadata schema (version, author, permissions, dependencies)
- [ ] Create microfrontend validation system

### Isolation & Security
- [ ] Implement Shadow DOM encapsulation for microfrontends
- [ ] Create scoped CSS system for microfrontend styles
- [ ] Implement sandboxed execution environment
- [ ] Add separate storage namespaces per microfrontend
- [ ] Create explicit event bus API for inter-microfrontend communication
- [ ] Document event bus API and communication patterns

### Microfrontend Security
- [ ] Create permission system for microfrontend capabilities
- [ ] Add microfrontend security audit logging
- [ ] Document microfrontend security best practices

### Plugin Management UI
- [ ] Create plugin marketplace UI in Settings
- [ ] Add plugin installation/uninstallation flow
- [ ] Implement plugin configuration UI
- [ ] Add plugin permissions management UI
- [ ] Create plugin debugging tools

### Example & Documentation
- [ ] Create example microfrontend
- [ ] Document microfrontend development guide
- [ ] Create microfrontend starter template
- [ ] Add microfrontend testing utilities

---

## V#6 - Shared/Private Store and Global/Local State

**Goal**: Provide a consistent global state model for all screens and services.

### State Management
- [x] Redux store with dynamic slice registration
- [x] Layout state (header, footer, menu, sidebar, screen, popup, overlay)
- [x] App state (theme, language, user, screenset)
- [x] TypeScript types for all store slices (module augmentation)
- [ ] Implement normalized entities store
- [ ] Add state migration system for version upgrades

### Persistence Layer
- [ ] Create multi-tier storage (memory/session/IndexedDB)
- [ ] Implement automatic state persistence
- [ ] Implement state export/import for debugging

### Event System
- [x] Create event bus for inter-screen communication
- [x] Document event naming conventions
- [x] Event types with TypeScript (EventPayloadMap)

---

## V#7 - Unified API Layer

**Goal**: Provide a consistent API access layer for all screens and services.

### API Client
- [x] Create BaseApiService with error handling
- [x] Implement request/response interceptors (plugins)
- [x] REST protocol support
- [x] SSE protocol support
- [x] Mock plugin for development
- [x] API registry for service management
- [ ] Add ETag support for caching
- [ ] Implement request deduplication
- [ ] Add request cancellation support

### Type Safety
- [x] TypeScript types for API services
- [ ] Add Zod schemas for runtime validation
- [ ] Generate TypeScript types from OpenAPI specs (tooling)
- [ ] Add API response mocking utilities

### Observability
- [ ] Implement API performance metrics

---

## V#8 - Security, Multitenancy & Role-based Access

**Goal**: Provide a consistent security layer for all screens and services. Built-in multitenancy and RBAC.

### Authentication
- [ ] Create auth folder and config file
- [ ] Implement OAuth2/OIDC client
- [ ] Add session management with token rotation
- [ ] Implement idle timeout detection
- [ ] Add "Remember Me" functionality

### Authorization & RBAC
- [ ] Add permission checking utilities
- [ ] Define permission model in the `docs/PERMISSIONS.md`
- [ ] Implement role-based UI guards (hide/show/disable) (Full Platform Mode)
- [ ] Create permission configuration UI in Settings (Full Platform Mode)

### Multitenancy
- [ ] Implement tenant-specific configuration storage
- [ ] Add tenant isolation in state management
- [ ] Create tenant switcher/impersonation UI component (Full Platform Mode)

### Security Features
- [ ] Implement Content-Security-Policy headers
- [ ] Add IndexedDB encryption for sensitive data
- [ ] Create audit logging system
- [ ] Add privacy mode toggle (disable telemetry)

---

## V#9 - Internationalization & Localization

**Goal**: Ensure every screen is accessible, inclusive, and fully localizable across languages and regions.

### i18n Infrastructure
- [x] Set up i18n library
- [x] Create localization folder structure
- [x] Implement locale detection and switching
- [x] Add language selector
- [x] Support for 36 languages

### Translation Management
- [x] Create translation keys for UI text
- [x] Implement lazy loading for locale packs
- [x] Per-screen translation loading
- [x] TextLoader component for loading states
- [ ] Add missing translation warnings in dev mode
- [ ] Create translation extraction tool

### Locale-Aware Formatting
- [ ] Create formatters for date/number/currency formatting
- [ ] Implement RTL layout support
- [ ] Add locale-aware sorting utilities
- [ ] Test all screens with RTL languages

### Accessibility
- [ ] Run WCAG 2.1 AA audit on all components
- [ ] Add ARIA labels to all interactive elements
- [ ] Implement keyboard navigation for all screens
- [ ] Add screen reader testing documentation

---

## V#10 - Testing and Quality Gates

**Goal**: Establish a tiered, automated quality assurance pipeline that ensures all screens meet enterprise standards for functionality, visual integrity, and accessibility.

### Three-Tier Testing Strategy

#### Unit/Component Tests (Tier 1)
- [ ] Set up Jest or Vitest for unit testing
- [ ] Create test utilities for component testing
- [ ] Add tests for business logic and state management
- [ ] Implement test coverage reporting (target: 80%+)
- [ ] Add snapshot testing for component outputs

#### Visual Regression Tests (Tier 2)
- [ ] Set up Storybook for component documentation
- [ ] Integrate Percy or Chromatic for visual regression testing
- [ ] Create visual test suite for all UI components
- [ ] Add cross-browser visual testing (Chrome, Firefox, Safari)
- [ ] Test responsive layouts across device sizes
- [ ] Test all theme variants for visual consistency
- [ ] Add visual diff reporting in CI/CD

#### End-to-End Tests (Tier 3)
- [ ] Set up Playwright for E2E testing
- [ ] Create E2E test suite for critical user journeys
- [ ] Add multitenancy switching tests
- [ ] Test RBAC constraints and permission flows
- [ ] Add complex workflow tests (multi-step processes)
- [ ] Implement E2E test parallelization
- [ ] Add E2E test recording and debugging tools

### AI-Specific Quality Gates

#### Static Analysis for AI Output (Quality Gate 1)
- [x] Create custom ESLint plugin for HAI3 rules
- [x] Add rule: domain-event-format (event naming conventions)
- [x] Add rule: no-barrel-exports-events-effects
- [x] Add rule: no-coordinator-effects
- [x] Add rule: no-missing-domain-id
- [x] Add rule: no-inline-styles (forbids style={{}} and hex colors)
- [x] Add rule: screen-inline-components (prevents inline FC declarations in Screen files)
- [x] Add rule: uikit-no-business-logic (prevents uicore imports in uikit)
- [ ] Add rule: Component vocabulary adherence (V#3) - only approved components
- [ ] Add rule: i18n readiness (V#9) - no hardcoded strings
- [ ] Add rule: Layout compliance (V#2) - proper layout template usage
- [ ] Implement quality gate: block Draft->Mockup transition if rules fail
- [ ] Create AI linter report dashboard

#### Automated Accessibility Checks (Quality Gate 2)
- [ ] Integrate axe-core into test suite
- [ ] Add Lighthouse CI for accessibility audits
- [ ] Create accessibility test suite for all components
- [ ] Test color contrast ratios (WCAG 2.1 AA)
- [ ] Validate ARIA attributes and roles
- [ ] Test keyboard navigation flows
- [ ] Add screen reader compatibility tests
- [ ] Implement quality gate: block merges if critical a11y issues detected

#### Microfrontend Isolation Testing (Quality Gate 3)
- [ ] Create test suite for Shadow DOM isolation
- [ ] Test CSS scoping and style encapsulation
- [ ] Validate storage namespace separation
- [ ] Test event bus communication contracts
- [ ] Verify CSP enforcement
- [ ] Test plugin sandbox boundaries
- [ ] Add security vulnerability scanning for plugins

### Pre-commit & CI/CD Integration

#### Pre-commit Hooks
- [x] Set up prek for Git hooks (alternative to Husky, installed via postinstall)
- [x] Add pre-commit hook: ESLint
- [x] Add pre-commit hook: TypeScript type checking
- [ ] Add pre-commit hook: Basic unit tests (fast tests only)
- [ ] Add commit message linting (conventional commits)
- [ ] Document pre-commit setup in `docs/CONTRIBUTING.md`

#### CI/CD Pipeline
- [ ] Create GitHub Actions workflow (or equivalent)
- [ ] Stage 1 (Draft validation): Run AI-specific linter
- [ ] Stage 2 (Mockup validation): Run visual regression + a11y tests
- [ ] Stage 3 (Production validation): Run full test suite (unit + E2E)
- [ ] Add quality gate: minimum code coverage threshold
- [ ] Add quality gate: zero critical accessibility issues
- [ ] Add quality gate: zero high-severity security vulnerabilities
- [ ] Create test result dashboard and reporting
- [ ] Add automatic PR comments with test results

### Quality Metrics & Reporting

#### Metrics Collection
- [ ] Implement test execution time tracking
- [ ] Track code coverage trends over time
- [ ] Monitor accessibility score trends
- [ ] Track visual regression detection rate
- [ ] Measure AI-generated code quality scores

#### Reporting & Dashboards (in Studio)
- [ ] Create quality dashboard panel
- [ ] Add test result visualization
- [ ] Generate quality reports per screen-set/module
- [ ] Create AI output quality scorecard
- [ ] Add trend analysis and insights

---

## Cross-Cutting Concerns

### Build System & Deployment
- [x] Vite build system
- [x] Code splitting with lazy loading
- [x] Hot module replacement
- [ ] Create build configuration for CDN vs local deployment
- [ ] Implement environment-specific builds (dev/staging/prod)
- [ ] Add screen-set inclusion/exclusion in build config
- [ ] Optimize bundle size
- [ ] Add auto-update functionality for Electron app
- [ ] Implement native menu bar for desktop app
- [ ] Add system tray integration
- [ ] Create installer scripts for Windows/Mac/Linux
- [ ] Add service worker for PWA offline support
- [ ] Create PWA manifest file
- [ ] Create Docker configuration for containerized deployment
- [ ] Add Kubernetes deployment manifests
- [ ] Document on-premise installation process

### Documentation
- [x] .ai/ folder with detailed guidelines
- [x] API documentation in code
- [ ] Complete Storybook documentation for all components
- [ ] Write API documentation for all public interfaces
- [ ] Create video tutorials for common tasks
- [ ] Document AI prompt templates for screen generation
- [ ] Create troubleshooting guide
- [ ] Add architecture decision records (ADRs)

### Developer Experience
- [x] Hot module replacement (Vite)
- [x] TypeScript IntelliSense support
- [x] ESLint integration
- [ ] Create VS Code extension for HAI3 development
- [ ] Create debugging guide documentation
- [ ] Add development environment setup script
- [ ] Create code snippets and templates
