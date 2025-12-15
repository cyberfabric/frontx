## ADDED Requirements

### Requirement: Tenant Type Definition

The system SHALL define a `Tenant` type with the following structure:

```typescript
export type Tenant = {
  id: string;
};
```

#### Scenario: Type-safe tenant state

- **GIVEN** a tenant is stored in app state
- **WHEN** accessing `state.uicore.app.tenant`
- **THEN** the value SHALL be typed as `Tenant | null`

### Requirement: Tenant Event Configuration

The system SHALL provide a tenant change event that allows consuming applications to set tenant context via the event bus.

#### Scenario: Set tenant from consuming app

- **GIVEN** an app created via `hai3 create <project-name>`
- **WHEN** the app emits `uicore/tenant/changed` event with tenant payload
- **THEN** the system SHALL update `state.uicore.app.tenant` with the provided tenant data

```typescript
import { eventBus } from '@hai3/uicore';

eventBus.emit('uicore/tenant/changed', { 
  tenant: { id: '123' } 
});
```

#### Scenario: Access tenant state

- **GIVEN** tenant has been set via event
- **WHEN** a component uses `useAppSelector`
- **THEN** the component SHALL receive the current tenant value

```typescript
import { useAppSelector } from '@hai3/uicore';

const tenant = useAppSelector((state) => state.uicore.app.tenant);
```

### Requirement: App Configuration Event API

The system SHALL expose a consistent event-driven API for configuring tenant, language, theme, and navigation from consuming applications.

#### Scenario: Configure app via events

- **GIVEN** an app created via `hai3 create <project-name>`
- **WHEN** the app needs to configure runtime settings
- **THEN** the system SHALL support the following events:

| Event | Payload | State Path |
|-------|---------|------------|
| `uicore/tenant/changed` | `{ tenant: T }` | `state.uicore.app.tenant` |
| `uicore/i18n/languageChanged` | `{ language: Language }` | `state.uicore.app.language` |
| `uicore/theme/changed` | `{ themeName: string }` | `state.uicore.layout.theme` |
| `uicore/navigation/screenNavigated` | `{ screenId: string }` | `state.uicore.layout.selectedScreen` |

```typescript
import { eventBus } from '@hai3/uicore';

// Tenant configuration
eventBus.emit('uicore/tenant/changed', { tenant: { id: '123' } });

// Language configuration
eventBus.emit('uicore/i18n/languageChanged', { language: 'ru' });

// Theme configuration
eventBus.emit('uicore/theme/changed', { themeName: 'dark' });

// Navigation
eventBus.emit('uicore/navigation/screenNavigated', { screenId: 'machines-list' });
```

#### Scenario: Type-safe event emission

- **GIVEN** a consuming app importing `eventBus` from `@hai3/uicore`
- **WHEN** emitting configuration events
- **THEN** TypeScript SHALL enforce correct payload types via `EventPayloadMap`

```typescript
// Correct - TypeScript passes
eventBus.emit('uicore/tenant/changed', { tenant: { id: '123' } });

// Error - missing tenant property
eventBus.emit('uicore/tenant/changed', { });

// Error - wrong event name
eventBus.emit('uicore/tenant/change', { tenant: {} }); // typo in event name
```
