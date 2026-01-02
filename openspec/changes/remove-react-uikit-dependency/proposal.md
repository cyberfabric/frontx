# Change: Clean @hai3/react Layer Dependencies

## Why

The `@hai3/react` package (L3) has layer architecture violations that need to be cleaned up:

### Violation 1: @hai3/uikit dependency

The package has a peerDependency on `@hai3/uikit` and contains a `uikitRegistry` module. Both are obsolete artifacts from the old architecture where SDK packages handled rendering.

**Key architectural insight**: Since `@hai3/uicore` is deprecated and rendering has moved to L4 (user's project via CLI scaffolding), there is no longer any need for:

1. A uikit registry in the SDK layer - component registration happens in user code
2. A peerDependency on `@hai3/uikit` - the uikit is entirely optional and user-managed
3. Re-exports of uikit types - users import directly from `@hai3/uikit` when they use it

### Violation 2: @hai3/i18n dependency

According to sdk-core spec, @hai3/react (L3) should ONLY depend on @hai3/framework (L2). Currently @hai3/react has `@hai3/i18n` in peerDependencies and directly imports from it.

**Solution**: @hai3/framework already re-exports all needed i18n types. Fix the import source.

### Violation 3: Registry Pattern is Overdesign

The initial implementation incorrectly relocated the registry pattern to L4. This was a mistake. The registry pattern itself is overdesign and must be eliminated entirely - not relocated.

**The problem with registries**:
- Runtime string-based lookups add indirection without benefit
- `registerIcons()` calls are boilerplate that adds no value
- Icons stored in Redux state cause serialization warnings
- Modern React apps use direct imports - this is simpler and type-safe

**The solution**: Use icons like any normal React application:
- Menu icons use Iconify string IDs (e.g., `"lucide:home"`) and render via `<Icon icon={...} />`
- App logos are imported directly as React components
- No registry, no registration, no store state for icons

## What Changes

### Phase 1-2: SDK Cleanup (Completed)

1. **DELETE** `packages/react/src/uikitRegistry.ts`
2. **DELETE** `packages/react/src/components/TextLoader.tsx`
3. **REMOVE** `@hai3/uikit` from peerDependencies
4. **REMOVE** `@hai3/i18n` from peerDependencies
5. **UPDATE** i18n type re-exports to use `@hai3/framework`
6. **MOVE** TextLoader to CLI templates

### Phase 3: Validation (Completed)

Build and type-check passes for @hai3/react.

### Phase 4: Eliminate L4 Registry Pattern

**Goal**: Remove all registry code from L4. Icons render directly, no registration needed.

#### 4.1 Delete Registry Factory
- **DELETE** `src/app/uikit/createUikitRegistry.tsx` - Factory not needed

#### 4.2 Refactor uikitRegistry.tsx
- **REFACTOR** `src/app/uikit/uikitRegistry.tsx`
- Remove all registry pattern code (registerIcons, registerComponents, getIcon, getComponent)
- Keep only direct component re-exports from @hai3/uikit
- Export app logo icons directly (HAI3LogoIcon, HAI3LogoTextIcon)

#### 4.3 Refactor Menu.tsx for Iconify Icons
- **REFACTOR** `src/app/layout/Menu.tsx`
- Remove uikitRegistry imports
- Import app logos directly from `@/app/icons/`
- Use Iconify for menu item icons: `<Icon icon={item.icon} />` from @iconify/react
- **Store access unchanged** - Menu.tsx continues to read menu items from HAI3 store via `useAppSelector`
- The only change is how icons are rendered: string IDs via Iconify instead of React components

#### 4.4 Refactor Screensets
- **REFACTOR** `src/screensets/demo/demoScreenset.tsx`
- **REFACTOR** `src/screensets/_blank/_blankScreenset.tsx`
- Remove `registerIcons()` calls entirely
- Menu items use Iconify string IDs: `icon: "lucide:home"`

#### 4.5 Update main.tsx
- **REFACTOR** `src/app/main.tsx`
- Remove uikitRegistry side-effect import

#### 4.6 Change MenuItem.icon from React.ComponentType to string
- **CHANGE** `MenuItem.icon` type from `React.ComponentType<{ className?: string }>` to `string` in `packages/framework/src/layoutTypes.ts`
- Current code at line 66 has `icon?: React.ComponentType<{ className?: string }>`
- Icon value becomes an Iconify icon ID (e.g., `"lucide:home"`, `"lucide:palette"`)

**Icon Resolution Strategy**:
- App logo icons (HAI3LogoIcon, HAI3LogoTextIcon): Import directly as React components
- Menu item icons: String IDs for Iconify (`icon: "lucide:home"`), rendered via `<Icon icon={...} />`

**Store access unchanged, type changes only**:
- Menu items continue to be stored in HAI3 store (that's data, it belongs there)
- The only change is MenuItem.icon type: string instead of React.ComponentType
- Strings are serializable - no store serialization warnings
- No menuSlice refactoring needed

### Phase 5: AI Documentation Updates

Following .ai/targets/AI.md rules, update AI guidelines to reflect the no-registry pattern.

#### 5.1 Update REACT.md
- Remove any uikitRegistry references
- Clarify that @hai3/react has no uikit dependency

#### 5.2 Update UIKIT.md
- Clarify that uikit uses direct imports only
- No registry pattern anywhere

#### 5.3 Update SCREENSETS.md
- Update ICON RULES section
- Document that menu icons use Iconify string IDs
- Remove registerIcons references

#### 5.4 Update LAYOUT.md
- Document that Menu.tsx uses direct icon rendering
- Menu icons rendered via Iconify `<Icon icon={...} />`

#### 5.5 Check .ai/commands/
- Verify no references to registry pattern in command files
- Update if needed

**AI Doc Rules**:
- Files must stay under 100 lines
- ASCII only, no unicode
- Keywords: MUST, REQUIRED, FORBIDDEN, STOP
- No multi-line examples
- Follow AI.md format rules

### NOT Backward Compatible

This is alpha stage software. Breaking changes are expected.

## Impact

- **Affected specs**: sdk-core (React layer constraints, CLI-Generated Layout requirements)
- **Affected packages**:
  - `@hai3/react` - Remove dependency, delete obsolete modules
  - `@hai3/cli` - Add TextLoader to templates
- **Affected files (L4)**:
  - `src/app/uikit/createUikitRegistry.tsx` - DELETE
  - `src/app/uikit/uikitRegistry.tsx` - REFACTOR (direct exports only)
  - `src/app/layout/Menu.tsx` - REFACTOR (use Iconify)
  - `src/screensets/*/` - REFACTOR (remove registerIcons)
  - `src/app/main.tsx` - REFACTOR (remove registry import)
- **Affected AI docs**:
  - `.ai/targets/REACT.md`
  - `.ai/targets/UIKIT.md`
  - `.ai/targets/SCREENSETS.md`
  - `.ai/targets/LAYOUT.md`

## Error Cases

### Scenario: User tries to use registry pattern
- **WHEN** user calls `uikitRegistry.registerIcons()` or `uikitRegistry.getIcon()`
- **THEN** TypeScript error - function does not exist
- **RESOLUTION**: Use Iconify string IDs in menu config, render with `<Icon icon={...} />`

### Scenario: User stores React components in MenuItem.icon
- **WHEN** user sets `icon: SomeComponent` instead of `icon: "lucide:home"`
- **THEN** TypeScript error - type mismatch (expects string)
- **RESOLUTION**: Use Iconify icon ID string

### Scenario: Store serialization warning for icons
- **WHEN** icons are stored as React components in the store
- **THEN** Console warning about non-serializable values
- **RESOLUTION**: This change eliminates the issue - icons are strings, not components

## Acceptance Criteria

### Phase 1-2: SDK Cleanup (Completed)
1. `npm run arch:deps` passes for @hai3/react package
2. @hai3/react package.json has no @hai3/uikit in dependencies or peerDependencies
3. @hai3/react package.json has no @hai3/i18n in dependencies or peerDependencies
4. `packages/react/src/uikitRegistry.ts` file does not exist
5. `packages/react/src/components/TextLoader.tsx` file does not exist
6. No imports from `@hai3/uikit` exist in @hai3/react source
7. No imports from `@hai3/i18n` exist in @hai3/react source
8. i18n types re-exported from @hai3/framework in @hai3/react
9. `npm run build -w @hai3/react` succeeds
10. `npm run type-check -w @hai3/react` succeeds
11. `packages/cli/templates/src/app/components/TextLoader.tsx` exists

### Phase 4: L4 Registry Pattern Elimination
12. `src/app/uikit/createUikitRegistry.tsx` file does not exist
13. No `registerIcons()` or `registerComponents()` calls anywhere in codebase
14. No `uikitRegistry.getIcon()` or `uikitRegistry.getComponent()` calls anywhere
15. Menu.tsx uses `<Icon icon={item.icon} />` from @iconify/react for menu icons
16. Menu.tsx imports app logos directly from `@/app/icons/`
17. `MenuItem.icon` type changed from `React.ComponentType` to `string` (Iconify icon ID)
18. `src/app/main.tsx` does not import uikitRegistry
19. No store serialization warnings for icons in console
20. Application builds and runs without errors
21. Icons display correctly in the menu

### Phase 5: AI Documentation Updates
22. `.ai/targets/REACT.md` has no uikitRegistry references
23. `.ai/targets/UIKIT.md` documents direct imports only, no registry
24. `.ai/targets/SCREENSETS.md` ICON RULES updated for Iconify string IDs
25. `.ai/targets/LAYOUT.md` documents Menu.tsx direct icon rendering
26. No .ai/commands/ files reference registry pattern
