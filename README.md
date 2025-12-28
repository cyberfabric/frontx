> VERSION: 0.1.0, early preview, do not use in production, overall scope completion ~30%

# HAI3 - AI-Optimized UI Development Kit for Modern SaaS Applications

![Badge](./.github/badgeHN.svg)



**HAI3** is a **UI development kit** for modern SaaS applications - heavily optimized for **AI-driven UI generation** with minimal human assistance.

It provides a structured, multi-layered framework that enables **AI systems and humans to collaborate** on building, evolving, and refining complex user interfaces - from drafts and mockups to production-ready screens.


## Why HAI3?

Building modern control panels for cloud service providers, corporate software vendors, and SaaS vendors requires solving complex challenges:

- **Multitenancy**: Isolated data, configurations, and branding per customer/organization
- **Role-Based Access Control**: Granular permissions that hide/show/disable UI elements based on user roles
- **White-Label Support**: Per-tenant branding, themes, and feature sets
- **Plugin Ecosystems**: Runtime-composable integrations without core code changes
- **Global Enablement**: Multi-language, RTL/LTR, locale-aware formatting
- **Flexible Build Options**: Web, desktop, on-premise & cloud from a single codebase
- **High Customization**: Adjust control panel elements, views, dashboards & automation workflows

HAI3 addresses these challenges while enabling **AI-assisted development** to accelerate UI creation by 10x.


## The Mission

HAI3's mission is to **democratize powerful in-product UI customization and development** — making it accessible without deep programming expertise.

Traditionally, advanced UI development capabilities are available only to SaaS vendors and their engineering teams. HAI3 changes this by providing a framework that is:

- **As powerful as traditional cloud-side UI development** — offering full flexibility and control
- **Accessible without deep technical knowledge** — no need to master complex programming languages and frameworks
- **AI-optimized** — structured for efficient collaboration between AI agents and humans

This empowers:

- **System Integrators** to deliver highly customizable solutions to their customers
- **End customers** to build and modify UI applications within SaaS products themselves
- **Non-technical stakeholders** (product managers, designers, business analysts) to participate directly in UI creation
- **Rapid iteration** through AI-assisted development workflows

By combining structured conventions, AI-optimized patterns, and a layered architecture, HAI3 bridges the gap between no-code simplicity and full-code flexibility—making enterprise-grade UI development accessible to everyone.


## Target Audience

HAI3 dev kit is designed for:

- **Cloud SaaS Service Providers** requiring multitenant architectures with tenant isolation and customization
- **Service Vendors** developing white-label solutions with per-customer branding and feature sets
- **Corporate Software Vendors** building modern control panels for complex business applications
- **System Integrators** creating pluggable control panels with third-party integrations
- **Platform/IT Teams** building internal tools and admin portals with role-based access control


---

## Overview

The HAI3 Dev Kit introduces a new paradigm in UI development where product management and designers can work with AI to create and polish user interfaces and engineers can take the generated code and turn it into production-ready code.

With HAI3, UI development becomes a **three-layer process** where AI and humans co-create interfaces:
- AI generates **draft** layouts using standardized prompts and patterns.
- Designers and PMs refine **mockups** with lightweight iteration over drafts.
- Engineers finalize **production screens** with reusable components taking the mockups as a starting point.

HAI3 provides the visual structure (menu, header, footer, sidebars, main view), defines source code layout conventions, microfrontend engine, customizable type system, and a screen-set switcher ensuring that generated screens reuse needed components libraries and visual styles. It also provides a structured prompting system and AI generation guide set that enables consistent, parameterized UI generation via LLMs.

---

## Key HAI3 Use-cases and Values

The HAI3 Dev Kit is built on top of the following key values below allowing it to be used for different usecases starting from a single desktop application to multitenant and mulit-user SaaS  control panel development:

- **V#1** - Human-Configurable UI-Core - layout, styles, build targets
- **V#2** - Layout-Safe Screen Generation - AI/Human code separation
- **V#3** - Component and Style Consistency - design system enforcement
- **V#4** - Modular Screen Architecture - composable building blocks
- **V#5** - Pluggable UI Microfrontends - secure plugin ecosystem
- **V#6** – Shared/Private Store and Global/Local State - performance and offline-first
- **V#7** – Unified API Layer - typed contracts and observability
- **V#8** - Security, Multitenancy & Role-based Access - enterprise SSO and compliance
- **V#9** - Internationalization & Localization - global deployment ready
- **V#10** - Testing and Quality Gates - automated QA pipeline

