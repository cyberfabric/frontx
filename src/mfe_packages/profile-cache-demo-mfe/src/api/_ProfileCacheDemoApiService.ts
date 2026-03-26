/**
 * Accounts API service for the profile cache demo MFE.
 */

// @cpt-FEATURE:implement-endpoint-descriptors:p1

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

  // @cpt-begin:implement-endpoint-descriptors:p1:inst-profile-cache-demo-descriptors
  // Keep the cache-demo screen on the shared current-user snapshot instead of
  // immediately refetching its own mock backend when the MFE mounts.
  readonly getCurrentUser = this.query<GetCurrentUserResponse>('/user/current', {
    staleTime: Infinity,
  });
  // @cpt-end:implement-endpoint-descriptors:p1:inst-profile-cache-demo-descriptors
}
