<!-- @standalone -->
# Styling Guidelines

## AI WORKFLOW (REQUIRED)
1) Summarize 3-5 rules from this file before proposing changes.
2) STOP if you type hex colors, inline styles, or use px units (except borders).

## SCOPE
- Applies to styling across packages and app code.

## CRITICAL RULES
- Layer responsibilities:
  - Base layer: visual styling.
  - Composite, Core, Screensets: layout only.
- Units: use rem-based tokens; px allowed only for border width.
- Hierarchy: Tokens -> Themes -> Base -> Composite -> Core.
- Dark mode: CSS variables via [data-theme].
- No hardcoded colors or inline style={{}}.

## STOP CONDITIONS
- Hex color literals (for example "#0066cc").
- Inline style props.
- px units for sizing or spacing (except borders).

## PRE-DIFF CHECKLIST
- [ ] All sizes use rem tokens (for example "w-40", "min-w-40").
- [ ] No hex colors or inline styles present.
- [ ] Visual styling only in Base layer; others handle layout.
- [ ] Responsive behavior uses Tailwind prefixes (mobile-first).