/**
 * Accounts Domain - API Service
 * Service for accounts domain (users, tenants, authentication, permissions)
 *
 * MFE-local service. The MFE bundles its own copy of @hai3/react and registers
 * services into its own isolated apiRegistry instance.
 */

// @cpt-FEATURE:implement-endpoint-descriptors:p1

import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';
import type { GetCurrentUserResponse } from './types';
import { accountsMockMap } from './mocks';

export type UpdateProfileVariables = {
  firstName: string;
  lastName: string;
  department?: string;
};

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

  // @cpt-begin:implement-endpoint-descriptors:p1:inst-accounts-descriptors
  readonly getCurrentUser = this.query<GetCurrentUserResponse>('/user/current');
  readonly updateProfile = this.mutation<GetCurrentUserResponse, UpdateProfileVariables>('PUT', '/user/profile');
  // @cpt-end:implement-endpoint-descriptors:p1:inst-accounts-descriptors
}
