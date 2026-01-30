---
title: Development Workflows
description: CI/CD, code review, testing, and quality gates
---

# Development Workflows

## Overview

Development workflows define how code progresses from local development to production, including quality gates and automation.

## Workflow Stages

### Local Development

**Setup:**
1. Clone repository
2. Install dependencies
3. Run local environment
4. Run tests

**Development loop:**
1. Create feature branch
2. Write code
3. Run tests locally
4. Commit changes
5. Push to remote

**Pre-commit hooks:**
- Lint code
- Run type checker
- Run tests
- Check architecture rules

### Code Review (Pull Requests)

**PR Creation:**
1. Push branch
2. Create PR with description
3. Link related issues
4. Request reviewers

**PR Description Template:**
```markdown
## What
Brief description of changes

## Why
Problem being solved

## How
Approach taken

## Testing
How to verify this works

## Screenshots
(if UI changes)
```

**Review Process:**
1. Automated checks run (CI)
2. Reviewers provide feedback
3. Author addresses comments
4. Approval required (1-2 reviewers)
5. Merge when approved and green

**Review Guidelines:**
- Review within 24 hours
- Focus on logic, not style (linter handles style)
- Ask questions, don't demand changes
- Approve with minor nits

### Continuous Integration (CI)

**Automated checks on every PR:**
```yaml
jobs:
  test:
    - Install dependencies
    - Run linter
    - Run type checker
    - Run unit tests
    - Run integration tests
    - Check code coverage (>80%)

  validate:
    - Architecture validation
    - Security scan
    - Dependency audit

  build:
    - Build application
    - Check bundle size
```

**Failure = block merge**

### Continuous Deployment (CD)

**Deployment Pipeline:**
```
Merge to main
    ↓
Build production bundle
    ↓
Run tests (again)
    ↓
Deploy to staging
    ↓
Run smoke tests
    ↓
Manual approval (optional)
    ↓
Deploy to production
    ↓
Monitor for errors
```

**Rollback strategy:**
- Keep previous version ready
- Monitor error rates
- Auto-rollback if errors spike

## Quality Gates

**Must pass before merge:**
- ✅ All tests pass
- ✅ Linter passes
- ✅ Type checks pass
- ✅ Code coverage ≥80%
- ✅ Architecture validation passes
- ✅ Security scan clean
- ✅ 1-2 approvals from reviewers

**Additional gates (configurable):**
- Performance benchmarks
- Bundle size limits
- Accessibility checks

## Branching Strategies

### Feature Branches (Recommended)

**Flow:**
```
main (always deployable)
  ├─ feature/user-auth
  ├─ fix/login-bug
  └─ refactor/api-client
```

**Rules:**
- Branch from `main`
- PR to merge back to `main`
- Delete branch after merge
- Keep branches short-lived (<1 week)

**Branch naming:**
- `feature/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code improvements
- `docs/*`: Documentation

### Trunk-Based Development

**Flow:**
```
main (trunk)
  ├─ short-lived branch (< 1 day)
  └─ short-lived branch (< 1 day)
```

**Rules:**
- Commit to `main` frequently
- Use feature flags for incomplete work
- Very short-lived branches

**Best for:** Small teams, high trust

### Git Flow

**Flow:**
```
main (production)
  ↑
develop (integration)
  ├─ feature/*
  ├─ release/*
  └─ hotfix/*
```

**Best for:** Scheduled releases, larger teams

## Example Workflow (Feature Branches)

```bash
# 1. Create branch
git checkout -b feature/user-profile

# 2. Develop
# Write code, run tests locally

# 3. Commit
git add .
git commit -m "feat(profile): add user profile editing"

# 4. Push
git push origin feature/user-profile

# 5. Create PR on GitHub/GitLab

# 6. Address review feedback
git add .
git commit -m "fix: address review feedback"
git push

# 7. After approval and CI green, merge

# 8. Pull latest main
git checkout main
git pull origin main

# 9. Delete feature branch
git branch -d feature/user-profile
```

## Related Documentation

- [Technical Layer Overview](/lifecycle/technical/)
- [AI Integration](/lifecycle/technical/ai-integration)
- [HAI3 Contributing](/hai3/contributing/)
