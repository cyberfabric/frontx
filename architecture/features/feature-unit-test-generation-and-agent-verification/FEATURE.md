# Feature: Unit Test Generation and Agent Verification

- [ ] `p1` - **ID**: `cpt-frontx-featstatus-unit-test-generation-and-agent-verification`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Create Project with Unit Test Setup](#create-project-with-unit-test-setup)
  - [AI Agent Verifies Changes with Configured Unit Tests](#ai-agent-verifies-changes-with-configured-unit-tests)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Resolve Testing Configuration from frontx.config.json](#resolve-testing-configuration-from-frontxconfigjson)
  - [Scaffold Unit Test Files and Scripts](#scaffold-unit-test-files-and-scripts)
  - [Generate AI Instructions for Test Verification](#generate-ai-instructions-for-test-verification)
- [4. States (CDSL)](#4-states-cdsl)
  - [Testing Strategy Mode](#testing-strategy-mode)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Project Scaffolding Includes Unit Test Runner](#project-scaffolding-includes-unit-test-runner)
  - [Testing Configuration Is Machine Readable](#testing-configuration-is-machine-readable)
  - [AI Instructions Enforce Configured Test Command](#ai-instructions-enforce-configured-test-command)
  - [_blank-mfe Provides Baseline Unit Tests](#blank-mfe-provides-baseline-unit-tests)
- [6. Acceptance Criteria](#6-acceptance-criteria)
- [Additional Context](#additional-context)
  - [Known Limitations](#known-limitations)

<!-- /toc -->

---

## 1. Feature Context

### 1.1 Overview

The Unit Test Generation and Agent Verification feature extends FrontX CLI scaffolding so newly created projects ship with a configured unit-test workflow, and generated AI instructions tell agents to use that workflow during development. Vitest is the default runner. The project stores its testing contract in `frontx.config.json`, and generated screensets inherit a runnable baseline from `_blank-mfe`.

Problem: FrontX currently scaffolds application structure, AI guidance, and architecture validation commands, but it does not scaffold an app-level unit-test runner or require AI agents to run unit tests during implementation. New projects therefore lack a standard unit-test contract, and generated screensets inherit no test baseline from `_blank-mfe`.

Primary value: `frontx create` produces a project that has a working unit-test command, a machine-readable testing configuration, AI instructions that reference the configured command, and screenset templates that already demonstrate how unit tests should be structured.

Key assumptions: Vitest is the only required first-class implementation in the initial rollout. The testing strategy mode is intentionally limited to `default` and `custom`. The configured command remains the canonical execution contract even when the project uses custom testing rules.

### 1.2 Purpose

Enable `cpt-frontx-actor-developer`, `cpt-frontx-actor-ai-agent`, and `cpt-frontx-actor-cli` to treat unit tests as part of the default FrontX development workflow instead of an optional afterthought. Project creation should establish the unit-test tool and command. AI sync should propagate that contract into generated tool instructions. Screenset generation should inherit a baseline test pattern from `_blank-mfe`.

Success criteria: A developer runs `frontx create`, accepts the default Vitest option or chooses another supported runner, installs dependencies, runs `npm run test:unit`, and gets passing baseline tests. An AI agent modifying generated project code reads `frontx.config.json`, uses the configured unit-test command during development, and follows project-specific testing guidance only when the strategy mode is `custom`.

### 1.3 Actors

- `cpt-frontx-actor-developer`
- `cpt-frontx-actor-ai-agent`
- `cpt-frontx-actor-cli`
- `cpt-frontx-actor-build-system`

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md)
- **Related feature**: [FEATURE.md](/home/viktor/HAI3/architecture/features/feature-cli-tooling/FEATURE.md) — `cpt-frontx-feature-cli-tooling`
- **PRD requirements**: `cpt-frontx-fr-cli-commands`, `cpt-frontx-fr-cli-templates`, `cpt-frontx-fr-cli-skills`, `cpt-frontx-fr-cli-e2e-verification`, `cpt-frontx-fr-ai-agent-integration`
- **PRD NFRs**: `cpt-frontx-nfr-maint-arch-enforcement`
- **Design components**: `cpt-frontx-component-cli`
- **Design feature references**: `cpt-frontx-fr-cli-commands`, `cpt-frontx-fr-cli-templates`, `cpt-frontx-fr-cli-skills`, `cpt-frontx-fr-cli-e2e-verification`
- **Design constraints**: `cpt-frontx-constraint-typescript-strict-mode`

---

## 2. Actor Flows (CDSL)

### Create Project with Unit Test Setup

- [ ] `p1` - **ID**: `cpt-frontx-flow-unit-test-generation-and-agent-verification-create-project`

**Actor**: `cpt-frontx-actor-developer`

**Success Scenarios**:
- Project scaffold includes unit-test scripts, config, and starter tests
- `frontx.config.json` records the selected testing contract

**Error Scenarios**:
- Selected test runner is unsupported by the scaffold logic
- Required test template files are missing from the CLI build output

**Steps**:
1. [ ] - `p1` - Developer invokes `frontx create <project-name>` with optional testing flags or accepts interactive defaults - `inst-create-project-invoke`
2. [ ] - `p1` - CLI prompts for unit-test runner selection when the value is not provided explicitly; default selection is Vitest - `inst-create-project-prompt-runner`
3. [ ] - `p1` - Algorithm: scaffold unit-test files and scripts using `cpt-frontx-algo-unit-test-generation-and-agent-verification-scaffold-tests` - `inst-create-project-run-scaffold`
4. [ ] - `p1` - CLI writes `testing.unit.runner`, `testing.unit.command`, and `testing.strategy.mode` into `frontx.config.json` - `inst-create-project-write-config`
5. [ ] - `p1` - CLI writes generated project files, including test config and starter test files, to disk - `inst-create-project-write-files`
6. [ ] - `p1` - CLI triggers AI sync so generated tool instructions include the configured unit-test verification rule - `inst-create-project-run-ai-sync`
7. [ ] - `p1` - **RETURN** project scaffold with a passing baseline unit-test command - `inst-create-project-return`

### AI Agent Verifies Changes with Configured Unit Tests

- [ ] `p1` - **ID**: `cpt-frontx-flow-unit-test-generation-and-agent-verification-agent-verify`

**Actor**: `cpt-frontx-actor-ai-agent`

**Success Scenarios**:
- Agent runs the configured unit-test command for touched code during development
- Agent follows project-specific testing rules when strategy mode is `custom`

**Error Scenarios**:
- `frontx.config.json` missing testing configuration
- Configured test command fails or is absent from generated scripts

**Steps**:
1. [ ] - `p1` - AI agent reads `.ai/GUIDELINES.md` and the routed target files before modifying code - `inst-agent-read-guidelines`
2. [ ] - `p1` - Algorithm: resolve testing configuration from `frontx.config.json` using `cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-testing-config` - `inst-agent-resolve-config`
3. [ ] - `p1` - **IF** `testing.strategy.mode` is `custom` **THEN** agent reads project testing guidance from `.ai/project/GUIDELINES.md` or `.ai/project/targets/TESTING.md` before proceeding - `inst-agent-load-custom-strategy`
4. [ ] - `p1` - Agent implements the requested code change and updates or adds unit tests when the changed behavior requires test coverage - `inst-agent-implement-and-test`
5. [ ] - `p1` - Algorithm: generate AI instructions for test verification using `cpt-frontx-algo-unit-test-generation-and-agent-verification-generate-ai-rules` - `inst-agent-follow-generated-rules`
6. [ ] - `p1` - Agent runs the configured unit-test command for the touched code area during development and before final validation - `inst-agent-run-unit-tests`
7. [ ] - `p1` - Agent runs `type-check` and `arch:check` after unit tests pass - `inst-agent-run-final-checks`
8. [ ] - `p1` - **RETURN** implementation verified against project testing configuration - `inst-agent-return`

---

## 3. Processes / Business Logic (CDSL)

### Resolve Testing Configuration from frontx.config.json

- [ ] `p1` - **ID**: `cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-testing-config`

**Input**: Project root directory path

**Output**: Testing configuration object with `runner`, `command`, and `strategy.mode`

**Steps**:
1. [ ] - `p1` - Read `frontx.config.json` from the project root - `inst-read-frontx-config`
2. [ ] - `p1` - **IF** `testing` block is absent **RETURN** fallback configuration with runner `vitest`, command `npm run test:unit`, and strategy mode `default` only when the project was scaffolded by a compatible FrontX version - `inst-fallback-default`
3. [ ] - `p1` - Extract `testing.unit.runner` and validate it against supported scaffolded runner identifiers - `inst-extract-runner`
4. [ ] - `p1` - Extract `testing.unit.command` and validate that it is a non-empty executable command string - `inst-extract-command`
5. [ ] - `p1` - Extract `testing.strategy.mode` and validate that the value is either `default` or `custom` - `inst-extract-strategy-mode`
6. [ ] - `p1` - **IF** validation fails for any required testing field **RETURN** configuration error with a remediation message naming the missing or invalid field - `inst-return-config-error`
7. [ ] - `p1` - **RETURN** normalized testing configuration object - `inst-return-normalized-config`

### Scaffold Unit Test Files and Scripts

- [ ] `p1` - **ID**: `cpt-frontx-algo-unit-test-generation-and-agent-verification-scaffold-tests`

**Input**: Selected runner, project type, project root, and template manifest

**Output**: Generated file set containing test scripts, config, and starter tests

**Steps**:
1. [ ] - `p1` - Receive selected unit-test runner from `frontx create`; default to Vitest when no explicit value is provided - `inst-receive-runner`
2. [ ] - `p1` - **IF** runner is not a scaffold-supported value **RETURN** error identifying the unsupported runner - `inst-validate-runner`
3. [ ] - `p1` - Add runner-specific dependencies and scripts to generated `package.json`, including `test`, `test:unit`, and `test:unit:watch` aliases - `inst-add-package-json-entries`
4. [ ] - `p1` - Generate runner-specific config files in the project root or conventional location used by the selected runner - `inst-generate-runner-config`
5. [ ] - `p1` - Generate starter app-level unit tests that exercise at least one scaffolded utility or configuration path - `inst-generate-starter-tests`
6. [ ] - `p1` - Generate `_blank-mfe`-derived starter tests so new screensets inherit a working unit-test pattern - `inst-generate-blank-mfe-tests`
7. [ ] - `p1` - Write `testing.unit.runner`, `testing.unit.command`, and `testing.strategy.mode` into generated `frontx.config.json` - `inst-write-testing-config`
8. [ ] - `p1` - **RETURN** complete generated testing file set and metadata for later AI sync consumption - `inst-return-scaffolded-tests`

### Generate AI Instructions for Test Verification

- [ ] `p1` - **ID**: `cpt-frontx-algo-unit-test-generation-and-agent-verification-generate-ai-rules`

**Input**: Testing configuration, package manager, generated AI tool targets

**Output**: Updated AI assistant instructions aligned with the project's testing contract

**Steps**:
1. [ ] - `p1` - Read normalized testing configuration from `cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-testing-config` - `inst-read-normalized-testing-config`
2. [ ] - `p1` - Generate a canonical validation instruction that tells agents to run the configured unit-test command during development for touched code - `inst-generate-unit-test-rule`
3. [ ] - `p1` - **IF** strategy mode is `custom` **THEN** add an instruction telling agents to read project-specific testing guidance before assuming default policy - `inst-handle-custom-strategy`
4. [ ] - `p1` - Insert the test-verification rule into generated AI assistant files alongside existing `type-check`, `lint`, and `arch:check` guidance - `inst-insert-ai-rule`
5. [ ] - `p1` - Update generated command templates such as validation and screenset flows so they reference the configured unit-test command where appropriate - `inst-update-command-templates`
6. [ ] - `p1` - **RETURN** generated AI instruction content synchronized with the project's testing configuration - `inst-return-generated-ai-rules`

---

## 4. States (CDSL)

### Testing Strategy Mode

- [ ] `p2` - **ID**: `cpt-frontx-state-unit-test-generation-and-agent-verification-strategy-mode`

**States**: `DEFAULT`, `CUSTOM`

**Initial State**: `DEFAULT`

**Transitions**:
1. [ ] - `p1` - **FROM** `DEFAULT` **TO** `CUSTOM` **WHEN** project configuration sets `testing.strategy.mode` to `custom` and project-specific testing guidance exists - `inst-transition-to-custom`
2. [ ] - `p1` - **FROM** `CUSTOM` **TO** `DEFAULT` **WHEN** project configuration sets `testing.strategy.mode` back to `default` and custom project testing overrides are no longer required - `inst-transition-to-default`

---

## 5. Definitions of Done

### Project Scaffolding Includes Unit Test Runner

- [ ] `p1` - **ID**: `cpt-frontx-dod-unit-test-generation-and-agent-verification-project-scaffold`

The system **MUST** scaffold a unit-test runner into newly created FrontX projects and expose a canonical unit-test command.

**Implements**:
- `cpt-frontx-flow-unit-test-generation-and-agent-verification-create-project`
- `cpt-frontx-algo-unit-test-generation-and-agent-verification-scaffold-tests`

**Touches**:
- CLI: `frontx create`
- Config: `frontx.config.json`
- Generated files: runner config, starter tests, `package.json`

### Testing Configuration Is Machine Readable

- [ ] `p1` - **ID**: `cpt-frontx-dod-unit-test-generation-and-agent-verification-machine-readable-config`

The system **MUST** store the unit-test contract in `frontx.config.json` using `testing.unit.runner`, `testing.unit.command`, and `testing.strategy.mode`.

**Implements**:
- `cpt-frontx-algo-unit-test-generation-and-agent-verification-resolve-testing-config`
- `cpt-frontx-state-unit-test-generation-and-agent-verification-strategy-mode`

**Touches**:
- Config: `frontx.config.json`
- Validation: config parsing and normalization

### AI Instructions Enforce Configured Test Command

- [ ] `p1` - **ID**: `cpt-frontx-dod-unit-test-generation-and-agent-verification-ai-enforcement`

The system **MUST** generate AI assistant instructions that require agents to run the configured unit-test command during development and before final validation, while respecting `custom` strategy overrides.

**Implements**:
- `cpt-frontx-flow-unit-test-generation-and-agent-verification-agent-verify`
- `cpt-frontx-algo-unit-test-generation-and-agent-verification-generate-ai-rules`

**Touches**:
- AI configs: `CLAUDE.md`, Cursor, Windsurf, Copilot
- Command templates: validation and generation flows

### _blank-mfe Provides Baseline Unit Tests

- [ ] `p1` - **ID**: `cpt-frontx-dod-unit-test-generation-and-agent-verification-blank-mfe-tests`

The system **MUST** provide baseline unit tests in `_blank-mfe` so generated screensets inherit a working unit-test pattern and at least one runnable test path.

**Implements**:
- `cpt-frontx-algo-unit-test-generation-and-agent-verification-scaffold-tests`

**Touches**:
- `_blank-mfe` template files
- Screenset generation outputs

---

## 6. Acceptance Criteria

- [ ] `frontx create` offers a unit-test runner choice with Vitest as the default option
- [ ] Generated project `package.json` exposes a canonical unit-test command and watch variant
- [ ] Generated project `frontx.config.json` contains machine-readable testing configuration with strategy mode limited to `default` or `custom`
- [ ] AI sync outputs tell agents to run the configured unit-test command during development for touched code
- [ ] **IF** strategy mode is `custom` **THEN** generated AI instructions tell agents to read project testing guidance before assuming default behavior
- [ ] `_blank-mfe` contains baseline unit tests that survive template transformation into generated screensets
- [ ] Generated baseline tests pass on a newly scaffolded default app after dependency installation

## Additional Context

### Known Limitations

- The initial rollout only requires Vitest as a first-class implementation; other runners may be supported later without changing the `default | custom` strategy-mode model.
- This FEATURE is intentionally created before an upstream `DECOMPOSITION.md` entry exists for it. A follow-up DECOMPOSITION update is required to establish formal parent linkage and scheduling status.
- The configured unit-test command is the canonical automation contract even when project-specific testing guidance adds stricter or broader expectations.
