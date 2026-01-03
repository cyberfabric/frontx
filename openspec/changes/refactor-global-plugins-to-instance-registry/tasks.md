# Tasks: Refactor Global Plugins to apiRegistry-Based Management

## 1. Add Types for Protocol Plugin Management

- [x] 1.1 Add `ProtocolClass` type to `packages/api/src/types.ts`
  - Type: `type ProtocolClass = new (...args: unknown[]) => ApiProtocol`
  - Traceability: proposal.md "Add OCP-compliant apiRegistry.plugins namespace"

- [x] 1.2 Add `ProtocolPluginType<T>` conditional type for type-safe plugin retrieval
  - Maps RestProtocol to RestPluginHooks, SseProtocol to SsePluginHooks
  - Traceability: design.md "Decision 2: Internal Storage"

## 2. Add plugins Namespace to apiRegistry

- [x] 2.1 Add `protocolPlugins: Map<ProtocolClass, Set<unknown>>` field to ApiRegistryImpl
  - Traceability: design.md "Decision 2: Internal Storage"

- [x] 2.2 Add `plugins.add(ProtocolClass, plugin)` method
  - Create Set for protocol if not exists
  - Add plugin to protocol's Set
  - Traceability: proposal.md "apiRegistry.plugins.add(RestProtocol, plugin)"

- [x] 2.3 Add `plugins.remove(ProtocolClass, PluginClass)` method
  - Find plugin instance by class (instanceof)
  - Call plugin.destroy() if available
  - Remove from Set
  - Traceability: proposal.md "apiRegistry.plugins.remove(RestProtocol, PluginClass)"

- [x] 2.4 Add `plugins.has(ProtocolClass, PluginClass)` method
  - Check if plugin of given class exists for protocol
  - Traceability: proposal.md "apiRegistry.plugins.has(RestProtocol, PluginClass)"

- [x] 2.5 Add `plugins.getAll(ProtocolClass)` method
  - Return readonly array of plugins for protocol
  - Return empty array if no plugins registered
  - Traceability: proposal.md "apiRegistry.plugins.getAll(RestProtocol)"

- [x] 2.6 Add `plugins.clear(ProtocolClass)` method
  - Call destroy() on each plugin
  - Clear the Set for protocol
  - Traceability: proposal.md "apiRegistry.plugins.clear(RestProtocol)"

- [x] 2.7 Update `reset()` method to clear protocolPlugins Map
  - Iterate all protocol Sets, call destroy() on each plugin
  - Clear the Map
  - Traceability: design.md "Pattern 3: Test Setup"

- [x] 2.8 Remove `createApiRegistry()` function from apiRegistry.ts
  - Delete lines 155-157 in `packages/api/src/apiRegistry.ts`
  - Redundant with package-instance isolation
  - Traceability: proposal.md "Remove createApiRegistry() function"

- [x] 2.9 Remove `createApiRegistry` export from index.ts
  - Delete from line 78 in `packages/api/src/index.ts`
  - Traceability: proposal.md "Remove createApiRegistry() function"

- [x] 2.10 Add unit tests for apiRegistry.plugins namespace
  - Test add/remove/has/getAll/clear for RestProtocol
  - Test add/remove/has/getAll/clear for SseProtocol
  - Test reset() clears all protocol plugins
  - Test destroy() is called on remove and clear
  - Traceability: design.md "Decision 2: Internal Storage"

## 3. Update RestProtocol

- [x] 3.1 Remove static `_globalPlugins` field from RestProtocol
  - Delete: `private static _globalPlugins: Set<RestPluginHooks> = new Set();`
  - Traceability: proposal.md "Remove static _globalPlugins from RestProtocol"

- [x] 3.2 Remove static `globalPlugins` namespace from RestProtocol
  - Delete entire `public static readonly globalPlugins = { ... }` block
  - Traceability: proposal.md "Remove static _globalPlugins from RestProtocol"

- [x] 3.3 Add `getGlobalPlugins()` private method to RestProtocol
  - Import apiRegistry (handle circular import if needed)
  - Return `apiRegistry.plugins.getAll(RestProtocol)`
  - Traceability: design.md "Decision 4: Protocol Queries apiRegistry"

- [x] 3.4 Update `getPluginsInOrder()` to use `getGlobalPlugins()`
  - Change: `[...RestProtocol._globalPlugins]` to `[...this.getGlobalPlugins()]`
  - Traceability: design.md "After (Proposed State)"

## 4. Update SseProtocol

