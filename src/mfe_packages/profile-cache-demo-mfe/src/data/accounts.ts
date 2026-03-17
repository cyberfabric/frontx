import {
  apiRegistry,
  queryOptions,
  type UseApiQueryOptions,
} from '@hai3/react';
import { _ProfileCacheDemoApiService } from '../api/_ProfileCacheDemoApiService';
import type { GetCurrentUserResponse } from '../api/types';

export const accountsKeys = {
  all: ['@accounts'] as const,
  currentUser: () => [...accountsKeys.all, 'current-user'] as const,
};

type AccountsServiceGetter = () => _ProfileCacheDemoApiService;

export function createAccountsQueries(getService: AccountsServiceGetter) {
  return {
    currentUser: (): UseApiQueryOptions<GetCurrentUserResponse> =>
      queryOptions({
        queryKey: accountsKeys.currentUser(),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getService().getCurrentUser({ signal }),
      }) as UseApiQueryOptions<GetCurrentUserResponse>,
  };
}

function getAccountsService(): _ProfileCacheDemoApiService {
  return apiRegistry.getService(_ProfileCacheDemoApiService);
}

export const accountsQueries = createAccountsQueries(getAccountsService);
