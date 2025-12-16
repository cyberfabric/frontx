# Change: Add @hai3/config Package

## Why

HAI3 needs a centralized, type-safe configuration system that allows packages (uicore, studio, etc.) to define their own configuration sections without creating circular dependencies. The current `hai3.config.json` marker file is insufficient for configuring application behavior.

## What Changes

- **NEW** `@hai3/config` package with:
  - `defineConfig` helper (via c12's `createDefineConfig`)
  - `loadConfig` function for reading `hai3.config.ts`
  - Vite plugin for injecting config as `__HAI3_CONFIG__`
  - Empty `Hai3Config` interface for Module Augmentation
- **MODIFIED** Project configuration from `hai3.config.json` to `hai3.config.ts`
- **NEW** Module Augmentation pattern for package-scoped config sections
- **NEW** uicore extends `Hai3Config` with `uicore.router` and `uicore.layout` sections

## Impact

- Affected specs: `cli` (config file change), new `config` capability
- Affected code:
  - New `packages/config/` directory
  - `packages/cli/src/generators/project.ts` (generate hai3.config.ts)
  - `packages/uicore/src/config.ts` (Module Augmentation)
  - `vite.config.ts` in generated projects
