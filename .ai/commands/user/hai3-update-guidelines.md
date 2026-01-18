<!-- @standalone -->
# hai3:update-guidelines - Update Custom Guidelines

## AI WORKFLOW (REQUIRED)
1) Identify whether to update company or project guidelines.
2) Route to correct target file.
3) Read target file before making changes.
4) Apply minimal change.
5) Validate compliance.

## CONSTRAINTS
- MUST modify files in .ai/company/ or .ai/project/ only.
- FORBIDDEN: Modifying .ai/GUIDELINES.md or .ai/targets/ (HAI3 base guidelines).
- MUST NOT restate rules from other files.
- MUST keep each file under 100 lines, ASCII only.
- MUST keep changes minimal (add/update bullets, short sentences).

## SCOPE
This command updates custom guidelines at company or project level:
- Company guidelines: .ai/company/GUIDELINES.md and .ai/company/targets/
- Project guidelines: .ai/project/GUIDELINES.md and .ai/project/targets/
HAI3 base guidelines (.ai/GUIDELINES.md, .ai/targets/) are managed by CLI only.

## STEP 1: Identify Level
Ask user if the change applies to:
- Company level (affects all projects in organization)
- Project level (affects only this project)

## STEP 2: Route
- For company: Use .ai/company/GUIDELINES.md routing or create new target.
- For project: Use .ai/project/GUIDELINES.md routing or create new target.
- Read target file BEFORE making changes.
- Internally summarize 3-5 key rules (do not write to file).

## STEP 3: Apply Change
Work directly in the target file:
- Add or update a bullet point.
- Add or update a short sentence.
- Add or update a DETECT rule.
- Rewrite section only if necessary.

Use keywords: MUST, REQUIRED, FORBIDDEN, STOP, DETECT

## STEP 4: Validation
- Validate against .ai/targets/AI.md VALIDATION RULES section.
- Change directly related to request?
- File remains under 100 lines?
- No unicode characters?
- No duplicated rules across files?

## PRESERVATION
Company and project guidelines are preserved on hai3 update.
They will never be overwritten by HAI3 CLI updates.
