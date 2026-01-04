# Change: Automatic NPM Publishing on PR Merge

## Status

**PROPOSED** - Awaiting approval

## Why

Currently, HAI3 package publishing to NPM is a manual process. This creates friction and risk:

1. **Version drift**: Developers may forget to publish after merging changes
2. **Human error**: Manual publishing can lead to missed packages or wrong versions
3. **Development conflicts**: When publishing manually during active development, versions may be published that conflict with ongoing work
4. **Lack of traceability**: No clear audit trail of which commit produced which published version

Automating publishing upon PR merge to main branch ensures:
- Consistent, timely releases
- Clear traceability (PR merge -> publish)
- Reduced manual overhead
- Safe coexistence with development: only publishes when version is bumped AND not already on NPM

## What Changes

- **NEW** GitHub Actions workflow: `.github/workflows/publish-packages.yml`
  - Triggers on PR merge to main
  - Detects version changes in package.json files
  - Publishes packages in dependency order
  - Uses NPM_TOKEN secret for authentication

## Impact

- Affected specs: None (CI/CD infrastructure only)
- Affected code: `.github/workflows/` (new workflow file)
- Dependencies: None new

## Requirements

### REQ-1: Trigger Condition

The workflow SHALL run only when a pull request is merged to the `main` branch.

**Priority**: P0 (Critical)

### REQ-2: Version Change Detection

The workflow SHALL compare each package's `package.json` version field between the merge commit and its parent to detect version bumps.

**Priority**: P0 (Critical)

### REQ-3: NPM Registry Check

Before publishing any package, the workflow SHALL verify the version does NOT already exist on the NPM registry using `npm view <package>@<version>`.

**Priority**: P0 (Critical)

**Rationale**: Prevents conflicts with manual publishes during development and avoids failed publish attempts.

### REQ-4: Publishing Order

The workflow SHALL publish packages in HAI3 architecture layer order:

1. **Layer 1 (SDK)**: `@hai3/state`, `@hai3/screensets`, `@hai3/api`, `@hai3/i18n` (parallel, no inter-dependencies)
2. **Layer 2 (Framework)**: `@hai3/framework` (depends on SDK packages)
3. **Layer 3 (React)**: `@hai3/react` (depends on Framework)
4. **Layer 4 (UI)**: `@hai3/uikit` (standalone, can be parallel with L1)
5. **Layer 5 (Tools)**: `@hai3/studio` (depends on React)
6. **Layer 6 (CLI)**: `@hai3/cli` (always last, depends on all packages for templates)

**Priority**: P0 (Critical)

**Note**: Packages within the same layer that have no inter-dependencies MAY be published in parallel.

### REQ-5: Authentication

The workflow SHALL authenticate with NPM using the `NPM_TOKEN` secret stored in GitHub Actions secrets.

**Priority**: P0 (Critical)

**Rationale**: Organization tokens allow 2FA bypass for automated publishing.

### REQ-6: Public Access

The workflow SHALL use `npm publish --access public` to ensure packages are published to the public registry.

**Priority**: P0 (Critical)

### REQ-7: Failure Handling

If any package publish fails, the workflow SHALL:
1. Fail immediately (fail-fast behavior)
2. Report clear error message indicating which package failed
3. NOT attempt to publish subsequent packages

**Priority**: P0 (Critical)

### REQ-8: Clear Logging

The workflow SHALL log:
- Which packages have version changes
- Which packages are being skipped (version already on NPM)
- Which packages are being published
- Success/failure status for each package

**Priority**: P1 (High)

### REQ-9: Security Best Practices

The workflow SHALL use explicit minimal permissions at the workflow level (`permissions: contents: read`).

**Priority**: P1 (High)

**Rationale**: Explicit permissions follow GitHub's recommended security practices and limit the blast radius of potential token compromise.

### REQ-10: Retry Logic

The workflow SHALL implement retry with exponential backoff for `npm publish` commands:
- Maximum 3 attempts per package
- Delays: 5 seconds, 10 seconds, 20 seconds between attempts
- Clear logging of retry attempts

**Priority**: P0 (Critical)

**Rationale**: Transient network failures to NPM registry should not cause workflow failures when a simple retry would succeed.

## User Scenarios

### Scenario 1: Standard Version Bump Release

**Given** a PR that bumps version in `@hai3/framework` from `0.2.0-alpha.1` to `0.2.0-alpha.2`
**And** version `0.2.0-alpha.2` does NOT exist on NPM
**When** the PR is merged to main
**Then** the workflow publishes `@hai3/framework@0.2.0-alpha.2` to NPM
**And** logs "Published @hai3/framework@0.2.0-alpha.2"

