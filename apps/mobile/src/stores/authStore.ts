import { create } from 'zustand';
export type SessionRole = 'customer' | 'staff' | 'owner';
export interface AuthSession {
  userId: string;
  roles: readonly SessionRole[];
}
// Read-only session foundation. No sign-in implementation or persisted credentials.
export const useAuthStore = create<{ session: AuthSession | null }>(() => ({ session: null }));
export const canAccessRole = (session: AuthSession | null, role: SessionRole) =>
  session?.roles.includes(role) ?? false;
