---
title: Event-Driven Architecture
description: Understanding HAI3's event bus and messaging patterns
---

# Event-Driven Architecture

HAI3 uses event-driven architecture as its primary communication mechanism. All cross-domain communication happens through events, not direct function calls.

## Why Event-Driven?

### The Problem with Direct Calls

In traditional architectures, components call each other directly:

```typescript
// ❌ Tight coupling
function saveProfile(profile: Profile) {
  database.save(profile);
  notificationService.sendEmail(profile.email);  // Direct dependency!
  analyticsService.track('profile_saved');       // Another dependency!
  cacheService.invalidate('profile');             // Yet another!
}
```

**Problems:**
- **Tight Coupling:** `saveProfile` knows about notification, analytics, and cache services
- **Hard to Test:** Must mock all dependencies
- **Difficult to Extend:** Adding new functionality requires modifying `saveProfile`
- **No Isolation:** Changes to one service affect others

### The Event-Driven Solution

With events, components are decoupled:

```typescript
// ✅ Decoupled via events
function saveProfile(profile: Profile) {
  database.save(profile);
  eventBus.emit({
    type: 'profile.saved',
    payload: profile
  });
}

// Separate concerns listen independently
eventBus.on('profile.saved', (event) => {
  notificationService.sendEmail(event.payload.email);
});

eventBus.on('profile.saved', (event) => {
  analyticsService.track('profile_saved');
});

eventBus.on('profile.saved', (event) => {
  cacheService.invalidate('profile');
});
```

**Benefits:**
- **Loose Coupling:** Components don't know about each other
- **Easy to Test:** Test each handler independently
- **Easy to Extend:** Add new handlers without modifying existing code
- **Isolation:** Microfrontends communicate through events only

## The Event Bus

HAI3 provides a type-safe event bus for all messaging:

```typescript
import { useEventBus } from '@hai3/framework';

function MyComponent() {
  const { emit, on, off } = useEventBus();

  // Emit an event
  emit({
    type: 'user.login',
    payload: { userId: '123' }
  });

  // Listen to an event
  useEffect(() => {
    return on('user.login', (event) => {
      console.log('User logged in:', event.payload.userId);
    });
  }, [on]);
}
```

### Event Structure

Every event has this structure:

```typescript
interface Event<T = any> {
  type: string;           // Event type (e.g., 'user.login')
  payload?: T;            // Optional data
  metadata?: {            // Optional metadata
    timestamp: number;
    source: string;
    correlationId?: string;
  };
}
```

## Event Naming Conventions

HAI3 uses a **hierarchical naming convention**:

```
domain.entity.action
```

### Examples

| Event Type | Domain | Entity | Action | Meaning |
|------------|--------|--------|--------|---------|
| `user.profile.updated` | user | profile | updated | User profile was updated |
| `auth.session.expired` | auth | session | expired | Auth session expired |
| `api.request.failed` | api | request | failed | API request failed |
| `screenset.dashboard.mounted` | screenset | dashboard | mounted | Dashboard screenset mounted |

### Naming Rules

1. **Use dots** to separate segments
2. **Use lowercase** for all parts
3. **Use past tense** for actions (`updated`, not `update`)
4. **Be specific** about the domain
5. **Keep it consistent** across the app

```typescript
// ✅ Good naming
'user.profile.updated'
'product.item.added'
'cart.checkout.completed'

// ❌ Bad naming
'UPDATE_USER'           // All caps, present tense
'profile-changed'       // Hyphens instead of dots
'userProfileUpdate'     // camelCase
```

## Type-Safe Events

HAI3 supports TypeScript type safety for events:

```typescript
// Define event payload types
interface EventPayloadMap {
  'user.login': { userId: string; timestamp: number };
  'user.logout': { userId: string };
  'profile.updated': { userId: string; changes: Partial<Profile> };
}

// Type-safe emit
emit<'user.login'>({
  type: 'user.login',
  payload: { userId: '123', timestamp: Date.now() }  // Typed!
});

// Type-safe listener
on<'user.login'>('user.login', (event) => {
  // event.payload is typed as { userId: string; timestamp: number }
  console.log(event.payload.userId);
});
```

