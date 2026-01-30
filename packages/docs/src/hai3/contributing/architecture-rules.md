---
title: Architecture Rules
description: Architectural constraints and validation rules
---

# Architecture Rules

::: warning Work in Progress
This section is under development.
:::

## Overview

HAI3 enforces strict architectural rules to maintain code quality and prevent common issues.

## Layer Dependencies

TODO: Document L1→L2→L3→L4 dependency rules

## Event-Driven Rules

TODO: Document event naming and usage rules

## Registry Rules

TODO: Document Open/Closed principle for registries

## No-Go Patterns

TODO: Document forbidden patterns (circular deps, layer violations, etc.)

## Validation

HAI3 includes automated architecture validation:

```bash
npm run arch:check        # Run all architecture checks
npm run arch:deps         # Check circular dependencies
npm run arch:layers       # Validate layer dependencies
npm run arch:sdk          # Validate SDK layer isolation
```

TODO: Document each validation check in detail

## Related Documentation

- [Contributing Overview](/hai3/contributing/)
- [Guidelines](/hai3/contributing/guidelines)
- [Architecture Overview](/hai3/architecture/overview)
- [Layers](/hai3/architecture/layers)
