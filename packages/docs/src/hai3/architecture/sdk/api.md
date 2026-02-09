---
title: API Layer (@hai3/api)
description: HTTP client with protocol support for backend communication
---

# API Layer (@hai3/api)

The `@hai3/api` package provides a typed HTTP client for backend communication with protocol support (REST, SSE), request/response interceptors, and mock capabilities.

## Overview

**Package:** `@hai3/api`
**Layer:** L1 (SDK)
**Dependencies:** `axios`, `lodash` (no other `@hai3/*` packages)

**Key Features:**
- BaseApiService class for API services
- REST and SSE protocol support
- Request/response interceptors
- Error handling and retries
- Mock plugin for development
- TypeScript-first with full typing

## BaseApiService

Base class for creating API services:

```typescript
import { BaseApiService } from '@hai3/api';

interface User {
  id: string;
  name: string;
  email: string;
}

class UsersApiService extends BaseApiService {
  async getUsers() {
    return this.get<User[]>('/users');
  }

  async getUser(id: string) {
    return this.get<User>(`/users/${id}`);
  }

  async createUser(data: Omit<User, 'id'>) {
    return this.post<User>('/users', data);
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.put<User>(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.delete(`/users/${id}`);
  }
}

// Usage
const usersApi = new UsersApiService({
  baseURL: 'https://api.example.com',
  timeout: 10000
});

const users = await usersApi.getUsers();
```

## HTTP Methods

### GET

```typescript
const data = await service.get<ResponseType>('/endpoint', {
  params: { page: 1, limit: 10 },
  headers: { 'Custom-Header': 'value' }
});
```

### POST

```typescript
const result = await service.post<ResponseType>('/endpoint', {
  name: 'John',
  email: 'john@example.com'
});
```

### PUT

```typescript
const updated = await service.put<ResponseType>('/endpoint/123', {
  name: 'Jane'
});
```

### PATCH

```typescript
const patched = await service.patch<ResponseType>('/endpoint/123', {
  status: 'active'
});
```

### DELETE

```typescript
await service.delete('/endpoint/123');
```

## Protocols

### REST Protocol

Standard HTTP request/response:

```typescript
const api = new UsersApiService({
  baseURL: 'https://api.example.com',
  protocol: 'rest'  // Default
});
```

### SSE Protocol

Server-Sent Events for real-time data:

```typescript
class NotificationsApiService extends BaseApiService {
  async streamNotifications(onNotification: (data: any) => void) {
    return this.stream('/notifications/stream', onNotification);
  }
}

const api = new NotificationsApiService({
  baseURL: 'https://api.example.com',
  protocol: 'sse'
});

await api.streamNotifications((notification) => {
  console.log('Received:', notification);
});
```

## Interceptors

### Request Interceptors

Modify requests before sending:

```typescript
service.addRequestInterceptor((config) => {
  // Add auth token
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Response Interceptors

Process responses:

```typescript
service.addResponseInterceptor(
  (response) => {
    // Transform response
    return response.data;
  },
  (error) => {
    // Handle errors
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## Error Handling

```typescript
try {
  const user = await usersApi.getUser('123');
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Server error:', error.response.status);
  } else if (error.request) {
    // Request made but no response
    console.error('Network error');
  } else {
    // Error setting up request
    console.error('Request error:', error.message);
  }
}
```

## Mock Plugin

For development without real backend:

```typescript
import { MockApiPlugin } from '@hai3/api';

const mockPlugin = new MockApiPlugin({
  '/users': {
    GET: () => [
      { id: '1', name: 'John', email: 'john@example.com' },
      { id: '2', name: 'Jane', email: 'jane@example.com' }
    ]
  },
  '/users/:id': {
    GET: (params) => ({
      id: params.id,
      name: 'John',
      email: 'john@example.com'
    })
  }
});

const api = new UsersApiService({
  baseURL: 'https://api.example.com',
  mock: mockPlugin
});
```

## Best Practices

**Extend BaseApiService:**
```typescript
// ✅ Good: One service per domain
class UsersApiService extends BaseApiService {}
class ProductsApiService extends BaseApiService {}
```

**Type Everything:**
```typescript
// ✅ Good: Typed responses
const users = await api.get<User[]>('/users');
```

**Handle Errors:**
```typescript
// ✅ Good: Try/catch
try {
  const data = await api.getData();
} catch (error) {
  handleError(error);
}
```

## Related Documentation

- [API Integration Guide](/hai3/guides/api-integration)
- [SDK Layer](/hai3/architecture/layers)
- [TERMINOLOGY](/TERMINOLOGY#api-layer)
