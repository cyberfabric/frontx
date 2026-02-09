---
title: Task Breakdown
description: Decomposing features into implementable, sized tasks
---

# Task Breakdown

## Overview

Task breakdown decomposes features into small, independent, estimable units of work.

## Breakdown Principles

### Vertical Slicing

Build end-to-end functionality in thin slices.

**Example: User Login**
```
❌ Bad (horizontal):
1. Build all UI screens
2. Build all API endpoints
3. Build all database tables
4. Connect everything

✅ Good (vertical):
Slice 1: Email/password login (UI → API → DB)
Slice 2: Remember me functionality
Slice 3: Error handling and validation
Slice 4: Password strength requirements
```

**Benefits:**
- Delivers value incrementally
- Tests full stack early
- Reduces integration risk

### Horizontal Slicing

When vertical slicing isn't possible, work layer-by-layer.

**Use when:**
- Infrastructure must be built first
- Refactoring existing systems
- Breaking down monoliths

**Example:**
1. Database schema migration
2. API layer implementation
3. UI integration

### INVEST Criteria

**Independent:** Can be completed without other tasks
**Negotiable:** Details can be adjusted
**Valuable:** Delivers user/business value
**Estimable:** Can be sized with confidence
**Small:** Completable in 1-3 days
**Testable:** Clear success criteria

## Task Sizing

**Target size:** 1-3 days per task

**If task > 3 days:**
Break it down further

**If task < 4 hours:**
Consider combining with related tasks

**Example breakdown:**
```
Feature: User Profile (8 days) ← Too large

↓ Break down ↓

1. Create user profile form UI (2 days)
2. Add profile update API endpoint (1 day)
3. Integrate UI with API (1 day)
4. Add profile photo upload (2 days)
5. Write tests (1 day)
6. Add validation (1 day)
```

## Dependency Mapping

**Identify blocking relationships:**

```
Task A: Create database schema
  ↓ (blocks)
Task B: Build API endpoints
  ↓ (blocks)
Task C: Build UI
```

**Minimize dependencies:**
- Parallel work when possible
- Mock dependencies
- Stub interfaces

**Example:**
```
Instead of:
Backend done → Frontend starts

Do:
Backend and Frontend start together
Frontend uses mocked API
Integration happens later
```

## AI-Assisted Breakdown

**AI excels at:**
- Analyzing specs and extracting tasks
- Suggesting logical sequences
- Identifying dependencies
- Estimating complexity

**Workflow:**
1. Provide spec to AI
2. Request task breakdown
3. AI proposes list of tasks with estimates
4. Human reviews and adjusts
5. Use as input for sprint planning

**Example prompt:**
```
"Given this feature specification:
[paste spec]

Break this into tasks following these criteria:
- Each task should be 1-3 days
- Use vertical slicing where possible
- Identify dependencies
- Include testing tasks
- Estimate complexity (1-8 points)"
```

**AI output example:**
```
1. Create user profile database schema (2 pts)
   Dependencies: None

2. Build GET /profile API endpoint (3 pts)
   Dependencies: Task 1

3. Build PUT /profile API endpoint (3 pts)
   Dependencies: Task 1

4. Create profile form UI component (5 pts)
   Dependencies: None (can mock API)

5. Integrate UI with API endpoints (2 pts)
   Dependencies: Tasks 2, 3, 4

6. Add profile photo upload (5 pts)
   Dependencies: Task 3

7. Write unit tests for API (3 pts)
   Dependencies: Tasks 2, 3

8. Write integration tests (3 pts)
   Dependencies: Task 5

Total: 26 story points (~2 sprints for team of 3)
```

## Related Documentation

- [Tactical Layer Overview](/lifecycle/tactical/)
- [Specifications](/lifecycle/tactical/specifications)
- [Planning](/lifecycle/tactical/planning)
