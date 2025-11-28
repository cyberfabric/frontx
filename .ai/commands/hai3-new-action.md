<!-- @standalone -->
# hai3:new-action - Create New Action

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/EVENTS.md before starting.
2) Summarize 3-6 key rules.
3) Follow steps below.

## GATHER REQUIREMENTS
Ask user for:
- Action purpose (e.g., "navigate to screen", "load user data").
- Which domain/namespace (e.g., "navigation", "user", "menu").
- Event payload data.

## STEP 1: Define Event
In src/screensets/{name}/events/{domain}Events.ts:
```typescript
const DOMAIN_ID = '{domain}';

export const {Domain}Events = {
  {EventName}: `${SCREENSET_ID}/${DOMAIN_ID}/{eventName}` as const,
} as const;

export type {EventName}Payload = {
  // payload fields
};

declare module '@hai3/uicore' {
  interface EventPayloadMap {
    [{Domain}Events.{EventName}]: {EventName}Payload;
  }
}
```

## STEP 2: Create Action
In src/screensets/{name}/actions/{domain}Actions.ts:
```typescript
import { eventBus } from '@hai3/uicore';
import { {Domain}Events } from '../events/{domain}Events';

export const {actionName} = (params: ParamsType) => {
  return (): void => {
    eventBus.emit({Domain}Events.{EventName}, {
      // payload
    });
  };
};
```

## STEP 3: Create Effect
In src/screensets/{name}/effects/{domain}Effects.ts:
```typescript
import { eventBus } from '@hai3/uicore';
import { {Domain}Events } from '../events/{domain}Events';
import type { Store } from '@hai3/uicore';

export function init{Domain}Effects(store: Store): void {
  eventBus.on({Domain}Events.{EventName}, (payload) => {
    store.dispatch(set{Something}(payload.{field}));
  });
}
```

## RULES
- Actions use imperative names (selectScreen, changeTheme).
- Events use past-tense names (screenSelected, themeChanged).
- Actions are pure functions (no getState, no async thunks).
- Actions return void (not Promise).
- Effects update their own slice only.
- Cross-domain communication only via events.
- FORBIDDEN: Direct slice dispatch from actions/components.

## VALIDATION
```bash
npm run arch:check
```
