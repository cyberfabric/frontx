---
title: HAI3 Framework
description: Event-driven, plugin-based framework for building scalable SaaS control panels
---

# HAI3 Framework

**HAI3** (Human-AI Integrated Intelligence) is a comprehensive framework for building scalable SaaS control panels and administrative applications. It implements the [Technical Layer](/lifecycle/technical/) principles of the AI Product Lifecycle.

## What is HAI3?

HAI3 is both a **methodology** and a **framework**:

- **As a methodology**: A complete AI-driven product development lifecycle ([see Lifecycle](/lifecycle/))
- **As a framework**: A technical implementation for building modern web applications

This section focuses on the **technical framework**.

## Key Features

### 🏗️ Four-Layer Architecture

HAI3 organizes code into four distinct layers with unidirectional dependencies:

- **L1: SDK Layer** - Core primitives (state, API, i18n, screensets)
- **L2: Framework Layer** - Event bus, registries, plugin system
- **L3: React Layer** - React bindings and UI components
- **L4: App Layer** - Your application code

[Learn more about the architecture →](/hai3/architecture/overview)

### 🔌 Plugin System

Extend HAI3 through well-defined plugin interfaces:

- **Screensets**: Register new screens and flows
- **API Services**: Add backend integrations
- **Themes**: Customize appearance
- **Event Handlers**: React to system events

[Learn more about plugins →](/hai3/concepts/plugins)

### 📡 Event-Driven

All cross-domain communication happens through a typed event bus:

- Decoupled components
- Testable interactions
- Clear data flow
- Plugin isolation

[Learn more about events →](/hai3/concepts/event-driven)

### 🎨 Multi-UI Kit Support

Use your preferred component library:

- Material-UI (MUI)
- Ant Design
- Chakra UI
- Custom components

[Learn more about UI kits →](/hai3/concepts/themes)

### 🧩 Microfrontend Architecture

Build complex portals with isolated features:

- Independent screensets
- Separate lifecycles
- Isolated state
- Event-based communication

[See case study →](/case-studies/portal-microfrontend)

## Quick Start

```bash
# Install HAI3 CLI
npm install -g @hai3/cli

# Create a new project
hai3 create my-app

# Start development
cd my-app
npm run dev
```

[See full Getting Started guide →](/getting-started)

## Documentation Sections

### 📐 Architecture

Understand HAI3's four-layer architecture, SDK packages, and design principles.

- [Architecture Overview](/hai3/architecture/overview)
- [Layers](/hai3/architecture/layers)
- [SDK Layer (L1)](/hai3/architecture/sdk/state)
- [Framework Layer (L2)](/hai3/architecture/framework)
- [React Layer (L3)](/hai3/architecture/react)

### 💡 Concepts

Core concepts and patterns in HAI3.

- [Event-Driven Architecture](/hai3/concepts/event-driven)
- [Plugin System](/hai3/concepts/plugins)
- [Screensets](/hai3/concepts/screensets)
- [Themes](/hai3/concepts/themes)

### 📚 Guides

Practical guides for building with HAI3.

- [Getting Started](/getting-started)
- [Creating Screensets](/hai3/guides/creating-screensets)
- [API Integration](/hai3/guides/api-integration)
- [Deployment](/hai3/guides/deployment)

### 📖 API Reference

Detailed API documentation for all HAI3 packages.

- [State Management](/hai3/api-reference/state)
- [Framework](/hai3/api-reference/framework)
- [React Components](/hai3/api-reference/react)
- [CLI](/hai3/api-reference/cli)

### 🤝 Contributing

Help improve HAI3.

- [Contributing Overview](/hai3/contributing/)
- [Development Guidelines](/hai3/contributing/guidelines)
- [Architecture Rules](/hai3/contributing/architecture-rules)
- [Roadmap](/hai3/contributing/roadmap)

## Why HAI3?

### For Development Teams

- **Event-driven architecture** prevents tight coupling
- **Plugin system** enables modularity and extensibility
- **Multi-UI kit support** avoids vendor lock-in
- **Layered architecture** enforces clean dependencies
- **TypeScript-first** with strict type safety

### For Product Teams

- Clear separation between strategic, organizational, tactical, and technical concerns
- Structured workflows for AI-human collaboration
- Extensible framework that grows with your needs

### For AI Agents

- Well-defined interfaces and contracts
- Structured development guidelines
- Clear architectural boundaries and rules
- Extensibility patterns for adding capabilities

## Philosophy

HAI3 is built on these principles:

1. **Event-Driven Everything**: Cross-domain communication only through events
2. **Open/Closed Principle**: Extend without modifying core code
3. **Dependency Discipline**: Strict layer dependencies (L1→L2→L3→L4)
4. **Type Safety**: No `any`, no `unknown`, no escape hatches
5. **Plugin Architecture**: Framework is a collection of plugins
6. **Separation of Concerns**: Business logic, presentation, and data access are separate

## Next Steps

1. **New to HAI3?** Start with [Getting Started](/getting-started)
2. **Understand the architecture?** Read [Architecture Overview](/hai3/architecture/overview)
3. **Ready to build?** Follow [Creating Screensets](/hai3/guides/creating-screensets)
4. **Want to contribute?** See [Contributing](/hai3/contributing/)

## Community & Support

- **GitHub**: [HAI3org/HAI3](https://github.com/HAI3org/HAI3)
- **Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Contributing**: See our [contribution guidelines](/hai3/contributing/guidelines)
