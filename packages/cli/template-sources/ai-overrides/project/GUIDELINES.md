# Project Guidelines

## AI WORKFLOW (REQUIRED)
- Read this file before assuming project-specific rules.
- Use ROUTING to load the project target that matches the task.
- Keep edits in this directory project-specific and editable by the adopter.

## ROUTING
- Unit tests and test verification -> .ai/project/targets/UNIT_TESTING.md

## CRITICAL RULES
- REQUIRED: This directory is the project-owned extension point for local conventions.
- REQUIRED: Keep project-specific rules short and concrete.
- REQUIRED: Update or add project targets here instead of editing generated tool files directly.

## ADOPTER NOTES
- This directory is preserved during `frontx update`; edits here are not overwritten.
- Editing generated project targets (for example `project/targets/UNIT_TESTING.md`) records customized unit-test guidance for this repository.
- Restoring a target from the CLI template baseline (for example re-copying `UNIT_TESTING.md` from a fresh `frontx create` output) resets DEFAULT guidance when you replace local edits wholesale.
- To add a project-specific rule set:
  1. Create a target file under `project/targets/<TOPIC>.md` following the same format as existing targets (see `project/targets/UNIT_TESTING.md`).
  2. Add a routing entry above, e.g. `Domain models -> .ai/project/targets/DOMAIN.md`.
  3. Keep entries short; link out rather than duplicating upstream rules.
