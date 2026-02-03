# Project Context

## Purpose

HAI3 is an AI-optimized UI development kit for modern SaaS applications. It provides a structured, multi-layered framework enabling AI systems and humans to collaborate on building complex user interfaces through a three-stage development workflow:

1. **Drafts** - AI-generated initial layouts
2. **Mockups** - Designer-refined versions
3. **Production** - Engineer-finalized, production-ready screens

The framework is built on clean architecture principles with dependency inversion, enabling teams to rapidly prototype and iterate on UI components while maintaining code quality and architectural integrity.

## Tech Stack

### Core Technologies
- **React 19** - UI framework
- **TypeScript 5** - Type safety with strict mode enabled
- **Vite 6** - Build tool and dev server
- **Redux Toolkit** - State management with Redux Studio
- **Tailwind CSS 3** - Utility-first styling with custom theme tokens
- **axios** - HTTP client for REST protocol
- **EventSource API** - Native browser SSE support for streaming protocol
- **lodash** - Utility library for object/array operations

### Component Libraries
- **shadcn/ui** - Base component library
- **Radix UI** - Headless component primitives
- **Lucide React** - Icon system

### Build & Tooling
- **tsup** - Package bundler for workspace packages
- **ESLint** - TypeScript/React linting rules
- **dependency-cruiser** - Dependency graph analysis and validation
- **knip** - Unused export detection

### Monorepo Structure
- **npm workspaces** - Package management
- **SDK Layer (L1)**: `@hai3/state`, `@hai3/screensets`, `@hai3/api`, `@hai3/i18n` - Zero @hai3 dependencies
- **Framework Layer (L2)**: `@hai3/framework` - Plugin-based composition, depends on SDK
- **React Layer (L3)**: `@hai3/react` - React bindings (HAI3Provider, hooks)
- **UI Layer**: `@hai3/uikit`, `@hai3/studio`
- **Tooling**: `@hai3/cli`

## Project Conventions

### Code Style

**File Naming:**
- React components: PascalCase (`HelloWorldScreen.tsx`)
- Utilities/services: camelCase (`apiRegistry.ts`)
- Constants/configs: camelCase (`demoScreenset.tsx`)
- Types/interfaces: PascalCase (`ScreensetConfig.ts`)
- Redux slices: camelCase + "Slice" (`menuSlice.ts`)
- Effects: camelCase + "Effects" (`menuEffects.ts`)
- Actions: camelCase + "Actions" (`menuActions.ts`)

**Import Rules (CRITICAL):**
- Same package: Relative paths (`import { Button } from './Button'`)
- Cross-branch in app: `@/` alias (`import { Layout } from '@/core/layout'`)
- Cross-package: Workspace names (`import { eventBus } from '@hai3/state'`)
- Package internals: FORBIDDEN from app code

**Forbidden Patterns:**
- ❌ Direct slice dispatch from components
- ❌ Importing package internals
- ❌ Circular dependencies between packages
- ❌ `any` types or `as unknown as T` chains
- ❌ Central constants files (define IDs where used)
- ❌ Barrel exports hiding imports

### Architecture Patterns

#### 1. Four-Layer SDK Architecture

```
App (src/)
  ↓ depends on
React Layer (L3): @hai3/react - HAI3Provider, hooks
  ↓ depends on
Framework Layer (L2): @hai3/framework - Plugin composition, presets
  ↓ depends on
SDK Layer (L1): @hai3/state, @hai3/screensets, @hai3/api, @hai3/i18n
  (zero @hai3 dependencies - can be used independently)
```

**SDK Packages (L1):**
- `@hai3/state` - Event bus, Redux store factory, and slice registration (consolidated events + store)
- `@hai3/screensets` - Screenset contracts, registry, and layout domain definitions
- `@hai3/api` - API service registry with protocol/plugin system
- `@hai3/i18n` - Internationalization with 36 languages

**Framework Package (L2):**
- `@hai3/framework` - Plugin-based app builder (`createHAI3().use(plugins).build()`)

**React Package (L3):**
- `@hai3/react` - `HAI3Provider`, `useHAI3()`, React-specific hooks

**UI Packages (Separate Layer):**
- `@hai3/uikit` - React components built on shadcn/ui
- `@hai3/studio` - Development overlay (tree-shaken in production)

#### 2. Event-Driven Flux Pattern

Instead of direct dispatch, use event bus:

```typescript
Action Creator → emit Event → Effect subscribes → Updates Slice
```

All state changes must be traceable to events for debugging and loose coupling.

#### 3. Registry Pattern (Self-Registration)

Components, screensets, themes, and services self-register at module import:

- `screensetRegistry` - Menu items, screens, config
- `uikitRegistry` - UI components and icons
- `themeRegistry` - Theme configs and DOM application
- `apiRegistry` - API services by domain
- `routeRegistry` - Auto-synced routes (lazy initialization)
- `i18nRegistry` - Translation loaders with lazy loading

