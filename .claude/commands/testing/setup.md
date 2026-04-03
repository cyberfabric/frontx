---
name: "Testing: Setup"
description: Check Node.js installation and install test dependencies (npm + Playwright)
category: Testing
tags: [testing, setup, nodejs, playwright, install]
---

# Test Environment Setup

Run the setup script to install all dependencies for the BDD test suite (TypeScript + Playwright + playwright-bdd).

## Script Location

Find the setup script based on your OS:

**Windows:**

1. `docs/testing-rules/setup_windows.mjs`
2. `testing-rules/setup_windows.mjs`

**macOS:**

1. `docs/testing-rules/setup_macos.mjs`
2. `testing-rules/setup_macos.mjs`

## Usage

```bash
# Windows
node testing-rules/setup_windows.mjs

# macOS
node testing-rules/setup_macos.mjs
```

The script handles:

- Node.js version check (18+ required)
- `npm install` in the `tests/` directory
- Playwright browser installation (chromium)

## Manual Setup (Alternative)

If the setup script is not available, run these commands:

```bash
# 1. Check Node.js version (must be 18+)
node --version

# 2. Install test dependencies
cd tests && npm install

# 3. Install Playwright browsers
cd tests && npx playwright install chromium
```

## After Setup

```bash
# Run smoke test to verify everything works
cd tests && npx playwright test e2e/smoke.spec.ts --project=chromium

# Run all BDD tests
cd tests && npx bddgen && npx playwright test --project=chromium
```

## Next Steps

After setup:

1. Run `/testing:scaffold` if test structure doesn't exist yet
2. Run `/testing:spec-to-tests` to generate tests from Cypilot FEATURE specs
3. Run `/testing:locators` to add qa-class to components
