---
title: Development Guidelines
description: Coding standards and best practices for HAI3 development
---

# Development Guidelines

These guidelines ensure consistency, quality, and maintainability across the HAI3 codebase.

## Code Style

### TypeScript

**Strict Mode:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**No `any` or `unknown`:**
```typescript
// ❌ Bad
function process(data: any) { /* ... */ }

// ✅ Good
function process(data: ProcessData) { /* ... */ }
```

**Explicit Return Types:**
```typescript
// ❌ Bad
function getUser(id: string) {
  return api.getUser(id);
}

// ✅ Good
function getUser(id: string): Promise<User> {
  return api.getUser(id);
}
```

### React

**Functional Components:**
```typescript
// ✅ Good
function UserProfile({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// ❌ Bad: Class components (avoid)
class UserProfile extends React.Component { /* ... */ }
```

**Named Exports:**
```typescript
// ✅ Good
export function DashboardScreen() { /* ... */ }

// ❌ Bad: Default exports (causes issues with refactoring)
export default function Dashboard() { /* ... */ }
```

**Props Interface:**
```typescript
// ✅ Good
interface UserCardProps {
  user: User;
  onEdit?: () => void;
}

function UserCard({ user, onEdit }: UserCardProps) {
  return <div>{/* ... */}</div>;
}
```

### Naming Conventions

- **Files:** `kebab-case.ts`, `PascalCase.tsx` (React components)
- **Components:** `PascalCase` (`UserProfile`, `DashboardScreen`)
- **Functions/Variables:** `camelCase` (`getUserData`, `isLoading`)
- **Constants:** `UPPER_SNAKE_CASE` (`API_BASE_URL`, `MAX_RETRIES`)
- **Interfaces/Types:** `PascalCase` (`User`, `ApiResponse`)
- **Events:** `domain.entity.action` (`user.profile.updated`)

## Architecture Rules

See [Architecture Rules](/hai3/contributing/architecture-rules) for detailed layer and dependency rules.

**Key principles:**
- Respect layer boundaries (L1 → L2 → L3 → L4)
- No circular dependencies
- Single Responsibility Principle
- Event-driven communication

## Testing Standards

### Coverage Requirements

- **Minimum:** 80% code coverage
- **Recommended:** 90% for critical paths
- **Target:** 100% for public APIs

### Test Structure

```typescript
describe('Component/Function Name', () => {
  describe('specific behavior', () => {
    test('does expected thing when condition', () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### What to Test

**✅ Test:**
- Public APIs
- Edge cases and error conditions
- User interactions
- State changes
- Event emissions

**❌ Don't Test:**
- Implementation details
- Third-party libraries
- Trivial getters/setters

### Test Patterns

**Unit Tests:**
```typescript
test('createEventBus returns EventBus instance', () => {
  const eventBus = createEventBus();
  expect(eventBus).toBeDefined();
  expect(typeof eventBus.emit).toBe('function');
});
```

**Component Tests:**
```typescript
test('UserProfile renders user name', () => {
  const user = { id: '1', name: 'John Doe' };
  render(<UserProfile user={user} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

**Integration Tests:**
```typescript
test('framework integrates with state package', () => {
  const app = createHAI3().use(statePlugin).build();
  expect(app.store).toBeDefined();
  expect(app.eventBus).toBeDefined();
});
```

## Documentation Standards

### Code Comments

**When to Comment:**
- Complex algorithms
- Non-obvious decisions
- Workarounds for known issues
- Public APIs

**When Not to Comment:**
- Obvious code (self-documenting)
- What code does (code shows this)

```typescript
// ❌ Bad: States the obvious
// Increment counter
count++;

// ✅ Good: Explains why
// Reset counter every 100 iterations to prevent overflow
if (count >= 100) count = 0;
```

### JSDoc for Public APIs

```typescript
/**
 * Creates a new event bus instance.
 *
 * @example
 * ```typescript
 * const eventBus = createEventBus();
 * eventBus.emit({ type: 'user.login' });
 * ```
 *
 * @returns EventBus instance
 */
export function createEventBus(): EventBus {
  // ...
}
```

### README Files

Each package should have a README.md with:
- Package purpose
- Installation
- Quick start example
- API overview
- Links to full documentation

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build, CI, dependencies

**Examples:**

```bash
feat(state): add wildcard event subscriptions

Allows subscribing to events using wildcard patterns like 'user.*'

Closes #123

---

fix(react): resolve useEffect dependency warning

useEventBus hook was missing 'on' in dependency array

---

docs(architecture): clarify layer responsibilities

Added diagrams and examples for each layer
```

## AI Guidelines

HAI3 includes comprehensive AI development guidelines in `.ai/GUIDELINES.md`. These help AI agents contribute effectively.

### Structure

- **Routing:** Direct AI to appropriate docs
- **Rules:** Architecture and coding rules
- **Patterns:** Common patterns and examples
- **Corrections:** How to fix violations

### For AI Agents

When working with HAI3:
1. Read `.ai/GUIDELINES.md` first
2. Follow routing to specific topics
3. Apply rules strictly
4. Use correction policy for fixes

### For Humans

The `.ai/` folder also helps humans:
- Understand architecture decisions
- Learn patterns and conventions
- See how to structure new features

[View Guidelines](https://github.com/HAI3org/HAI3/blob/main/.ai/GUIDELINES.md)

## Code Review Checklist

**Before Submitting PR:**
- [ ] Code builds without errors
- [ ] All tests pass
- [ ] New code has tests
- [ ] Documentation updated
- [ ] No `any`/`unknown` types
- [ ] No layer violations
- [ ] Conventional commit messages

**Reviewers Check:**
- [ ] Follows architecture rules
- [ ] Code is clear and maintainable
- [ ] Tests are comprehensive
- [ ] Documentation is accurate
- [ ] No breaking changes (or properly documented)

## Performance Guidelines

**Optimize Selectively:**
- Don't optimize prematurely
- Measure first, optimize second
- Focus on hot paths

**React Performance:**
```typescript
// ✅ Good: Memoize expensive computations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.price - b.price),
  [items]
);

// ✅ Good: Prevent unnecessary re-renders
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // ...
});
```

**Bundle Size:**
- Lazy load screensets
- Tree-shake unused code
- Monitor bundle size in CI

## Security Guidelines

**Never:**
- Commit secrets or API keys
- Use `eval()` or `Function()` constructor
- Trust user input without validation
- Expose sensitive data in client code

**Always:**
- Sanitize user input
- Validate data from external sources
- Use HTTPS for API calls
- Follow OWASP guidelines

## Accessibility

**Semantic HTML:**
```typescript
// ✅ Good
<button onClick={handleClick}>Submit</button>

// ❌ Bad
<div onClick={handleClick}>Submit</div>
```

**ARIA Labels:**
```typescript
<button aria-label="Close dialog" onClick={onClose}>
  ×
</button>
```

**Keyboard Navigation:**
- All interactive elements accessible via keyboard
- Logical tab order
- Focus indicators visible

## Related Documentation

- [Contributing Overview](/hai3/contributing/)
- [Architecture Rules](/hai3/contributing/architecture-rules)
- [.ai/GUIDELINES.md](https://github.com/HAI3org/HAI3/blob/main/.ai/GUIDELINES.md) (GitHub)