- [x] 4.1 Remove static `_globalPlugins` field from SseProtocol
  - Delete: `private static _globalPlugins: Set<SsePluginHooks> = new Set();`
  - Traceability: proposal.md "Remove static _globalPlugins from SseProtocol"

- [x] 4.2 Remove static `globalPlugins` namespace from SseProtocol
  - Delete entire `public static readonly globalPlugins = { ... }` block
  - Traceability: proposal.md "Remove static _globalPlugins from SseProtocol"

- [x] 4.3 Add `getGlobalPlugins()` private method to SseProtocol
  - Import apiRegistry (handle circular import if needed)
  - Return `apiRegistry.plugins.getAll(SseProtocol)`
  - Traceability: design.md "Decision 4: Protocol Queries apiRegistry"

- [x] 4.4 Update `getPluginsInOrder()` to use `getGlobalPlugins()`
  - Change: `[...SseProtocol._globalPlugins]` to `[...this.getGlobalPlugins()]`
  - Traceability: design.md "After (Proposed State)"

## 5. Update BaseApiService

- [x] 5.1 Remove `globalPluginsProvider` field
  - Delete: `private globalPluginsProvider: (() => readonly ApiPluginBase[]) | null = null;`
  - Traceability: proposal.md "Update BaseApiService"

- [x] 5.2 Remove `_setGlobalPluginsProvider()` method
  - Delete entire method
  - Traceability: proposal.md "Update BaseApiService"

- [x] 5.3 Remove `getGlobalPlugins()` private method
  - Delete entire method
  - Traceability: proposal.md "Update BaseApiService"

- [x] 5.4 Update `getMergedPluginsInOrder()` if it references global plugins
  - Remove global plugins logic if present
  - Service plugins only (or delegate to protocol)
  - Traceability: proposal.md "Update BaseApiService"

## 6. Update Tests

- [x] 6.1 Refactor `restPlugins.integration.test.ts`
  - Replace `RestProtocol.globalPlugins.clear()` with `apiRegistry.reset()` or `apiRegistry.plugins.clear(RestProtocol)`
  - Replace `RestProtocol.globalPlugins.add(plugin)` with `apiRegistry.plugins.add(RestProtocol, plugin)`
  - Replace `RestProtocol.globalPlugins.has(plugin)` with `apiRegistry.plugins.has(RestProtocol, PluginClass)`
  - Traceability: design.md "Pattern 3: Test Setup"

- [x] 6.2 Refactor `ssePlugins.integration.test.ts`
  - Replace `SseProtocol.globalPlugins.clear()` with `apiRegistry.reset()` or `apiRegistry.plugins.clear(SseProtocol)`
  - Replace `SseProtocol.globalPlugins.add(plugin)` with `apiRegistry.plugins.add(SseProtocol, plugin)`
  - Replace `SseProtocol.globalPlugins.has(plugin)` with `apiRegistry.plugins.has(SseProtocol, PluginClass)`
  - Traceability: design.md "Pattern 3: Test Setup"

- [x] 6.3 Refactor `crossCuttingPlugins.integration.test.ts`
  - Use apiRegistry.plugins for both RestProtocol and SseProtocol
  - Test cross-cutting plugin registration
  - Traceability: design.md "Pattern 1: App-Level Global Plugins"

- [x] 6.4 Refactor `mockSelfRegistration.integration.test.ts`
  - Use apiRegistry.plugins instead of static global plugins
  - Traceability: design.md "Pattern 3: Test Setup"

## 7. Update Studio ApiModeToggle

- [x] 7.1 Update ApiModeToggle imports
  - Add import for apiRegistry
  - Traceability: proposal.md "Update Studio ApiModeToggle"

- [x] 7.2 Refactor ApiModeToggle to use apiRegistry.plugins
  - Replace `RestProtocol.globalPlugins.add(mockPluginRef.current)` with `apiRegistry.plugins.add(RestProtocol, mockPluginRef.current)`
  - Replace `RestProtocol.globalPlugins.remove(mockPluginRef.current)` with `apiRegistry.plugins.remove(RestProtocol, RestMockPlugin)`
  - Replace `RestProtocol.globalPlugins.has(mockPluginRef.current)` with `apiRegistry.plugins.has(RestProtocol, RestMockPlugin)`
  - Traceability: design.md "Pattern 2: Studio Mock Toggle"

## 8. Layer Propagation (Re-exports)

