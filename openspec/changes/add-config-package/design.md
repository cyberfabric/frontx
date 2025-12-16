## Context

HAI3 ecosystem consists of multiple packages (uicore, uikit, studio, cli) that need configuration. Current `hai3.config.json` only serves as a project marker. A proper configuration system is needed that:

- Provides type-safe config with IDE autocompletion
- Allows packages to define their own config sections
- Follows industry standards
- Maintains correct dependency direction

## Goals / Non-Goals

**Goals:**
- Type-safe `defineConfig` with autocompletion
- Package-scoped configuration sections (`uicore`, `studio`, etc.)
- Module Augmentation for extensible types
- Vite plugin for build-time config injection
- Support for c12 features ($development, $production, extends)
- Config watch in dev mode (restart dev server on config change)

**Non-Goals:**
- Runtime config loading in browser (config is build-time only)
- Config presets/extends system (future enhancement)
- Config validation beyond TypeScript types

## Decisions

### 1. Use c12 for config loading

**Decision:** Use `createDefineConfig` from c12 package.

**Rationale:** c12 is the industry standard. Provides:
- TypeScript config file support via jiti
- Environment-specific configs ($development, $production)
- Extends capability for future presets
- Well-tested, maintained by UnJS

**Alternatives considered:**
- Custom implementation: More work, reinventing the wheel
- cosmiconfig: Less TypeScript-native than c12

### 2. Empty base interface with Module Augmentation

**Decision:** `Hai3Config` interface starts empty, packages extend via augmentation.

```typescript
// @hai3/config
export interface Hai3Config {}

// @hai3/uicore augments
declare module '@hai3/config' {
  interface Hai3Config {
    uicore?: UicoreConfig;
  }
}
```

**Rationale:** 
- Types only available for installed packages
- No circular dependencies
- Follows EventPayloadMap pattern already in codebase

### 3. Package-scoped config sections

**Decision:** Each package owns a top-level key (`uicore`, `studio`).

```typescript
{
  uicore: { router: {...}, layout: {...} },
  studio: { enabled: true }
}
```

**Rationale:**
- Clear ownership boundaries
- Packages read only their section
- No naming conflicts

### 4. Vite plugin in @hai3/config

**Decision:** Vite plugin lives in `@hai3/config/vite` subpath export.

**Rationale:**
- Config package knows how to load config
- Single source for config-related tooling
- Can add other bundler plugins later

### 5. Injection via Vite define

**Decision:** Config injected as `__HAI3_CONFIG__` global via Vite `define`.

**Rationale:**
- Zero runtime cost (compile-time replacement)
- Standard Vite pattern
- Works in all environments (browser, SSR, tests)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| c12 as new dependency | Well-maintained, minimal footprint |
| Config must be serializable | Document limitation, only primitives |
| Breaking change for existing projects | CLI update command migrates config |

## Migration Plan

1. Create `@hai3/config` package
2. Update CLI to generate `hai3.config.ts` instead of `.json`
3. CLI `update` command migrates existing projects
4. Add uicore Module Augmentation for initial config sections

## Open Questions

- None currently
