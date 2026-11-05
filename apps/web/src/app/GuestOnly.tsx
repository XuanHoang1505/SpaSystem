import type { PropsWithChildren } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { PageLoader } from '@/components/shared/PageLoader/PageLoader';
import { safeRedirect } from '@/features/auth/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Login, register and forgot-password. A signed-in user goes to the safe `?redirect` target or their own area;
 * this is also how the login page moves on once the session is set.
 */
export function GuestOnly({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const [params] = useSearchParams();
  if (status === 'restoring') return <PageLoader label="Đang kiểm tra phiên đăng nhập…" />;
  if (status === 'authenticated' && user)
    return <Navigate to={safeRedirect(params.get('redirect'), user.role)} replace />;
  return children;
}
