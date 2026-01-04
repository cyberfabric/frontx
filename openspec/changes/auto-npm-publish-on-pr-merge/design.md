# Design: Automatic NPM Publishing on PR Merge

## Context

### Current State

- HAI3 monorepo with 9 packages in `packages/` directory
- Manual publishing workflow documented but not automated
- Existing CI workflow (`main.yml`) runs validation and generates dependency graph
- Most packages have `publishConfig: { "access": "public" }` configured (requires verification)
- Packages follow layered architecture with clear dependency order

### Package Inventory

| Package | Layer | Dependencies | Current Version |
|---------|-------|--------------|-----------------|
| `@hai3/state` | L1 (SDK) | None | 0.2.0-alpha.0 |
| `@hai3/screensets` | L1 (SDK) | None | 0.2.0-alpha.0 |
| `@hai3/api` | L1 (SDK) | None | 0.2.0-alpha.0 |
| `@hai3/i18n` | L1 (SDK) | None | 0.2.0-alpha.0 |
| `@hai3/framework` | L2 | L1 packages | 0.2.0-alpha.1 |
| `@hai3/react` | L3 | @hai3/framework | 0.2.0-alpha.1 |
| `@hai3/uikit` | L4 (UI) | None (standalone) | 0.2.0-alpha.1 |
| `@hai3/studio` | L5 (Tools) | @hai3/react | 0.2.0-alpha.0 |
| `@hai3/cli` | L6 (CLI) | All (templates) | 0.2.0-alpha.8 |

## Goals / Non-Goals

### Goals

- Automate package publishing upon PR merge to main
- Ensure correct dependency-order publishing
- Prevent duplicate version conflicts with NPM registry
- Provide clear logging for debugging and auditing
- Integrate with existing CI infrastructure

### Non-Goals

- Version bump automation (developer responsibility)
- Changelog generation (separate tooling)
- Multi-registry publishing (NPM only)
- Canary/nightly releases (only on version bump)

## Decision: GitHub Actions Workflow with Sequential Publishing

### Approach

Create a new GitHub Actions workflow that:
1. Triggers on PR merge to main
2. Detects package version changes via git diff
3. Checks NPM registry for version existence
4. Builds packages in dependency order
5. Publishes each changed package sequentially

### Rationale

- **Sequential publishing**: Ensures dependency resolution; if L2 package publishes before L1, npm install would fail
- **Version diff detection**: Simple, reliable, no external tooling required
- **NPM registry check**: Idempotent behavior, safe to re-run
- **Single workflow file**: Easy to maintain and debug

### Alternatives Considered

#### Option A: Use Changesets

```yaml
# Would add changesets as dev dependency
# Requires contributors to create changeset files
```

- **Pros**: Industry standard, handles versioning + changelogs
- **Cons**: Additional contributor overhead, learning curve, overkill for current needs
- **Verdict**: Consider for future when team grows; too heavy for current workflow

#### Option B: Use Lerna

```yaml
# Lerna publish from-git
```

- **Pros**: Monorepo-native, handles ordering automatically
- **Cons**: Heavy dependency, deprecated in favor of Nx/Turborepo patterns
- **Verdict**: Rejected - unnecessary complexity

#### Option C: Custom Script (Chosen)

- **Pros**: Full control, minimal dependencies, matches HAI3 simplicity principles
- **Cons**: Requires maintenance, testing
- **Verdict**: Best fit for current project size and needs

## Technical Design

### Workflow File Structure

```
.github/
  workflows/
    main.yml              # Existing CI workflow
    publish-packages.yml  # New publish workflow (this proposal)
```

### Trigger Configuration

```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]
```

The workflow uses `pull_request.closed` with a condition check for `merged == true`. This is more reliable than `push` for tracking PR merges.

### Version Detection Logic

The workflow uses `fetch-depth: 0` (full history) and `git merge-base` to correctly detect version changes for both standard and squash-merged PRs:

```bash
# Find the correct base commit (works for standard and squash merges)
BASE_COMMIT=$(git merge-base HEAD origin/main~1 2>/dev/null || git rev-parse HEAD~1)

# Get changed files between merge commit and base
git diff "$BASE_COMMIT" --name-only | grep 'packages/.*/package.json'

# For each changed package.json, extract version diff
git diff "$BASE_COMMIT" -- packages/state/package.json | grep '"version"'
```

**Note**: Using `fetch-depth: 0` ensures full git history is available, which is required for `git merge-base` to correctly identify the common ancestor commit in squash-merge scenarios.

### NPM Registry Check

```bash
# Returns exit code 0 if version exists, non-zero if not found
npm view @hai3/state@0.2.0-alpha.1 version 2>/dev/null

# Check logic:
# - If version exists: skip publishing
# - If version not found: proceed with publish
```

### Publishing Order Implementation

The workflow defines explicit publishing phases:

```yaml
jobs:
  detect-changes:
    # Outputs: changed_packages (JSON array of package names with version changes)

  publish-sdk:
    # Publishes: @hai3/state, @hai3/screensets, @hai3/api, @hai3/i18n
    # Parallel within layer (no inter-dependencies)
    needs: [detect-changes]

  publish-framework:
    # Publishes: @hai3/framework
    needs: [publish-sdk]

  publish-react:
    # Publishes: @hai3/react
    needs: [publish-framework]

  publish-ui:
    # Publishes: @hai3/uikit
    # Can run parallel with SDK (no dependencies)
    needs: [detect-changes]

  publish-studio:
    # Publishes: @hai3/studio
    needs: [publish-react]

  publish-cli:
    # Publishes: @hai3/cli
    # Always last
    needs: [publish-sdk, publish-framework, publish-react, publish-ui, publish-studio]
```

### Complete Workflow Definition

```yaml
name: Publish Packages

on:
  pull_request:
    types: [closed]
    branches: [main]

permissions:
  contents: read

jobs:
  detect-changes:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.detect.outputs.packages }}
      has_changes: ${{ steps.detect.outputs.has_changes }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for squash-merge support

      - name: Detect version changes
        id: detect
        run: |
          PACKAGES=()

          # Find the merge base to handle both standard and squash merges
          # For squash merges, HEAD~1 may not be the correct base
          BASE_COMMIT=$(git merge-base HEAD origin/main~1 2>/dev/null || git rev-parse HEAD~1)
          echo "Comparing HEAD against base: $BASE_COMMIT"

          # Check each package for version changes
          for pkg_dir in packages/*/; do
            pkg_name=$(basename "$pkg_dir")
            pkg_json="$pkg_dir/package.json"

            if git diff "$BASE_COMMIT" --name-only | grep -q "$pkg_json"; then
              # Get old and new versions
              OLD_VERSION=$(git show "$BASE_COMMIT":"$pkg_json" 2>/dev/null | jq -r '.version' || echo "")
              NEW_VERSION=$(jq -r '.version' "$pkg_json")
              NPM_NAME=$(jq -r '.name' "$pkg_json")

              if [ "$OLD_VERSION" != "$NEW_VERSION" ] && [ -n "$NEW_VERSION" ]; then
                echo "Version change detected: $NPM_NAME $OLD_VERSION -> $NEW_VERSION"
                PACKAGES+=("{\"name\":\"$NPM_NAME\",\"dir\":\"$pkg_name\",\"version\":\"$NEW_VERSION\"}")
              fi
            fi
          done

          if [ ${#PACKAGES[@]} -eq 0 ]; then
            echo "No packages with version changes"
            echo "packages=[]" >> $GITHUB_OUTPUT
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            JSON_ARRAY=$(printf '%s\n' "${PACKAGES[@]}" | jq -s '.')
            echo "packages=$JSON_ARRAY" >> $GITHUB_OUTPUT
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

  publish:
    needs: detect-changes
    if: needs.detect-changes.outputs.has_changes == 'true'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '25.x'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build all packages
        run: npm run build:packages

      - name: Publish packages in order
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          PACKAGES='${{ needs.detect-changes.outputs.packages }}'

          # Retry function with exponential backoff
          publish_with_retry() {
            local max_attempts=3
            local attempt=1
            local delay=5

            while [ $attempt -le $max_attempts ]; do
              echo "Publish attempt $attempt of $max_attempts..."
              if npm publish --access public; then
                return 0
              fi

              if [ $attempt -lt $max_attempts ]; then
                echo "Attempt $attempt failed. Retrying in ${delay}s..."
                sleep $delay
                delay=$((delay * 2))  # Exponential backoff: 5s, 10s, 20s
              fi
              attempt=$((attempt + 1))
            done

            echo "All $max_attempts attempts failed"
            return 1
          }

          # Define publishing order (layers)
          declare -A LAYER_ORDER=(
            ["state"]=1
            ["screensets"]=1
            ["api"]=1
            ["i18n"]=1
            ["framework"]=2
            ["react"]=3
            ["uikit"]=1  # Standalone, can be early
            ["studio"]=4
            ["cli"]=5
          )

          # Sort packages by layer
          SORTED=$(echo "$PACKAGES" | jq -c 'sort_by(.dir |
            if . == "state" or . == "screensets" or . == "api" or . == "i18n" or . == "uikit" then 1
            elif . == "framework" then 2
            elif . == "react" then 3
            elif . == "studio" then 4
            else 5 end)')

          echo "Publishing order:"
          echo "$SORTED" | jq -r '.[] | "  - \(.name)@\(.version)"'

          # Publish each package
          for row in $(echo "$SORTED" | jq -r '.[] | @base64'); do
            _jq() {
              echo ${row} | base64 --decode | jq -r ${1}
            }

            NAME=$(_jq '.name')
            DIR=$(_jq '.dir')
            VERSION=$(_jq '.version')

            echo ""
            echo "=========================================="
            echo "Processing: $NAME@$VERSION"
            echo "=========================================="

            # Check if version already exists on NPM
            if npm view "$NAME@$VERSION" version 2>/dev/null; then
              echo "SKIPPING: $NAME@$VERSION already exists on NPM"
              continue
            fi

            echo "Publishing $NAME@$VERSION..."
            cd "packages/$DIR"

            if ! publish_with_retry; then
              echo "FAILED: $NAME@$VERSION publish failed after retries"
              exit 1
            fi

            echo "SUCCESS: Published $NAME@$VERSION"
            cd ../..
          done

          echo ""
          echo "=========================================="
          echo "All packages published successfully!"
          echo "=========================================="

  summary:
    needs: [detect-changes, publish]
    if: always()
    runs-on: ubuntu-latest

    steps:
      - name: Publish summary
        run: |
          if [ "${{ needs.detect-changes.outputs.has_changes }}" != "true" ]; then
            echo "## Publish Summary" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "No packages with version changes to publish." >> $GITHUB_STEP_SUMMARY
          elif [ "${{ needs.publish.result }}" == "success" ]; then
            echo "## Publish Summary" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "Successfully published packages:" >> $GITHUB_STEP_SUMMARY
            echo '${{ needs.detect-changes.outputs.packages }}' | jq -r '.[] | "- \(.name)@\(.version)"' >> $GITHUB_STEP_SUMMARY
          else
            echo "## Publish Summary" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "Publish failed. Check workflow logs for details." >> $GITHUB_STEP_SUMMARY
          fi
```

