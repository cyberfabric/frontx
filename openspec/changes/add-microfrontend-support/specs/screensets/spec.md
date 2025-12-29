## ADDED Requirements

### Requirement: GTS Type Identifier

The system SHALL provide a `GtsTypeId` branded type in `@hai3/screensets` for type-safe GTS identifier handling.

#### Scenario: GtsTypeId type definition

```typescript
import { type GtsTypeId } from '@hai3/screensets';

// GTS type identifier (must end with ~)
const mfeType: GtsTypeId = 'gts.hai3.mfe.type.v1~' as GtsTypeId;

// Type error: cannot assign plain string
// const badType: GtsTypeId = 'gts.hai3.mfe.type.v1~';
```

- **WHEN** using GTS type identifiers throughout the system
- **THEN** the `GtsTypeId` branded type SHALL prevent accidental string usage
- **AND** explicit casting SHALL be required: `'...' as GtsTypeId`
- **AND** GTS type identifiers MUST end with `~`

### Requirement: GTS Identifier Parser

The system SHALL provide a `parseGtsId()` function to parse and validate GTS identifiers.

#### Scenario: Parse simple GTS type identifier

```typescript
import { parseGtsId } from '@hai3/screensets';

const parsed = parseGtsId('gts.hai3.mfe.type.v1~');
// {
//   vendor: 'hai3',
//   package: 'mfe',
//   namespace: '_',
//   type: 'type',
//   majorVersion: 1,
//   minorVersion: undefined,
//   isType: true,
//   chain: ['gts.hai3.mfe.type.v1']
// }
```

- **WHEN** parsing a simple GTS type identifier
- **THEN** `parseGtsId()` SHALL extract all components
- **AND** `isType` SHALL be `true` for identifiers ending with `~`
- **AND** `namespace` SHALL default to `_` if not specified

#### Scenario: Parse chained GTS type identifier

```typescript
const parsed = parseGtsId('gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~');
// {
//   vendor: 'acme',
//   package: 'analytics',
//   namespace: '_',
//   type: 'dashboard',
//   majorVersion: 1,
//   isType: true,
//   chain: ['gts.hai3.mfe.type.v1', 'acme.analytics._.dashboard.v1']
// }
```

- **WHEN** parsing a chained GTS identifier
- **THEN** `chain` SHALL contain all segments in order
- **AND** the rightmost segment's properties SHALL be extracted as primary values

#### Scenario: Parse invalid GTS identifier

```typescript
import { parseGtsId, GtsParseError } from '@hai3/screensets';

try {
  parseGtsId('invalid-identifier');
} catch (error) {
  if (error instanceof GtsParseError) {
    console.log(error.message); // 'GTS identifier must start with gts.'
  }
}
```

- **WHEN** parsing an invalid GTS identifier
- **THEN** `GtsParseError` SHALL be thrown with a descriptive message

### Requirement: GTS Identifier Builder

The system SHALL provide a fluent `gts()` builder for constructing GTS identifiers.

#### Scenario: Build simple GTS type identifier

```typescript
import { gts, type GtsTypeId } from '@hai3/screensets';

const mfeType: GtsTypeId = gts()
  .vendor('hai3')
  .package('mfe')
  .type('type')
  .version(1)
  .build();
// 'gts.hai3.mfe._.type.v1~'
```

- **WHEN** building a GTS type identifier
- **THEN** the builder SHALL construct a valid GTS type string
- **AND** `namespace` SHALL default to `_` if not specified
- **AND** the result SHALL end with `~`

#### Scenario: Build derived GTS type identifier

```typescript
const vendorMfe: GtsTypeId = gts()
  .extend('gts.hai3.mfe.type.v1~' as GtsTypeId)
  .vendor('acme')
  .package('analytics')
  .type('dashboard')
  .version(1)
  .build();
// 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~'
```

- **WHEN** extending a base GTS type
- **THEN** the builder SHALL create a chained identifier
- **AND** the base type SHALL appear first in the chain

### Requirement: GTS Schema Registry

The system SHALL provide a `gtsRegistry` singleton for storing and validating JSON Schemas by GTS type identifier.

#### Scenario: Register a JSON Schema

