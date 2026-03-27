# Phase 6: AI Guidelines and Workflows — Rename hai3-* to frontx-*

## What
Rename all `hai3-*` prefixed command/workflow files to `frontx-*`, update all content references, and update Cypilot config.

## Scope

### Cypilot Config
- `.cypilot/config/artifacts.toml` — rename system name "HAI3 Dev Kit" → "FrontX Dev Kit", slug "hai3" → "frontx"
- `.cypilot/config/AGENTS.md` — update if it references "HAI3"
- `.cypilot/.gen/AGENTS.md` — will need regeneration after config change

### Guidelines file rename
- `.ai/GUIDELINES.hai3-mfe-setup.md` → `.ai/GUIDELINES.frontx-mfe-setup.md`

### Files to RENAME (hai3-* → frontx-*)
These are the canonical command files and their IDE adapters:

1. **Canonical commands** (`.ai/commands/`):
   - `hai3-new-screenset.md` → `frontx-new-screenset.md`
   - `hai3-new-screen.md` → `frontx-new-screen.md`
   - `hai3-new-component.md` → `frontx-new-component.md`
   - `hai3-new-action.md` → `frontx-new-action.md`
   - `hai3-new-api-service.md` → `frontx-new-api-service.md`
   - `hai3-duplicate-screenset.md` → `frontx-duplicate-screenset.md`
   - `hai3-validate.md` → `frontx-validate.md`
   - `hai3-quick-ref.md` → `frontx-quick-ref.md`
   - `hai3-rules.md` → `frontx-rules.md`
   - `hai3-fix-violation.md` → `frontx-fix-violation.md`
   - `hai3-arch-explain.md` → `frontx-arch-explain.md`
   - `hai3-review-pr.md` → `frontx-review-pr.md`
   - Also any `.sdk.md`, `.framework.md`, `.react.md` variants

2. **User commands** (`.ai/commands/user/`):
   - `hai3-update-guidelines.md` → `frontx-update-guidelines.md`

3. **Internal commands** (`.ai/commands/internal/`):
   - Any `hai3*` prefixed files

4. **IDE adapters** (auto-generated, but need renaming):
   - `.claude/commands/hai3-*.md` → `.claude/commands/frontx-*.md`
   - `.cursor/commands/hai3-*.md` → `.cursor/commands/frontx-*.md`
   - `.windsurf/workflows/hai3-*.md` → `.windsurf/workflows/frontx-*.md`
   - `.github/copilot-commands/hai3-*.md` → `.github/copilot-commands/frontx-*.md`

5. **Cursor/Windsurf rule files**:
   - `.cursor/rules/hai3.mdc` → `.cursor/rules/frontx.mdc`
   - `.windsurf/rules/hai3.md` → `.windsurf/rules/frontx.md`

6. **Package command files** (`packages/*/commands/`):
   - `packages/react/commands/hai3-*.md` → `frontx-*.md`
   - `packages/framework/commands/hai3-*.md` → `frontx-*.md`
   - `packages/cli/commands/hai3-*.md` → `frontx-*.md` (if exists)

### Content updates (inside all .md files)
- `hai3-new-screenset` → `frontx-new-screenset` (command references)
- `hai3-validate` → `frontx-validate` etc.
- `hai3:new-screenset` → `frontx:new-screenset` (colon-prefixed command IDs)
- `hai3dev-*` → `frontxdev-*` (monorepo-only commands)
- `hai3-` filename prefix convention → `frontx-` in documentation
- `/hai3-` → `/frontx-` (slash command references)
- `@hai3/` → `@cyberfabric/` in any import/package references
- `HAI3` → `FrontX` in descriptions (case-sensitive)

### Files to update content ONLY (no rename)
- `.ai/GUIDELINES.md`
- `.ai/targets/*.md` (CLI.md, AI_COMMANDS.md, AI.md, THEMES.md, SCREENSETS.md, EVENTS.md, etc.)
- `.ai/GUIDELINES.framework.md`, `.ai/GUIDELINES.sdk.md`
- `CLAUDE.md` (root)

## Task
1. Rename all files using `git mv` (preserves history)
2. Bulk replace content in all renamed and non-renamed .md files
3. Update the CLI's `copy-templates.ts` and command discovery logic to use `frontx-` prefix
4. Update `packages/cli/src/commands/ai/sync.ts` to generate `frontx-` adapters
5. Verify cross-references between files are consistent

## Acceptance Criteria
- [ ] Zero files named `hai3-*` outside node_modules/dist/templates
- [ ] Zero content references to `hai3-new-`, `hai3-validate`, `/hai3-`, `hai3:` command IDs
- [ ] IDE adapters point to renamed canonical files
- [ ] CLI command discovery works with `frontx-` prefix
- [ ] `hai3dev-*` commands renamed to `frontxdev-*`
