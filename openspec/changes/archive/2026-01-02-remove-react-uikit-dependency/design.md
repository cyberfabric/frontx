# Design: Clean @hai3/react Layer Dependencies

## Context

The `@hai3/react` package (L3) has layer architecture violations and the L4 application code has overdesigned registry patterns that must be eliminated.

### Problem 1: SDK Layer Violations (Phases 1-2, Completed)

1. **uikitRegistry.ts** - A singleton registry that imports from `@hai3/uikit`
2. **TextLoader.tsx** - A component using uikitRegistry
3. **peerDependency** on `@hai3/uikit` and `@hai3/i18n`

### Problem 2: L4 Registry Pattern Overdesign (Phase 4)

The initial implementation incorrectly relocated the registry pattern to L4:
- `src/app/uikit/createUikitRegistry.tsx` - Factory function
- `src/app/uikit/uikitRegistry.tsx` - Registry singleton with registerIcons/getIcon
- Screensets call `registerIcons()` to register menu icons
- Menu.tsx uses `uikitRegistry.getIcon()` to render icons

**Why this is wrong**:
1. Registry pattern adds runtime indirection without benefit
2. Storing React components in Redux causes serialization warnings
3. Modern React apps use direct imports - simpler and type-safe
4. Iconify provides a standard solution for icon rendering

## Architectural Evolution

The uikitRegistry was created when `@hai3/uicore` was the main rendering layer. That architecture is now obsolete. With CLI scaffolding:

