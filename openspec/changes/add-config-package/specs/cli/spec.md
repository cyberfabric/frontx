## MODIFIED Requirements

### Requirement: Project Configuration File

Projects created or managed by CLI SHALL have a `hai3.config.ts` configuration file at the project root that supports typed configuration via `@hai3/config`.

#### Scenario: Config file structure

```typescript
// hai3.config.ts
import { defineConfig } from '@hai3/config';

export default defineConfig({
  uicore: {
    router: { type: 'browser' },
    layout: {
      header: { visible: true },
      menu: { visible: true },
      sidebar: { visible: false },
      footer: { visible: true },
    },
  },
});
```

- **GIVEN** a project created with HAI3 CLI
- **WHEN** `hai3.config.ts` is generated
- **THEN** the file SHALL use `defineConfig` from `@hai3/config`
- **AND** include default uicore configuration

#### Scenario: Config for project detection

- **GIVEN** any `hai3` command execution
- **WHEN** determining if inside HAI3 project
- **THEN** the system SHALL search for `hai3.config.ts` or `hai3.config.json` in current and parent directories

#### Scenario: Generated vite.config.ts includes plugin

- **GIVEN** a project created with HAI3 CLI
- **WHEN** `vite.config.ts` is generated
- **THEN** the file SHALL include `@hai3/config/vite` plugin:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { hai3 } from '@hai3/config/vite';

export default defineConfig({
  plugins: [react(), hai3()],
});
```
