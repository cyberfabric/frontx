# Implementation Tasks

## 1. Pre-Upgrade Validation
- [x] Run `npm run type-check` to establish baseline
- [x] Run `npm run arch:check` to ensure clean start
- [x] Run `npm run build:packages` to verify all packages build
- [x] Create feature branch `feat/react-19-upgrade`

## 2. Dependency Upgrades
- [x] Update root `package.json` dependencies (react, react-dom, @reduxjs/toolkit)
- [x] Update root `package.json` devDependencies (@types/react, @types/react-dom)
- [x] Update `packages/uikit/package.json` peerDependencies to React 19.2.4 only (remove React 18)
- [x] Update `packages/uikit/package.json` devDependencies (@types/react, @types/react-dom)
- [x] Update `packages/react/package.json` devDependencies (react, @types/react)
- [x] Update `packages/react/package.json` peerDependencies to React 19.2.4 only (remove React 18)
- [x] Update `packages/studio/package.json` peerDependencies to React 19.2.4 only (remove React 18)
- [x] Update `lucide-react` to 0.563.0 for React 19 support
- [x] Run `npm install` to install new versions (React 19.2.4)
- [x] Verify no peer dependency errors (Redux Toolkit 2.11.2 and lucide-react 0.563.0 compatible)

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

## 5. Fix JSX Namespace Issues (React 19 Compatibility)
- [x] Replace `JSX.Element` with `ReactElement` in `packages/react/src/contexts/RouteParamsContext.tsx`

## 6. Update CLI Generator React Versions
- [x] Update `packages/cli/src/generators/project.ts` React dependencies (18.3.1 → 19.2.4)
- [x] Update `packages/cli/src/generators/project.ts` Redux Toolkit (2.2.1 → 2.11.2)
- [x] Update `packages/cli/src/generators/project.ts` lucide-react (0.344.0 → 0.563.0)
- [x] Update `packages/cli/src/generators/project.ts` type definitions (18.x → 19.x)
- [x] Update `packages/cli/src/generators/layerPackage.ts` peer dependencies to React 19.2.4 only
- [x] Update `packages/cli/src/generators/layerPackage.ts` dev dependencies to React 19.2.4
- [x] Rebuild CLI package (via `npm run build:packages`)

## 7. Type Checking & Compilation
- [x] Run `npm run type-check` - expect zero errors
- [x] Run `npm run type-check:packages` - expect zero errors
- [x] Run `npm run build:packages` - expect clean build

## 8. Architecture & Linting Validation
- [x] Run `npm run arch:check` - expect all checks pass
- [x] Run `npm run arch:deps` - expect no dependency violations
- [x] Run `npm run arch:sdk` - expect SDK layer rules pass
- [x] Run `npm run lint` - manually verified (pre-commit hooks passed)

## 9. Manual Testing
- [x] Start dev server with `npm run dev`
- [x] Test forms and inputs (focus management, validation)
- [x] Test Radix UI components (dropdowns, dialogs, tabs, accordion)
- [x] Test icon components (date picker, buttons, navigation, close buttons)
- [x] Test Redux state management (updates, DevTools)
- [x] Verify no browser console errors or warnings
- [x] Test navigation between screens
- [x] Test theme switching

## 10. CLI Generator Integration Testing
- [x] Generate new project in temp directory using updated CLI
- [x] Verify generated project has React 19.2.4 in package.json
- [x] Run `npm install` in generated project - expect no peer dependency errors (352 packages)
- [x] Run `npm run type-check` in generated project - expect zero errors
- [x] Run `npm run arch:check` in generated project - expect all checks pass (4/4 passed)
- [x] Run `npm run dev` in generated project - expect dev server starts cleanly (http://localhost:5173/)

## 11. Documentation Updates
- [x] Update `openspec/project.md` - change "React 18" to "React 19"
- [x] Update README files mentioning React version requirements (studio, uikit)
- [x] Update OpenSpec proposal, tasks, and design docs to React 19.2.4

## 12. Final Validation

- [x] All implementation tasks completed
- [x] No TypeScript errors (React 19.2.4)
- [x] No architecture violations (6/6 checks passed)
- [x] Core packages build successfully (React 19.2.4)
- [x] npm install clean (1485 packages, React 19.2.4)
- [x] Changes committed (12 commits on feat/react-19-upgrade)
- [x] Dev server runs cleanly
- [x] Manual testing checklist completed
- [x] Peer dependency warnings resolved (ink/react-reconciler satisfied with React 19.2.4)
- [x] CLI generator integration testing completed
- [x] Package versions bumped to 0.3.0-alpha.0 (breaking change)

## Phase 2 (Deferred - Not in this change)
- Migrate 98 forwardRef declarations using React 19 native ref pattern
- Use official React codemod: `npx codemod react/19/remove-forward-ref`
- Manually fix `textarea.tsx` (uses useImperativeHandle)
- Re-run full validation suite
