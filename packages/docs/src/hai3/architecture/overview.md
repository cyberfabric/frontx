---
title: Architecture Overview
description: Understanding HAI3's four-layer architecture and design principles
---

# HAI3 Architecture Overview

::: warning Work in Progress
This section is under development. Content will be added in future updates.
:::

## The Four-Layer Architecture

HAI3 organizes code into four distinct layers with unidirectional dependencies:

```
L1 (SDK)        @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
                Zero @hai3 cross-dependencies, no React
                    ↓
L2 (Framework)  @hai3/framework
                Plugin system, registries, event bus
                    ↓
L3 (React)      @hai3/react
                React bindings, hooks, components
                    ↓
L4 (App)        User application code
                Screensets, themes, business logic
```

[Learn more about layers →](/hai3/architecture/layers)

## The Three Projections

TODO: Document Assets, Screen-Sets, and UI Core projections

## Design Principles

TODO: Document core design principles (event-driven, plugin-based, type-safe, etc.)

## Package Structure

TODO: Document the monorepo package structure

## Related Documentation

- [Layers](/hai3/architecture/layers)
- [Manifest](/hai3/architecture/manifest)
- [Model](/hai3/architecture/model)
- [SDK Layer](/hai3/architecture/sdk/state)
