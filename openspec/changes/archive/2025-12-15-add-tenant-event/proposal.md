# Change: Add Tenant Event for App Configuration

## Why

Apps created via `hai3 create <project-name>` need to configure tenant, language, and theme from external systems. Currently, theme and language events exist, but there is no event for tenant management. Adding a tenant event completes the app configuration API, enabling consistent event-driven initialization.

## What Changes

- Define `Tenant` type as `{ id: string }` in `appSlice.ts`
- Update `AppState.tenant` from `unknown` to `Tenant`
- Add `TenantEvents` enum with `Changed` event (`uicore/tenant/changed`)
- Add `TenantChangedPayload` interface with typed tenant data
- Add tenant event handler in `appEffects.ts`
- Export tenant events from `@hai3/uicore` public API
- Document the complete app configuration event API for consuming apps

## Impact

- **Affected specs**: New capability `app-configuration` (does not modify existing specs)
- **Affected code**:
  - `packages/uicore/src/core/events/eventTypes/tenantEvents.ts` (new)
  - `packages/uicore/src/core/events/eventTypes/eventMap.ts` (add TenantEventPayloadMap)
  - `packages/uicore/src/app/appEffects.ts` (add tenant event handler)
  - `packages/uicore/src/index.ts` (export tenant events)
