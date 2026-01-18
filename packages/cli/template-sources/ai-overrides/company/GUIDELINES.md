# Company Guidelines

This file is for company-wide coding standards, patterns, and rules that apply across all projects in your organization.

## Purpose

Add guidelines here that should be followed by all developers in your company, such as:
- Code review standards
- Naming conventions specific to your organization
- Security policies
- Architectural patterns your company uses
- Third-party library preferences

## Structure

You can:
- Add guidelines directly in this file
- Create additional target files in `company/targets/` and route to them from this file
- Use the same routing format as the main GUIDELINES.md

## Preservation

This directory and all files within it are preserved during `hai3 update`. Your company guidelines will never be overwritten by HAI3 CLI updates.

## Example

```
## ROUTING

For company-wide code review process:
- Code review -> .ai/company/targets/CODE_REVIEW.md

For company security standards:
- Security patterns -> .ai/company/targets/SECURITY.md
```

## Getting Started

1. Remove this placeholder content
2. Add your company's guidelines
3. Create target files in `company/targets/` as needed
4. Add routing entries to this file

For more information, see `.ai/targets/AI.md` documentation.