```typescript
import { gtsRegistry, type GtsTypeId } from '@hai3/screensets';

const showPopupSchema = {
  $id: 'gts://gts.hai3.action.host.show_popup.v1~',
  type: 'object',
  properties: {
    mfeTypeId: { type: 'string', pattern: '^gts\\.' },
    entryTypeId: { type: 'string', pattern: '^gts\\.' },
    props: { type: 'object', additionalProperties: true },
  },
  required: ['mfeTypeId', 'entryTypeId'],
  additionalProperties: false,
};

gtsRegistry.register(
  'gts.hai3.action.host.show_popup.v1~' as GtsTypeId,
  showPopupSchema
);
```

- **WHEN** registering a schema with `gtsRegistry.register()`
- **THEN** the schema SHALL be stored indexed by GTS type ID
- **AND** the schema `$id` SHOULD use `gts://` URI scheme

#### Scenario: Validate payload against schema

```typescript
const result = gtsRegistry.validate(
  { mfeTypeId: 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~', entryTypeId: 'gts.hai3.mfe.entry.popup.v1~acme.analytics.popups.export.v1~' },
  'gts.hai3.action.host.show_popup.v1~' as GtsTypeId
);

if (!result.valid) {
  console.log(result.errors); // ValidationError[]
}
```

- **WHEN** validating a payload against a registered schema
- **THEN** `validate()` SHALL return `{ valid: true }` for valid payloads
- **AND** `validate()` SHALL return `{ valid: false, errors: [...] }` for invalid payloads
- **AND** if the schema is not registered, it SHALL return `{ valid: false, errors: [{ message: 'Schema not found' }] }`

#### Scenario: Query registered types

```typescript
const allMfeTypes = gtsRegistry.listTypes('gts.hai3.mfe.type.v1~*');
// ['gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~', ...]

const allHostActions = gtsRegistry.listTypes('gts.hai3.action.host.*');
// ['gts.hai3.action.host.show_popup.v1~', 'gts.hai3.action.host.navigate.v1~', ...]
```

- **WHEN** querying registered types with a pattern
- **THEN** `listTypes()` SHALL return all matching GTS type IDs
- **AND** patterns SHALL support `*` wildcard for suffix matching

### Requirement: GTS Conformance Check

The system SHALL provide a `conformsTo()` function to check if a derived type conforms to a base type.

#### Scenario: Check type conformance

```typescript
import { conformsTo, type GtsTypeId } from '@hai3/screensets';

const derived = 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId;
const base = 'gts.hai3.mfe.type.v1~' as GtsTypeId;

conformsTo(derived, base); // true

const unrelated = 'gts.hai3.action.host.show_popup.v1~' as GtsTypeId;
conformsTo(derived, unrelated); // false
```

- **WHEN** checking if a derived type conforms to a base type
- **THEN** `conformsTo()` SHALL return `true` if base is in the chain
- **AND** `conformsTo()` SHALL return `false` if base is not in the chain

### Requirement: Microfrontend Definition with GTS

The system SHALL provide a `MicrofrontendDefinition` interface that uses GTS type identifiers.

#### Scenario: Define MFE with GTS type ID

```typescript
import {
  type MicrofrontendDefinition,
  type GtsTypeId,
  gts,
  LayoutDomain,
} from '@hai3/screensets';

const ACME_ANALYTICS_MFE = gts()
  .extend('gts.hai3.mfe.type.v1~' as GtsTypeId)
  .vendor('acme')
  .package('analytics')
  .type('dashboard')
  .version(1)
  .build();

const analyticsMfe: MicrofrontendDefinition = {
  typeId: ACME_ANALYTICS_MFE,
  name: 'Analytics Dashboard',
  entries: [
    {
      typeId: gts()
        .extend('gts.hai3.mfe.entry.screen.v1~' as GtsTypeId)
        .vendor('acme')
        .package('analytics')
        .namespace('screens')
        .type('main')
        .version(1)
        .build(),
      domain: LayoutDomain.Screen,
      component: () => import('./screens/Main'),
    },
    {
      typeId: gts()
        .extend('gts.hai3.mfe.entry.popup.v1~' as GtsTypeId)
        .vendor('acme')
        .package('analytics')
        .namespace('popups')
        .type('export')
        .version(1)
        .build(),
      domain: LayoutDomain.Popup,
      component: () => import('./popups/Export'),
    },
  ],
  actionTypes: [
    'gts.hai3.action.mfe.v1~acme.analytics.actions.refresh_data.v1~' as GtsTypeId,
  ],
  contract: analyticsContract,
  menu: { id: 'analytics', label: 'Analytics', icon: 'chart' },
};
```

