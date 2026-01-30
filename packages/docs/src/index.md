---
layout: home

hero:
  name: "HAI3"
  text: "Human-AI Integrated Intelligence"
  tagline: AI-Driven Product Development & Framework Documentation
  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: AI Product Lifecycle
      link: /lifecycle/
    - theme: alt
      text: HAI3 Framework
      link: /hai3/

features:
  - icon: 🎯
    title: AI Product Lifecycle
    details: Comprehensive guide to AI-driven product development across Strategic, Organizational, Tactical, and Technical layers.
    link: /lifecycle/
  - icon: 🏗️
    title: HAI3 Framework
    details: Event-driven, plugin-based framework for building scalable SaaS control panels with microfrontend architecture.
    link: /hai3/
  - icon: 📚
    title: Case Studies
    details: Real-world examples of HAI3 in action, including portal microfrontend architecture and more.
    link: /case-studies/
  - icon: 📖
    title: Terminology
    details: Core concepts, definitions, and extensibility guide for HAI3 development.
    link: /TERMINOLOGY
  - icon: 🧩
    title: Plugin System
    details: Extensible architecture with registries for API services, screens, themes, and more.
    link: /hai3/concepts/plugins
  - icon: 🎨
    title: UI Components
    details: Pre-built, themeable components with multiple UI kit support (MUI, Ant Design, Chakra).
    link: /hai3/guides/creating-screensets
---

## What is HAI3?

HAI3 (Human-AI Integrated Intelligence) is both a **product development methodology** and a **technical framework** designed for the AI era.

### The Methodology

HAI3 defines a complete AI-driven product development lifecycle with four distinct layers:

- **Strategic Layer**: Market analysis, vision definition, feature prioritization, roadmap planning
- **Organizational Layer**: Team structure, roles, separation of duties, collaboration models
- **Tactical Layer**: Specifications, team contracts, planning, task breakdown
- **Technical Layer**: Architecture patterns, development workflows, AI integration

Each layer has clear responsibilities, interfaces, and deliverables, enabling product managers, designers, engineers, and AI agents to collaborate effectively.

### The Framework

The HAI3 technical framework implements the technical layer principles with:

- **4-Layer Architecture** (L1→L2→L3→L4): SDK → Framework → React → App
- **3 Projections**: Assets, Screen-Sets, UI Core
- **Event-Driven Design**: Decoupled communication via typed event bus
- **Plugin System**: Extensible registries for screens, themes, API services
- **Microfrontend Support**: Isolated screensets with independent lifecycles
- **Multi-UI Kit**: Support for MUI, Ant Design, Chakra, or custom components

## Quick Start

```bash
# Install HAI3 CLI
npm install -g @hai3/cli

# Create a new project
hai3 create my-app

# Start development server
cd my-app
npm run dev
```

## Why HAI3?

**For Product Teams:**
- Clear separation between strategic, organizational, tactical, and technical concerns
- Structured workflows for AI-human collaboration
- Templates and frameworks for each lifecycle layer

**For Development Teams:**
- Event-driven architecture prevents tight coupling
- Plugin system enables modularity and extensibility
- Multi-UI kit support avoids vendor lock-in
- Microfrontend architecture scales with team size

**For AI Agents:**
- Well-defined interfaces and contracts
- Structured development guidelines
- Clear architectural boundaries and rules
- Extensibility patterns for adding capabilities

## Learn More

<div class="vp-doc" style="margin-top: 2rem;">

### 📚 Documentation Sections

- [**AI Product Lifecycle**](/lifecycle/) - Learn the complete methodology for AI-driven product development
- [**HAI3 Framework**](/hai3/) - Dive into the technical architecture, concepts, and guides
- [**Case Studies**](/case-studies/) - See HAI3 in action with real-world examples
- [**Terminology**](/TERMINOLOGY) - Understand core concepts and extensibility patterns

### 🚀 Next Steps

1. Read the [Getting Started guide](/getting-started) to set up your environment
2. Explore the [AI Product Lifecycle](/lifecycle/) to understand the methodology
3. Learn the [HAI3 Architecture](/hai3/architecture/overview) to understand the framework
4. Build your first [Screenset](/hai3/guides/creating-screensets)

</div>
