---
title: HAI3 Manifest
description: Core philosophy, principles, and vision of the HAI3 framework
---

# HAI3 Manifest

> **Document version:** v0.1 - EARLY DRAFT, Oct-17 2024

> **TARGET AUDIENCE:** Humans and AI
> **PURPOSE:** Core philosophy, principles, and vision of the HAI3 framework

The purpose of this document is to define the core philosophy, principles, and values behind the HAI3 dev kit - a framework that merges AI-assisted UI generation with human craftsmanship, ensuring maintainable, scalable, and visually consistent applications for SaaS multitenant and multi-user control panels.

## Key Principles

### The HAI3 Mission

The main **HAI3 UI-Core objective** is to achieve the **max possible efficiency** of the application screens generation by **AI**, while maintaining the **code quality** and the **code structure** for future application logic scale.

1. **HAI3 UI-core**: Human-driven development, AI-assisted, well structured and polished.

2. **Application business screens**: AI-driven development with help of HAI3 UI-core, Human-assisted.

The HAI3 dev kit follows the Human-in-the-Loop Workflow philosophy:

- HAI3 defines a predictable AI→human handoff that preserves structure and quality.
- Three-stage flow: Draft → Mockup → Production
- AI generates initial drafts based on user input, layout and schema metadata
- AI tooling highlights policy and component violations
- Humans review, optimize, and merge into screen-sets

> Human involvement is still required for code review, code quality analysis, logic deduplication, and other critical tasks. Normally it is expected that human intervention happens at the end of the AI-driven development process, when initial screen `drafts` and `mockups` are polished and optimized.

## The HAI3 UI-Core Values

### V#1 - Human-Configurable UI-Core

**Layout, styles, and build targets**

HAI3 provides a unified UI-Core structure for all generated screens and allows developers to customize the layout, content, styles, build targets and observability settings according to specific UI application/control panel needs:

- Configurable layout - menu structure, header, footer, and sidebar
- Adaptable screen layouts (grid, form, dashboard, flow, etc.)
- Consistent navigation and placement rules
- Configurable observability and diagnostics (logging, tracing)
- Configurable build targets - web, electron
- Configurable build variants - cdn, local

**Goal:** Enable AI and human developers to build within a shared layout system without layout drift.

### V#2 - Layout-Safe Screen Generation

HAI3 ensures all generated screens fit into the defined panel layout.

- Every screen is built using reusable shared components (or components defined in the screen-set)
- UI-core library can be updated independently from the HAI3 repo at any time (as git submodule or as component or as micro-frontend), screens development is not affected
- Generated screens (or micro-frontends) do not break or overlap other screens or existing panels
- Layout safety validated during build or lint phase

**Goal:** Maintain visual integrity across auto-generated and manually crafted screens.

### V#3 - Component and Style Consistency

All generated UI elements must align with existing UI-Core controls and styles.

- Use of standardized UI components (grids, buttons, modals, forms, etc.)
- Auto-enforcement of existing CSS/Tailwind tokens and naming conventions
- Lint rules ensure AI outputs conform to reusable design system components (e.g. margins and paddings)
- White-label support (logos, palettes, typography)
- Support for color palettes, fonts, and logos
- Theme inheritance across AI-generated and human screens
- AI-generated code must respect theme tokens and constraints (e.g. by rules and prompts)
- Components provide virtualization for large lists/grids; use skeletons/streaming for progressive render

**Goal:** Avoid design fragmentation - AI must behave like a trained team member reusing existing UI vocabulary maintaining consistent brand identity across all auto-generated screens.

### V#4 - Modular Screen Architecture

Every screen is a self-contained folder that can be shared, reused, or replaced.

- A screen = one folder with its logic, layout, and metadata
- Screens can be imported via Git submodules or copied manually
- Developers can fork or duplicate screens to experiment with AI variants
- Screen-sets can be switched at runtime for A/B testing or feature flags
- Screen incapsulates it's own layout, logic and local screen state

**Goal:** Treat UI screens as composable building blocks - easy to swap, version, and evolve.

### V#5 - Pluggable UI Microfrontends Architecture

HAI3 provides a pluggable UI microfrontends architecture that allows developers to build marketplace-style plugin ecosystems where third-party developers can contribute screens and integrations without touching core code.