See [MANIFEST.md](docs/MANIFEST.md) for detailed descriptions of each value.

HAI3 is structured around **three main projections**, each addressing a critical dimension of the development lifecycle.

### Projection #I - Assets

| Asset | Description |
|--------|--------------|
| **1. UI Core** | The foundational layer providing the visual structure (menu, header, footer, sidebars, main view). Defines source layout conventions, microfrontend engine, customizable type system, and a screen-set switcher. |
| **2. Prompts & Guidelines** | A structured prompting system and AI generation guide set that enables consistent, parameterized UI generation via LLMs. |
| **3. Build System** | Flexible build pipeline that can produce Web apps or Electron apps, configure included screen-sets, and pull screens from multiple repositories, and also build the mock API servers automatically. |

Each HAI3 project includes these three assets to ensure **repeatable, automatable, and composable** UI generation workflows.

---

### Projection #II - Screen-Set Categories

The UI Core is built to host **three categories of screen-sets**, corresponding to the evolution stages of an interface.

| Category | Purpose | Description |
|-----------|----------|-------------|
| **1. Drafts** | AI-generated layouts | Automatically created by AI agents using HAI3 prompt sets, rules and conventions. Multiple draft sets can coexist (e.g., per PM or feature group). |
| **2. Mockups** | Semi-refined screens | Converted from drafts when human designers or PMs start refining visual and interaction details. |
| **3. Production Screens** | Finalized versions | Human-polished mockups integrated into production builds. |

Each category lives in its own folder and is accessible via the **screen-set switcher** - allowing instant preview or live toggling across versions directly in the UI.

---

### Projection #III - UI Core Layers

HAI3’s **UI Core** consists of three architectural layers designed for composability and reuse.

| Layer | Description |
|--------|-------------|
| **1. Presentation Layer** | Component library including buttons, grids, menus, modals, typography, and TailwindCSS-based style sets. |
| **2. Layout Layer** | Defines the visual structure - menu, header, footer, right sidebar, popup window system, and screen containers. |
| **3. Libraries Layer** | Includes shared utilities: HTTP store, event system, plugin host, and microfrontend integration engine. |

The combination of these layers allows developers to **compose UI experiences** from modular parts, shared repos, and AI-generated code.

---

## AI + Human Collaboration Model

HAI3 defines a **three-stage development workflow** that maximizes AI efficiency while maintaining code quality:

![pipeline.drawio.png](docs/pipeline.drawio.png)

### Stage 1: Drafts (AI-Driven)

- AI generates initial screen layouts from prompts, requirements and existing API specs (if any)
- Multiple draft variants can be generated and compared
- Drafts live in isolated folders and don't affect production code
- **Typical time**: Minutes to hours (vs. days for manual development)

### Stage 2: Mockups (AI-Assisted, Human-Refined)

- Designers and Product Managers refine drafts with visual and interaction details
- AI assists with component selection and style consistency
- Mockups can be previewed in-app via a screen-set switcher
- **Typical time**: Hours to days (vs. weeks for manual development)

### Stage 3: Production (Human-Polished)

- Engineers integrate mockups with business logic and APIs
- Engineers can review API suggestions and generate mock API servers automatically
- Code review, cleanup, testing, and optimization
- Production screens inherit all UI-Core capabilities (theming, i18n, RBAC, etc.)
- **Typical time**: Days (vs. weeks for manual development)

**Result**: 10x faster UI development with maintainable, enterprise-grade code.

## Getting Started

### Requirements

- Node.js 18+
- npm 9+

### Quick Start

#### Option 1: Create a new project with CLI (Recommended)

```bash
# Install HAI3 CLI globally
npm install -g @hai3/cli

# Create a new project (full app with UI)
hai3 create my-app

# Navigate to project and start development
cd my-app
npm run dev
```

#### Creating Layer-Specific Packages

For building SDK packages that integrate with the HAI3 ecosystem:

```bash
# Create an SDK-layer package (no HAI3 dependencies, no React)
hai3 create my-sdk-package --layer sdk

# Create a framework-layer package (depends on SDK packages only)
hai3 create my-framework-package --layer framework

# Create a React-layer package (depends on @hai3/framework)
hai3 create my-react-package --layer react
```

