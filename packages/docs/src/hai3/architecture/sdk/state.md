---
title: State Management (@hai3/state)
description: Event bus, Redux store, and state management primitives
---

# State Management (@hai3/state)

The `@hai3/state` package provides state management primitives: an event bus for messaging and Redux store configuration with dynamic slice registration.

## Overview

**Package:** `@hai3/state`
**Layer:** L1 (SDK)
**Dependencies:** `@reduxjs/toolkit`, `lodash` (no other `@hai3/*` packages)

**Key Features:**
- Event bus for pub/sub messaging
- Redux store with Redux Toolkit
- Dynamic slice registration
- Type-safe event and state types
- Framework-agnostic (no React required)

## Event Bus

The event bus enables publish-subscribe messaging throughout the application.

### Creating an Event Bus

```typescript
import { createEventBus } from '@hai3/state';

const eventBus = createEventBus();
```

### Event Structure

```typescript
interface Event<T = any> {
  type: string;           // Event type (e.g., 'user.login')
  payload?: T;            // Optional data
  metadata?: {
    timestamp: number;
    source?: string;
    correlationId?: string;
  };
}
```

### Emitting Events

```typescript
// Simple event
eventBus.emit({
  type: 'app.initialized'
});

// Event with payload
eventBus.emit({
  type: 'user.login',
  payload: {
    userId: '123',
    timestamp: Date.now()
  }
});

// Event with metadata
eventBus.emit({
  type: 'order.placed',
  payload: { orderId: '456' },
  metadata: {
    timestamp: Date.now(),
    source: 'checkout-screen',
    correlationId: 'abc-123'
  }
});
```

### Subscribing to Events

```typescript
// Subscribe to specific event
const unsubscribe = eventBus.on('user.login', (event) => {
  console.log('User logged in:', event.payload);
});

// Unsubscribe
unsubscribe();
```

### Wildcard Subscriptions

```typescript
// Listen to all user events
eventBus.on('user.*', (event) => {
  console.log('User event:', event.type);
});

// Listen to all events
eventBus.on('*', (event) => {
  console.log('Any event:', event.type, event.payload);
});
```

### Removing Listeners

```typescript
const handler = (event) => console.log(event);

// Add listener
eventBus.on('user.login', handler);

// Remove specific listener
eventBus.off('user.login', handler);

// Remove all listeners for event type
eventBus.off('user.login');
```

### Type-Safe Events

Define event payload types:

```typescript
interface EventPayloadMap {
  'user.login': { userId: string; timestamp: number };
  'user.logout': { userId: string };
  'order.placed': { orderId: string; total: number };
}

// Type-safe emit
eventBus.emit<'user.login'>({
  type: 'user.login',
  payload: {
    userId: '123',
    timestamp: Date.now()
  }
});

// Type-safe listener
eventBus.on<'user.login'>('user.login', (event) => {
  // event.payload is typed as { userId: string; timestamp: number }
  console.log(event.payload.userId);
});
```

## Redux Store

HAI3 uses Redux Toolkit for state management with dynamic slice registration.

### Creating a Store

```typescript
import { createStore, createEventBus } from '@hai3/state';

const eventBus = createEventBus();
const store = createStore({
  eventBus,
  preloadedState: {}  // Optional initial state
});
```

### Store Configuration

The store is pre-configured with:
- Redux Toolkit's `configureStore`
- Redux DevTools support (development only)
- Event bus integration
- Dynamic slice registration support

## Dynamic Slice Registration

Register Redux slices dynamically at runtime:

### Creating a Slice

```typescript
import { createSlice } from '@hai3/state';

interface UserState {
  profile: User | null;
  loading: boolean;
}

const userSlice = createSlice({
  name: 'user',
  initialState: {
    profile: null,
    loading: false
  } as UserState,
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

### Registering a Slice

```typescript
import { registerSlice } from '@hai3/state';

registerSlice(store, userSlice);
```

After registration:
- Slice reducer is added to store
- Slice state is available in store
- Actions can be dispatched
- Selectors can access state

### Using Registered Slices

```typescript
// Dispatch actions
store.dispatch(userSlice.actions.setProfile({
  id: '123',
  name: 'John Doe'
}));

// Select state
const state = store.getState();
const user = state.user.profile;
```

## Selectors

Create reusable selectors for accessing state:

### Basic Selectors

```typescript
// src/state/userSelectors.ts
export const selectUser = (state: RootState) => state.user.profile;
export const selectUserLoading = (state: RootState) => state.user.loading;
```

### Memoized Selectors

Use `createSelector` for computed values:

```typescript
import { createSelector } from '@hai3/state';

export const selectUserName = createSelector(
  [selectUser],
  (user) => user?.name || 'Guest'
);

export const selectIsAdmin = createSelector(
  [selectUser],
  (user) => user?.role === 'admin'
);
```

### Parameterized Selectors

```typescript
export const selectProductById = createSelector(
  [
    (state: RootState) => state.products.items,
    (_: RootState, productId: string) => productId
  ],
  (products, productId) => products.find(p => p.id === productId)
);

// Usage
const product = selectProductById(state, '123');
```

## State Structure

Recommended state structure:

```typescript
interface RootState {
  // App-level state
  app: {
    theme: string;
    language: string;
    initialized: boolean;
  };