## Emitting Events

### Basic Emit

```typescript
const { emit } = useEventBus();

// Simple event (no payload)
emit({ type: 'app.initialized' });

// Event with payload
emit({
  type: 'user.profile.updated',
  payload: {
    userId: '123',
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

### Emit from Actions

Emit events from Redux actions:

```typescript
const { emit } = useEventBus();

const updateProfile = (profile: Profile) => {
  // Update Redux state
  dispatch(profileSlice.actions.setProfile(profile));

  // Emit event for others
  emit({
    type: 'user.profile.updated',
    payload: profile
  });
};
```

### Emit from Components

```tsx
function SaveButton() {
  const { emit } = useEventBus();

  const handleSave = async () => {
    await saveData();

    emit({
      type: 'data.saved',
      payload: { timestamp: Date.now() }
    });
  };

  return <button onClick={handleSave}>Save</button>;
}
```

## Listening to Events

### Basic Listener

```typescript
const { on } = useEventBus();

useEffect(() => {
  // Subscribe to event
  const unsubscribe = on('user.login', (event) => {
    console.log('User logged in:', event.payload);
  });

  // Cleanup on unmount
  return unsubscribe;
}, [on]);
```

### Multiple Events

```typescript
useEffect(() => {
  const unsubscribe1 = on('user.login', handleLogin);
  const unsubscribe2 = on('user.logout', handleLogout);

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
}, [on]);
```

### Wildcard Listeners

Listen to all events matching a pattern:

```typescript
// Listen to all user events
on('user.*', (event) => {
  console.log('User event:', event.type);
});

// Listen to all events
on('*', (event) => {
  console.log('Any event:', event.type);
});
```

### Conditional Handlers

```typescript
on('product.item.added', (event) => {
  if (event.payload.category === 'electronics') {
    // Handle electronics differently
    applyElectronicsDiscount();
  }
});
```

## Common Patterns

### Request-Response Pattern

Sometimes you need a response from an event:

```typescript
// ❌ Don't do this - events are fire-and-forget
emit({ type: 'data.fetch', payload: { id: '123' } });
// How do we get the result?

// ✅ Do this - use async/await with APIs instead
const data = await apiService.fetchData('123');
```

::: tip Event Direction
Events flow **one way** (fire-and-forget). For request-response, use API services or Redux state.
:::

### Event Chains

Events can trigger other events:

```typescript
// First event
on('user.registered', async (event) => {
  await sendWelcomeEmail(event.payload.email);

  // Trigger next event
  emit({
    type: 'email.welcome.sent',
    payload: { userId: event.payload.userId }
  });
});

// Second event
on('email.welcome.sent', (event) => {
  analyticsService.track('welcome_email_sent', event.payload);
});
```

### State Synchronization

Keep state in sync across components:

```typescript
// Component A emits
const saveData = () => {
  dispatch(updateLocalState(data));
  emit({ type: 'data.updated', payload: data });
};

// Component B listens
on('data.updated', (event) => {
  // Update Component B's local state
  setRemoteData(event.payload);
});
```

### Cross-Screenset Communication

Screensets communicate through events:

```tsx
// Dashboard screenset emits
function DashboardScreen() {
  const { emit } = useEventBus();

  const handleAction = () => {
    emit({
      type: 'dashboard.action.performed',
      payload: { action: 'export' }
    });
  };
}

// Analytics screenset listens
function AnalyticsScreen() {
  const { on } = useEventBus();

  useEffect(() => {
    return on('dashboard.action.performed', (event) => {
      trackAction(event.payload.action);
    });
  }, [on]);
}
```

### Microfrontend Isolation

Events enable true microfrontend isolation:

```typescript
// Microfrontend A (isolated)
export function MicrofrontendA() {
  const { emit, on } = useEventBus();

  // Can only communicate via events
  emit({ type: 'mfA.ready', payload: {} });

  useEffect(() => {
    return on('mfB.data.changed', (event) => {
      // React to changes from Microfrontend B
      updateLocalData(event.payload);
    });
  }, [on]);
}
```

## Event Debugging

### Log All Events

```typescript
// Add global event logger
const { on } = useEventBus();

