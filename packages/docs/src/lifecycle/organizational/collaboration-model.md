---
title: Collaboration Model
description: Creating effective communication patterns and team workflows
---

# Collaboration Model

## Overview

Effective collaboration balances synchronous and asynchronous communication, defines workflows, and integrates AI as a team participant.

## Communication Patterns

### Synchronous Communication

**When to use:** Complex discussions, decisions, brainstorming

**Formats:**
- **Daily Standup** (15 min): Progress, blockers, plan
- **Sprint Planning** (2 hours): Commit to sprint work
- **Design Review** (1 hour): Critique designs together
- **Pairing Sessions** (variable): Collaborate on complex problems

**Best practices:**
- Schedule in advance
- Have agenda
- Document decisions
- Respect time limits

### Asynchronous Communication

**When to use:** Status updates, reviews, documentation

**Formats:**
- **Written Updates:** Progress reports, announcements
- **Pull Requests:** Code review with comments
- **Design Docs:** Technical proposals for feedback
- **Slack/Discord:** Quick questions, coordination

**Best practices:**
- Be explicit and detailed
- Include context
- Set response expectations
- Thread conversations

### Documentation

**Living Docs:**
- Architecture decisions (ADRs)
- Team processes and workflows
- Onboarding guides
- API documentation

**How-to Guides:**
- Setup instructions
- Common tasks
- Troubleshooting
- Best practices

## Workflow Patterns

### Agile Ceremonies

**Sprint Planning:**
- Review priorities
- Break down work
- Estimate effort
- Commit to sprint

**Daily Standup:**
- Yesterday's progress
- Today's plan
- Blockers

**Sprint Review:**
- Demo completed work
- Gather feedback
- Celebrate wins

**Retrospective:**
- What went well
- What to improve
- Action items

### Code Review Process

**Pull Request Flow:**
1. Developer: Create PR with description
2. CI: Run automated tests
3. Reviewer: Review code, add comments
4. Developer: Address feedback
5. Reviewer: Approve when ready
6. Developer: Merge and deploy

**Review Guidelines:**
- Review within 24 hours
- Be constructive, not critical
- Explain "why" behind suggestions
- Approve with minor nits

### Design Review Process

**Design Critique Flow:**
1. Designer: Share mockups + context
2. Team: Ask clarifying questions
3. Team: Provide constructive feedback
4. Designer: Iterate on feedback
5. Team: Sign off when ready

**Critique Guidelines:**
- Focus on user needs, not preferences
- Suggest improvements, don't just criticize
- Consider constraints (time, tech, business)

## AI Integration in Workflows

### AI as Team Member

**Standup Participation:**
AI reports what it worked on, plans, blockers (via human proxy or automation)

**PR Reviews:**
AI reviews code for style, bugs, improvements before human review

**Documentation:**
AI drafts docs from code, specs from requirements

### AI + Human Pairing

**Collaborative Coding:**
- Human: Describes what to build
- AI: Generates initial implementation
- Human: Reviews, refines, guides
- AI: Adjusts based on feedback

**Iterative Process:**
1. Human provides context and goals
2. AI proposes solution
3. Human reviews and requests changes
4. AI refines
5. Repeat until acceptable
6. Human approves and commits

### AI Review and Feedback

**AI Pre-Review:**
Before human review, AI checks:
- Code style violations
- Potential bugs
- Missing tests
- Documentation gaps

**AI Suggestions:**
AI proposes:
- Performance improvements
- Better patterns
- Missing edge cases
- Refactoring opportunities

## Decision Making

### Consensus Building

**For:** Major decisions affecting multiple people/teams

**Process:**
1. Propose decision with context
2. Gather input from affected parties
3. Address concerns
4. Seek agreement
5. Document decision and rationale

### Delegation

**For:** Decisions within someone's area of responsibility

**Process:**
1. Assign decision owner
2. Owner gathers input (optional)
3. Owner decides
4. Owner communicates decision

**Example Delegation:**
- PM: Product decisions (features, priorities)
- Designer: Design decisions (UX, visual)
- Engineer: Technical decisions (implementation)
- Tech Lead: Architecture decisions (patterns, stack)

### Escalation

**When:** Disagreement, unclear ownership, blocked decision

**Process:**
1. Attempt resolution at team level
2. If unresolved, escalate to manager
3. Manager facilitates resolution
4. Document outcome

**Common Escalations:**
- PM and Designer disagree on UX
- Engineers disagree on architecture
- Team blocked by external dependency

## Tools and Practices

**Project Management:**
- Jira, Linear, Asana: Track work
- GitHub Projects: Kanban boards
- Notion, Confluence: Documentation

**Communication:**
- Slack, Discord: Real-time chat
- Email: Formal communications
- Zoom, Meet: Video calls

**Code Collaboration:**
- GitHub, GitLab: Code hosting, PR reviews
- VS Code Live Share: Real-time pairing

**Design Collaboration:**
- Figma: Design files, comments
- Miro, FigJam: Brainstorming
- Loom: Async video walkthroughs

## Best Practices

**✅ Default to Async**
Don't have meetings for what can be written

**✅ Document Decisions**
Write down what was decided and why

**✅ Clear Ownership**
Every task has one owner

**✅ Regular Check-ins**
Sync frequently to catch issues early

**✅ Feedback Loops**
Iterate on processes based on what works

## Related Documentation

- [Organizational Layer Overview](/lifecycle/organizational/)
- [Team Roles](/lifecycle/organizational/team-roles)
- [Separation of Duties](/lifecycle/organizational/separation-of-duties)
