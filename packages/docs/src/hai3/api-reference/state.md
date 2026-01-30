---
title: State API Reference
description: API reference for @hai3/state package
---

# State API Reference

Complete API reference for `@hai3/state` package.

## Event Bus

### `createEventBus()`

Creates a new event bus instance.

```typescript
function createEventBus<TEventMap = any>(): EventBus<TEventMap>
```

**Returns:** `EventBus<TEventMap>` - Event bus instance

**Example:**

```typescript
const eventBus = createEventBus();
```

### `EventBus.emit()`

Emits an event to all subscribers.

```typescript
emit<K extends keyof TEventMap>(event: Event<TEventMap[K]>): void
```

**Parameters:**
- `event`: Event object containing:
  - `type`: Event type string
  - `payload?`: Event data
  - `metadata?`: Optional metadata (timestamp, source, correlationId)

**Example:**

```typescript
eventBus.emit({
  type: 'user.login',
  payload: { userId: '123' },
  metadata: {
    timestamp: Date.now(),
    source: 'auth-screen'
  }
});
```

### `EventBus.on()`

Subscribe to events by type or pattern.

```typescript
on<K extends keyof TEventMap>(
  type: K | string,
  handler: EventHandler<TEventMap[K]>
): UnsubscribeFn
```

**Parameters:**
- `type`: Event type or wildcard pattern (`'user.login'`, `'user.*'`, `'*'`)
- `handler`: Function called when event occurs

**Returns:** `UnsubscribeFn` - Function to unsubscribe

**Example:**

```typescript
const unsubscribe = eventBus.on('user.login', (event) => {
  console.log('User logged in:', event.payload);
});

// Later: unsubscribe()
```

### `EventBus.off()`

Unsubscribe from events.

```typescript
off<K extends keyof TEventMap>(
  type: K | string,
  handler?: EventHandler<TEventMap[K]>
): void
```

**Parameters:**
- `type`: Event type
- `handler?`: Specific handler (omit to remove all handlers for type)

**Example:**

```typescript
eventBus.off('user.login', handler);  // Remove specific handler
eventBus.off('user.login');           // Remove all handlers
```

## Store

### `createStore()`

Creates a Redux store with event bus integration.

```typescript
function createStore(options: StoreOptions): Store
```

**Parameters:**
- `options`:
  - `eventBus`: EventBus instance
  - `preloadedState?`: Initial state
  - `middleware?`: Additional Redux middleware

**Returns:** `Store` - Redux store instance

**Example:**

```typescript
const eventBus = createEventBus();
const store = createStore({
  eventBus,
  preloadedState: {}
});
```

### `registerSlice()`

Dynamically register a Redux slice at runtime.

```typescript
function registerSlice(
  store: Store,
  slice: Slice
): void
```

**Parameters:**
- `store`: Redux store instance
- `slice`: Redux Toolkit slice

**Example:**

```typescript
import { userSlice } from './userSlice';

registerSlice(store, userSlice);

// Now available:
// store.getState().user
// store.dispatch(userSlice.actions.setUser(...))
```

## Redux Toolkit Re-exports

### `createSlice()`

Creates a Redux slice with actions and reducers. (Redux Toolkit)

```typescript
function createSlice<
  State = any,
  CaseReducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
  Name extends string = string
>(options: CreateSliceOptions<State, CaseReducers, Name>): Slice<State, CaseReducers, Name>
```

**Parameters:**
- `options`:
  - `name`: Slice name (used in action types)
  - `initialState`: Initial state value
  - `reducers`: Object of case reducers
  - `extraReducers?`: Builder callback for async actions

**Returns:** `Slice` - Slice with actions and reducer

**Example:**

```typescript
const userSlice = createSlice({
  name: 'user',
  initialState: { profile: null, loading: false },
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

export const { setProfile, setLoading } = userSlice.actions;
export default userSlice.reducer;
```

### `createAsyncThunk()`

Creates a thunk for async operations. (Redux Toolkit)

```typescript
function createAsyncThunk<Returned, ThunkArg = void>(
  typePrefix: string,
  payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg>
): AsyncThunk<Returned, ThunkArg>
```

**Parameters:**
- `typePrefix`: Action type prefix
- `payloadCreator`: Async function returning payload

**Returns:** `AsyncThunk` - Thunk with pending/fulfilled/rejected actions

**Example:**

```typescript
export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (userId: string) => {
    const response = await api.getUser(userId);
    return response.data;
  }
);

// Use in slice:
extraReducers: (builder) => {
  builder
    .addCase(fetchUser.pending, (state) => {
      state.loading = true;
    })
    .addCase(fetchUser.fulfilled, (state, action) => {
      state.profile = action.payload;
      state.loading = false;
    });
}
```

### `createSelector()`

Creates a memoized selector. (Reselect via Redux Toolkit)

```typescript
function createSelector<
  Selectors extends readonly Selector[],
  Result
>(
  selectors: [...Selectors],
  combiner: (...args: SelectorResultArray<Selectors>) => Result
): OutputSelector<Selectors, Result>
```

**Parameters:**
- `selectors`: Array of input selectors
- `combiner`: Function combining selector results

**Returns:** `OutputSelector` - Memoized selector

**Example:**

```typescript
const selectUser = (state: RootState) => state.user.profile;
const selectPosts = (state: RootState) => state.posts.items;

export const selectUserPosts = createSelector(
  [selectUser, selectPosts],
  (user, posts) => posts.filter(p => p.authorId === user?.id)
);
```

## Types

### `Event<T>`

Event structure.

```typescript
interface Event<T = any> {
  type: string;
  payload?: T;
  metadata?: {
    timestamp: number;
    source?: string;
    correlationId?: string;
  };
}
```

### `EventHandler<T>`

Event handler function type.

```typescript
type EventHandler<T = any> = (event: Event<T>) => void | Promise<void>
```

### `UnsubscribeFn`

Function to unsubscribe from events.

```typescript
type UnsubscribeFn = () => void
```

### `StoreOptions`

Store creation options.

```typescript
interface StoreOptions {
  eventBus: EventBus;
  preloadedState?: any;
  middleware?: Middleware[];
}
```

### `RootState`

Root state type (augment with your slices).

```typescript
interface RootState {
  // Define your state shape via module augmentation
}
```

## Module Augmentation

Extend types for your application:

```typescript
// src/types/state.d.ts
import '@hai3/state';

declare module '@hai3/state' {
  interface RootState {
    user: UserState;
    products: ProductsState;
  }

  interface EventPayloadMap {
    'user.login': { userId: string };
    'user.logout': {};
    'product.added': { productId: string };
  }
}
```

## Related Documentation

- [State Management SDK](/hai3/architecture/sdk/state)
- [Event-Driven Concepts](/hai3/concepts/event-driven)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
