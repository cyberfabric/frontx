---
name: "Testing: Locators"
description: Scan components and add/update qa-class attributes for test locators
category: Testing
tags: [testing, locators, qa-class]
---

# Locator Generation and qa-class Management

Scan React components, verify existing `qa-class` coverage, add missing ones, and update `locators.ts`.

## Guardrails

- **AUDIT FIRST** — never blind-add qa-class, always check what exists
- NEVER add qa-class if the element already has one
- Priority: qa-class > data-testid > exact classes > text content
- Always use XPath syntax, NEVER CSS selectors
- Search existing locators before creating new ones

## Testing Rules

Read locator rules from (use first found):

1. `docs/testing-rules/test_cases_creation_rules/locator-generation.md`
2. `testing-rules/test_cases_creation_rules/locator-generation.md`

## Component Discovery

Discover ALL interactive components from the source code:

1. **MFE package screen components:**
   - Read `src/mfe_packages/*/mfe.json` to get MFE package names and screen routes
   - Glob `src/mfe_packages/*/src/screens/**/*Screen.tsx` to find screen components
   - Find composite components: `src/mfe_packages/*/src/components/**/*.tsx`
2. **Layout components:**
   - Glob `src/app/layout/**/*.tsx` to find layout components (Menu, Header, etc.)
3. **Shared app components:**
   - Glob `src/app/components/**/*.tsx` to find shared UI components
4. **Package UI components (if applicable):**
   - Glob `packages/studio/src/**/*.tsx` to find Studio panel components
   - Glob `packages/react/src/**/*.tsx` to find shared React components

## Steps

Track these as TODOs and complete one by one:

### 1. Identify Target Components

Based on user request, discover which components need locators:

- **MFE screen components:**
  - Screen components: `src/mfe_packages/{mfeName}/src/screens/{screenId}/*.tsx`
  - Screen sub-components: `src/mfe_packages/{mfeName}/src/screens/{screenId}/components/*.tsx`
  - Composite UI components: `src/mfe_packages/{mfeName}/src/components/**/*.tsx`
- **Layout components:**
  - Menu, Header, Sidebar: `src/app/layout/**/*.tsx`
- **App-level components:**
  - Shared UI: `src/app/components/**/*.tsx`
- **Package components (Studio, etc.):**
  - Studio panel: `packages/studio/src/**/*.tsx`

**IMPORTANT:** Scan ALL component types above, not just MFE screen components.

### 2. Audit Existing qa-class Coverage

For each target component, **search for existing qa-class attributes first**:

```bash
grep -n "qa-" src/mfe_packages/{mfeName}/src/screens/{screenId}/SomeComponent.tsx
```

Also check `locators.ts` for existing locators pointing to this component:

```bash
grep -n "{component}" tests/ui/locators.ts
```

**Report the audit result** before making any changes:

- Which elements already have qa-class — **SKIP these**
- Which interactive elements are missing qa-class — **ADD these**
- Which locators already exist in locators.ts — **SKIP these**

### 3. Add qa-class ONLY to Uncovered Elements

For each interactive element **without** qa-class, add one.

**Pattern:**

```text
qa-{component}-{element}-{purpose}
```

**Already has qa-class — SKIP, do not modify:**

```tsx
<Button className="qa-composer-send-button" onClick={handleSend}>
```

**No qa-class — ADD:**

```tsx
// Before
<Textarea placeholder="Ask anything" />

// After
<Textarea className="qa-composer-message-input" placeholder="Ask anything" />
```

**Has className but no qa-class — PREPEND:**

```tsx
// Before
<Button className="rounded-full h-8 w-8" onClick={handleSend}>

// After
<Button className="qa-composer-send-button rounded-full h-8 w-8" onClick={handleSend}>
```

### 4. Update locators.ts

Add **only new** locators for the qa-classes added in step 3. Do not duplicate existing ones.

```typescript
export const CHAT_COMPOSER = {
  /** Message input - qa-class from ChatComposer.tsx */
  MESSAGE_INPUT: "//textarea[contains(@class, 'qa-composer-message-input')]",

  /** Send button - qa-class from ChatComposer.tsx */
  SEND_BUTTON: "//button[contains(@class, 'qa-composer-send-button')]",
} as const;
```

### 5. Summary Report

Output a summary:

- Components scanned
- qa-classes already present (skipped)
- qa-classes added (new)
- Locators added to locators.ts

## CRITICAL Rules

- **NEVER** overwrite or duplicate existing qa-class attributes
- **NEVER** use generic elements like `//generic[...]`
- **ALWAYS** use real HTML elements: `button`, `div`, `input`, `textarea`, `span`
- **ALWAYS** search `locators.ts` for existing locators before adding new ones
- **ALWAYS** audit first, then modify

## Reference

- `{rules_dir}/locator-generation.md` - Full locator rules
- `tests/ui/locators.ts` - Existing locators
