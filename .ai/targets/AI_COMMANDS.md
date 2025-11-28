# AI Command Maintenance Rules

## CRITICAL RULES
- REQUIRED: All canonical command content in .ai/commands/.
- REQUIRED: IDE folders (.claude/, .cursor/, etc.) contain thin adapters only.
- FORBIDDEN: Command logic in IDE-specific folders.

## NAMING CONVENTIONS
- REQUIRED: Standalone commands use hai3- filename prefix (e.g., hai3-validate.md).
- REQUIRED: Monorepo-only commands use hai3dev- prefix (e.g., hai3dev-publish.md).
- FORBIDDEN: Unprefixed command files (except openspec: commands).
- FORBIDDEN: Changing openspec: prefix (managed by openspec update).

## COMMAND STRUCTURE
- REQUIRED: Commands are self-contained with full procedural steps.
- FORBIDDEN: References to external workflow files.
- FORBIDDEN: Duplicating GUIDELINES.md routing table in commands.
- REQUIRED: Commands follow AI.md format rules (under 100 lines, ASCII, keywords).

## STANDALONE VS MONOREPO
- Standalone: Operations for HAI3-based app development (screensets, validation, components).
- Monorepo: Operations for HAI3 framework development (publishing, releases).
- REQUIRED: Standalone commands must not reference packages/* paths.
- Location: presets/standalone/ai/.ai/commands/ for standalone.
- Location: presets/monorepo/ai/.ai/commands/ for monorepo-only.

## IDE ADAPTER PATTERN
File: .claude/commands/hai3-example.md
Content: Description frontmatter + reference to .ai/commands/hai3-example.md.
REQUIRED: Adapters must NOT contain command logic.

## UPDATE MECHANISM
- hai3: commands -> Updated by hai3 update.
- openspec: commands -> Updated by openspec update.
- hai3dev: commands -> Manual updates (not shipped to standalone).

## ADDING A NEW COMMAND
1) Create canonical file in .ai/commands/hai3-name.md.
2) Follow AI.md format rules.
3) Create adapter in each IDE folder.
4) Add to copy-templates.ts standaloneAiConfig (if standalone).
5) Verify with npm run arch:check.

## MODIFYING EXISTING COMMANDS
1) Edit ONLY the canonical file in .ai/commands/.
2) IDE adapters auto-update (they just reference canonical).
3) Changes propagate via hai3 update to standalone projects.

## DETECT RULES
- DETECT: grep -rn "hai3dev-" presets/standalone/ai (must be 0).
- DETECT: grep -rn "packages/" presets/standalone/ai/.ai/commands (must be 0).