### Scenario 2: Multi-Package Release

**Given** a PR that bumps versions in `@hai3/state`, `@hai3/framework`, and `@hai3/react`
**When** the PR is merged to main
**Then** the workflow publishes in order:
1. `@hai3/state` (Layer 1)
2. `@hai3/framework` (Layer 2)
3. `@hai3/react` (Layer 3)

### Scenario 3: Version Already Exists on NPM

**Given** a PR that sets `@hai3/uikit` version to `0.2.0-alpha.1`
**And** version `0.2.0-alpha.1` already exists on NPM (manually published earlier)
**When** the PR is merged to main
**Then** the workflow skips `@hai3/uikit`
**And** logs "Skipping @hai3/uikit@0.2.0-alpha.1 - already exists on NPM"

### Scenario 4: No Version Changes

**Given** a PR with code changes but no version bumps
**When** the PR is merged to main
**Then** the workflow detects no version changes
**And** logs "No packages with version changes to publish"
**And** exits successfully with no publishes

### Scenario 5: PR to Non-Main Branch

**Given** a PR targeting the `develop` branch
**When** the PR is merged
**Then** the publish workflow does NOT run

### Scenario 6: Publish Failure (After Retries)

**Given** a PR that bumps `@hai3/api` and `@hai3/framework` versions
**And** `@hai3/api` publish succeeds
**And** `@hai3/framework` publish fails on all 3 retry attempts
**When** the PR is merged to main
**Then** the workflow fails after `@hai3/framework` exhausts retries
**And** does NOT attempt to publish any remaining packages
**And** reports clear error message including retry attempt count

### Scenario 7: Transient Failure with Successful Retry

**Given** a PR that bumps `@hai3/state` version
**And** first `npm publish` attempt fails due to transient network error
**And** second attempt succeeds
**When** the PR is merged to main
**Then** the workflow logs "Attempt 1 failed. Retrying in 5s..."
**And** the workflow logs "Publish attempt 2 of 3..."
**And** the workflow publishes `@hai3/state` successfully
**And** workflow completes with success status

## Edge Cases and Error Handling

### EC-1: Package Build Failure

**Given** a package fails to build before publishing
**Then** the workflow fails with build error
**And** no packages are published

### EC-2: NPM Rate Limiting

**Given** NPM rate limits the version check or publish
**Then** the workflow fails with rate limit error
**And** can be manually re-run after rate limit expires

### EC-3: Invalid NPM Token

**Given** the NPM_TOKEN secret is invalid or expired
**Then** the workflow fails on first publish attempt
**And** reports authentication error

### EC-4: Package Not Found on NPM (First Publish)

**Given** a new package that has never been published
**When** `npm view <package>@<version>` returns "not found"
**Then** the workflow proceeds with publishing

## Acceptance Criteria

### AC-1: Version Detection Works

- [ ] Workflow correctly identifies packages with version changes between merge commit and parent
- [ ] Workflow ignores packages without version changes
- [ ] Verification: Create test PR with version bump, verify detection in workflow logs

### AC-2: NPM Existence Check Works

- [ ] Workflow correctly checks if version exists on NPM registry
- [ ] Workflow skips packages where version already exists
- [ ] Workflow proceeds for versions that don't exist
- [ ] Verification: Test with existing version (should skip) and new version (should publish)

### AC-3: Publishing Order Correct

- [ ] SDK packages (L1) publish before Framework (L2)
- [ ] Framework publishes before React (L3)
- [ ] CLI publishes last
- [ ] Verification: Create PR bumping multiple layers, verify order in workflow logs

### AC-4: Authentication Works

- [ ] Workflow authenticates successfully with NPM_TOKEN
- [ ] Packages are published with public access
- [ ] Verification: Successful publish appears on npmjs.com

### AC-5: Failure Handling Works

- [ ] Workflow stops on first failure
- [ ] Error message clearly identifies failed package
- [ ] Verification: Simulate failure, verify fail-fast behavior

### AC-6: Logging Clarity

- [ ] All log messages are clear and actionable
- [ ] Published packages are clearly listed
- [ ] Skipped packages are clearly listed with reason
- [ ] Verification: Review workflow output for clarity

### AC-7: Retry Logic Works

- [ ] Workflow retries failed npm publish up to 3 times
- [ ] Delays follow exponential backoff (5s, 10s, 20s)
- [ ] Retry attempts are clearly logged
- [ ] Verification: Review workflow YAML for retry implementation

## Out of Scope

- Changelog generation (separate tooling concern)
- Version bump automation (manual decision when to bump)
- Slack/Discord notifications (can be added later)
- NPM provenance/attestation (future security enhancement)
- Rollback automation (manual process if needed)
