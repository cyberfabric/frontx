# Phase 8: GitHub Workflows — CI/CD for Gitflow + New Publishing Pipeline

## What
Update GitHub Actions workflows for the new gitflow branching model and @cyberfabric publishing.

## Scope
- `.github/workflows/publish-packages.yml` — the main publishing workflow
- `.github/workflows/cli-pr.yml` — CLI PR checks
- `.github/workflows/cli-nightly.yml` — CLI nightly tests
- `.github/workflows/prompt-tests.yml` — AI guideline tests

## Changes to publish-packages.yml

### Current behavior
- Triggers on push to `main`
- Detects version changes by diffing package.json files
- Publishes with dist-tag based on version string (-alpha → alpha, -beta → beta, -rc → next, else → latest)

### New behavior
- **Two trigger branches**: `main` (publishes as `latest`) and `develop` (publishes as `alpha`)
- The dist-tag logic based on version strings can stay as a safety net, but the branch determines the primary channel
- Update all `@hai3/` workspace references to `@cyberfabric/`
- Update the layer-ordered publish steps to use `@cyberfabric/*` names
- Add the `generate-versions` step before CLI build (if CLI is in the changed packages)

### New workflow: develop branch auto-publish
- On push to `develop`: detect version changes → publish changed packages with `--tag alpha`
- On push to `main`: detect version changes → publish changed packages with `--tag latest`

### Other workflow updates
- `cli-pr.yml`: update package references
- `cli-nightly.yml`: update package references
- `prompt-tests.yml`: update if it references @hai3

## Task
1. Read current publish-packages.yml
2. Update trigger branches to include `develop`
3. Update all `@hai3/` → `@cyberfabric/` in workflow files
4. Update workspace names in build commands
5. Add `generate-versions` step to CLI build in the publish workflow
6. Verify the layer ordering uses new package names

## Acceptance Criteria
- [ ] Publish workflow triggers on both `main` and `develop`
- [ ] Correct dist-tags: main → latest, develop → alpha
- [ ] Zero `@hai3/` references in workflow files
- [ ] CLI build includes generate-versions step
