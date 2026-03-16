# Project Guidelines

This file is for project-specific coding standards, patterns, and rules that apply only to this particular project.

## Purpose

Add guidelines here that are specific to this project, such as:
- Domain-specific conventions (business logic naming, data models)
- Project-specific architectural decisions
- Migration guides for this project
- Testing strategies specific to this project
- Deployment procedures

## Structure

You can:
- Add guidelines directly in this file
- Create additional target files in `project/targets/` and route to them from this file
- Use the same routing format as the main GUIDELINES.md

## Preservation

This directory and all files within it are preserved during `hai3 update`. Your project guidelines will never be overwritten by HAI3 CLI updates.

## Example

```
## ROUTING

For project-specific domain patterns:
- Domain models -> .ai/project/targets/DOMAIN.md

For project migration guides:
- Migration procedures -> .ai/project/targets/MIGRATIONS.md
```

## Getting Started

1. Remove this placeholder content
2. Add your project-specific guidelines
3. Create target files in `project/targets/` as needed
4. Add routing entries to this file

For more information, see `.ai/targets/AI.md` documentation.
