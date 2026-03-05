---
name: cypilot
description: "Invoke when user asks to do something with Cypilot, or wants to analyze/validate artifacts, or create/generate/implement anything using Cypilot workflows. Core capabilities: workflow routing (analyze/generate/auto-config); deterministic validation (structure, cross-refs, traceability, TOC); code↔artifact traceability with @cpt-* markers; spec coverage measurement; ID search/navigation; init/bootstrap; adapter + registry discovery; auto-configuration of brownfield projects (scan conventions, generate rules); kit management (install/update/migrate with three-way blueprint merge); TOC generation; agent integrations (Windsurf, Cursor, Claude, Copilot, OpenAI); v2→v3 migration. Kit sdlc: Artifacts: ADR, CODEBASE, DECOMPOSITION, DESIGN, FEATURE, PR-CODE-REVIEW-TEMPLATE, PR-REVIEW, PR-STATUS-REPORT-TEMPLATE, PRD; Workflows: pr-review, pr-status."
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, WebFetch
---


ALWAYS open and follow `{cypilot_path}/.core/skills/cypilot/SKILL.md`
