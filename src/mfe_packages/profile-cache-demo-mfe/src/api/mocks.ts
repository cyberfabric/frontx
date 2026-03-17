/**
 * Accounts mock data for the profile cache demo MFE.
 */

import type { MockMap } from '@hai3/react';
import { Language } from '@hai3/react';
import type { ApiUser, GetCurrentUserResponse } from './types';
import { UserRole } from './types';

const mockUser: ApiUser = {
  id: 'profile-cache-demo-user',
  email: 'cache-demo@hai3.org',
  firstName: 'Cache',
  lastName: 'Demo',
  role: UserRole.Admin,
  language: Language.English,
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CacheDemo',
  createdAt: new Date('2024-02-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2025-01-15T00:00:00Z').toISOString(),
  extra: {
    department: 'Cache Validation',
  },
};

export const profileCacheDemoMockMap: MockMap = {
  'GET /api/accounts/user/current': (): GetCurrentUserResponse => ({
    user: mockUser,
  }),
};
