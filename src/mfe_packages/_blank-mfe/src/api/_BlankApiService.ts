/**
 * _Blank Domain - API Service
 * Replace '_Blank' with your screenset name.
 */

import { BaseApiService, RestProtocol, RestMockPlugin } from '@hai3/react';
import type { GetDataResponse } from './types';
import { blankMockMap } from './mocks';

/**
 * _Blank API Service
 * Replace with your domain-specific endpoints.
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
   * Example endpoint — replace with your API calls
   */
  async getData(): Promise<GetDataResponse> {
    return this.protocol(RestProtocol).get<GetDataResponse>('/data');
  }
}
