# sdk-core Spec Delta

## ADDED Requirements

### Requirement: OCP-Compliant Protocol Plugin Management

The system SHALL provide protocol plugin management via `apiRegistry.plugins` namespace using protocol class as parameter, following the Open/Closed Principle.

#### Scenario: Add plugin for RestProtocol

- **WHEN** calling `apiRegistry.plugins.add(RestProtocol, plugin)`
- **THEN** the plugin is stored for RestProtocol
- **AND** all RestProtocol instances receive this plugin during request execution
- **AND** plugins are returned by `apiRegistry.plugins.getAll(RestProtocol)`

#### Scenario: Add plugin for SseProtocol

- **WHEN** calling `apiRegistry.plugins.add(SseProtocol, plugin)`
- **THEN** the plugin is stored for SseProtocol
- **AND** all SseProtocol instances receive this plugin during connection
- **AND** plugins are returned by `apiRegistry.plugins.getAll(SseProtocol)`

#### Scenario: Remove plugin by class

- **WHEN** calling `apiRegistry.plugins.remove(RestProtocol, PluginClass)`
- **THEN** the plugin instance of that class is removed
- **AND** `plugin.destroy()` is called if available
- **AND** `apiRegistry.plugins.has(RestProtocol, PluginClass)` returns `false`

#### Scenario: Check if plugin is registered

- **WHEN** calling `apiRegistry.plugins.has(RestProtocol, PluginClass)`
- **THEN** returns `true` if a plugin of that class is registered for RestProtocol
- **AND** returns `false` otherwise

#### Scenario: Get all plugins for protocol

- **WHEN** calling `apiRegistry.plugins.getAll(RestProtocol)`
- **THEN** readonly array of all plugins registered for RestProtocol is returned
- **AND** plugins are in registration order (FIFO)
- **AND** returns empty array if no plugins registered

#### Scenario: Clear all plugins for protocol

- **WHEN** calling `apiRegistry.plugins.clear(RestProtocol)`
- **THEN** all plugins for RestProtocol are removed
- **AND** `destroy()` is called on each plugin
- **AND** `apiRegistry.plugins.getAll(RestProtocol)` returns empty array

#### Scenario: Reset clears all protocol plugins

- **WHEN** calling `apiRegistry.reset()`
- **THEN** all plugins for all protocols are removed
- **AND** `destroy()` is called on each plugin
- **AND** services and other registry state are also cleared

### Requirement: Protocol Queries apiRegistry for Global Plugins

The system SHALL have protocols query `apiRegistry.plugins.getAll(ProtocolClass)` during request execution to receive registered plugins.

#### Scenario: RestProtocol receives plugins from apiRegistry

- **WHEN** a request is made through RestProtocol
- **THEN** RestProtocol queries `apiRegistry.plugins.getAll(RestProtocol)`
- **AND** these plugins are included in the plugin chain before instance plugins

#### Scenario: SseProtocol receives plugins from apiRegistry

- **WHEN** a connection is made through SseProtocol
- **THEN** SseProtocol queries `apiRegistry.plugins.getAll(SseProtocol)`
- **AND** these plugins are included in the plugin chain before instance plugins

#### Scenario: Dynamic plugin addition is reflected

- **WHEN** a plugin is added via `apiRegistry.plugins.add(RestProtocol, plugin)` after protocol creation
- **THEN** subsequent requests through existing RestProtocol instances receive the plugin
- **AND** no protocol reconfiguration is needed

### Requirement: Micro-Frontend Isolation via Package Instances

The system SHALL provide micro-frontend isolation through separate @hai3/api package instances, without requiring factory functions.

#### Scenario: Separate package instances are isolated

- **WHEN** micro-frontend A imports @hai3/api and registers plugins
- **AND** micro-frontend B imports its own @hai3/api instance
- **THEN** plugins registered by A do NOT appear in B's apiRegistry
- **AND** each micro-frontend has complete plugin isolation

## REMOVED Requirements

### Requirement: Static Global Plugins on RestProtocol

**Reason**: Static class members create process-wide singletons that conflict with micro-frontend isolation. The OCP-compliant `apiRegistry.plugins.add(ProtocolClass, plugin)` pattern replaces this.

**Migration**: Replace `RestProtocol.globalPlugins.add(plugin)` with `apiRegistry.plugins.add(RestProtocol, plugin)`.

### Requirement: Static Global Plugins on SseProtocol

**Reason**: Static class members create process-wide singletons that conflict with micro-frontend isolation. The OCP-compliant `apiRegistry.plugins.add(ProtocolClass, plugin)` pattern replaces this.

**Migration**: Replace `SseProtocol.globalPlugins.add(plugin)` with `apiRegistry.plugins.add(SseProtocol, plugin)`.

## MODIFIED Requirements

### Requirement: Plugin execution follows FIFO order

The system SHALL execute plugins in registration order (FIFO) within their scope, with apiRegistry plugins executing before instance plugins.

#### Scenario: apiRegistry plugins execute before instance plugins

- **WHEN** a request is made through a protocol with both apiRegistry and instance plugins
- **THEN** apiRegistry plugins' `onRequest` hooks execute first (in FIFO order)
- **AND** instance plugins' `onRequest` hooks execute second (in FIFO order)
- **AND** `onResponse` hooks execute in reverse order (instance first, then apiRegistry)

### Requirement: Global API Plugin Registration (Namespaced API)

The system SHALL provide plugin registration via `apiRegistry.plugins` namespace using protocol class as parameter for OCP compliance.

#### Scenario: Register plugins with OCP-compliant API

- **WHEN** calling `apiRegistry.plugins.add(RestProtocol, plugin)`
- **THEN** the plugin is stored for RestProtocol
- **AND** the same method signature works for any protocol class
- **AND** adding new protocols does not require API changes

#### Scenario: Cross-cutting plugins across protocols

- **WHEN** calling `apiRegistry.plugins.add(RestProtocol, loggingPlugin)` and `apiRegistry.plugins.add(SseProtocol, loggingPlugin)`
- **THEN** the same plugin instance can be registered for multiple protocols
- **AND** each protocol receives its registered plugins independently

#### Scenario: Type-safe plugin retrieval

- **WHEN** calling `apiRegistry.plugins.getAll(RestProtocol)`
- **THEN** the return type is correctly inferred as `RestPluginHooks[]`
- **AND** TypeScript provides full type safety
