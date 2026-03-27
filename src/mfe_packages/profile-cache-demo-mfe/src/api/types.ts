import type { Language } from '@hai3/react';

export interface UserExtra {
  [key: string]: unknown;
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  language: Language;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  extra?: UserExtra;
}

export interface GetCurrentUserResponse {
  user: ApiUser;
}
