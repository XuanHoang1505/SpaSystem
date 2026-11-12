import { create } from 'zustand';
import type { AuthResult, AuthUser, UserRole } from '@spa/shared-types';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

interface AuthState {
  status: SessionStatus;
  user: AuthUser | null;
  /** In memory only; the refresh token lives in the secure store (`lib/auth/tokenStorage`). */
  accessToken: string | null;
  accessTokenExpiresAtUtc: string | null;
  setSession: (result: AuthResult) => void;
  endSession: () => void;
}

const anonymous = {
  status: 'anonymous',
  user: null,
  accessToken: null,
  accessTokenExpiresAtUtc: null,
} as const;

export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  user: null,
  accessToken: null,
  accessTokenExpiresAtUtc: null,
  setSession: (result) =>
    set({
      status: 'authenticated',
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresAtUtc: result.accessTokenExpiresAtUtc,
    }),
  endSession: () => set(anonymous),
}));

const homePaths = {
  customer: '/(customer)/home',
  staff: '/(staff)/dashboard',
  owner: '/(owner)/dashboard',
} as const satisfies Record<UserRole, string>;

/** Where each role lands after signing in (UC-SPA-02 step 6). */
export const homePathFor = (role: UserRole) => homePaths[role];

export const canAccessRole = (user: AuthUser | null, role: UserRole) => user?.role === role;
