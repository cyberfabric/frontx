# Implementation Tasks

## 1. Pre-Upgrade Validation
- [ ] Run `npm run type-check` to establish baseline
- [ ] Run `npm run arch:check` to ensure clean start
- [ ] Run `npm run build:packages` to verify all packages build
- [ ] Create feature branch `feat/react-19-upgrade`

## 2. Dependency Upgrades
- [ ] Update root `package.json` dependencies (react, react-dom, @reduxjs/toolkit)
- [ ] Update root `package.json` devDependencies (@types/react, @types/react-dom)
- [ ] Update `packages/uikit/package.json` peerDependencies to support React 18 || 19
- [ ] Update `packages/uikit/package.json` devDependencies (@types/react, @types/react-dom)
- [ ] Update `packages/react/package.json` devDependencies (react, @types/react)
- [ ] Run `npm install` to install new versions
- [ ] Verify no peer dependency errors

## 3. Fix Icon Components (React.FC Removal)
- [ ] Fix `packages/uikit/src/icons/CalendarIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/CheckIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/ChevronDownIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/ChevronLeftIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/ChevronRightIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/ChevronUpIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/CircleIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/CloseIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/MenuIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/MinusIcon.tsx`
- [ ] Fix `packages/uikit/src/icons/MoreHorizontalIcon.tsx`

## 4. Fix DropdownMenu Component
- [ ] Update `packages/uikit/src/base/dropdown-menu.tsx` to remove React.FC

## 5. Type Checking & Compilation
- [ ] Run `npm run type-check` - expect zero errors
- [ ] Run `npm run type-check:packages` - expect zero errors
- [ ] Run `npm run build:packages` - expect clean build

## 6. Architecture & Linting Validation
- [ ] Run `npm run arch:check` - expect all checks pass
- [ ] Run `npm run arch:deps` - expect no dependency violations
- [ ] Run `npm run arch:sdk` - expect SDK layer rules pass
- [ ] Run `npm run lint` - expect zero linting errors

## 7. Manual Testing
- [ ] Start dev server with `npm run dev`
- [ ] Test forms and inputs (focus management, validation)
- [ ] Test Radix UI components (dropdowns, dialogs, tabs, accordion)
- [ ] Test icon components (date picker, buttons, navigation, close buttons)
- [ ] Test Redux state management (updates, DevTools)
- [ ] Verify no browser console errors or warnings
- [ ] Test navigation between screens
- [ ] Test theme switching

## 8. Documentation Updates
- [ ] Update `openspec/project.md` - change "React 18" to "React 19"
- [ ] Update any README files mentioning React version requirements

## 9. Final Validation
- [ ] All tasks above completed
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No architecture violations
- [ ] Dev server runs cleanly
- [ ] Manual testing checklist completed

## Phase 2 (Deferred - Not in this change)
- Migrate 98 forwardRef declarations using React 19 native ref pattern
- Use official React codemod: `npx codemod react/19/remove-forward-ref`
- Manually fix `textarea.tsx` (uses useImperativeHandle)
- Re-run full validation suite
