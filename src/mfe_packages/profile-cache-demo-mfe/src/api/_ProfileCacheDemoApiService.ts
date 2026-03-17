/**
 * Accounts API service for the profile cache demo MFE.
 */

import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';
import { profileCacheDemoMockMap } from './mocks';
import type { GetCurrentUserResponse } from './types';

/**
 * MFE-local accounts service.
 * The service instance is isolated per MFE, but it targets the same semantic
 * current-user resource so both MFEs can safely share one query-cache entry.
 */
export class _ProfileCacheDemoApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol({
      timeout: 30000,
    });

    super({ baseURL: '/api/accounts' }, restProtocol);

    this.registerPlugin(
      restProtocol,
      new RestMockPlugin({
        mockMap: profileCacheDemoMockMap,
        delay: 100,
      })
    );
  }

  async getCurrentUser(options?: { signal?: AbortSignal }): Promise<GetCurrentUserResponse> {
    return this.protocol(RestProtocol).get<GetCurrentUserResponse>('/user/current', options);
  }
}
