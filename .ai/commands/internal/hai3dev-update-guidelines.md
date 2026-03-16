# hai3dev:update-guidelines - Update AI Guidelines (Monorepo Only)

## AI WORKFLOW (REQUIRED)
1) Route using .ai/GUIDELINES.md to identify correct target file.
2) Read target file before making changes.
3) Apply minimal change.
4) Validate compliance.

## CONSTRAINTS
- MUST modify the target file in workspace (not print a copy).
- MUST NOT restate rules from other .ai/targets/*.md files.
- MUST NOT copy text; reference instead.
- MUST keep each .ai/*.md file under 100 lines, ASCII only.
- MUST keep changes minimal (add/update bullets, short sentences).

## STEP 1: Route
- Use .ai/GUIDELINES.md routing table to identify correct target file.
- CRITICAL: Read that file BEFORE making any changes.
- Internally summarize 3-5 key rules (do not write to file).

## STEP 2: Apply Change
Work directly in the target file:
- Add or update a bullet point.
- Add or update a short sentence.
- Add or update a DETECT rule.
- Rewrite section only if necessary.

Use keywords: MUST, REQUIRED, FORBIDDEN, STOP, DETECT

## STEP 3: Scope
- Only touch the section related to the request.
- Do not modify unrelated sections.
- Do not introduce new sections unless explicitly requested.

## STEP 4: Validation
- Validate against .ai/targets/AI.md VALIDATION RULES section.
- Change directly related to request?