- Predefined placeholders and slots for UI customization: menu/header/footer/sidebar/action bars
- Runtime plugging of declarative UI elements - forms, grids, dashboards, etc.
- Per-screenset UI component libraries for consistent design systems
- Dynamic screen registration and lazy loading for performance
- Shadow DOM encapsulation and scoped CSS for microfrontend isolation
- Mandate all inter-microfrontend communication occur exclusively via explicit event bus APIs
- Adopt strict Content Security Policies (CSP) and Trusted Types to prevent XSS and malicious injection
- Provide separate local storage, IndexedDB namespaces, and in-memory caches per microfrontend
- Sandboxed execution environment for third-party plugins
- Linter enforces strict style and structure rules for microfrontends

**Goal:** Enable vendors to build secure, isolated plugin ecosystems where third-party developers can contribute screens and integrations without breaking other applications or compromising security.

### V#6 – Shared/Private Store

Adopt the Flux pattern to maintain a predictable global/local store model.

- Shared read-only state across screensets and individual screens
- Private state per screenset and individual screens
- Shared store can store - user details, preferences, roles, branding, subscription, etc.
- Event bus for inter-screen and cross-microfrontend communication
- Offline, Drafts & Background Sync support

**Goal:** Provide a consistent global state model for all screens and services.

### V#7 – Unified API Layer

Provide a typed, reusable SDK that abstracts backend APIs through consistent contracts.

- Typed inputs/outputs contracts (OpenAPI / JSON Schema) generated on UI build
- Runtime input/output validation and observability (Zod)
- Unified API client with retries, ETags, and error normalization
- Unified caching layer with explicing caching strategies and invalidation policies/APIs
- API latency tracking and observability

**Goal:** Provide a consistent API access layer for all screens and services.

### V#8 - Security, Multitenancy & Role-based Access

Security is first-class and configurable per organization/tenant or project.

- OAuth2/OIDC with PKCE and token rotation for enterprise SSO integration
- Session expiration and idle timeout policies configurable per project
- Fine-grained permissions: hide/show/disable UI elements based on user roles
- Tenant isolation: data, configuration, and UI customization per tenant
- Encrypted IndexedDB and strict Content-Security-Policy
- Privacy modes: air-gapped, restricted telemetry, or full cloud
- Audit logging for compliance (SOC2, HIPAA, GDPR)

**Goal:** Provide a consistent security layer for all screens and services. Built-in multitenancy and RBAC reduce time-to-market for SaaS vendors. Tenant isolation and audit logging satisfy enterprise compliance requirements out of the box.

### V#9 - Internationalization & Localization

HAI3 ensures that all AI-generated and human-refined screens meet accessibility standards and support localization by design.

- WCAG 2.1 AA compliance baked into component library and AI-prompts
- Automatic accessibility linting and testing for AI-generated screens
- i18n namespaces per screen with lazy-loaded locale packs
- Built-in RTL/LTR layout handling through tokenized CSS and Tailwind utilities
- Locale-aware date, number, and time formatting helpers for AI-generated UI
- Interface for per-tenant language preferences with runtime locale switching
- Translation management integration for professional localization workflows

**Goal:** Ensure every screen produced by HAI3 is accessible, inclusive, and fully localizable across languages and regions. Global enterprises can deploy a single codebase to multiple regions with full localization support. Accessibility compliance reduces legal risk and expands market reach.

### V#10 - Testing and Quality Gates

HAI3 establishes a tiered, automated quality assurance pipeline that ensures all screens (whether AI-generated or human-crafted) meet enterprise standards for functionality, visual integrity, and accessibility.

- Provide unit/components tests (like Jest, Vitest) to validate business logic, component behavior, and state management
- Visual Regression Tests (like Storybook, Percy, Chromatic) to prevent style drift across devices, themes, and screen sizes
- End-to-End (E2E) Tests (like Cypress, Playwright) to simulate full user journeys including multitenancy switching, RBAC constraints, and complex workflows
- Static Analysis for AI Output (used styles, localisation, etc.)
- Automated Accessibility Checks integration into CI pipeline to scan all screens for WCAG 2.1 AA compliance (color contrast, ARIA attributes, keyboard navigation)
- Microfrontend Isolation Testing to verify sandbox boundaries, CSP enforcement, and inter-plugin communication contracts
- Automated pre-commit hooks enforce linting, formatting, and basic validation
- Performance gates: CI enforces LCP P75 < 1.8s, INP P95 < 200ms, route change P95 < 150ms; RUM dashboards track LCP/INP/CLS/TTFB

**Goal:** Shift quality left by providing immediate, actionable feedback to AI models and human developers. Ensure enterprise-grade quality, accessibility, and security compliance are baked in from the design stage, not retrofitted.
