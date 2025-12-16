# config Specification

## Purpose

Centralized, type-safe configuration system for HAI3 applications with Module Augmentation for extensible package-scoped config sections.

## ADDED Requirements

### Requirement: Config Package Structure

The `@hai3/config` package SHALL provide configuration management for HAI3 applications.

#### Scenario: Main package exports

- **GIVEN** `@hai3/config` is installed
- **WHEN** importing from the package
- **THEN** the following exports SHALL be available:
  - `Hai3Config` - Base configuration interface
  - `defineConfig` - Type-safe config helper
  - `getConfig` - Runtime config accessor

#### Scenario: Vite subpath exports

- **GIVEN** `@hai3/config` is installed
- **WHEN** importing Vite plugin
- **THEN** `import { hai3 } from '@hai3/config/vite'` SHALL work
- **AND** `hai3` SHALL be a Vite plugin factory function

### Requirement: Type-Safe defineConfig

The package SHALL provide a `defineConfig` helper using c12's `createDefineConfig` for IDE autocompletion.

#### Scenario: defineConfig usage

```typescript
import { defineConfig } from '@hai3/config';

export default defineConfig({
  uicore: {
    router: { type: 'browser' },
    layout: { header: { visible: true } },
  },
});
```

- **GIVEN** a `hai3.config.ts` file
- **WHEN** using `defineConfig` helper
- **THEN** IDE SHALL provide autocompletion for all config sections
- **AND** TypeScript SHALL validate config structure

#### Scenario: Environment-specific config

- **GIVEN** c12 is used for config loading
- **WHEN** defining environment-specific overrides
- **THEN** `$development`, `$production`, and `$env` keys SHALL be supported

```typescript
export default defineConfig({
  uicore: { layout: { footer: { visible: false } } },
  $development: {
    uicore: { layout: { footer: { visible: true } } },
  },
});
```

### Requirement: Module Augmentation Pattern

The base `Hai3Config` interface SHALL be empty and extensible via TypeScript Module Augmentation.

#### Scenario: Empty base interface

- **GIVEN** `@hai3/config` package
- **WHEN** examining `Hai3Config` interface
- **THEN** it SHALL be an empty interface `{}`
- **AND** packages extend it via `declare module '@hai3/config'`

#### Scenario: Package extends config type

```typescript
// In @hai3/uicore
declare module '@hai3/config' {
  interface Hai3Config {
    uicore?: UicoreConfig;
  }
}
```

- **GIVEN** `@hai3/uicore` is installed
- **WHEN** the package is imported
- **THEN** `Hai3Config` SHALL include `uicore` section type
- **AND** IDE autocompletion SHALL show `uicore` properties

#### Scenario: Types only for installed packages

- **GIVEN** `@hai3/studio` is NOT installed
- **WHEN** writing `hai3.config.ts`
- **THEN** `studio` key SHALL NOT be available in type
- **AND** TypeScript SHALL error if `studio` is used

### Requirement: Vite Plugin

The package SHALL provide a Vite plugin that injects configuration at build time.

#### Scenario: Plugin configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { hai3 } from '@hai3/config/vite';

export default defineConfig({
  plugins: [hai3()],
});
```

- **GIVEN** Vite plugin is configured
- **WHEN** building the application
- **THEN** plugin SHALL read `hai3.config.ts` via c12
- **AND** inject config as `__HAI3_CONFIG__` global

#### Scenario: Config injection via define

- **GIVEN** Vite plugin is active
- **WHEN** application code accesses `__HAI3_CONFIG__`
- **THEN** the serialized config object SHALL be available
- **AND** config SHALL be replaced at compile time (zero runtime cost)

#### Scenario: Dev server restart on config change

- **GIVEN** Vite dev server is running
- **WHEN** `hai3.config.ts` is modified
- **THEN** dev server SHALL restart automatically
- **AND** new config SHALL be applied

### Requirement: Runtime Config Accessor

The package SHALL provide a `getConfig()` function for type-safe runtime access to injected configuration.

#### Scenario: Type-safe config access in runtime packages

```typescript
import { getConfig } from '@hai3/config';

const config = getConfig();
const routerType = config.uicore?.router?.type; // Fully typed
```

- **GIVEN** `__HAI3_CONFIG__` is injected by Vite plugin
- **WHEN** runtime code calls `getConfig()`
- **THEN** it SHALL return the injected config object
- **AND** return type SHALL be `Hai3Config` with all augmentations

### Requirement: Package-Scoped Config Sections

Each HAI3 package SHALL own a top-level key in the configuration.

#### Scenario: uicore config section

- **GIVEN** `@hai3/uicore` extends `Hai3Config`
- **WHEN** defining uicore configuration
- **THEN** config SHALL be under `uicore` key:

```typescript
{
  uicore: {
    router: { type: 'browser' | 'hash' | 'memory' },
    layout: {
      header: { visible: boolean },
      menu: { visible: boolean },
      sidebar: { visible: boolean },
      footer: { visible: boolean },
    }
  }
}
```
