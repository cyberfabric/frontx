# Change: Refactor Global Plugins from Static Class Members to apiRegistry-Based Management

## Why

The current global plugin implementation uses static class members (`RestProtocol.globalPlugins` and `SseProtocol.globalPlugins`) that create process-wide singletons. This design fundamentally conflicts with micro-frontend architecture where multiple isolated applications may run in the same JavaScript runtime.

**Problem**: When screenset A registers a mock plugin via `RestProtocol.globalPlugins.add()`, screenset B also receives this plugin - even if screenset B should use real APIs. There is no isolation boundary.

**Opportunity**: Since this implementation is still in a fork (not merged to upstream), we can make a clean break without backward compatibility concerns.

**Isolation Strategy**: Micro-frontends will have their own @hai3/api package instance, providing natural isolation. No factory function needed.

## What Changes

### Core Changes

1. **Remove static `_globalPlugins` from `RestProtocol`**
   - Delete `private static _globalPlugins: Set<RestPluginHooks>`
   - Delete `public static readonly globalPlugins` namespace

2. **Remove static `_globalPlugins` from `SseProtocol`**
   - Delete `private static _globalPlugins: Set<SsePluginHooks>`
   - Delete `public static readonly globalPlugins` namespace

3. **Add OCP-compliant `apiRegistry.plugins` namespace**
   - Generic method with protocol class as parameter (OCP-compliant)
   - `apiRegistry.plugins.add(RestProtocol, plugin)` - add plugin for protocol
   - `apiRegistry.plugins.add(SseProtocol, plugin)` - add plugin for protocol
   - `apiRegistry.plugins.remove(RestProtocol, PluginClass)` - remove by class
   - `apiRegistry.plugins.has(RestProtocol, PluginClass)` - check registration
   - `apiRegistry.plugins.getAll(RestProtocol)` - get all plugins for protocol
   - `apiRegistry.plugins.clear(RestProtocol)` - clear all plugins for protocol
   - Internal storage: `Map<ProtocolClass, Set<PluginInstance>>`

4. **Update protocol initialization to receive plugins from apiRegistry**
   - Protocols query `apiRegistry.plugins.getAll(ProtocolClass)` during request execution
   - No registry injection via constructor (simpler API)

5. **Update `BaseApiService`**
   - Remove `globalPluginsProvider` pattern
   - Protocol queries apiRegistry directly when needed

6. **Update Studio `ApiModeToggle`**
   - Use `apiRegistry.plugins.add(RestProtocol, mockPlugin)` instead of static

7. **Remove `createApiRegistry()` function**
   - Delete from `packages/api/src/apiRegistry.ts` (line 155-157)
   - Remove export from `packages/api/src/index.ts` (line 78)
   - Redundant with package-instance isolation for micro-frontends

### Layer Propagation

8. **Update @hai3/framework re-exports**
   - Add `ProtocolClass` type export to re-exports from @hai3/api
   - Add `ProtocolPluginType` type export to re-exports from @hai3/api
   - Note: `createApiRegistry` was never re-exported, no removal needed

9. **Update @hai3/react re-exports**
   - Add `ProtocolClass` type export to re-exports from @hai3/framework
   - Add `ProtocolPluginType` type export to re-exports from @hai3/framework
   - Ensures consumers can access new types from any layer

### Breaking Changes

- **BREAKING**: `RestProtocol.globalPlugins` removed
- **BREAKING**: `SseProtocol.globalPlugins` removed
- **BREAKING**: `createApiRegistry()` removed (use package isolation instead)
- **BREAKING**: Tests must use `apiRegistry.plugins.add(RestProtocol, plugin)`

### Non-Breaking (Preserved)

- Instance-level `protocol.plugins` namespace remains unchanged
- Plugin hooks interface (`RestPluginHooks`, `SsePluginHooks`) unchanged
- `ApiPluginBase` and `ApiPlugin<TConfig>` unchanged

## Impact

### Affected Specs
- `sdk-core` - Protocol plugin management requirements

### Affected Files

**@hai3/api package:**
- `packages/api/src/protocols/RestProtocol.ts` - Remove static globalPlugins
- `packages/api/src/protocols/SseProtocol.ts` - Remove static globalPlugins
- `packages/api/src/apiRegistry.ts` - Add plugins namespace, remove createApiRegistry()
- `packages/api/src/BaseApiService.ts` - Remove globalPluginsProvider
- `packages/api/src/types.ts` - Add ProtocolClass type
- `packages/api/src/index.ts` - Update exports (remove createApiRegistry)
- `packages/api/src/__tests__/restPlugins.integration.test.ts` - Use apiRegistry.plugins
- `packages/api/src/__tests__/ssePlugins.integration.test.ts` - Use apiRegistry.plugins
- `packages/api/src/__tests__/crossCuttingPlugins.integration.test.ts` - Use apiRegistry.plugins
- `packages/api/src/__tests__/mockSelfRegistration.integration.test.ts` - Use apiRegistry.plugins

**@hai3/studio package:**
- `packages/studio/src/sections/ApiModeToggle.tsx` - Use apiRegistry.plugins

**@hai3/framework package (layer propagation):**
- `packages/framework/src/index.ts` - Add ProtocolClass, ProtocolPluginType type re-exports

**@hai3/react package (layer propagation):**
- `packages/react/src/index.ts` - Add ProtocolClass, ProtocolPluginType type re-exports

**Package Documentation:**
- `packages/api/CLAUDE.md` - Update plugin API examples, remove createApiRegistry

**AI Guidelines:**
- `.ai/targets/API.md` - Update plugin registration rules

**AI Commands:**
- `packages/api/commands/hai3-new-api-service.md` - Clarify per-service vs global plugin patterns
- `packages/api/commands/hai3-new-api-service.framework.md` - Clarify plugin patterns
- `packages/api/commands/hai3-new-api-service.react.md` - Clarify plugin patterns

## Benefits

1. **OCP-compliant**: Adding new protocols does not require new namespace properties
2. **Micro-frontend isolation**: Separate package instances provide natural isolation
3. **Type-safe**: Protocol class as parameter enables TypeScript inference
4. **Simpler API**: One method signature for all protocols
5. **Test isolation**: `apiRegistry.reset()` clears all state cleanly
6. **No factory complexity**: Removed createApiRegistry() in favor of package isolation
