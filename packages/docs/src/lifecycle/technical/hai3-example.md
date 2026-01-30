---
title: HAI3 as Example
description: How HAI3 implements Technical Layer principles
---

# HAI3 as Technical Layer Example

## Overview

HAI3 embodies Technical Layer principles from the AI Product Lifecycle. It's built using the same patterns it enables.

## Architecture Principles in HAI3

### Layered Architecture

HAI3 enforces strict 4-layer architecture:

```
L4: App (@your/app)          - Your code
     ↓
L3: React (@hai3/react)       - React bindings
     ↓
L2: Framework (@hai3/framework) - Plugin system
     ↓
L1: SDK (@hai3/state, @hai3/api) - Independent packages
```

**Enforced by:**
- TypeScript path configuration
- Architecture validation scripts
- CI checks blocking reverse dependencies

[Learn more →](/hai3/architecture/layers)

### Event-Driven Design

All cross-domain communication uses the event bus:

**Example:**
```typescript
// Screenset A emits event
eventBus.emit({ type: 'user.profile.updated' });

// Screenset B listens (decoupled)
eventBus.on('user.profile.updated', handler);
```

**Benefits demonstrated:**
- Screensets don't know about each other
- Easy to add/remove features
- Clear event contracts

[Learn more →](/hai3/concepts/event-driven)

### Plugin System (Open/Closed Principle)

HAI3 core is stable, extended through plugins:

```typescript
const app = createHAI3()
  .use(screensetPlugin)  // Core plugin
  .use(themePlugin)      // Core plugin
  .use(yourPlugin)       // Your extension
  .build();
```

**Open for extension, closed for modification.**

[Learn more →](/hai3/concepts/plugins)

### Type Safety

**Strict TypeScript:**
- No `any` or `unknown` types allowed
- Explicit return types required
- Strict null checks enabled

**Example:**
```typescript
// ✅ HAI3 code
export function createEventBus<T>(): EventBus<T> {
  // Fully typed
}

// ❌ Not allowed
export function createEventBus(): any {
  // Would fail CI
}
```

## Development Workflows in HAI3

### Architecture Validation

**Commands:**
```bash
npm run arch:check    # All checks
npm run arch:layers   # Validate layer dependencies
npm run arch:deps     # Check circular dependencies
npm run arch:sdk      # Validate SDK isolation
```

**CI Integration:**
Every PR must pass architecture validation before merge.

**What it catches:**
- L1 importing from L2 (layer violation)
- Circular dependencies
- SDK packages depending on each other

### AI Guidelines

**Location:** `.ai/GUIDELINES.md`

**Structure:**
```
.ai/
├── GUIDELINES.md       # Main guidelines
├── ROUTING.md          # Topic routing
└── corrections/        # Fix patterns
```

**Purpose:**
- Guide AI agents working on HAI3
- Document architecture rules
- Provide correction procedures
- Enable consistent AI contributions

**Usage:**
AI agents read guidelines before contributing, ensuring adherence to architecture and coding standards.

### Quality Gates

**Pre-commit hooks:**
- ESLint (code style)
- TypeScript (type checking)
- Prettier (formatting)

**CI checks (required for merge):**
- All tests pass (>80% coverage)
- Linter passes
- Type checks pass
- Architecture validation passes
- Build succeeds
- 2 approvals from maintainers

**Result:** High code quality, consistent style, no architecture violations.

## Lessons from Building HAI3

### What Worked Well

✅ **Strict Architecture:**
Enforcing layers prevented spaghetti code

✅ **Event-Driven:**
Enabled true microfrontend independence

✅ **AI Guidelines:**
Made HAI3 easy for AI agents to contribute to

✅ **Type Safety:**
Caught bugs early, improved refactoring confidence

### Challenges Faced

⚠️ **Initial Overhead:**
Setting up architecture validation took time upfront

⚠️ **Learning Curve:**
Team needed time to understand layer boundaries

⚠️ **Breaking Changes:**
Strict typing made some refactors harder

### Key Learnings

**1. Architecture enforcement is worth it**
Early investment in validation prevented technical debt

**2. AI agents need clear guidelines**
`.ai/` folder structure significantly improved AI contributions

**3. Event bus requires discipline**
Need clear event naming conventions and contracts

**4. Type safety pays dividends**
Initial effort offset by fewer runtime bugs

## Applying HAI3 Principles to Your Project

### Start with Layered Architecture

**Even without HAI3, use layers:**
```
Your App
├── presentation/ (UI components)
├── business/     (Business logic)
├── data/         (API clients)
└── domain/       (Models, types)
```

**Rule:** Lower layers don't import from upper layers

### Adopt Event-Driven Communication

**Use an event bus:**
```typescript
// Any event bus library works
import EventEmitter from 'events';
const eventBus = new EventEmitter();

// Emit events instead of direct calls
eventBus.emit('order.placed', order);

// Listen from other modules
eventBus.on('order.placed', sendEmail);
```

### Create AI Guidelines

**Even for small projects:**
```
.ai/
└── GUIDELINES.md   # How AI should work on your codebase
```

**Include:**
- Architecture rules
- Coding standards
- Common patterns
- What to avoid

### Enforce with Automation

**Set up validation:**
- Linter for style
- Type checker for types
- Custom scripts for architecture rules
- CI to block violations

**Example (package.json):**
```json
{
  "scripts": {
    "validate": "npm run lint && npm run typecheck && npm run arch:check",
    "arch:check": "node scripts/validate-architecture.js"
  }
}
```

### Document Decisions

**Use ADRs** (Architecture Decision Records):
```markdown
# ADR-001: Use Event Bus for Module Communication

## Context
Modules need to communicate without tight coupling.

## Decision
Use event bus for all cross-module communication.

## Consequences
+ Loose coupling
+ Easy to add/remove modules
- Harder to trace flows
```

**Store in:** `/docs/architecture/decisions/`

## Related Documentation

- [Technical Layer Overview](/lifecycle/technical/)
- [HAI3 Architecture](/hai3/architecture/overview)
- [Plugin System](/hai3/concepts/plugins)
- [Contributing to HAI3](/hai3/contributing/)

## Related Documentation

- [Technical Layer Overview](/lifecycle/technical/)
- [HAI3 Architecture](/hai3/architecture/overview)
- [HAI3 Manifest](/hai3/architecture/manifest)
- [Contributing to HAI3](/hai3/contributing/)
