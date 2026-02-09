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

Create a new HAI3 project or SDK layer package.

```bash
hai3 create <projectName> [options]
```

**Arguments:**
- `projectName`: Name of the project to create (required)

**Options:**
- `--studio`: Include Studio package (boolean)
- `--uikit <kit>`: UI Kit selection (`hai3` | `none`)
- `--layer <layer>` or `-l <layer>`: Create SDK layer package (`sdk` | `framework` | `react`)

**Examples:**

```bash
# Create a new HAI3 project
hai3 create my-app

# Create with Studio included
hai3 create my-app --studio

# Create without UI kit
hai3 create my-app --uikit=none

# Create a new SDK layer package
hai3 create my-package --layer=sdk
```

---

### `screenset create`

Create a new screenset with an initial screen.

```bash
hai3 screenset create <name> [options]
```

**Arguments:**
- `name`: Screenset name in camelCase (required)

**Options:**
- `--category <cat>` or `-c <cat>`: Screenset category (`drafts` | `mockups` | `production`) (default: `drafts`)
- `--skip-validation`: Skip post-creation validation

**Examples:**

```bash
# Create a new screenset
hai3 screenset create dashboard

# Create as production screenset
hai3 screenset create dashboard --category=production

# Create without validation
hai3 screenset create dashboard --skip-validation
```

**Notes:**
- Must be run from within a HAI3 project
- Screenset names must be camelCase
- Creates initial screen and boilerplate files
- Runs validation by default

---

### `screenset copy`

Copy an existing screenset with transformed IDs.

```bash
hai3 screenset copy <source> <target> [options]
```

**Arguments:**
- `source`: Name of the source screenset (required)
- `target`: Name of the target screenset (required)

**Options:**
- `--category <cat>` or `-c <cat>`: Screenset category for the copy (`drafts` | `mockups` | `production`)

**Examples:**

```bash
# Copy a screenset
hai3 screenset copy dashboard analytics

# Copy with different category
hai3 screenset copy dashboard reports --category=production
```

**Notes:**
- Automatically transforms all IDs from source to target
- Preserves file structure and patterns
- Updates imports and references

---

### `validate components`

Validate component structure and placement according to HAI3 architecture rules.

```bash
hai3 validate components [path]
```

**Arguments:**
- `path`: Path to validate (optional, defaults to `src/screensets/`)

**Examples:**

```bash
# Validate all screensets
hai3 validate components

# Validate specific path
hai3 validate components src/screensets/dashboard
```

**Validation Rules:**
- Detects inline components (should be extracted)
- Detects inline data (should be in constants)
- Detects UIKit impurity (business logic in UI components)
- Detects inline styles (should use theme tokens)
- Detects hardcoded hex colors

**Exit Codes:**
- `0`: All validations passed
- `1`: Violations found

---

### `scaffold layout`

Generate layout components in your project.

```bash
hai3 scaffold layout [options]
```

**Options:**
- `--force` or `-f`: Overwrite existing layout files (boolean)

**Examples:**

```bash
# Generate layout components
hai3 scaffold layout

# Force overwrite existing files
hai3 scaffold layout --force
```

**Generated Files:**
- Header, Footer, Menu, Sidebar components
- Layout wrapper component
- Theme configuration
- Initial styling

**Notes:**
- Must be run from within a HAI3 project
- Prompts before overwriting by default

---

### `update`

Update HAI3 CLI and project packages to the latest version.

```bash
hai3 update [options]
```

**Options:**
- `--alpha` or `-a`: Update to latest alpha/prerelease version (boolean)
- `--package-manager <pm>` or `-pm <pm>`: Package manager to use (`npm` | `yarn` | `pnpm`)

**Examples:**

```bash
# Update to latest stable
hai3 update

# Update to latest alpha
hai3 update --alpha

# Update using yarn
hai3 update --package-manager=yarn
```

**Updates:**
- `@hai3/cli` globally
- All `@hai3/*` packages in project
- Maintains version consistency

---

### `update layout`

Update layout components from templates.

```bash
hai3 update layout [options]
```

**Options:**
- `--force` or `-f`: Force update without prompting (boolean)

**Examples:**

```bash
# Update layout components
hai3 update layout

# Force update
hai3 update layout --force
```

**Notes:**
- Updates layout templates to latest version
- Preserves custom modifications where possible
- Shows diff before applying

---

### `migrate`

Apply codemod migrations to update HAI3 projects between versions.

```bash
hai3 migrate [targetVersion] [options]
```

**Arguments:**
- `targetVersion`: Target version to migrate to (optional, e.g., `"0.2.0"`)

**Options:**
- `--dry-run` or `-d`: Show what would be changed without applying (boolean)
- `--force` or `-f`: Force migration without prompts (boolean)

**Examples:**

```bash
# Migrate to latest version
hai3 migrate

# Migrate to specific version
hai3 migrate 0.2.0

# Dry run (preview changes)
hai3 migrate --dry-run

# Force migration
hai3 migrate 0.2.0 --force
```

**Migration Types:**
- API changes (renamed exports, changed signatures)
- File structure updates
- Configuration migrations
- Breaking change adaptations

**Safety:**
- Creates backup before migration
- Can be rolled back
- Shows detailed diff

---

### `ai sync`

Sync AI assistant configuration files for Claude Code, GitHub Copilot, Cursor, and Windsurf.

```bash
hai3 ai sync [options]
```

**Options:**
- `--tool <tool>` or `-t <tool>`: Specific tool to sync (`claude` | `copilot` | `cursor` | `windsurf` | `all`) (default: `all`)
- `--detect-packages` or `-d`: Auto-detect installed packages (boolean)

**Examples:**

```bash
# Sync all AI tools
hai3 ai sync

# Sync only Claude Code
hai3 ai sync --tool=claude

# Sync with package detection
hai3 ai sync --detect-packages
```

**Synced Files:**
- `.claude/commands/` - Claude Code commands
- `.github/copilot-instructions.md` - Copilot instructions
- `.cursorrules` - Cursor rules
- `.windsurfrules` - Windsurf rules

**Notes:**
- Generates tool-specific configuration
- Includes HAI3 architecture guidelines
- Updates on package.json changes

---

## Global Options

All commands support these global options:

- `--quiet` or `-q`: Suppress non-error output
- `--version` or `-v`: Show version number
- `--help` or `-h`: Show help

**Examples:**

```bash
# Quiet mode
hai3 screenset create dashboard --quiet

# Show version
hai3 --version

# Show help for specific command
hai3 screenset create --help
```

---

## Command Patterns

### Namespaced Commands

HAI3 CLI uses colon notation for command namespaces:

```bash
hai3 screenset:create <name>    # Full notation
hai3 screenset create <name>    # Alias (space works too)
```

### Validation

Many commands include automatic validation:

```bash
# Runs validation after creation
hai3 screenset create dashboard

# Skip validation
hai3 screenset create dashboard --skip-validation

# Explicit validation command
hai3 validate components
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation error or command failure |
| 2 | Invalid arguments |
| 130 | User cancelled (Ctrl+C) |

---

## Configuration

Commands respect project configuration in `.hai3rc.json`:

```json
{
  "uikit": "hai3",
  "packageManager": "npm",
  "screensetsDir": "src/screensets"
}
```

---

## Related Documentation

- [Getting Started](/getting-started) - Project setup guide
- [Creating Screensets](/hai3/guides/creating-screensets) - Screenset guide
- [Framework API](/hai3/api-reference/framework) - Framework reference
