---
name: "OPSX: Cleanup"
description: Fully remove all OpenSpec artifacts, skills, commands, and config references from the project
category: Workflow
tags: [workflow, cleanup, openspec, destructive]
---

Fully remove all OpenSpec footprints from this project.

**Input**: No arguments required. The workflow is interactive and will prompt for confirmation at each destructive phase.

**Steps**

1. Read and follow `architecture/workflows/cleanup-openspec.md` from Phase 1 through Phase 9
2. Execute each phase sequentially — do NOT skip phases
3. Present the inventory (Phase 1) before asking for confirmation (Phase 2)
4. Require explicit user confirmation before each destructive phase (Phases 3-7)
5. Run verification (Phase 8) and present the final summary (Phase 9)

**Guardrails**
- STOP if git working tree is dirty — ask user to commit or stash first
- NEVER delete files without user confirmation
- NEVER modify Cypilot SDLC artifacts (PRD, DESIGN, FEATURE, ADR, DECOMPOSITION) even if they mention OpenSpec — those are historical references, not footprints
- Always present the inventory summary before any deletions
- Always verify after each deletion phase
- All changes remain uncommitted — user decides when to commit
