import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/shared/PageLoader/PageLoader';
import { homePathFor } from '@/features/auth/navigation';
import { useAuthStore } from '@/stores/authStore';

/** Login, register and forgot-password: a signed-in user goes to their own area instead. */
export function GuestOnly({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  if (status === 'restoring') return <PageLoader label="Đang kiểm tra phiên đăng nhập…" />;
  if (status === 'authenticated' && user) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}
