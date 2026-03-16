# hai3dev:publish - Publish HAI3 Packages

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/CLI.md before starting.
2) Verify all checks pass.
3) Follow steps below.

## PRE-PUBLISH CHECKLIST
```bash
npm run build:packages
npm run type-check
npm run lint
npm run arch:check
```
REQUIRED: All checks must pass.

## STEP 1: Build All Packages
```bash
npm run build:packages
```
Build order: uikit-contracts -> uikit -> uicore -> studio -> cli

## STEP 2: Run Validation
```bash
npm run type-check && npm run lint && npm run arch:check
```

## STEP 3: Bump Versions
```bash
npm version prerelease --preid=alpha --workspaces
```
Or specific version: npm version 0.1.0-alpha.1 -w packages/uikit

## STEP 4: Publish with Alpha Tag
```bash
cd packages/uikit-contracts && npm publish --tag alpha
cd ../uikit && npm publish --tag alpha
cd ../uicore && npm publish --tag alpha
cd ../studio && npm publish --tag alpha
cd ../cli && npm publish --tag alpha
```

## RULES
- REQUIRED: Use --tag alpha to prevent tagging as latest.
- REQUIRED: Publish in dependency order.
- REQUIRED: Version all packages together for consistency.
- FORBIDDEN: Publishing without passing all checks.
