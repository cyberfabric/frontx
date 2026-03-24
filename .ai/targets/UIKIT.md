
# UI Kit Guidelines

## AI WORKFLOW (REQUIRED)
1) There is no shared UI kit package. MFEs own their UI components locally.
2) STOP if asked to add components to a shared UI kit package.

## SCOPE
- MFEs use local `components/ui/` directory for UI primitives (copy-owned shadcn/ui pattern).
- Theme CSS variables are delivered automatically via CSS inheritance from `:root`.

## PATTERN
- Add `clsx`, `tailwind-merge`, `class-variance-authority` as local dependencies.
- See the blank-MFE template (`src/mfe_packages/_blank-mfe/`) for the recommended pattern.
