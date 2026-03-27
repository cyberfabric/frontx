# Phase 4: Publishing Architecture — SDLC Artifacts

## What
Update SDLC artifacts to document the new publishing pipeline architecture before implementing it. This establishes the design as the source of truth.

## Artifacts to Update/Create

### 1. DESIGN.md — Add Publishing Pipeline Section
Add a new section to `architecture/DESIGN.md` covering:
- **Gitflow branching model**: main (latest), develop (alpha), release/*, feature/*, hotfix/*
- **Version injection mechanism**: `generate-versions.ts` reads monorepo package versions at CLI build time, writes `src/generated/versions.ts`, generators import locked versions instead of hardcoded strings
- **Branch→dist-tag mapping**: develop→alpha, main→latest, release→rc
- **Layer-ordered publishing**: L1 SDK → L2 framework → L3 react → L4 studio/cli
- **Independent versioning**: packages versioned independently within 0.x major
- **Version locking in scaffolded projects**: CLI ships with exact versions from its build, no floating tags

### 2. ADR — Channel-Aware Version Locking
Create `architecture/ADR/0017-channel-aware-version-locking.md`:
- **Context**: CLI scaffolds projects with dependency versions. Previously hardcoded to `alpha` tag. Need versions locked to exact releases matching the CLI's publication channel.
- **Decision**: Inject versions at build time via `generate-versions.ts`. The script reads all monorepo `packages/*/package.json`, extracts name+version, generates a TypeScript constants file. CLI generators import these constants. Since develop builds have alpha versions and main builds have release versions, the generated file naturally matches the channel.
- **Consequences**:
  - Versions always in sync — no manual pinning
  - Alpha CLI → alpha deps, latest CLI → latest deps
  - `src/generated/` must be gitignored
  - CLI build script must run `generate-versions` before `tsup`

### 3. FEATURE — Update feature-publishing-pipeline
Update `architecture/features/feature-publishing-pipeline/FEATURE.md`:
- Add build-time version injection flow
- Add gitflow→channel mapping
- Update to reflect @cyberfabric scope

## Task
1. Read existing `architecture/DESIGN.md` — find where publishing/CI fits
2. Read existing `architecture/features/feature-publishing-pipeline/FEATURE.md`
3. Read existing ADR files to determine next ADR number
4. Update DESIGN.md with new publishing pipeline section
5. Create new ADR following the kit template at `{adr_template}`
6. Update FEATURE.md for publishing pipeline

## Rules
- Follow SDLC kit artifact templates and rules
- Use existing ID scheme and cross-reference patterns
- ADR must reference DESIGN section and FEATURE
- FEATURE must reference ADR

## Acceptance Criteria
- [ ] DESIGN.md has publishing pipeline architecture section
- [ ] New ADR created with proper structure and cross-references
- [ ] FEATURE updated with version injection and gitflow flow
- [ ] All artifacts cross-reference each other correctly
