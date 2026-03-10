# Exploration: Cypilot SDLC Artifact Document Formats


<!-- toc -->

- [Research question](#research-question)
- [Scope](#scope)
- [Findings](#findings)
  - [1. Common Patterns Across All Artifacts](#1-common-patterns-across-all-artifacts)
    - [ID Format](#id-format)
    - [ID Versioning](#id-versioning)
    - [Frontmatter](#frontmatter)
    - [Table of Contents](#table-of-contents)
    - [Placeholder Prohibition](#placeholder-prohibition)
    - [Traceability Chain](#traceability-chain)
  - [2. PRD (Product Requirements Document)](#2-prd-product-requirements-document)
    - [Required Sections (in order)](#required-sections-in-order)
    - [ID Kinds Defined in PRD](#id-kinds-defined-in-prd)
    - [Cross-References FROM PRD](#cross-references-from-prd)
    - [Frontmatter](#frontmatter-1)
    - [Semantic Rules](#semantic-rules)
    - [MUST NOT HAVE (Deliberate Omissions)](#must-not-have-deliberate-omissions)
    - [Checklist Categories](#checklist-categories)
  - [3. DESIGN (Technical Design Document)](#3-design-technical-design-document)
    - [Required Sections (in order)](#required-sections-in-order-1)
    - [ID Kinds Defined in DESIGN](#id-kinds-defined-in-design)
    - [Cross-References FROM DESIGN](#cross-references-from-design)
    - [Frontmatter](#frontmatter-2)
    - [Scope Rule](#scope-rule)
    - [MUST NOT HAVE](#must-not-have)
    - [Checklist Categories](#checklist-categories-1)
  - [4. ADR (Architecture Decision Record)](#4-adr-architecture-decision-record)
    - [Required Sections (in order)](#required-sections-in-order-2)
    - [Frontmatter (REQUIRED)](#frontmatter-required)
    - [ID Kind Defined in ADR](#id-kind-defined-in-adr)
    - [Cross-References FROM ADR](#cross-references-from-adr)
    - [File Naming and Numbering](#file-naming-and-numbering)
    - [Status Transitions](#status-transitions)
    - [Scope Rule](#scope-rule-1)
    - [MUST NOT HAVE](#must-not-have-1)
    - [Quality Checks (ADR-Specific)](#quality-checks-adr-specific)
  - [5. FEATURE (Feature Specification)](#5-feature-feature-specification)
    - [Required Sections (in order)](#required-sections-in-order-3)
    - [ID Kinds Defined in FEATURE](#id-kinds-defined-in-feature)
    - [CDSL (Context-Driven Specification Language)](#cdsl-context-driven-specification-language)
    - [Code Traceability Markers](#code-traceability-markers)
    - [featstatus Marker](#featstatus-marker)
    - [Cross-References IN FEATURE](#cross-references-in-feature)
    - [MUST NOT HAVE](#must-not-have-2)
  - [6. DECOMPOSITION (Task Decomposition)](#6-decomposition-task-decomposition)
    - [Required Sections (in order)](#required-sections-in-order-4)
    - [ID Kinds Defined in DECOMPOSITION](#id-kinds-defined-in-decomposition)
    - [Feature Entry Structure](#feature-entry-structure)
    - [Cross-References FROM DECOMPOSITION](#cross-references-from-decomposition)
    - [Overall Status](#overall-status)
    - [Checkbox Cascade Rules](#checkbox-cascade-rules)
    - [Decomposition Quality Criteria (from checklist)](#decomposition-quality-criteria-from-checklist)
  - [7. Blueprint Architecture](#7-blueprint-architecture)
- [Comparison](#comparison)
  - [Artifact Type Quick Reference](#artifact-type-quick-reference)
  - [ID Kind Distribution](#id-kind-distribution)
  - [Traceability Direction](#traceability-direction)
- [Key takeaways](#key-takeaways)
- [Open questions](#open-questions)
- [Sources](#sources)

<!-- /toc -->

Date: 2026-03-10

## Research question

What is the exact structure/schema of each Cypilot SDLC artifact type (PRD, DESIGN, ADR, FEATURE, DECOMPOSITION)? What are the required sections, frontmatter fields, ID formats, cross-reference patterns, and traceability markers for each?

## Scope

**In scope**: All five primary SDLC artifact types defined in `.cypilot/.gen/kits/sdlc/artifacts/`. Template structure, rules, checklist categories, ID kinds, cross-artifact references, and CDSL notation (for FEATURE).

**Out of scope**: PR-CODE-REVIEW-TEMPLATE, PR-STATUS-REPORT-TEMPLATE, CODE artifact type (no template found in `.gen`). Blueprint internals (marker syntax for generation). Validation engine internals (`cypilot validate` implementation).

## Findings

### 1. Common Patterns Across All Artifacts

All five artifact types share a consistent structural framework defined in `constraints.toml` and enforced by `cypilot validate`.

**Confidence:** Corroborated (template files, rules files, and constraints.toml all align)

#### ID Format

Every traceable element uses the format:

```
cpt-{system}-{kind}-{slug}
```

- `cpt` is a fixed prefix (stands for Cypilot).
- `{system}` is a hierarchy prefix derived from project config (fallback: `cpt-{dirname}`).
- `{kind}` is one of the registered identifier kinds (e.g., `fr`, `actor`, `component`, `flow`).
- `{slug}` is a kebab-case descriptor.

IDs appear in documents with the pattern:

```markdown
- [ ] `p1` - **ID**: `cpt-{system}-{kind}-{slug}`
```

The checkbox `[ ]` / `[x]` tracks implementation status. The `pN` marker (`p1` through `p9`) indicates priority.

#### ID Versioning

When a definition changes after acceptance, the ID gains a `-v{N}` suffix:

```
cpt-{system}-{kind}-{slug}-v2
```

#### Frontmatter

All artifacts support optional frontmatter using `cpt:` format for document metadata. ADR is the only type where frontmatter is **required** (status and date fields). All others mark frontmatter as optional.

#### Table of Contents

Every artifact includes a `## Table of Contents` section, generated/validated by `cypilot toc` and `cypilot validate-toc`. The placeholder in templates is `<!-- generated by \`cypilot toc\` -->`.

#### Placeholder Prohibition

All artifact types prohibit `TODO`, `TBD`, `FIXME` placeholders. Duplicate IDs within a document are prohibited.

#### Traceability Chain

The overall flow is: **PRD -> DESIGN -> DECOMPOSITION -> FEATURE -> CODE**. Each artifact type references upstream and downstream artifacts through ID cross-references.

---

### 2. PRD (Product Requirements Document)

**Source files:**
- Template: `.cypilot/.gen/kits/sdlc/artifacts/PRD/template.md`
- Rules: `.cypilot/.gen/kits/sdlc/artifacts/PRD/rules.md`
- Checklist: `.cypilot/.gen/kits/sdlc/artifacts/PRD/checklist.md`
- Example: `.cypilot/.gen/kits/sdlc/artifacts/PRD/examples/example.md`
- Blueprint: `.cypilot/kits/sdlc/blueprints/PRD.md`
- Constraints: `.cypilot/.gen/kits/sdlc/constraints.toml` (PRD section)

**Confidence:** Corroborated

#### Required Sections (in order)

| # | Heading | Constraint ID | Required |
|---|---------|---------------|----------|
| H1 | `PRD -- {Module/Feature Name}` | `prd-h1-title` | Yes |
| -- | Table of Contents | -- | Yes |
| 1 | Overview | `prd-overview` | Yes |
| 1.1 | Purpose | `prd-overview-purpose` | Yes |
| 1.2 | Background / Problem Statement | `prd-overview-background` | Yes |
| 1.3 | Goals (Business Outcomes) | `prd-overview-goals` | Yes |
| 1.4 | Glossary | `prd-overview-glossary` | Yes |
| 2 | Actors | `prd-actors` | Yes |
| 2.1 | Human Actors | `prd-actors-human` | Yes |
| 2.1.x | {Actor Name} (H4, multiple) | `prd-actor-entry` | Yes |
| 2.2 | System Actors | `prd-actors-system` | Yes |
| 2.2.x | {System Actor Name} (H4, multiple) | `prd-actor-system-entry` | Yes |
| 3 | Operational Concept & Environment | `prd-operational-concept` | Yes |
| 3.1 | Module-Specific Environment Constraints | `prd-operational-concept-constraints` | Yes |
| 4 | Scope | `prd-scope` | Yes |
| 4.1 | In Scope | `prd-scope-in` | Yes |
| 4.2 | Out of Scope | `prd-scope-out` | Yes |
| 5 | Functional Requirements | `prd-fr` | Yes |
| 5.x | {Feature Area} (H3, multiple) | `prd-fr-group` | Yes |
| 5.x.x | {Requirement Name} (H4) | `prd-fr-entry` | Yes |
| 6 | Non-Functional Requirements | `prd-nfr` | Yes |
| 6.1 | NFR Inclusions | `prd-nfr-inclusions` | No |
| 6.1.x | {NFR Name} (H4) | `prd-nfr-entry` | No |
| 6.2 | NFR Exclusions | `prd-nfr-exclusions` | Yes |
| 7 | Public Library Interfaces | `prd-public-interfaces` | Yes |
| 7.1 | Public API Surface | `prd-public-interfaces-api` | Yes |
| 7.1.x | {Interface Name} (H4) | `prd-interface-entry` | No |
| 7.2 | External Integration Contracts | `prd-public-interfaces-external-contracts` | Yes |
| 7.2.x | {Contract Name} (H4) | `prd-contract-entry` | No |
| 8 | Use Cases | `prd-use-cases` | Yes |
| 8.x | {Use Case Name} (H4) | `prd-usecase-entry` | No |
| 9 | Acceptance Criteria | `prd-acceptance-criteria` | Yes |
| 10 | Dependencies | `prd-dependencies` | Yes |
| 11 | Assumptions | `prd-assumptions` | Yes |
| 12 | Risks | `prd-risks` | Yes |

The H1 title must match the pattern `PRD\s*[---]\s*.+` (PRD followed by a dash/em-dash and a name).

#### ID Kinds Defined in PRD

| Kind | Template | Required | Priority | to_code | Heading Scope |
|------|----------|----------|----------|---------|---------------|
| `actor` | `cpt-{system}-actor-{slug}` | No | No | No | `prd-actors` |
| `fr` | `cpt-{system}-fr-{slug}` | Yes | Yes | No | `prd-fr` |
| `nfr` | `cpt-{system}-nfr-{slug}` | Yes | Yes | No | `prd-nfr` |
| `usecase` | `cpt-{system}-usecase-{slug}` | Yes | No | No | `prd-use-cases` |
| `interface` | `cpt-{system}-interface-{slug}` | No | No | No | `prd-public-interfaces` |
| `contract` | `cpt-{system}-contract-{slug}` | No | No | No | `prd-public-interfaces` |

#### Cross-References FROM PRD

| PRD Kind | Referenced In | Coverage Required | Target Heading |
|----------|--------------|-------------------|----------------|
| `fr` | DESIGN | Yes | `design-arch-overview-drivers` |
| `fr` | DECOMPOSITION | -- | `decomposition-entry` |
| `fr` | FEATURE | -- | `feature-context-purpose` |
| `nfr` | DESIGN | Yes | `design-arch-overview-drivers` |
| `nfr` | DECOMPOSITION | -- | `decomposition-entry` |
| `nfr` | FEATURE | -- | `feature-context-purpose` |
| `usecase` | DESIGN | -- | `design-tech-arch-seq` |
| `usecase` | FEATURE | -- | `feature-actor-flow` |
| `interface` | DESIGN | Yes | `design-tech-arch-api-contracts` |
| `contract` | DESIGN | Yes | `design-tech-arch-api-contracts` |

"Coverage required" means `cypilot validate` enforces that every PRD ID of that kind appears in the downstream artifact.

#### Frontmatter

Optional. When present, uses `cpt:` format. Version increment required on edits.

#### Semantic Rules

- Purpose: max 2 paragraphs, no implementation details.
- Goals: must be measurable with concrete targets (baseline + target + timeframe).
- Actors: must be specific roles, not generic "users."
- FRs: must use RFC 2119 language (MUST, MUST NOT, SHOULD), have rationale, reference at least one actor.
- NFRs: must have measurable thresholds with units and conditions.

#### MUST NOT HAVE (Deliberate Omissions)

PRDs must not contain: technical implementation details, architectural decisions, implementation tasks, spec-level design, data schema definitions, API specifications, test cases, infrastructure specifications, security implementation details, code-level documentation.

#### Checklist Categories

BIZ, ARCH, SEC, SAFE, PERF, REL, UX, MAINT, COMPL, DATA, INT, OPS, TEST, DOC. Each category either addressed or explicitly marked "Not applicable because..." with reasoning.

---

### 3. DESIGN (Technical Design Document)

**Source files:**
- Template: `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/template.md`
- Rules: `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/rules.md`
- Checklist: `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/checklist.md`
- Example: `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/examples/example.md`
- Blueprint: `.cypilot/kits/sdlc/blueprints/DESIGN.md`

**Confidence:** Corroborated

#### Required Sections (in order)

| # | Heading | Constraint ID | Required |
|---|---------|---------------|----------|
| H1 | `Technical Design -- {Module Name}` | `design-h1-title` | Yes |
| -- | Table of Contents | -- | Yes |
| 1 | Architecture Overview | `design-arch-overview` | Yes |
| 1.1 | Architectural Vision | `design-arch-overview-vision` | Yes |
| 1.2 | Architecture Drivers | `design-arch-overview-drivers` | Yes |
| 1.2.a | Functional Drivers | `design-arch-overview-drivers-functional` | Yes |
| 1.2.b | NFR Allocation | `design-arch-overview-drivers-nfr` | Yes |
| 1.3 | Architecture Layers | `design-arch-overview-layers` | Yes |
| 2 | Principles & Constraints | `design-principles-constraints` | Yes |
| 2.1 | Design Principles | `design-principles` | Yes |
| 2.1.x | {Principle Name} (H4, multiple) | `design-principle-entry` | Yes |
| 2.2 | Constraints | `design-constraints` | Yes |
| 2.2.x | {Constraint Name} (H4, multiple) | `design-constraint-entry` | Yes |
| 3 | Technical Architecture | `design-tech-arch` | Yes |
| 3.1 | Domain Model | `design-tech-arch-domain` | Yes |
| 3.2 | Component Model | `design-tech-arch-component-model` | Yes |
| 3.2.x | {Component Name} (H4, multiple) | `design-component-entry` | Yes |
| 3.2.x.a | Why this component exists (H5) | `design-component-why` | Yes |
| 3.2.x.b | Responsibility scope (H5) | `design-component-scope` | Yes |
| 3.2.x.c | Responsibility boundaries (H5) | `design-component-boundaries` | Yes |
| 3.2.x.d | Related components (by ID) (H5) | `design-component-related` | Yes |
| 3.3 | API Contracts | `design-tech-arch-api-contracts` | Yes |
| 3.4 | Internal Dependencies | `design-tech-arch-internal-deps` | Yes |
| 3.5 | External Dependencies | `design-tech-arch-external-deps` | Yes |
| 3.5.x | {External System} (H4) | `design-external-dep-entry` | No |
| 3.6 | Interactions & Sequences | `design-tech-arch-seq` | Yes |
| 3.6.x | {Sequence Name} (H4, multiple) | `design-seq-entry` | Yes |
| 3.7 | Database schemas & tables | `design-tech-arch-db` | Yes |
| 3.7.x | Table: {name} (H4) | `design-dbtable-entry` | No |
| 4 | Additional context | `design-additional-context` | No |
| 5 | Traceability | `design-traceability` | No |

#### ID Kinds Defined in DESIGN

| Kind | Template | Required | to_code | Heading Scope |
|------|----------|----------|---------|---------------|
| `component` | `cpt-{system}-component-{slug}` | Yes | No | `design-tech-arch-component-model` |
| `principle` | `cpt-{system}-principle-{slug}` | Yes | No | `design-principles` |
| `constraint` | `cpt-{system}-constraint-{slug}` | Yes | No | `design-constraints` |
| `seq` | `cpt-{system}-seq-{slug}` | Yes | No | `design-tech-arch-seq` |
| `dbtable` | `cpt-{system}-dbtable-{slug}` | No | No | `design-tech-arch-db` |
| `db` | `cpt-{system}-db-{slug}` | No | No | `design-tech-arch-db` (legacy) |
| `interface` | `cpt-{system}-interface-{slug}` | No | No | `design-tech-arch-api-contracts` |
| `tech` | `cpt-{system}-tech-{slug}` | No | No | `design-arch-overview-layers` |
| `topology` | `cpt-{system}-topology-{slug}` | No | No | `design-tech-arch` |
| `design` | `cpt-{system}-design-{slug}` | No | No | `design-h1-title` (legacy) |

#### Cross-References FROM DESIGN

| DESIGN Kind | Referenced In | Coverage Required | Target Heading |
|-------------|--------------|-------------------|----------------|
| `component` | DECOMPOSITION | Yes | `decomposition-entry` |
| `principle` | DECOMPOSITION | Yes | `decomposition-entry` |
| `principle` | FEATURE | -- | `feature-context-purpose` |
| `constraint` | DECOMPOSITION | Yes | `decomposition-entry` |
| `constraint` | FEATURE | -- | `feature-dod-entry` |
| `dbtable` | DECOMPOSITION | Yes | `decomposition-entry` |

#### Frontmatter

Optional. Status field supports `DRAFT` for incomplete documents.

#### Scope Rule

One DESIGN per system/subsystem. Scoped to architectural boundaries, not individual features.

#### MUST NOT HAVE

No spec-level details, no decision debates (those go to ADR), no product requirements, no implementation tasks, no code-level schemas, no complete API specs, no infrastructure code, no test code, no code snippets, no security secrets.

#### Checklist Categories

ARCH, SEM (Semantic Alignment), PERF, SEC, REL, DATA, INT, OPS, MAINT, TEST, COMPL, UX, BIZ, DOC. Review modes: Quick, Standard, Full.

---

### 4. ADR (Architecture Decision Record)

**Source files:**
- Template: `.cypilot/.gen/kits/sdlc/artifacts/ADR/template.md`
- Rules: `.cypilot/.gen/kits/sdlc/artifacts/ADR/rules.md`
- Checklist: `.cypilot/.gen/kits/sdlc/artifacts/ADR/checklist.md`
- Example: `.cypilot/.gen/kits/sdlc/artifacts/ADR/examples/example.md`
- Blueprint: `.cypilot/kits/sdlc/blueprints/ADR.md`

**Confidence:** Corroborated

#### Required Sections (in order)

| # | Heading | Constraint ID | Required |
|---|---------|---------------|----------|
| H1 | `{Short title describing problem and chosen solution}` | `adr-h1-title` | Yes |
| -- | Table of Contents | -- | Yes |
| -- | Context and Problem Statement | `adr-context` | Yes |
| -- | Decision Drivers | `adr-decision-drivers` | Yes |
| -- | Considered Options | `adr-considered-options` | Yes |
| -- | Decision Outcome | `adr-decision-outcome` | Yes |
| --- | Consequences (H3) | `adr-decision-outcome-consequences` | Yes |
| --- | Confirmation (H3) | `adr-decision-outcome-confirmation` | Yes |
| -- | Pros and Cons of the Options | `adr-pros-cons` | Yes |
| --- | {Option N} (H3, multiple) | `adr-pros-cons-entry` | Yes |
| -- | More Information | `adr-more-info` | No |
| -- | Traceability | `adr-traceability` | No |

ADR sections are NOT numbered (unlike PRD/DESIGN/FEATURE/DECOMPOSITION which use numbered headings).

#### Frontmatter (REQUIRED)

```yaml
---
status: accepted
date: {YYYY-MM-DD}
decision-makers: {optional}
---
```

The `status` field uses values: `PROPOSED`, `ACCEPTED`, `REJECTED`, `DEPRECATED`, `SUPERSEDED`.

Blueprint metadata confirms: `template_frontmatter` and `example_frontmatter` are explicitly defined for ADR (unique among all artifact types).

#### ID Kind Defined in ADR

| Kind | Template | Required | Priority | to_code |
|------|----------|----------|----------|---------|
| `adr` | `cpt-{system}-adr-{slug}` | Yes | No | No |

The ADR ID appears directly under the H1 title:

```markdown
**ID**: `cpt-{system}-adr-{slug}`
```

#### Cross-References FROM ADR

| ADR Kind | Referenced In | Coverage Required | Target Heading |
|----------|--------------|-------------------|----------------|
| `adr` | DESIGN | Yes | `design-arch-overview-drivers` |

ADR IDs must appear in DESIGN's Architecture Drivers section.

#### File Naming and Numbering

- Path: `{artifacts_dir}/ADR/{NNNN}-{slug}.md`
- Numbers are sequential (`0001`, `0002`, etc.), derived by scanning existing ADR files.
- Version in filename: `NNNN-{slug}-v{N}.md` for versioned supersessions.

#### Status Transitions

| From | To | Trigger |
|------|----|---------|
| PROPOSED | ACCEPTED | Decision approved |
| PROPOSED | REJECTED | Decision declined |
| ACCEPTED | DEPRECATED | Decision no longer applies |
| ACCEPTED | SUPERSEDED | Replaced by new ADR |

After ACCEPTED: the ADR is **immutable**. To change an accepted decision, create a NEW ADR with SUPERSEDES reference and update the original's status.

#### Scope Rule

One ADR per decision. ADR-worthy: technology choices, architectural patterns, integration approaches, security strategies, infrastructure decisions. NOT ADR-worthy: variable naming, file organization, specific library versions, UI styling.

#### MUST NOT HAVE

No complete architecture description, no spec implementation details, no product requirements, no implementation tasks, no complete schema definitions, no code implementation, no security secrets, no test implementation, no operational procedures, no trivial decisions, no incomplete decisions.

#### Quality Checks (ADR-Specific)

QUALITY-001 (Neutrality), QUALITY-002 (Clarity), QUALITY-003 (Actionability), QUALITY-004 (Reviewability). Based on Michael Nygard's ADR template standards.

---

### 5. FEATURE (Feature Specification)

**Source files:**
- Template: `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/template.md`
- Rules: `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/rules.md`
- Checklist: `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/checklist.md`
- Example: `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/examples/example.md`
- Blueprint: `.cypilot/kits/sdlc/blueprints/FEATURE.md`

**Confidence:** Corroborated

#### Required Sections (in order)

| # | Heading | Constraint ID | Required |
|---|---------|---------------|----------|
| H1 | `Feature: {Feature Name}` | `feature-h1-title` | Yes |
| -- | featstatus ID line | -- | Yes (directly under H1) |
| -- | Table of Contents | -- | Yes |
| 1 | Feature Context | `feature-context` | Yes |
| 1.1 | Overview | `feature-context-overview` | Yes |
| 1.2 | Purpose | `feature-context-purpose` | Yes |
| 1.3 | Actors | `feature-context-actors` | Yes |
| 1.4 | References | `feature-context-references` | Yes |
| 2 | Actor Flows (CDSL) | `feature-actor-flows` | Yes |
| 2.x | {Flow Name} (H3, multiple) | `feature-actor-flow` | Yes |
| 3 | Processes / Business Logic (CDSL) | `feature-processes` | Yes |
| 3.x | {Process Name} (H3, multiple) | `feature-process` | Yes |
| 4 | States (CDSL) | `feature-states` | Yes |
| 4.x | {Entity} State Machine (H3, multiple) | `feature-state` | Yes |
| 5 | Definitions of Done | `feature-dod` | Yes |
| 5.x | {Requirement Title} (H3, multiple) | `feature-dod-entry` | Yes |
| 6 | Acceptance Criteria | `feature-acceptance-criteria` | Yes |

#### ID Kinds Defined in FEATURE

| Kind | Template | Required | Task | to_code | Heading Scope |
|------|----------|----------|------|---------|---------------|
| `featstatus` | `cpt-{system}-featstatus-{feature-slug}` | Yes | Yes | No | `feature-h1-title` |
| `flow` | `cpt-{system}-flow-{feature-slug}-{slug}` | No | -- | **Yes** | `feature-actor-flow` |
| `algo` | `cpt-{system}-algo-{feature-slug}-{slug}` | No | -- | **Yes** | `feature-processes` |
| `state` | `cpt-{system}-state-{feature-slug}-{slug}` | No | -- | **Yes** | `feature-state` |
| `dod` | `cpt-{system}-dod-{feature-slug}-{slug}` | Yes | Yes | **Yes** | `feature-dod-entry` |

FEATURE is the only artifact type with `to_code = true` identifiers. These IDs must have corresponding code markers.

#### CDSL (Context-Driven Specification Language)

FEATURE uses a domain-specific notation called CDSL for specifying behavior. Each instruction follows this format:

```markdown
N. [ ] - `pN` - {Description} - `inst-{step-id}`
```

Components:
- `N.` -- step number (supports nesting via sub-numbering)
- `[ ]` / `[x]` -- implementation status checkbox
- `` `pN` `` -- priority marker
- `{Description}` -- what-not-how behavioral description
- `` `inst-{step-id}` `` -- unique instruction identifier

Control flow keywords:
- `**IF** {condition}` / `**ELSE**` -- conditional branching (nested steps for each branch)
- `**FOR EACH** {item} in {collection}` -- iteration
- `**TRY**` / `**CATCH** {error}` -- error handling
- `**RETURN** {result}` -- flow termination
- `**FROM** {State1} **TO** {State2} **WHEN** {condition}` -- state transitions

Step descriptions use prefixes for different operations:
- `API: METHOD /path (request/response summary)` -- API calls
- `DB: OPERATION table(s) (key columns/filters)` -- database operations
- `Algorithm: description using cpt-{system}-algo-{slug}` -- algorithm invocation

#### Code Traceability Markers

For `to_code = true` IDs, code must contain markers in the format:

```
@cpt-{kind}:{cpt-id}:p{N}
```

Examples:
- `@cpt-flow:cpt-myapp-flow-auth-login:p1`
- `@cpt-algo:cpt-myapp-algo-auth-validate:p1`
- `@cpt-state:cpt-myapp-state-auth-session:p1`

An element is checked `[x]` when ALL code markers for that element exist and implementation is verified.

#### featstatus Marker

The `featstatus` ID is a rollup marker directly under the H1 title. Its checkbox must be consistent with all nested task-tracked items:
- If `featstatus` is `[x]`, then ALL nested checkboxes must be `[x]`.
- If ALL nested checkboxes are `[x]`, then `featstatus` must be `[x]`.

#### Cross-References IN FEATURE

FEATURE documents reference IDs from PRD and DESIGN:

| Reference Source | ID Kinds Referenced |
|-----------------|---------------------|
| PRD | `actor`, `fr`, `nfr` |
| DESIGN | `principle`, `constraint`, `component`, `seq`, `dbtable` |

These appear in the "Covers (PRD)" and "Covers (DESIGN)" sections of DoD entries, and in Actor/References sections.

#### MUST NOT HAVE

No system-level type redefinitions, no new API endpoints, no architectural decisions, no product requirements, no sprint/task breakdowns, no code snippets, no test implementation, no security secrets, no infrastructure code.

---

### 6. DECOMPOSITION (Task Decomposition)

**Source files:**
- Template: `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/template.md`
- Rules: `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/rules.md`
- Checklist: `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/checklist.md`
- Example: `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/examples/example.md`
- Blueprint: `.cypilot/kits/sdlc/blueprints/DECOMPOSITION.md`

**Confidence:** Corroborated

#### Required Sections (in order)

| # | Heading | Constraint ID | Required |
|---|---------|---------------|----------|
| H1 | `Decomposition: {PROJECT_NAME}` | `decomposition-h1-title` | Yes |
| -- | Table of Contents | -- | Yes |
| 1 | Overview | `decomposition-overview` | Yes |
| 2 | Entries | `decomposition-entries` | Yes |
| 2.x | [{Feature Title}](path/) (H3, multiple) | `decomposition-entry` | Yes |
| 3 | Feature Dependencies | `decomposition-feature-deps` | Yes |

#### ID Kinds Defined in DECOMPOSITION

| Kind | Template | Required | to_code | Heading Scope |
|------|----------|----------|---------|---------------|
| `feature` | `cpt-{system}-feature-{slug}` | Yes | No | `decomposition-entry` |
| `status` | `cpt-{system}-status-overall` | No | No | `decomposition-entries` |

#### Feature Entry Structure

Each feature entry (under an H3 heading) contains these fields in order:

1. **ID line**: `- [ ] \`pN\` - **ID**: \`cpt-{system}-feature-{slug}\``
2. **Purpose**: Few sentences describing what the feature accomplishes
3. **Depends On**: Feature ID dependencies or "None"
4. **Scope**: Bulleted in-scope items
5. **Out of scope**: Bulleted exclusions
6. **Requirements Covered**: Checkbox references to PRD `fr` and `nfr` IDs
7. **Design Principles Covered**: Checkbox references to DESIGN `principle` IDs
8. **Design Constraints Covered**: Checkbox references to DESIGN `constraint` IDs
9. **Domain Model Entities**: Bulleted list of entity names
10. **Design Components**: Checkbox references to DESIGN `component` IDs
11. **API**: Bulleted list of API endpoints or CLI commands
12. **Sequences**: Checkbox references to DESIGN `seq` IDs
13. **Data**: Checkbox references to DESIGN `dbtable` IDs

The H3 heading format includes a link to the feature directory, an optional status emoji, and a priority label:

```markdown
### 2.1 [{Feature Title}](feature-{slug}/) ⏳ HIGH
```

#### Cross-References FROM DECOMPOSITION

| DECOMPOSITION Kind | Referenced In | Coverage Required | Target Heading |
|--------------------|--------------|-------------------|----------------|
| `feature` | FEATURE | Yes | `feature-h1-title` |

Each `feature` ID must have a corresponding FEATURE spec document.

#### Overall Status

The `status-overall` ID at the top of the Entries section tracks aggregate completion:

```markdown
- [ ] `p1` - **ID**: `cpt-{system}-status-overall`
```

Checked `[x]` only when ALL feature entries are checked.

#### Checkbox Cascade Rules

1. Individual reference checkboxes (fr, nfr, component, etc.) are checked when that element is implemented.
2. Feature ID checkbox is checked when ALL references within that feature are checked.
3. `status-overall` is checked when ALL feature IDs are checked.

#### Decomposition Quality Criteria (from checklist)

- **COV (Coverage)**: 100% of DESIGN elements (components, sequences, data entities) assigned to features.
- **EXC (Exclusivity)**: No scope overlap between features without explicit justification.
- **ATTR (Attributes)**: Each feature has identification, purpose, function, subordinates (per IEEE 1016 section 5.4.1).
- **TRC (Traceability)**: Bidirectional traceability between DESIGN and features.
- **DEP (Dependencies)**: Explicit, acyclic dependency graph.
- **LEV (Levels)**: Consistent granularity across features.
- **CFG (Configuration Items)**: Features map to configuration management items.
- **CHK (Checkbox Consistency)**: Checked references imply checked definitions.

---

### 7. Blueprint Architecture

Each artifact type has a blueprint file in `.cypilot/kits/sdlc/blueprints/{TYPE}.md` that serves as the single source of truth for generating:
- `template.md` (from `@cpt:heading` + `@cpt:prompt` markers)
- `example.md` (from `@cpt:heading` examples + `@cpt:example` markers)
- `rules.md` (from `@cpt:rules` + `@cpt:rule` markers)
- `checklist.md` (from `@cpt:checklist` + `@cpt:check` markers)
- `constraints.toml` contributions (from `@cpt:heading` + `@cpt:id` markers)

Blueprint metadata uses `@cpt:blueprint` markers with TOML configuration specifying `artifact` kind and `codebase` flag (all five types have `codebase = false`).

**Confidence:** Corroborated

---

## Comparison

### Artifact Type Quick Reference

| Property | PRD | DESIGN | ADR | FEATURE | DECOMPOSITION |
|----------|-----|--------|-----|---------|---------------|
| Frontmatter | Optional | Optional | **Required** | Optional | Optional |
| Numbered headings | Yes | Yes | **No** | Yes | Yes |
| H1 pattern | `PRD -- {Name}` | `Technical Design -- {Name}` | `{Title}` | `Feature: {Name}` | `Decomposition: {Name}` |
| to_code IDs | No | No | No | **Yes** | No |
| CDSL notation | No | No | No | **Yes** | No |
| File naming | Free | Free | `NNNN-{slug}.md` | Free | Free |
| Status field | N/A | Optional `DRAFT` | Required (5 values) | Via `featstatus` | Via `status-overall` |
| Scope unit | Module/feature | System/subsystem | Single decision | Single feature | Entire system |

### ID Kind Distribution

| Artifact | ID Kinds Defined |
|----------|-----------------|
| PRD | `actor`, `fr`, `nfr`, `usecase`, `interface`, `contract` |
| DESIGN | `component`, `principle`, `constraint`, `seq`, `dbtable`, `db`, `interface`, `tech`, `topology`, `design` |
| ADR | `adr` |
| FEATURE | `featstatus`, `flow`, `algo`, `state`, `dod` |
| DECOMPOSITION | `feature`, `status` |

### Traceability Direction

```
PRD (fr, nfr, actor, usecase, interface, contract)
  |
  v  [coverage required for fr, nfr, interface, contract -> DESIGN]
DESIGN (component, principle, constraint, seq, dbtable)
  |
  v  [coverage required for component, principle, constraint, dbtable -> DECOMPOSITION]
DECOMPOSITION (feature)
  |
  v  [coverage required for feature -> FEATURE]
FEATURE (flow, algo, state, dod)
  |
  v  [to_code markers: @cpt-{kind}:{id}:p{N}]
CODE
```

ADR cross-cuts this chain: ADR IDs (`adr`) have coverage required in DESIGN (`design-arch-overview-drivers`).

## Key takeaways

- All five artifact types follow a consistent pattern: template structure validated by `constraints.toml`, ID format `cpt-{system}-{kind}-{slug}`, checkbox-based progress tracking, and structured cross-references. (Corroborated)

- ADR is structurally distinct from the other four types: it requires frontmatter (with `status` and `date`), uses un-numbered headings, mandates a specific file naming pattern (`NNNN-{slug}.md`), has immutability rules after acceptance, and defines only a single ID kind. (Corroborated)

- FEATURE is the only artifact type with `to_code = true` identifiers and CDSL notation. It introduces a unique instruction-level format (`inst-{step-id}`) and requires code markers (`@cpt-{kind}:{id}:p{N}`) for traceability from specification to implementation. (Corroborated)

- DECOMPOSITION acts as the bridge artifact between DESIGN and FEATURE, enforcing 100% coverage (every DESIGN element must appear in at least one feature) and mutual exclusivity (no overlap without justification). It uses a checkbox cascade: references checked -> feature checked -> overall status checked. (Corroborated)

- The traceability chain PRD -> DESIGN -> DECOMPOSITION -> FEATURE -> CODE has enforced coverage checks at each transition, meaning `cypilot validate` can detect broken links and incomplete coverage across the entire artifact graph. (Substantiated -- based on `constraints.toml` `coverage = true` fields; actual validator behavior not tested)

## Open questions

- The `codebase` field in blueprint metadata is `false` for all five artifact types. Whether a CODE artifact type exists with `codebase = true` was not investigated (out of scope).
- The exact behavior of `cypilot validate` for checkbox cascade consistency ("checked ref implies checked def") was not tested -- the rules describe it but runtime behavior could not be verified.
- How `{hierarchy-prefix}` is resolved from `artifacts.toml` configuration was not fully traced. The fallback is `cpt-{dirname}` per rules.md, but the primary resolution path through project config was not read.
- Whether the `feature` ID in FEATURE documents (` cpt-{system}-feature-{slug}`) appears under the H1 alongside `featstatus` or only in DECOMPOSITION was ambiguous from the example. The example shows both `featstatus` and `feature` IDs directly under H1.

## Sources

1. `.cypilot/.gen/kits/sdlc/artifacts/PRD/template.md` -- PRD section structure and placeholder prompts
2. `.cypilot/.gen/kits/sdlc/artifacts/PRD/rules.md` -- PRD structural, semantic, and traceability rules
3. `.cypilot/.gen/kits/sdlc/artifacts/PRD/checklist.md` -- PRD quality checklist with 14 expertise domains
4. `.cypilot/.gen/kits/sdlc/artifacts/PRD/examples/example.md` -- TaskFlow PRD example demonstrating all sections
5. `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/template.md` -- DESIGN section structure with component model format
6. `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/rules.md` -- DESIGN rules including scope guidance and MUST NOT HAVE
7. `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/checklist.md` -- DESIGN checklist with evidence requirements (STRICT mode)
8. `.cypilot/.gen/kits/sdlc/artifacts/DESIGN/examples/example.md` -- TaskFlow DESIGN example
9. `.cypilot/.gen/kits/sdlc/artifacts/ADR/template.md` -- ADR structure based on Michael Nygard template
10. `.cypilot/.gen/kits/sdlc/artifacts/ADR/rules.md` -- ADR rules including immutability, status transitions, file naming
11. `.cypilot/.gen/kits/sdlc/artifacts/ADR/checklist.md` -- ADR checklist with QUALITY checks and review scope selection
12. `.cypilot/.gen/kits/sdlc/artifacts/ADR/examples/example.md` -- PostgreSQL storage decision example
13. `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/template.md` -- FEATURE structure with CDSL notation
14. `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/rules.md` -- FEATURE rules including checkbox management and code traceability
15. `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/checklist.md` -- FEATURE checklist with review scope by feature type
16. `.cypilot/.gen/kits/sdlc/artifacts/FEATURE/examples/example.md` -- Task CRUD feature example with CDSL flows
17. `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/template.md` -- DECOMPOSITION feature entry structure
18. `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/rules.md` -- DECOMPOSITION rules including checkbox cascade
19. `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/checklist.md` -- DECOMPOSITION checklist (COV, EXC, ATTR, TRC, DEP)
20. `.cypilot/.gen/kits/sdlc/artifacts/DECOMPOSITION/examples/example.md` -- TaskFlow decomposition example
21. `.cypilot/.gen/kits/sdlc/constraints.toml` -- Master constraint file defining all heading outlines, ID kinds, and cross-artifact reference rules
22. `.cypilot/kits/sdlc/blueprints/PRD.md` -- PRD blueprint with `@cpt:` marker definitions (generation source)
23. `.cypilot/kits/sdlc/blueprints/ADR.md` -- ADR blueprint confirming required frontmatter fields
24. `.cypilot/kits/sdlc/blueprints/DESIGN.md` -- DESIGN blueprint metadata
25. `.cypilot/kits/sdlc/blueprints/FEATURE.md` -- FEATURE blueprint confirming CDSL as the specification language
26. `.cypilot/kits/sdlc/blueprints/DECOMPOSITION.md` -- DECOMPOSITION blueprint confirming bridge role
