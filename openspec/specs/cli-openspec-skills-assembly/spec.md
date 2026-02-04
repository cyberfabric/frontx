# Spec: CLI OpenSpec Skills Assembly

This spec defines the requirements for the CLI template assembly to include OpenSpec 1.1.1 skills.

## ADDED Requirements

### Requirement: copyOpenSpecSkills Function Exists

The `copy-templates.ts` script SHALL include a `copyOpenSpecSkills()` function that copies OpenSpec skill directories to CLI templates.

#### Scenario: Function is defined

- **GIVEN** the file `packages/cli/scripts/copy-templates.ts`
- **WHEN** inspecting lines 231-305
- **THEN** a function named `copyOpenSpecSkills` is defined
- **AND** it accepts a `templatesDir` parameter
- **AND** it returns a Promise with counts for `claude`, `cursor`, `windsurf`, and `copilot`

#### Scenario: Function is called in build pipeline

- **GIVEN** the `copyTemplates()` function in `copy-templates.ts`
- **WHEN** inspecting line 823
- **THEN** `copyOpenSpecSkills(TEMPLATES_DIR)` is called
- **AND** the result is stored in `openspecSkillCounts`

### Requirement: Claude Skills Are Copied

The build SHALL copy all OpenSpec skill directories from `.claude/skills/openspec-*` to CLI templates.

#### Scenario: Claude skills directory exists in templates

- **GIVEN** a successful CLI build via `npm run build`
- **WHEN** inspecting `packages/cli/templates/.claude/skills/`
- **THEN** the directory exists
- **AND** it contains exactly 10 `openspec-*` subdirectories

#### Scenario: Each Claude skill has SKILL.md

- **GIVEN** a successful CLI build
- **WHEN** inspecting each `packages/cli/templates/.claude/skills/openspec-*/` directory
- **THEN** each directory contains a `SKILL.md` file

#### Scenario: Claude skill list is complete

- **GIVEN** a successful CLI build
- **WHEN** listing `packages/cli/templates/.claude/skills/`
- **THEN** the following directories exist:
  - `openspec-new-change/`
  - `openspec-continue-change/`
  - `openspec-ff-change/`
  - `openspec-apply-change/`
  - `openspec-archive-change/`
  - `openspec-bulk-archive-change/`
  - `openspec-explore/`
  - `openspec-verify-change/`
  - `openspec-sync-specs/`
  - `openspec-onboard/`

### Requirement: Cursor Skills Are Copied

The build SHALL copy all OpenSpec skill directories from `.cursor/skills/openspec-*` to CLI templates.

#### Scenario: Cursor skills directory exists in templates

- **GIVEN** a successful CLI build via `npm run build`
- **WHEN** inspecting `packages/cli/templates/.cursor/skills/`
- **THEN** the directory exists
- **AND** it contains exactly 10 `openspec-*` subdirectories

#### Scenario: Each Cursor skill has SKILL.md

- **GIVEN** a successful CLI build
- **WHEN** inspecting each `packages/cli/templates/.cursor/skills/openspec-*/` directory
- **THEN** each directory contains a `SKILL.md` file

### Requirement: Windsurf Skills Are Copied

The build SHALL copy all OpenSpec skill directories from `.windsurf/skills/openspec-*` to CLI templates.

#### Scenario: Windsurf skills directory exists in templates

- **GIVEN** a successful CLI build via `npm run build`
- **WHEN** inspecting `packages/cli/templates/.windsurf/skills/`
- **THEN** the directory exists
- **AND** it contains exactly 10 `openspec-*` subdirectories

#### Scenario: Each Windsurf skill has SKILL.md

- **GIVEN** a successful CLI build
- **WHEN** inspecting each `packages/cli/templates/.windsurf/skills/openspec-*/` directory
- **THEN** each directory contains a `SKILL.md` file

### Requirement: Build Logs Show Skill Counts

The CLI build SHALL log the number of OpenSpec skills copied for each editor.

#### Scenario: Build output shows Claude skill count

- **GIVEN** running `npm run build` in `packages/cli`
- **WHEN** build completes successfully
- **THEN** the output includes a line matching: `  .claude/skills/ (10 OpenSpec skills)`

#### Scenario: Build output shows Cursor skill count

- **GIVEN** running `npm run build` in `packages/cli`
- **WHEN** build completes successfully
- **THEN** the output includes a line matching: `  .cursor/skills/ (10 OpenSpec skills)`

#### Scenario: Build output shows Windsurf skill count

- **GIVEN** running `npm run build` in `packages/cli`
- **WHEN** build completes successfully
- **THEN** the output includes a line matching: `  .windsurf/skills/ (10 OpenSpec skills)`

### Requirement: GitHub Copilot OPSX Commands Are Copied

The build SHALL copy all OPSX command files from `.github/copilot-commands/opsx-*.md` to CLI templates.

#### Scenario: Copilot commands directory exists in templates

- **GIVEN** a successful CLI build via `npm run build`
- **WHEN** inspecting `packages/cli/templates/.github/copilot-commands/`
- **THEN** the directory exists
- **AND** it contains at least 10 `opsx-*.md` files

#### Scenario: Copilot OPSX command list is complete

- **GIVEN** a successful CLI build
- **WHEN** listing `packages/cli/templates/.github/copilot-commands/`
- **THEN** the following files exist:
  - `opsx-new.md`
  - `opsx-continue.md`
  - `opsx-ff.md`
  - `opsx-apply.md`
  - `opsx-archive.md`
  - `opsx-bulk-archive.md`
  - `opsx-explore.md`
  - `opsx-verify.md`
  - `opsx-sync.md`
  - `opsx-onboard.md`

### Requirement: Build Logs Show Copilot Command Count

The CLI build SHALL log the number of GitHub Copilot OPSX commands copied.

#### Scenario: Build output shows Copilot command count

- **GIVEN** running `npm run build` in `packages/cli`
- **WHEN** build completes successfully
- **THEN** the output includes a line matching: `  .github/copilot-commands/ (10 OPSX commands)`

### Requirement: Total Skill Count

The CLI templates SHALL contain 30 skill directories total (10 skills x 3 editors) plus 10 GitHub Copilot OPSX commands.

#### Scenario: Verify total skill count

- **GIVEN** a successful CLI build
- **WHEN** counting all `SKILL.md` files in `packages/cli/templates/`
- **THEN** the count equals 30

#### Scenario: Verify total Copilot command count

- **GIVEN** a successful CLI build
- **WHEN** counting all `opsx-*.md` files in `packages/cli/templates/.github/copilot-commands/`
- **THEN** the count equals 10

## Error Cases

### Error: Source Skills Directory Missing

- **WHEN** the source skills directory (e.g., `.claude/skills/`) does not exist
- **THEN** the function returns 0 for that editor's count
- **AND** the build continues without error
- **AND** no skills are copied for that editor

### Error: Source Copilot Commands Directory Missing

- **WHEN** the source `.github/copilot-commands/` directory does not exist
- **THEN** the function returns 0 for copilot count
- **AND** the build continues without error
- **AND** no OPSX commands are copied for Copilot

### Error: No OPSX Commands in Copilot Directory

- **WHEN** the `.github/copilot-commands/` directory exists but contains no `opsx-*.md` files
- **THEN** the function returns 0 for copilot count
- **AND** the build continues without error
- **AND** log output shows 0 OPSX commands for Copilot

### Error: Destination Directory Not Writable

- **WHEN** the destination templates directory is not writable
- **THEN** the build fails with a file system error
- **AND** an appropriate error message is displayed
