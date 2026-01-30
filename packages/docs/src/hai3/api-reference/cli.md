---
title: CLI API Reference
description: API reference for @hai3/cli package
---

# CLI API Reference

Complete command reference for `@hai3/cli` package.

## Installation

```bash
npm install -g @hai3/cli
```

Or use directly with npx:

```bash
npx @hai3/cli create my-app
```

## Commands

### `create`

Create a new HAI3 project.

```bash
hai3 create <name> [options]
```

**Arguments:**
- `name`: Project name

**Options:**
- `--uikit <kit>`: UI kit (`mui` | `antd` | `chakra` | `none`) (default: `mui`)
- `--language <lang>`: Language (`typescript` | `javascript`) (default: `typescript`)
- `--package-manager <pm>`: Package manager (`npm` | `yarn` | `pnpm`) (default: `npm`)
- `--template <template>`: Template name (default: `default`)
- `--no-install`: Skip dependency installation

**Examples:**

```bash
# Create with defaults (TypeScript + MUI)
hai3 create my-app

# Create with Ant Design
hai3 create my-app --uikit=antd

# Create without UI kit
hai3 create my-app --uikit=none

# Create with pnpm
hai3 create my-app --package-manager=pnpm

# Create without installing dependencies
hai3 create my-app --no-install
```

### `generate screenset`

Generate a new screenset.

```bash
hai3 generate screenset <name> [options]
```

**Arguments:**
- `name`: Screenset name (kebab-case)

**Options:**
- `--with-state`: Include Redux slice
- `--with-i18n`: Include translations
- `--screens <names>`: Comma-separated initial screen names

**Examples:**

```bash
# Basic screenset
hai3 generate screenset dashboard

# With initial screens
hai3 generate screenset dashboard --screens=overview,analytics

# With state and i18n
hai3 generate screenset dashboard --with-state --with-i18n
```

**Generates:**

```
src/screensets/dashboard/
├── index.ts
├── screens/
│   └── Main.tsx
├── components/
├── state/
│   └── dashboardSlice.ts
└── translations/
    ├── en.json
    └── es.json
```

### `generate screen`

Generate a new screen in a screenset.

```bash
hai3 generate screen <screenset>/<name> [options]
```

**Arguments:**
- `screenset`: Screenset name
- `name`: Screen name (PascalCase)

**Options:**
- `--type <type>`: Screen type (`standard` | `form` | `list` | `detail`) (default: `standard`)

**Examples:**

```bash
# Standard screen
hai3 generate screen dashboard/Analytics

# Form screen
hai3 generate screen settings/ProfileEdit --type=form

# List screen
hai3 generate screen products/ProductList --type=list
```

**Generates:**

```
src/screensets/dashboard/screens/Analytics.tsx
```

### `generate service`

Generate an API service.

```bash
hai3 generate service <name> [options]
```

**Arguments:**
- `name`: Service name (PascalCase)

**Options:**
- `--mock`: Include mock plugin
- `--methods <methods>`: Comma-separated HTTP methods (`get,post,put,delete`)

**Examples:**

```bash
# Basic service
hai3 generate service Tasks

# With mock data
hai3 generate service Tasks --mock

# With specific methods
hai3 generate service Tasks --methods=get,post
```

**Generates:**

```
src/services/api/tasksApi.ts
```

### `generate slice`

Generate a Redux slice.

```bash
hai3 generate slice <name> [options]
```

**Arguments:**
- `name`: Slice name (camelCase)

**Options:**
- `--with-thunks`: Include async thunk examples

**Examples:**

```bash
hai3 generate slice user

hai3 generate slice products --with-thunks
```

**Generates:**

```
src/state/userSlice.ts
```

### `dev`

Start development server.

```bash
hai3 dev [options]
```

**Options:**
- `--port <port>`: Port number (default: `5173`)
- `--host <host>`: Host address (default: `localhost`)
- `--open`: Open browser automatically

**Example:**

```bash
hai3 dev --port=3000 --open
```

### `build`

Build for production.

```bash
hai3 build [options]
```

**Options:**
- `--report`: Generate bundle analysis report
- `--mode <mode>`: Build mode (`production` | `development`)

**Example:**

```bash
hai3 build --report
```

### `validate`

Validate project structure and dependencies.

```bash
hai3 validate [options]
```

**Options:**
- `--fix`: Auto-fix issues where possible

**Example:**

```bash
hai3 validate --fix
```

**Checks:**
- Layer dependencies (no reverse imports)
- Component usage (MUI/Ant Design/Chakra consistency)
- TypeScript configuration
- Package versions

### `update`

Update HAI3 packages and templates.

```bash
hai3 update [options]
```

**Options:**
- `--dry-run`: Show what would be updated
- `--force`: Force update without prompts

**Example:**

```bash
hai3 update --dry-run
```

### `info`

Display project information.

```bash
hai3 info
```

**Output:**
- HAI3 version
- UI kit
- Screensets
- Plugins
- Dependencies

## Global Options

Available for all commands:

- `--help, -h`: Show help
- `--version, -v`: Show version
- `--verbose`: Verbose output
- `--quiet`: Minimal output

**Example:**

```bash
hai3 create my-app --help
hai3 --version
```

## Configuration

### `.hai3rc.json`

Project configuration file:

```json
{
  "uikit": "mui",
  "language": "typescript",
  "features": {
    "i18n": true,
    "analytics": true
  },
  "paths": {
    "screensets": "src/screensets",
    "services": "src/services",
    "state": "src/state"
  }
}
```

## Environment Variables

- `HAI3_CLI_DEBUG`: Enable debug logging
- `HAI3_TEMPLATE_URL`: Custom template repository URL
- `HAI3_NO_TELEMETRY`: Disable anonymous usage telemetry

**Example:**

```bash
HAI3_CLI_DEBUG=true hai3 create my-app
```

## Related Documentation

- [Getting Started](/getting-started)
- [Creating Screensets](/hai3/guides/creating-screensets)
- [API Integration](/hai3/guides/api-integration)