useEffect(() => {
  return on('*', (event) => {
    console.log('[Event]', event.type, event.payload);
  });
}, [on]);
```

### Event Tracing

Track event flow through the system:

```typescript
emit({
  type: 'order.placed',
  payload: { orderId: '123' },
  metadata: {
    correlationId: generateId(),  // Track related events
    source: 'checkout-screen'
  }
});
```

### DevTools Integration

HAI3 Studio provides event monitoring:

```bash
# Enable studio in development
npm run dev
```

Open DevTools → HAI3 Studio → Events tab to see all events in real-time.

## Best Practices

### ✅ Do

**Use Events For:**
- Cross-screenset communication
- Decoupling components
- Microfrontend isolation
- Analytics tracking
- Audit logging
- Background tasks

**Naming:**
- Follow `domain.entity.action` convention
- Use past tense for actions
- Be specific and descriptive

**Lifecycle:**
- Always unsubscribe when unmounting
- Use React's `useEffect` cleanup

**Type Safety:**
- Define `EventPayloadMap` for type safety
- Use TypeScript generics

### ❌ Don't

**Avoid Events For:**
- Request-response patterns (use APIs)
- Returning values (use functions)
- Parent-child component communication (use props)
- Synchronous workflows (use functions)

**Bad Patterns:**
- Emitting events in tight loops (performance)
- Circular event chains (infinite loops)
- Storing complex objects in payload (serialization)
- Using events when direct calls make sense

## Performance Considerations

### Event Volume

```typescript
// ❌ Bad: Too many events
for (let i = 0; i < 1000; i++) {
  emit({ type: 'item.processed', payload: { index: i } });
}

// ✅ Good: Batch events
const items = processItems();
emit({ type: 'items.processed', payload: { count: items.length } });
```

### Handler Complexity

```typescript
// ❌ Bad: Heavy computation in handler
on('data.updated', (event) => {
  // Expensive operation blocks event bus
  const result = expensiveComputation(event.payload);
});

// ✅ Good: Offload to async
on('data.updated', async (event) => {
  setTimeout(() => {
    expensiveComputation(event.payload);
  }, 0);
});
```

### Memory Leaks

```typescript
// ❌ Bad: No cleanup
useEffect(() => {
  on('event', handler);
  // Forgot to return cleanup!
});

// ✅ Good: Proper cleanup
useEffect(() => {
  const unsubscribe = on('event', handler);
  return unsubscribe;  // Always cleanup!
}, [on]);
```

## Testing Event-Driven Code

### Mock Event Bus

```typescript
import { render, screen } from '@testing-library/react';
import { EventBusContext } from '@hai3/framework';

test('component emits event', () => {
  const mockEmit = jest.fn();
  const mockEventBus = { emit: mockEmit, on: jest.fn(), off: jest.fn() };

  render(
    <EventBusContext.Provider value={mockEventBus}>
      <MyComponent />
    </EventBusContext.Provider>
  );

  // Trigger action
  fireEvent.click(screen.getByText('Save'));

  // Assert event was emitted
  expect(mockEmit).toHaveBeenCalledWith({
    type: 'data.saved',
    payload: expect.any(Object)
  });
});
```

### Test Event Handlers

```typescript
test('handler processes event', () => {
  const handler = jest.fn();
  const { on } = useEventBus();

  on('user.login', handler);

  emit({ type: 'user.login', payload: { userId: '123' } });

  expect(handler).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'user.login',
      payload: { userId: '123' }
    })
  );
});
```

## Related Documentation

- [State Management](/hai3/architecture/sdk/state)
- [Plugin System](/hai3/concepts/plugins)
- [Creating Screensets](/hai3/guides/creating-screensets)
- [Architecture Overview](/hai3/architecture/overview)
- [TERMINOLOGY](/TERMINOLOGY#event-driven-architecture)

## Next Steps

1. **Understand State:** Learn how events interact with [State Management](/hai3/architecture/sdk/state)
2. **Build Features:** Use events in your [Screensets](/hai3/guides/creating-screensets)
3. **Create Plugins:** Build [Plugins](/hai3/concepts/plugins) that listen to events
4. **Monitor Events:** Use HAI3 Studio to debug event flow
