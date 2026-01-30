---
title: Specifications
description: Writing clear, complete specifications for features and changes
---

# Specifications

## Overview

Specifications translate requirements into detailed implementation guidance, reducing ambiguity and preventing rework.

## Specification Template

```markdown
# [Feature Name]

## Overview
Brief description and goal

## User Stories
- As [user], I want [goal], so that [benefit]

## Requirements
### Functional
1. System shall...
2. User can...

### Non-Functional
- Performance: Response time < 200ms
- Security: Role-based access control
- Accessibility: WCAG 2.1 AA compliant

## Acceptance Criteria
- [ ] User can log in with email/password
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to dashboard

## UI/UX
[Include mockups or wireframes]

## API Contracts
(If applicable)

## Edge Cases
- What if user enters invalid email?
- What if network fails during request?
- What if session expires?

## Dependencies
- Requires authentication service
- Blocks dashboard feature

## Out of Scope
- Social login (future enhancement)
- Password recovery (separate feature)
```

## Specification Types

### Feature Specifications (PRD)

**For:** New features or enhancements
**Written by:** Product Manager
**Audience:** Designers, Engineers

**Must include:**
- Problem statement
- Target users
- Success metrics
- Requirements
- Mockups/wireframes
- Acceptance criteria

### Technical Specifications (Design Doc)

**For:** Complex technical changes
**Written by:** Tech Lead / Senior Engineer
**Audience:** Engineering team

**Must include:**
- Problem and constraints
- Proposed solution
- Alternative approaches considered
- Architecture diagrams
- API designs
- Performance considerations
- Testing strategy

### API Specifications (API Contract)

**For:** Public or internal APIs
**Written by:** Backend Engineer / Tech Lead
**Audience:** API consumers

**Must include:**
- Endpoints and methods
- Request/response schemas
- Error codes
- Authentication
- Rate limits
- Examples

**Example:**
```yaml
POST /api/tasks
Authorization: Bearer {token}

Request:
{
  "title": "string (required, max 200 chars)",
  "description": "string (optional)",
  "due_date": "ISO 8601 date (optional)"
}

Response 201:
{
  "id": "uuid",
  "title": "string",
  "created_at": "ISO 8601 datetime"
}

Response 400: { "error": "validation_error", "details": [...] }
Response 401: { "error": "unauthorized" }
Response 429: { "error": "rate_limit_exceeded" }
```

## AI-Assisted Specification Writing

**AI can:**
- Generate initial spec from brief description
- Expand user stories into detailed requirements
- Identify edge cases
- Suggest acceptance criteria
- Draft API contracts

**Workflow:**
1. Human writes brief overview
2. AI expands into full spec
3. Human reviews and refines
4. AI fills gaps (edge cases, etc.)
5. Human approves final version

**Example prompt:**
"Given this feature idea: [description], create a complete specification including user stories, functional requirements, acceptance criteria, and edge cases."

## Related Documentation

- [Tactical Layer Overview](/lifecycle/tactical/)
- [Team Contracts](/lifecycle/tactical/contracts)
- [Task Breakdown](/lifecycle/tactical/task-breakdown)