- **WHEN** defining a microfrontend
- **THEN** `typeId` SHALL be a GTS type identifier derived from `gts.hai3.mfe.type.v1~`
- **AND** each entry SHALL have a `typeId` derived from the appropriate entry base type
- **AND** `actionTypes` SHALL list MFE-specific action types for registration

### Requirement: MfeEntry with GTS Type ID

The system SHALL provide an `MfeEntry` type where each entry has a GTS type identifier.

#### Scenario: Screen entry with GTS type

```typescript
import { type MfeEntry, LayoutDomain, gts, type GtsTypeId } from '@hai3/screensets';

const screenEntry: MfeEntry = {
  typeId: gts()
    .extend('gts.hai3.mfe.entry.screen.v1~' as GtsTypeId)
    .vendor('acme')
    .package('analytics')
    .namespace('screens')
    .type('dashboard')
    .version(1)
    .build(),
  domain: LayoutDomain.Screen,
  component: () => import('./Dashboard'),
};
```

- **WHEN** defining an MFE entry
- **THEN** `typeId` SHALL be a GTS type derived from the appropriate entry base type
- **AND** screen entries SHALL derive from `gts.hai3.mfe.entry.screen.v1~`
- **AND** popup entries SHALL derive from `gts.hai3.mfe.entry.popup.v1~`
- **AND** sidebar entries SHALL derive from `gts.hai3.mfe.entry.sidebar.v1~`
- **AND** overlay entries SHALL derive from `gts.hai3.mfe.entry.overlay.v1~`

### Requirement: HostBridge with GTS Action Types

The system SHALL provide a `HostBridge<TAppState>` interface where actions are identified by GTS type IDs.

#### Scenario: MFE requests host action with GTS type

```typescript
import { type HostBridge, type GtsTypeId, HAI3_ACTION_SHOW_POPUP } from '@hai3/screensets';

function AnalyticsScreen({ bridge }: { bridge: HostBridge }) {
  const handleExport = async () => {
    await bridge.requestHostAction(
      HAI3_ACTION_SHOW_POPUP,
      {
        mfeTypeId: bridge.mfeTypeId,
        entryTypeId: 'gts.hai3.mfe.entry.popup.v1~acme.analytics.popups.export.v1~',
        props: { format: 'pdf' },
      }
    );
  };
}
```

- **WHEN** an MFE requests a host action
- **THEN** the action SHALL be identified by a GTS type ID
- **AND** the payload SHALL conform to the action's JSON Schema
- **AND** predefined action constants SHALL be exported (HAI3_ACTION_SHOW_POPUP, etc.)

### Requirement: MfeContract with GTS Action Handlers

The system SHALL provide an `MfeContract` interface where action handlers are keyed by GTS type IDs.

#### Scenario: MFE defines action handlers with GTS types

```typescript
import { type MfeContract, type GtsTypeId, gtsRegistry } from '@hai3/screensets';

const REFRESH_DATA_ACTION = 'gts.hai3.action.mfe.v1~acme.analytics.actions.refresh_data.v1~' as GtsTypeId;

// Register action schema
gtsRegistry.register(REFRESH_DATA_ACTION, {
  $id: `gts://${REFRESH_DATA_ACTION}`,
  type: 'object',
  properties: {
    dateRange: {
      type: 'object',
      properties: {
        start: { type: 'string', format: 'date-time' },
        end: { type: 'string', format: 'date-time' },
      },
      required: ['start', 'end'],
    },
  },
  required: ['dateRange'],
});

