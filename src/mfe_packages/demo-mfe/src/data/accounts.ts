/**
 * Accounts Domain - Query Key Factory and Query Options
 *
 * Centralises query keys under the '@accounts' namespace so that any cache
 * operation (get, set, invalidate) uses a consistent, refactor-safe key shape.
 * Query options factories are colocated with the keys they reference so callers
 * never have to reconstruct the key separately.
 */
// @cpt-FEATURE:request-cancellation:p2

import {
  apiRegistry,
  queryOptions,
  type UseApiMutationOptions,
  type UseApiQueryOptions,
} from '@hai3/react';
import { AccountsApiService } from '../api/AccountsApiService';
import type { GetCurrentUserResponse } from '../api/types';

export type UpdateProfileVariables = {
  firstName: string;
  lastName: string;
  department?: string;
};

export type UpdateProfileContext = {
  snapshot: GetCurrentUserResponse | undefined;
};

// @cpt-begin:request-cancellation:p2:inst-1
export const accountsKeys = {
  all: ['@accounts'] as const,
  currentUser: () => [...accountsKeys.all, 'current-user'] as const,
};

type AccountsServiceGetter = () => AccountsApiService;

export function createAccountsQueries(getService: AccountsServiceGetter) {
  return {
    currentUser: (): UseApiQueryOptions<GetCurrentUserResponse> =>
      queryOptions({
        queryKey: accountsKeys.currentUser(),
        // TanStack Query injects { signal } automatically; forwarding it to the
        // service method allows the underlying fetch to be aborted on unmount.
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getService().getCurrentUser({ signal }),
      }) as UseApiQueryOptions<GetCurrentUserResponse>,
  };
}

export function createAccountsMutations(getService: AccountsServiceGetter) {
  return {
    updateProfile: (): UseApiMutationOptions<
      GetCurrentUserResponse,
      Error,
      UpdateProfileVariables,
      UpdateProfileContext
    > => ({
      mutationFn: (variables) => getService().updateProfile(variables),

      onMutate: async (variables, { queryCache }) => {
        // Cancel any in-flight refetch so it doesn't overwrite the optimistic value.
        await queryCache.cancel(accountsKeys.currentUser());

        const snapshot = queryCache.get<GetCurrentUserResponse>(accountsKeys.currentUser());

        queryCache.set<GetCurrentUserResponse>(accountsKeys.currentUser(), (old) => {
          if (!old) {
            return old;
          }

          return {
            user: {
              ...old.user,
              firstName: variables.firstName,
              lastName: variables.lastName,
              updatedAt: new Date().toISOString(),
              extra: {
                ...old.user.extra,
                department: variables.department,
              },
            },
          };
        });

        return { snapshot };
      },

      onError: (_error, _variables, context, { queryCache }) => {
        if (context?.snapshot !== undefined) {
          queryCache.set(accountsKeys.currentUser(), context.snapshot);
        }
      },

      onSettled: async (_data, _error, _variables, _context, { queryCache: _queryCache }) => {
        // Experiment mode: keep the shared cached value instead of invalidating,
        // because the second MFE uses its own mock backend state.
        void _queryCache;
      },
    }),
  };
}

function getAccountsService(): AccountsApiService {
  return apiRegistry.getService(AccountsApiService);
}

export const accountsQueries = createAccountsQueries(getAccountsService);
export const accountsMutations = createAccountsMutations(getAccountsService);
// @cpt-end:request-cancellation:p2:inst-1
