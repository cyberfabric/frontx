# @hai3/api

API communication protocols and service registry for HAI3 applications.

## SDK Layer

This package is part of the **SDK Layer (L1)** - it has zero @hai3 dependencies and can be used independently. It has `axios` as a peer dependency.

## Core Concepts

### BaseApiService

Abstract base class for domain-specific API services:

```typescript
import { BaseApiService, RestProtocol } from '@hai3/api';

class AccountsApiService extends BaseApiService {
  constructor() {
    super(
      { baseURL: '/api/accounts' },
      new RestProtocol()
    );
  }

  async getCurrentUser(): Promise<User> {
    return this.protocol(RestProtocol).get('/user/current');
  }

  async updateProfile(data: ProfileUpdate): Promise<User> {
    return this.protocol(RestProtocol).put('/user/profile', data);
  }
}
```

### API Registry

Central registry for all API services:

```typescript
import { apiRegistry } from '@hai3/api';

// Register service with class reference (type-safe)
apiRegistry.register(AccountsApiService);

// Get service (type-safe with class reference)
const accounts = apiRegistry.getService(AccountsApiService);
const user = await accounts.getCurrentUser();
```

### Mock Support

Configure mocks via RestMockPlugin per-service or globally:

```typescript
import { RestMockPlugin, apiRegistry, RestProtocol } from '@hai3/api';

// Per-service mocks (in service constructor)
class AccountsApiService extends BaseApiService {
  constructor() {
    super({ baseURL: '/api/accounts' }, new RestProtocol());

    if (process.env.NODE_ENV === 'development') {
      this.plugins.add(new RestMockPlugin({
        mockMap: {
          'GET /api/accounts/user/current': () => ({ id: '1', name: 'John Doe' }),
          'GET /api/accounts/users/:id': (body) => ({ id: body.id, name: 'User' }),
          'POST /api/accounts/user/profile': (body) => ({ ...body, updatedAt: new Date() })
        },
        delay: 100,
      }));
    }
  }
}

// Or global mocks (for cross-cutting concerns)
apiRegistry.plugins.add(RestProtocol, new RestMockPlugin({
  mockMap: {
    'GET /api/accounts/user/current': () => ({ id: '1', name: 'John Doe' }),
    'GET /api/billing/invoices': () => [{ id: 'inv-1', amount: 100 }],
  },
  delay: 100,
}));
```

### Plugin System

Create plugins by extending ApiPluginBase or ApiPlugin<TConfig>:

```typescript
import { ApiPlugin, ApiPluginBase, ApiRequestContext, ApiResponseContext } from '@hai3/api';

// Simple plugin (no config)
class LoggingPlugin extends ApiPluginBase {
  onRequest(ctx: ApiRequestContext) {
    console.log(`[${ctx.method}] ${ctx.url}`);
    return ctx;
  }

  onResponse(response: ApiResponseContext, request: ApiRequestContext) {
    console.log(`[${response.status}] ${request.url}`);
    return response;
  }
}

// Plugin with config
class AuthPlugin extends ApiPlugin<{ getToken: () => string | null }> {
  onRequest(ctx: ApiRequestContext) {
    const token = this.config.getToken();
    if (!token) return ctx;
    return {
      ...ctx,
      headers: { ...ctx.headers, Authorization: `Bearer ${token}` }
    };
  }
}

// Register on service
service.plugins.add(new LoggingPlugin());
service.plugins.add(new AuthPlugin({ getToken: () => localStorage.getItem('token') }));

// Or register globally
apiRegistry.plugins.add(new LoggingPlugin());
```

## Protocol Support

### RestProtocol

HTTP REST API calls via axios:

```typescript
import { RestProtocol } from '@hai3/api';

const restProtocol = new RestProtocol({
  timeout: 30000,
  withCredentials: true,
  contentType: 'application/json'
});
```

## Mock Mode

Toggle mock mode via plugin management:

```typescript
import { apiRegistry, RestProtocol, RestMockPlugin } from '@hai3/api';

// Enable mock mode
apiRegistry.plugins.add(RestProtocol, new RestMockPlugin({
  mockMap: { /* ... */ },
  delay: 100
}));

// Disable mock mode
apiRegistry.plugins.remove(RestProtocol, RestMockPlugin);

// Check if mock mode is enabled
const isMockEnabled = apiRegistry.plugins.has(RestProtocol, RestMockPlugin);

// Get all plugins for a protocol
const restPlugins = apiRegistry.plugins.getAll(RestProtocol);
```

## Key Rules

1. **Services extend BaseApiService** - Use the base class for protocol management
2. **Register with class reference** - Call `apiRegistry.register(ServiceClass)`
3. **One service per domain** - Each bounded context gets one service
4. **Mocks via plugins** - Use MockPlugin per-service or globally
5. **Plugin identification by class** - Use class references, not string names

## Exports

- `BaseApiService` - Abstract base class
- `RestProtocol` - REST API protocol
- `SseProtocol` - SSE protocol
- `ApiPluginBase` - Abstract base class for plugins (no config)
- `ApiPlugin` - Abstract generic class for plugins with config
- `RestMockPlugin` - REST mock data plugin
- `SseMockPlugin` - SSE mock data plugin
- `apiRegistry` - Singleton registry
- `ApiService` - Service interface (type)
- `ApiRequestContext` - Plugin request context type
- `ApiResponseContext` - Plugin response context type
- `ShortCircuitResponse` - Short-circuit response wrapper
- `PluginClass` - Type for plugin class references
- `ProtocolClass` - Type for protocol class references
- `ProtocolPluginType` - Type mapping for protocol plugins
- `isShortCircuit` - Type guard for short-circuit responses
- `MockMap` - Mock response map type