const analyticsContract: MfeContract = {
  mount(container, bridge) {
    const root = createRoot(container);
    root.render(<AnalyticsApp bridge={bridge} />);
    return { unmount: () => root.unmount() };
  },
  actionHandlers: {
    [REFRESH_DATA_ACTION]: async (payload) => {
      const { dateRange } = payload as { dateRange: { start: string; end: string } };
      await refetchAnalytics(dateRange);
    },
  },
};
```

- **WHEN** an MFE defines action handlers
- **THEN** handlers SHALL be keyed by GTS type IDs
- **AND** the MFE SHOULD register action schemas with `gtsRegistry`
- **AND** the host SHALL validate payloads before invoking handlers

### Requirement: Predefined HAI3 GTS Base Types

The system SHALL export predefined GTS base type constants for MFEs, entries, and actions, with JSON Schemas pre-registered in `gtsRegistry`.

#### Scenario: Use predefined HAI3 base types

```typescript
import {
  HAI3_MFE_TYPE,
  HAI3_MFE_ENTRY,
  HAI3_MFE_ENTRY_SCREEN,
  HAI3_MFE_ENTRY_POPUP,
  HAI3_MFE_ENTRY_SIDEBAR,
  HAI3_MFE_ENTRY_OVERLAY,
  HAI3_ACTION_SHOW_POPUP,
  HAI3_ACTION_HIDE_POPUP,
  HAI3_ACTION_SHOW_SIDEBAR,
  HAI3_ACTION_NAVIGATE,
  HAI3_ACTION_SET_LANGUAGE,
  HAI3_ACTION_CHANGE_THEME,
  HAI3_APP_STATE,
} from '@hai3/screensets';

// Use as base for extension
const myMfe = gts().extend(HAI3_MFE_TYPE).vendor('acme')...
```

- **WHEN** importing predefined base types
- **THEN** all HAI3 platform base types SHALL be available
- **AND** MFE types SHALL derive from `HAI3_MFE_TYPE`
- **AND** entry types SHALL derive from appropriate `HAI3_MFE_ENTRY_*` types
- **AND** all base type JSON Schemas SHALL be pre-registered in `gtsRegistry`

#### Scenario: MFE type has JSON Schema

```typescript
import { gtsRegistry, HAI3_MFE_TYPE } from '@hai3/screensets';

// Schema is pre-registered for MFE type
const mfeSchema = gtsRegistry.get(HAI3_MFE_TYPE);
console.log(mfeSchema.$id); // 'gts://gts.hai3.mfe.type.v1~'

// Schema defines required structure
// {
//   typeId: string (pattern: ^gts\.hai3\.mfe\.type\.v1~),
//   name: string,
//   entries: MfeEntry[],
//   contract: { mount: function },
//   actionTypes?: GtsTypeId[]
// }
```

- **WHEN** `gtsRegistry.get(HAI3_MFE_TYPE)` is called
- **THEN** it SHALL return the JSON Schema for `MicrofrontendDefinition`
- **AND** the schema SHALL define `typeId`, `name`, `entries`, `contract` as required

#### Scenario: Entry types have JSON Schemas

```typescript
import { gtsRegistry, HAI3_MFE_ENTRY_SCREEN, HAI3_MFE_ENTRY_POPUP } from '@hai3/screensets';

const screenSchema = gtsRegistry.get(HAI3_MFE_ENTRY_SCREEN);
// Schema requires domain: "screen"

const popupSchema = gtsRegistry.get(HAI3_MFE_ENTRY_POPUP);
// Schema requires domain: "popup"
```

- **WHEN** querying entry schemas
- **THEN** each domain-specific entry type SHALL have a registered schema
- **AND** screen entries SHALL require `domain: "screen"`
- **AND** popup entries SHALL require `domain: "popup"`

### Requirement: MFE Schema Validation on Load

The system SHALL validate loaded `MicrofrontendDefinition` objects against the MFE type schema.

#### Scenario: Loader validates MFE definition

```typescript
import { MfeLoader, MfeSchemaValidationError, HAI3_MFE_TYPE } from '@hai3/screensets';

const loader = new MfeLoader();

