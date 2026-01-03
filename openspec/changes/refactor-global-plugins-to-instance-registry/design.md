# Design: OCP-Compliant Plugin Registry on apiRegistry

## Context

The current HAI3 API plugin system uses static class members for "global" plugins:

```typescript
// Current (problematic) pattern
RestProtocol.globalPlugins.add(mockPlugin);  // Affects ALL RestProtocol instances globally
```

This creates a process-wide singleton that conflicts with micro-frontend architecture.

**Constraints:**
- Implementation is in a fork, NOT merged upstream
- No backward compatibility shims required
- Clean break is acceptable and preferred
- Must follow Open/Closed Principle (OCP)

## Goals / Non-Goals

### Goals
- OCP-compliant API (adding new protocols requires no code changes)
- Micro-frontend plugin isolation via separate package instances
- Type-safe plugin management with protocol class as parameter
- Centralized plugin management on apiRegistry

### Non-Goals
- Backward compatibility with static API (explicitly a clean break)
- Factory functions for registry isolation (package instances provide this)
- Protocol-specific namespace properties (violates OCP)

## Architecture

### Before (Current State)

```
RestProtocol (class)
  +-- static _globalPlugins: Set<RestPluginHooks>  <-- Process-wide singleton
  +-- static globalPlugins.add/remove/has/getAll/clear

SseProtocol (class)
  +-- static _globalPlugins: Set<SsePluginHooks>  <-- Process-wide singleton
  +-- static globalPlugins.add/remove/has/getAll/clear

Plugin Chain: [...static global] + [...instance]
```

### After (Proposed State)

```
apiRegistry
  +-- protocolPlugins: Map<ProtocolClass, Set<PluginInstance>>
  +-- plugins.add(ProtocolClass, plugin)
  +-- plugins.remove(ProtocolClass, PluginClass)
  +-- plugins.has(ProtocolClass, PluginClass)
  +-- plugins.getAll(ProtocolClass)
  +-- plugins.clear(ProtocolClass)

RestProtocol (instance)
  +-- _instancePlugins: Set<RestPluginHooks>  <-- Preserved
  +-- plugins.add/remove/getAll  <-- Preserved
  +-- queries apiRegistry.plugins.getAll(RestProtocol) during request

Plugin Chain: [...apiRegistry plugins] + [...instance]
```

## Decisions

### Decision 1: OCP-Compliant Generic Method

Use protocol class as parameter instead of protocol-specific namespaces:

```typescript
// OCP-COMPLIANT (adding new protocols requires no changes):
apiRegistry.plugins.add(RestProtocol, plugin);
apiRegistry.plugins.add(SseProtocol, plugin);
apiRegistry.plugins.getAll(RestProtocol);
apiRegistry.plugins.remove(RestProtocol, PluginClass);
apiRegistry.plugins.has(RestProtocol, PluginClass);

// NOT THIS (violates OCP - requires new property for each protocol):
apiRegistry.restPlugins.add(plugin);
apiRegistry.ssePlugins.add(plugin);
```

**Rationale:**
- Open for extension (new protocols) without modification
- Single method signature handles all protocols
- Type inference from protocol class parameter

**Alternatives considered:**
- Protocol-specific namespaces - Rejected: violates OCP
- Separate registry per protocol - Rejected: complicates cross-cutting plugins

### Decision 2: Internal Storage with Map<ProtocolClass, Set<PluginInstance>>

```typescript
class ApiRegistryImpl {
  private protocolPlugins: Map<ProtocolClass, Set<unknown>> = new Map();

  readonly plugins = {
    add: <T extends ApiProtocol>(
      protocolClass: new (...args: unknown[]) => T,
      plugin: ProtocolPluginType<T>
    ): void => {
      if (!this.protocolPlugins.has(protocolClass)) {
        this.protocolPlugins.set(protocolClass, new Set());
      }
      this.protocolPlugins.get(protocolClass)!.add(plugin);
    },

    getAll: <T extends ApiProtocol>(
      protocolClass: new (...args: unknown[]) => T
    ): readonly ProtocolPluginType<T>[] => {
      const plugins = this.protocolPlugins.get(protocolClass);
      return plugins ? Array.from(plugins) as ProtocolPluginType<T>[] : [];
    },
    // ...
  };
}
```

**Rationale:**
- Protocol class as key enables type-safe retrieval
- Set prevents duplicate plugin instances
- Map allows arbitrary protocol types

### Decision 3: No createApiRegistry() Factory

Micro-frontends get isolation via separate @hai3/api package instances:

```typescript
// Micro-frontend A has its own @hai3/api instance
// Micro-frontend B has its own @hai3/api instance
// Natural isolation - no factory needed
```

**Rationale:**
- Package bundling provides natural isolation
- Simpler API without factory pattern
- No need to wire registry instances through dependency injection

**Alternatives considered:**
- createApiRegistry() factory - Rejected: unnecessary complexity
- Registry injection in protocols - Rejected: complicates API

### Decision 4: Protocol Queries apiRegistry During Request

Instead of injecting plugins via constructor, protocols query apiRegistry:

```typescript
class RestProtocol {
  private getGlobalPlugins(): RestPluginHooks[] {
    return apiRegistry.plugins.getAll(RestProtocol);
  }

  getPluginsInOrder(): RestPluginHooks[] {
    return [
      ...this.getGlobalPlugins(),
      ...Array.from(this._instancePlugins),
    ];
  }
}
```

**Rationale:**
- Simpler constructor (no registry parameter)
- Dynamic: plugins added after protocol creation are picked up
- apiRegistry is singleton within package instance

