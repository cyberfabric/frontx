# Design: MFE Principles

This document covers the core architectural principles for the MFE system.

**Related Documents:**
- [MFE API](./mfe-api.md) - MfeEntryLifecycle, MfeBridge interfaces
- [MFE Actions](./mfe-actions.md) - Action and ActionsChain types
- [Registry and Runtime](./registry-runtime.md) - Runtime isolation, dynamic registration
- [MFE Loading](./mfe-loading.md) - MfeHandler abstract class, handler registry

---

## Core Principles

1. **Thin Public Contracts** - The public interface is minimal and stable
2. **Instance-Level Runtime Isolation (Default)** - HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](./overview.md#runtime-isolation-default-behavior) for details.
3. **Extensibility via Handlers** - Companies extend via custom handlers, not core changes
4. **MFE Independence (Default)** - Each MFE instance takes full responsibility for its own needs
5. **Hierarchical Composition** - Domains can exist at any level; MFEs can be both extensions and domain providers
6. **Abstract Class Layers with Singleton Construction** - Every major stateful component has an abstract class (pure contract, NO static methods) and a concrete implementation. Single-instance components with no configuration are exposed as singleton constants; single-instance components that require configuration use the factory-with-cache pattern (e.g., `screensetsRegistryFactory`); multi-instance components are constructed by internal wiring code. Standalone factory functions and static factory methods on abstract classes are both forbidden. Consumers always depend on abstract types.
7. **Shadow DOM Style Isolation (Default Handler)** - HAI3's default handler (`MfeHandlerMF`) enforces CSS isolation via Shadow DOM. The MFE receives the shadow root as its mount container, NOT the host element. CSS variables from the host do NOT penetrate into the MFE's shadow root. Each MFE instance is fully responsible for its own styles, including initializing Tailwind CSS and UIKit inside its shadow root. Custom `MfeHandler` implementations may choose different isolation strategies (e.g., no Shadow DOM, iframe isolation, etc.).
8. **Theme and Language via Domain Properties** - Theme and language are communicated to MFEs through built-in shared properties (`HAI3_SHARED_PROPERTY_THEME`, `HAI3_SHARED_PROPERTY_LANGUAGE`) declared on all 4 base extension domains. CSS variables do NOT propagate from host to MFE. The MFE reads these from its `ChildMfeBridge` and applies its own CSS variables and i18n translations inside its Shadow DOM. MFE entries declare these in `requiredProperties` to ensure contract validation at registration time.
9. **No Monorepo Tooling Exclusions for MFE Packages** - MFE packages under `src/mfe_packages/` are app-level (L4) code and MUST follow ALL monorepo rules (ESLint, dependency-cruiser, knip, tsconfig). No exclusions or ignore patterns for `src/mfe_packages/` are permitted.
10. **MFE Layer Enforcement** - MFE packages are L4 (app-level). They can ONLY import from `@hai3/react` (L3). Never from `@hai3/screensets` (L1) or `@hai3/framework` (L2) directly. The ESLint layer rules under `src/` enforce this.

---

## Independent Data Fetching per Runtime

**Principle**: Each runtime (host application and each MFE) is responsible for obtaining its own data from the API independently. MFEs MUST NOT act as data proxies for the host application, and the host MUST NOT depend on MFEs for data it needs.

**Why**:
- Data proxy patterns create tight coupling between host and MFE
- If the MFE fails to load, the host loses data it should have independently
- It inverts the dependency: the host becomes dependent on child runtime behavior
- Duplicate requests are a temporary cost solved by infrastructure, not architecture

**Implications**:
- The host header fetches its own user data independently (e.g., via `@hai3/api`)
- MFEs fetch their own data independently for their own UI needs
- No actions or action handlers exist to "notify" one runtime of another's data
- Later optimization: `@hai3/api` package adds transparent request deduplication/caching so that identical API calls from different runtimes do not result in duplicate network requests

**Anti-patterns (FORBIDDEN)**:
- MFE fetches user data, then sends it to the host via an action (data proxy)
- Host waits for MFE to provide data before rendering its own UI
- Custom action handlers that exist solely to relay data between runtimes

---

## Extensibility via Handlers

Companies extend the MFE system by creating custom derived entry types, custom handlers, and custom bridge factories - NOT by modifying HAI3 core. This keeps the core thin and stable for 3rd-party vendors while allowing enterprises to add richness for internal MFEs.

See [MFE Loading - Decision 10](./mfe-loading.md#decision-10-mfehandler-abstraction-and-registry) for implementation details including MfeHandler, MfeBridgeFactory, and handler registry patterns.

---

## MFE Independence with Thin Public Contracts

**What**: Each MFE **instance** is maximally independent with a thin public contract. The public interface (MfeEntryLifecycle, ChildMfeBridge, actions) is the ONLY required coupling between parent and MFE instance.

**Why**:
- Easy to version and maintain compatibility
- Low coupling between host and MFEs
- MFE developers take full responsibility for their own needs
- Each MFE evolves independently

With HAI3's default handler, each MFE instance has its own API services, router, and state. See [Runtime Isolation](./overview.md#runtime-isolation-default-behavior) for the complete isolation model, architecture diagrams, and recommendations.

### The Trade-off and Solution

**Trade-off**: Duplicate API requests may occur if multiple MFE instances need the same data.

**Solution**: Optimizations happen through **optional private libraries**, NOT through public contracts:

| Layer | Contract Type | Example | Who Controls |
|-------|--------------|---------|--------------|
| Public | Thin | MfeBridge, Actions | HAI3 Architecture |
| Private | Optional | @hai3/api with cache sync | Library Maintainers |

### Private Optimization Layer

Optimizations for duplicate API requests happen through **optional private libraries** (e.g., `@hai3/api` with transparent cache sync), NOT through public contracts. Each MFE instance gets its own library instance; libraries may sync caches implicitly. This is opt-in and does not affect MfeBridge or action interfaces. Implementation of the private optimization layer is out of scope for this proposal.

---

## Shadow DOM Style Isolation (Default Handler)

> **Canonical definition**: This is the authoritative definition of Shadow DOM style isolation. Other documents reference this for context.

**What**: HAI3's default handler (`MfeHandlerMF`) enforces CSS isolation by mounting each MFE instance inside a Shadow DOM boundary. The abstract `MfeHandler` class does NOT mandate Shadow DOM -- this is a property of the `MfeHandlerMF` concrete implementation only.

**How**: When `MfeHandlerMF` mounts an MFE, `DefaultMountManager` creates a Shadow DOM boundary on the container element and passes the **shadow root** (not the host element) to the MFE's `mount(container, bridge)` method. From the MFE's perspective, the `container` parameter IS the shadow root.

**Consequences**:
- CSS variables from the host application do NOT penetrate into the MFE's shadow root
- Global styles from the host do NOT affect MFE content
- Each MFE instance is fully responsible for initializing its own styles (Tailwind CSS, UIKit) inside its shadow root
- MFEs MUST NOT use inline styles -- they use Tailwind classes and UIKit components

**Platform-Level Isolation Guarantee**: The `createShadowRoot()` utility automatically injects CSS isolation styles (`:host { all: initial; display: block; }`) into every shadow root it creates. This is a platform guarantee -- no CSS (including CSS custom properties) leaks from host to MFE. MFEs start from a completely clean CSS slate with no opt-in required. The isolation styles are injected via a `<style id="__hai3-shadow-isolation__">` element with idempotency checks (existing style element is reused if present). This guarantee applies to both newly created shadow roots and pre-existing shadow roots passed to `createShadowRoot()`.

**Custom handlers**: Other `MfeHandler` implementations (written by companies extending HAI3) may use different isolation strategies -- no Shadow DOM, iframe isolation, CSS Modules, or any other approach. The Shadow DOM enforcement is specific to `MfeHandlerMF`.

### Shared Dependencies: Tailwind + UIKit

Each MFE MUST use Tailwind CSS and `@hai3/uikit` for styling:
- Both are added to the Module Federation `shared` config alongside React/react-dom
- Since styles are isolated via Shadow DOM, the MFE must initialize its own Tailwind/UIKit styles inside its shadow root at mount time
- No inline styles -- MFEs use Tailwind classes and UIKit components just like host app code
- Monorepo ESLint rules (including `no-inline-styles`) apply to MFE packages under `src/mfe_packages/` with zero exclusions

### Theme and Language as Domain Properties

Theme and language are communicated to MFEs through built-in shared property instances on the bridge:
- HAI3 defines two shared property instances: `HAI3_SHARED_PROPERTY_THEME` (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.theme.v1`) and `HAI3_SHARED_PROPERTY_LANGUAGE` (`gts.hai3.mfes.comm.shared_property.v1~hai3.mfes.comm.language.v1`)
- All 4 base extension domains declare both in their `sharedProperties` array
- MFE entries declare both in their `requiredProperties` array to ensure contract validation at registration time
- When the host changes theme/language, domain properties update via `registry.updateDomainProperty(domainId, HAI3_SHARED_PROPERTY_THEME, 'dark')`
- The MFE reads `theme` and `language` from its `ChildMfeBridge` (via `bridge.subscribeToProperty()` / `bridge.getProperty()`) and applies them inside its Shadow DOM
- CSS variables do NOT propagate from host to MFE -- the MFE sets its own CSS variables based on domain property values (e.g., `theme: 'dark'` triggers the MFE to apply its dark mode CSS variables)
- This is the mechanism for ALL shared UI state: theme, language, text direction (RTL/LTR), etc.

```
Host Application
       |
       | registry.updateDomainProperty(domainId, themePropertyId, 'dark')
       v
   Domain State
       |
       | property update propagated to all subscribed extensions
       v
  +---------+     +---------+
  | MFE A   |     | MFE B   |
  | (Shadow  |     | (Shadow  |
  |  DOM)    |     |  DOM)    |
  |          |     |          |
  | bridge.  |     | bridge.  |
  | subscribe|     | subscribe|
  | ToProperty|    | ToProperty|
  | ('theme')|     | ('theme')|
  |          |     |          |
  | Applies  |     | Applies  |
  | own CSS  |     | own CSS  |
  | vars for |     | vars for |
  | 'dark'   |     | 'dark'   |
  +---------+     +---------+
```

#### End-to-End Propagation Flow

The full propagation path from host event to MFE rendering:

1. **Host fires event**: The host application dispatches `theme/changed` (with `ChangeThemePayload { themeId: string }`) or `i18n/language/changed` (with `SetLanguagePayload { language: string }`) on the framework event bus.

2. **Microfrontends plugin listener**: The `microfrontends()` plugin (L2) subscribes to these events in its `onInit()`. On receiving the event, the listener calls `registry.updateDomainProperty(domainId, propertyTypeId, value)` for each of the 4 known base domain IDs (screen, sidebar, popup, overlay). Calls to unregistered domains are wrapped in try/catch and silently skipped.

3. **Domain property update**: `ScreensetsRegistry.updateDomainProperty()` updates the property value in the domain's internal state and notifies all subscribed extension bridges.

4. **Bridge property subscription fires**: Each mounted MFE that has called `bridge.subscribeToProperty(propertyTypeId, callback)` receives the new value via its callback. The bridge returns a `SharedProperty` object (`{ id: string; value: unknown }`), so the MFE accesses the string value via `property.value`.

5. **MFE resolves and applies**: The MFE lifecycle code receives the string value (theme ID or language code) and acts on it internally. For theme: the MFE resolves the theme ID to a Theme object and calls `applyThemeToShadowRoot(shadowRoot, theme)` to set CSS variables inside its isolated Shadow DOM. For language: the MFE loads the appropriate translations and updates text direction.

6. **Only strings cross the boundary**: The bridge carries only GTS-contract string values (theme ID strings like `'dark'`, `'light'`; language code strings like `'en'`, `'de'`). No Theme objects, no CSS variable maps, no translation bundles cross the bridge. Resolution of string identifiers to concrete resources is the MFE's internal concern.

---

## MFE Monorepo Tooling Compliance

MFE packages under `src/mfe_packages/` are app-level (L4) code and MUST follow ALL monorepo rules. There are NO exclusions:

| Tool | Exclusion Status |
|------|-----------------|
| ESLint | `src/mfe_packages/**` is NOT excluded -- all rules apply, including `no-inline-styles` |
| dependency-cruiser | `src/mfe_packages` is NOT excluded -- layer enforcement catches violations |
| knip | `src/mfe_packages/**` is NOT excluded |
| tsconfig | `src/mfe_packages` is NOT excluded from compilation |

### MFE Layer Enforcement

MFE packages are L4 (app-level). They can ONLY import from `@hai3/react` (L3):

```
L4: src/mfe_packages/* (MFE app code)   -- can import L3
L3: @hai3/react                          -- can import L2
L2: @hai3/framework                      -- can import L1
L1: @hai3/screensets, @hai3/state, etc.  -- no upward imports
```

**Forbidden imports from MFE packages**:
- `@hai3/screensets` (L1) -- never directly; use `@hai3/react` re-exports
- `@hai3/framework` (L2) -- never directly; use `@hai3/react` re-exports

The existing ESLint layer rules under `src/` enforce this. Since `@hai3/react` re-exports all public symbols from lower layers, MFEs have full access to the API while respecting layer boundaries.

---

## Abstract Class Layers with Singleton Construction

Every major stateful component has an abstract class (pure contract, NO static methods) and a concrete implementation. Construction patterns: singleton constant, factory-with-cache, or direct construction. Consumers always depend on abstract types. See [Registry Runtime - Decision 18](./registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction) for the complete design including component table, file layout, exemptions, and code examples.
