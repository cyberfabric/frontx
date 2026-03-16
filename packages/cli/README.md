# @hai3/cli

Command-line interface for scaffolding and managing HAI3 framework projects.

## Overview

`@hai3/cli` provides a comprehensive set of commands for creating new HAI3 applications, generating screensets, managing project structure, and maintaining framework dependencies. The CLI streamlines project setup and ongoing development by automating common tasks and enforcing framework conventions.

## Purpose

This package eliminates manual project configuration and boilerplate creation. It generates properly structured HAI3 projects with all necessary dependencies, build configurations, and development tools pre-configured. The CLI ensures projects follow framework best practices from the start and provides utilities for maintaining that structure as projects evolve.

## Core Commands

### Project Creation

Initialize new HAI3 applications with complete project structure, dependency management, and build tooling. The creation process offers interactive prompts for customizing the initial setup, including UI Kit selection and development overlay inclusion.

### Screenset Generation

Create new screensets with proper directory structure, ID management, and template files. Screensets generate with all required files including configuration, screen components, translations, and event handlers.

### Screenset Duplication

Copy existing screensets while automatically transforming all IDs and namespaces to prevent conflicts. This command updates screenset IDs, screen IDs, translation keys, event names, and icon references throughout all files in the source screenset.

### Dependency Updates

Update the CLI itself and all HAI3 framework packages to their latest versions. The command detects whether it's running inside a project or standalone and adjusts its behavior accordingly.

## Installation

### Global Installation (Recommended)

```bash
npm install -g @hai3/cli
```

Global installation makes the `hai3` command available system-wide for creating new projects anywhere on your system.

### Project-Level Installation

```bash
npm install --save-dev @hai3/cli
```

Install as a dev dependency when using CLI commands within project scripts or when global installation isn't preferred.

## Command Reference

### `hai3 create <project-name>`

Creates a new HAI3 project or SDK layer package with the specified name.

**Options:**
- `--layer`, `-l` - Create a package for a specific SDK layer (`sdk`, `framework`, `react`)
- `--uikit` - UI Kit to use (`hai3` or `custom`)
- `--studio` / `--no-studio` - Include or exclude Studio package
- `--no-git` - Skip git initialization
- `--no-install` - Skip npm install

**Interactive Options (when `--layer` not specified):**
- UI Kit selection (HAI3 reference implementation or custom)
- Development overlay inclusion (Studio package)
- Git repository initialization
- Automatic dependency installation

**Output (App Project - default):**
- Fully configured Vite + React + TypeScript project
- HAI3 framework packages installed and configured
- Build and development scripts ready to use
- Architecture validation rules configured

**Output (Layer Package):**
- Layer-appropriate package structure with correct peer dependencies
- TypeScript configuration with layer-specific rules
- ESLint configuration enforcing layer boundaries
- AI assistant configurations (CLAUDE.md, Copilot, Cursor, Windsurf)

### `hai3 screenset create <name>`

Generates a new screenset with proper structure and template files.

**Options:**
- `--category` - Specify screenset category (drafts, mockups, production)

**Generated Structure:**
- Screenset configuration file
- IDs file with all screenset constants
- Screen directory with starter screen
- Internationalization files for all 36 languages
- Event and effect handler files
- Redux slice files

### `hai3 screenset copy <source> <target>`

Duplicates an existing screenset with automatic ID transformation.

**Options:**
- `--category` - Target screenset category

**Transformations Applied:**
- Screenset ID updates
- Screen ID updates
- Translation key namespacing
- Event name updates
- Icon ID updates
- Redux state key updates

### `hai3 update`

Updates CLI and framework packages to latest versions.

**Options:**
- `--alpha`, `-a` - Update to latest alpha/prerelease version
- `--stable`, `-s` - Update to latest stable version
- `--templates-only` - Only sync templates (skip CLI and package updates)
- `--skip-ai-sync` - Skip running AI sync after update

**Channel Detection:**
By default, the command auto-detects which channel to use based on the currently installed CLI version. If you have an alpha version installed, it updates from the alpha channel. If you have a stable version, it updates from the stable channel.

**Behavior:**
- Inside project: Updates CLI globally, framework packages, templates, and AI configurations
- Outside project: Updates only CLI globally

### `hai3 update layout`

Updates layout components from the latest templates.

