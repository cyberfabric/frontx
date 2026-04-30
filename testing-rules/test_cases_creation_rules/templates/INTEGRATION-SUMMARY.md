# Cypilot + BDD Testing Integration - Summary

This document summarizes the integration between Cypilot FEATURE workflow and BDD test framework using **Hook Pattern**.

## Architecture: Hook Pattern

Instead of separate command files, we use a **hook pattern** where `architecture/TESTING.md` acts as both documentation and activation flag.

```
┌─────────────────────────────────────────────────┐
│  /cypilot-generate feature-{name}               │
│  1. Read FEATURE.md                             │
│  2. Implement feature                           │
│  3. Check: Does architecture/TESTING.md exist?  │
│     ├── YES → Run /testing:spec-to-tests        │
│     └── NO  → Skip test generation              │
└─────────────────────────────────────────────────┘
                          │
                          │ checks for
                          ▼
┌─────────────────────────────────────────────────┐
│  architecture/TESTING.md                        │
│  (Hook file + Documentation)                    │
│                                                 │
│  • Documents Cypilot → BDD workflow             │
│  • When this file exists → Test generation on   │
│  • Created by /testing:scaffold                 │
└─────────────────────────────────────────────────┘
```

---

## File Structure After Integration

```
project-root/
├── architecture/
│   ├── features/
│   │   ├── feature-studio-devtools/FEATURE.md
│   │   ├── feature-react-bindings/FEATURE.md
│   │   └── ...
│   └── TESTING.md                   # ← Hook file (created by scaffold)
│
├── .claude/commands/testing/
│   ├── scaffold.md                  # ← Creates framework + hook
│   ├── spec-to-tests.md             # ← FEATURE → BDD tests
│   ├── locators.md                  # ← qa-class management
│   ├── coverage.md                  # ← FEATURE coverage report
│   └── setup.md                     # ← Install dependencies
│
├── testing-rules/test_cases_creation_rules/templates/
│   ├── base-page.ts
│   ├── fixtures.ts
│   ├── locators.ts
│   ├── playwright.config.ts
│   ├── smoke.spec.ts
│   ├── package.json
│   └── cypilot/
│       ├── TESTING.md.template      # Template for hook file
│       └── README.md                # Hook pattern docs
│
├── tests/
│   ├── playwright.config.ts
│   ├── package.json
│   ├── ui/
│   │   ├── base-page.ts
│   │   ├── locators.ts
│   │   └── pages/{page}-page.ts
│   ├── steps/
│   │   └── {section}.steps.ts
│   ├── fixtures/
│   │   └── fixtures.ts
│   └── e2e/
│       └── smoke.spec.ts
│
└── src/mfe_packages/
    └── {mfeName}/tests/*.feature    # BDD feature files (co-located)
```

---

## References

- Cypilot FEATURE specs: `architecture/features/*/FEATURE.md`
- Testing skills: `.claude/commands/testing/`
- Testing rules: `testing-rules/`
- Templates: `testing-rules/test_cases_creation_rules/templates/`
