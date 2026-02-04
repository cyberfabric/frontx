# Design: React 19 Upgrade

## Approach

**Staged Migration Strategy:**
1. **Phase 1 (This Change)**: Upgrade React + fix critical breaking changes
2. **Phase 2 (Deferred)**: Migrate forwardRef patterns using codemods

**Rationale for Staging:**
- React 19 maintains backward compatibility with forwardRef (deprecated but functional)
- Separates dependency risk from refactoring risk
- Enables faster rollback if React 19 introduces runtime issues
- Phase 2 can use automated codemods after validating Phase 1 stability

## Breaking Changes

### React.FC Type Changes

**What changed:** React 19 removes implicit `children` prop from `React.FC<Props>`.

**React 18 behavior:**
```typescript
const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => { ... }
// Implicitly includes children?: ReactNode
```

**React 19 behavior:**
```typescript
const Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => { ... }
// No implicit children - must explicitly add if needed
```

**Migration:**
```typescript
// React 19 recommended pattern (no React.FC)
const Icon = (props: React.SVGProps<SVGSVGElement>) => { ... }
```

**Impact:** 11 icon components + 1 dropdown component must migrate.

### JSX Namespace Changes

**What changed:** React 19 no longer exposes the `JSX` namespace globally.

**React 18 behavior:**
```typescript
function Component(): JSX.Element { ... }
// JSX namespace available globally
```

**React 19 behavior:**
```typescript
function Component(): JSX.Element { ... }
// Error: Cannot find namespace 'JSX'
```

**Migration:**
```typescript
import { type ReactElement } from 'react';

function Component(): ReactElement { ... }
// Or omit return type (TypeScript infers correctly)
```

**Impact:** 1 file (`packages/react/src/contexts/RouteParamsContext.tsx`) requires migration.

### forwardRef Patterns (Deferred)

**What's changing:** React 19 allows refs as standard props, deprecating forwardRef wrapper.

**React 18 pattern:**
```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <button ref={ref} {...props} />
)
```

**React 19 pattern:**
```typescript
const Button = ({ ref, ...props }: ButtonProps & { ref?: Ref<HTMLButtonElement> }) => (
  <button ref={ref} {...props} />
)
```

**Decision:** Defer to Phase 2 because:
- 98 declarations across 29 files = high change volume
- forwardRef still works in React 19 (backward compatible)
- Official React codemod exists for safe automated migration
- Reduces risk in Phase 1

## Dependency Compatibility Matrix