  // Auth state
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    token: string | null;
  };

  // Feature state
  user: UserState;
  products: ProductsState;
  cart: CartState;

  // UI state
  ui: {
    sidebarOpen: boolean;
    notifications: Notification[];
  };
}
```

## Async Actions with Thunks

Handle async operations:

```typescript
import { createAsyncThunk } from '@hai3/state';

export const fetchUser = createAsyncThunk(
  'user/fetch',
  async (userId: string) => {
    const response = await api.getUser(userId);
    return response.data;
  }
);

// Use in slice
const userSlice = createSlice({
  name: 'user',
  initialState: { profile: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});
```

## Event Bus + Redux Integration

Coordinate events and state updates:

```typescript
// Emit event when state changes
store.subscribe(() => {
  const state = store.getState();
  if (state.user.profile) {
    eventBus.emit({
      type: 'user.profile.loaded',
      payload: state.user.profile
    });
  }
});

// Update state in response to events
eventBus.on('auth.logout', () => {
  store.dispatch(userSlice.actions.setProfile(null));
});
```

## Module Augmentation

TypeScript module augmentation for type safety:

```typescript
// src/types/store.ts
import '@hai3/state';

declare module '@hai3/state' {
  interface RootState {
    user: UserState;
    products: ProductsState;
    cart: CartState;
  }

  interface EventPayloadMap {
    'user.login': { userId: string };
    'user.logout': {};
    'product.added': { productId: string };
  }
}
```

Now TypeScript knows about your state shape and events!

## Best Practices

### ✅ Do

**Normalize State:**
```typescript
// ✅ Good: Normalized
interface ProductsState {
  byId: Record<string, Product>;
  allIds: string[];
}

// ❌ Bad: Nested
interface ProductsState {
  products: Product[];  // Hard to update efficiently
}
```

**Use Selectors:**
```typescript
// ✅ Good: Reusable selector
const user = useAppSelector(selectUser);

// ❌ Bad: Inline selection
const user = useAppSelector(state => state.user.profile);
```

**Memoize Expensive Computations:**
```typescript
// ✅ Good: Memoized
export const selectSortedProducts = createSelector(
  [selectProducts],
  (products) => [...products].sort((a, b) => a.price - b.price)
);
```

**Keep State Serializable:**
```typescript
// ✅ Good: Plain objects
const state = { user: { name: 'John' } };

// ❌ Bad: Class instances
const state = { user: new User('John') };  // Won't serialize
```

### ❌ Don't

**Don't Mutate State Directly:**
```typescript
// ❌ Bad: Direct mutation
const state = store.getState();
state.user.name = 'Jane';  // Doesn't trigger updates!

// ✅ Good: Dispatch action
store.dispatch(userSlice.actions.updateName('Jane'));
```

**Don't Store Derived Data:**
```typescript
// ❌ Bad: Storing computed values
interface State {
  products: Product[];
  totalPrice: number;  // Computed from products
}

// ✅ Good: Use selector
const selectTotalPrice = createSelector(
  [selectProducts],
  (products) => products.reduce((sum, p) => sum + p.price, 0)
);
```

**Don't Create Circular Dependencies:**
```typescript
// ❌ Bad: Circular event handling
eventBus.on('a', () => eventBus.emit({ type: 'b' }));
eventBus.on('b', () => eventBus.emit({ type: 'a' }));  // Infinite loop!
```

## Testing

### Testing Event Bus

```typescript
import { createEventBus } from '@hai3/state';

test('event bus emits and receives events', () => {
  const eventBus = createEventBus();
  const handler = jest.fn();

  eventBus.on('test.event', handler);
  eventBus.emit({ type: 'test.event', payload: { foo: 'bar' } });

  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'test.event',
      payload: { foo: 'bar' }
    })
  );
});
```

### Testing Slices

```typescript
import { userSlice, setProfile } from './userSlice';

test('setProfile updates state', () => {
  const initialState = { profile: null, loading: false };
  const profile = { id: '123', name: 'John' };

  const nextState = userSlice.reducer(
    initialState,
    setProfile(profile)
  );

  expect(nextState.profile).toEqual(profile);
});
```

### Testing Selectors

```typescript
import { selectUserName } from './userSelectors';

test('selectUserName returns user name or Guest', () => {
  const stateWithUser = { user: { profile: { name: 'John' } } };
  expect(selectUserName(stateWithUser)).toBe('John');

  const stateWithoutUser = { user: { profile: null } };
  expect(selectUserName(stateWithoutUser)).toBe('Guest');
});
```

## Performance Optimization

### Batching Updates

```typescript
import { batch } from '@hai3/state';

// Batch multiple dispatches
batch(() => {
  store.dispatch(action1());
  store.dispatch(action2());
  store.dispatch(action3());
});
// Only one re-render!
```

### Debouncing Events

```typescript
import { debounce } from 'lodash';

const debouncedHandler = debounce((event) => {
  // Handle event
}, 300);

eventBus.on('search.query.changed', debouncedHandler);
```

## Related Documentation

- [Event-Driven Architecture](/hai3/concepts/event-driven)
- [Layers](/hai3/architecture/layers)
- [React Layer](/hai3/architecture/react)
- [API Reference - State](/hai3/api-reference/state)
- [TERMINOLOGY](/TERMINOLOGY#state-management)

## Next Steps

1. **Learn Events:** Deep dive into [Event-Driven Architecture](/hai3/concepts/event-driven)
2. **Use in React:** See how [React Layer](/hai3/architecture/react) uses `@hai3/state`
3. **Build Screensets:** Apply state management in [Creating Screensets](/hai3/guides/creating-screensets)
