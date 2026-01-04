## 0. Pre-requisites

Ensure package configuration is correct before implementing the workflow.

- [ ] 0.1 Verify all packages have `publishConfig.access: public` in package.json
  - Traces to: REQ-6 (Public Access)
  - Check: `@hai3/state`, `@hai3/screensets`, `@hai3/api`, `@hai3/i18n`, `@hai3/framework`, `@hai3/react`, `@hai3/uikit`, `@hai3/studio`, `@hai3/cli`
- [ ] 0.2 Add missing `publishConfig.access: public` to any packages that lack it
  - Traces to: REQ-6 (Public Access)
  - Note: Even though `--access public` is used in workflow, having it in package.json ensures consistency for manual publishes

## 1. Create Publish Workflow

Create the GitHub Actions workflow file for automatic publishing.

- [ ] 1.1 Create `.github/workflows/publish-packages.yml` with PR merge trigger
  - Traces to: REQ-1 (Trigger Condition)
- [ ] 1.2 Add explicit `permissions: contents: read` at workflow level
  - Traces to: REQ-9 (Security Best Practices)
- [ ] 1.3 Add version change detection job with git diff logic
  - Traces to: REQ-2 (Version Change Detection)
  - Note: Use `fetch-depth: 0` and `git merge-base` for squash-merge support
- [ ] 1.4 Add NPM registry existence check before each publish
  - Traces to: REQ-3 (NPM Registry Check)
- [ ] 1.5 Implement layer-based publishing order (L1 -> L2 -> L3 -> L4 -> L5 -> L6)
  - Traces to: REQ-4 (Publishing Order)
- [ ] 1.6 Configure NPM_TOKEN authentication from GitHub secrets
  - Traces to: REQ-5 (Authentication)
- [ ] 1.7 Add `--access public` flag to all publish commands
  - Traces to: REQ-6 (Public Access)
- [ ] 1.8 Implement retry with exponential backoff for npm publish (3 attempts: 5s, 10s, 20s)
  - Traces to: REQ-10 (Retry Logic)
- [ ] 1.9 Implement fail-fast behavior on publish errors (after retries exhausted)
  - Traces to: REQ-7 (Failure Handling)
- [ ] 1.10 Add comprehensive logging for each step
  - Traces to: REQ-8 (Clear Logging)

## 2. Add Workflow Summary

Add GitHub Actions summary for visibility.

- [ ] 2.1 Create summary job that runs on workflow completion
  - Traces to: REQ-8 (Clear Logging)
- [ ] 2.2 Display list of published packages in summary
  - Traces to: REQ-8 (Clear Logging)
- [ ] 2.3 Display skipped packages with reasons in summary
  - Traces to: REQ-8 (Clear Logging), Scenario 3

## 3. Documentation

Document the automated publishing process.

- [ ] 3.1 Add publishing section to repository README or CONTRIBUTING.md
  - Traces to: AC-6 (Logging Clarity)
- [ ] 3.2 Document NPM_TOKEN secret setup requirements
  - Traces to: REQ-5 (Authentication), EC-3

## 4. Verification

Verify the workflow meets all acceptance criteria.

- [ ] 4.1 Test version detection with single package version bump
  - Traces to: AC-1, Scenario 1
- [ ] 4.2 Test version detection with multi-package version bump
  - Traces to: AC-1, Scenario 2
- [ ] 4.3 Test NPM existence check with already-published version
  - Traces to: AC-2, Scenario 3
- [ ] 4.4 Test NPM existence check with new version
  - Traces to: AC-2, Scenario 1
- [ ] 4.5 Verify publishing order in workflow logs
  - Traces to: AC-3, REQ-4
- [ ] 4.6 Test with no version changes (should skip gracefully)
  - Traces to: Scenario 4
- [ ] 4.7 Verify workflow summary output clarity
  - Traces to: AC-6
- [ ] 4.8 Verify retry logic implementation in workflow YAML
  - Traces to: AC-7, REQ-10, Scenario 7

## Summary

**Total:** 23 tasks
**Completed:** 0/23 (0%)
