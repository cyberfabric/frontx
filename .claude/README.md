# Claude Code Commands for FrontX

This directory contains slash commands for Claude Code to help with FrontX development following the project's architectural guidelines.

## Available Commands

### Development Workflow

#### `/validate`
Validate changes before commit following FrontX guidelines. Runs architecture checks, verifies event-driven flow, and checks for common violations.

**Use when:** Before committing code changes

#### `/review-pr`
Comprehensive code review against FrontX guidelines. Checks all applicable rules, runs validation, and provides detailed feedback.

**Use when:** Reviewing pull requests or significant changes

### Creating New Features

#### `/new-screenset`
Create a new screenset following FrontX vertical slice architecture. Guides through directory structure, configuration, and registration.

**Use when:** Adding a new screenset to drafts/mockups/production

#### `/new-component`
Add a new UI component (base, composite, or screenset-specific) following FrontX component architecture.

**Use when:** Creating new reusable UI components

#### `/new-action`
Create a new action following event-driven architecture pattern (Action → Event → Effect → Slice).

**Use when:** Adding new user interactions or state changes

#### `/new-api-service`
Add a new domain-based API service with mock data support.

**Use when:** Integrating with a new backend domain/microservice

### Fixing Issues

#### `/fix-violation`
Fix a rule violation following FrontX correction policy. Identifies, classifies, and fixes violations with proper validation.

**Use when:** Architecture checks fail or linting identifies issues

### Learning & Reference

#### `/rules`
Show FrontX rules for a specific area (events, screensets, studio, etc.) with examples.

**Use when:** Need to understand rules for a specific area

#### `/arch-explain`
Explain FrontX architecture concepts with diagrams, examples, and patterns.

**Use when:** Learning or clarifying architectural concepts

#### `/quick-ref`
Quick reference for common FrontX patterns (events, imports, components, styling, i18n).

**Use when:** Need a quick lookup of common patterns

### Guidelines Management

#### `/update-guidelines`
Update AI guidelines following the correction policy. Modifies .ai/targets/*.md files with minimal diffs.

**Use when:** Rules need clarification or updates based on new patterns

## Command Usage

Invoke commands by typing `/` followed by the command name in Claude Code:

```
/validate
/new-screenset
/rules
```

## Guidelines Structure

The commands are based on FrontX's structured guidelines:

```
.ai/
├── GUIDELINES.md              # Main routing table and invariants
├── MCP_TROUBLESHOOTING.md     # Chrome MCP connection recovery
├── workflows/                 # Process workflows
│   ├── VALIDATE_CHANGES.md
│   ├── FIX_RULE_VIOLATION.md
│   └── UPDATE_GUIDELINES.md
└── targets/                   # Area-specific rules
    ├── EVENTS.md              # Event-driven architecture
    ├── SCREENSETS.md          # Screenset patterns
    ├── UIKIT.md               # UI Kit components
    ├── API.md                 # API services
    ├── STYLING.md             # Styling rules
    ├── THEMES.md              # Theme system
    └── AI.md                  # AI documentation
```

## Workflow Examples

### Adding a New Feature

1. `/rules` - Review applicable rules
2. `/new-screenset` or `/new-component` - Create feature
3. `/validate` - Validate before commit
4. `/review-pr` - Final review

### Fixing a Build Issue

1. Check error message from `npm run arch:check`
2. `/fix-violation` - Identify and fix the violation
3. `/validate` - Verify fix passes all checks

### Understanding Architecture

1. `/arch-explain` - Learn architectural concepts
2. `/quick-ref` - Reference common patterns
3. `/rules` - Deep dive into specific areas

## Integration with FrontX Architecture

These commands enforce FrontX's core principles:

- **Event-Driven Architecture**: Actions emit events, effects listen and update slices
- **Registry Pattern**: Self-registration following Open/Closed principle
- **Three-Layer Structure**: Contracts → Implementation → Application
- **Vertical Slices**: Screensets are self-contained domains
- **Type Safety**: Module augmentation and contract enforcement

## Validation Commands

All commands respect the validation workflow:

1. **Route**: Identify applicable target file from `.ai/GUIDELINES.md`
2. **Summarize**: List 3-7 key rules from target
3. **Verify**: Pass pre-diff checklist before proposing code
4. **If unsure**: Stop and ask

## Quick Start

New to FrontX? Start with these commands:

1. `/arch-explain` - Understand the architecture
2. `/quick-ref` - Learn common patterns
3. `/rules` - Review rules for the area you're working on
4. `/validate` - Always validate before committing

## Documentation References

- **CLAUDE.md**: Architecture overview for Claude Code
- **README.md**: Project overview and mission
- **QUICK_START.md**: Developer quick start guide
- **.ai/GUIDELINES.md**: Main AI guidelines with routing table
- **.ai/MCP_TROUBLESHOOTING.md**: Chrome MCP connection recovery procedures
- **.ai/targets/\*.md**: Area-specific detailed rules

## Support

If commands need updates or new commands are needed:
1. Use `/update-guidelines` to modify existing rules
2. Add new command files to `.claude/commands/`
3. Follow the same format as existing commands
