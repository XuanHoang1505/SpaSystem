import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { canAccessRole, useAuthStore, type SessionRole } from '@/stores/authStore';
// Reserved for real authentication. Preview placeholder routes are deliberately unguarded.
export function RouteGuard({ role, children }: PropsWithChildren<{ role: SessionRole }>) {
  const session = useAuthStore((state) => state.session);
  return canAccessRole(session, role) ? children : <Navigate to="/forbidden" replace />;
}
