# Phase 9: Validation — Build, Type-check, Lint, Verify Zero hai3 References

## What
Comprehensive validation that all renames are complete and the codebase builds correctly.

## Task

### Step 1: Regenerate package-lock.json
```bash
rm -rf node_modules package-lock.json
npm install --ignore-scripts
```
This regenerates the lock file with all `@cyberfabric/` package names.

### Step 2: Grep audit — zero hai3 references
```bash
# Find ALL remaining @hai3/ references (should be zero outside GTS identifiers)
grep -rn "@hai3/" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" \
  --include="*.json" --include="*.md" --include="*.yaml" --include="*.yml" --include="*.cjs" \
  --include="*.mdc" --include="*.toml" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=templates . \
  | grep -v "gts\.hai3\.\|hai3\.screensets\.\|hai3\.mfes\.\|hai3\.demo\." \
  | head -50

# Find remaining "hai3" in filenames (should be zero outside GTS dirs)
find . -name "*hai3*" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" \
  -not -path "*/templates/*" | grep -v "gts/hai3\."

# Check package-lock.json is clean
grep -c "@hai3/" package-lock.json  # should be 0
```

### Step 3: Build all packages
```bash
npm run build:packages
```

### Step 4: Type-check all packages
```bash
npm run type-check:packages
```

### Step 5: Lint
```bash
npm run lint
```

### Step 6: Verify CLI scaffolding works
```bash
cd /tmp
node <path-to-cli>/dist/index.js create test-validation --uikit hai3 --studio
# Check generated package.json has @cyberfabric/cli and correct versions
# Check .npmrc and .nvmrc are present
# Check AI workflows use frontx- prefix
# Check frontx.config.json exists (not hai3.config.json)
# Check no hai3 CLI command references in .ai/ workflows
```

### Step 7: Verify Cypilot config
```bash
cpt --json info  # system name should show "FrontX Dev Kit"
```

### Step 8: Write validation report
Write results to `out/phase-09-validation-report.md`:
- Lock file regeneration: PASS/FAIL
- Grep audit: PASS/FAIL (count of remaining references)
- Filename audit: PASS/FAIL
- Build: PASS/FAIL
- Type-check: PASS/FAIL
- Lint: PASS/FAIL
- CLI scaffold: PASS/FAIL
- Cypilot config: PASS/FAIL

## Acceptance Criteria
- [ ] package-lock.json regenerated with zero @hai3/ references
- [ ] Zero `@hai3/` references outside GTS identifiers
- [ ] Zero `hai3` in filenames outside GTS directories
- [ ] All packages build successfully
- [ ] Type-check passes
- [ ] Lint passes
- [ ] CLI scaffolds a working project with @cyberfabric deps
- [ ] Cypilot config shows "FrontX Dev Kit"