### Decision 5: Keep Instance-Level Plugins Unchanged

The `protocol.plugins` namespace remains for instance-specific plugins:

```typescript
const protocol = new RestProtocol();
protocol.plugins.add(instancePlugin);  // Unchanged API
```

**Rationale:**
- Instance plugins are already isolated
- Familiar API for existing users
- Clean separation: apiRegistry = global context, instance = local overrides

## Data Flow

### Plugin Registration (App Setup)

```
App Init
  |
  +--> apiRegistry.plugins.add(RestProtocol, authPlugin)
  |
  +--> apiRegistry.plugins.add(RestProtocol, loggingPlugin)
  |
  +--> apiRegistry.plugins.add(SseProtocol, loggingPlugin)
  |
  +--> Create services (protocols query apiRegistry during requests)
```

### Request Execution

```
service.get('/api/users')
  |
  +--> RestProtocol.request()
         |
         +--> getGlobalPlugins() calls apiRegistry.plugins.getAll(RestProtocol)
         |
         +--> Get plugins: [...apiRegistry plugins, ...instancePlugins]
         |
         +--> Execute onRequest chain (FIFO)
         |
         +--> HTTP request (or short-circuit)
         |
         +--> Execute onResponse chain (LIFO)
```

## API Patterns

### Pattern 1: App-Level Global Plugins

```typescript
// app/setup.ts
import { apiRegistry, RestProtocol, SseProtocol } from '@hai3/api';

// Auth plugin for all REST calls
apiRegistry.plugins.add(RestProtocol, new AuthPlugin({ getToken }));

// Logging for all protocols
apiRegistry.plugins.add(RestProtocol, new LoggingPlugin());
apiRegistry.plugins.add(SseProtocol, new LoggingPlugin());
```

### Pattern 2: Studio Mock Toggle

```typescript
// ApiModeToggle.tsx
import { apiRegistry, RestProtocol, RestMockPlugin } from '@hai3/api';

const mockPluginRef = useRef<RestMockPlugin | null>(null);

const handleToggle = (checked: boolean) => {
  if (checked) {
    mockPluginRef.current = new RestMockPlugin({ delay: 500 });
    apiRegistry.plugins.add(RestProtocol, mockPluginRef.current);
  } else if (mockPluginRef.current) {
    apiRegistry.plugins.remove(RestProtocol, RestMockPlugin);
    mockPluginRef.current = null;
  }
};
```

### Pattern 3: Test Setup

```typescript
// test file
import { apiRegistry, RestProtocol } from '@hai3/api';

beforeEach(() => {
  apiRegistry.reset();  // Clears all plugins and services
});

it('should mock API calls', async () => {
  apiRegistry.plugins.add(RestProtocol, new RestMockPlugin({
    mockMap: { 'GET /api/test': () => ({ data: 'mock' }) }
  }));
  // ... test
});
```

## Risks / Trade-offs

### Risk 1: Migration Effort

**Risk:** Existing code using `RestProtocol.globalPlugins` will break.

**Mitigation:**
- This is a fork, not upstream - no external consumers
- Search-and-replace migration is straightforward
- Tests will catch any missed usages

### Risk 2: Circular Import Potential

**Risk:** Protocols importing apiRegistry could create circular dependencies.

**Mitigation:**
- apiRegistry is a separate module from protocols
- Lazy access via function call, not module-level import
- Build validation will catch any issues

### Risk 3: Studio ApiModeToggle Needs Refactoring

**Risk:** ApiModeToggle currently relies on static `RestProtocol.globalPlugins`.

**Mitigation:**
- Simple API change: `RestProtocol.globalPlugins.add()` to `apiRegistry.plugins.add(RestProtocol, ...)`
- Same mental model, different location

## Migration Plan

### Step 1: Add ProtocolClass Type
- Add type definition to `packages/api/src/types.ts`

### Step 2: Add plugins Namespace to apiRegistry
- Add `protocolPlugins: Map<ProtocolClass, Set<unknown>>`
- Add `plugins` namespace with add/remove/has/getAll/clear methods
- Include in `reset()` method

### Step 3: Update RestProtocol
- Remove static `_globalPlugins` and `globalPlugins` namespace
- Add `getGlobalPlugins()` method that queries apiRegistry
- Update `getPluginsInOrder()` to use `getGlobalPlugins()`

### Step 4: Update SseProtocol
- Same changes as RestProtocol

### Step 5: Update BaseApiService
- Remove `globalPluginsProvider` field and methods
- Remove `_setGlobalPluginsProvider` method

### Step 6: Update Tests
- Replace `RestProtocol.globalPlugins.clear()` with `apiRegistry.reset()` or `apiRegistry.plugins.clear(RestProtocol)`
- Update plugin registration to use apiRegistry.plugins

### Step 7: Update Studio
- Refactor ApiModeToggle to use `apiRegistry.plugins.add(RestProtocol, ...)`

### Step 8: Layer Propagation (Re-exports)
- Update `packages/framework/src/index.ts` to re-export `ProtocolClass` and `ProtocolPluginType` types from @hai3/api
- Update `packages/react/src/index.ts` to re-export these types from @hai3/framework
- This ensures consumers at any layer can access the new types

### Step 9: Update AI Guidelines
- Update `.ai/targets/API.md` with new plugin registration rules

### Step 10: Update AI Commands
- Update `packages/api/commands/hai3-new-api-service*.md` with new patterns

## Open Questions

None - the OCP-compliant approach with package-instance isolation addresses all concerns.
