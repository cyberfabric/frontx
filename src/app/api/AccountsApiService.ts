/**
 * Accounts Domain - API Service
 * Service for accounts domain (users, tenants, authentication, permissions)
 *
 * Application-specific service (copied from CLI template)
 */

import { BaseApiService, RestProtocol } from '@hai3/api';
import type { GetCurrentUserResponse } from './types';
import { accountsMockMap } from './mocks';

/**
 * Accounts API Service
 * Manages accounts domain endpoints:
 * - User management (current user, profile, preferences)
 * - Tenant management (current tenant, switching)
 * - Authentication (login, logout, tokens)
 * - Permissions and roles
 */
export class AccountsApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol({
      timeout: 30000,
    });

    super({ baseURL: '/api/accounts' }, restProtocol);

    // Self-register mock map - stays within screenset (vertical slice pattern)
    restProtocol.registerMockMap(accountsMockMap);
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return this.protocol(RestProtocol).get<GetCurrentUserResponse>('/user/current');
  }
}

// NOTE: With class-based API registration, register services using:
// import { AccountsApiService, apiRegistry } from '@/api';
// apiRegistry.register(AccountsApiService);
