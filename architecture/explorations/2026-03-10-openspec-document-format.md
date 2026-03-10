# Exploration: OpenSpec Document Format


<!-- toc -->

- [Research question](#research-question)
- [Scope](#scope)
- [Findings](#findings)
  - [1. What OpenSpec Is](#1-what-openspec-is)
  - [2. Document Types](#2-document-types)
    - [2.1 Main Specs (`openspec/specs/<capability>/spec.md`)](#21-main-specs-openspecspecscapabilityspecmd)
  - [Requirement: <Next Requirement>](#requirement-next-requirement)
      - [2.2.2 Delta Specs (`specs/<capability>/spec.md` within a change)](#222-delta-specs-specscapabilityspecmd-within-a-change)
      - [2.2.3 Design (`design.md`)](#223-design-designmd)
      - [2.2.4 Tasks (`tasks.md`)](#224-tasks-tasksmd)
      - [2.2.5 `.openspec.yaml` (Change Metadata)](#225-openspecyaml-change-metadata)
  - [3. Root Configuration (`openspec/config.yaml`)](#3-root-configuration-openspecconfigyaml)
  - [4. Directory Structure](#4-directory-structure)
  - [5. The `spec-driven` Schema (Artifact Dependency Graph)](#5-the-spec-driven-schema-artifact-dependency-graph)
  - [6. Cross-References and Traceability](#6-cross-references-and-traceability)
    - [6.1 Change-to-Spec Traceability (Delta Spec Sync)](#61-change-to-spec-traceability-delta-spec-sync)
    - [6.2 Proposal-to-Spec Traceability](#62-proposal-to-spec-traceability)
    - [6.3 Spec-to-Task Traceability](#63-spec-to-task-traceability)
    - [6.4 Change-to-Change References](#64-change-to-change-references)
    - [6.5 External References](#65-external-references)
  - [7. The Workflow Lifecycle](#7-the-workflow-lifecycle)
  - [8. Format Variations and Evolution](#8-format-variations-and-evolution)
- [Key takeaways](#key-takeaways)
- [Open questions](#open-questions)
- [Sources](#sources)

<!-- /toc -->

Date: 2026-03-10

## Research question

What is the OpenSpec document format used in this project? Specifically: what document types exist, what is the structure/schema of each type, what frontmatter and metadata fields are used, how are documents organized on disk, how do cross-references and traceability work?

## Scope

**In scope:** All OpenSpec artifacts found under `openspec/`, all OpenSpec skill definitions under `.claude/skills/openspec-*`, all OPSX command definitions under `.claude/commands/opsx/`, and the root `openspec/config.yaml`.

**Out of scope:** The `openspec` CLI binary internals (not available as source in this repo). The architecture/ directory's own ADR and PRD formats (separate system). The `.cypilot/` system.

## Findings

### 1. What OpenSpec Is

OpenSpec is a spec-driven change management system for AI-assisted software development. It provides a structured workflow for progressing from idea to implementation through a sequence of artifacts. The system operates through an `openspec` CLI and a set of AI agent skills (`.claude/skills/openspec-*`).

The core concept is a **change** -- a directory-based container that holds all thinking and planning artifacts for a unit of work. Changes follow a **schema** (workflow template) that defines which artifacts are required and in what dependency order.

**Confidence:** Corroborated (observed across config, skills, and 82 archived changes)

### 2. Document Types

OpenSpec has two major categories of documents: **main specs** (the living specification of the system) and **change artifacts** (temporary documents that drive a specific change through its lifecycle).

#### 2.1 Main Specs (`openspec/specs/<capability>/spec.md`)

Main specs are the canonical, living specifications for each capability in the system. There are 24 main specs in this project:

```
openspec/specs/
  app-configuration/spec.md
  cli/spec.md
  cli-openspec-skills-assembly/spec.md
  host-share-scope-bootstrap/spec.md
  i18n-formatters/spec.md
  i18n-loading/spec.md
  mfe-blob-url-isolation/spec.md
  mfe-externalize-plugin/spec.md
  mfe-internal-dataflow/spec.md
  mfe-share-scope-management/spec.md
  microfrontends/spec.md
  publishing/spec.md
  routing/spec.md
  screen-translation/spec.md
  screensets/spec.md
  sdk-core/spec.md
  shared-property-broadcast/spec.md
  shared-property-validation/spec.md
  sse-streaming/spec.md
  studio/spec.md
  studio-settings-persistence/spec.md
  studio-viewport-positioning/spec.md
  uikit-base/spec.md
  uikit-toast/spec.md
```

Each main spec lives at `openspec/specs/<capability-name>/spec.md`. The capability name is kebab-case and typically maps to a logical feature area (not a 1:1 package mapping).

**Structure of a main spec:**

```markdown
# <capability-name> Specification          (or just the capability name as title)

## Purpose

<1-3 sentence description of what this capability covers>

## Requirements

### Requirement: <Requirement Name>

<Description using normative language — SHALL, SHALL NOT, MAY>

#### Scenario: <Scenario Name>

- **GIVEN** <precondition>        (optional)
- **WHEN** <trigger condition>
- **THEN** <expected outcome>
- **AND** <additional outcome>    (zero or more)

```typescript
// Optional: concrete code examples inline
```

### Requirement: <Next Requirement>
...
```

Key conventions observed:
- Requirements use `### Requirement:` as a heading prefix
- Scenarios use `#### Scenario:` as a heading prefix
- Normative language: `SHALL` for mandatory, `SHALL NOT` for prohibition, `MAY` for optional
- Scenarios follow Given/When/Then format (Given is optional)
- TypeScript code blocks are embedded inline to show concrete APIs, types, and usage patterns
- Some specs include `**NOTE**` blocks for known limitations or design rationale
- No frontmatter (no YAML front matter in main spec files)
- Some specs have a TBD Purpose (e.g., `TBD - created by archiving change <name>. Update Purpose after archive.`)

Main specs range from 78 lines (smaller capabilities) to 2,069 lines (`uikit-base`). They are incrementally updated through the delta spec sync process (see section 6).

**Confidence:** Corroborated (verified across 6+ main spec files)

#### 2.2 Change Artifacts

Change artifacts live under `openspec/changes/<change-name>/` (active) or `openspec/changes/archive/YYYY-MM-DD-<change-name>/` (archived). The default schema (`spec-driven`) produces up to 5 artifact types:

##### 2.2.1 Proposal (`proposal.md`)

The "why" document. Captures motivation, scope, and impact at a high level.

**Structure:**

```markdown
## Why

<1-3 paragraphs explaining the problem or opportunity>

## What Changes

<Bullet points describing what will be different>

## Capabilities

### New Capabilities

- `<capability-name>`: <brief description>

### Modified Capabilities

- `<capability-name>`: <what changes about it>

## Impact

- **<package or layer>**: <files affected, what changes>
- ...

## Future Work                  (optional)

<Deferred items for follow-up changes>

## Dependencies                 (optional)

<Links to other changes or external dependencies>

## Risks                        (optional)

<Known risks with mitigation strategies>
```

The Capabilities section is structurally important: each capability listed drives the creation of a delta spec file. Capability names are kebab-case and match the `openspec/specs/<capability>/` directory names.

Some older proposals (pre-OpenSpec CLI era, ~November 2025) used different heading names (`# Add SSE Support`, `## Problem`, `## Proposed Solution`, `## Alternative Approaches Considered`) but covered the same conceptual ground. The format stabilized by late 2025.

Not all changes have a proposal. The minimal change has only `proposal.md` and `tasks.md`.

**Confidence:** Corroborated (verified across 10+ proposals)

##### 2.2.2 Delta Specs (`specs/<capability>/spec.md` within a change)

Delta specs describe what a change adds, modifies, or removes from a main spec. They are NOT full spec copies -- they represent the diff/intent.

**Structure:**

```markdown
## ADDED Requirements

### Requirement: <New Requirement Name>

<Full requirement with scenarios, same format as main specs>

## MODIFIED Requirements

### Requirement: <Existing Requirement Name>

<Only the changed parts -- new scenarios, updated descriptions>
<Existing scenarios not mentioned are preserved during sync>

## REMOVED Requirements

### Requirement: <Requirement to Delete>

## RENAMED Requirements

- FROM: `### Requirement: Old Name`
- TO: `### Requirement: New Name`
```

All four sections are optional. A delta spec includes only the sections that apply. In practice, most delta specs contain only `## ADDED Requirements` or `## MODIFIED Requirements`.

A single change can have delta specs for multiple capabilities:
```
openspec/changes/<name>/specs/
  shared-property-broadcast/spec.md
  microfrontends/spec.md
  shared-property-validation/spec.md
```

Some older changes (pre-February 2026) placed delta specs directly as `specs/<capability>/spec.md` without the ADDED/MODIFIED/REMOVED section headers, using the same format as main specs. The delta format with section headers was introduced with the OpenSpec CLI tooling.

**Confidence:** Corroborated (verified across 8+ delta spec files and the sync skill)

##### 2.2.3 Design (`design.md`)

The "how" document. Technical decisions, architecture, and implementation approach.

**Structure:**

```markdown
## Context

<Current state and background relevant to the change>

## Goals / Non-Goals                (optional, some use separate Architecture Decisions heading)

**Goals:**
- <What the change aims to achieve>

**Non-Goals:**
- <What is explicitly out of scope>

## Decisions                        (or ## Architecture Decisions)

### Decision 1: <Decision Title>

**Choice:** <What was decided>

**Rationale:** <Why this choice was made>

**Alternatives considered:**         (optional)
- <Alternative 1> -- <why rejected>

### Decision N: ...

## File Map                          (optional)

```
path/to/file.ts    # What it does
```

## Risks / Trade-offs               (optional)

**[Risk name]** -> <description and mitigation>
```

Not all changes have a design document. Simpler changes (e.g., adding a UI component) skip design.md entirely.

Some designs include ASCII flow diagrams (e.g., Bootstrap Flow) with box-drawing characters.

**Confidence:** Corroborated (verified across 6+ design files)

##### 2.2.4 Tasks (`tasks.md`)

The implementation checklist. Drives the apply phase.

**Structure:**

```markdown
## 1. <Category or Module Name>

- [x] 1.1 <Completed task description>
- [x] 1.2 <Completed task description>
- [-] 1.3 ~~<Dropped task description>~~ **Dropped** (<reason>)
- [ ] 1.4 <Pending task description>

## 2. <Next Category>

- [ ] 2.1 <Task description>
...

## N. Verification

- [ ] N.1 <Verification step, e.g., run build>
- [ ] N.2 <Verification step, e.g., run tests>
```

Task numbering follows `<section>.<sequence>` format (e.g., 1.1, 1.2, 2.1). Tasks are grouped by logical category -- typically by package, layer, or concern.

Three checkbox states are used:
- `- [ ]` -- pending
- `- [x]` -- complete
- `- [-]` -- dropped (with strikethrough and bold reason)

Dropped tasks use `~~<text>~~` strikethrough and a `**Dropped**` annotation with rationale, often referencing a PR review (e.g., `PR review C1`).

The last section is typically "Verification" with build/test commands.

**Confidence:** Corroborated (verified across 8+ tasks files)

##### 2.2.5 `.openspec.yaml` (Change Metadata)

A YAML file at the root of a change directory that stores metadata about the change. Present in newer changes (February 2026+), absent in older ones.

**Structure:**

```yaml
schema: spec-driven
created: YYYY-MM-DD
```

Only two fields observed:
- `schema` -- the workflow schema name (always `spec-driven` in this project)
- `created` -- the date the change was created (ISO date, no time)

Of 82 archived changes, only 8 have `.openspec.yaml` files (all from 2026-02-09 onward). The 74 older changes lack this file entirely, suggesting it was introduced with the OpenSpec CLI tooling.

**Confidence:** Corroborated (verified all 8 `.openspec.yaml` files)

### 3. Root Configuration (`openspec/config.yaml`)

The project-level OpenSpec configuration file.

**Full contents:**

```yaml
schema: spec-driven

context: |
  HAI3: AI-optimized UI dev kit (Drafts -> Mockups -> Production). Monorepo, npm workspaces.
  Stack: React 19, TypeScript strict, Vite 6, Redux Toolkit, Tailwind, shadcn/ui, Radix, Lucide. Build: tsup; lint: ESLint, dependency-cruiser, knip.
  Monorepo Structure: npm workspaces. L1 SDK (@hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets) -- zero cross-dependencies, no React, use anywhere. L2 @hai3/framework (plugins). L3 @hai3/react. UI Layer @hai3/uikit, @hai3/studio. Tooling @hai3/cli.
  Architecture Patterns: ...
  ...

rules:
  proposal:
    - Include impact on layers and registries; call out rollback or risk where relevant.
  specs:
    - Use Given/When/Then for scenarios; use SHALL for normative requirements.
    - Reference existing patterns before inventing new ones
    - Keep scenarios concrete (example config/code) and tie outcomes to screenset/layer behavior.
  design:
    - Align with four-layer SDK and event-driven flow; document event/effect/slice changes and any module augmentation.
```

Three top-level keys:
- `schema` -- default workflow schema for new changes
- `context` -- project-level context string injected into artifact creation instructions (used by the OpenSpec CLI when generating instructions for AI agents)
- `rules` -- per-artifact-type rules that constrain artifact content (keyed by artifact ID: `proposal`, `specs`, `design`)

The `context` and `rules` are consumed by the CLI's `openspec instructions` command and fed to AI agents as constraints. They do NOT appear in the artifact files themselves.

**Confidence:** Corroborated (single source, but validated against skill documentation)

### 4. Directory Structure

```
openspec/
  config.yaml                              # Project-level config
  specs/                                   # Main specs (living specifications)
    <capability-name>/
      spec.md                              # The canonical spec for this capability
  changes/                                 # Active changes (in progress)
    <change-name>/
      .openspec.yaml                       # Change metadata (newer changes only)
      proposal.md                          # Why + scope
      design.md                            # How (optional)
      tasks.md                             # Implementation checklist
      specs/                               # Delta specs (optional)
        <capability-name>/
          spec.md                          # What changes about this capability
    archive/                               # Completed changes
      YYYY-MM-DD-<change-name>/            # Same structure as active changes
        .openspec.yaml
        proposal.md
        design.md
        tasks.md
        specs/
          <capability-name>/
            spec.md
```

Naming conventions:
- Change names: kebab-case, typically prefixed with verb (`add-`, `fix-`, `refactor-`, `introduce-`)
- Archive directory names: `YYYY-MM-DD-<original-change-name>` (date of archival, not creation)
- Capability names: kebab-case, matching across `openspec/specs/` and `openspec/changes/<name>/specs/`
- Spec files: always `spec.md` inside a capability-named directory

The active changes directory (`openspec/changes/`) holds in-progress work. There is currently 1 active change: `2026-03-06-cli-mfe-infrastructure`. The archive holds 82 completed changes spanning 2025-11-14 to 2026-03-07.

Some active changes use a different spec file naming for their delta specs. The `2026-03-06-cli-mfe-infrastructure` change has `specs/cli-mfe-scaffold.md` (a flat file, not `specs/cli-mfe-scaffold/spec.md`). This appears to be a variation -- the CLI skill documentation describes both patterns.

**Confidence:** Corroborated (direct filesystem observation)

### 5. The `spec-driven` Schema (Artifact Dependency Graph)

The only schema observed in this project is `spec-driven`. It defines a 4-artifact sequence with dependencies:

```
proposal  ->  specs  ->  design  ->  tasks
```

- `proposal` has no dependencies (always "ready" first)
- `specs` depends on `proposal`
- `design` depends on `proposal` and `specs`
- `tasks` depends on `proposal`, `specs`, and `design`

The `openspec status` command reports each artifact as `done`, `ready` (dependencies met, can create), or `blocked` (dependencies not met).

The `applyRequires` field from `openspec status --json` specifies which artifacts must be complete before implementation can begin. For `spec-driven`, this is `["tasks"]` -- meaning all four artifacts must be done before the apply phase (since tasks depends on all others).

Not all changes include all artifacts. Observed variations:
- Full set: proposal, specs, design, tasks (complex changes)
- No design: proposal, specs, tasks (moderate changes)
- No specs, no design: proposal, tasks (simple changes like UI component additions)
- No specs: proposal, design, tasks (architecture changes without formal spec deltas)

The schema tolerates missing optional artifacts. The skills handle this gracefully: verify skips checks for missing artifacts, apply reads whatever context files exist.

**Confidence:** Substantiated (observed pattern across skills and changes, but only one schema exists for comparison)

### 6. Cross-References and Traceability

#### 6.1 Change-to-Spec Traceability (Delta Spec Sync)

The primary traceability mechanism is the **delta spec sync** process. When a change is archived:

1. Delta specs in `openspec/changes/<name>/specs/<capability>/spec.md` are compared against main specs in `openspec/specs/<capability>/spec.md`
2. An AI agent (the sync skill) reads both files and performs intelligent merging
3. ADDED requirements are appended to the main spec
4. MODIFIED requirements are updated (new scenarios added, existing preserved)
5. REMOVED requirements are deleted from the main spec
6. RENAMED requirements have their headings updated

This sync is **agent-driven** (not programmatic). The AI reads both documents and makes judgment calls about how to merge. The sync skill explicitly states: "The delta represents *intent*, not a wholesale replacement."

After sync, the main spec reflects the cumulative state of all archived changes. The archived change directory is preserved as a historical record of the decision-making process.

#### 6.2 Proposal-to-Spec Traceability

The proposal's `## Capabilities` section lists capability names that map to delta spec files:

```
proposal.md:  - `shared-property-broadcast`: ...
                              |
                              v
specs/shared-property-broadcast/spec.md
```

Each capability listed under "New Capabilities" or "Modified Capabilities" in the proposal corresponds to a delta spec file in the change's `specs/` directory.

#### 6.3 Spec-to-Task Traceability

Tasks reference spec requirements implicitly through descriptions. Task descriptions often include:
- File paths matching the design's File Map
- Requirement names matching spec headings
- Specific method/API names defined in specs

There is no formal linking mechanism (e.g., no requirement IDs or cross-reference syntax). Traceability is maintained through naming consistency and the AI agent's ability to correlate tasks to specs during verification.

#### 6.4 Change-to-Change References

Changes occasionally reference other changes in their proposals:
- `## Future Work` sections describe deferred follow-up changes
- `## Dependencies` sections reference prerequisite changes
- These are prose references, not formal links

#### 6.5 External References

Some proposals include GitHub issue links (e.g., `GitHub Issue: [HAI3org/HAI3#204](https://github.com/...)`). This is optional and not enforced by the format.

**Confidence:** Corroborated (verified through skills, actual sync results comparing delta vs main specs, and multiple change artifacts)

### 7. The Workflow Lifecycle

The complete lifecycle of an OpenSpec change, as implemented by the skills:

```
/opsx:explore    (optional) Think through the problem
       |
/opsx:new        Create change directory + .openspec.yaml
       |
/opsx:continue   Create artifacts one at a time:
  (repeated)       proposal -> specs -> design -> tasks
       |
/opsx:apply      Implement tasks, check off completed ones
       |
/opsx:verify     (optional) Verify implementation matches artifacts
       |
/opsx:sync       (optional, or during archive) Sync delta specs to main specs
       |
/opsx:archive    Move to archive/YYYY-MM-DD-<name>/
```

Alternative fast path: `/opsx:ff` creates all artifacts in one pass instead of stepping through `/opsx:continue` repeatedly.

There are 10 OpenSpec skills total:
1. `openspec-new-change` -- create change directory
2. `openspec-continue-change` -- create next artifact
3. `openspec-ff-change` -- fast-forward all artifacts
4. `openspec-apply-change` -- implement tasks
5. `openspec-archive-change` -- archive completed change
6. `openspec-bulk-archive-change` -- batch archive with conflict resolution
7. `openspec-explore` -- thinking/investigation mode
8. `openspec-verify-change` -- verify implementation matches specs
9. `openspec-sync-specs` -- sync delta specs to main specs
10. `openspec-onboard` -- guided tutorial

These skills are distributed to generated projects via the CLI build pipeline for Claude, Cursor, Windsurf, and GitHub Copilot.

**Confidence:** Corroborated (verified through all 10 skill files)

### 8. Format Variations and Evolution

The format evolved over the project's lifetime:

**Phase 1 (Nov 2025):** Pre-CLI. Changes have proposal.md, design.md, tasks.md but no `.openspec.yaml`. Proposal format varies (different heading names, less standardized). Delta specs use full-spec format without ADDED/MODIFIED/REMOVED sections.

**Phase 2 (Dec 2025 - Jan 2026):** Standardizing. Proposal format converges on Why/What Changes/Capabilities/Impact. Tasks adopt numbered section format. Some changes still lack design.md.

**Phase 3 (Feb 2026+):** CLI-managed. `.openspec.yaml` appears. Delta specs gain ADDED/MODIFIED/REMOVED/RENAMED section headers. Skills become the primary interface.

All phases coexist in the archive -- the format is backward-compatible. Older changes without `.openspec.yaml` are handled gracefully by the skills.

**Confidence:** Substantiated (inferred from timestamps and presence/absence of `.openspec.yaml` across 82 changes)

## Key takeaways

- OpenSpec uses a two-layer document model: **main specs** (living canonical specifications per capability) and **change artifacts** (temporary proposal/specs/design/tasks bundles that drive individual changes through implementation). (Corroborated)

- The only workflow schema in use is `spec-driven` with a 4-artifact dependency chain: proposal -> specs -> design -> tasks. Artifacts are optional -- simpler changes skip design or specs. (Corroborated)

- Documents use plain Markdown with no YAML frontmatter in the artifact files themselves. Metadata lives in `.openspec.yaml` (2 fields: `schema`, `created`) and `config.yaml` (project context and per-artifact rules). (Corroborated)

- Traceability flows through **delta spec sync** -- an agent-driven intelligent merge process that propagates requirement changes from change artifacts into main specs during archival. There are no formal IDs, tags, or cross-reference syntax; traceability relies on naming consistency between proposals, specs, and tasks. (Corroborated)

- The format evolved from ad-hoc markdown (November 2025) to CLI-managed structured artifacts (February 2026+), with backward compatibility maintained across 82 archived changes. (Substantiated -- depends on timestamp correlation)

## Open questions

- What other workflow schemas does the OpenSpec CLI support besides `spec-driven`? The config references a default schema, and the skills mention `--schema <name>`, but no alternative schemas are visible in this project.

- How does the OpenSpec CLI determine artifact completion status (`done` vs `ready` vs `blocked`)? The skills reference `openspec status --json` output, but the heuristic for marking an artifact as `done` (file exists? file has content? specific sections present?) is not visible from the artifacts alone.

- What is the complete `.openspec.yaml` schema? Only `schema` and `created` fields are observed, but the CLI may support additional fields not used in this project.

- How does the system handle spec conflicts when two concurrent active changes modify the same capability? The bulk-archive skill describes a conflict resolution protocol, but it is unclear whether the CLI itself detects conflicts or if it is entirely agent-driven.

## Sources

1. `openspec/config.yaml` -- project-level OpenSpec configuration with schema, context, and rules
2. `openspec/specs/*/spec.md` (24 files) -- main spec format: Purpose, Requirements with Given/When/Then scenarios
3. `openspec/changes/archive/2026-03-07-decouple-domain-contracts/` -- most complete example of a full change with all artifact types and delta specs
4. `openspec/changes/2026-03-06-cli-mfe-infrastructure/` -- active change example with proposal, design, tasks, and a flat delta spec
5. `.claude/skills/openspec-*/SKILL.md` (10 files) -- skill definitions documenting the complete OpenSpec workflow, artifact creation guidelines, and sync/archive procedures
6. `.claude/commands/opsx/*.md` (10 files) -- command entry points mapping to skills
7. `openspec/changes/archive/` (82 directories) -- historical record showing format evolution from November 2025 through March 2026
8. `.openspec.yaml` files (8 instances, all 2026-02-09+) -- change metadata format
