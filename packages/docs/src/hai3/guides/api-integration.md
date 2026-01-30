---
title: API Integration
description: Connecting to backend services with typed API clients
---

# API Integration

This guide shows how to integrate backend APIs into your HAI3 application using typed, reusable API services.

## Overview

We'll build a complete API integration for a task management app:

1. Create API service extending `BaseApiService`
2. Define typed API methods
3. Register service in framework
4. Use in React components
5. Handle errors gracefully
6. Mock development without backend

## Step 1: Create API Service

Create an API service class extending `BaseApiService`:

```typescript
// src/services/api/tasksApi.ts
import { BaseApiService } from '@hai3/api';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
}

interface CreateTaskData {
  title: string;
  description: string;
}

export class TasksApiService extends BaseApiService {
  constructor() {
    super({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for auth
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }
}
```

## Step 2: Define API Methods

Add typed methods for each endpoint:

```typescript
export class TasksApiService extends BaseApiService {
  // GET /tasks
  async getTasks() {
    return this.get<Task[]>('/tasks');
  }

  // GET /tasks/:id
  async getTask(id: string) {
    return this.get<Task>(`/tasks/${id}`);
  }

  // POST /tasks
  async createTask(data: CreateTaskData) {
    return this.post<Task>('/tasks', data);
  }

  // PUT /tasks/:id
  async updateTask(id: string, data: Partial<Task>) {
    return this.put<Task>(`/tasks/${id}`, data);
  }

  // DELETE /tasks/:id
  async deleteTask(id: string) {
    return this.delete(`/tasks/${id}`);
  }

  // PATCH /tasks/:id/complete
  async completeTask(id: string) {
    return this.patch<Task>(`/tasks/${id}/complete`, {});
  }

  // GET /tasks?completed=true
  async getCompletedTasks() {
    return this.get<Task[]>('/tasks', {
      params: { completed: true }
    });
  }
}

// Export singleton instance
export const tasksApi = new TasksApiService();
```

## Step 3: Register API Service

Register service in framework (optional but recommended):

```typescript
// src/App.tsx
import { createHAI3 } from '@hai3/framework';
import { apiPlugin } from '@hai3/framework/plugins';
import { tasksApi } from './services/api/tasksApi';

const app = createHAI3()
  .use(apiPlugin())
  .build();

// Register API service
app.getRegistry('api').register('tasks', tasksApi);
```

Or use directly without registration:

```typescript
// src/services/api/index.ts
export { tasksApi } from './tasksApi';
```

## Step 4: Use in Components

### Basic Usage

```typescript
// src/screensets/tasks/screens/TaskList.tsx
import { useState, useEffect } from 'react';
import { tasksApi } from '@/services/api';

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### With State Management

```typescript
// src/screensets/tasks/state/tasksSlice.ts
import { createSlice, createAsyncThunk } from '@hai3/state';
import { tasksApi } from '@/services/api';

export const fetchTasks = createAsyncThunk(
  'tasks/fetch',
  async () => {
    return await tasksApi.getTasks();
  }
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (data: CreateTaskData) => {
    return await tasksApi.createTask(data);
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export default tasksSlice.reducer;
```

```typescript
// src/screensets/tasks/screens/TaskList.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@hai3/react';
import { fetchTasks } from '../state/tasksSlice';

export function TaskList() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(state => state.tasks);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {items.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### With Custom Hook

```typescript
// src/screensets/tasks/hooks/useTasks.ts
import { useState, useEffect } from 'react';
import { tasksApi } from '@/services/api';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await tasksApi.getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (data: CreateTaskData) => {
    const newTask = await tasksApi.createTask(data);
    setTasks([...tasks, newTask]);
    return newTask;
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const updated = await tasksApi.updateTask(id, data);
    setTasks(tasks.map(t => t.id === id ? updated : t));
    return updated;
  };

  const deleteTask = async (id: string) => {
    await tasksApi.deleteTask(id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  return {
    tasks,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask
  };
}
```

```typescript
// Usage
function TaskList() {
  const { tasks, loading, createTask } = useTasks();

  const handleCreate = async () => {
    await createTask({ title: 'New Task', description: '' });
  };

  return <div>{/* ... */}</div>;
}
```

## Step 5: Error Handling

### Response Interceptor

```typescript
export class TasksApiService extends BaseApiService {
  constructor() {
    super({ /* ... */ });

    // Global error handling
    this.addResponseInterceptor(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login
          window.location.href = '/login';
        } else if (error.response?.status === 403) {
          // Show permission error
          console.error('Permission denied');
        } else if (error.response?.status === 500) {
          // Show server error
          console.error('Server error');
        }
        return Promise.reject(error);
      }
    );
  }
}
```

### Component Error Handling

```typescript
function TaskList() {
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: any) => {
    if (err.response) {
      // Server responded with error
      setError(`Error: ${err.response.data.message}`);
    } else if (err.request) {
      // No response received
      setError('Network error. Please check your connection.');
    } else {
      // Request setup error
      setError('An unexpected error occurred.');
    }
  };

  const loadTasks = async () => {
    try {
      const data = await tasksApi.getTasks();
      setTasks(data);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div>
      {error && <ErrorBanner message={error} />}
      {/* ... */}
    </div>
  );
}
```

## Step 6: Mock Development

Use mock plugin to develop without backend:

```typescript
// src/services/api/tasksApi.ts
import { MockApiPlugin } from '@hai3/api';

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete documentation',
    description: 'Finish API integration guide',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Review PR',
    description: 'Review pull request #123',
    completed: true,
    createdAt: new Date().toISOString()
  }
];

const mockPlugin = new MockApiPlugin({
  '/tasks': {
    GET: () => mockTasks,
    POST: (_, data) => ({
      id: String(Date.now()),
      ...data,
      completed: false,
      createdAt: new Date().toISOString()
    })
  },
  '/tasks/:id': {
    GET: (params) => mockTasks.find(t => t.id === params.id),
    PUT: (params, data) => ({
      ...mockTasks.find(t => t.id === params.id),
      ...data
    }),
    DELETE: () => ({ success: true })
  }
});

export class TasksApiService extends BaseApiService {
  constructor() {
    super({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      mock: import.meta.env.DEV ? mockPlugin : undefined
    });
  }
}
```

## Best Practices

**Type Everything:**
```typescript
// ✅ Good: Full typing
async getTasks() {
  return this.get<Task[]>('/tasks');
}

// ❌ Bad: No types
async getTasks() {
  return this.get('/tasks');
}
```

**Handle Errors:**
```typescript
// ✅ Good: Try/catch
try {
  await tasksApi.getTasks();
} catch (error) {
  handleError(error);
}

// ❌ Bad: No error handling
await tasksApi.getTasks();
```

**Use Environment Variables:**
```typescript
// ✅ Good: Configurable
baseURL: import.meta.env.VITE_API_BASE_URL

// ❌ Bad: Hardcoded
baseURL: 'http://localhost:3000'
```

**Mock for Development:**
```typescript
// ✅ Good: Mock in dev
mock: import.meta.env.DEV ? mockPlugin : undefined
```

## Related Documentation

- [API Layer SDK](/hai3/architecture/sdk/api)
- [State Management](/hai3/architecture/sdk/state)
- [TERMINOLOGY](/TERMINOLOGY#api-layer)
- [Extensibility Guide](/TERMINOLOGY#4-creating-api-services)
