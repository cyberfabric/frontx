# Implementation Tasks

## 1. Pre-Upgrade Validation
- [x] Run `npm run type-check` to establish baseline
- [x] Run `npm run arch:check` to ensure clean start
- [x] Run `npm run build:packages` to verify all packages build
- [x] Create feature branch `feat/react-19-upgrade`

## 2. Dependency Upgrades
- [x] Update root `package.json` dependencies (react, react-dom, @reduxjs/toolkit)
- [x] Update root `package.json` devDependencies (@types/react, @types/react-dom)
- [x] Update `packages/uikit/package.json` peerDependencies to support React 18 || 19
- [x] Update `packages/uikit/package.json` devDependencies (@types/react, @types/react-dom)
- [x] Update `packages/react/package.json` devDependencies (react, @types/react)
- [x] Update `packages/studio/package.json` peerDependencies and devDependencies
- [x] Update `lucide-react` to 0.563.0 for React 19 support
- [x] Run `npm install` to install new versions
- [x] Verify no peer dependency errors

## 3. Fix Icon Components (React.FC Removal)
- [x] Fix `packages/uikit/src/icons/CalendarIcon.tsx`
- [x] Fix `packages/uikit/src/icons/CheckIcon.tsx`
- [x] Fix `packages/uikit/src/icons/ChevronDownIcon.tsx`
- [x] Fix `packages/uikit/src/icons/ChevronLeftIcon.tsx`
- [x] Fix `packages/uikit/src/icons/ChevronRightIcon.tsx`
- [x] Fix `packages/uikit/src/icons/ChevronUpIcon.tsx`
- [x] Fix `packages/uikit/src/icons/CircleIcon.tsx`
- [x] Fix `packages/uikit/src/icons/CloseIcon.tsx`
- [x] Fix `packages/uikit/src/icons/MenuIcon.tsx`
- [x] Fix `packages/uikit/src/icons/MinusIcon.tsx`
- [x] Fix `packages/uikit/src/icons/MoreHorizontalIcon.tsx`

## 4. Fix DropdownMenu Component
- [x] Update `packages/uikit/src/base/dropdown-menu.tsx` to remove React.FC

## 5. Type Checking & Compilation
- [x] Run `npm run type-check` - expect zero errors
- [x] Run `npm run type-check:packages` - expect zero errors
- [x] Run `npm run build:packages` - expect clean build

## 6. Architecture & Linting Validation
- [x] Run `npm run arch:check` - expect all checks pass
- [x] Run `npm run arch:deps` - expect no dependency violations
- [x] Run `npm run arch:sdk` - expect SDK layer rules pass
- [x] Run `npm run lint` - manually verified (pre-commit hooks passed)

## 7. Manual Testing
- [x] Start dev server with `npm run dev`
- [x] Test forms and inputs (focus management, validation)
- [x] Test Radix UI components (dropdowns, dialogs, tabs, accordion)
- [x] Test icon components (date picker, buttons, navigation, close buttons)
- [x] Test Redux state management (updates, DevTools)
- [x] Verify no browser console errors or warnings
- [x] Test navigation between screens
- [x] Test theme switching

## 8. Documentation Updates
- [x] Update `openspec/project.md` - change "React 18" to "React 19"
- [x] Update README files mentioning React version requirements (studio, uikit)

## 9. Final Validation

- [x] All implementation tasks completed
- [x] No TypeScript errors
- [x] No architecture violations
- [x] Core packages build successfully
- [x] npm install clean (1489 packages)
- [x] Changes committed (2 commits on feat/react-19-upgrade)
- [x] Dev server runs cleanly
- [x] Manual testing checklist completed

## Phase 2 (Deferred - Not in this change)
- Migrate 98 forwardRef declarations using React 19 native ref pattern
- Use official React codemod: `npx codemod react/19/remove-forward-ref`
- Manually fix `textarea.tsx` (uses useImperativeHandle)
- Re-run full validation suite
