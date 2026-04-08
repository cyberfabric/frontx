# Cypilot + BDD Testing Workflow Diagram

## Complete Flow: From FEATURE Spec to Tests

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. FEATURE SPEC EXISTS                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
              architecture/features/feature-{name}/FEATURE.md
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     2. FEATURE SPEC STRUCTURE                               │
│  architecture/features/feature-{name}/FEATURE.md                           │
│  ├── Section 2: Actor Flows (cpt-hai3-flow-* IDs)                          │
│  ├── Section 5: Definitions of Done (cpt-hai3-dod-* IDs)                   │
│  └── Section 6: Acceptance Criteria (testable bullets)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                          User approves / plans
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3. USER RUNS GENERATE                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        /cypilot-generate feature-{name}
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
      ┌──────────────────────────┐      ┌──────────────────────────┐
      │  PHASE 1: IMPLEMENTATION │      │   Read FEATURE.md        │
      │                          │      │   Extract requirements   │
      │  • Create components     │      │   Identify UI screens    │
      │  • Add routes            │      └──────────────────────────┘
      │  • Wire extensions       │
      │  • Add i18n              │
      └──────────────────────────┘
                    │
                    ▼
      ┌──────────────────────────┐
      │  UI CHANGE DETECTION     │
      │                          │
      │  Keywords found in spec: │
      │  • "screen"              │
      │  • "panel"               │
      │  • "component"           │
      │  • "button"              │
      │  • "menu"                │
      └──────────────────────────┘
                    │
                    ▼ (UI change detected)
      ┌──────────────────────────────────────────────────────────────┐
      │  PHASE 2: TEST GENERATION (AUTOMATIC)                        │
      │                                                               │
      │  Triggers: /testing:spec-to-tests                            │
      │  Input: architecture/features/feature-{name}/FEATURE.md      │
      └──────────────────────────────────────────────────────────────┘
                    │
      ┌─────────────┴─────────────┐
      │                           │
      ▼                           ▼
┌──────────────────┐    ┌──────────────────────────────┐
│ Read AI Test     │    │ Discover Screens             │
│ Generation Guide │    │                              │
│                  │    │ • src/mfe_packages/*/mfe.json│
│ • Feature files  │    │ • src/mfe_packages/*/src/    │
│ • Page objects   │    │   screens/**/*Screen.tsx     │
│ • Step defs      │    │ • Match to page objects      │
│ • Locators       │    └──────────────────────────────┘
└──────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     GENERATE TEST ARTIFACTS                                 │
│                                                                             │
│  1. Feature File                                                            │
│     src/mfe_packages/{mfeName}/tests/{feature}.feature                     │
│     ├─ @feature:{name}, @flow:{id}, @dod:{id} tags                        │
│     ├─ Gherkin scenarios                                                    │
│     └─ Traceability header (FEATURE path, date)                            │
│                                                                             │
│  2. Page Object Methods                                                     │
│     tests/ui/pages/{screen-id}-page.ts                                      │
│     └─ Actions only (click*, get*, fill*)                                   │
│                                                                             │
│  3. Step Definitions                                                        │
│     tests/steps/{section}.steps.ts                                          │
│     ├─ Given(): Setup preconditions                                         │
│     ├─ When(): Call page object methods                                     │
│     └─ Then(): Assertions + verification                                    │
│                                                                             │
│  4. Locators (if needed)                                                    │
│     tests/ui/locators.ts                                                    │
│     └─ Add PAGE_NAME export const object                                    │
│                                                                             │
│  5. Fixtures                                                                │
│     tests/fixtures/fixtures.ts                                              │
│     └─ Register new page objects via test.extend()                          │
│                                                                             │
│  6. Auto-generated test files (npx bddgen)                                  │
│     .features-gen/*.spec.ts                                                 │
│     └─ Auto-generated from feature files — DO NOT edit manually             │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: VALIDATION                                                        │
│                                                                             │
│  1. npm run type-check                                                      │
│  2. npm run dev                                                             │
│  3. npx bddgen && npx playwright test --project=chromium                   │
│                                                                             │
│  Result: All tests pass                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DONE                                                    │
│  Tests generated and passing                                                │
│  Ready for PR to develop                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Input/Output per Phase

### Phase 1: Implementation

**Input:**
- `architecture/features/feature-{name}/FEATURE.md`

**Output:**
- Source code changes (screens, components, i18n)

### Phase 2: Test Generation

**Input:**
- `architecture/features/feature-{name}/FEATURE.md` (Actor Flows, DoDs, ACs)
- `src/mfe_packages/*/mfe.json` (MFE package manifests)
- `src/mfe_packages/*/src/screens/**/*Screen.tsx` (screen components)
- `tests/ui/pages/` (existing page objects)
- `tests/ui/locators.ts` (existing locators)
- `tests/steps/*.steps.ts` (existing steps)

**Output:**
- `src/mfe_packages/{mfeName}/tests/*.feature` (feature files)
- `tests/ui/pages/{screen-id}-page.ts` (page object methods)
- `tests/steps/{section}.steps.ts` (step definitions)
- `tests/fixtures/fixtures.ts` (updated fixtures)
- `tests/ui/locators.ts` (locator constants)

### Phase 3: Validation

**Input:**
- All generated test artifacts
- Source code changes from Phase 1

**Output:**
- Type-check results
- Dev server status
- Playwright test results
