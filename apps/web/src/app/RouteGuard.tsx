import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@spa/shared-types';
import { PageLoader } from '@/components/shared/PageLoader/PageLoader';
import { loginPathFor } from '@/features/auth/navigation';
import { canAccessRole, useAuthStore } from '@/stores/authStore';

/** Experience only, not a security boundary: the API checks every permission. */
export function RouteGuard({ role, children }: PropsWithChildren<{ role: UserRole }>) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  if (status === 'restoring') return <PageLoader label="Đang kiểm tra phiên đăng nhập…" />;
  if (status === 'anonymous') return <Navigate to={loginPathFor(location)} replace />;
  return canAccessRole(user, role) ? children : <Navigate to="/forbidden" replace />;
}
