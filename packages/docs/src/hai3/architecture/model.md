---
title: Domain Model
description: Glossary and domain models for HAI3 architecture
---

# HAI3 Domain Model

> **TARGET AUDIENCE:** Humans and AI
> **PURPOSE:** Glossary and domain models for HAI3 architecture

## Glossary

- **Screen-set**: A collection of related screens that form a cohesive feature or workflow
- **Screen**: An individual view within a screenset
- **Component**: Reusable UI building block
- **Microfrontend**: Independently deployable frontend module
- **State**: Application data managed through Redux Toolkit
- **Event**: Message passed through the event bus for cross-domain communication

::: tip
See [TERMINOLOGY](/TERMINOLOGY) for more detailed definitions and extensibility patterns.
:::

## Key Layout Elements

HAI3 provides a structured layout system with the following elements:

- **Menu**: Primary navigation component
- **Header**: Top bar with branding and user controls
- **Footer**: Bottom bar with copyright and links
- **Screen**: Main content area where screensets render
- **Sidebars**: Left or right panels for auxiliary content
- **Popup window system**: Modal dialogs and overlays
- **Overlay**: Full-screen loading and blocking states

## Communication Contracts

::: warning Work in Progress
Detailed communication contracts are being documented. For now, refer to:
- [Event-Driven Architecture](/hai3/concepts/event-driven)
- [Plugin System](/hai3/concepts/plugins)
- [API Layer](/hai3/architecture/sdk/api)
:::

## Related Documentation

- [Architecture Overview](/hai3/architecture/overview) - Understand the overall architecture
- [Manifest](/hai3/architecture/manifest) - Core principles and values
- [Screensets](/hai3/concepts/screensets) - Learn about screensets in detail
