<!-- @standalone -->
# UI Kit Guidelines

## AI WORKFLOW (REQUIRED)
1) Summarize 3-6 rules from this file before proposing changes.
2) STOP if you add Redux or business logic, create custom base components, or bypass contracts.

## SCOPE
- All code under packages/uikit/**.
- UI Kit is presentational only; no state management, no business logic.
- All types and contracts are defined within @hai3/uikit itself.

## CRITICAL RULES
- Base components come from shadcn; composites are built from base components.
- No custom base components; if missing, generate via "npx shadcn add <component>".
- All component types, props, and IDs must follow UiKitComponent enum and contract types.
- Icons live in icons/ and are exported as React components (tree-shakeable); direct imports only.
- FORBIDDEN: Registry patterns, runtime registration, or icon lookups.
- Loading states must use Skeleton from base; no custom animated div skeletons.

## STOP CONDITIONS
- Adding Redux, effects, slice logic, or app-level state.
- Implementing a component that does not match the contract type.
- Writing manual skeletons instead of Skeleton.

## FILE STRUCTURE RULES
- Base components: packages/uikit/src/base/**.
- Composites: packages/uikit/src/composite/**.
- Icons: packages/uikit/src/icons/**.
- Theme utilities: packages/uikit/src/theme/**.

## COMPOSITE RULES
- Composites accept value, onChange, and props; no side effects.
- Composites must be reusable across screensets; screenset-only components stay in the screenset, not UI Kit.

## PRE-DIFF CHECKLIST
- [ ] Base or composite placement is correct.
- [ ] Component props and types match @hai3/uikit contracts.
- [ ] No Redux, effects, or business logic added.
- [ ] Icons exported from icons/, no string literal IDs.
- [ ] Skeleton used for loading states where needed.