try {
  const mfe = await loader.load({
    typeId: 'gts.hai3.mfe.type.v1~vendor.bad._.mfe.v1~' as GtsTypeId,
    url: '/mfe/bad/remoteEntry.js',
  });
} catch (error) {
  if (error instanceof MfeSchemaValidationError) {
    console.log(error.mfeTypeId);    // 'gts.hai3.mfe.type.v1~vendor.bad._.mfe.v1~'
    console.log(error.schemaTypeId); // 'gts.hai3.mfe.type.v1~'
    console.log(error.errors);       // [{ path: '/entries', message: 'Required property missing' }]
  }
}
```

- **WHEN** loading an MFE bundle
- **THEN** the loader SHALL validate the exported definition against `HAI3_MFE_TYPE` schema
- **AND** if validation fails, `MfeSchemaValidationError` SHALL be thrown
- **AND** the error SHALL include `mfeTypeId`, `schemaTypeId`, and `errors`

### Requirement: Entry Schema Validation on Mount

The system SHALL validate `MfeEntry` objects against domain-specific schemas before mounting.

#### Scenario: Orchestrator validates entry on mount

```typescript
import { MfeOrchestrator, MfeEntrySchemaValidationError } from '@hai3/screensets';

try {
  orchestrator.mount(
    'gts.hai3.mfe.type.v1~vendor.mfe.v1~' as GtsTypeId,
    'gts.hai3.mfe.entry.screen.v1~vendor.screens.bad.v1~' as GtsTypeId,
    container
  );
} catch (error) {
  if (error instanceof MfeEntrySchemaValidationError) {
    console.log(error.entryTypeId);  // 'gts.hai3.mfe.entry.screen.v1~vendor.screens.bad.v1~'
    console.log(error.schemaTypeId); // 'gts.hai3.mfe.entry.screen.v1~'
    console.log(error.errors);       // [{ path: '/domain', message: 'Expected "screen"' }]
  }
}
```

- **WHEN** mounting an MFE entry
- **THEN** the orchestrator SHALL validate the entry against its domain schema
- **AND** screen entries SHALL be validated against `HAI3_MFE_ENTRY_SCREEN` schema
- **AND** popup entries SHALL be validated against `HAI3_MFE_ENTRY_POPUP` schema
- **AND** if validation fails, `MfeEntrySchemaValidationError` SHALL be thrown

### Requirement: Microfrontend Registry

The system SHALL provide a `microfrontendRegistry` singleton for storing MFE definitions by GTS type ID.

#### Scenario: Register and query MFE definitions

```typescript
import { microfrontendRegistry, type GtsTypeId } from '@hai3/screensets';

// Register
microfrontendRegistry.register(analyticsMfe);

// Query by type ID
const mfe = microfrontendRegistry.get(
  'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId
);

// List all MFEs
const allMfes = microfrontendRegistry.getAll();

// Check if registered
const exists = microfrontendRegistry.has(
  'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId
);

// Find by pattern
const acmeMfes = microfrontendRegistry.findByPattern('gts.hai3.mfe.type.v1~acme.*');
```

- **WHEN** an MFE definition is registered
- **THEN** it SHALL be retrievable via `get(typeId)`
- **AND** `getAll()` SHALL return all registered MFEs
- **AND** `has(typeId)` SHALL return boolean for existence check
- **AND** `findByPattern()` SHALL support wildcard queries

### Requirement: MFE Error Types

The system SHALL provide typed error classes for MFE-specific failures in `@hai3/screensets`:
- `MfeSchemaValidationError` - thrown when MFE definition fails schema validation on load
- `MfeEntrySchemaValidationError` - thrown when entry fails schema validation on mount
- `PayloadValidationError` - thrown when action payload fails schema validation
- `MfeNotMountedError` - thrown when action requested to unmounted MFE
- `ActionNotAllowedError` - thrown when MFE requests disallowed action
- `ActionNotRegisteredError` - thrown when host requests action MFE doesn't handle

#### Scenario: PayloadValidationError for invalid action payload

```typescript
import { PayloadValidationError, type GtsTypeId } from '@hai3/screensets';

