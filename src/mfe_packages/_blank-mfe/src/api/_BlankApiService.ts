/**
 * _Blank Domain - API Service
 * Replace '_Blank' with your screenset name.
 */

import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';
import type { GetBlankStatusResponse } from './types';
import { blankMockMap } from './mocks';

/**
 * _Blank API Service
 * Add your domain-specific endpoint methods here.
 */
export class _BlankApiService extends BaseApiService {
  constructor() {
    const restProtocol = new RestProtocol({
      timeout: 30000,
    });

    super({ baseURL: '/api/blank' }, restProtocol);

    this.registerPlugin(
      restProtocol,
      new RestMockPlugin({
        mockMap: blankMockMap,
        delay: 100,
      })
    );
  }

  /**
   * Example query endpoint for the blank template.
   * Accepts an AbortSignal so useApiQuery can cancel in-flight requests.
   */
  async getStatus(options?: { signal?: AbortSignal }): Promise<GetBlankStatusResponse> {
    return this.protocol(RestProtocol).get<GetBlankStatusResponse>('/status', options);
  }
}
