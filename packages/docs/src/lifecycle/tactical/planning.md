---
title: Planning
description: Sprint planning, iteration planning, and estimation techniques
---

# Planning

## Overview

Planning converts roadmaps into executable work, balancing scope, time, and team capacity.

## Planning Approaches

### Agile/Scrum Planning

**Sprint Planning (2-week sprints):**
1. Review priorities from backlog
2. Team estimates tasks
3. Commit to sprint goal
4. Break down tasks

**Daily Standup:**
- Yesterday's progress
- Today's plan
- Blockers

**Sprint Review:**
Demo completed work

**Retrospective:**
Improve processes

### Kanban Planning

**Continuous flow:**
- No fixed iterations
- Pull work when capacity available
- Limit work-in-progress (WIP)

**Planning:**
- Prioritize backlog continuously
- Estimate on-demand
- Start highest priority work next

### Shape Up Planning

**6-week cycles:**
1. **Shaping (2 weeks):** Define projects, scope
2. **Building (6 weeks):** Team executes autonomously
3. **Cooldown (2 weeks):** Bug fixes, exploration

## Estimation Techniques

### Story Points

**Fibonacci scale:** 1, 2, 3, 5, 8, 13, 21

**Meaning:**
- 1 point: Few hours
- 2 points: Half day
- 3 points: 1 day
- 5 points: 2-3 days
- 8 points: 1 week
- 13+ points: Too large, break down

**Planning Poker:**
1. Present story
2. Discuss requirements
3. Each person estimates privately
4. Reveal simultaneously
5. Discuss differences
6. Re-estimate until consensus

### T-Shirt Sizing

**Scale:** XS, S, M, L, XL

**Use for:** Rough estimates, early planning

**Example:**
- XS: Bug fix
- S: Simple feature
- M: Complex feature
- L: Multi-week initiative
- XL: Quarter-long project

### Time-Based Estimation

**Caution:** Often inaccurate due to unknown unknowns

**Better approach:**
- Estimate in ideal hours (no interruptions)
- Multiply by 2-3x for real-world time
- Track actual vs. estimated for calibration

## Capacity Planning

**Calculate team capacity:**
```
Total capacity =
  (Team size × Hours per sprint) -
  (Meetings + PTO + Buffer)

Example:
5 engineers × 80 hours/sprint = 400 hours
- 50 hours (meetings, standup)
- 40 hours (PTO)
- 60 hours (20% buffer for unknowns)
= 250 hours capacity
```

**Allocate capacity:**
- 70-80%: Sprint committed work
- 20-30%: Bug fixes, tech debt, unknowns

## AI-Assisted Planning

**AI can:**
- Suggest task breakdown from specs
- Estimate complexity based on historical data
- Identify dependencies automatically
- Flag risks or missing requirements

**Example workflow:**
1. Feed AI: Spec + historical velocity data
2. Ask: "Break this into tasks and estimate story points"
3. Review AI suggestions
4. Adjust based on team knowledge
5. Use as input for sprint planning

## Related Documentation

- [Tactical Layer Overview](/lifecycle/tactical/)
- [Task Breakdown](/lifecycle/tactical/task-breakdown)
- [Roadmap Planning](/lifecycle/strategic/roadmap-planning)
