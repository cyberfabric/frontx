## 1. Core Implementation

- [x] 1.1 Define `Tenant` type in `appSlice.ts` as `{ id: string }`
- [x] 1.2 Update `AppState.tenant` type from `unknown` to `Tenant`
- [x] 1.3 Create `tenantEvents.ts` with `TenantEvents` enum and `TenantChangedPayload` interface
- [x] 1.4 Add `TenantEventPayloadMap` to `eventMap.ts`
- [x] 1.5 Add tenant event handler in `appEffects.ts`

## 2. Public API

- [x] 2.1 Export `TenantEvents` and `TenantChangedPayload` from `index.ts`
- [x] 2.2 Create `changeTenant` action in `tenantActions.ts` (optional convenience wrapper)

## 3. Validation

- [x] 3.1 Verify TypeScript compilation passes
- [x] 3.2 Run `npm run arch:check`
- [x] 3.3 Test event emission from app code
