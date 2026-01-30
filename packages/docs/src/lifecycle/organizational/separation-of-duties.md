---
title: Separation of Duties
description: Establishing boundaries and handoff processes between roles
---

# Separation of Duties

## Overview

Separation of duties establishes boundaries, preventing role confusion and ensuring clear accountability. Well-defined boundaries enable autonomy.

## Key Principles

### Clear Ownership
Each deliverable has ONE owner responsible for quality and delivery. Others provide input, but owner makes final decisions.

### Defined Handoffs
Work passes between roles at specific milestones with clear acceptance criteria.

### Decision Rights
Each role has authority over specific decisions. No shared decision-making without explicit process.

### Escalation Paths
When boundaries are unclear, escalate to next level (manager, architect, executive).

## Boundaries

### Product Manager ↔ Designer

**PM owns:** What to build, why, success criteria
**Designer owns:** How it looks, how it works, interaction design

**Boundary:**
- PM doesn't dictate visual design
- Designer doesn't change scope/requirements

**Handoff:**
PM writes PRD → Designer creates mockups → PM reviews for requirements alignment

### Designer ↔ Engineer

**Designer owns:** User experience, visual design
**Engineer owns:** Implementation, technical approach

**Boundary:**
- Designer doesn't dictate code structure
- Engineer doesn't change UX without designer approval

**Handoff:**
Designer delivers specs → Engineer implements → Designer reviews for design fidelity

**Gray area:** Responsive behavior, performance trade-offs
**Resolution:** Collaborate on solution respecting both constraints

### Product Manager ↔ Engineer

**PM owns:** Feature requirements, priority
**Engineer owns:** Technical approach, timeline estimates

**Boundary:**
- PM doesn't dictate implementation
- Engineer doesn't change requirements without PM approval

**Handoff:**
PM defines requirements → Engineer estimates effort → PM prioritizes → Engineer implements

### Human ↔ AI Agent

**Human owns:** Final decisions, accountability, quality
**AI owns:** Execution of well-defined tasks

**Boundary:**
- AI doesn't make product/design decisions
- AI doesn't deploy without human review
- Human doesn't bypass AI for routine tasks

**Handoff:**
Human specifies task → AI executes → Human reviews/approves → AI refines if needed

## Handoff Artifacts

### PM → Designer
- **PRD:** Problem, users, requirements, success metrics
- **User Stories:** As [user], I want [goal], so that [benefit]
- **Constraints:** Technical, timeline, budget limitations

### Designer → Engineer
- **Mockups:** High-fidelity screens (all states)
- **Specs:** Spacing, colors, fonts, interactions
- **Assets:** Icons, images, exported resources
- **Flow Diagrams:** User journeys, edge cases

### PM → Engineer
- **Prioritized Backlog:** Ordered list of work
- **Acceptance Criteria:** How to verify completion
- **Dependencies:** Related work, blockers

### Tech Lead → Engineers
- **Architecture Docs:** System design, patterns
- **Technical Standards:** Code style, testing requirements
- **Technical Decisions:** Technology choices, rationale

### Engineer → QA/Review
- **Code:** Implementation in version control
- **Tests:** Automated test coverage
- **Documentation:** How it works, how to use

## Common Pitfalls

### ❌ Boundary Violations

**Problem:** Designer tells engineer how to structure code
**Fix:** Designer specifies outcomes, engineer chooses implementation

**Problem:** Engineer changes UX without designer input
**Fix:** Raise concern, collaborate on solution

**Problem:** PM bypasses designer, gives mockups to engineer
**Fix:** Establish workflow: PM → Designer → Engineer

### ❌ Unclear Ownership

**Problem:** Feature fails, no one accountable
**Fix:** Assign clear owner for each deliverable

**Problem:** Two people working on same thing
**Fix:** Use project management tool, assign tasks

### ❌ Poor Handoffs

**Problem:** Designer gives incomplete specs, engineer guesses
**Fix:** Define handoff checklist, review before accepting

**Problem:** Engineer implements without reading full spec
**Fix:** Require spec review before starting work

### ❌ AI Overstepping

**Problem:** AI makes product decisions autonomously
**Fix:** AI proposes options, human decides

**Problem:** AI deploys code without review
**Fix:** Require human approval for production changes

## Best Practices

**✅ Written Handoffs**
Use tickets, docs, PRs - not verbal agreements

**✅ Acceptance Criteria**
Define "done" before starting work

**✅ Review Points**
Check work at handoff boundaries

**✅ Escalation Process**
Document who resolves disputes

**✅ Regular Retrospectives**
Improve processes based on friction points

## Related Documentation

- [Organizational Layer Overview](/lifecycle/organizational/)
- [Team Roles](/lifecycle/organizational/team-roles)
- [Collaboration Model](/lifecycle/organizational/collaboration-model)
