import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@spa/shared-types';
import { canAccessRole, useAuthStore } from '@/stores/authStore';
// Reserved for real authentication. Preview placeholder routes are deliberately unguarded.
export function RouteGuard({ role, children }: PropsWithChildren<{ role: UserRole }>) {
  const user = useAuthStore((state) => state.user);
  return canAccessRole(user, role) ? children : <Navigate to="/forbidden" replace />;
}