Each layer package includes:
- Layer-appropriate `.ai/GUIDELINES.md` with filtered routing rules
- Layer-filtered `.ai/targets/` (only targets applicable to that layer)
- Layer-specific AI commands (with variant selection fallback chain)
- Pre-configured ESLint with layer restrictions (e.g., no React imports in SDK layer)

#### Option 2: Clone this repository

```bash
# Clone the repository
git clone https://github.com/HAI3org/HAI3.git
cd HAI3

# Install dependencies
npm ci

# Build packages
npm run build:packages

# Run the development server
npm run dev
```

### Project Structure

```bash
HAI3/                               # Repository root
├── .ai/                            # AI prompting rules and GUIDELINES for generation
├── docs/                           # Documentation
│   ├── MANIFEST.md                 # Core values and principles
│   ├── MODEL.md                    # High-level model notes
│   └── ROADMAP.md                  # Planned milestones
├── index.html                      # Vite HTML entry
├── packages/                       # Workspaces with reusable libraries
│   ├── state/                      # SDK L1: Event bus, store, and slices
│   ├── api/                        # SDK L1: API services and protocols
│   ├── i18n/                       # SDK L1: Internationalization
│   ├── screensets/                 # SDK L1: Screenset types and utilities
│   ├── framework/                  # L2: Plugin system and registries
│   ├── react/                      # L3: React bindings and hooks
│   ├── uikit/                      # React component library
│   ├── studio/                     # Development overlay (optional)
│   └── cli/                        # CLI tool for project scaffolding
├── src/                            # App source code
│   ├── App.tsx                     # Root React component
│   ├── main.tsx                    # App entry; mounts React and providers
│   ├── screensets/                 # Screensets (category in config)
│   │   ├── demo/                   # Demo screenset
│   │   ├── _blank/                 # Blank screenset template
│   │   └── screensetRegistry.tsx   # Registry to switch screen-sets
│   └── themes/                     # Theme tokens and registries
├── tailwind.config.ts              # TailwindCSS configuration
├── tsconfig.json                   # TypeScript config (root)
├── tsconfig.node.json              # TS config for tooling/node
└── vite.config.ts                  # Vite build/dev configuration
```

### SDK Architecture (4-Layer)

HAI3 follows a layered architecture for maximum flexibility:

```
L1 (SDK)        @hai3/state, @hai3/api, @hai3/i18n, @hai3/screensets
                Zero cross-dependencies, no React, use anywhere
                    ↓
L2 (Framework)  @hai3/framework
                Plugin system, registries, composed from SDK
                    ↓
L3 (React)      @hai3/react
                React bindings, hooks, providers
                    ↓
L4 (App)        User application code
                Screensets, themes, custom components
```

**Use Cases:**
- **Full HAI3**: Import `@hai3/react` for complete platform with UI
- **Headless/External**: Import `@hai3/framework` for screensets-only (no UI)
- **Custom Integration**: Import SDK packages directly for maximum control

### Creating a New Screen-Set

Use the HAI3 CLI to create screensets:

```bash
# Create a new screenset
hai3 screenset create my-screenset

# Copy an existing screenset with transformed IDs
hai3 screenset copy demo myDemo
```

After creation:
1. Add new screens using your favorite AI agent or IDE
2. The screenset auto-registers via Vite glob pattern
3. Run `npm run dev` and switch to the new screenset via the UI selector

### Updating AI Configuration

When HAI3 updates are released, use the update command to sync your project:

```bash
# Update AI configuration and templates
hai3 update
```

For layer packages, the update respects your project's layer (stored in `hai3.config.json`) and only syncs layer-appropriate targets and commands.

See [GUIDELINES.md](.ai/GUIDELINES.md) for detailed development guidelines.

### Building a Plugin/Integration

TODO

## Documentation

- **[ROADMAP.md](docs/ROADMAP.md)**: Project roadmap
- **[MANIFEST.md](docs/MANIFEST.md)**: Core philosophy, principles, and values
- **[GUIDELINES.md](.ai/GUIDELINES.md)**: Development guidelines for AI and humans
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: How to contribute to the project

## Community & Support

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Architecture questions and best practices [discord](https://discord.com/channels/1364665811125670018/1428468824130191410)
- **Examples**: TODO


## License

HAI3 is available under the [Apache License 2.0](LICENSE).

## Credits

Built with:
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling system
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Electron](https://www.electronjs.org/) - Desktop app framework
