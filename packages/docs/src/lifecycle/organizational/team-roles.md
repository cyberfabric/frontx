---
title: Team Roles
description: Defining roles with clear responsibilities and interfaces
---

# Team Roles

## Overview

Clear role definitions prevent confusion, enable autonomy, and ensure accountability. Each role has distinct responsibilities and interfaces with others.

## Core Roles

### Product Manager

**Owns:** Product strategy, prioritization, roadmap
**Delivers:** PRDs, roadmaps, prioritized backlog
**Interfaces with:** All roles for requirements and feedback

**Responsibilities:**
- Define product vision and strategy
- Prioritize features based on business value
- Create and maintain product roadmap
- Write product requirements documents (PRDs)
- Communicate with stakeholders
- Track metrics and iterate

**Decisions:**
- What features to build
- Priority order of work
- Success metrics definition
- Product positioning

### Designer

**Owns:** User experience and visual design
**Delivers:** Mockups, prototypes, design specs
**Interfaces with:** PM for requirements, Engineers for implementation

**Responsibilities:**
- Design user flows and wireframes
- Create high-fidelity mockups
- Build interactive prototypes
- Maintain design system
- Conduct usability testing
- Provide implementation guidance

**Decisions:**
- Visual design and branding
- Interaction patterns
- Information architecture
- Design system components

### Engineer

**Owns:** Code implementation and quality
**Delivers:** Working code, tests, documentation
**Interfaces with:** Designer for specs, PM for clarifications, Tech Lead for guidance

**Responsibilities:**
- Implement features per specifications
- Write automated tests
- Fix bugs and issues
- Refactor and improve code quality
- Document code and APIs
- Review peers' code

**Decisions:**
- Implementation approach (within constraints)
- Code structure and organization
- Technology choices (within architecture)
- Testing strategy

### Tech Lead / Architect

**Owns:** Technical architecture and direction
**Delivers:** Architecture docs, technical decisions, mentorship
**Interfaces with:** Engineers for guidance, PM for feasibility

**Responsibilities:**
- Define system architecture
- Make technology choices
- Review code quality
- Mentor team members
- Resolve technical blockers
- Balance tech debt and features

**Decisions:**
- Architecture patterns
- Technology stack
- Technical standards
- Performance targets

### AI Agent

**Owns:** Code generation, analysis, documentation
**Delivers:** Generated code, test suites, docs, insights
**Interfaces with:** All roles as assistant/tool

**Responsibilities:**
- Generate code from specifications
- Create test suites
- Write documentation
- Analyze code for issues
- Suggest improvements
- Answer technical questions

**Boundaries:**
- Cannot make product decisions
- Cannot override human decisions
- Cannot deploy to production
- Must follow architecture rules

## Role Interfaces

### PM → Designer
**Handoff:** PRD with user stories, acceptance criteria
**Feedback:** Design reviews, usability test results

### Designer → Engineer
**Handoff:** Design specs, mockups, assets, interaction details
**Feedback:** Implementation questions, feasibility concerns

### PM → Engineer
**Handoff:** Prioritized backlog, clarified requirements
**Feedback:** Progress updates, technical constraints

### Tech Lead → Engineers
**Handoff:** Architecture decisions, technical standards
**Feedback:** Code reviews, technical discussions

### Human → AI Agent
**Handoff:** Clear specifications, context, constraints
**Feedback:** Code review, acceptance testing

## Deliverables by Role

| Role | Key Deliverables |
|------|------------------|
| Product Manager | PRD, Roadmap, User Stories, Success Metrics |
| Designer | Mockups, Prototypes, Design Specs, Style Guide |
| Engineer | Code, Tests, Documentation, Bug Fixes |
| Tech Lead | Architecture Docs, Technical Standards, Reviews |
| AI Agent | Generated Code, Tests, Docs, Analysis Reports |

## Related Documentation

- [Organizational Layer Overview](/lifecycle/organizational/)
- [Separation of Duties](/lifecycle/organizational/separation-of-duties)
- [Collaboration Model](/lifecycle/organizational/collaboration-model)
- [Terminology - Team Roles](/TERMINOLOGY#team-roles)
