## ADDED Requirements

### Requirement: Required CLI PR End-to-End Verification

The repository SHALL run a dedicated GitHub Actions workflow for CLI end-to-end verification on every pull request targeting `main`.

#### Scenario: Required PR workflow exists

- **WHEN** inspecting repository workflows
- **THEN** `.github/workflows/cli-pr.yml` SHALL exist
- **AND** it SHALL define a job named `cli-pr-e2e`
- **AND** branch protection for `main` SHALL be able to require `cli-pr-e2e`

#### Scenario: PR workflow runtime is pinned

- **GIVEN** the CLI PR workflow configuration
- **WHEN** inspecting the Node setup step
- **THEN** the workflow SHALL run on `ubuntu-latest`
- **AND** it SHALL use Node `24.14.x`

### Requirement: Fresh Scaffold Path Must Pass in CI

The required CLI PR workflow SHALL verify that a freshly generated default app scaffold is installable, buildable, and type-check clean.

#### Scenario: Fresh scaffold passes critical lifecycle

- **GIVEN** the PR e2e scenario
- **WHEN** the workflow creates a project with `hai3 create smoke-app --no-studio --uikit hai3`
- **THEN** the workflow SHALL initialize git in the generated project
- **AND** `npm install --no-audit --no-fund` SHALL succeed
- **AND** `npm run build` SHALL succeed
- **AND** `npm run type-check` SHALL succeed

#### Scenario: Scaffold includes required MFE support files

- **GIVEN** a project created by the PR e2e scenario
- **WHEN** inspecting generated files
- **THEN** the project SHALL include `src/app/mfe/bootstrap.ts`
- **AND** the project SHALL include `scripts/generate-mfe-manifests.ts`
- **AND** the generated `package.json` SHALL declare `engines.node >=24.14.0`

### Requirement: CLI Command Smoke Coverage in PR

The required CLI PR workflow SHALL validate the main non-interactive CLI commands that are expected to work on a fresh scaffold.

#### Scenario: Validation command passes on a clean project

- **GIVEN** a freshly generated project
- **WHEN** `hai3 validate components` runs
- **THEN** the command SHALL exit successfully

#### Scenario: Validation command detects an injected violation

- **GIVEN** a freshly generated project
- **AND** an invalid screen file containing inline style and hex color is added
- **WHEN** `hai3 validate components` runs
- **THEN** the command SHALL exit with failure

#### Scenario: Layout scaffold and AI sync complete

- **GIVEN** a freshly generated project
- **WHEN** `hai3 scaffold layout -f` runs
- **THEN** the command SHALL exit successfully
- **AND** layout files SHALL be present
- **WHEN** `hai3 ai sync --tool all --diff` runs
- **THEN** the command SHALL exit successfully

### Requirement: CLI E2E Artifacts

The CLI e2e workflows SHALL persist step-level logs for diagnosis.

#### Scenario: CI artifacts uploaded

- **GIVEN** the CLI PR workflow or CLI nightly workflow has run
- **WHEN** the workflow completes
- **THEN** step logs and a summary artifact SHALL be uploaded
- **AND** artifact upload SHALL run even when the e2e scenario fails

### Requirement: Extended CLI Coverage Outside Required PR Gate

The repository SHALL provide a non-required nightly or manual workflow for broader CLI scenarios beyond the critical PR path.

#### Scenario: Nightly workflow exists

- **WHEN** inspecting repository workflows
- **THEN** `.github/workflows/cli-nightly.yml` SHALL exist
- **AND** it SHALL support `schedule`
- **AND** it SHALL support `workflow_dispatch`

#### Scenario: Nightly workflow covers broader CLI scenarios

- **GIVEN** the CLI nightly workflow
- **WHEN** inspecting its e2e scenario definition
- **THEN** it SHALL cover `hai3 create --uikit none`
- **AND** it SHALL cover layer scaffolds for `sdk`, `framework`, and `react`
- **AND** it SHALL cover `hai3 migrate --list`
- **AND** it SHALL cover `hai3 migrate --status`
