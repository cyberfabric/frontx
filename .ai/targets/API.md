<!-- @standalone:override -->
# API Base Classes Guidelines

## AI WORKFLOW (REQUIRED)
1) Summarize 3-6 rules from this file before proposing changes.
2) STOP if you intend to modify BaseApiService or apiRegistry.ts.
3) For screenset API services, see SCREENSETS.md.

## SCOPE
- Core API infrastructure: packages/api/src/**
  - plugins/  -> request and response interceptors (ApiPluginBase, ApiPlugin, MockPlugin)
  - protocols/ -> communication protocols (RestProtocol, SseProtocol)
  - apiRegistry.ts -> service registry (read-only)
  - BaseApiService -> abstract base class
- DEPRECATED: src/api/ (deleted - API services now in screensets)

## CRITICAL RULES
- One domain service per backend domain (no entity-based services).
- Services self-register using apiRegistry.register(ServiceClass) with class reference (registry source file must never be edited).
- All calls go through typed service methods (no raw get("/url")).
- Mock data configured via apiRegistry.plugins.add(new MockPlugin({ mockMap })) or per-service plugins.
- All services extend BaseApiService (no module augmentation needed with class-based registration).
- VERTICAL SLICE ARCHITECTURE: Screenset services should use per-service plugins to maintain isolation.

## STOP CONDITIONS
- Editing BaseApiService or apiRegistry.ts.
- Calling APIs directly inside React components.
- Adding generic helpers like get("/endpoint").
- Creating UserService, InvoiceService, or other entity-style services.

## ADDING A SERVICE (DEPRECATED)
- FORBIDDEN: Creating services in packages/uicore/src/api/services/.
- FORBIDDEN: Creating services in src/api/services/ (directory deleted).
- REQUIRED: Create services in src/screensets/*/api/. See SCREENSETS.md.

## USAGE RULES
- Access only via apiRegistry.getService(ServiceClass).methodName().
- Type inference from class constructor reference (no module augmentation needed).
- No direct axios or fetch usage outside BaseApiService.

## PLUGIN RULES
- REQUIRED: Extend ApiPluginBase (no config) or ApiPlugin<TConfig> (with config) to create plugins.
- REQUIRED: Use namespaced API (apiRegistry.plugins.add, service.plugins.add).
- REQUIRED: Plugins are identified by class reference (instanceof), not string names.
- REQUIRED: MockPlugin is self-contained (all config in constructor).
- PREFERRED: Register MockPlugin per-service for vertical slice compliance.
- ALLOWED: Global MockPlugin for cross-cutting mocks (e.g., auth simulation).
- FORBIDDEN: String-based plugin names for identification.
- FORBIDDEN: Mock-specific methods on apiRegistry (registerMocks, setMockMode).
- FORBIDDEN: Global MockPlugin with screenset-specific mocks (breaks vertical slices).

## MOCK DATA RULES
- REQUIRED: Use lodash for all string, array, and object operations in mock data factories.
- FORBIDDEN: Native JavaScript helpers where lodash provides an equivalent (see GUIDELINES.md BLOCKLIST).

## PRE-DIFF CHECKLIST
- [ ] Service class created extending BaseApiService.
- [ ] Service registered with apiRegistry.register(ServiceClass).
- [ ] App mocks configured via MockPlugin if needed.
- [ ] No edits to apiRegistry.ts.
- [ ] No raw get("/url") calls.
