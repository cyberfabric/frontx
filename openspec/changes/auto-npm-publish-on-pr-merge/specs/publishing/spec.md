## ADDED Requirements

### Requirement: Automated NPM Publishing on PR Merge

When a pull request is merged to the `main` branch that contains version changes in package.json files, the CI/CD system SHALL automatically publish the affected packages to NPM in dependency order.

#### Scenario: Standard version bump release

- **GIVEN** a PR that bumps version in a package's package.json
- **AND** the new version does NOT exist on NPM registry
- **WHEN** the PR is merged to main
- **THEN** the GitHub Actions workflow publishes the package to NPM
- **AND** logs "Published <package>@<version>"

#### Scenario: Multi-package release ordering

- **GIVEN** a PR that bumps versions in multiple packages across layers
- **WHEN** the PR is merged to main
- **THEN** packages are published in layer order:
  - Layer 1 (SDK): @hai3/state, @hai3/screensets, @hai3/api, @hai3/i18n
  - Layer 2: @hai3/framework
  - Layer 3: @hai3/react
  - Layer 4: @hai3/uikit (standalone)
  - Layer 5: @hai3/studio
  - Layer 6: @hai3/cli (always last)

### Requirement: NPM Registry Version Check

Before publishing any package, the workflow SHALL verify the version does NOT already exist on NPM registry.

#### Scenario: Version already exists on NPM

- **GIVEN** a PR that sets a package version to a value that already exists on NPM
- **WHEN** the PR is merged to main
- **THEN** the workflow skips publishing that package
- **AND** logs "Skipping <package>@<version> - already exists on NPM"
- **AND** continues with remaining packages

#### Scenario: First-time package publish

- **GIVEN** a new package that has never been published to NPM
- **WHEN** `npm view <package>@<version>` returns "not found"
- **THEN** the workflow proceeds with publishing

### Requirement: Fail-Fast Publishing

If any package publish fails, the workflow SHALL stop immediately and report the error.

#### Scenario: Publish failure handling

- **GIVEN** a PR that bumps multiple package versions
- **AND** one package publish fails (network error, auth error, etc.)
- **WHEN** the failure occurs
- **THEN** the workflow fails immediately
- **AND** does NOT attempt to publish subsequent packages
- **AND** reports clear error message identifying the failed package

### Requirement: NPM Authentication

The workflow SHALL authenticate with NPM using the `NPM_TOKEN` secret stored in GitHub Actions secrets.

#### Scenario: Successful authentication

- **GIVEN** a valid NPM_TOKEN is configured in GitHub secrets
- **WHEN** the workflow attempts to publish
- **THEN** authentication succeeds
- **AND** packages are published with `--access public`

#### Scenario: Invalid authentication

- **GIVEN** the NPM_TOKEN secret is invalid or expired
- **WHEN** the workflow attempts to publish
- **THEN** the workflow fails with authentication error
- **AND** no packages are published

### Requirement: No-Change Handling

When a PR contains no version changes, the workflow SHALL exit successfully without publishing.

#### Scenario: No version changes in PR

- **GIVEN** a PR with code changes but no version bumps in any package.json
- **WHEN** the PR is merged to main
- **THEN** the workflow detects no version changes
- **AND** logs "No packages with version changes to publish"
- **AND** exits successfully with status code 0