| Package | Current | Target | Compatibility Status |
|---------|---------|--------|---------------------|
| react | 18.3.1 | 19.2.4 | ✅ Direct upgrade |
| react-dom | 18.3.1 | 19.2.4 | ✅ Direct upgrade |
| @types/react | 18.3.3 | 19.0.8 | ✅ Types published |
| @types/react-dom | 18.3.0 | 19.0.3 | ✅ Types published |
| @reduxjs/toolkit | 2.2.1 | 2.11.2 | ✅ React 19 support added in 2.5.0 |
| react-redux (monorepo) | 9.1.0 | (no change) | ✅ Compatible with React 19 |
| react-redux (CLI gen) | 9.1.2 | 9.2.0 | ✅ React 19 support added in 9.2.0 |
| @radix-ui/* (23 packages) | v1.x-v2.x | (no change) | ✅ Verified React 19 compatible |
| react-hook-form | 7.68.0 | (no change) | ✅ Compatible |
| lucide-react | 0.344.0 | 0.563.0 | ✅ React 19 support added in 0.450.0 |

**Key findings:**
- Redux Toolkit 2.2.1 has React 18 peer dependency constraints
- Upgrading to 2.11.2 adds React 19 peer dependency support
- react-redux 9.1.2 only supports React ^18.0
- react-redux 9.2.0 adds React 19 support (^18.0 || ^19)
- All other dependencies use flexible version ranges or are already compatible

## File Changes

### Package Manifests (5 files)

**Root package.json:**
- Update `react`, `react-dom`, `@reduxjs/toolkit` in dependencies
- Update `@types/react`, `@types/react-dom` in devDependencies

**packages/uikit/package.json:**
- Update peerDependencies: `"react": "^19.2.4"` (React 19 only)
- Update devDependencies: `@types/react`, `@types/react-dom`

**packages/studio/package.json:**
- Update peerDependencies: `"react": "^19.2.4"` (React 19 only)
- Update devDependencies: `@types/react`, `@types/react-dom`

**packages/react/package.json:**
- Update devDependencies: `react`, `@types/react`

### Icon Components (11 files)

**Pattern transformation:**
```typescript
// Before
export const CalendarIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = '',
  ...props
}) => {
  return <svg className={className} {...props}>...</svg>;
};

// After
export const CalendarIcon = ({
  className = '',
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return <svg className={className} {...props}>...</svg>;
};
```

**Files:**
- packages/uikit/src/icons/CalendarIcon.tsx
- packages/uikit/src/icons/CheckIcon.tsx
- packages/uikit/src/icons/ChevronDownIcon.tsx
- packages/uikit/src/icons/ChevronLeftIcon.tsx
- packages/uikit/src/icons/ChevronRightIcon.tsx
- packages/uikit/src/icons/ChevronUpIcon.tsx
- packages/uikit/src/icons/CircleIcon.tsx
- packages/uikit/src/icons/CloseIcon.tsx
- packages/uikit/src/icons/MenuIcon.tsx
- packages/uikit/src/icons/MinusIcon.tsx
- packages/uikit/src/icons/MoreHorizontalIcon.tsx

### DropdownMenu Component (1 file)

**File:** packages/uikit/src/base/dropdown-menu.tsx

**Pattern transformation:**
```typescript
// Before
const DropdownMenu: React.FC<
  Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>, 'dir'> & {
    dir?: TextDirection;
  }
> = ({ dir, ...props }) => (
  <DropdownMenuPrimitive.Root {...props} dir={dir as 'ltr' | 'rtl' | undefined} />
);

// After
const DropdownMenu = ({
  dir,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>, 'dir'> & {
  dir?: TextDirection;
}) => (
  <DropdownMenuPrimitive.Root {...props} dir={dir as 'ltr' | 'rtl' | undefined} />
);
```

### CLI Generator Templates (2 files)

**Why update CLI generator:**
- CLI generates new HAI3 projects with hardcoded React versions
- Generated projects must use React 19 to match monorepo
- Ensures consistency across all HAI3 projects

**File 1:** packages/cli/src/generators/project.ts

Lines 330-350 define dependency versions for generated projects:
```typescript
// Before
const dependencies: Record<string, string> = {
  '@reduxjs/toolkit': '2.2.1',
  'lucide-react': '0.344.0',
  react: '18.3.1',
  'react-dom': '18.3.1',
  // ...
};

const devDependencies: Record<string, string> = {
  '@types/react': '18.3.3',
  '@types/react-dom': '18.3.0',
  // ...
};

// After
const dependencies: Record<string, string> = {
  '@reduxjs/toolkit': '2.11.2',
  'lucide-react': '0.563.0',
  react: '19.2.4',
  'react-dom': '19.2.4',
  'react-redux': '9.2.0',
  // ...
};

const devDependencies: Record<string, string> = {
  '@types/react': '19.0.8',
  '@types/react-dom': '19.0.3',
  // ...
};
```

**File 2:** packages/cli/src/generators/layerPackage.ts

Lines 68-83 define React dependencies for layer packages (React layer):
```typescript
// Before
peerDependencies: {
  react: '^18.0.0',
  'react-dom': '^18.0.0',
},
devDependencies: {
  '@types/react': '^18.0.0',
  '@types/react-dom': '^18.0.0',
  react: '^18.3.0',
  'react-dom': '^18.3.0',
}

// After
peerDependencies: {
  react: '^19.2.4',  // React 19 only
  'react-dom': '^19.2.4',
},
devDependencies: {
  '@types/react': '^19.0.0',
  '@types/react-dom': '^19.0.0',
  react: '^19.2.4',
  'react-dom': '^19.2.4',
}
```

**Testing CLI changes:**
1. Rebuild CLI: `npm run build --workspace=@hai3/cli`
2. Generate test project: `npx @hai3/cli@alpha init /tmp/test-project`
3. Verify package.json has React 19
4. Run full validation in generated project

## Validation Strategy

### Pre-Change Baseline
1. Run `npm run type-check` - establish baseline
2. Run `npm run arch:check` - verify architecture rules
3. Run `npm run build:packages` - verify clean build

### Post-Change Validation
1. **Type Safety:**
   - `npm run type-check` - zero errors expected
   - `npm run type-check:packages` - all packages compile

2. **Build Validation:**
   - `npm run build:packages` - clean builds in layer order
   - Packages follow SDK → Framework → React → UI → CLI order

3. **Architecture Rules:**
   - `npm run arch:check` - all checks pass
   - `npm run arch:deps` - dependency graph valid
   - `npm run arch:sdk` - SDK layer constraints enforced

4. **Linting:**
   - `npm run lint` - zero warnings/errors

5. **Manual Testing:**
   - Start dev server: `npm run dev`
   - Test icon components (date picker, buttons, navigation)
   - Test Radix UI components (dropdowns, dialogs, tabs)
   - Test form interactions (focus, validation, submission)
   - Test Redux state management
   - Verify no browser console errors

## Rollback Plan

### Quick Rollback (if React 19 causes issues)
```bash
# Revert dependency changes
git checkout main -- package.json packages/*/package.json
npm install

# Revert code changes
git checkout main -- packages/uikit/src/icons packages/uikit/src/base/dropdown-menu.tsx

# Validate rollback
npm run type-check
npm run dev
```

### Full Rollback
```bash
git checkout main
git branch -D feat/react-19-upgrade
```

## Trade-offs

### Chosen: Staged Migration

**Pros:**
- Lower risk - validates React 19 stability before extensive refactoring
- Easier rollback - dependency changes separated from code refactoring
- Faster feedback - can ship Phase 1 and gather production data
- Automation-friendly - Phase 2 can use official codemods

**Cons:**
- Temporary technical debt - forwardRef still used (deprecated but functional)
- Two-phase implementation - requires coordination across releases

### Alternative: Big Bang Migration

**Pros:**
- Completes React 19 migration in one pass
- No temporary deprecated pattern usage

**Cons:**
- High risk - 98 forwardRef changes + dependency upgrade simultaneously
- Difficult rollback - can't isolate dependency vs. code issues
- Manual migration - too many files for safe hand-editing
- Longer testing cycle - must validate everything at once

**Decision:** Staged migration chosen for risk management and automation benefits.

## References

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React.FC Deprecation Discussion](https://github.com/facebook/react/pull/28839)
- [Redux Toolkit React 19 Support](https://github.com/reduxjs/redux-toolkit/releases/tag/v2.5.0)
- [Radix UI React 19 Compatibility](https://github.com/radix-ui/primitives/issues/2900)
