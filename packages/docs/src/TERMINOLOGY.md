---
title: Terminology
description: Comprehensive glossary of HAI3 and AI product lifecycle terms
---

# Terminology

This glossary defines core concepts used throughout the HAI3 documentation, covering both the AI product lifecycle methodology and the HAI3 technical framework.

## AI Product Lifecycle Terms

### Lifecycle Layers

**Strategic Layer**
: The highest planning level focusing on product vision, market analysis, feature prioritization, and roadmap planning. Owned by Product Managers and Leadership.
: [Learn more →](/lifecycle/strategic/)

**Organizational Layer**
: Defines team structure, roles, responsibilities, and collaboration patterns. Establishes how teams work together and integrate AI agents.
: [Learn more →](/lifecycle/organizational/)

**Tactical Layer**
: Translates strategy into actionable plans through specifications, team contracts, sprint planning, and task breakdowns.
: [Learn more →](/lifecycle/tactical/)

**Technical Layer**
: Handles actual implementation, architecture decisions, development workflows, and deployment.
: [Learn more →](/lifecycle/technical/)

### Planning & Execution

**Feature Specification**
: A detailed document describing what a feature should do, including requirements, acceptance criteria, edge cases, and constraints.

**Team Contract**
: An agreement between teams or components defining interfaces, data schemas, and communication protocols.

**Task Breakdown**
: The process of decomposing features into smaller, implementable tasks with size estimates and dependencies.

**Acceptance Criteria**
: Specific, measurable conditions that must be met for a feature or task to be considered complete.

**Definition of Done**
: A shared understanding of what "complete" means for work items, including code quality, testing, and documentation requirements.

## HAI3 Framework Terms

### Core Architecture

**HAI3 (Human-AI Integrated Intelligence)**
: Both a methodology for AI-driven product development and a technical framework for building SaaS control panels.

**Four-Layer Architecture**
: HAI3's architectural pattern organizing code into L1 (SDK), L2 (Framework), L3 (React), and L4 (App) with unidirectional dependencies.
: [Learn more →](/hai3/architecture/layers)

**SDK Layer (L1)**
: Foundation packages with zero cross-dependencies: `@hai3/state`, `@hai3/api`, `@hai3/i18n`, `@hai3/screensets`. Can be used independently without React.
: [Learn more →](/hai3/architecture/sdk/state)

**Framework Layer (L2)**
: The `@hai3/framework` package providing the plugin system, registries, and event bus. Composes SDK packages.
: [Learn more →](/hai3/architecture/framework)

**React Layer (L3)**
: The `@hai3/react` package with React bindings, hooks, and components for building UIs.
: [Learn more →](/hai3/architecture/react)

**App Layer (L4)**
: Your application code including screensets, themes, custom components, and business logic.

**HAI3App (Type)**
: A **TypeScript interface** representing the application instance returned by `createHAI3().build()`. Provides access to registries, store, and actions. **Not a React component** - use `HAI3Provider` for React.

**HAI3Provider (Component)**
: A **React component** that provides the HAI3 context to your application. Wrap your app with `<HAI3Provider>` to enable HAI3 hooks and features.

### Screensets & Screens

**Screenset**
: A self-contained collection of related screens forming a cohesive feature or workflow (e.g., authentication, dashboard, settings). Each screenset has its own state, translations, and components.
: [Learn more →](/hai3/concepts/screensets)

**Screen**
: An individual view within a screenset. The basic unit of UI in HAI3 applications.

**Default Screen**
: The initial screen shown when a screenset is activated.

**Screen Navigation**
: Moving between screens within a screenset or switching between screensets.

**Screen Lifecycle**
: The phases a screen goes through: registration, mounting, rendering, unmounting, and cleanup.

### State Management

**Store**
: The Redux store managing application state. HAI3 uses Redux Toolkit with dynamic slice registration.
: [Learn more →](/hai3/architecture/sdk/state)

**Slice**
: A portion of the Redux store managing a specific domain (e.g., user slice, theme slice, layout slice). Created with `createSlice` from Redux Toolkit.

**Shared State**
: Global state accessible across all screensets and screens (e.g., user info, theme, language).

**Private State**
: State scoped to a specific screenset or screen, not accessible elsewhere.

**Selector**
: A function that extracts specific data from the store. Optimized with memoization to prevent unnecessary re-renders.

**Action**
: An object describing a state change. Dispatched to update the store.

**Reducer**
: A pure function that takes current state and an action, returning new state.

### Event-Driven Architecture

**Event Bus**
: Central messaging system for cross-domain communication. All inter-screenset and inter-feature communication happens through events.
: [Learn more →](/hai3/concepts/event-driven)

**Event**
: A message passed through the event bus containing a type and optional payload.

**Event Type**
: A string identifier for an event, following the pattern `domain.entity.action` (e.g., `user.profile.updated`).