**Options:**
- `--ui-kit`, `-u` - UI kit to use (`hai3-uikit` or `custom`)
- `--force`, `-f` - Force update without prompting

**Behavior:**
Auto-detects current UI kit from existing layout files and prompts for confirmation before overwriting.

### `hai3 scaffold layout`

Generates layout components in your project from templates.

**Options:**
- `--ui-kit`, `-u` - UI kit to use (`hai3-uikit` or `custom`, default: `hai3-uikit`)
- `--force`, `-f` - Overwrite existing layout files

**Generated Components:**
- `src/layout/Layout.tsx` - Main layout orchestrator
- `src/layout/Header.tsx` - Header component
- `src/layout/Footer.tsx` - Footer component
- `src/layout/Menu.tsx` - Navigation menu
- `src/layout/Sidebar.tsx` - Sidebar component
- `src/layout/Screen.tsx` - Screen content area
- `src/layout/Popup.tsx` - Popup/modal container
- `src/layout/Overlay.tsx` - Overlay component
- `src/layout/index.ts` - Barrel exports

### `hai3 ai sync`

Syncs AI assistant configuration files across multiple IDEs.

**Options:**
- `--tool`, `-t` - Specific tool to sync (`claude`, `copilot`, `cursor`, `windsurf`, `all`)
- `--detect-packages`, `-d` - Detect installed @hai3 packages and merge their configs

**Generated Files:**
- `CLAUDE.md` - Claude Code configuration with command adapters in `.claude/commands/`
- `.github/copilot-instructions.md` - GitHub Copilot instructions
- `.cursor/rules/hai3.mdc` - Cursor rules with command adapters
- `.windsurf/rules/hai3.md` - Windsurf rules with workflow adapters

**Source Files:**
Reads from `.ai/GUIDELINES.md` and `.ai/commands/` directory to generate IDE-specific configurations.

## Project Generation Details

### Directory Structure

Created projects follow HAI3's standard monorepo-style structure with clear separation between framework packages, application code, screensets, themes, and configuration.

### Build Configuration

Projects ship with Vite configured for optimal development and production builds, TypeScript with strict mode enabled, and Tailwind CSS with framework theme integration.

### Quality Tools

Includes ESLint with custom framework rules, TypeScript strict mode checking, dependency validation through Dependency Cruiser, and architecture test setup.

### Development Workflow

Generated projects include scripts for development server, production builds, type checking, linting, architecture validation, and cleanup operations.

## UI Kit Options

HAI3 supports two UI kit configurations when creating projects or scaffolding layout components.

### HAI3 UIKit (Default)

The `hai3-uikit` option generates layout components that import from `@hai3/uikit`. This option is recommended for most projects as it provides pre-built, theme-aware components that integrate seamlessly with the HAI3 framework.

```bash
hai3 create my-project --uikit=hai3
hai3 scaffold layout --ui-kit=hai3-uikit
```

### Custom UIKit

The `custom` option generates placeholder layout components without any `@hai3/uikit` imports. Use this when you want to integrate your own UI library (Material UI, Chakra, etc.) or build components from scratch.

```bash
hai3 create my-project --uikit=custom
hai3 scaffold layout --ui-kit=custom
```

## SDK Layer Development

HAI3 uses a 3-layer SDK architecture. When building custom packages that extend the framework, use the `--layer` option to generate properly configured package scaffolding.

### Layer Architecture

```
┌─────────────────────────────────────────┐
│         React Layer (react)             │
│  React hooks, components, UI bindings   │
│  Depends on: Framework + React          │
├─────────────────────────────────────────┤
│       Framework Layer (framework)       │
│  Redux store, events, registries        │
│  Depends on: SDK packages               │
├─────────────────────────────────────────┤
│          SDK Layer (sdk)                │
│  Pure TypeScript, no dependencies       │
│  Contracts, utilities, types            │
└─────────────────────────────────────────┘
```

### Creating Layer Packages

```bash
# SDK layer - pure TypeScript, no HAI3 dependencies
hai3 create my-contracts --layer=sdk

# Framework layer - depends on @hai3/events, @hai3/store
hai3 create my-store-extension --layer=framework

# React layer - depends on @hai3/framework + React
hai3 create my-hooks --layer=react
```

### Layer Dependencies

Each layer has specific peer dependency requirements enforced by the generated configuration:

