<!-- @standalone:override -->
# AI Command Maintenance Rules

## CRITICAL RULES
- REQUIRED: All canonical command content in .ai/commands/.
- REQUIRED: IDE folders (.claude/, .cursor/, etc.) contain thin adapters only.
- FORBIDDEN: Command logic in IDE-specific folders.

## COMMAND CATEGORIES
hai3-*: Standalone project commands (shipped to all HAI3 projects).
hai3dev-*: Monorepo-only commands (framework development only).

## NAMING CONVENTIONS
- REQUIRED: Standalone commands use hai3- filename prefix (e.g., hai3-validate.md).
- REQUIRED: Monorepo-only commands use hai3dev- prefix (e.g., hai3dev-update-guidelines.md).
- FORBIDDEN: Unprefixed command files.

## LAYER VARIANTS
Commands can have layer-specific variants for SDK architecture tiers:
- Base command: hai3-new-api-service.md (serves as SDK default).
- SDK variant: hai3-new-api-service.sdk.md (explicitly SDK-only content).
- Framework variant: hai3-new-api-service.framework.md (adds Framework patterns).
- React variant: hai3-new-api-service.react.md (adds React hooks/components).

Fallback chain (most specific first):
- sdk layer: .sdk.md -> .md
- framework layer: .framework.md -> .sdk.md -> .md
- react/app layer: .react.md -> .framework.md -> .sdk.md -> .md

REQUIRED: Only create variants when guidance differs meaningfully per layer.
REQUIRED: Variant content must match available APIs at that layer.
FORBIDDEN: React imports in .sdk.md or .framework.md variants.
FORBIDDEN: Framework imports in .sdk.md variants.

Commands without applicable variants are excluded from that layer.
Example: hai3-new-screenset.md (React-only) is excluded from SDK/Framework layers.

## COMMAND STRUCTURE
- REQUIRED: Commands are self-contained with full procedural steps.
- FORBIDDEN: References to external workflow files.
- FORBIDDEN: Duplicating GUIDELINES.md routing table in commands.
- REQUIRED: Commands follow AI.md format rules (under 100 lines, ASCII, keywords).

## STANDALONE VS MONOREPO
- Standalone (hai3-*): App development (screensets, validation, components).
- Monorepo (hai3dev-*): Framework development (guidelines updates, publishing).
- REQUIRED: Standalone commands must not reference packages/* paths.
- Location: .ai/commands/hai3-*.md marked with <!-- @standalone -->.
- FORBIDDEN: hai3dev-* commands in standalone projects (copy-templates excludes them).

## IDE ADAPTER PATTERN
File: .claude/commands/hai3-example.md
Content: Description frontmatter + reference to .ai/commands/hai3-example.md.
REQUIRED: Adapters must NOT contain command logic.

## UPDATE MECHANISM
- hai3: commands -> Updated by hai3 update.
- hai3dev: commands -> Manual updates (not shipped to standalone).

## ADDING A NEW COMMAND
1) Create canonical file in .ai/commands/hai3-name.md with <!-- @standalone --> marker.
2) Follow AI.md format rules.
3) For hai3-new-* commands: MUST include implementation steps and validation.
4) IDE adapters are generated automatically by copy-templates.ts.
5) Verify with npm run build:packages && npm run lint.

## MODIFYING EXISTING COMMANDS
1) Edit ONLY the canonical file in .ai/commands/.
2) IDE adapters auto-update (they just reference canonical).
3) Changes propagate via hai3 update to standalone projects.

## DETECT RULES
- DETECT: grep -rn "hai3dev-" packages/cli/templates/.ai (must be 0).
- DETECT: grep -rn "packages/" packages/cli/templates/.ai/commands (must be 0).
