<!-- @standalone -->
# hai3:new-api-service - Add New API Service (React Layer)

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/API.md, .ai/targets/EVENTS.md, and .ai/targets/REACT.md before starting.
2) Gather requirements from user.
3) Create OpenSpec proposal for approval.
4) After approval, apply implementation.

## GATHER REQUIREMENTS
Ask user for:
- Which screenset will use it.
- Domain name.
- Endpoints/methods.
- Base URL.
- Component integration needs.

## STEP 1: Create OpenSpec Proposal
Create `openspec/changes/add-{screenset}-{service}/` with:

### proposal.md
```markdown
# Proposal: Add {ServiceName} API Service

## Summary
Add new API service "{serviceName}" to {screenset} screenset with React integration.

## Details
- Screenset: {screenset}
- Domain: {domain}
- Base URL: {baseUrl}
- Endpoints: {endpoints}

## React Integration
- Custom Hook: Create useService hook for component integration
- Actions: Create actions that emit events via eventBus
- Store: Define slice for service data
- Effects: Subscribe to events and update slice
- API Service: BaseApiService extension with REST protocol
- Component Usage: Components use custom hook to access data and actions

## Implementation
Create screenset-local API service with mocks, actions, events, effects, store slice, and custom React hook.
```

### tasks.md
```markdown
# Tasks: Add {ServiceName} API Service

- [ ] Create API service class extending BaseApiService
- [ ] Register with apiRegistry using class reference
- [ ] Define events in events/{domain}Events.ts
- [ ] Create actions in actions/{domain}Actions.ts (emit events)
- [ ] Create store slice in slices/{domain}Slice.ts
- [ ] Create effects in effects/{domain}Effects.ts (subscribe to events, update slice)
- [ ] Create custom hook in hooks/use{Domain}.ts
- [ ] Create mocks in api/mocks.ts
- [ ] Configure mocks via MockPlugin if needed
- [ ] Validate: `npm run type-check && npm run arch:check`
- [ ] Test via Chrome DevTools MCP
```

## STEP 2: Wait for Approval
Tell user: "I've created an OpenSpec proposal at `openspec/changes/add-{screenset}-{service}/`. Please review and run `/openspec:apply add-{screenset}-{service}` to implement."

## STEP 3: Apply Implementation (after approval)
When user runs `/openspec:apply`, execute:

### 3.1 Create Service
File: src/screensets/{screenset}/api/{Name}ApiService.ts
```typescript
import { BaseApiService, RestProtocol, RestMockPlugin, apiRegistry } from '@hai3/react';

class {Name}ApiService extends BaseApiService {
  constructor() {
    // Create protocol instance
    const restProtocol = new RestProtocol();

    super({ baseURL: '/api/v1/{domain}' }, restProtocol);

    // Register mock map for this service (vertical slice pattern)
    // Services register their own mock maps during construction.
    // This ensures vertical slice architecture compliance - screensets bring their own
    // services AND mocks. App layer does not need to know about service-specific mocks.
    if (import.meta.env.DEV) {
      restProtocol.registerMockMap({
        'GET /api/v1/{domain}/endpoint': () => ({ data: 'mock data' }),
        'PUT /api/v1/{domain}/endpoint': (body) => ({ ...body, updatedAt: new Date() }),
      });
    }
  }

  async getData(): Promise<DataType> {
    return this.protocol(RestProtocol).get('/endpoint');
  }

  async updateData(data: DataType): Promise<DataType> {
    return this.protocol(RestProtocol).put('/endpoint', data);
  }
}

// Register service with class reference (no string domain needed)
apiRegistry.register({Name}ApiService);

export { {Name}ApiService };
```

### 3.2 Define Events
File: src/screensets/{screenset}/events/{domain}Events.ts
```typescript
import { SCREENSET_ID } from '../ids';

const DOMAIN_ID = '{domain}';

export const {Domain}Events = {
  DataRequested: `${SCREENSET_ID}/${DOMAIN_ID}/dataRequested` as const,
  DataLoaded: `${SCREENSET_ID}/${DOMAIN_ID}/dataLoaded` as const,
  DataError: `${SCREENSET_ID}/${DOMAIN_ID}/dataError` as const,
  DataUpdateRequested: `${SCREENSET_ID}/${DOMAIN_ID}/dataUpdateRequested` as const,
  DataUpdated: `${SCREENSET_ID}/${DOMAIN_ID}/dataUpdated` as const,
} as const;

export type DataRequestedPayload = {
  // request params
};

export type DataLoadedPayload = {
  data: DataType;
};

export type DataErrorPayload = {
  error: string;
};

export type DataUpdateRequestedPayload = {
  data: DataType;
};

export type DataUpdatedPayload = {
  data: DataType;
};

declare module '@hai3/state' {
  interface EventPayloadMap {
    [{Domain}Events.DataRequested]: DataRequestedPayload;
    [{Domain}Events.DataLoaded]: DataLoadedPayload;
    [{Domain}Events.DataError]: DataErrorPayload;
    [{Domain}Events.DataUpdateRequested]: DataUpdateRequestedPayload;
    [{Domain}Events.DataUpdated]: DataUpdatedPayload;
  }
}
```

### 3.3 Create Actions
File: src/screensets/{screenset}/actions/{domain}Actions.ts
```typescript
import { eventBus } from '@hai3/state';
import { {Domain}Events } from '../events/{domain}Events';

export const loadData = (params: ParamsType) => {
  return (): void => {
    eventBus.emit({Domain}Events.DataRequested, params);
  };
};

export const updateData = (data: DataType) => {
  return (): void => {
    eventBus.emit({Domain}Events.DataUpdateRequested, { data });
  };
};
```