**Event Payload**
: Data carried by an event, strongly typed using TypeScript.

**Event Handler**
: A function that responds to specific event types.

**Domain**
: A logical grouping of related functionality (e.g., `user`, `auth`, `api`). Events are namespaced by domain.

### Plugin System

**Plugin**
: An extension that adds functionality to HAI3 through well-defined interfaces. The framework itself is built as a collection of plugins.
: [Learn more →](/hai3/concepts/plugins)

**Plugin Registry**
: A collection of plugins for a specific purpose (e.g., screenset registry, theme registry, API service registry).

**Plugin Interface**
: The contract a plugin must implement (e.g., `ScreensetPlugin`, `ThemePlugin`).

**Plugin Lifecycle**
: Phases a plugin goes through: registration, initialization, activation, and cleanup.

**Core Plugins**
: Built-in plugins provided by HAI3 (screensets, themes, layout, routing, navigation, i18n).

**Custom Plugin**
: User-created plugin extending HAI3 functionality.

### API Layer

**API Service**
: A class extending `BaseApiService` that provides typed methods for backend communication.
: [Learn more →](/hai3/architecture/sdk/api)

**API Protocol**
: The communication method (REST, SSE, WebSocket) used by an API service.

**API Registry**
: Central registry managing all API services in the application.

**REST Protocol**
: HTTP-based request/response API communication.

**SSE Protocol**
: Server-Sent Events for real-time server-to-client streaming.

**Mock Plugin**
: Development plugin that simulates backend responses without real API calls.

**API Interceptor**
: Middleware that processes requests/responses (e.g., adding auth headers, logging, error handling).

### UI & Theming

**UI Kit**
: A collection of pre-built, themeable components (buttons, inputs, cards, etc.). HAI3 supports multiple UI kits (MUI, Ant Design, Chakra, custom).
: [Learn more →](/hai3/concepts/themes)

**Theme**
: A configuration defining colors, typography, spacing, and component styles for the application.

**Theme Registry**
: Collection of available themes that can be switched at runtime.

**Theme Token**
: A CSS variable or constant defining a specific style value (e.g., `--color-primary`, `--spacing-md`).

**Component**
: A reusable UI building block. Can be from a UI kit or custom-built.

**Layout Element**
: Structural component of the application shell (Menu, Header, Footer, Sidebar).

### Internationalization

**i18n (Internationalization)**
: The process of designing software to support multiple languages and regions.
: [Learn more →](/hai3/architecture/sdk/i18n)

**Locale**
: A combination of language and region (e.g., `en-US`, `fr-FR`, `ja-JP`).

**Translation Key**
: An identifier for a translatable string (e.g., `common.buttons.save`).

**Translation Dictionary**
: A file containing key-value pairs mapping translation keys to localized strings.

**Locale Pack**
: A bundle of translations for a specific locale, loaded lazily.

**RTL (Right-to-Left)**
: Text direction for languages like Arabic and Hebrew. HAI3 supports automatic RTL layout.

## Team Roles

**Product Manager**
: Owns product vision, strategy, and roadmap. Works at the Strategic and Tactical layers.

**Designer**
: Creates user experiences, visual designs, and interaction patterns. Works at the Tactical and Technical layers.

**Engineer**
: Implements features according to specifications. Works at the Technical layer.

**Tech Lead**
: Makes architecture decisions and guides technical implementation. Works at the Tactical and Technical layers.

**AI Agent**
: Automated assistant that generates code, documentation, tests, and provides analysis. Operates within well-defined boundaries at all layers.

## Development Concepts

**Microfrontend**
: An architectural pattern where a large frontend is divided into smaller, independently deployable units. HAI3 screensets can function as microfrontends.
: [See case study →](/case-studies/portal-microfrontend)

**Dependency Injection**
: A pattern where dependencies are provided to components rather than created internally. Used throughout HAI3 for testability.

**Inversion of Control**
: A principle where the framework calls your code, rather than your code calling the framework. HAI3's plugin system uses IoC.

**Open/Closed Principle**
: Software should be open for extension but closed for modification. HAI3's registries implement this principle.

**Type Safety**
: Using TypeScript's type system to catch errors at compile time. HAI3 has strict type safety with no `any` or `unknown` types.

**Layered Architecture**
: Organizing code into layers with clear dependencies (L1→L2→L3→L4). Each layer can only depend on layers below it.

**Event-Driven Architecture**
: A pattern where components communicate through events rather than direct calls, reducing coupling.

## Build & Deployment

**Vite**
: The build tool used by HAI3, providing fast hot module replacement and optimized production builds.

**Code Splitting**
: Dividing application code into smaller bundles that load on demand, improving initial load time.

**Lazy Loading**
: Loading code only when needed (e.g., loading a screenset only when navigated to).

