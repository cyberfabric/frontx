<!-- @standalone:override -->
# API Base Classes Guidelines

## AI WORKFLOW (REQUIRED)
1) Summarize 3-6 rules from this file before proposing changes.
2) STOP if you intend to modify BaseApiService or apiRegistry.ts.
3) For screenset API services, see SCREENSETS.md.

## SCOPE
- Core API infrastructure: packages/api/src/**
  - plugins/  -> request and response interceptors (ApiPluginBase, ApiPlugin, RestMockPlugin, SseMockPlugin)
  - protocols/ -> communication protocols (RestProtocol, SseProtocol) with protocol-specific plugin systems
  - apiRegistry.ts -> service registry (read-only)
  - BaseApiService -> abstract base class
- DEPRECATED: src/api/ (deleted - API services now in screensets)

## CRITICAL RULES
- REQUIRED: One domain service per backend domain (no entity-based services).
- REQUIRED: Services self-register using apiRegistry.register(ServiceClass) with class reference.
- REQUIRED: All calls go through typed service methods (no raw get("/url")).
- REQUIRED: Mock data configured via protocol-specific plugins on protocol instances.
- REQUIRED: All services extend BaseApiService.
- REQUIRED: Screenset services use per-service plugins to maintain isolation.

## STOP CONDITIONS
- STOP: Editing BaseApiService or apiRegistry.ts.
- STOP: Calling APIs directly inside React components.
- STOP: Adding generic helpers like get("/endpoint").
- STOP: Creating UserService, InvoiceService, or other entity-style services.

## ADDING A SERVICE (DEPRECATED)
- FORBIDDEN: Creating services in packages/uicore/src/api/services/.
- FORBIDDEN: Creating services in src/api/services/ (directory deleted).
- REQUIRED: Create services in src/screensets/*/api/. See SCREENSETS.md.

## USAGE RULES
- REQUIRED: Access only via apiRegistry.getService(ServiceClass).methodName().
- REQUIRED: Type inference from class constructor reference (no module augmentation).
- FORBIDDEN: Direct axios or fetch usage outside BaseApiService.

## PLUGIN RULES
- REQUIRED: Extend ApiPluginBase (no config) or ApiPlugin<TConfig> (with config) to create plugins.
- REQUIRED: Use apiRegistry.plugins.add(ProtocolClass, plugin) for global protocol plugins.
- REQUIRED: Use protocol.plugins.add(plugin) for instance-level plugins.
- REQUIRED: Plugins are identified by class reference (instanceof), not string names.
- REQUIRED: Mock plugins are protocol-specific (RestMockPlugin, SseMockPlugin).
- REQUIRED: Use `this.registerPlugin(protocol, mockPlugin)` to register mock plugins in service constructor.
- REQUIRED: Custom mock plugins must have `static readonly [MOCK_PLUGIN] = true` for framework identification.
- REQUIRED: Initialize mock effects via `initMockEffects()` in main.tsx.
- FORBIDDEN: RestProtocol.globalPlugins (removed API).
- FORBIDDEN: SseProtocol.globalPlugins (removed API).
- FORBIDDEN: String-based plugin names for identification.
- FORBIDDEN: Mock-specific methods on apiRegistry (registerMocks, setMockMode).
- FORBIDDEN: Generic MockPlugin class (use protocol-specific mock plugins).
- FORBIDDEN: registerMockMap() and getMockMap() on protocols (removed API).
- FORBIDDEN: Directly adding mock plugins to protocol.plugins in DEV mode (use registerPlugin pattern).

## PROTOCOL-SPECIFIC PLUGINS
- REQUIRED: RestProtocol plugins implement RestPluginHooks (onRequest, onResponse, destroy).
- REQUIRED: SseProtocol plugins implement SsePluginHooks (onConnect, onEvent, onDisconnect, destroy).
- REQUIRED: Use RestMockPlugin for REST mocks, SseMockPlugin for SSE mocks.
- REQUIRED: Plugin execution order is FIFO for requests, LIFO for responses.

## MOCK DATA RULES
- REQUIRED: Use lodash for all string, array, and object operations in mock data factories.
- FORBIDDEN: Native JavaScript helpers where lodash provides an equivalent (see GUIDELINES.md BLOCKLIST).

## PRE-DIFF CHECKLIST
- [ ] Service class created extending BaseApiService.
- [ ] Service registered with apiRegistry.register(ServiceClass).
- [ ] Protocol-specific mocks configured (RestMockPlugin, SseMockPlugin) if needed.
- [ ] No edits to apiRegistry.ts.
- [ ] No raw get("/url") calls.
