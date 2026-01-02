# Tasks: Clean @hai3/react Layer Dependencies

## Phase 1-3: SDK Cleanup (Completed)

All SDK cleanup tasks completed. See git history for details.

## Phase 4: Eliminate L4 Registry Pattern (Completed)

### 10. Delete Registry Factory
- [x] 10.1 Delete createUikitRegistry.tsx
  - File: `src/app/uikit/createUikitRegistry.tsx`
  - Action: DELETE entire file
  - Status: Already deleted in prior work
  - Traces to: proposal.md "4.1 Delete Registry Factory", AC 12

### 11. Refactor uikitRegistry.tsx
- [x] 11.1 Remove registry pattern from uikitRegistry.tsx
  - File: `src/app/uikit/uikitRegistry.tsx`
  - Remove: All registry methods (registerIcons, registerComponents, getIcon, getComponent)
  - Remove: Registry singleton creation
  - Keep: Direct re-exports of @hai3/uikit components
  - Keep: Direct exports of app logo icons
  - Status: Already refactored in prior work
  - Traces to: proposal.md "4.2 Refactor uikitRegistry.tsx", AC 13, 14

### 12. Refactor Screensets (MUST complete before Menu.tsx)
- [x] 12.1 Refactor demoScreenset.tsx
  - File: `src/screensets/demo/demoScreenset.tsx`
  - Remove: `import { uikitRegistry } from '@/app/uikit/uikitRegistry'`
  - Remove: `uikitRegistry.registerIcons({...})` call
  - Update: Menu item icons to Iconify string IDs (e.g., `icon: "lucide:globe"`)
  - Remove: Local icon component imports if only used for registration
  - Status: Completed - removed icon imports, changed to Iconify strings
  - Traces to: proposal.md "4.4 Refactor Screensets", AC 13

- [x] 12.2 Refactor _blankScreenset.tsx (also CLI template source per manifest.yaml)
  - File: `src/screensets/_blank/_blankScreenset.tsx`
  - Note: This is the screenset template source (see manifest.yaml screensetTemplate: _blank)
  - Remove: `import { uikitRegistry } from '@/app/uikit/uikitRegistry'`
  - Remove: `uikitRegistry.registerIcons({...})` call
  - Update: Menu item icons to Iconify string IDs (e.g., `icon: "lucide:home"`)
  - Remove: Local icon component imports if only used for registration
  - Status: Completed - removed HomeIcon import, changed to "lucide:home"
  - Traces to: proposal.md "4.4 Refactor Screensets", AC 13

### 13. Refactor Menu.tsx (AFTER screensets emit Iconify strings)
- [x] 13.1 Update Menu.tsx for Iconify icons
  - File: `src/app/layout/Menu.tsx`
  - DEPENDENCY: Requires 12.1, 12.2 complete (screensets must emit Iconify strings)
  - Add: `import { Icon } from '@iconify/react'`
  - Remove: `import { uikitRegistry } from '@/app/uikit/uikitRegistry'`
  - Remove: `import { UiKitIcon } from '@hai3/uikit'`
  - Update: App logo rendering to use direct imports from `@/app/icons/`
  - Update: Menu item icons to use `<Icon icon={item.icon} className="..." />`
  - Store access unchanged: continue using useAppSelector to read menu items
  - Only change is rendering: `<Icon icon={...} />` instead of `<item.icon />`
  - Status: Completed - added Icon import, updated rendering
  - Traces to: proposal.md "4.3 Refactor Menu.tsx", AC 15, 16

- [x] 13.2 Update CLI template-sources Menu.tsx
  - File: `packages/cli/template-sources/layout/hai3-uikit/Menu.tsx`
  - Apply same changes as 13.1 (Iconify icons, store access unchanged)
  - Status: Completed - added Icon import, updated rendering
  - Traces to: proposal.md "4.3 Refactor Menu.tsx", AC 15, 16

### 14. Update main.tsx
- [x] 14.1 Remove uikitRegistry import from main.tsx
  - File: `src/app/main.tsx`
  - Remove: `import '@/app/uikit/uikitRegistry';` (side-effect import)
  - Status: No import present (already removed or never added)
  - Traces to: proposal.md "4.5 Update main.tsx", AC 18

### 15. Change MenuItem.icon Type
- [x] 15.1 Change MenuItem.icon from React.ComponentType to string
  - File: `packages/framework/src/layoutTypes.ts`
  - Changed from: `icon?: React.ComponentType<{ className?: string }>`
  - Changed to: `icon?: string`
  - Also updated: `packages/screensets/src/types.ts` MenuItemConfig.icon
  - Status: Completed - type changed in both files, packages rebuilt
  - This is a BREAKING CHANGE
  - Traces to: proposal.md "4.6 Change MenuItem.icon from React.ComponentType to string", AC 17

## Phase 5: AI Documentation Updates (Completed)

### 16. Update REACT.md
- [x] 16.1 Remove uikitRegistry references from REACT.md
  - File: `.ai/targets/REACT.md`
  - Remove: Any mention of uikitRegistry
  - Update: Peer dependencies section (no @hai3/uikit)
  - Keep: Under 100 lines, ASCII only
  - Status: Completed - no registry references found (already clean)
  - Traces to: proposal.md "5.1 Update REACT.md", AC 22

### 17. Update UIKIT.md
- [x] 17.1 Clarify no registry pattern in UIKIT.md
  - File: `.ai/targets/UIKIT.md`
  - Add: FORBIDDEN: Registry patterns or runtime registration
  - Clarify: Direct imports only
  - Keep: Under 100 lines, ASCII only
  - Status: Completed - added FORBIDDEN rule for registry patterns
  - Traces to: proposal.md "5.2 Update UIKIT.md", AC 23

