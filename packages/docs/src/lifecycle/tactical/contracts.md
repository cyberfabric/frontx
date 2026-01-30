---
title: Team Contracts
description: Defining interfaces and agreements between teams or components
---

# Team Contracts

## Overview

Contracts define interfaces between teams/components, enabling independent work and preventing integration failures.

## Contract Types

### API Contracts

Define REST/GraphQL endpoints before implementation.

**Elements:**
- Endpoint paths and HTTP methods
- Request/response schemas
- Authentication requirements
- Error responses
- Rate limits

**Example (OpenAPI):**
```yaml
/users/{id}:
  get:
    summary: Get user by ID
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string, format: uuid }
    responses:
      200:
        content:
          application/json:
            schema:
              type: object
              properties:
                id: { type: string }
                name: { type: string }
                email: { type: string }
      404:
        description: User not found
```

### Data Contracts

Define data schemas for databases or message queues.

**Example (Database):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Example (JSON Schema):**
```json
{
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "maxLength": 200 },
    "email": { "type": "string", "format": "email" }
  }
}
```

### Event Contracts

Define event structure for event-driven systems.

**Example:**
```typescript
// Event: user.profile.updated
{
  type: 'user.profile.updated',
  payload: {
    userId: string,      // UUID
    changes: {
      name?: string,
      email?: string
    },
    timestamp: number    // Unix timestamp
  },
  metadata: {
    source: string,      // Service name
    version: string      // Event schema version
  }
}
```

### UI Component Contracts

Define component props and behavior.

**Example (TypeScript):**
```typescript
interface UserCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  onEdit?: (userId: string) => void;
  variant?: 'default' | 'compact';
}

/**
 * Displays user information with optional edit button.
 *
 * @example
 * <UserCard user={user} onEdit={handleEdit} />
 */
export function UserCard(props: UserCardProps): JSX.Element;
```

## Contract Documentation

**Best practices:**
- Version contracts (semantic versioning)
- Document breaking vs. non-breaking changes
- Provide examples
- Auto-generate from code when possible

**Tools:**
- OpenAPI/Swagger for REST APIs
- GraphQL Schema for GraphQL
- AsyncAPI for events
- TypeScript types for components

## Validation and Testing

### Contract Testing

Verify implementations match contracts.

**Consumer-driven contract testing:**
1. Consumer defines expectations
2. Producer validates against expectations
3. Both test independently

**Example (Jest):**
```typescript
test('GET /users/:id returns user object', async () => {
  const response = await api.get('/users/123');

  expect(response.status).toBe(200);
  expect(response.data).toMatchObject({
    id: expect.any(String),
    name: expect.any(String),
    email: expect.stringMatching(/@/)
  });
});
```

### Schema Validation

Validate data against schemas at runtime.

**Example (Zod):**
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200),
  email: z.string().email()
});

// Validate
const user = UserSchema.parse(data);  // Throws if invalid
```

## Related Documentation

- [Tactical Layer Overview](/lifecycle/tactical/)
- [Specifications](/lifecycle/tactical/specifications)
- [HAI3 API Layer](/hai3/architecture/sdk/api)
