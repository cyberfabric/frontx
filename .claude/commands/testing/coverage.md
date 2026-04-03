---
name: "Testing: Coverage"
description: Show Cypilot FEATURE requirement test coverage status
category: Testing
tags: [testing, coverage, cypilot, feature]
---

# Test Coverage Check

Analyze Cypilot FEATURE specifications and BDD feature files to show which requirements have test coverage and which don't.

## Guardrails

- **Read-only** — this skill never modifies any files
- Uses `@feature:`, `@flow:`, and `@dod:` tag conventions to link requirements to test scenarios
- **Only UI-testable FEATURE specs are in scope** — SDK, framework, CLI, infrastructure features cannot be tested with Playwright BDD

## Scope: UI-Testable FEATURE Specs Only

This skill only reports on FEATURE specs that target **UI screens** — the same specs that `/testing:spec-to-tests` can generate tests for.

**Inclusion rule:** A FEATURE is in scope if it contains UI-related keywords in its Actor Flows or Acceptance Criteria: "screen", "menu", "table", "button", "sidebar", "navigation", "page", "panel", "component", "render", "click", "drag", "toggle", "visible", "display".

**How to determine the mapping:**

1. Read `src/mfe_packages/*/mfe.json` to discover all MFE packages and their screens
2. A FEATURE is in scope if its content references UI components, screens, or user interactions
3. Also include any FEATURE that maps to an existing MFE package by name or content

**Always excluded** (these are SDK/infrastructure features, not testable with Playwright BDD):

- `feature-api-communication` — SDK package internals
- `feature-state-management` — Redux store internals
- `feature-i18n-infrastructure` — i18n loading internals
- `feature-screenset-registry` — type system / registry internals
- `feature-mfe-isolation` — MFE bundling / blob URL internals
- `feature-publishing-pipeline` — CI/CD pipeline

**Potentially in scope** (have UI-facing aspects):

- `feature-studio-devtools` — Studio panel is a visible UI component
- `feature-framework-composition` — framework wires UI plugins
- `feature-react-bindings` — React hooks used in screens
- `feature-cli-tooling` — CLI is not UI, but generated projects have UI
- `feature-ui-libraries-choice` — UIKit components are visible

If a FEATURE is explicitly passed as an argument but is out of scope, output a warning:

```
Warning: FEATURE "{name}" is an SDK/infrastructure feature and cannot be covered by BDD tests.
```

## Arguments

- No arguments -> show all in-scope FEATURE specs
- FEATURE name (e.g., `studio-devtools`) -> filter to that feature only
- `--all` -> include out-of-scope features too (shows them greyed out with "N/A" status)

## Steps

### 1. Discover MFE Packages

Read `src/mfe_packages/*/mfe.json` to build the MFE screen map. This helps determine which FEATURE specs are in scope.

### 2. Collect Requirements from FEATURE Specs

Glob `architecture/features/*/FEATURE.md` and read each file. Extract:

- **Feature name** from the directory name (e.g., `feature-studio-devtools`)
- **Actor Flows** from Section 2 — each `### {Flow Name}` with its `cpt-hai3-flow-*` ID
- **Definitions of Done** from Section 5 — each `### DoD: {Name}` with its `cpt-hai3-dod-*` ID
- **Acceptance Criteria** from Section 6 — each bullet point as a requirement

**Skip FEATURE specs that are out of scope** (don't reference UI) unless `--all` was passed.

If a feature name argument was provided, only read that feature.

### 3. Scan All Feature Files for Traceability Tags

Glob `src/mfe_packages/*/tests/*.feature` and read each file. Extract:

- All `@feature:{name}` tags
- All `@flow:{id}` tags
- All `@dod:{id}` tags
- All `@acceptance` tags
- For each tag, collect the `Scenario:` name that follows it
- Build a map: `tag -> [scenario names]`

### 4. Build Coverage Map

For each requirement found in step 2:

1. Convert the requirement to its tag format:
   - Actor Flow `cpt-hai3-flow-studio-devtools-drag-panel` -> `@flow:cpt-hai3-flow-studio-devtools-drag-panel`
   - DoD `cpt-hai3-dod-studio-devtools-panel-overlay` -> `@dod:cpt-hai3-dod-studio-devtools-panel-overlay`
   - Acceptance Criteria -> matched by `@feature:{name}` + `@acceptance` on same scenario
2. Look up the tag in the feature file map from step 3
3. Determine status:
   - **Covered** — at least one test scenario has a matching tag
   - **Not covered** — no matching tag found in any feature file

### 5. Output Coverage Table

Output a markdown table grouped by FEATURE:

```
## Test Coverage Report

### feature-studio-devtools (3/12 requirements covered — 25%)

| # | Requirement | Type | Status | Test Scenarios |
|---|-------------|------|--------|----------------|
| 1 | Drag Panel (flow) | Flow | Covered | 2: "Studio panel can be dragged..." |
| 2 | Panel Overlay (dod) | DoD | Covered | 1: "Studio panel renders as fixed overlay" |
| 3 | Panel renders in dev mode | AC | Covered | 1: "Studio panel renders in development mode" |
| 4 | Keyboard Toggle (flow) | Flow | Not covered | -- |
| 5 | Control Panel Sections (dod) | DoD | Not covered | -- |
...
```

### 6. Output Summary

```
## Summary

- **In-scope FEATURE specs:** 3
- **Total requirements:** 45 (15 flows + 18 DoDs + 12 acceptance criteria)
- **Covered:** 8 (18%)
- **Not covered:** 37 (82%)
- **Total test scenarios:** 12
```
