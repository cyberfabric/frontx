# hai3dev:release - Release HAI3 Version

## AI WORKFLOW (REQUIRED)
1) Gather release info from user.
2) Update changelogs.
3) Publish and tag.

## GATHER REQUIREMENTS
Ask user for:
- Release version (e.g., 0.1.0-alpha.2 or 1.0.0)
- Release channel: alpha or stable
- Changes to include in changelog

## STEP 1: Ensure Clean State
```bash
git status
```
REQUIRED: Working tree must be clean.

## STEP 2: Run All Checks
```bash
npm run build:packages
npm run type-check
npm run lint
npm run arch:check
```
REQUIRED: All checks must pass.

## STEP 3: Update Package Versions
```bash
npm version {version} --workspaces
```

## STEP 4: Commit Version Bump
```bash
git add .
git commit -m "chore: release v{version}"
```

## STEP 5: Publish Packages
Use hai3dev:publish command steps.

## STEP 6: Create Git Tag
```bash
git tag v{version}
git push origin main --tags
```

## RULES
- REQUIRED: All checks pass before release.
- REQUIRED: Clean git state.
- REQUIRED: Tag after successful publish.
- FORBIDDEN: Force pushing to main.
