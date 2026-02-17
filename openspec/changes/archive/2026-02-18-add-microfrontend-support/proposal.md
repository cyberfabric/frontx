# Change: Add Microfrontend Support

## Why

HAI3 applications need to compose functionality from multiple independently deployed microfrontends (MFEs). Vendors can create MFE extensions that integrate into parent applications through well-defined extension points. This enables:

1. **Independent Deployment**: MFEs can be deployed separately from the parent application
2. **Vendor Extensibility**: Third parties can create extensions without modifying parent code, using ANY UI framework (Vue 3, Angular, Svelte, etc.)
3. **Instance-Level Runtime Isolation (Default)**: HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](./design/overview.md#runtime-isolation-default-behavior) for details.
4. **Type-Safe Contracts**: Each runtime has its own TypeSystemPlugin instance - MFE instances cannot discover parent or sibling schemas
5. **Framework Agnostic**: Parent uses React, but MFEs can use any framework - no React/ReactDOM dependency for MFEs
6. **Dynamic Registration**: Extensions and MFEs can be registered at ANY time during runtime, not just at app initialization - enabling runtime configuration, feature flags, and backend-driven extensibility
7. **Hierarchical Composition**: MFEs can define their own domains for nested extensions - an MFE can be both an extension (to its parent) and a domain provider (for its children)

## What Changes

### Framework Plugin Model

**Key Principles:**
- **Screensets is CORE to HAI3** - automatically initialized by `createHAI3()`, NOT a `.use()` plugin
- **Microfrontends plugin enables MFE capabilities** with optional handler configuration (`mfeHandlers?: MfeHandler[]`)
- **All domain/extension registration is dynamic** - happens at runtime via actions/API, not at initialization

```typescript
// Screensets is CORE - automatically initialized by createHAI3()
// NOTE: The mfeHandlers configuration is the target state after Phase 34.2.
// Currently microfrontends() rejects all arguments; handler registration
// is wired in Phase 34.2.1.
const app = createHAI3()
  .use(microfrontends({ mfeHandlers: [new MfeHandlerMF(gtsPlugin)] }))
  .build();

// All registration happens dynamically at runtime:
// Extension registration via Flux actions (with store state tracking):
// - mfeActions.registerExtension({ extension })
// Domain registration via runtime API (direct, synchronous):
// - runtime.registerDomain(domain, containerProvider, onInitError?)
```

### Core Architecture

HAI3's default handler enforces instance-level isolation. See [Runtime Isolation](./design/overview.md#runtime-isolation-default-behavior) for the complete isolation model, including recommendations for 3rd-party vs internal MFEs.

**Shadow DOM Style Isolation**: The default handler (`MfeHandlerMF`) enforces CSS isolation via Shadow DOM. Each MFE receives the shadow root as its mount container, not the host element. See [Principles - Shadow DOM Style Isolation](./design/principles.md#shadow-dom-style-isolation-default-handler) for the full isolation model, CSS variable behavior, and custom handler options.

**Theme and Language**: Communicated to MFEs through domain properties on the bridge (`theme`, `language`). The MFE reads these from its `ChildMfeBridge` and sets its own CSS variables inside its Shadow DOM. See [Principles - Theme and Language](./design/principles.md#theme-and-language-as-domain-properties) for the full propagation model.

**Shared Dependencies**: Every MFE MUST include Tailwind CSS and `@hai3/uikit` in its Module Federation `shared` config (alongside React/react-dom), with `singleton: false`. No inline styles. See [MFE Loading - Why singleton: false](./design/mfe-loading.md#decision-11-module-federation-20-for-bundle-loading) for the rationale and [Principles - Shared Dependencies](./design/principles.md#shared-dependencies-tailwind--uikit) for the style requirements.

Communication happens ONLY through the explicit contract (ChildMfeBridge interface):
- **Shared properties** (parent to child, read-only) -- HAI3 provides built-in `theme` (`HAI3_SHARED_PROPERTY_THEME`) and `language` (`HAI3_SHARED_PROPERTY_LANGUAGE`) shared property instances. All 4 base extension domains declare both. MFE entries declare them in `requiredProperties`. See [MFE Shared Property](./design/mfe-shared-property.md) for the full contract flow.
- **Actions chain** delivered by ActionsChainsMediator to targets

**Hierarchical domains**: Domains can exist at ANY level. An MFE can be an extension to its parent's domain, define its OWN domains for nested MFEs, or both simultaneously.

### Architectural Decisions Summary

For the full topic-by-topic index of all design documents, see [overview.md](./design/overview.md). The key architectural decisions are:

| Decision | Summary | Design Doc |
|----------|---------|------------|
| Instance-Level Isolation | Each MFE instance has its own runtime; Shadow DOM enforces CSS isolation | [principles.md](./design/principles.md#shadow-dom-style-isolation-default-handler) |
| Abstract Class Layers | Abstract (contract) + concrete (impl); singleton/factory-with-cache construction | [registry-runtime.md - Decision 18](./design/registry-runtime.md#decision-18-abstract-class-layers-with-singleton-construction) |
| GTS Type System | Opaque type IDs; built-in schemas; derived extension types for domain-specific validation | [type-system.md](./design/type-system.md) |
| Actions Chain Mediation | Declarative lifecycle operations; success/failure branching; domain-specific semantics | [mfe-ext-lifecycle-actions.md](./design/mfe-ext-lifecycle-actions.md) |
| Independent Data Fetching | Each runtime fetches its own data; no data proxying between runtimes | [principles.md](./design/principles.md#independent-data-fetching-per-runtime) |

## Impact

### Affected specs
- `screensets` - Core MFE integration, Type System plugin interface, and type definitions

### Affected code

**New packages:**
- `packages/screensets/src/mfe/` - MFE runtime, ActionsChainsMediator
- `packages/screensets/src/mfe/types/` - Internal TypeScript type definitions
- `packages/screensets/src/mfe/validation/` - Contract matching validation
- `packages/screensets/src/mfe/mediator/` - ActionsChainsMediator for action chain delivery
- `packages/screensets/src/mfe/plugins/` - Type System plugin interface and implementations
- `packages/screensets/src/mfe/plugins/gts/` - GTS plugin implementation (default)
- `packages/screensets/src/mfe/handler/` - MfeHandler abstract class, MfeBridgeFactory, and handler registry
- `packages/screensets/src/mfe/handler/mf-handler.ts` - MfeHandlerMF (Module Federation handler)
- `packages/screensets/src/mfe/handler/mfe-bridge-factory-default.ts` - MfeBridgeFactoryDefault (bridge factory for MfeHandlerMF, extracted in Phase 32)

**Modified packages:**
- `packages/screensets/src/state/` - Isolated state instances (uses @hai3/state)
- `packages/screensets/src/screensets/` - Extension domain registration
- `packages/framework/src/plugins/microfrontends/` - Enables MFE capabilities (optional handler configuration via `mfeHandlers`)

### Test File Location Convention

Test files MUST be placed in `packages/<package>/__tests__/` (mirroring `src/mfe/` structure), NOT co-located inside `src/` subdirectories. The root `tsconfig.json` exclude pattern only matches `__tests__` directly under `packages/*/` or `packages/*/src/`, not deeply nested paths.

### Interface Changes

Note: HAI3 is in alpha stage. Backward-incompatible interface changes are expected.

- MFEs require Type System-compliant type definitions for integration
- Extension points must define explicit contracts
- `ScreensetsRegistryConfig` requires `typeSystem` parameter

### Implementation strategy
1. Define `TypeSystemPlugin` interface in @hai3/screensets
2. Create GTS plugin implementation with built-in first-class citizen schemas
3. Implement ScreensetsRegistry with dynamic registration API
4. Define internal TypeScript types for MFE architecture (8 core + 2 MF-specific + 1 built-in derived type)
5. GTS plugin registers all first-class schemas during construction (no separate initialization step)
6. Support runtime registration of extensions, domains, and MFEs at any time
7. Propagate plugin through @hai3/framework layers
8. Update documentation and examples
9. Refactor ScreensetsRegistry into abstract class (pure contract) + DefaultScreensetsRegistry concrete + screensetsRegistry singleton constant (intermediate -- replaced by factory-with-cache in step 12)
10. Split collaborator files into separate abstract/concrete modules
11. Update all DIP consumer references to type against abstract ScreensetsRegistry; eliminate all standalone factory functions and static factory methods
12. Replace screensetsRegistry singleton constant with ScreensetsRegistryFactory factory-with-cache pattern to enable true TypeSystemPlugin pluggability
