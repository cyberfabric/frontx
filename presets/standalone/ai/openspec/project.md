# Project Context

## Overview
HAI3-based application using spec-driven development with OpenSpec.

## Tech Stack
- React 18, TypeScript 5, Vite 6
- Redux Toolkit, Lodash
- Tailwind CSS 3, shadcn/ui + Radix UI
- @hai3/uicore, @hai3/uikit

## Architecture Patterns
- Event-driven Flux: Component -> Action -> Event -> Effect -> Slice
- Vertical slice architecture: each screenset is self-contained
- Registry pattern: screensets, themes, API services self-register
- Domain-based organization within screensets

## Naming Conventions
- Screenset ID: camelCase (demo, chat)
- Screen IDs: camelCase (helloworld, profile)
- Redux state keys: ${SCREENSET_ID}/domain
- Event names: ${SCREENSET_ID}/${DOMAIN_ID}/event
- Icon IDs: ${SCREENSET_ID}:iconName
- Translation keys: screenset.${ID}:key or screen.${ID}.${SCREEN}:key

## Key Directories
- src/screensets/ - Application screens organized as vertical slices
- src/themes/ - Theme definitions
- src/uikit/ - UI kit registry

## Critical Rules
- Event-driven architecture only (no direct slice dispatch)
- All IDs in ids.ts, use template literals
- Domain-based organization for slices, events, effects
- No barrel exports in events/ or effects/
- npm run arch:check must pass before commits

## AI Guidelines
- Read .ai/GUIDELINES.md for routing to target files
- Read target file before making changes
- Follow event-driven patterns
- Use registries for extensibility

## Commands
- npm run dev - Start development server
- npm run arch:check - Validate architecture (CRITICAL)
- npm run type-check - TypeScript validation
- npm run lint - ESLint validation