### 3.4 Create Store Slice
File: src/screensets/{screenset}/slices/{domain}Slice.ts
```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface {Domain}State {
  data: DataType | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: {Domain}State = {
  data: null,
  isLoading: false,
  error: null,
};

export const {domain}Slice = createSlice({
  name: '{screenset}/{domain}',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setData: (state, action: PayloadAction<DataType>) => {
      state.data = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setLoading, setData, setError } = {domain}Slice.actions;

// Selectors
export const select{Domain}Data = (state: RootState) => state.{screenset}.{domain}.data;
export const select{Domain}Loading = (state: RootState) => state.{screenset}.{domain}.isLoading;
export const select{Domain}Error = (state: RootState) => state.{screenset}.{domain}.error;
```

### 3.5 Create Effects
File: src/screensets/{screenset}/effects/{domain}Effects.ts
```typescript
import { eventBus, getStore, apiRegistry } from '@hai3/react';
import { {Domain}Events } from '../events/{domain}Events';
import { setLoading, setData, setError } from '../slices/{domain}Slice';
import { {Name}ApiService } from '../api/{Name}ApiService';

export function init{Domain}Effects(): void {
  const store = getStore();

  eventBus.on({Domain}Events.DataRequested, async (payload) => {
    store.dispatch(setLoading(true));
    try {
      const service = apiRegistry.getService({Name}ApiService);
      const data = await service.getData();
      eventBus.emit({Domain}Events.DataLoaded, { data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventBus.emit({Domain}Events.DataError, { error: errorMessage });
    }
  });

  eventBus.on({Domain}Events.DataUpdateRequested, async (payload) => {
    store.dispatch(setLoading(true));
    try {
      const service = apiRegistry.getService({Name}ApiService);
      const data = await service.updateData(payload.data);
      eventBus.emit({Domain}Events.DataUpdated, { data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      eventBus.emit({Domain}Events.DataError, { error: errorMessage });
    }
  });

  eventBus.on({Domain}Events.DataLoaded, (payload) => {
    store.dispatch(setData(payload.data));
  });

  eventBus.on({Domain}Events.DataUpdated, (payload) => {
    store.dispatch(setData(payload.data));
  });

  eventBus.on({Domain}Events.DataError, (payload) => {
    store.dispatch(setError(payload.error));
  });
}
```

### 3.6 Create Custom Hook
File: src/screensets/{screenset}/hooks/use{Domain}.ts
```typescript
import { useAppDispatch, useAppSelector } from '@hai3/react';
import { loadData, updateData } from '../actions/{domain}Actions';
import { select{Domain}Data, select{Domain}Loading, select{Domain}Error } from '../slices/{domain}Slice';

export function use{Domain}() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(select{Domain}Data);
  const isLoading = useAppSelector(select{Domain}Loading);
  const error = useAppSelector(select{Domain}Error);

  const handleLoadData = (params: ParamsType) => {
    dispatch(loadData(params));
  };

  const handleUpdateData = (data: DataType) => {
    dispatch(updateData(data));
  };

  return {
    data,
    isLoading,
    error,
    loadData: handleLoadData,
    updateData: handleUpdateData,
  };
}
```

### 3.7 Create Mocks
File: src/screensets/{screenset}/api/mocks.ts
```typescript
import type { MockMap } from '@hai3/api';

export const {domain}MockMap = {
  'GET /endpoint': () => ({ data: mockData }),
  'PUT /endpoint': (body) => ({ ...body, updatedAt: new Date() }),
} satisfies MockMap;
```

### 3.8 Register in Screenset Config
Import ./api/{Name}ApiService for side effect.
Register slice with registerSlice({domain}Slice.reducer).
Call init{Domain}Effects() in screenset initialization.
NOTE: Mock plugins are registered on protocol instances in service constructor.

### 3.9 Component Usage Example
```typescript
import { use{Domain} } from '../hooks/use{Domain}';

function MyComponent() {
  const { data, isLoading, error, loadData, updateData } = use{Domain}();

  useEffect(() => {
    loadData({ /* params */ });
  }, []);

  if (isLoading) return <Loading />;
  if (error) return <Error error={error} />;
  if (!data) return null;

  return (
    <div>
      {/* Use data */}
      <button onClick={() => updateData(newData)}>Update</button>
    </div>
  );
}
```

### 3.10 Validate
```bash
npm run type-check && npm run arch:check
```

### 3.11 Test via Chrome DevTools MCP
STOP: If MCP WebSocket is closed, fix first.
- Navigate to screen using the service
- Verify hook returns correct data
- Test loading and error states
- Verify actions trigger API calls
- Verify slice updates via Redux DevTools
- Toggle API mode in Studio and verify both modes work

### 3.12 Mark Tasks Complete
Update tasks.md to mark all completed tasks.

## RULES
- REQUIRED: Screenset-local API services in src/screensets/*/api/
- REQUIRED: Custom hooks in src/screensets/*/hooks/
- REQUIRED: Hooks use useAppDispatch and useAppSelector from @hai3/react
- REQUIRED: Hooks dispatch actions (never direct slice updates)
- REQUIRED: Actions emit events via eventBus.emit() (never async)
- REQUIRED: Effects subscribe to events and make API calls
- REQUIRED: Effects update their own slice only
- REQUIRED: Unique domain constant per screenset
- FORBIDDEN: Centralized src/api/ directory
- FORBIDDEN: Sharing API services between screensets
- FORBIDDEN: Direct slice dispatch from hooks
- FORBIDDEN: Actions calling API directly (use effects)
- FORBIDDEN: Async thunks (use event-driven pattern)
- FORBIDDEN: React imports in actions, effects, or slices
