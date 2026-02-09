---
title: Architecture Rules
description: Architectural constraints and validation rules
---

# Architecture Rules

HAI3 enforces strict architectural rules to maintain code quality, prevent common issues, and enable AI-driven development.

## Layer Dependencies

### Rule: No Reverse Dependencies

Layers can only depend on lower layers, never higher ones.

```
L4: App (@your/app)
     ↓
L3: React (@hai3/react)
     ↓
L2: Framework (@hai3/framework)
     ↓
L1: SDK (@hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets)
```

**✅ Allowed:**
```typescript
// L3 (React) imports from L2 (Framework)
import { createHAI3 } from '@hai3/framework';

// L2 (Framework) imports from L1 (SDK)
import { createStore } from '@hai3/state';
```

**❌ Forbidden:**
```typescript
// L1 (SDK) importing from L2 (Framework)
import { createHAI3 } from '@hai3/framework';  // VIOLATION!

// L2 (Framework) importing from L3 (React)
import { useAppSelector } from '@hai3/react';  // VIOLATION!
```

**Enforcement:**
- CI checks on every PR
- `npm run arch:layers` validates dependencies
- TypeScript paths prevent accidental imports

### Rule: SDK Packages Are Independent

SDK packages (L1) cannot depend on each other.

**✅ Allowed:**
```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.4.0"
  }
}
```

**❌ Forbidden:**
```json
{
  "dependencies": {
    "@hai3/state": "*"  // SDK package depending on another SDK package!
  }
}
```

**Why:** SDK packages should be independently reusable in any context.

## Event-Driven Rules

### Rule: Hierarchical Event Naming

Events use dot notation: `domain.entity.action`

**✅ Good:**
```typescript
'user.profile.updated'
'auth.session.expired'
'dashboard.data.loaded'
```

**❌ Bad:**
```typescript
'userUpdated'        // No hierarchy
'update_user'        // Wrong separator
'USER.UPDATED'       // Wrong case
```

### Rule: Events Are Immutable

Never modify event objects after emission.

**✅ Good:**
```typescript
const event = { type: 'user.login', payload: { userId: '123' } };
eventBus.emit(event);
// Don't modify event after emission
```

**❌ Bad:**
```typescript
const event = { type: 'user.login', payload: { userId: '123' } };
eventBus.emit(event);
event.payload.userId = '456';  // VIOLATION! Event is immutable
```

### Rule: Type-Safe Payloads

Define event payload types via module augmentation.

**✅ Good:**
```typescript
declare module '@hai3/state' {
  interface EventPayloadMap {
    'user.login': { userId: string; timestamp: number };
    'user.logout': {};
  }
}
```

**❌ Bad:**
```typescript
// No types defined
eventBus.emit({ type: 'user.login', payload: { anything: true } });
```

## Registry Rules

### Rule: Open/Closed Principle

Registries follow the Open/Closed Principle: open for extension, closed for modification.

**✅ Good:**
```typescript
// Extend by registering new items
screensetRegistry.register('dashboard', dashboardScreenset);
screensetRegistry.register('settings', settingsScreenset);
```

**❌ Bad:**
```typescript
// Modify core registry implementation
class MyCustomScreensetRegistry extends ScreensetRegistry {
  // Overriding core behavior
}
```

### Rule: Registry Uniqueness

Registry IDs must be unique within a registry.

**✅ Good:**
```typescript
registry.register('dashboard', dashboardScreenset);
registry.register('settings', settingsScreenset);
```

**❌ Bad:**
```typescript
registry.register('dashboard', dashboardScreenset);
registry.register('dashboard', otherScreenset);  // VIOLATION! Duplicate ID
```

## TypeScript Rules

### Rule: No `any` or `unknown`

Explicitly type everything.

**✅ Good:**
```typescript
function processData(data: UserData): ProcessedResult {
  return { /* ... */ };
}
```

**❌ Bad:**
```typescript
function processData(data: any): any {  // VIOLATION!
  return data;
}
```

### Rule: Explicit Return Types

Public functions must have explicit return types.

**✅ Good:**
```typescript
export function getUser(id: string): Promise<User> {
  return api.getUser(id);
}
```

**❌ Bad:**
```typescript
export function getUser(id: string) {  // VIOLATION! No return type
  return api.getUser(id);
}
```

### Rule: Strict Null Checks

Handle `null` and `undefined` explicitly.

**✅ Good:**
```typescript
function getUserName(user: User | null): string {
  return user?.name || 'Guest';
}
```

**❌ Bad:**
```typescript
function getUserName(user: User): string {
  return user.name;  // VIOLATION! What if user is null?
}
```

## Circular Dependency Rules

### Rule: No Circular Dependencies

Files, modules, and packages cannot have circular dependencies.

**❌ Bad:**
```typescript
// fileA.ts
import { funcB } from './fileB';
export function funcA() { funcB(); }

// fileB.ts
import { funcA } from './fileA';  // VIOLATION! Circular dependency
export function funcB() { funcA(); }
```