- [x] 8.1 Update @hai3/framework re-exports in `packages/framework/src/index.ts`
  - Add `ProtocolClass` to type exports from @hai3/api (line ~244-272)
  - Add `ProtocolPluginType` to type exports from @hai3/api
  - Traceability: proposal.md "Update @hai3/framework re-exports"

- [x] 8.2 Update @hai3/react re-exports in `packages/react/src/index.ts`
  - Add `ProtocolClass` to type exports from @hai3/framework (line ~275-318)
  - Add `ProtocolPluginType` to type exports from @hai3/framework
  - Traceability: proposal.md "Update @hai3/react re-exports"

- [x] 8.3 Verify layer propagation with type-check
  - Run `npm run type-check` to ensure types are accessible at all layers
  - Verify no missing exports in downstream packages
  - Traceability: proposal.md "Ensures consumers can access new types from any layer"

## 9. Update AI Guidelines

- [x] 9.1 Update `.ai/targets/API.md` - PLUGIN RULES section
  - Follow AI.md rules: under 100 lines, ASCII only, keywords REQUIRED/FORBIDDEN
  - Add: FORBIDDEN: RestProtocol.globalPlugins (removed API)
  - Add: FORBIDDEN: SseProtocol.globalPlugins (removed API)
  - Add: REQUIRED: apiRegistry.plugins.add(ProtocolClass, plugin) for global plugins
  - Update existing plugin rules to reference new API
  - Keep under 100 lines, one concern per section
  - Traceability: proposal.md "Update plugin registration rules"

## 10. Update Package Documentation

- [x] 10.1 Update `packages/api/CLAUDE.md`
  - Remove `createApiRegistry` from Exports section (line 182)
  - Update Mock Support section to show apiRegistry.plugins.add(ProtocolClass, plugin)
  - Update Plugin System section with new global plugin API
  - Update Mock Mode section with new toggle pattern
  - Ensure examples use apiRegistry.plugins.add(RestProtocol, ...) not static
  - Traceability: proposal.md "Update plugin API examples, remove createApiRegistry"

## 11. Update AI Commands

- [x] 11.1 Update `packages/api/commands/hai3-new-api-service.md`
  - Follow AI_COMMANDS.md rules: self-contained, procedural steps
  - Primary pattern: per-service mock registration via restProtocol.registerMockMap()
  - Note: Global plugins via apiRegistry.plugins.add() for cross-cutting concerns only
  - Keep per-service pattern as primary recommendation for new services
  - Traceability: proposal.md "Clarify per-service vs global plugin patterns"

- [x] 11.2 Update `packages/api/commands/hai3-new-api-service.framework.md`
  - Follow AI_COMMANDS.md rules: layer-specific content
  - Primary pattern: per-service mock registration
  - Note: Global plugins available but not typical for new service creation
  - Traceability: proposal.md "Clarify plugin patterns"

- [x] 11.3 Update `packages/api/commands/hai3-new-api-service.react.md`
  - Follow AI_COMMANDS.md rules: layer-specific content
  - Primary pattern: per-service mock registration
  - Note: Global plugins available but not typical for new service creation
  - Traceability: proposal.md "Clarify plugin patterns"

## 12. Validation

- [x] 12.1 Run `npm run type-check` - verify TypeScript compilation
  - Traceability: Ensures all usages of removed static members are caught

- [x] 12.2 Run `npm run test` - verify all tests pass
  - Traceability: Ensures refactored tests work correctly

- [x] 12.3 Run `npm run arch:check` - verify architecture rules
  - Traceability: Ensures no new violations introduced

- [x] 12.4 Run `npm run dev` and manually test ApiModeToggle
  - Toggle mock mode on/off
  - Verify API calls use mock/real as expected
  - Traceability: design.md "Pattern 2: Studio Mock Toggle"

- [x] 12.5 Run circular import verification
  - Run `npx madge --circular packages/api/src/index.ts` or similar
  - Verify no circular dependencies between apiRegistry and protocols
  - Alternative: Check build output for circular dependency warnings
  - Traceability: design.md "Risk 2: Circular Import Potential"

- [x] 12.6 Verify createApiRegistry removal
  - Grep for `createApiRegistry` in codebase
  - Ensure no remaining usages after removal
  - Traceability: proposal.md "Remove createApiRegistry() function"

- [x] 12.7 Verify layer propagation
  - Confirm ProtocolClass and ProtocolPluginType are importable from @hai3/react
  - Test import in a consumer file to ensure types propagate correctly
  - Traceability: proposal.md "Ensures consumers can access new types from any layer"
