## 1. Core Implementation

- [ ] 1.1 Define `Tenant` type in `appSlice.ts` as `{ id: string }`
- [ ] 1.2 Update `AppState.tenant` type from `unknown` to `Tenant`
- [ ] 1.3 Create `tenantEvents.ts` with `TenantEvents` enum and `TenantChangedPayload` interface
- [ ] 1.4 Add `TenantEventPayloadMap` to `eventMap.ts`
- [ ] 1.5 Add tenant event handler in `appEffects.ts`

## 2. Public API

- [ ] 2.1 Export `TenantEvents` and `TenantChangedPayload` from `index.ts`
- [ ] 2.2 Create `changeTenant` action in `tenantActions.ts` (optional convenience wrapper)

## 3. Validation

- [ ] 3.1 Verify TypeScript compilation passes
- [ ] 3.2 Run `npm run arch:check`
- [ ] 3.3 Test event emission from app code