| Layer | Allowed Dependencies |
|-------|---------------------|
| SDK | None (pure TypeScript) |
| Framework | `@hai3/events`, `@hai3/store` |
| React | `@hai3/framework`, `react`, `react-dom` |

### Generated Package Structure

Layer packages include:

```
my-package/
├── src/
│   └── index.ts           # Entry point
├── .ai/
│   ├── GUIDELINES.md      # Layer-specific rules
│   └── rules/
│       └── _meta.json     # Layer metadata for AI tools
├── package.json           # With correct peer deps
├── tsconfig.json          # Layer-appropriate config
├── eslint.config.js       # Boundary enforcement
├── tsup.config.ts         # Build configuration
└── README.md              # Layer documentation
```

### AI-Assisted Development

Generated packages include AI assistant configurations that understand layer boundaries:

- **CLAUDE.md** - Instructions preventing cross-layer violations
- **Copilot/Cursor/Windsurf** - Layer-aware code suggestions
- **_meta.json** - Machine-readable layer context

The AI tools will warn you if you attempt to import from a higher layer (e.g., importing React hooks in an SDK package).

## Implementing Custom UI Components

When using the `custom` UI kit option, you receive placeholder components that you need to implement with your preferred UI library. Here's how to customize each component:

### Component Integration Pattern

Each generated layout component follows this pattern:

```tsx
// src/layout/Header.tsx (custom template)
import React from 'react';

export interface HeaderProps {
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ children }) => {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4">
      {/* Replace with your UI library components */}
      {children}
    </header>
  );
};
```

### Integration with UI Libraries

**Material UI Example:**

```tsx
import React from 'react';
import { AppBar, Toolbar } from '@mui/material';

export const Header: React.FC<HeaderProps> = ({ children }) => {
  return (
    <AppBar position="static">
      <Toolbar>{children}</Toolbar>
    </AppBar>
  );
};
```

**Chakra UI Example:**

```tsx
import React from 'react';
import { Box, Flex } from '@chakra-ui/react';

export const Header: React.FC<HeaderProps> = ({ children }) => {
  return (
    <Box as="header" borderBottomWidth="1px" bg="white" px={4} h={14}>
      <Flex align="center" h="full">{children}</Flex>
    </Box>
  );
};
```

### Required Hooks Integration

Custom layout components should still use HAI3's Redux hooks for state management:

```tsx
import { useAppSelector, useAppDispatch } from '@hai3/react';
import { selectMenuItems, selectSidebarOpen } from '@hai3/uicore';

export const Menu: React.FC = () => {
  const menuItems = useAppSelector(selectMenuItems);
  const dispatch = useAppDispatch();

  // Render menu items with your UI library
};
```

### Theme Integration

Custom components should respect HAI3's theme system. Use CSS variables or Tailwind theme tokens:

```tsx
// Using Tailwind CSS (included by default)
<div className="bg-background text-foreground border-border">

// Using CSS variables
<div style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
```

## Advanced Usage

### Programmatic API

The CLI exposes a programmatic API for use in build scripts, automation tools, or custom workflows. Import command executors and invoke them with configuration objects.

```typescript
import { executeCommand, commands } from '@hai3/cli';

// Create a new project
const result = await executeCommand(
  commands.createCommand,
  { projectName: 'my-app', uikit: 'hai3', studio: true },
  { interactive: false }
);

// Create a screenset
await executeCommand(
  commands.screensetCreateCommand,
  { name: 'billing', category: 'drafts' },
  { interactive: false }
);

// Run AI sync
await executeCommand(
  commands.aiSyncCommand,
  { tool: 'all', detectPackages: true },
  { interactive: false }
);
```

### Template Customization

CLI ships with comprehensive template files that new projects copy. These templates stay synchronized with the main HAI3 repository, ensuring new projects always use current best practices.

## Requirements

- Node.js 18.0.0 or higher
- npm 7+ (for workspace support if extending the monorepo structure)

## Version

**Alpha Release** (`0.1.0-alpha.0`) - Commands and APIs may change before stable release.

## License

Apache-2.0

## Repository

[https://github.com/HAI3org/HAI3](https://github.com/HAI3org/HAI3)

## Related Packages

- [`@hai3/uicore`](../uicore) - Core framework package
- [`@hai3/uikit`](../uikit) - UI component library
- [`@hai3/studio`](../studio) - Development tools overlay
