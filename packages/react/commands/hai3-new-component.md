<!-- @standalone -->
# hai3:new-component - Add New UI Component

## AI WORKFLOW (REQUIRED)
1) Check if @hai3/uikit has equivalent component first.
2) Gather requirements from user.
3) Determine type: screenset composite (default) | screenset base (rare).
4) Implement.

## CHECK GLOBAL UIKIT FIRST
- REQUIRED: Before creating screenset component, verify @hai3/uikit lacks equivalent.
- REQUIRED: Import from @hai3/uikit if component exists there.

## GATHER REQUIREMENTS
Ask user for:
- Component name (e.g., "DataTable", "ColorPicker").
- Component type: screenset composite (default) | screenset base (rare).
- Component description and props.
- If screenset base: justification why composite is insufficient.

## IF SCREENSET COMPONENT

### STEP 0: Determine Subfolder
- uikit/composite/: Screenset-specific composites (theme tokens only).
- uikit/base/: Rare primitives needing inline styles (needs strong justification).

### STEP 1: Implementation

#### 1.1 Create Component
File: src/screensets/{screenset}/uikit/{base|composite}/{ComponentName}.tsx
- composite/: Use theme tokens only (no inline styles).
- base/: May use inline styles (rare, needs justification).
- Must be reusable within the screenset.
- NO @hai3/uicore imports (except types).
- NO Redux or state management.
- Accept value/onChange pattern for state.

#### 1.2 Export
Export from local index if needed.

#### 1.3 Validation
Run: npm run arch:check && npm run dev
Test component in UI.

## RULES
- REQUIRED: Check @hai3/uikit first; screenset uikit only if missing.
- REQUIRED: Screenset base components need strong justification.
- FORBIDDEN: Redux, business logic, side effects in components.
- FORBIDDEN: Inline styles outside uikit/base/.
- REQUIRED: Accept value/onChange pattern for state.
