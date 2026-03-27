# AI Command Usage Rules

## CRITICAL RULES
- REQUIRED: All canonical command content in .ai/commands/.
- REQUIRED: IDE folders (.claude/, .cursor/, etc.) contain thin adapters only.
- FORBIDDEN: Command logic in IDE-specific folders.

## COMMAND HIERARCHY
FrontX projects support a 3-level command hierarchy:
- Level 1 (HAI3): .ai/commands/ - managed by CLI, updated via frontx update.
- Level 2 (Company): .ai/company/commands/ - preserved on update.
- Level 3 (Project): .ai/project/commands/ - preserved on update.

## COMMAND PRECEDENCE
When multiple commands share the same name, precedence is: project > company > frontx.
Most specific level wins. This allows overriding HAI3 commands with custom versions.

## COMMAND CATEGORIES
frontx-*: User project commands (shipped to all FrontX projects).

## NAMING CONVENTIONS
- REQUIRED: User commands use frontx- filename prefix (e.g., frontx-validate.md).
- FORBIDDEN: Unprefixed command files.

## LAYER VARIANTS
Commands can have layer-specific variants for SDK architecture tiers:
- Base command: frontx-new-api-service.md (serves as SDK default).
- SDK variant: frontx-new-api-service.sdk.md (explicitly SDK-only content).
- Framework variant: frontx-new-api-service.framework.md (adds Framework patterns).
- React variant: frontx-new-api-service.react.md (adds React hooks/components).

Fallback chain (most specific first):
- sdk layer: .sdk.md -> .md
- framework layer: .framework.md -> .sdk.md -> .md
- react/app layer: .react.md -> .framework.md -> .sdk.md -> .md

REQUIRED: Only create variants when guidance differs meaningfully per layer.
REQUIRED: Variant content must match available APIs at that layer.

Commands without applicable variants are excluded from that layer.
Example: frontx-new-screenset.md (React-only) is excluded from SDK/Framework layers.

## COMMAND STRUCTURE
- REQUIRED: Commands are self-contained with full procedural steps.
- FORBIDDEN: References to external workflow files.
- FORBIDDEN: Duplicating GUIDELINES.md routing table in commands.
- REQUIRED: Commands follow AI.md format rules (under 100 lines, ASCII, keywords).

## CREATING CUSTOM COMMANDS
Company commands (.ai/company/commands/):
- Use for organization-wide commands (code review, deployment, security checks).
- Naming: company-specific prefix recommended (e.g., acme-deploy.md).
- Preserved on frontx update.

Project commands (.ai/project/commands/):
- Use for project-specific commands (migrations, domain operations, testing).
- Naming: project-specific prefix recommended (e.g., myapp-migrate.md).
- Preserved on frontx update.

## COMMAND FORMAT
All commands (HAI3, company, project) use the same README.md-based format:
- Title line: # namespace:command-name - Description
- AI WORKFLOW (REQUIRED) section with steps
- CONSTRAINTS or CRITICAL RULES section
- Step sections (STEP 1, STEP 2, etc.)
- REQUIRED, MUST, FORBIDDEN keywords for rules

## COMMAND DISCOVERY
Run npx frontx ai:sync to:
- Scan .ai/commands/, .ai/company/commands/, .ai/project/commands/
- Generate IDE adapters in .claude/commands/, .cursor/commands/, .windsurf/workflows/
- Apply precedence rules (project > company > frontx)
Commands from all levels appear in IDE command palettes.

## USER PROJECT COMMANDS
- User commands (frontx-*): App development (screensets, validation, components).
- REQUIRED: Commands must not reference monorepo-specific paths or workflows.
- Location: .ai/commands/frontx-*.md.

## IDE ADAPTER PATTERN
File: .claude/commands/frontx-example.md
Content: Description frontmatter + reference to .ai/commands/frontx-example.md.
REQUIRED: Adapters must NOT contain command logic.

## UPDATE MECHANISM
- frontx: commands -> Updated by frontx update.

## USING COMMANDS
1) Select command from .ai/commands/ directory.
2) Follow command steps sequentially.
3) Commands delegate to FrontX CLI for scaffolding.
4) Commands run validation after changes.
