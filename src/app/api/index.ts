/**
 * Accounts API - Exports
 * Application-specific API exports
 */

export const ACCOUNTS_DOMAIN = 'accounts' as const;

export { AccountsApiService } from './AccountsApiService';
export { UserRole, type ApiUser, type UserExtra, type GetCurrentUserResponse } from './types';
export { accountsMockMap } from './mocks';