1. `@hai3/uicore` is deprecated
2. Rendering happens in L4 (user's project)
3. SDK packages should NOT know about UI components
4. Users choose their own UI kit and integrate directly

## Goals

### Phase 1-2 (Completed)
- DELETE uikitRegistry from `@hai3/react`
- MOVE TextLoader to CLI templates
- REMOVE `@hai3/uikit` and `@hai3/i18n` dependencies
- Fix i18n imports to use `@hai3/framework`

### Phase 4 (New)
- DELETE registry factory and pattern from L4
- REFACTOR Menu.tsx to use Iconify for menu icons
- KEEP MenuItem.icon as string type (Iconify icon ID)
- ELIMINATE store serialization warnings

### Phase 5 (New)
- UPDATE AI guidelines to document no-registry pattern

## Non-Goals

- Providing migration utilities (alpha stage)
- Maintaining backward compatibility
- Changing MenuItem.icon to React.ComponentType (breaks serialization)

## Decisions

### Decision 1: Use Iconify for Menu Icons

**What**: Menu item icons use Iconify string IDs rendered via `<Icon icon={...} />`.

**Why**:
- Iconify is already a project dependency
- String IDs are serializable (no store serialization warnings)
- Huge icon library available (lucide, mdi, etc.)
- Standard React pattern - no custom abstraction needed

**Implementation**:
```tsx
// In screenset config:
menuItem: { icon: "lucide:home", ... }

// In Menu.tsx:
import { Icon } from '@iconify/react';
<Icon icon={item.icon} className="w-4 h-4" />
```

### Decision 2: Change MenuItem.icon from React.ComponentType to string

**What**: The `MenuItem.icon` type in `@hai3/framework` changes from `React.ComponentType<{ className?: string }>` to `string | undefined`.

**Current state** (packages/framework/src/layoutTypes.ts line 66):
```typescript
icon?: React.ComponentType<{ className?: string }>
```

**Target state**:
```typescript
icon?: string
```

**Why this change is needed**:
- Current: React components are NOT serializable - causes store serialization warnings
- Target: Iconify string IDs ARE serializable - no warnings
- Keeps menu config simple and portable

**Impact on Menu.tsx**:
- Current: `<item.icon className="w-4 h-4" />` (renders React component)
- Target: `<Icon icon={item.icon} className="w-4 h-4" />` (renders via Iconify)

### Decision 3: App Logos as Direct Imports

**What**: App logo icons (HAI3LogoIcon, HAI3LogoTextIcon) imported directly where used.

**Why**:
- These are custom SVG components, not Iconify icons
- Direct imports are simpler than any registry lookup
- Type-safe and tree-shakeable

**Implementation**:
```tsx
// In Menu.tsx:
import { HAI3LogoIcon } from '@/app/icons/HAI3LogoIcon';
<HAI3LogoIcon className="w-8 h-8" />
```

### Decision 4: Delete Registry Pattern Entirely

**What**: Remove all registry code from L4, not relocate it.

**Why**:
- Registry adds complexity without benefit
- Modern React uses direct imports
- Iconify provides icon management
- No need for runtime registration

**Files affected**:
- DELETE: `src/app/uikit/createUikitRegistry.tsx`
- REFACTOR: `src/app/uikit/uikitRegistry.tsx` (keep only @hai3/uikit re-exports)
- REFACTOR: `src/app/layout/Menu.tsx` (use Iconify)
- REFACTOR: screensets (remove registerIcons calls)

### Decision 5: No Deprecation Period

**What**: Breaking changes applied immediately.

**Why**: Alpha stage software - breaking changes expected.

## Data Flow

### Current Architecture (problematic)
```
screenset config: { menu: [{ menuItem: { icon: WorldIcon, ... }}] }  <- React.ComponentType
                    |
                    v
Redux layout/menu.items  <- stores React components (non-serializable!)
                    |
                    v
Menu.tsx: useAppSelector(state => state['layout/menu'].items)
                    |
                    v
<item.icon className="..." /> -> renders React component

PROBLEM: React components in Redux state cause serialization warnings
```

### Target Architecture (string icons, store access unchanged)
```
screenset config: { menu: [{ menuItem: { icon: "lucide:home", ... }}] }  <- string!
                    |
                    v
Redux layout/menu.items  <- stores strings (serializable, no warnings)
                    |
                    v
Menu.tsx: useAppSelector(state => state['layout/menu'].items)
                    |
                    v
<Icon icon={item.icon} /> -> Iconify renders icon from string ID
```

**Key insight**:
- The store access path is UNCHANGED - menu items belong in HAI3 store as data
- The only change is MenuItem.icon type: string instead of React.ComponentType
- Strings are serializable - no store serialization warnings
- No menuSlice refactoring needed, no architectural change to data flow

## Implementation Plan

### Phase 4: Remove L4 Registry Pattern

#### Step 4.1: Delete Registry Factory
- DELETE `src/app/uikit/createUikitRegistry.tsx`

#### Step 4.2: Refactor uikitRegistry.tsx
- Remove all registry methods (registerIcons, getIcon, etc.)
- Keep only direct @hai3/uikit re-exports
- Export app logo icons directly

Result:
```tsx
// Direct re-exports only
export { Button, Skeleton, Sidebar, ... } from '@hai3/uikit';
export { HAI3LogoIcon } from '../icons/HAI3LogoIcon';
export { HAI3LogoTextIcon } from '../icons/HAI3LogoTextIcon';
```

#### Step 4.3: Refactor Menu.tsx
- Remove uikitRegistry imports
- Import app logos from `@/app/icons/`
- Use Iconify `<Icon icon={item.icon} />` for menu item icons
- Store access unchanged - continue reading menu items via useAppSelector
- Only change is rendering: `<Icon icon={...} />` instead of `<item.icon />`

#### Step 4.4: Refactor Screensets
- Remove `registerIcons()` calls
- Use Iconify string IDs in menu config

Before:
```tsx
uikitRegistry.registerIcons({ WORLD_ICON_ID: WorldIcon });
menu: [{ menuItem: { icon: WORLD_ICON_ID, ... }}]
```

After:
```tsx
menu: [{ menuItem: { icon: "lucide:globe", ... }}]
```

#### Step 4.5: Update main.tsx
- Remove uikitRegistry side-effect import

### Phase 5: AI Documentation Updates

Update AI guidelines following .ai/targets/AI.md rules:

#### Step 5.1: Update REACT.md
- Remove uikitRegistry references
- Note that @hai3/react has no uikit dependency

#### Step 5.2: Update UIKIT.md
- Clarify direct imports only, no registry

#### Step 5.3: Update SCREENSETS.md
- Update ICON RULES section
- Menu icons use Iconify string IDs
- No registerIcons calls

#### Step 5.4: Update LAYOUT.md
- Document Menu.tsx uses Iconify for icons
- App logos imported directly

## Risks / Trade-offs

### Risk: Iconify Bundle Size
- **Risk**: Iconify loads icons dynamically, may affect bundle
- **Mitigation**: Iconify is already used in project, minimal change
- **Impact**: Low - icons load on demand

### Risk: Breaking Existing Code
- **Risk**: Any code using registerIcons() will break
- **Mitigation**: Alpha stage, breaking changes expected
- **Impact**: Low - registry was internal implementation detail

### Risk: AI Guidelines Out of Sync
- **Risk**: AI assistants may suggest old registry pattern
- **Mitigation**: Phase 5 updates all AI guidelines
- **Impact**: Medium - requires documentation updates

## Open Questions

1. **Q**: What Iconify icon sets should be documented?
   **A**: lucide is the primary set, matches existing icon style.

2. **Q**: Should we keep uikitRegistry.tsx at all?
   **A**: Yes, but as simple barrel export for @hai3/uikit components - no registry logic.

3. **Q**: Where should MenuItem type definition live?
   **A**: Stays in `@hai3/framework/layoutTypes.ts`, icon remains type `string`.
