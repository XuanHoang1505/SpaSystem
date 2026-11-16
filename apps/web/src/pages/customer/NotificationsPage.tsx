import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { NotificationsView } from '@/features/notifications';

export function NotificationsPage() {
  const user = useAuthStore((s) => s.user);

  if (user?.role === 'staff') {
    return <Navigate to="/staff/notifications" replace />;
  }
  if (user?.role === 'owner') {
    return <Navigate to="/owner/notifications" replace />;
  }

  return <NotificationsView />;
}