try {
  await bridge.requestHostAction(
    'gts.hai3.action.host.show_popup.v1~' as GtsTypeId,
    { invalidPayload: true }
  );
} catch (error) {
  if (error instanceof PayloadValidationError) {
    console.log(error.actionTypeId);  // 'gts.hai3.action.host.show_popup.v1~'
    console.log(error.errors);        // [{ path: '/mfeTypeId', message: 'Required property missing' }]
  }
}
```

- **WHEN** payload validation fails
- **THEN** `PayloadValidationError` SHALL be thrown
- **AND** it SHALL include `actionTypeId` and `errors` properties
- **AND** each error SHALL include `path` and `message`

#### Scenario: MfeNotMountedError when requesting action to unmounted MFE

```typescript
import { MfeNotMountedError, type GtsTypeId } from '@hai3/screensets';

try {
  await manager.requestMfeAction(
    'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
    'gts.hai3.action.mfe.v1~acme.analytics.actions.refresh_data.v1~' as GtsTypeId,
    {}
  );
} catch (error) {
  if (error instanceof MfeNotMountedError) {
    console.log(`MFE ${error.mfeTypeId} is not mounted`);
  }
}
```

- **WHEN** an action is requested to an unmounted MFE
- **THEN** `MfeNotMountedError` SHALL be thrown with `mfeTypeId` property

#### Scenario: ActionNotAllowedError for disallowed host action

```typescript
import { ActionNotAllowedError, type GtsTypeId } from '@hai3/screensets';

try {
  await bridge.requestHostAction(
    'gts.hai3.action.host.delete_user.v1~' as GtsTypeId,  // Not in allowlist
    { userId: '123' }
  );
} catch (error) {
  if (error instanceof ActionNotAllowedError) {
    console.log(`Action ${error.actionTypeId} is not in allowlist`);
  }
}
```

- **WHEN** an MFE requests an action not in the allowlist
- **THEN** `ActionNotAllowedError` SHALL be thrown with `actionTypeId` property

#### Scenario: ActionNotRegisteredError for unknown MFE action

```typescript
import { ActionNotRegisteredError, type GtsTypeId } from '@hai3/screensets';

try {
  await manager.requestMfeAction(
    'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
    'gts.hai3.action.mfe.v1~acme.analytics.actions.unknown.v1~' as GtsTypeId,
    {}
  );
} catch (error) {
  if (error instanceof ActionNotRegisteredError) {
    console.log(`Handler for ${error.actionTypeId} not found in MFE ${error.mfeTypeId}`);
  }
}
```

- **WHEN** the host requests an action the MFE doesn't handle
- **THEN** `ActionNotRegisteredError` SHALL be thrown with `mfeTypeId` and `actionTypeId`

### Requirement: MFE Event Payload Types

The system SHALL provide event payload type definitions for MFE lifecycle events that can be used to augment `EventPayloadMap`.

#### Scenario: MfeEventPayloads type definition

```typescript
import { type MfeEventPayloads, type GtsTypeId, type LayoutDomain } from '@hai3/screensets';

// MfeEventPayloads interface defines all MFE event shapes
type LoadingEvent = MfeEventPayloads['mfe/loading'];
// { mfeTypeId: GtsTypeId }

type MountedEvent = MfeEventPayloads['mfe/mounted'];
// { mfeTypeId: GtsTypeId; entryTypeId: GtsTypeId; domain: LayoutDomain }

type ActionRequestedEvent = MfeEventPayloads['mfe/actionRequested'];
// { mfeTypeId: GtsTypeId; actionTypeId: GtsTypeId; direction: 'toHost' | 'toMfe' }
```

- **WHEN** implementing MFE event handling
- **THEN** `MfeEventPayloads` SHALL define payload shapes for all events
- **AND** events SHALL include:
  - `mfe/loading`, `mfe/loaded`, `mfe/loadError`
  - `mfe/mounted`, `mfe/unmounted`
  - `mfe/actionRequested`, `mfe/actionCompleted`, `mfe/actionFailed`
  - `mfe/validationFailed`

#### Scenario: EventPayloadMap augmentation example

```typescript
// In @hai3/framework or host application
import { type MfeEventPayloads } from '@hai3/screensets';

declare module '@hai3/state' {
  interface EventPayloadMap extends MfeEventPayloads {}
}

