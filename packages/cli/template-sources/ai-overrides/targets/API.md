# API Services Guidelines (Standalone)

## AI WORKFLOW (REQUIRED)
1) Summarize 3-5 rules from this file before proposing changes.
2) For screenset API services, see SCREENSETS.md.

## CRITICAL RULES
- One domain service per backend domain (no entity-based services).
- Services self-register using apiRegistry.register(...).
- All calls go through typed service methods (no raw get("/url")).
- Mock data lives in the app layer and is wired via protocol-specific mock plugins.
- All services extend BaseApiService.
- Cached reads and writes use explicit descriptor contracts such as `RestEndpointProtocol.query()` / `queryWith()` / `mutation()`.
- SSE streams use explicit stream contracts such as `SseStreamProtocol.stream()`.

## USAGE RULES
- Access only via `apiRegistry.getService(ServiceClass)`.
- Type inference must originate from the service class constructor reference.
- No direct axios or fetch usage outside BaseApiService.

## MOCK DATA RULES
- REQUIRED: Use lodash for all string, array, and object operations in mock data factories.
- FORBIDDEN: Native JavaScript helpers where lodash provides an equivalent.

## SERVICE CREATION
- REQUIRED: Create services in src/screensets/*/api/. See SCREENSETS.md.
- REQUIRED: Domain constant unique per screenset.
- REQUIRED: Import API service in screenset root for registration.
- FORBIDDEN: Centralized src/api/ directory.
- FORBIDDEN: Sharing API services between screensets.

## PRE-DIFF CHECKLIST
- [ ] Domain constant created.
- [ ] BaseApiService extended with baseURL.
- [ ] Descriptor contracts registered where cached endpoints are exposed.
- [ ] App mocks added and exported via protocol-specific mock plugins.
- [ ] No raw get("/url") calls.