### 18. Update SCREENSETS.md
- [x] 18.1 Expand ICON RULES in SCREENSETS.md
  - File: `.ai/targets/SCREENSETS.md`
  - Note: File is at 99 lines (at limit) - may need to consolidate existing content
  - Current ICON RULES section (lines 68-71) has only 3 lines of minimal content
  - Expand section with Iconify requirements:
  - Add: REQUIRED: Menu icons use Iconify string IDs (e.g., "lucide:home")
  - Add: FORBIDDEN: registerIcons() calls
  - Add: FORBIDDEN: React.ComponentType in menu item icon field
  - Keep: Under 100 lines total, ASCII only
  - Status: Completed - expanded to 4 lines with all requirements (still 99 lines total)
  - Traces to: proposal.md "5.3 Update SCREENSETS.md", AC 24

### 19. Update LAYOUT.md
- [x] 19.1 Document Iconify usage in LAYOUT.md
  - File: `.ai/targets/LAYOUT.md`
  - Add: Menu.tsx uses Iconify for menu item icons
  - Add: App logos imported directly from @/app/icons/
  - Keep: Under 100 lines, ASCII only
  - Status: Completed - added MENU ICON RULES section (71 lines total)
  - Traces to: proposal.md "5.4 Update LAYOUT.md", AC 25

### 20. Check .ai/commands/
- [x] 20.1 Verify no uikitRegistry references in commands
  - Path: `.ai/commands/`
  - Check: grep for "uikitRegistry" specifically (NOT all registry patterns)
  - Note: screensetRegistry, i18nRegistry, apiRegistry are VALID patterns - do not remove
  - Update: Only files with uikitRegistry or registerIcons references
  - Status: Completed - no uikitRegistry or registerIcons references found
  - Traces to: proposal.md "5.5 Check .ai/commands/", AC 26

## Phase 6: Validation

### 21. Validate Phase 4 Changes
- [ ] 21.1 Verify createUikitRegistry.tsx deleted
  - Command: `ls src/app/uikit/createUikitRegistry.tsx` should fail
  - Traces to: AC 12

- [ ] 21.2 Verify no registry methods in uikitRegistry.tsx
  - Command: `grep -E "registerIcons|registerComponents|getIcon|getComponent" src/app/uikit/uikitRegistry.tsx`
  - Expected: No matches
  - Traces to: AC 13, 14

- [ ] 21.3 Verify Menu.tsx uses Iconify
  - Command: `grep "@iconify/react" src/app/layout/Menu.tsx`
  - Expected: Match found
  - Traces to: AC 15

- [ ] 21.4 Verify screensets have no registerIcons
  - Command: `grep -r "registerIcons" src/screensets/`
  - Expected: No matches
  - Traces to: AC 13

- [ ] 21.5 Verify main.tsx has no uikitRegistry
  - Command: `grep "uikitRegistry" src/app/main.tsx`
  - Expected: No matches
  - Traces to: AC 18

- [ ] 21.6 Verify MenuItem.icon changed to string type
  - Command: `grep "icon?: string" packages/framework/src/layoutTypes.ts`
  - Expected: Match found (was React.ComponentType, now string)
  - Traces to: AC 17

- [ ] 21.7 Build and run application
  - Command: `npm run build && npm run dev`
  - Verify: No store serialization warnings
  - Verify: Icons display correctly in menu
  - Traces to: AC 19, 20, 21

### 22. Validate Phase 5 Changes
- [ ] 22.1 Verify REACT.md has no registry references
  - Command: `grep -i "registry" .ai/targets/REACT.md`
  - Expected: No matches
  - Traces to: AC 22

- [ ] 22.2 Verify UIKIT.md has no-registry rule
  - Command: `grep -i "FORBIDDEN.*registry" .ai/targets/UIKIT.md`
  - Expected: Match found
  - Traces to: AC 23

- [ ] 22.3 Verify SCREENSETS.md has Iconify rules
  - Command: `grep -i "iconify\|lucide:" .ai/targets/SCREENSETS.md`
  - Expected: Match found
  - Traces to: AC 24

- [ ] 22.4 Verify LAYOUT.md has icon documentation
  - Command: `grep -i "iconify\|Icon icon" .ai/targets/LAYOUT.md`
  - Expected: Match found
  - Traces to: AC 25

- [ ] 22.5 Verify no registry in commands
  - Command: `grep -r "registerIcons\|uikitRegistry" .ai/commands/`
  - Expected: No matches
  - Traces to: AC 26

## Task Dependencies

```
Phase 4: L4 Registry Pattern Elimination

10.1 Delete createUikitRegistry.tsx
  │
11.1 Remove registry pattern from uikitRegistry.tsx
  │
  ├──> 12.1, 12.2 Refactor Screensets (parallel, emit Iconify strings)
  │         │
  │         v
  └──> 13.1, 13.2 Refactor Menu.tsx (DEPENDS on 12.x)
            │       - Use Iconify for icons
            │       - Store access unchanged
            │
       14.1 Update main.tsx (after 11.1)
            │
       15.1 Change MenuItem.icon type (can run early, unblocks 12.x)

Note: Screensets (12.x) MUST complete before Menu.tsx (13.x)
      Screensets produce Iconify strings -> Menu.tsx consumes them

Phase 5: AI Documentation Updates (can start after Phase 4)
16.1, 17.1, 18.1, 19.1, 20.1 (all parallel)

Phase 6: Validation (requires Phase 4 and 5 complete)
21.1-21.7 (sequential)
22.1-22.5 (sequential, after 21.x)
```