// Now eventBus.on('mfe/loaded', ...) has full type inference
```

- **WHEN** extending `EventPayloadMap` with MFE events
- **THEN** the host application SHALL import `MfeEventPayloads` from `@hai3/screensets`
- **AND** the augmentation SHALL be done in the framework or host layer

### Requirement: MFE Bridge Implementation

The system SHALL provide a state-agnostic `MfeBridge` class that uses a props/callbacks interface.

#### Scenario: Create bridge with callbacks

```typescript
import { MfeBridge, type GtsTypeId, gtsRegistry } from '@hai3/screensets';

const bridge = new MfeBridge({
  mfeTypeId: 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
  getAppState: () => currentAppState,
  subscribeToState: (callback) => {
    const unsubscribe = stateEmitter.on('change', callback);
    return unsubscribe;
  },
  onHostAction: (actionTypeId, payload) => {
    // Framework wires this to an action that emits an event
    handleMfeHostAction(bridge.mfeTypeId, actionTypeId, payload);
  },
  registry: gtsRegistry,
});
```

- **WHEN** creating an MFE bridge
- **THEN** the bridge SHALL be configured with pure callbacks (no store references)
- **AND** `getAppState` SHALL be a callback returning current state
- **AND** `subscribeToState` SHALL be a callback for state subscriptions
- **AND** `onHostAction` SHALL be a callback invoked when MFE requests host action
- **AND** the bridge SHALL have ZERO dependencies on @hai3/state

#### Scenario: Bridge validates payload before invoking callback

```typescript
import { PayloadValidationError } from '@hai3/screensets';

try {
  await bridge.requestHostAction(
    'gts.hai3.action.host.show_popup.v1~' as GtsTypeId,
    { invalidPayload: true }
  );
} catch (error) {
  if (error instanceof PayloadValidationError) {
    // Validation failed, onHostAction was NOT called
    console.log(error.errors);
  }
}
```

- **WHEN** MFE calls `bridge.requestHostAction()`
- **THEN** the bridge SHALL validate payload against GTS schema FIRST
- **AND** if validation fails, `PayloadValidationError` SHALL be thrown
- **AND** if validation fails, `onHostAction` callback SHALL NOT be invoked
- **AND** if validation passes, `onHostAction` callback SHALL be invoked

### Requirement: MFE Loader Implementation

The system SHALL provide an `MfeLoader` class for loading remote MFE bundles via Module Federation.

#### Scenario: Load remote MFE bundle

```typescript
import { MfeLoader, type GtsTypeId } from '@hai3/screensets';

const loader = new MfeLoader({ loadTimeout: 10000 });

const mfeDefinition = await loader.load({
  typeId: 'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
  url: 'https://mfe.example.com/analytics/remoteEntry.js',
  shared: ['react', 'react-dom'],
});

console.log(mfeDefinition.name);    // 'Analytics Dashboard'
console.log(mfeDefinition.entries); // MfeEntry[]
```

- **WHEN** loading a remote MFE
- **THEN** `load()` SHALL fetch the bundle via Module Federation
- **AND** it SHALL resolve shared dependencies with the host
- **AND** it SHALL return the `MicrofrontendDefinition` from the bundle
- **AND** it SHALL throw `MfeLoadTimeoutError` if timeout exceeded

#### Scenario: Preload MFE bundle

```typescript
loader.preload({
  typeId: 'gts.hai3.mfe.type.v1~acme.billing._.portal.v1~' as GtsTypeId,
  url: '/mfe/billing/remoteEntry.js',
});

// Later, load is instant
const definition = await loader.load({ ... });
```

- **WHEN** preloading an MFE bundle
- **THEN** `preload()` SHALL start fetching in the background
- **AND** subsequent `load()` calls SHALL use the cached bundle
- **AND** `preload()` SHALL NOT mount the MFE

### Requirement: MFE Orchestrator Implementation

The system SHALL provide an `MfeOrchestrator` class that coordinates MFE loading, mounting, and action handling.

#### Scenario: Create orchestrator with callbacks

```typescript
import { MfeOrchestrator, MfeLoader, MfeBridge, gtsRegistry, type GtsTypeId } from '@hai3/screensets';

