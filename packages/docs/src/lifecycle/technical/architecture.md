---
title: Architecture Patterns
description: Common patterns for scalable, maintainable applications
---

# Architecture Patterns

## Overview

Architecture patterns provide proven solutions for building scalable, maintainable systems. Choose patterns based on your constraints and goals.

## Key Patterns

### Layered Architecture

Organize code into layers with clear dependencies flowing in one direction.

**Layers:**
```
Presentation (UI)
    ↓
Business Logic
    ↓
Data Access
    ↓
Database
```

**Rules:**
- Upper layers can depend on lower layers
- Lower layers cannot depend on upper layers
- Each layer has clear responsibility

**Example (HAI3):**
```
L4: App (@your/app)
L3: React (@hai3/react)
L2: Framework (@hai3/framework)
L1: SDK (@hai3/state, @hai3/api)
```

### Event-Driven Architecture

Components communicate through events, not direct calls.

**Benefits:**
- Loose coupling
- Scalability
- Flexibility

**Pattern:**
```typescript
// Publisher
eventBus.emit({ type: 'order.placed', payload: order });

// Subscriber (elsewhere, decoupled)
eventBus.on('order.placed', (event) => {
  sendConfirmationEmail(event.payload);
  updateInventory(event.payload);
});
```

### Plugin Architecture

Core system + plugins for extensibility.

**Core + Plugins:**
```
Core System (minimal, stable)
  + Plugin A (feature set 1)
  + Plugin B (feature set 2)
  + Plugin C (custom extension)
```

**Benefits:**
- Extensibility without modifying core
- Optional features
- Third-party extensions

**Example (HAI3):**
```typescript
const app = createHAI3()
  .use(screensetPlugin)   // Core plugin
  .use(themePlugin)       // Core plugin
  .use(customPlugin)      // Your plugin
  .build();
```

### Microfrontend Architecture

Decompose frontend into independent modules owned by different teams.

**Structure:**
```
Shell App (routing, auth, layout)
  ├─ Dashboard MFE (Team A)
  ├─ Analytics MFE (Team B)
  └─ Settings MFE (Team C)
```

**Benefits:**
- Team autonomy
- Independent deployment
- Technology flexibility

**Implementation (HAI3 Screensets):**
Each screenset is a microfrontend - independently developed and deployed.

### Domain-Driven Design

Organize code by business domains, not technical layers.

**Structure:**
```
src/domains/
├── orders/
│   ├── models/
│   ├── services/
│   ├── ui/
│   └── api/
├── inventory/
└── shipping/
```

**Benefits:**
- Business logic grouped together
- Clear bounded contexts
- Easier to understand

## Architecture Decision Records (ADRs)

Document significant architecture decisions.

**Template:**
```markdown
# ADR-001: Use Event Bus for Cross-Domain Communication

## Status
Accepted

## Context
Multiple domains need to react to events from other domains.
Direct dependencies create tight coupling.

## Decision
Use event bus for all cross-domain communication.

## Consequences
**Positive:**
- Domains are decoupled
- Easy to add new listeners
- Clear event contracts

**Negative:**
- Harder to trace event flows
- Need event documentation
- Eventual consistency challenges

## Alternatives Considered
1. Direct function calls - rejected (tight coupling)
2. Shared service layer - rejected (still coupled)
```

**Location:** `/docs/architecture/decisions/`

**When to write ADR:**
- Major architecture change
- Technology choice
- Pattern adoption
- Solving significant problem

## Related Documentation

- [Technical Layer Overview](/lifecycle/technical/)
- [HAI3 Architecture](/hai3/architecture/overview)
- [Development Workflows](/lifecycle/technical/workflows)
