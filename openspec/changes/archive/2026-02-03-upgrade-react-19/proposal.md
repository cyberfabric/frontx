# Change: Upgrade React to 19.x

## Why

React 19 introduces performance improvements, new hooks, and simplifies ref forwarding patterns. The current React 18.3.1 is stable but missing modern features. Upgrading now positions HAI3 for future React ecosystem updates and improves developer experience.

## What Changes

- **Dependency upgrades:**
  - React: 18.3.1 → 19.2.4
  - React-DOM: 18.3.1 → 19.2.4
  - @types/react: 18.3.3 → 19.0.8
  - @types/react-dom: 18.3.0 → 19.0.3
  - Redux Toolkit: 2.2.1 → 2.11.2 (React 19 compatibility)
  - react-redux: 9.1.2 → 9.2.0 (React 19 compatibility, CLI generator only)
  - lucide-react: 0.344.0 → 0.563.0 (React 19 compatibility)

- **Code changes:**
  - Remove `React.FC` from 11 icon components (React 19 removes implicit children)
  - Remove `React.FC` from DropdownMenu component
  - Replace `JSX.Element` with `ReactElement` (React 19 no longer exposes JSX namespace globally)
  - Update peer dependencies to React 19 only (remove React 18 support)
  - Update CLI generator React version templates (project.ts, layerPackage.ts)

- **Deferred to Phase 2:**
  - Migrate 98 forwardRef declarations to React 19 native ref pattern (backward compatible, can be done later)

## Impact

**Affected specs:**
- `uikit-base` - Icon components and DropdownMenu component changes
- `sdk-core` - Dependency version requirements

**Affected code:**
- Root `package.json` - Dependency versions
- `packages/uikit/package.json` - Peer dependencies
- `packages/react/package.json` - Dev dependencies
- `packages/studio/package.json` - Peer dependencies
- `packages/uikit/src/icons/*.tsx` (11 files) - Remove React.FC
- `packages/uikit/src/base/dropdown-menu.tsx` - Remove React.FC
- `packages/react/src/contexts/RouteParamsContext.tsx` - Replace JSX.Element with ReactElement
- `packages/cli/src/generators/project.ts` - Update hardcoded React versions
- `packages/cli/src/generators/layerPackage.ts` - Update React peer/dev dependencies

**Breaking changes:**
- Packages require React 19+ (React 18 no longer supported in peer dependencies)
- Consumers must upgrade to React 19 to use new HAI3 versions
- Internal: React.FC no longer includes implicit children prop
- Internal: JSX namespace no longer exposed globally (use ReactElement from React instead)

**Compatibility:**
- All 23 Radix UI packages verified compatible with React 19
- Redux Toolkit 2.11.2+ supports React 19
- React-Redux 9.1.0+ compatible with React 19
- All other dependencies verified compatible

**Risk level:** Low-Medium
- Low risk: React 19 maintains backward compatibility
- Medium risk: Need to fix React.FC usage before testing