**Hot Module Replacement (HMR)**
: Updating code in the browser without full page reload during development.

**Tree Shaking**
: Eliminating unused code from production bundles.

## Quality & Testing

**ESLint**
: JavaScript/TypeScript linter enforcing code quality and style rules. HAI3 has custom ESLint rules.

**Type Checking**
: Verifying TypeScript types are correct. Run with `npm run type-check`.

**Architecture Check**
: Validating layer dependencies, circular dependencies, and architectural rules. Run with `npm run arch:check`.

**Pre-commit Hook**
: Automated checks that run before code is committed (linting, type checking, tests).

---

## How to Extend HAI3

HAI3 is designed to be extended without modifying core code. Here are the primary extension points:

### 1. Creating Custom Screensets

Screensets are the primary way to add features to your application.

```tsx
import type { ScreensetDefinition } from '@hai3/screensets';
import { ScreensetCategory } from '@hai3/screensets';

export const myScreenset: ScreensetDefinition = {
  id: 'my-feature',
  name: 'My Feature',
  category: ScreensetCategory.Production,
  defaultScreen: 'main',
  menu: [
    {
      menuItem: { id: 'main', label: 'Main' },
      screen: () => import('./MyScreen')
    }
  ]
};
```

[Full guide →](/hai3/guides/creating-screensets)

### 2. Creating Custom Plugins

Extend HAI3's functionality through the plugin system.

```tsx
import type { HAI3Plugin } from '@hai3/framework';

export function myPlugin(): HAI3Plugin {
  return {
    name: 'my-plugin',
    onInit(app) {
      // Setup logic
    }
  };
}
```

[Full guide →](/hai3/concepts/plugins)

### 3. Adding Custom Components

Create reusable UI components for your application.

```tsx
export function MyComponent({ title, children }) {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
```

[Full guide →](/hai3/guides/creating-screensets#custom-components)

### 4. Creating API Services

Add backend integrations through typed API services.

```tsx
import { BaseApiService } from '@hai3/api';

export class UsersApiService extends BaseApiService {
  async getUsers() {
    return this.get<User[]>('/users');
  }
}
```

[Full guide →](/hai3/guides/api-integration)

### 5. Custom Themes

Create and register custom themes.

```tsx
export const myTheme = {
  id: 'my-theme',
  name: 'My Theme',
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    // ...
  }
};
```

[Full guide →](/hai3/concepts/themes)

### 6. State Slices

Add new state domains with Redux slices.

```tsx
import { createSlice } from '@hai3/state';

export const mySlice = createSlice({
  name: 'myDomain',
  initialState: { data: [] },
  reducers: {
    setData: (state, action) => {
      state.data = action.payload;
    }
  }
});
```

[Full guide →](/hai3/architecture/sdk/state)

### 7. Event Handlers

React to events from other parts of the application.

```tsx
import { eventBus } from '@hai3/framework';
import { useEffect } from 'react';

export function MyComponent() {
  useEffect(() => {
    const unsubscribe = eventBus.on('user.profile.updated', (payload) => {
      console.log('Profile updated:', payload);
    });

    return unsubscribe; // Cleanup on unmount
  }, []);

  return null;
}
```

[Full guide →](/hai3/concepts/event-driven)

### 8. Custom Layouts

Override default layout elements (Menu, Header, Footer, Sidebar).

```tsx
export function CustomHeader() {
  return (
    <header className="custom-header">
      {/* Your custom header */}
    </header>
  );
}

// Register in app configuration
```

### 9. UI Kit Integration

Integrate a custom component library as a HAI3 UI kit.

[Coming soon - UI kit integration guide]

### 10. Microfrontend Isolation

Build features as isolated microfrontends with independent lifecycles.

[See case study →](/case-studies/portal-microfrontend)

---

## Related Documentation

- [Architecture Overview](/hai3/architecture/overview) - Understand HAI3's structure
- [Getting Started](/getting-started) - Build your first HAI3 app
- [AI Product Lifecycle](/lifecycle/) - Learn the complete methodology
- [Contributing](/hai3/contributing/) - Help improve HAI3

---

## Conventions

Throughout the documentation, we use these conventions:

- **`Code`** - Inline code, file names, package names
- **Bold** - Important terms and concepts
- *Italic* - Emphasis
- 🎯 Strategic, 🏢 Organizational, 📋 Tactical, ⚙️ Technical - Layer indicators
- → - Cross-reference links
- ⚠️ - Warnings and important notes
- ✅ - Completed items
- 📚 - Documentation references

## Questions?

If you can't find a term you're looking for:

1. Check the [Architecture docs](/hai3/architecture/overview)
2. Search the documentation (use the search bar)
3. Ask on [GitHub Discussions](https://github.com/HAI3org/HAI3/discussions)
4. Open an issue if you think a term is missing