const orchestrator = new MfeOrchestrator({
  loader: new MfeLoader(),
  registry: gtsRegistry,
  createBridge: (mfeTypeId) => new MfeBridge({
    mfeTypeId,
    getAppState: () => selectAppState(store.getState()),
    subscribeToState: (cb) => store.subscribe(() => cb(selectAppState(store.getState()))),
    onHostAction: (actionTypeId, payload) => actions.handleMfeHostAction(mfeTypeId, actionTypeId, payload),
    registry: gtsRegistry,
  }),
  createShadowContainer: (mfeTypeId) => {
    const container = document.createElement('div');
    container.attachShadow({ mode: 'open' });
    return container;
  },
  cssVariables: { '--hai3-color-primary': '#3b82f6' },

  // Lifecycle callbacks (wired to Framework actions by the plugin)
  onLoadStart: (mfeTypeId) => actions.mfeLoadStart(mfeTypeId),
  onLoadComplete: (mfeTypeId) => actions.mfeLoadComplete(mfeTypeId),
  onLoadError: (mfeTypeId, error) => actions.mfeLoadError(mfeTypeId, error),
  onMounted: (mfeTypeId, entryTypeId, domain) => actions.mfeMounted(mfeTypeId, entryTypeId, domain),
  onUnmounted: (mfeTypeId) => actions.mfeUnmounted(mfeTypeId),
});
```

- **WHEN** creating an orchestrator
- **THEN** it SHALL be configured with factory callbacks for bridge and container creation
- **AND** lifecycle callbacks SHALL be optional and invoked at appropriate times
- **AND** the orchestrator SHALL have ZERO dependencies on @hai3/state

#### Scenario: Load and mount MFE entry

```typescript
// Load the MFE bundle
await orchestrator.load('gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId);

// Mount a specific entry
const container = document.getElementById('screen-domain')!;
const mountResult = orchestrator.mount(
  'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
  'gts.hai3.mfe.entry.screen.v1~acme.analytics.screens.main.v1~' as GtsTypeId,
  container
);

// Later, unmount
orchestrator.unmount('gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId);
```

- **WHEN** loading an MFE
- **THEN** `load()` SHALL use the loader to fetch the bundle
- **AND** `load()` SHALL validate that typeId conforms to `HAI3_MFE_TYPE`
- **WHEN** mounting an entry
- **THEN** `mount()` SHALL create a bridge via `createBridge` factory
- **AND** `mount()` SHALL create a shadow container via `createShadowContainer` factory
- **AND** `mount()` SHALL call the MFE's contract `mount()` method
- **WHEN** unmounting
- **THEN** `unmount()` SHALL call the MFE's `unmount` callback
- **AND** `unmount()` SHALL clean up all subscriptions

#### Scenario: Request action to MFE

```typescript
const result = await orchestrator.requestMfeAction(
  'gts.hai3.mfe.type.v1~acme.analytics._.dashboard.v1~' as GtsTypeId,
  'gts.hai3.action.mfe.v1~acme.analytics.actions.refresh_data.v1~' as GtsTypeId,
  { dateRange: { start: '2024-01-01', end: '2024-12-31' } }
);
```

- **WHEN** requesting action to MFE
- **THEN** `requestMfeAction()` SHALL validate payload against GTS schema
- **AND** it SHALL invoke the MFE's registered action handler
- **AND** it SHALL throw `MfeNotMountedError` if MFE is not mounted
- **AND** it SHALL throw `ActionNotRegisteredError` if handler not found

### Requirement: Shadow DOM Utilities

The system SHALL provide utilities for creating and managing Shadow DOM containers.

#### Scenario: Create shadow root

```typescript
import { createShadowRoot, injectCssVariables } from '@hai3/screensets';

const container = document.createElement('div');
const shadowRoot = createShadowRoot(container, { mode: 'open' });

injectCssVariables(shadowRoot, {
  '--hai3-color-primary': '#3b82f6',
  '--hai3-spacing-unit': '4px',
});
```

- **WHEN** creating a shadow root
- **THEN** `createShadowRoot()` SHALL attach a shadow root to the container
- **AND** it SHALL support 'open' and 'closed' modes
- **WHEN** injecting CSS variables
- **THEN** `injectCssVariables()` SHALL add a `<style>` element with `:host` rules
- **AND** CSS variables SHALL be available inside the shadow root