## Security Considerations

### NPM Token Management

- Token stored as GitHub Actions secret `NPM_TOKEN`
- Organization-level automation token recommended (bypasses 2FA)
- Token should have minimal scope: publish only, no read private
- Regular rotation recommended (annually)

### Workflow Permissions

The workflow uses minimal permissions at the workflow level for security best practice:

```yaml
permissions:
  contents: read  # Required for checkout and git operations
```

**Note**: `packages: write` would be added only if publishing to GitHub Packages in addition to NPM.

### Branch Protection

- Main branch should require PR reviews
- Only merged PRs trigger publish (not direct pushes)
- CI must pass before merge (existing `main.yml` workflow)

## Risks / Trade-offs

### Risk: Partial Publish Failure

- **Impact**: Some packages published, some not; version inconsistency
- **Mitigation**: Fail-fast behavior prevents further publishes
- **Recovery**: Fix issue, create new PR with version bump for failed packages

### Risk: NPM Outage During Publish

- **Impact**: Workflow fails mid-publish
- **Mitigation**:
  - Retry with exponential backoff (3 attempts: 5s, 10s, 20s delays)
  - NPM check before each publish ensures idempotent behavior on re-run
- **Recovery**: If all retries fail, wait for NPM recovery and re-run workflow

### Risk: Build Divergence

- **Impact**: Published package differs from source
- **Mitigation**: Fresh checkout, clean build in workflow
- **Recovery**: Publish new version with correct build

### Trade-off: Sequential vs Parallel Publishing

- **Sequential**: Slower but guarantees dependency order
- **Parallel**: Faster but risks dependency resolution failures
- **Decision**: Sequential for reliability; total time is acceptable (~3-5 min for all packages)

## Testing Strategy

### Local Testing

1. Run version detection script manually
2. Verify NPM check logic with existing/non-existing versions
3. Test build order with `npm run build:packages`

### Staging Testing

1. Create test packages with `-test` suffix
2. Publish to NPM with test versions
3. Verify all workflow steps

### Production Validation

1. First real publish: single package with minor version bump
2. Monitor NPM for correct publication
3. Verify package works when installed

## Monitoring and Debugging

### Workflow Logs

- Each step outputs clear status messages
- Package list shown before publishing
- Success/skip/fail status for each package

### GitHub Actions Summary

- Summary job creates markdown summary
- Visible on PR merge and Actions tab
- Lists all published packages or failure status

### Rollback Procedure

NPM does not support true rollback, but:
1. Deprecate bad version: `npm deprecate @hai3/pkg@version "Broken, use X instead"`
2. Publish fixed version with incremented version number
3. Update dependents to use fixed version

## Open Questions

1. **Should we add Slack/Discord notifications?**
   - Currently: No, keep minimal
   - Future: Add when team grows, as separate PR

2. **Should we add NPM provenance?**
   - Currently: No, requires additional setup
   - Future: Yes, for supply chain security (GitHub Actions supports this)

3. **Should UI package (`@hai3/uikit`) publish in parallel with SDK?**
   - Currently: Yes, it has no @hai3 dependencies
   - Note: This is safe and speeds up overall publish time
