/**
 * Accounts Domain - Mock Data
 * Mock responses for accounts service endpoints
 *
 * Used with MockPlugin for development and testing.
 * Keys are full URL patterns (including baseURL path).
 */

import type { MockMap } from '@cyberfabric/react';
import { Language } from '@cyberfabric/react';
import { UserRole, type ApiUser, type GetCurrentUserResponse, type UpdateProfileRequest } from './types';

/**
 * Mock user data
 */
let mockUser: ApiUser = {
  id: 'mock-user-001',
  email: 'demo@frontx.dev',
  firstName: 'Demo',
  lastName: 'User',
  role: UserRole.Admin,
  language: Language.English,
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2024-12-01T00:00:00Z').toISOString(),
  extra: {
    department: 'Engineering',
  },
};

/**
 * Accounts mock map
 * Keys are full URL patterns (including /api/accounts baseURL)
 */
export const accountsMockMap: MockMap = {
  'GET /api/accounts/user/current': (): GetCurrentUserResponse => ({
    user: mockUser,
  }),

  'PUT /api/accounts/user/profile': (requestData): GetCurrentUserResponse => {
    // requestData is the PUT body forwarded by RestMockPlugin as context.body.
    // Merge the patched fields onto the base mock user so the response reflects
    // what the server would return after persisting the change.
    const patch = (requestData ?? {}) as Partial<UpdateProfileRequest>;
    const currentDepartment =
      typeof mockUser.extra?.department === 'string' ? mockUser.extra.department : undefined;

    mockUser = {
      ...mockUser,
      firstName: patch.firstName ?? mockUser.firstName,
      lastName: patch.lastName ?? mockUser.lastName,
      updatedAt: new Date().toISOString(),
      extra: {
        ...mockUser.extra,
        department: patch.department ?? currentDepartment,
      },
    };

    return {
      user: mockUser,
    };
  },
};