**✅ Good:**
```typescript
// fileA.ts
import { funcB } from './fileB';
export function funcA() { funcB(); }

// fileB.ts
export function funcB() { /* independent */ }

// fileC.ts
import { funcA } from './fileA';
import { funcB } from './fileB';
```

**Enforcement:** `npm run arch:deps` detects circular dependencies.

## Component Rules

### Rule: Single Responsibility

Each component does one thing.

**✅ Good:**
```typescript
function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

function UserAvatar({ user }: { user: User }) {
  return <img src={user.avatar} />;
}
```

**❌ Bad:**
```typescript
function UserEverything({ user }: { user: User }) {
  // Displays profile, handles editing, manages state, makes API calls...
  // TOO MUCH! Split into smaller components
}
```

### Rule: Props Over Context

Prefer props for component data, use context sparingly.

**✅ Good:**
```typescript
function UserCard({ user, onEdit }: UserCardProps) {
  return <div>{/* ... */}</div>;
}
```

**❌ Bad:**
```typescript
function UserCard() {
  const { user, onEdit } = useEverythingContext();  // Over-use of context
  return <div>{/* ... */}</div>;
}
```

## State Management Rules

### Rule: Normalize State

Store data in normalized form (flat, keyed by ID).

**✅ Good:**
```typescript
interface ProductsState {
  byId: Record<string, Product>;
  allIds: string[];
}
```

**❌ Bad:**
```typescript
interface ProductsState {
  products: Product[];  // Nested, hard to update
}
```

### Rule: Immutable Updates

Never mutate state directly (Redux Toolkit handles this with Immer).

**✅ Good:**
```typescript
reducers: {
  setUser: (state, action) => {
    state.profile = action.payload;  // Immer handles immutability
  }
}
```

**❌ Bad:**
```typescript
const state = store.getState();
state.user.name = 'Jane';  // VIOLATION! Direct mutation
```

## No-Go Patterns

### ❌ God Objects

Objects that do too much.

```typescript
// ❌ Bad
class EverythingManager {
  manageUsers() { /* ... */ }
  handleAuth() { /* ... */ }
  processPayments() { /* ... */ }
  generateReports() { /* ... */ }
}
```

### ❌ Spaghetti Imports

Deeply nested or scattered imports.

```typescript
// ❌ Bad
import { something } from '../../../../../../../shared/utils';
```

**Fix:** Use TypeScript path aliases.

### ❌ Magic Numbers

Unexplained constants.

```typescript
// ❌ Bad
if (status === 3) { /* ... */ }

// ✅ Good
const STATUS_ACTIVE = 3;
if (status === STATUS_ACTIVE) { /* ... */ }
```

### ❌ Prop Drilling

Passing props through many levels.

```typescript
// ❌ Bad
<A user={user}>
  <B user={user}>
    <C user={user}>
      <D user={user} />  // Too deep!
    </C>
  </B>
</A>
```

**Fix:** Use context or state management.

## Validation

HAI3 includes automated architecture validation:

```bash
npm run arch:check        # Run all architecture checks
npm run arch:deps         # Check circular dependencies
npm run arch:layers       # Validate layer dependencies
npm run arch:sdk          # Validate SDK layer isolation
```

### Layer Validation

```bash
npm run arch:layers
```

**Checks:**
- L1 packages don't import from L2/L3/L4
- L2 doesn't import from L3/L4
- L3 doesn't import from L4
- SDK packages are independent

**Output:**
```
✓ All layer dependencies are valid
✗ VIOLATION: @hai3/state imports from @hai3/framework (L1→L2)
```

### Circular Dependency Check

```bash
npm run arch:deps
```

**Detects:**
- File-level circular dependencies
- Module-level circular dependencies
- Cross-package circular dependencies

**Output:**
```
✓ No circular dependencies found
✗ Circular dependency: fileA.ts → fileB.ts → fileA.ts
```

### SDK Isolation Check

```bash
npm run arch:sdk
```

**Validates:**
- SDK packages have no `@hai3/*` dependencies (except allowed: types)
- SDK packages are independently publishable

**Output:**
```
✓ All SDK packages are properly isolated
✗ @hai3/state depends on @hai3/framework (SDK isolation violation)
```

## CI/CD Enforcement

All rules are enforced in CI:

```yaml
# .github/workflows/validate.yml
- name: Architecture Validation
  run: npm run arch:check
- name: TypeScript Check
  run: npm run typecheck
- name: Linter
  run: npm run lint
```

PRs cannot merge if architecture validation fails.

## Fixing Violations

When violations are detected:

1. **Understand the rule** - Read why it exists
2. **Assess impact** - Is this a quick fix or architectural issue?
3. **Fix properly** - Don't work around the rule
4. **Add tests** - Prevent regression

**Example Fix:**

```typescript
// ❌ Violation detected
// @hai3/state importing from @hai3/framework
import { createHAI3 } from '@hai3/framework';

// ✅ Fixed
// Move this code to @hai3/framework or restructure dependencies
```

## Related Documentation

- [Contributing Overview](/hai3/contributing/)
- [Guidelines](/hai3/contributing/guidelines)
- [Architecture Overview](/hai3/architecture/overview)
- [Layers](/hai3/architecture/layers)
