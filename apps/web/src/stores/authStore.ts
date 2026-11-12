import { create } from 'zustand';
import type { AuthResult, AuthUser, UserRole } from '@spa/shared-types';

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';
export type SessionEndReason = 'expired' | 'logout' | 'password_reset';

interface AuthState {
  status: SessionStatus;
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAtUtc: string | null;
  endReason: SessionEndReason | null;
  setSession: (result: AuthResult) => void;
  endSession: (reason: SessionEndReason) => void;
  markAnonymous: () => void;
}

const signedOut = { user: null, accessToken: null, accessTokenExpiresAtUtc: null } as const;

/**
 * Session in memory only (docs/specs/auth.md, "Phiên đăng nhập"): the refresh token stays in the HttpOnly cookie,
 * the access token is never persisted. Starts `restoring` until the app has tried `/auth/refresh` once.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  status: 'restoring',
  ...signedOut,
  endReason: null,
  setSession: (result) =>
    set({
      status: 'authenticated',
      user: result.user,
      accessToken: result.accessToken,
      accessTokenExpiresAtUtc: result.accessTokenExpiresAtUtc,
      endReason: null,
    }),
  endSession: (reason) => set({ status: 'anonymous', ...signedOut, endReason: reason }),
  markAnonymous: () => set({ status: 'anonymous', ...signedOut, endReason: null }),
}));

/** UX only; the API enforces permissions. */
export const canAccessRole = (user: AuthUser | null, role: UserRole) => user?.role === role;
