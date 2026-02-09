---
title: Feature Prioritization
description: Using frameworks to prioritize features by business value
---

# Feature Prioritization

## Overview

Feature prioritization determines build order based on value, effort, and strategic fit. It prevents building the wrong things.

**Purpose:** Rank features by impact
**Audience:** Product managers, engineering leads
**Output:** Scored feature list ready for roadmap

## Prioritization Frameworks

### RICE Framework

**Formula:** (Reach × Impact × Confidence) / Effort

| Factor | Description | Scale |
|--------|-------------|-------|
| Reach | Users affected per period | # of users/month |
| Impact | Impact per user | 3=Massive, 2=High, 1=Medium, 0.5=Low |
| Confidence | Certainty of estimates | 100%=High, 80%=Medium, 50%=Low |
| Effort | Person-months required | # of months |

**Example:**
```
Feature: AI-powered prioritization
Reach: 1000 users/month (early users)
Impact: 3 (massive time savings)
Confidence: 80%
Effort: 2 person-months

RICE = (1000 × 3 × 0.8) / 2 = 1200
```

### MoSCoW Method

Categorize features:
- **Must have:** Core functionality, can't launch without
- **Should have:** Important but not critical
- **Could have:** Nice-to-haves
- **Won't have:** Out of scope for this release

**When to use:** Planning specific releases

### Value vs. Effort Matrix

Plot features on 2x2 grid:

```
High Value │ Do First  │ Plan Carefully
           │ (Quick    │ (Strategic
           │  Wins)    │  Bets)
───────────┼───────────┼────────────────
           │           │
Low Value  │ Reconsider│ Avoid
           │ (Fill-ins)│ (Time Sinks)
           │           │
           └───────────┴────────────────
           Low Effort   High Effort
```

**Focus on:** High value, low effort (quick wins) first

### Kano Model

Features fall into categories:
- **Basic:** Expected (must have)
- **Performance:** More is better (should have)
- **Excitement:** Unexpected delight (could have)

### Opportunity Scoring

Score importance vs. satisfaction:

| Feature | Importance (1-10) | Satisfaction (1-10) | Opportunity (I + (I - S)) |
|---------|-------------------|---------------------|---------------------------|
| A | 9 | 3 | 15 |
| B | 7 | 6 | 8 |
| C | 8 | 7 | 9 |

Higher opportunity score = bigger gap to fill

## Practical Prioritization Process

**Step 1: List Features**
Collect from: customer requests, market analysis, team ideas

**Step 2: Choose Framework**
RICE for data-driven, MoSCoW for release planning

**Step 3: Score Features**
Rate each feature using chosen framework

**Step 4: Sort by Score**
Rank features by final score

**Step 5: Apply Constraints**
Consider: dependencies, team capacity, strategic themes

**Step 6: Review with Stakeholders**
Present rationale, adjust based on feedback

## AI Integration

**AI can:**
- Auto-score features based on historical data
- Identify feature dependencies
- Suggest similar features from other products
- Analyze customer feedback for demand signals

**Example workflow:**
1. Feed AI: customer interviews, support tickets, usage data
2. Ask: "Score these features using RICE framework based on this data"
3. Review AI scores
4. Adjust based on strategic factors

## Deliverables

- **Prioritized Feature List** (scored and ranked)
- **Rationale Document** (why this order?)
- **Trade-off Analysis** (what we're not doing and why)
- **Roadmap Input** (timeline proposal)

## Related Documentation

- [Strategic Layer Overview](/lifecycle/strategic/)
- [Vision Definition](/lifecycle/strategic/vision-definition)
- [Roadmap Planning](/lifecycle/strategic/roadmap-planning)
