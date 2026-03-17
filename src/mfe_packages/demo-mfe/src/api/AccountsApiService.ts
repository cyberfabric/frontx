/**
 * Accounts Domain - API Service
 * Service for accounts domain (users, tenants, authentication, permissions)
 *
 * MFE-local service. The MFE bundles its own copy of @hai3/react and registers
 * services into its own isolated apiRegistry instance.
 */

import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';
import type { GetCurrentUserResponse, UpdateProfileRequest } from './types';
import { accountsMockMap } from './mocks';

/**
 * Accounts API Service for the demo MFE.
 * Manages accounts domain endpoints:
 * - User management (current user, profile, preferences)
 */
export class AccountsApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol({
      timeout: 30000,
    });

    super({ baseURL: '/api/accounts' }, restProtocol);

    // Register mock plugin (framework controls when it's active based on mock mode toggle)
    this.registerPlugin(
      restProtocol,
      new RestMockPlugin({
        mockMap: accountsMockMap,
        delay: 100,
      })
    );
  }

  /**
   * Get current authenticated user.
   * Accepts an optional AbortSignal so TanStack Query can cancel the in-flight
   * request when the consuming component unmounts or the query key changes.
   */
  async getCurrentUser(options?: { signal?: AbortSignal }): Promise<GetCurrentUserResponse> {
    return this.protocol(RestProtocol).get<GetCurrentUserResponse>('/user/current', options);
  }

  /**
   * Update the current user's profile fields.
   */
  async updateProfile(data: UpdateProfileRequest): Promise<GetCurrentUserResponse> {
    return this.protocol(RestProtocol).patch<GetCurrentUserResponse>('/user/profile', data);
  }
}
