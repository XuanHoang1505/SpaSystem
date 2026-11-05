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
  const endReason = useAuthStore((state) => state.endReason);
  const location = useLocation();
  if (status === 'restoring') return <PageLoader label="Đang kiểm tra phiên đăng nhập…" />;
  // A deliberate logout leaves for home; an expired or missing session asks to log in and come back.
  if (status === 'anonymous')
    return <Navigate to={endReason === 'logout' ? '/' : loginPathFor(location)} replace />;
  return canAccessRole(user, role) ? children : <Navigate to="/forbidden" replace />;
}
