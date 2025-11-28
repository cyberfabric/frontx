<!-- @standalone -->
# hai3:new-component - Add New UI Component

## AI WORKFLOW (REQUIRED)
1) Gather requirements from user.
2) Determine component type.
3) Follow appropriate workflow below.

## GATHER REQUIREMENTS
Ask user for:
- Component name (e.g., "DataTable", "ColorPicker").
- Component type: base (from shadcn) | composite | screenset-specific.
- Component description and props.

## IF BASE COMPONENT (SHADCN)
```bash
npx shadcn add {component}
```
Component will be added to packages/uikit/src/base/. No further changes needed.

## IF COMPOSITE COMPONENT
Not available in standalone projects. Composite components are part of @hai3/uikit package.

## IF SCREENSET-SPECIFIC COMPONENT
### STEP 1: Create Component
File: src/screensets/{screenset}/uikit/{ComponentName}.tsx
- Follow same rules as composite components.
- Must be reusable within the screenset.
- NO @hai3/uicore imports or hooks.
- NO Redux or state management.
- Accept value/onChange pattern for state.
- Use theme tokens for styling.

### STEP 2: Export
Export from local index if needed.

## VALIDATION
```bash
npm run arch:check
npm run dev
```
Test component in UI.

## RULES
- NO Redux, NO business logic, NO side effects in components.
- Accept value/onChange pattern for state.
- Use theme tokens for styling.
- Manual styling is FORBIDDEN; use @hai3/uikit components only.