#### 4. Screenset Architecture (Vertical Slices)

Screensets are self-contained domains with:
- Screen components (React)
- Menu structure
- Translations (i18n)
- Icons (optional)
- Redux slices (optional)

Stored in flat structure under `screensets/`; category tracked via `ScreensetCategory` enum (Drafts, Mockups, Production)

#### 5. Type-Safe Event Bus

Events are centrally typed via `EventPayloadMap`. Screensets extend types via module augmentation without modifying core code.

### Testing Strategy

**Pre-Commit Validation:**
```bash
npm run arch:check    # Architecture tests (MUST pass before commits)
npm run arch:deps     # Dependency rule validation
npm run arch:unused   # Unused export detection
```

**Build Validation:**
- Packages MUST build in layer order: SDK → Framework → React → UI → CLI
- Use `npm run build:packages` to handle dependency order automatically

**Manual Testing:**
- All changes must be visually verified in browser via `npm run dev`
- Exercise all changed flows and check console for errors
- Use Chrome MCP integration for automated visual testing (see `.ai/MCP_TROUBLESHOOTING.md`)

### Git Workflow

**Branches:**
- `main` - Production-ready code (use for PRs)
- Feature branches: `feature/*`, `fix/*`, `refactor/*`

**Commit Guidelines:**
- Run `npm run arch:check` before committing
- Ensure TypeScript compilation passes
- Visual verification required for UI changes
- Follow semantic commit messages

**Critical Rules:**
- Never commit with failing architecture checks
- Never skip type-check validation
- Keep commits focused on single concerns

## Domain Context

### Initialization Sequence

Order matters for registry population:

1. Register UI Kit components (`@/uikit/uikitRegistry`)
2. Register screensets (`@/screensets/screensetRegistry`)
3. Register themes (`@/themes/themeRegistry`)
4. Render React root with `HAI3Provider`

### Redux Store Structure

```typescript
{
  // Static reducers
  app: AppState,
  layout: LayoutState,
    header: HeaderState,
    footer: FooterState,
    menu: MenuState,
    sidebar: SidebarState,
    screen: ScreenState,
    popup: PopupState,
    overlay: OverlayState,

  // Dynamic reducers (screenset-registered)
  [screensetSlice]: ScreensetState
}
```

### Navigation Flow

```
User action
  → navigateToScreen(screenId)
    → emits NavigationEvents.ScreenNavigated
      → navigationEffects listens
        → dispatches setSelectedScreen(screenId)
          → AppRouter updates URL
            → Screen component re-renders
```

### Translation System

- Format: `'namespace:path.to.key'`
- Example: `t('screenset.demo:screens.hello.title')`
- Lazy loading per language
- Screensets register loaders: `i18nRegistry.registerLoader('screenset.demo', loader)`

### Action Naming Convention

- **Event emitters**: Imperative verbs (`selectScreenset`, `changeTheme`, `navigateToScreen`)
- **Direct slice updates**: "set" prefix (`setTheme`, `setCurrentScreenset`)

Actions emit events. Effects listen and update slices. Never dispatch slice actions directly from components.

## Important Constraints

### Package Isolation

**Layer Rules (Enforced by ESLint + dependency-cruiser):**
- SDK packages (L1) MUST NOT depend on any @hai3 packages
- Framework (L2) MAY only depend on SDK packages
- React (L3) MAY only depend on Framework
- App code MUST NOT import package internals (`@hai3/*/src/*` is forbidden)

### Build Order

Packages have strict build dependencies (handled by `npm run build:packages`):

**SDK Layer (L1) - No internal dependencies:**
1. `@hai3/state`
2. `@hai3/screensets`
3. `@hai3/api`
4. `@hai3/i18n`

**Framework Layer (L2):**
5. `@hai3/framework` (depends on all SDK packages)

**React Layer (L3):**
6. `@hai3/react` (depends on framework)

**UI Layer:**
7. `@hai3/uikit` (depends on react)
8. `@hai3/studio` (depends on framework + react)

**Tooling:**
9. `@hai3/cli` (depends on all)

Breaking this order causes TypeScript compilation errors.

### Event-Driven Constraints

- Components MUST NOT dispatch slice actions directly
- All state changes MUST go through event bus
- Effects are the ONLY consumers of events that update Redux state
- This ensures traceability and loose coupling

### Module Augmentation Required

When adding new events, API services, or extending core types, screensets MUST use TypeScript module augmentation:

```typescript
// For events (SDK layer)
declare module '@hai3/state' {
  interface EventPayloadMap {
    'custom/event': CustomPayload;
  }
}

// For API services (SDK layer)
declare module '@hai3/api' {
  interface ApiServicesMap {
    myService: MyApiService;
  }
}
```

### Chrome MCP Constraint (CRITICAL)

