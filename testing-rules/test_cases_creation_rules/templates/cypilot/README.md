# Cypilot Integration Template

This directory contains the template for integrating BDD test framework with Cypilot workflow using a **hook pattern**.

## Template

### `TESTING.md.template`
Bridge documentation AND hook file for Cypilot test integration.

**Created at:** `architecture/TESTING.md`

**Purpose:**
- Documents Cypilot FEATURE → BDD workflow
- Shows mapping: FEATURE sections → Feature files → Tests
- Includes testing phase template for E2E tasks
- **Acts as a hook file** — when this file exists, `/cypilot-generate` automatically enables test generation

**When created:** By `/testing:scaffold` if `architecture/features/` directory exists

---

## Hook Pattern Architecture

Instead of creating separate command files, we use a **hook pattern** where `architecture/TESTING.md` acts as both documentation and activation flag.

```
/testing:scaffold
  ↓
  Detects architecture/features/ exists
  ↓
  Creates architecture/TESTING.md ← HOOK FILE
  ↓
/cypilot-generate
  ↓
  Checks: Does architecture/TESTING.md exist?
  ↓
  YES → Test generation enabled (runs after implementation)
  NO  → Standard generate workflow
```

---

## Integration Flow

```
User runs: /testing:scaffold

1. Creates tests/ structure (playwright.config.ts, pages, steps, fixtures)
2. Discovers screens from src/mfe_packages/
3. Checks if architecture/features/ exists
4. IF architecture/features/ exists:
   └─ Copy TESTING.md.template → architecture/TESTING.md (HOOK ACTIVATED)
5. Output success message

User runs: /cypilot-generate feature-studio-devtools

1. Read FEATURE.md
2. Implement feature
3. Check: Does architecture/TESTING.md exist?
4. IF YES (hook is active):
   ├─ Check FEATURE.md for UI keywords
   ├─ Run /testing:spec-to-tests automatically
   ├─ Generate all test artifacts
   └─ Mark testing phase complete
5. Final validation (type-check, dev, npx playwright test)
```

---

## File Structure

```
.claude/commands/testing/
├── scaffold.md                       # Creates test framework + hook
├── spec-to-tests.md                  # Generates tests from FEATURE specs
├── locators.md                       # Adds qa-class to components
├── coverage.md                       # Shows test coverage vs FEATURE specs
└── setup.md                          # Installs dependencies

architecture/
├── features/*/FEATURE.md             # Cypilot FEATURE specifications
└── TESTING.md                        # Hook file (created by scaffold)

testing-rules/test_cases_creation_rules/templates/cypilot/
├── TESTING.md.template               # Template for hook file
└── README.md                         # This file
```

---

## Maintenance

When updating the template:
1. Update `TESTING.md.template` in this directory
2. Re-run `/testing:scaffold` in existing projects OR manually update `architecture/TESTING.md`
3. Document changes in this README
