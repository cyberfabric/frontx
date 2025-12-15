/**
 * App types - Application-level domain types
 * User, Tenant, and other global state types
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
}