**NEVER kill MCP processes during development:**
- ❌ `pkill -f chrome-studio-mcp` permanently breaks MCP tools
- ✅ Ask user to restart MCP through Claude Code, or start new conversation
- See `.ai/MCP_TROUBLESHOOTING.md` for recovery procedures

## External Dependencies

### Plugin-Based Framework

The framework uses a plugin architecture for flexible app composition:

```typescript
import { createHAI3, screensets, themes, layout, navigation, i18n } from '@hai3/framework';

// Full customization
const app = createHAI3()
  .use(screensets())
  .use(themes())
  .use(layout())
  .use(navigation())
  .use(i18n())
  .build();

// Or use presets
import { createHAI3App, presets } from '@hai3/framework';

const fullApp = createHAI3App();  // All plugins
const minimalApp = createHAI3().use(presets.minimal()).build();  // screensets + themes
const headlessApp = createHAI3().use(presets.headless()).build();  // screensets only
```

**Available Plugins:**
| Plugin | Provides | Dependencies |
|--------|----------|--------------|
| `screensets()` | screensetRegistry, screenSlice | - |
| `themes()` | themeRegistry, changeTheme action | - |
| `layout()` | header, footer, menu, sidebar slices | screensets |
| `navigation()` | navigateToScreen action | screensets, routing |
| `routing()` | routeRegistry, URL sync | screensets |
| `i18n()` | i18nRegistry, setLanguage action | - |

### API Services (Domain-Based)

API services follow a **vertical slice architecture** with clear separation between framework and screenset code:

**Framework Services (api package):**
- Service class definitions in `packages/api/src/services/`
- Core services used by framework itself (AccountsApiService, etc.)
- Auto-register at module import

**Screenset Services:**
- Service class definitions in `src/screensets/<screenset>/api/`
- Screenset-specific services (ChatApiService, etc.)
- Auto-register at module import

**Screenset Extensions:**
- Mocks: `src/screensets/<screenset>/api/mocks.ts` or `api/<domain>/mocks.ts`
- Module augmentation: `src/screensets/<screenset>/api/<domain>/extra.ts`
- Each screenset owns extensions for services it uses

```typescript
// Example: Framework service (in @hai3/api)
export const ACCOUNTS_DOMAIN = 'accounts';
export class AccountsApiService extends BaseApiService {
  constructor() {
    super(
      { baseURL: '/api/accounts' },
      new RestProtocol({ timeout: 30000 })
    );
  }

  protected getMockMap(): MockMap {
    return apiRegistry.getMockMap(ACCOUNTS_DOMAIN);
  }
}
apiRegistry.register(ACCOUNTS_DOMAIN, AccountsApiService);
```

```typescript
// Example: Screenset service (in screenset)
export const CHAT_DOMAIN = 'chat';
export class ChatApiService extends BaseApiService {
  constructor() {
    super(
      { baseURL: '/api/chat' },
      new RestProtocol({ timeout: 30000 }),
      new SseProtocol({ withCredentials: true })
    );
  }

  protected getMockMap(): MockMap {
    return apiRegistry.getMockMap(CHAT_DOMAIN);
  }
}
apiRegistry.register(CHAT_DOMAIN, ChatApiService);
```

```typescript
// Example: Screenset registers mocks
// src/screensets/demo/demoScreenset.tsx
import './api/accounts/extra';
import { accountsMockMap } from './api/accounts/mocks';

apiRegistry.registerMocks(ACCOUNTS_DOMAIN, accountsMockMap);
```

**Protocol System:**
- Services compose multiple protocols (RestProtocol for HTTP, SseProtocol for streaming)
- Protocols are registered in constructor and accessed via type-safe `protocol()` method
- Each protocol has specific configuration (timeout, withCredentials, etc.)
- Follows Open/Closed Principle - new protocols can be added without modifying BaseApiService

**Plugin-Based Mocking:**
- MockPlugin intercepts requests with high priority (100) when registered
- Mock data defined in screenset `api/` directories and registered via `apiRegistry.registerMocks()`
- Plugins use composition, not inheritance or mode flags
- SSE mocking simulates streaming by splitting responses into word-by-word chunks with 50ms delays

**Key Principles:**
- Framework services stay in @hai3/api, screenset services stay in screensets
- Mocks and extensions always belong to the screenset that uses them
- Intentional duplication enables complete vertical slice independence
- Each screenset is self-contained with all its API code

### Theme System

Themes are CSS custom properties applied to `:root`:
- Registered via `themeRegistry.register(id, theme)`
- Changed via `changeTheme(id)` action
- Tokens used in Tailwind classes: `bg-background`, `text-foreground`, `text-primary`

### Translation (i18n)

- Lazy-loaded per language
- Namespaced by screenset
- Registered via `i18nRegistry.registerLoader(namespace, loader)`
- Translation files: `./translations/${language}.json`

### Development Server

- Vite dev server runs on `http://localhost:5173`
- Hot module replacement enabled
- Chrome MCP integration available for automated browser testing
